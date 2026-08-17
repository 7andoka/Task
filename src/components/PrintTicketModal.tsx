import React from 'react';
import { Operation, ScaleSettings } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Building2, CheckCircle2, Scissors } from 'lucide-react';

export interface PrintTicketModalProps {
  operation: Operation | null;
  settings: ScaleSettings;
  onClose: () => void;
}

// 1D Barcode SVG Generator for Ticket Number
export const render1DBarcodeSVG = (text: string) => {
  const bars: { width: number; isGap: boolean }[] = [];
  // Guard start
  bars.push({ width: 3, isGap: false }, { width: 1, isGap: true }, { width: 2, isGap: false }, { width: 1, isGap: true });
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const w1 = (code % 3) + 1;
    const g1 = ((code >> 1) % 2) + 1;
    const w2 = ((code >> 2) % 3) + 1;
    const g2 = ((code >> 3) % 2) + 1;
    bars.push({ width: w1, isGap: false });
    bars.push({ width: g1, isGap: true });
    bars.push({ width: w2, isGap: false });
    bars.push({ width: g2, isGap: true });
  }
  // Guard stop
  bars.push({ width: 2, isGap: false }, { width: 1, isGap: true }, { width: 3, isGap: false });

  let currentX = 0;
  const elements = bars.map((bar, idx) => {
    const x = currentX;
    const unitWidth = bar.width * 1.3;
    currentX += unitWidth;
    if (bar.isGap) return null;
    return <rect key={idx} x={x} y="0" width={unitWidth} height="22" fill="#000000" />;
  });

  return (
    <svg viewBox={`0 0 ${currentX} 22`} className="w-28 h-5 object-contain">
      {elements}
    </svg>
  );
};

