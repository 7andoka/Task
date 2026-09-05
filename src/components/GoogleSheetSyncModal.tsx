import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Code, 
  FileSpreadsheet,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  testGoogleSheetWebhook, 
  saveGoogleSheetWebhookUrl, 
  syncUpdatesToGoogleSheet, 
  GOOGLE_APPS_SCRIPT_CODE,
  SheetUpdateItem,
  DEFAULT_VERIFIED_WEBHOOK_URL
} from '../utils/googleSheetSync';
import { soundFx } from '../utils/sound';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string;
  onWebhookUrlChange: (url: string) => void;
  records: Array<{
    movementNo?: string;
    po?: string;
    postDocument?: string;
    sapExecutionNo?: string;
  }>;
  isRtl?: boolean;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  webhookUrl,
  onWebhookUrlChange,
  records,
  isRtl = true,
}) => {
  const [inputUrl, setInputUrl] = useState(webhookUrl || DEFAULT_VERIFIED_WEBHOOK_URL);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; percent: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (webhookUrl) {
      setInputUrl(webhookUrl);
    }
  }, [webhookUrl]);

  if (!isOpen) return null;

  // Count how many records currently have PO or POST DOCUMENT
  const eligibleRecords = records.filter(r => 
    r.movementNo && 
    ((r.po && r.po.trim() !== '') || (r.postDocument && r.postDocument.trim() !== '') || (r.sapExecutionNo && r.sapExecutionNo.trim() !== ''))
  );

  const handleSaveUrl = async () => {
    try {
      await saveGoogleSheetWebhookUrl(inputUrl);
      onWebhookUrlChange(inputUrl.trim());
      soundFx.playSuccess();
      toast.success(isRtl ? 'تم حفظ رابط مزامنة شيت جوجل بنجاح' : 'Google Sheet webhook URL saved');
    } catch (err) {
      toast.error(isRtl ? 'حدث خطأ أثناء الحفظ' : 'Failed to save URL');
    }
  };

  const handleTestConnection = async () => {
    if (!inputUrl.trim()) {
      toast.error(isRtl ? 'يرجى إدخال رابط Webhook أولاً' : 'Please enter webhook URL');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    soundFx.playClick();

    const result = await testGoogleSheetWebhook(inputUrl.trim());
    setIsTesting(false);
    setTestResult(result);

    if (result.success) {
      soundFx.playSuccess();
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleSyncAllEligible = async () => {
    const url = inputUrl.trim() || webhookUrl.trim();
    if (!url) {
      toast.error(isRtl ? 'يرجى إدخال وحفظ رابط Webhook أولاً' : 'Please configure webhook URL first');
      return;
    }

    if (eligibleRecords.length === 0) {
      toast.info(isRtl ? 'لا توجد حركات مسجل بها أمر توريد أو Post Document حالياً للمزامنة' : 'No records with PO or Post Doc to sync');
      return;
    }

    setIsSyncingAll(true);
    setSyncProgress(null);
    soundFx.playClick();

    // تجميع الحركات بحسب رقم الحركة لضمان إرسال بيانات متكاملة
    const updateMap = new Map<string, SheetUpdateItem>();
    eligibleRecords.forEach(r => {
      const mNo = r.movementNo!.trim();
      const po = r.po?.trim() || '';
      const postDocument = (r.postDocument || r.sapExecutionNo || '').trim();
      const existing = updateMap.get(mNo);
      if (!existing) {
        updateMap.set(mNo, {
          movementNo: mNo,
          po: po,
          postDocument: postDocument,
          updatedAt: new Date().toISOString()
        });
      } else {
        updateMap.set(mNo, {
          movementNo: mNo,
          po: po || existing.po,
          postDocument: postDocument || existing.postDocument,
          updatedAt: new Date().toISOString()
        });
      }
    });

    const updates = Array.from(updateMap.values());

    const res = await syncUpdatesToGoogleSheet(url, updates, (prog) => {
      setSyncProgress(prog);
    });
    setIsSyncingAll(false);
    setSyncProgress(null);

    if (res.success) {
      soundFx.playSuccess();
      toast.success(
        isRtl 
          ? `تمت المزامنة بنجاح! تم تحديث (${res.updatedCount ?? updates.length}) صف في الشيت مباشرة (تم ترحيل كافة الصفوف المتطابقة).`
          : `Synced successfully! Updated (${res.updatedCount ?? updates.length}) rows in sheet across all matching lines.`
      );
    } else {
      toast.error(res.error || (isRtl ? 'فشلت عملية المزامنة مع الشيت' : 'Sync failed'));
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    soundFx.playSuccess();
    toast.success(isRtl ? 'تم نسخ كود سكريبت الشيت إلى الحافظة' : 'Script code copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  const isConfigured = Boolean(webhookUrl && webhookUrl.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                {isRtl ? 'مزامنة شيت جوجل المباشرة (Google Sheets 2-Way Sync)' : 'Google Sheets Two-Way Sync'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                {isRtl 
                  ? 'ترحيل أمر التوريد (PO) و Post Document إلى الشيت في نفس اللحظة ونفس الصف' 
                  : 'Sync PO & POST DOCUMENT directly back to the original Google Sheet'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {/* Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
            isConfigured 
              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200' 
              : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
          }`}>
            {isConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <p className="font-bold text-sm mb-1">
                {isConfigured 
                  ? (isRtl ? 'المزامنة التلقائية مفعلة وجاهزة!' : 'Auto-sync is Active & Ready!')
                  : (isRtl ? 'بانتظار ربط سكريبت شيت جوجل' : 'Google Sheet script connection pending')}
              </p>
              <p className="opacity-90 leading-relaxed">
                {isConfigured 
                  ? (isRtl 
                      ? 'بمجرد تعديل أمر التوريد أو مستند Post Document لأي حركة، سيتم إرسالها تلقائياً للشيت في نفس الصف حسب (رقم الحركة).' 
                      : 'Any PO or Post Document entered in the app will automatically write to the corresponding row in your Google Sheet.')
                  : (isRtl 
                      ? 'قم بنسخ كود السكريبت المرفق بالأسفل ولصقه في شيت جوجل مرة واحدة فقط، ثم ضع رابط التطبيق (Web App URL) هنا.' 
                      : 'Copy the script below into your Google Sheet Apps Script, deploy as Web App, and paste the URL here.')}
              </p>
            </div>
          </div>

          {/* Webhook URL Input Section */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              {isRtl ? 'رابط تطبيق ويب سكريبت جوجل (Google Apps Script Web App URL):' : 'Google Apps Script Web App URL:'}
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/50 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleSaveUrl}
                  disabled={!inputUrl.trim()}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'حفظ' : 'Save'}</span>
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting || !inputUrl.trim()}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-700/60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? (isRtl ? 'جاري الفحص...' : 'Testing...') : (isRtl ? 'اختبار الربط' : 'Test Connection')}</span>
                </button>
              </div>
            </div>
            {testResult && (
              <p className={`text-xs font-semibold flex items-center gap-1.5 mt-1.5 ${
                testResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{testResult.message}</span>
              </p>
            )}
          </div>

          {/* Bulk Sync Section */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {isRtl ? 'مزامنة كل البيانات الحالية دفعة واحدة' : 'Batch Sync Existing Records'}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {isRtl 
                  ? `يوجد (${eligibleRecords.length}) حركة توريد مسجل لها أمر توريد أو Post Document جاهزة للمزامنة.` 
                  : `(${eligibleRecords.length}) records with PO or Post Document ready to sync.`}
              </p>
            </div>
            <button
              onClick={handleSyncAllEligible}
              disabled={isSyncingAll || !isConfigured || eligibleRecords.length === 0}
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs shrink-0"
            >
              <Send className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>
                {isSyncingAll 
                  ? (syncProgress 
                      ? (isRtl ? `جاري الترحيل (${syncProgress.current} / ${syncProgress.total})... ${syncProgress.percent}%` : `Syncing (${syncProgress.current}/${syncProgress.total})... ${syncProgress.percent}%`)
                      : (isRtl ? 'جاري ترحيل البيانات للشيت...' : 'Syncing...'))
                  : (isRtl ? 'ترحيل كل المسجل للشيت الآن' : 'Sync All to Sheet Now')}
              </span>
            </button>
          </div>

          {/* Quick Setup Instructions (Expandable) */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowCode(!showCode)}
              className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-500" />
                <span>{isRtl ? 'كود السكريبت الجاهز وطريقة التفعيل في دقيقة (Google Apps Script)' : 'How to set up & Copy Script Code'}</span>
              </div>
              {showCode ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showCode && (
              <div className="p-4 space-y-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                <ol className="list-decimal list-inside space-y-1.5 text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed">
                  <li>{isRtl ? 'افتح شيت جوجل الذي تسحب منه البيانات.' : 'Open your source Google Sheet.'}</li>
                  <li>{isRtl ? 'من القائمة العلوية للشيت: اضغط على (الإضافات Extensions) > (Apps Script).' : 'Go to Extensions > Apps Script.'}</li>
                  <li>{isRtl ? 'امسح الكود القديم إن وُجد، والصق الكود التالي بالكامل.' : 'Clear existing code and paste the code below.'}</li>
                  <li>{isRtl ? 'اضغط (نشر Deploy) > (نشر جديد New deployment) > اختر نوع (تطبيق ويب Web app).' : 'Click Deploy > New deployment > Select Web app.'}</li>
                  <li>{isRtl ? 'اضبط "من يمكنه الوصول (Who has access)" على: أي شخص (Anyone).' : 'Set "Who has access" to "Anyone".'}</li>
                  <li>{isRtl ? 'اضغط (نشر Deploy) وانسخ الرابط الناتج وضعه في المربع بالأعلى.' : 'Click Deploy, copy the Web App URL and paste it in the box above.'}</li>
                </ol>

                <div className="relative mt-3">
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <button
                      onClick={handleCopyScript}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ الكود' : 'Copy Script')}</span>
                    </button>
                  </div>
                  <pre className="p-3 pt-12 rounded-xl bg-zinc-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-56 select-all border border-zinc-800 leading-normal" dir="ltr">
                    {GOOGLE_APPS_SCRIPT_CODE}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            {isRtl ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
