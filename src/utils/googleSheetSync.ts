import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../constants';

export const GOOGLE_SHEET_WEBHOOK_STORAGE_KEY = 'fresh_supply_sheet_webhook_url';
export const SYNC_SETTINGS_DOC_ID = 'fresh_supply_sync';
export const DEFAULT_VERIFIED_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyrBKfX1p-fyPxWzvKVgNwn6uoe5L-hlMBD1bd47fxFTVxcWwp-3nHMK7_v2r1ZYOt4/exec';

export interface SheetUpdateItem {
  movementNo: string;
  po?: string;
  postDocument?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface SyncResponse {
  success: boolean;
  updatedCount?: number;
  totalReceived?: number;
  message?: string;
  error?: string;
}

/**
 * Get stored Google Apps Script Webhook URL (checks localStorage then Firestore, fallback to verified URL)
 */
export async function getGoogleSheetWebhookUrl(): Promise<string> {
  // 1. Check localStorage first
  const localVal = localStorage.getItem(GOOGLE_SHEET_WEBHOOK_STORAGE_KEY);
  if (localVal && localVal.trim()) {
    return localVal.trim();
  }

  // 2. Check Firestore settings
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, SYNC_SETTINGS_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.webhookUrl && typeof data.webhookUrl === 'string' && data.webhookUrl.trim()) {
        localStorage.setItem(GOOGLE_SHEET_WEBHOOK_STORAGE_KEY, data.webhookUrl.trim());
        return data.webhookUrl.trim();
      }
    }
  } catch (err) {
    console.warn("Failed to fetch webhook URL from Firestore:", err);
  }

  // 3. Fallback to the user's active verified webhook URL
  return DEFAULT_VERIFIED_WEBHOOK_URL;
}

/**
 * Save Google Apps Script Webhook URL (saves to localStorage and Firestore)
 */
export async function saveGoogleSheetWebhookUrl(url: string): Promise<void> {
  const cleanUrl = url.trim();
  localStorage.setItem(GOOGLE_SHEET_WEBHOOK_STORAGE_KEY, cleanUrl);

  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, SYNC_SETTINGS_DOC_ID);
    await setDoc(docRef, {
      webhookUrl: cleanUrl,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn("Failed to persist webhook URL to Firestore:", err);
  }
}

/**
 * Test connectivity with the Google Apps Script Webhook
 */
export async function testGoogleSheetWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.trim()) {
    return { success: false, message: 'يرجى إدخال رابط Webhook أولاً' };
  }

  const cleanUrl = webhookUrl.trim();

  try {
    const res = await fetch('/api/sync-google-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: cleanUrl,
        action: 'ping'
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { 
          success: true, 
          message: data.response?.message || 'تم الاتصال بنجاح بشيت جوجل!' 
        };
      }
    }

    // If server returned a specific error message, parse it
    const errJson = await res.json().catch(() => ({}));
    if (errJson.error) {
      return { success: false, message: errJson.error };
    }
  } catch (serverErr) {
    console.warn("Server proxy test error, trying client GET fallback:", serverErr);
  }

  // Client-side fallback check (test if URL responds)
  try {
    const directRes = await fetch(cleanUrl, {
      method: 'GET',
      mode: 'cors'
    });
    if (directRes.ok) {
      return { success: true, message: 'تم الاتصال بنجاح بشيت جوجل!' };
    }
  } catch {
    // If CORS prevents reading body, we already verified via server
  }

  return { success: false, message: 'فشل الاتصال برابط الويب هوك. تأكد من إتاحة الوصول (Anyone) في سكريبت الشيت' };
}

/**
 * Send PO and POST DOCUMENT updates to Google Sheet
 */