export const PrintTicketModal: React.FC<PrintTicketModalProps> = ({
  operation,
  settings,
  onClose
}) => {
  const defaultLogoFallback = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%230F766E'/><path d='M30 65 L50 35 L70 65 Z' fill='%23F59E0B'/><circle cx='50' cy='50' r='12' fill='%23FFFFFF'/></svg>";

  if (!operation) return null;

  const handlePrint = () => {
    window.print();
  };

  const qrData = JSON.stringify({
    co: settings.companyName || 'Rich Land Food Industries',
    op: operation.operationNo,
    veh: operation.vehicleNo,
    item: operation.item,
    gross: operation.grossWeight || operation.firstWeight,
    tare: operation.tareWeight || operation.secondWeight,
    net: operation.netWeight,
    date: operation.date,
    time: operation.time
  });

  const renderSingleTicket = (copyLabel: string) => (
    <div className="ticket-page-third flex flex-col justify-between bg-white text-slate-900 font-sans p-2.5 border border-slate-300 rounded-lg relative box-border overflow-hidden" style={{ height: '88mm', minHeight: '88mm', maxHeight: '88mm' }}>
      
      {/* Watermark: نسخة للمعاينة فقط ولا تعد مستند */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 select-none">
        <div className="transform -rotate-12 text-red-500/20 text-sm sm:text-base md:text-lg font-black tracking-wider text-center px-4 py-1.5 border-2 border-dashed border-red-500/25 rounded-2xl uppercase">
          نسخة للمعاينة فقط ولا تعد مستند
        </div>
      </div>

      {/* Header Banner with Date & Time in Top Center */}
      <div className="border-b-2 border-[#0F766E] pb-1.5 mb-1.5 flex items-center justify-between gap-2 relative z-10">
        {/* Right side (RTL): Logo & Company */}
        <div className="flex items-center gap-2">
          <img 
            src={settings.companyLogo || '/rich.jpg'} 
            alt="Rich Land Logo" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = defaultLogoFallback;
            }}
            className="w-10 h-10 object-contain rounded border border-slate-200 shrink-0" 
          />
          <div>
            <h1 className="text-[12.5px] font-black text-[#0F766E] tracking-wide leading-tight uppercase">
              {settings.companyName || 'Rich Land Food Industries'}
            </h1>
            <p className="text-[9px] text-slate-600 flex items-center gap-1 font-bold mt-0.5">
              <Building2 className="w-2.5 h-2.5 text-[#0F766E]" /> 
              {settings.companyAddress || 'المنطقة الصناعية'}
            </p>
          </div>
        </div>

        {/* Center: Top Header Date & Time */}
        <div className="text-center px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
          <span className="text-[8px] font-black text-slate-500 block leading-none mb-0.5">تاريخ ووقت التذكرة</span>
          <span className="text-[10px] font-black font-mono text-slate-900">{operation.date} | {operation.time}</span>
        </div>

        {/* Left side (RTL): Copy Label & Ticket No */}
        <div className="text-left border-r border-slate-200 pr-2 flex flex-col items-end">
          <div className="flex items-center gap-1 justify-end">
            <span className="text-[8.5px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold border border-slate-200">
              {copyLabel}
            </span>
            <div className="bg-transparent text-[#0F766E] border border-[#0F766E] font-black px-1.5 py-0.5 rounded text-[9.5px]">
              تذكرة ميزان
            </div>
          </div>
          <p className="text-[9.5px] font-mono font-bold text-slate-800 mt-0.5 text-left">
            رقم التذكرة: <span className="text-[#0F766E] font-black text-[11px]">{operation.operationNo}</span>
          </p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-4 gap-x-2 gap-y-1 text-[10px] mb-1 bg-teal-50/40 p-2 rounded-lg border border-teal-100 relative z-10">
        <div>
          <span className="text-slate-600 font-black block text-[8.5px]">رقم السيارة:</span>
          <strong className="text-[#0F766E] font-black text-[11.5px] bg-[#F59E0B]/20 px-1 py-0.2 rounded border border-[#F59E0B]/40 inline-block">
            {operation.vehicleNo}
          </strong>
        </div>

        <div>
          <span className="text-slate-600 font-black block text-[8.5px]">اسم السائق:</span>
          <strong className="text-slate-950 font-black truncate block text-[10.5px]">{operation.driver || '-'}</strong>
        </div>

        <div>
          <span className="text-slate-600 font-black block text-[8.5px]">المورد:</span>
          <strong className="text-slate-950 font-black truncate block text-[10.5px]">{operation.supplier || '-'}</strong>
        </div>

        <div>
          <span className="text-slate-600 font-black block text-[8.5px]">العميل:</span>
          <strong className="text-slate-950 font-black truncate block text-[10.5px]">{operation.customer || '-'}</strong>
        </div>

        <div>
          <span className="text-slate-600 font-black block text-[8.5px]">الصنف:</span>
          <strong className="text-slate-950 font-black truncate block text-[10.5px]">{operation.item || '-'}</strong>
        </div>

        <div>
          <span className="text-slate-600 font-black block text-[8.5px]">أمر الشراء / المبيعات:</span>
          <strong className="text-slate-950 font-black font-mono text-[10.5px]">{operation.poNumber || operation.soNumber || operation.permitNumber || '-'}</strong>
        </div>

        <div>
          <span className="text-slate-600 font-black block text-[8.5px]">نوع الحركة:</span>
          <strong className={`px-1.5 py-0.2 rounded text-[9.5px] font-black inline-block ${
            operation.direction === 'صادر' 
              ? 'bg-amber-100 text-amber-900 border border-amber-300' 
              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
          }`}>
            {operation.direction || 'وارد'}
          </strong>
        </div>

        <div>
          <span className="text-slate-600 font-black block text-[8.5px]">العدد:</span>
          <strong className="text-slate-900 font-black text-[10.5px]">{operation.quantity || 1}</strong>
        </div>
      </div>

      {/* Prominent Clear Box for Weights */}
      <div className="bg-slate-50 border-2 border-[#0F766E] rounded-lg p-1.5 mb-1 shadow-2xs relative z-10">
        <div className="grid grid-cols-3 gap-1.5 text-center">
          
          {/* First Weight */}
          <div className="bg-white border border-slate-200 rounded p-1 flex flex-col justify-between">
            <div>
              <span className="text-[8.5px] font-black text-slate-600 block mb-0.2">الوزنة الأولى</span>
              <span className="font-mono font-black text-[15px] text-slate-900">
                {(operation.firstWeight || operation.grossWeight || 0).toLocaleString('en-US')} <span className="text-[9.5px] font-sans text-slate-500">{settings.unit || 'كجم'}</span>
              </span>
            </div>
            <div className="text-[8px] font-mono font-bold text-slate-500 border-t border-slate-100 mt-0.5 pt-0.5">
              {operation.firstWeightDate && operation.firstWeightTime ? `${operation.firstWeightDate} | ${operation.firstWeightTime}` : `${operation.date} | ${operation.time}`}
            </div>
          </div>

          {/* Second Weight */}
          <div className="bg-white border border-slate-200 rounded p-1 flex flex-col justify-between">
            <div>
              <span className="text-[8.5px] font-black text-slate-600 block mb-0.2">الوزنة الثانية</span>
              <span className="font-mono font-black text-[15px] text-slate-900">
                {(operation.secondWeight || operation.tareWeight || 0).toLocaleString('en-US')} <span className="text-[9.5px] font-sans text-slate-500">{settings.unit || 'كجم'}</span>
              </span>
            </div>
            <div className="text-[8px] font-mono font-bold text-slate-500 border-t border-slate-100 mt-0.5 pt-0.5">
              {operation.secondWeightDate && operation.secondWeightTime ? `${operation.secondWeightDate} | ${operation.secondWeightTime}` : (operation.secondWeight && operation.secondWeight > 0 ? `${operation.date} | ${operation.time}` : 'في الانتظار')}
            </div>
          </div>

          {/* Net Weight */}
          <div className="net-weight-box bg-transparent text-slate-900 rounded p-1 flex flex-col justify-between shadow-none border-2 border-[#0F766E]">
            <div>
              <span className="net-weight-title text-[8.5px] font-black text-[#0F766E] block mb-0.2">الوزن الصافي</span>
              <span className="net-weight-val font-mono font-black text-[20px] text-slate-950 leading-tight">
                {(operation.netWeight || 0).toLocaleString('en-US')} <span className="text-[10px] font-sans text-slate-600">{settings.unit || 'كجم'}</span>
              </span>
            </div>
            <div className="net-weight-sub text-[9.5px] font-black text-[#0F766E] border-t border-teal-200 mt-0.5 pt-0.5">
              {((operation.netWeight || 0) / 1000).toFixed(3)} طن
            </div>
          </div>

        </div>
      </div>

      {/* Certification Text */}
      <div className="text-center py-0.5 relative z-10">
        <p className="text-[10px] font-black text-[#0F766E] flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          تمت عملية الوزن آليا بواسطة ميزان إلكتروني موثق رقم T15310056
        </p>
      </div>

      {/* Prominent Always-Visible Remarks Section */}
      <div className="text-[9px] px-2 py-0.5 bg-slate-100/90 rounded border border-slate-300 mb-1 text-slate-900 flex items-start gap-1.5 font-bold relative z-10">
        <span className="font-black text-[#0F766E] shrink-0">الملاحظات:</span>
        <span className="break-words font-medium text-slate-800 leading-tight">
          {operation.remarks && operation.remarks.trim() !== '' ? operation.remarks : 'لا توجد ملاحظات'}
        </span>
      </div>

      {/* Footer: Developer Signature, QR Code, Barcode & 4 Signatures Grid */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-300 gap-1.5 relative z-10">
        
        {/* Left Side (RTL): Developer Signature + QR Code + Barcode Section */}
        <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 p-1 rounded-md border border-slate-200">
          
          {/* Developer Signature Badge before QR code */}
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200">
            <div className="w-6 h-6 bg-gradient-to-br from-slate-900 to-[#0F766E] rounded flex items-center justify-center text-white font-black text-[8px] shrink-0 shadow-2xs border border-teal-800">
              KS
            </div>
            <div className="flex flex-col text-right leading-none">
              <span className="text-[7.5px] font-black text-slate-900 leading-tight">Khaled Shaban</span>
              <span className="text-[5.5px] font-bold text-slate-500 uppercase tracking-tighter leading-tight">Full Stack Developer</span>
              <span className="text-[6.5px] font-mono font-black text-[#0F766E] leading-tight mt-0.5">01008332969</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="p-0.5 bg-white border border-slate-300 rounded shadow-2xs shrink-0">
            <QRCodeSVG value={qrData} size={30} />
          </div>

          {/* 1D Barcode */}
          <div className="flex flex-col items-center justify-center px-1">
            {render1DBarcodeSVG(operation.operationNo)}
            <span className="text-[7px] font-mono font-black text-slate-800 tracking-wider leading-tight mt-0.5">
              *{operation.operationNo}*
            </span>
          </div>
        </div>

        {/* 4 Clean Balanced Signatures Section */}
        <div className="grid grid-cols-4 gap-1 text-[7.5px] text-center flex-1 max-w-xs mr-auto">
          <div>
            <p className="font-bold text-slate-700 leading-tight mb-1.5">توقيع مسؤول الميزان<br/><span className="text-[6px] text-slate-400 font-mono">({operation.userName || 'الوردية'})</span></p>
            <div className="border-b border-dashed border-slate-400 w-8 mx-auto"></div>
          </div>
          <div>
            <p className="font-bold text-slate-700 leading-tight mb-1.5">سائق السيارة<br/><span className="text-[6px] text-slate-400">Driver</span></p>
            <div className="border-b border-dashed border-slate-400 w-8 mx-auto"></div>
          </div>
          <div>
            <p className="font-bold text-slate-700 leading-tight mb-1.5">أمين المخزن<br/><span className="text-[6px] text-slate-400">Warehouse</span></p>
            <div className="border-b border-dashed border-slate-400 w-8 mx-auto"></div>
          </div>
          <div>
            <p className="font-bold text-slate-700 leading-tight mb-1.5">الاعتماد والختم<br/><span className="text-[6px] text-slate-400">Stamp & Seal</span></p>
            <div className="border-b border-dashed border-slate-400 w-8 mx-auto"></div>
          </div>
        </div>

      </div>

    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 overflow-y-auto print:p-0 print:bg-white print:block">
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Net Weight Box Transparent Print */
          .net-weight-box {
            background-color: transparent !important;
            color: #0f172a !important;
            border: 2px solid #0F766E !important;
          }
          .net-weight-title {
            color: #0F766E !important;
            font-weight: 900 !important;
          }
          .net-weight-val {
            color: #020617 !important;
            font-weight: 900 !important;
            font-size: 20px !important;
          }
          .net-weight-sub {
            color: #0F766E !important;
            font-weight: 900 !important;
            border-top-color: #ccfbf1 !important;
          }

          /* 1. Hide all elements by default using visibility */
          body * {
            visibility: hidden !important;
          }
          
          /* 2. Hide any element with 'no-print' class completely from layout */
          .no-print, .no-print * {
            display: none !important;
            visibility: hidden !important;
          }

          /* 3. Make only the A4 printable content and its descendants visible */
          #printable-a4-page, #printable-a4-page * {
            visibility: visible !important;
          }

          /* 4. Force absolute placement to the very top-left of the paper */
          #printable-a4-page {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 10mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            background: white !important;
            box-shadow: none !important;
            transform: none !important;
          }

          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
        }

        /* Improved UI Preview Scaling */
        .preview-viewport {
          max-height: 80vh;
          overflow-y: auto;
          width: 100%;
          background: #020617;
          border-radius: 1.5rem;
          padding: 2rem;
          display: flex;
          justify-content: center;
        }

        .preview-a4-container {
          background: white;
          width: 210mm;
          min-width: 210mm;
          height: 297mm;
          padding: 10mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transform-origin: top center;
          box-shadow: 0 40px 100px -20px rgba(0,0,0,0.7);
        }

        @media (max-width: 1600px) { .preview-a4-container { transform: scale(0.85); } }
        @media (max-width: 1400px) { .preview-a4-container { transform: scale(0.7); } }
        @media (max-width: 1024px) { .preview-a4-container { transform: scale(0.5); } }
        @media (max-width: 768px) { .preview-a4-container { transform: scale(0.35); } }
      `}</style>

      <div className="w-full max-w-5xl my-auto">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          
          {/* Header */}
          <div className="bg-[#0F766E] text-white px-6 py-4 flex items-center justify-between border-b border-[#F59E0B]/30 no-print">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F59E0B] text-slate-950 rounded-xl flex items-center justify-center">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm">معاينة تذكرة الميزان الرسمية</h3>
                <p className="text-[10px] text-teal-100/80">صفحة A4 كاملة - 3 نسخ متطابقة في الورقة الواحدة</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="px-6 py-2.5 bg-[#F59E0B] hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الآن (Print)</span>
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Preview Viewport */}
          <div className="preview-viewport">
            <div id="printable-a4-page" className="preview-a4-container text-slate-950">
              {renderSingleTicket('نسخة الميزان / الأصل')}

              <div className="relative flex items-center justify-center my-0.5 no-print">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-dashed border-slate-300"></div>
                </div>
                <div className="relative bg-white text-slate-400 px-2 py-0.2 text-[7px] font-black border border-slate-100 rounded-sm">
                  <Scissors className="w-2.5 h-2.5 inline ml-1" />
                  <span>خط الفصل 1</span>
                </div>
              </div>

              {renderSingleTicket('نسخة العميل - المورد')}

              <div className="relative flex items-center justify-center my-0.5 no-print">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-dashed border-slate-300"></div>
                </div>
                <div className="relative bg-white text-slate-400 px-2 py-0.2 text-[7px] font-black border border-slate-100 rounded-sm">
                  <Scissors className="w-2.5 h-2.5 inline ml-1" />
                  <span>خط الفصل 2</span>
                </div>
              </div>

              {renderSingleTicket('نسخة الأمن / البوابة')}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between no-print">
            <p className="text-xs text-slate-500 font-medium">سيتم طباعة ثلاث نسخ متطابقة على صفحة A4 واحدة (الميزان - العميل والمورد - أمن البوابة).</p>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="px-12 py-3.5 bg-gradient-to-r from-[#0F766E] to-teal-800 hover:from-teal-600 hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-xl transition-all flex items-center gap-2 cursor-pointer border border-teal-500/20"
              >
                <Printer className="w-5 h-5" />
                <span>تأكيد الطباعة النهائية</span>
              </button>
              <button
                onClick={onClose}
                className="px-8 py-3.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-2xl cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PrintTicketModal;
