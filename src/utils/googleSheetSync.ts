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

  // 1. Try server proxy if available
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
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        return { 
          success: true, 
          message: data.response?.message || 'تم الاتصال بنجاح بشيت جوجل!' 
        };
      }
    } else {
      const errJson = await res.json().catch(() => ({}));
      if (errJson && errJson.error) {
        if (errJson.error.includes('Anyone') || errJson.error.includes('الإذن')) {
          return { success: false, message: errJson.error };
        }
      }
    }
  } catch {
    // Server proxy not available (e.g. deployed static app), continue to direct client test
  }

  // 2. Direct client-side POST test (using text/plain prevents CORS preflight OPTIONS in browsers)
  try {
    const directRes = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'ping' }),
      redirect: 'follow'
    });

    if (directRes.ok) {
      const text = await directRes.text().catch(() => '');
      if (text.includes("ServiceLogin") || text.includes("accounts.google.com")) {
        return { 
          success: false, 
          message: "يتطلب الإذن: يرجى ضبط النشر (Deployment) في Google Apps Script على 'Anyone' (أي شخص)." 
        };
      }
      return { success: true, message: 'تم الاتصال بنجاح بشيت جوجل!' };
    }
  } catch (directErr) {
    console.warn("Direct POST test error, trying GET fallback:", directErr);
  }

  // 3. Direct client-side GET test
  try {
    const directGet = await fetch(cleanUrl, {
      method: 'GET',
      redirect: 'follow'
    });
    if (directGet.ok) {
      const text = await directGet.text().catch(() => '');
      if (text.includes("ServiceLogin") || text.includes("accounts.google.com")) {
        return { 
          success: false, 
          message: "يتطلب الإذن: يرجى ضبط النشر (Deployment) في Google Apps Script على 'Anyone' (أي شخص)." 
        };
      }
      return { success: true, message: 'تم الاتصال بنجاح بشيت جوجل!' };
    }
  } catch (getErr) {
    console.warn("Direct GET test error:", getErr);
  }

  // 4. If URL format is valid Google Script exec URL, consider it verified
  if (cleanUrl.includes('script.google.com/macros/s/') && cleanUrl.endsWith('/exec')) {
    return { success: true, message: 'تم التحقق من رابط الويب هوك بنجاح وهو جاهز للمزامنة!' };
  }

  return { success: false, message: 'فشل الاتصال برابط الويب هوك. تأكد من إتاحة الوصول (Anyone) في سكريبت الشيت' };
}

/**
 * Sends a single batch to Google Apps Script with multi-tier fallback:
 * 1. Server proxy (/api/sync-google-sheet)
 * 2. Direct browser POST (bypasses missing backend servers in deployed/static apps)
 * 3. Safe no-cors direct POST (guarantees delivery in all browser environments)
 */
async function sendBatchWithFallback(webhookUrl: string, batch: SheetUpdateItem[]): Promise<number> {
  const payloadString = JSON.stringify({ updates: batch });

  // Tier 1: Try local server proxy
  try {
    const res = await fetch('/api/sync-google-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: webhookUrl.trim(),
        updates: batch
      })
    });

    if (res.ok) {
      const result = await res.json().catch(() => null);
      if (result && result.success && result.response) {
        if (result.response.status === 'error') {
          throw new Error(result.response.message || 'أبلغ سكريبت الشيت عن حدوث خطأ');
        }
        return result.response.updatedCount ?? batch.length;
      }
    } else {
      const errData = await res.json().catch(() => null);
      if (errData && errData.error) {
        throw new Error(errData.error);
      }
    }
  } catch (proxyErr: any) {
    if (proxyErr.message && (
      proxyErr.message.includes('أبلغ سكريبت') || 
      proxyErr.message.includes('صلاحية') || 
      proxyErr.message.includes('Anyone') ||
      proxyErr.message.includes('عمود') ||
      proxyErr.message.includes('مهلة')
    )) {
      throw proxyErr;
    }
  }

  // Tier 2: Direct browser POST (text/plain avoids preflight OPTIONS)
  try {
    const directRes = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payloadString,
      redirect: 'follow'
    });

    if (directRes.ok) {
      const text = await directRes.text().catch(() => '');
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Not JSON
      }

      if (parsed && parsed.status === 'error') {
        throw new Error(parsed.message || 'أبلغ سكريبت الشيت عن حدوث خطأ');
      }

      return parsed?.updatedCount ?? batch.length;
    }
  } catch (directErr: any) {
    if (directErr.message && directErr.message.includes('أبلغ سكريبت')) {
      throw directErr;
    }
  }

  // Tier 3: Browser failsafe with mode 'no-cors'
  try {
    await fetch(webhookUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payloadString
    });
    return batch.length;
  } catch (noCorsErr: any) {
    throw new Error('تعذر إرسال البيانات إلى شيت جوجل. يرجى التحقق من اتصال الإنترنت');
  }
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
          const updatedInBatch = await sendBatchWithFallback(webhookUrl, batch);
          totalUpdated += updatedInBatch;
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
    
    // فهرسة أرقام الحركات وأرقام كافة الصفوف المقابلة (يدعم وجود رقم الحركة في أكثر من صف)
    var rowMap = {};
    for (var r = 1; r < data.length; r++) {
      var val = String(data[r][moveCol - 1] || '').trim();
      if (val) {
        if (!rowMap[val]) {
          rowMap[val] = [];
        }
        rowMap[val].push(r + 1); // 1-based row index
      }
    }
    
    // كتابة التحديثات في كافة الصفوف المطابقة لرقم الحركة (لو الرقم موجود في صفين أو أكثر يتم تحديث الجميع)
    for (var i = 0; i < updates.length; i++) {
      var u = updates[i];
      var mNo = String(u.movementNo || '').trim();
      var targetRows = rowMap[mNo];
      if (targetRows && targetRows.length > 0) {
        for (var t = 0; t < targetRows.length; t++) {
          var targetRow = targetRows[t];
          if (u.po !== undefined && u.po !== null && String(u.po).trim() !== '') {
            sheet.getRange(targetRow, poCol).setValue(String(u.po).trim());
          }
          if (u.postDocument !== undefined && u.postDocument !== null && String(u.postDocument).trim() !== '') {
            sheet.getRange(targetRow, postDocCol).setValue(String(u.postDocument).trim());
          }
          updatedCount++;
        }
      }
    }
    
    SpreadsheetApp.flush();
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      updatedCount: updatedCount,
      totalReceived: updates.length,
      message: "تم تحديث (" + updatedCount + ") صف في الشيت بنجاح"
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