export async function syncUpdatesToGoogleSheet(
  webhookUrl: string, 
  updates: SheetUpdateItem[],
  onProgress?: (progress: { current: number; total: number; percent: number }) => void
): Promise<SyncResponse> {
  if (!webhookUrl || !webhookUrl.trim()) {
    return { success: false, error: 'لم يتم تعيين رابط Webhook لمزامنة شيت جوجل' };
  }

  const validUpdates = updates.filter(u => u.movementNo && String(u.movementNo).trim());
  if (validUpdates.length === 0) {
    return { success: false, error: 'لا توجد حركات محددة برقم حركة صالح للمزامنة' };
  }

  // Chunk in batches of 25 to guarantee each Google Apps Script roundtrip finishes in 2-3 seconds
  const BATCH_SIZE = 25;
  let totalUpdated = 0;
  const batchErrors: string[] = [];

  try {
    for (let i = 0; i < validUpdates.length; i += BATCH_SIZE) {
      const batch = validUpdates.slice(i, i + BATCH_SIZE);
      let batchSucceeded = false;
      let lastErrMessage = '';

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const res = await fetch('/api/sync-google-sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              webhookUrl: webhookUrl.trim(),
              updates: batch
            })
          });

          if (!res.ok) {
            const raw = await res.text().catch(() => '');
            let errText = 'خطأ في خادم المزامنة';
            try {
              const parsed = JSON.parse(raw);
              if (parsed.error) errText = parsed.error;
            } catch {
              if (res.status === 504 || res.status === 502) {
                errText = 'استغرقت استجابة شيت جوجل وقتاً طويلاً. تم تجزئة البيانات لتسريع الترحيل.';
              }
            }
            throw new Error(errText);
          }

          const result = await res.json();
          const sheetRes = result.response;

          if (sheetRes && sheetRes.status === 'error') {
            throw new Error(sheetRes.message || 'أبلغ سكريبت الشيت عن حدوث خطأ');
          }

          totalUpdated += (sheetRes?.updatedCount ?? batch.length);
          batchSucceeded = true;
          break;
        } catch (bErr: any) {
          lastErrMessage = bErr.message || 'فشل الاتصال';
          if (attempt === 1 && validUpdates.length > BATCH_SIZE) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }
      }

      if (!batchSucceeded) {
        batchErrors.push(lastErrMessage);
      }

      const currentCount = Math.min(i + BATCH_SIZE, validUpdates.length);
      if (onProgress) {
        onProgress({
          current: currentCount,
          total: validUpdates.length,
          percent: Math.round((currentCount / validUpdates.length) * 100)
        });
      }
    }

    if (batchErrors.length > 0 && totalUpdated === 0) {
      return {
        success: false,
        error: batchErrors[0] || 'فشلت المزامنة مع شيت جوجل'
      };
    }

    return {
      success: true,
      updatedCount: totalUpdated,
      totalReceived: validUpdates.length,
      message: batchErrors.length > 0 
        ? `تم تحديث (${totalUpdated}) حركة، مع تعذر (${validUpdates.length - totalUpdated}) حركة`
        : `تم تحديث (${totalUpdated}) صف بالشيت بنجاح`
    };
  } catch (err: any) {
    console.error("Google Sheet Sync Error:", err);
    return {
      success: false,
      error: err.message || 'فشلت المزامنة مع شيت جوجل'
    };
  }
}

/**
 * Ready-to-copy Google Apps Script code to paste into Google Sheet
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * سكريبت مزامنة أمر الشراء (PO) و POST DOCUMENT تلقائياً من تطبيق المصنع
 * 
 * خطوات التفعيل السريعة (تستغرق دقيقة واحدة):
 * 1. افتح شيت جوجل الذي تسحب منه البيانات.
 * 2. من القائمة العلوية: اضغط على (الإضافات Extensions) > (Apps Script).
 * 3. امسح أي كود موجود في المحرر، ثم الصق هذا الكود بالكامل مكانه.
 * 4. اضغط على أيقونة الحفظ 💾 (أو Ctrl+S).
 * 5. اضغط على زر (نشر Deploy) في الأعلى > (نشر جديد New deployment).
 * 6. اضغط على أيقونة الترس بجانب نوع النشر واختر (تطبيق ويب Web app).
 * 7. اضبط الإعدادات:
 *    - تنفيذ كـ (Execute as): أنا (Me / حسابك الحالي).
 *    - من يمكنه الوصول (Who has access): أي شخص (Anyone).
 * 8. اضغط (نشر Deploy) وانسخ رابط تطبيق الويب (Web app URL).
 * 9. الصق الرابط في التطبيق في نافذة "مزامنة Google Sheet".
 */

