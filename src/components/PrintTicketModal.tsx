import React from 'react';
import { Operation, ScaleSettings } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Building2, CheckCircle2, Scissors, FileText, Layers } from 'lucide-react';

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

  const [printDateTime] = React.useState<{ date: string; time: string }>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const time = `${hours}:${minutes}:${seconds}`;
    return { date, time };
  });

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

  const renderSingleTicket = (copyLabel: string, copyBadgeColor: string = 'bg-teal-50 text-[#0F766E] border-teal-300') => (
    <div 
      className="ticket-half-sheet flex flex-col justify-between bg-white text-slate-950 font-sans p-3 border-2 border-slate-400 rounded-lg relative box-border overflow-hidden" 
      style={{ height: '135mm', minHeight: '135mm', maxHeight: '135mm' }}
    >
      {/* Watermark: نسخة للمعاينة فقط ولا تعد مستند */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 select-none">
        <div className="transform -rotate-12 text-red-500/20 text-sm sm:text-base md:text-xl font-black tracking-wider text-center px-6 py-2 border-2 border-dashed border-red-500/25 rounded-2xl uppercase">
          نسخة للمعاينة فقط ولا تعد مستند
        </div>
      </div>

      {/* 1. Header Banner */}
      <div className="border-b-2 border-[#0F766E] pb-2 mb-1 flex items-center justify-between gap-2 relative z-10">
        {/* Right side (RTL): Logo & Company */}
        <div className="flex items-center gap-2.5">
          <img 
            src={settings.companyLogo || './images.png'} 
            alt="Company Logo" 
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.endsWith('images.png')) {
                target.src = '/logo.png';
              } else {
                target.src = defaultLogoFallback;
              }
            }}
            className="w-13 h-13 object-contain rounded border-2 border-slate-300 shrink-0 bg-white p-0.5" 
          />
          <div>
            <h1 className="text-[16px] font-black text-[#0F766E] tracking-tight leading-tight uppercase">
              {settings.companyName || 'شركة ريتش لاند للصناعات الغذائية'}
            </h1>
            <p className="text-[11.5px] text-slate-800 flex items-center gap-1 font-black mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-[#0F766E]" /> 
              {settings.companyAddress || 'المصنع الرئيسي - ريتش لاند'}
            </p>
          </div>
        </div>

        {/* Center: Top Header Print Date & Time */}
        <div className="text-center px-3.5 py-1 bg-slate-100 rounded-md border-2 border-slate-300">
          <span className="text-[9.5px] font-black text-slate-700 block leading-none mb-0.5">تاريخ وتوقيت الطباعة</span>
          <span className="text-[12.5px] font-black font-mono text-black">{printDateTime.date} | {printDateTime.time}</span>
        </div>

        {/* Left side (RTL): Copy Label & Ticket No & Barcode */}
        <div className="text-left border-r-2 border-slate-300 pr-2.5 flex flex-col items-end">
          <div className="flex items-center gap-1.5 justify-end">
            <span className={`text-[11px] px-2.5 py-0.5 rounded font-black border-2 ${copyBadgeColor}`}>
              {copyLabel}
            </span>
            <div className="bg-[#0F766E] text-white font-black px-2.5 py-0.5 rounded text-[11px]">
              تذكرة وزن
            </div>
          </div>
          <p className="text-[12px] font-black text-slate-900 mt-1 text-left">
            رقم التذكرة: <span className="text-[#0F766E] font-black text-[15px] font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-300 inline-block">{operation.operationNo}</span>
          </p>
        </div>
      </div>

      {/* 2. Details Grid (2 Rows x 4 Columns) */}
      <div className="grid grid-cols-4 gap-x-3 gap-y-1.5 text-[11.5px] bg-teal-50/50 p-2 rounded-lg border-2 border-teal-600/30 relative z-10">
        <div>
          <span className="text-slate-700 font-black block text-[10px] mb-0.5">رقم السيارة:</span>
          <strong className="text-black font-black text-[15px] bg-[#F59E0B]/30 px-2 py-0.5 rounded border-2 border-[#F59E0B] inline-block font-mono">
            {operation.vehicleNo}
          </strong>
        </div>

        <div>
          <span className="text-slate-700 font-black block text-[10px] mb-0.5">اسم السائق:</span>
          <strong className="text-black font-black truncate block text-[13px]">{operation.driver || '-'}</strong>
        </div>

        <div>
          <span className="text-slate-700 font-black block text-[10px] mb-0.5">المورد:</span>
          <strong className="text-black font-black truncate block text-[13px]">{operation.supplier || '-'}</strong>
        </div>

        <div>
          <span className="text-slate-700 font-black block text-[10px] mb-0.5">العميل:</span>
          <strong className="text-black font-black truncate block text-[13px]">{operation.customer || '-'}</strong>
        </div>

        <div>
          <span className="text-slate-700 font-black block text-[10px] mb-0.5">الصنف:</span>
          <strong className="text-black font-black truncate block text-[13.5px]">{operation.item || '-'}</strong>
        </div>

        <div>
          <span className="text-slate-700 font-black block text-[10px] mb-0.5">أمر الشراء / المبيعات:</span>
          <strong className="text-black font-black font-mono text-[13px]">{operation.poNumber || operation.soNumber || operation.permitNumber || '-'}</strong>
        </div>

        <div>
          <span className="text-slate-700 font-black block text-[10px] mb-0.5">نوع الحركة:</span>
          <strong className={`px-2.5 py-0.5 rounded text-[12px] font-black inline-block border-2 ${
            operation.direction === 'صادر' 
              ? 'bg-amber-100 text-amber-950 border-amber-400' 
              : 'bg-emerald-100 text-emerald-950 border-emerald-400'
          }`}>
            {operation.direction || 'وارد'}
          </strong>
        </div>

        <div>
          <span className="text-slate-700 font-black block text-[10px] mb-0.5">العدد / الكمية:</span>
          <strong className="text-black font-black text-[13.5px] font-mono">{operation.quantity || 1}</strong>
        </div>
      </div>

      {/* 3. Prominent Clear Box for Weights */}
      <div className="bg-slate-50 border-2 border-slate-900 rounded-lg p-2 shadow-2xs relative z-10">
        <div className="grid grid-cols-3 gap-2 text-center">
          
          {/* First Weight */}
          <div className="bg-white border-2 border-slate-300 rounded-md p-1.5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-black text-slate-800 block mb-0.5">الوزنة الأولى</span>
              <span className="font-mono font-black text-[20px] text-black">
                {(operation.firstWeight || operation.grossWeight || 0).toLocaleString('en-US')} <span className="text-[12px] font-black font-sans text-slate-700">{settings.unit || 'كجم'}</span>
              </span>
            </div>
            <div className="text-[10px] font-mono font-black text-slate-700 border-t-2 border-slate-200 mt-1 pt-0.5">
              {operation.firstWeightDate && operation.firstWeightTime ? `${operation.firstWeightDate} | ${operation.firstWeightTime}` : `${operation.date} | ${operation.time}`}
            </div>
          </div>

          {/* Second Weight */}
          <div className="bg-white border-2 border-slate-300 rounded-md p-1.5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-black text-slate-800 block mb-0.5">الوزنة الثانية</span>
              <span className="font-mono font-black text-[20px] text-black">
                {(operation.secondWeight || operation.tareWeight || 0).toLocaleString('en-US')} <span className="text-[12px] font-black font-sans text-slate-700">{settings.unit || 'كجم'}</span>
              </span>
            </div>
            <div className="text-[10px] font-mono font-black text-slate-700 border-t-2 border-slate-200 mt-1 pt-0.5">
              {operation.secondWeightDate && operation.secondWeightTime ? `${operation.secondWeightDate} | ${operation.secondWeightTime}` : (operation.secondWeight && operation.secondWeight > 0 ? `${operation.date} | ${operation.time}` : 'في الانتظار')}
            </div>
          </div>

          {/* Net Weight */}
          <div className="net-weight-box bg-teal-50/50 text-slate-950 rounded-md p-1.5 flex flex-col justify-between shadow-none border-3 border-[#0F766E]">
            <div>
              <span className="net-weight-title text-[11.5px] font-black text-[#0F766E] block mb-0.5">الوزن الصافي</span>
              <span className="net-weight-val font-mono font-black text-[26px] text-black leading-tight">
                {(operation.netWeight || 0).toLocaleString('en-US')} <span className="text-[13px] font-black font-sans text-slate-800">{settings.unit || 'كجم'}</span>
              </span>
            </div>
            <div className="net-weight-sub text-[13px] font-black text-[#0F766E] border-t-2 border-teal-300 mt-1 pt-0.5 font-mono">
              {((operation.netWeight || 0) / 1000).toFixed(3)} طن
            </div>
          </div>

        </div>
      </div>

      {/* 4. Certification & Remarks */}
      <div className="space-y-1 relative z-10">
        <div className="text-center">
          <p className="text-[11px] font-black text-[#0F766E] flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            تمت عملية الوزن آلياً بواسطة ميزان إلكتروني موثق ومطابق للمواصفات القياسية
          </p>
        </div>

        <div className="text-[11.5px] px-3 py-1 bg-slate-100 rounded-md border-2 border-slate-300 text-black flex items-start gap-2 font-bold">
          <span className="font-black text-[#0F766E] text-[12px] shrink-0">الملاحظات:</span>
          <span className="break-words font-bold text-slate-950 leading-tight">
            {operation.remarks && operation.remarks.trim() !== '' ? operation.remarks : 'لا توجد ملاحظات'}
          </span>
        </div>
      </div>

      {/* 5. Footer: Developer Signature, QR Code, Barcode & 3 Signatures */}
      <div className="flex items-center justify-between pt-1 border-t-2 border-slate-300 gap-2 relative z-10">
        
        {/* Left Side (RTL): Developer Signature + QR Code + Barcode Section */}
        <div className="flex items-center gap-2 shrink-0 bg-slate-50 p-1 rounded-md border-2 border-slate-300">
          
          {/* Developer Signature Badge before QR code */}
          <div className="flex items-center gap-1.5 pl-1.5 border-l-2 border-slate-300">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center p-0.5 shrink-0 shadow-2xs border border-slate-300 overflow-hidden">
              <img 
                src="./gemini1.jpg" 
                alt="Doka Scale Systems" 
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src.endsWith('gemini1.jpg')) {
                    target.src = './Gemini  1.jpg';
                  } else if (!target.src.includes('doka.jpg')) {
                    target.src = './doka.jpg';
                  } else {
                    target.src = '/logo.png';
                  }
                }}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col text-right leading-none">
              <span className="text-[8.5px] font-black text-black leading-tight">Doka Scale Systems</span>
              <span className="text-[6.5px] font-bold text-slate-700 leading-tight">جميع حقوق التوزيع محفوظة ©</span>
              <span className="text-[8px] font-mono font-black text-[#0F766E] leading-tight mt-0.5" dir="ltr">01008332969</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="p-0.5 bg-white border-2 border-slate-300 rounded shadow-2xs shrink-0">
            <QRCodeSVG value={qrData} size={36} />
          </div>

          {/* 1D Barcode */}
          <div className="flex flex-col items-center justify-center px-1">
            {render1DBarcodeSVG(operation.operationNo)}
            <span className="text-[8.5px] font-mono font-black text-black tracking-wider leading-tight mt-0.5">
              *{operation.operationNo}*
            </span>
          </div>
        </div>

        {/* 3 Clean Spaced Signatures Section (Without Stamp & Seal) */}
        <div className="grid grid-cols-3 gap-4 text-[11px] text-center flex-1 max-w-lg mr-auto">
          <div>
            <p className="font-black text-black leading-tight mb-2 text-[11.5px]">مسؤول الميزان<br/><span className="text-[9px] text-slate-700 font-bold font-mono">({operation.userName || 'الوردية'})</span></p>
            <div className="border-b-2 border-dashed border-slate-700 w-24 mx-auto"></div>
          </div>
          <div>
            <p className="font-black text-black leading-tight mb-2 text-[11.5px]">سائق السيارة<br/><span className="text-[9px] text-slate-700 font-bold">Driver Signature</span></p>
            <div className="border-b-2 border-dashed border-slate-700 w-24 mx-auto"></div>
          </div>
          <div>
            <p className="font-black text-black leading-tight mb-2 text-[11.5px]">أمين المخزن<br/><span className="text-[9px] text-slate-700 font-bold">Warehouse Keeper</span></p>
            <div className="border-b-2 border-dashed border-slate-700 w-24 mx-auto"></div>
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
            background-color: #f0fdfa !important;
            color: #000000 !important;
            border: 3px solid #0F766E !important;
          }
          .net-weight-title {
            color: #0F766E !important;
            font-weight: 900 !important;
            font-size: 12px !important;
          }
          .net-weight-val {
            color: #000000 !important;
            font-weight: 900 !important;
            font-size: 26px !important;
          }
          .net-weight-sub {
            color: #0F766E !important;
            font-weight: 900 !important;
            font-size: 13px !important;
            border-top-color: #5eead4 !important;
          }

          /* 1. Hide all UI elements by default */
          body * {
            visibility: hidden !important;
          }
          
          /* 2. Hide no-print elements */
          .no-print, .no-print * {
            display: none !important;
            visibility: hidden !important;
          }

          /* 3. Make printable pages container and children visible */
          #printable-pages-container, #printable-pages-container * {
            visibility: visible !important;
          }

          /* 4. Position container on printable sheet */
          #printable-pages-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* 5. A4 Sheet definitions (2 Pages) */
          .printable-a4-sheet {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 8mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            background: white !important;
            box-shadow: none !important;
            transform: none !important;
            page-break-after: always !important;
            break-after: page !important;
          }

          .printable-a4-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
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
          flex-direction: column;
          align-items: center;
          gap: 2.5rem;
        }

        .preview-a4-container {
          background: white;
          width: 210mm;
          min-width: 210mm;
          height: 297mm;
          padding: 8mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transform-origin: top center;
          box-shadow: 0 40px 100px -20px rgba(0,0,0,0.8);
          border-radius: 4px;
        }

        @media (max-width: 1600px) { .preview-a4-container { transform: scale(0.85); margin-bottom: -45mm; } }
        @media (max-width: 1400px) { .preview-a4-container { transform: scale(0.7); margin-bottom: -90mm; } }
        @media (max-width: 1024px) { .preview-a4-container { transform: scale(0.5); margin-bottom: -150mm; } }
        @media (max-width: 768px) { .preview-a4-container { transform: scale(0.35); margin-bottom: -190mm; } }
      `}</style>

      <div className="w-full max-w-5xl my-auto">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          
          {/* Modal Header */}
          <div className="bg-[#0F766E] text-white px-6 py-4 flex items-center justify-between border-b border-[#F59E0B]/30 no-print">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F59E0B] text-slate-950 rounded-xl flex items-center justify-center shadow-md">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm flex items-center gap-2">
                  <span>معاينة تذكرة الميزان الرسمية</span>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-400 text-slate-950 rounded-full font-black">ورقتان A4 (4 نسخ)</span>
                </h3>
                <p className="text-[10px] text-teal-100/80">كل ورقة A4 تحتوي على نسختين | إجمالي 4 نسخ: الأصل، الحسابات، العميل، وللحفظ والاطلاع</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="px-6 py-2.5 bg-[#F59E0B] hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الورقتين (4 نسخ)</span>
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Preview Viewport showing Page 1 and Page 2 */}
          <div className="preview-viewport">
            
            <div id="printable-pages-container" className="w-full flex flex-col items-center gap-8">
              
              {/* === PAGE 1 (الورقة الأولى: نسختان) === */}
              <div className="w-full flex flex-col items-center">
                <div className="text-amber-400 text-xs font-bold mb-2 flex items-center gap-1.5 no-print">
                  <Layers className="w-4 h-4" />
                  <span>الورقة الأولى (A4) - أصل التذكرة + نسخة الحسابات</span>
                </div>

                <div className="preview-a4-container printable-a4-sheet text-slate-950">
                  {/* Copy 1: Original */}
                  {renderSingleTicket('أصل التذكرة - السائق', 'bg-emerald-50 text-emerald-900 border-emerald-300')}

                  {/* Cutting Line between Copy 1 & Copy 2 */}
                  <div className="relative flex items-center justify-center my-1 no-print">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-dashed border-slate-300"></div>
                    </div>
                    <div className="relative bg-white text-slate-400 px-2 py-0.5 text-[8px] font-black border border-slate-200 rounded-sm flex items-center gap-1">
                      <Scissors className="w-3 h-3" />
                      <span>خط فصل النسخ (الورقة 1)</span>
                    </div>
                  </div>

                  {/* Copy 2: Accounts */}
                  {renderSingleTicket('نسخة الحسابات والمالية', 'bg-blue-50 text-blue-900 border-blue-300')}
                </div>
              </div>

              {/* === PAGE 2 (الورقة الثانية: نسختان) === */}
              <div className="w-full flex flex-col items-center">
                <div className="text-amber-400 text-xs font-bold mb-2 flex items-center gap-1.5 no-print">
                  <Layers className="w-4 h-4" />
                  <span>الورقة الثانية (A4) - نسخة العميل/المورد + نسخة الحفظ والاطلاع</span>
                </div>

                <div className="preview-a4-container printable-a4-sheet text-slate-950">
                  {/* Copy 3: Customer / Supplier */}
                  {renderSingleTicket('نسخة العميل / المورد', 'bg-purple-50 text-purple-900 border-purple-300')}

                  {/* Cutting Line between Copy 3 & Copy 4 */}
                  <div className="relative flex items-center justify-center my-1 no-print">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-dashed border-slate-300"></div>
                    </div>
                    <div className="relative bg-white text-slate-400 px-2 py-0.5 text-[8px] font-black border border-slate-200 rounded-sm flex items-center gap-1">
                      <Scissors className="w-3 h-3" />
                      <span>خط فصل النسخ (الورقة 2)</span>
                    </div>
                  </div>

                  {/* Copy 4: Archive / Record & Review */}
                  {renderSingleTicket('النسخة الرابعة - للحفظ والاطلاع', 'bg-amber-50 text-amber-900 border-amber-300')}
                </div>
              </div>

            </div>

          </div>

          {/* Modal Footer */}
          <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between no-print">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>سيتم طباعة ورقتين (A4) - كل ورقة تحتوي على نسختين (إجمالي 4 نسخ: أصل التذكرة، الحسابات، العميل، وللحفظ والاطلاع).</span>
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="px-10 py-3.5 bg-gradient-to-r from-[#0F766E] to-teal-800 hover:from-teal-600 hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-xl transition-all flex items-center gap-2 cursor-pointer border border-teal-500/20"
              >
                <Printer className="w-5 h-5" />
                <span>تأكيد وطباعة الورقتين</span>
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
