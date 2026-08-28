import { Printer, PackageCheck } from 'lucide-react';
import { PurchaseOrder } from '../types';

type Props = {
  order: PurchaseOrder;
  companyName?: string;
  companySubtitle?: string;
  logoUrl?: string;
  onClose?: () => void;
};

const money = (value: unknown) => Number(value || 0).toLocaleString('ar-EG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function ModernPurchaseOrderVoucher({
  order,
  companyName = 'شركة ريتشلاند للصناعات الغذائية',
  companySubtitle = 'إدارة المشتريات والتوريدات الزراعية • RICHLAND AGRI & FRESH SUPPLY',
  logoUrl,
  onClose,
}: Props) {
  const isReceived = order.receivedQuantity !== undefined;

  return (
    <>
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          body * { visibility: hidden; }
          #purchase-order-voucher, #purchase-order-voucher * { visibility: visible; }
          #purchase-order-voucher { 
            position: absolute; 
            inset: 0; 
            width: 100%; 
            margin: 0;
            padding: 0;
            background: white !important;
            color: #0f172a !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <section dir="rtl" className="mx-auto max-w-[210mm] bg-slate-100 p-3 sm:p-4 font-sans text-slate-800 print:bg-white print:p-0">
        <div className="no-print mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">معاينة سند أمر التوريد الرسمي للطباعة</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 cursor-pointer"
            >
              <Printer size={18} /> طباعة المستند
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-zinc-200 transition hover:bg-slate-50 cursor-pointer"
              >
                إغلاق
              </button>
            )}
          </div>
        </div>

        <article id="purchase-order-voucher" className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0">
          {/* Header */}
          <header className="relative overflow-hidden bg-slate-900 px-8 py-7 text-white print:bg-slate-900 print:text-white">
            <div className="absolute -left-12 -top-20 h-52 w-52 rounded-full bg-emerald-400/20 pointer-events-none" />
            <div className="absolute -bottom-20 right-16 h-44 w-44 rounded-full bg-cyan-400/10 pointer-events-none" />
            <div className="relative flex items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img src={logoUrl} alt={companyName} className="h-14 w-14 rounded-xl bg-white object-contain p-1 shadow-sm" />
                ) : (
                  <div className="grid h-14 w-14 place-items-center rounded-xl bg-emerald-500 text-xl font-black text-slate-950 shadow-md">
                    RL
                  </div>
                )}
                <div>
                  <p className="text-lg font-black tracking-tight text-white">{companyName}</p>
                  <p className="mt-0.5 text-xs text-slate-300 font-medium">{companySubtitle}</p>
                </div>
              </div>
              <div className="text-left" dir="ltr">
                <p className="text-[11px] font-black tracking-[0.18em] text-emerald-400">PURCHASE ORDER</p>
                <h1 className="mt-1 text-2xl font-black text-white">أمر توريد معتمد</h1>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">Date: {order.pricingDate || new Date().toISOString().split('T')[0]}</p>
              </div>
            </div>
          </header>

          <main className="space-y-5 p-6 sm:p-8">
            {/* Top Quick Info */}
            <section className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Info label="رقم الطلب المسجل" value={order.orderNumber || '—'} accent />
              <Info label="رقم أمر التوريد (PO No)" value={order.poNumber || 'قيد الإصدار'} highlight />
              <Info label="تاريخ التسعير والتوريد" value={order.pricingDate || '—'} />
              <Info 
                label="حالة الطلب" 
                value={
                  order.status === 'Completed' ? 'مكتمل ومعتمد للتنفيذ' :
                  order.status === 'Approved' ? 'معتمد' :
                  order.status === 'Pending Approval' ? 'قيد الاعتماد' :
                  order.status === 'Modification Requested' ? 'مطلوب تعديل' :
                  order.status === 'Rejected' ? 'مرفوض' : String(order.status || '—')
                } 
              />
            </section>

            {/* Supplier & Logistics Details */}
            <section className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-5 md:grid-cols-3">
              <div>
                <p className="text-[11px] font-bold text-slate-400">بيانات المورد</p>
                <p className="mt-1 text-base font-extrabold text-slate-900">{order.supplierName || '—'}</p>
                <p className="mt-1 text-xs text-slate-500">كود المورد: <span className="font-bold text-slate-700">{order.supplierCode || '—'}</span></p>
                {order.paymentMethod && (
                  <p className="mt-1 text-xs text-slate-500">طريقة السداد: <span className="font-semibold text-slate-800">{order.paymentMethod}</span></p>
                )}
              </div>
              <div className="md:border-r md:border-slate-200 md:pr-4">
                <p className="text-[11px] font-bold text-slate-400">المنطقة الجغرافية ومكان التنزيل</p>
                <p className="mt-1 text-base font-extrabold text-slate-900">{order.region || '—'}</p>
                <p className="mt-1 text-xs text-slate-600 font-medium">
                  {order.unloadingLocations && order.unloadingLocations.length > 0 ? order.unloadingLocations.join(' • ') : 'لم يُحدد'}
                </p>
              </div>
              <div className="md:border-r md:border-slate-200 md:pr-4">
                <p className="text-[11px] font-bold text-slate-400">التوجيه الفني والتحاليل</p>
                <div className="mt-1 flex flex-col gap-1 text-xs">
                  <span className="font-bold text-blue-700">التوجيه: {order.initialRouting || 'مياه وملح'}</span>
                  <span className="font-bold text-amber-700">نوع التحليل: {order.analysisType || 'مبيدات'}</span>
                </div>
              </div>
            </section>

            {/* Financial & Items Table */}
            <section className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-right text-sm">
                <thead className="bg-slate-800 text-xs text-white">
                  <tr>
                    <th className="w-12 px-4 py-3 text-center">م</th>
                    <th className="px-4 py-3">الصنف والتصنيف</th>
                    <th className="px-4 py-3">الكمية المطلوبة</th>
                    <th className="px-4 py-3">سعر الوحدة</th>
                    {order.discountPercentage && order.discountPercentage > 0 ? (
                      <>
                        <th className="px-4 py-3">الإجمالي المبدئي</th>
                        <th className="px-4 py-3 text-center">نسبة الخصم</th>
                        <th className="px-4 py-3 text-left">الصافي بعد الخصم</th>
                      </>
                    ) : (
                      <th className="px-4 py-3 text-left">الإجمالي المطلوب</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 bg-white">
                    <td className="px-4 py-4 text-center font-bold text-slate-400">01</td>
                    <td className="px-4 py-4 font-extrabold text-slate-900">
                      {order.itemType || '—'}
                      <span className="mr-2 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {order.itemCategory || 'زيتون فريش'}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-800">
                      {Number(order.quantity || 0).toLocaleString('ar-EG')} {order.unit || 'كجم'}
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-800">{money(order.price)} ج.م / {order.unit || 'كجم'}</td>
                    {order.discountPercentage && order.discountPercentage > 0 ? (
                      <>
                        <td className="px-4 py-4 font-semibold text-slate-600">
                          {money(order.subtotalAmount || (order.quantity * order.price))} ج.م
                        </td>
                        <td className="px-4 py-4 text-center font-extrabold text-rose-600">
                          {order.discountPercentage}%
                          <span className="block text-[11px] font-medium text-rose-500">(-{money(order.discountAmount)} ج.م)</span>
                        </td>
                        <td className="px-4 py-4 text-left font-black text-emerald-700">{money(order.totalAmount)} ج.م</td>
                      </>
                    ) : (
                      <td className="px-4 py-4 text-left font-black text-emerald-700">{money(order.totalAmount)} ج.م</td>
                    )}
                  </tr>
                </tbody>
              </table>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-emerald-50 px-5 py-4 border-t border-emerald-100">
                <div className="flex items-center gap-4 text-xs">
                  <span className="font-bold text-emerald-950 text-sm">إجمالي أمر التوريد المعتمد:</span>
                  {order.discountPercentage && order.discountPercentage > 0 && (
                    <span className="text-slate-600 font-semibold">
                      (المبلغ قبل الخصم: {money(order.subtotalAmount || (order.quantity * order.price))} ج.م — قيمة الخصم: {money(order.discountAmount)} ج.م)
                    </span>
                  )}
                </div>
                <span className="text-lg font-black text-emerald-700">{money(order.totalAmount)} ج.م</span>
              </div>
            </section>

            {/* Actual Receipt Comparison Table (If Recorded) */}
            {isReceived && (
              <section className="overflow-hidden rounded-xl border border-purple-200 bg-purple-50/40">
                <div className="flex items-center justify-between bg-purple-100/70 px-4 py-2.5 text-purple-900 border-b border-purple-200">
                  <span className="text-xs font-extrabold flex items-center gap-1.5">
                    <PackageCheck size={16} className="text-purple-700" />
                    <span>بيان الاستلام الفعلي بالمستودع والمطابقة المالية</span>
                  </span>
                  {order.receivedAt && (
                    <span className="text-[11px] font-medium text-purple-700">
                      تاريخ الاستلام: {new Date(order.receivedAt).toLocaleDateString('ar-EG')}
                    </span>
                  )}
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">الكمية المطلوبة:</span>
                    <strong className="text-slate-800 text-sm">{Number(order.quantity || 0).toLocaleString('ar-EG')} كجم</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">الكمية المستلمة فعلياً:</span>
                    <strong className="text-purple-700 text-sm font-black">{Number(order.receivedQuantity || 0).toLocaleString('ar-EG')} كجم</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">فارق الكمية:</span>
                    <strong className={`text-xs font-black ${
                      (order.receivedQuantity || 0) < order.quantity ? 'text-amber-700' :
                      (order.receivedQuantity || 0) > order.quantity ? 'text-blue-700' : 'text-emerald-700'
                    }`}>
                      {(order.receivedQuantity || 0) < order.quantity
                        ? `عجز: -${(order.quantity - (order.receivedQuantity || 0)).toLocaleString('ar-EG')} كجم`
                        : (order.receivedQuantity || 0) > order.quantity
                        ? `زيادة: +${((order.receivedQuantity || 0) - order.quantity).toLocaleString('ar-EG')} كجم`
                        : 'مطابق 100%'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">صافي القيمة المستحقة بعد الخصم:</span>
                    <strong className="text-purple-900 text-sm font-black">
                      {money(order.receivedTotalAmount !== undefined ? order.receivedTotalAmount : ((order.receivedQuantity || 0) * (order.price || 0)))} ج.م
                    </strong>
                    {order.discountPercentage && order.discountPercentage > 0 && order.receivedDiscountAmount !== undefined && (
                      <span className="block text-[10px] text-rose-600 font-bold mt-0.5">
                        (خصم {order.discountPercentage}% = -{money(order.receivedDiscountAmount)} ج.م)
                      </span>
                    )}
                  </div>
                </div>
                {order.receivingNotes && (
                  <div className="px-4 pb-3 text-xs text-slate-700 border-t border-purple-100 pt-2">
                    <span className="font-bold text-slate-500 text-[10px] block">ملاحظات الاستلام:</span>
                    <p className="mt-0.5">{order.receivingNotes}</p>
                  </div>
                )}
              </section>
            )}

            {/* Notes & Supply Terms */}
            {order.notes && (
              <section className="rounded-xl border-r-4 border-amber-400 bg-amber-50/80 px-4 py-3">
                <p className="text-xs font-bold text-amber-800">ملاحظات وشروط التوريد</p>
                <p className="mt-1 text-sm leading-6 text-amber-950">{order.notes}</p>
              </section>
            )}

            {/* Signatures Grid */}
            <section className={`grid gap-4 border-t border-slate-200 pt-7 text-center text-xs ${
              isReceived ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'
            }`}>
              <Signature role="1. مسؤول التسجيل" name={order.createdByName || order.createdBy} />
              <Signature role="2. مسؤول الاعتماد" name={order.approvedByName} />
              <Signature role="3. مسؤول التنفيذ والمشتريات" name={order.executedByName} />
              {isReceived && (
                <Signature role="4. أمين ومسؤول الاستلام" name={order.receivedByName || order.receivedBy} />
              )}
            </section>
          </main>

          {/* Footer */}
          <footer className="flex items-center justify-between border-t border-slate-100 px-8 py-4 text-[10px] text-slate-400">
            <span>مستند إلكتروني صادر من نظام إدارة المشتريات والتوريد • شركة ريتشلاند</span>
            <span>{order.sapDocNumber ? `SAP Doc: ${order.sapDocNumber}` : (order.poNumber ? `PO: ${order.poNumber}` : 'نسخة معتمدة')}</span>
          </footer>
        </article>
      </section>
    </>
  );
}

function Info({ label, value, accent = false, highlight = false }: { label: string; value: string; accent?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${
      highlight ? 'border-emerald-300 bg-emerald-50/60' :
      accent ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-white'
    }`}>
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-sm font-black ${highlight ? 'text-emerald-800' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

function Signature({ role, name }: { role: string; name?: string }) {
  return (
    <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
      <p className="font-bold text-slate-700">{role}</p>
      <p className="mt-4 min-h-[1.25rem] font-extrabold text-slate-900 text-xs truncate">{name || '......................'}</p>
      <div className="mt-5 border-t border-dashed border-slate-300 pt-1 text-[10px] text-slate-400">التوقيع والختم</div>
    </div>
  );
}