function doPost(e) {
  try {
    var rawContents = e.postData ? e.postData.contents : "{}";
    var payload = JSON.parse(rawContents);
    
    // اختبار الاتصال (Ping)
    if (payload.action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "تم الاتصال بنجاح بشيت جوجل!"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    if (!data || data.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "الشيت فارغ لا يحتوي على بيانات"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var headers = data[0];
    var moveCol = -1;
    var poCol = -1;
    var postDocCol = -1;
    
    // البحث التلقائي عن أعمدة: رقم الحركة، أمر الشراء، POST DOCUMENT
    for (var c = 0; c < headers.length; c++) {
      var h = String(headers[c] || '').trim().toLowerCase();
      if (h === 'رقم الحركة' || h === 'movement no' || h === 'move no' || h === 'رقم حركة') {
        moveCol = c + 1;
      }
      if (h === 'po' || h === 'أمر الشراء' || h === 'امر الشراء' || h === 'أمر الشراء po' || h === 'امر التوريد' || h === 'أمر التوريد' || h === 'رقم أمر الشراء') {
        poCol = c + 1;
      }
      if (h === 'post document' || h === 'post doc' || h === 'مستند الترحيل' || h === 'مستند الصرف' || h === 'رقم تنفيذ الساب') {
        postDocCol = c + 1;
      }
    }
    
    if (moveCol === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "لم يتم العثور على عمود (رقم الحركة) في رأس الشيت!"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // إنشاء عمود أمر الشراء PO تلقائياً في الشيت إذا لم يكن موجوداً
    if (poCol === -1) {
      poCol = headers.length + 1;
      sheet.getRange(1, poCol).setValue('أمر الشراء PO');
      headers.push('أمر الشراء PO');
    }
    
    // إنشاء عمود POST DOCUMENT تلقائياً في الشيت إذا لم يكن موجوداً
    if (postDocCol === -1) {
      postDocCol = headers.length + 1;
      sheet.getRange(1, postDocCol).setValue('POST DOCUMENT');
      headers.push('POST DOCUMENT');
    }
    
    var updates = Array.isArray(payload.updates) ? payload.updates : (payload.movementNo ? [payload] : []);
    var updatedCount = 0;
    
    // فهرسة أرقام الحركات وأرقام الصفوف المقابلة
    var rowMap = {};
    for (var r = 1; r < data.length; r++) {
      var val = String(data[r][moveCol - 1] || '').trim();
      if (val) {
        rowMap[val] = r + 1; // 1-based row index
      }
    }
    
    // كتابة التحديثات في نفس مكان وخانات الصف المطابق
    for (var i = 0; i < updates.length; i++) {
      var u = updates[i];
      var mNo = String(u.movementNo || '').trim();
      var targetRow = rowMap[mNo];
      if (targetRow) {
        if (u.po !== undefined && u.po !== null && String(u.po).trim() !== '') {
          sheet.getRange(targetRow, poCol).setValue(String(u.po).trim());
        }
        if (u.postDocument !== undefined && u.postDocument !== null && String(u.postDocument).trim() !== '') {
          sheet.getRange(targetRow, postDocCol).setValue(String(u.postDocument).trim());
        }
        updatedCount++;
      }
    }
    
    SpreadsheetApp.flush();
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      updatedCount: updatedCount,
      totalReceived: updates.length
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Google Sheets Webhook Sync is Active and Ready!"
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
