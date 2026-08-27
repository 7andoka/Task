import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  ArrowRight, 
  Check, 
  X, 
  Printer, 
  Download, 
  Edit3, 
  Trash2, 
  Eye, 
  Building2, 
  MapPin, 
  UserCheck, 
  BadgeCheck, 
  Send, 
  DollarSign, 
  Layers, 
  Sparkles,
  ChevronDown,
  RefreshCw,
  FileSpreadsheet,
  Calendar,
  Hash,
  ShoppingBag,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, UserProfile, PurchaseOrder, PurchaseOrderStatus } from '../types';
import { storageService } from '../services/storageService';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { COLLECTIONS } from '../constants';
import { toast } from 'sonner';

interface PurchaseOrdersProps {
  lang: Language;
  user: UserProfile | null;
}

const COMMON_REGIONS = [
  'طريق مصر إسكندرية الصحراوي',
  'وادي النطرون',
  'الإسماعيلية',
  'مرسى مطروح',
  'العريش و سيناء',
  'الفيوم',
  'بني سويف',
  'الشرقية',
  'البحيرة',
  'الواحات البحرية',
  'السادات',
  'النوبارية'
];

const COMMON_ITEM_TYPES = [
  'زيتون تفاحي فريش',
  'زيتون بيكوال فريش',
  'زيتون عجيزي فريش',
  'زيتون منزانيللا فريش',
  'زيتون دولسي فريش',
  'زيتون كلاماتا فريش',
  'فلفل هالبينو أخضر',
  'فلفل هالبينو أحمر',
  'فلفل مكسيكي شطة',
  'فلفل بلدي رومي',
  'زيتون كبران فريش',
  'خام زراعي مشكل'
];

const UNITS = ['كجم', 'طن', 'شيكارة', 'صندوق', 'قفص', 'برميل'];

export default function PurchaseOrders({ lang, user }: PurchaseOrdersProps) {
  const isRtl = lang === 'ar';
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  
  // Strict Permission checks (No overlapping of generic roles)
  const isAdmin = userRoles.includes('Admin') || userRoles.includes('Warehouse Manager');
  const isRegistrationOfficer = isAdmin || userRoles.includes('Registration Officer');
  const isApprovalOfficer = isAdmin || userRoles.includes('Approval Officer');
  const isExecutionOfficer = isAdmin || userRoles.includes('Execution Officer');

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStageTab, setActiveStageTab] = useState<'all' | 'pending_approval' | 'pending_execution' | 'completed' | 'rejected'>('all');
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedItemType, setSelectedItemType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // Form states for Registration (Stage 1)
  const [formData, setFormData] = useState({
    pricingDate: new Date().toISOString().split('T')[0],
    region: '',
    supplierName: '',
    supplierCode: '',
    itemType: '',
    itemCategory: 'زيتون فريش',
    quantity: '',
    unit: 'كجم',
    price: '',
    notes: '',
  });

  // Action input states (Approval / Execution)
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [poNumberInput, setPoNumberInput] = useState('');
  const [sapDocInput, setSapDocInput] = useState('');
  const [executionNotesInput, setExecutionNotesInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Real-time listener from Firestore
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, COLLECTIONS.PURCHASE_ORDERS), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData: PurchaseOrder[] = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as PurchaseOrder));
      setOrders(docsData);
      setLoading(false);
    }, (error) => {
      console.warn("Firestore snapshot failed, fallback to storageService:", error);
      storageService.getPurchaseOrders().then(data => {
        if (data) setOrders(data);
        setLoading(false);
      }).catch(err => {
        console.error("Failed to load POs:", err);
        setLoading(false);
      });
    });

    return () => unsubscribe();
  }, []);

  // Calculate unique lists for filters
  const uniqueSuppliers = useMemo(() => {
    const list = Array.from(new Set(orders.map(o => o.supplierName).filter(Boolean)));
    return list.sort();
  }, [orders]);

  const uniqueRegions = useMemo(() => {
    const list = Array.from(new Set([...COMMON_REGIONS, ...orders.map(o => o.region).filter(Boolean)]));
    return list.sort();
  }, [orders]);

  const uniqueItemTypes = useMemo(() => {
    const list = Array.from(new Set([...COMMON_ITEM_TYPES, ...orders.map(o => o.itemType).filter(Boolean)]));
    return list.sort();
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Stage Tab Filter
      if (activeStageTab === 'pending_approval' && order.status !== 'Pending Approval') return false;
      if (activeStageTab === 'pending_execution' && order.status !== 'Approved') return false;
      if (activeStageTab === 'completed' && order.status !== 'Completed') return false;
      if (activeStageTab === 'rejected' && order.status !== 'Rejected') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery = 
          (order.orderNumber || '').toLowerCase().includes(q) ||
          (order.poNumber || '').toLowerCase().includes(q) ||
          (order.supplierName || '').toLowerCase().includes(q) ||
          (order.region || '').toLowerCase().includes(q) ||
          (order.itemType || '').toLowerCase().includes(q) ||
          (order.createdByName || '').toLowerCase().includes(q) ||
          (order.approvedByName || '').toLowerCase().includes(q) ||
          (order.executedByName || '').toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Region Filter
      if (selectedRegion && order.region !== selectedRegion) return false;

      // Supplier Filter
      if (selectedSupplier && order.supplierName !== selectedSupplier) return false;

      // Item Type Filter
      if (selectedItemType && order.itemType !== selectedItemType) return false;

      // Date Range Filter
      if (startDate && order.pricingDate < startDate) return false;
      if (endDate && order.pricingDate > endDate) return false;

      return true;
    });
  }, [orders, activeStageTab, searchQuery, selectedRegion, selectedSupplier, selectedItemType, startDate, endDate]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const pendingApproval = orders.filter(o => o.status === 'Pending Approval').length;
    const pendingExecution = orders.filter(o => o.status === 'Approved').length;
    const completed = orders.filter(o => o.status === 'Completed').length;
    const rejected = orders.filter(o => o.status === 'Rejected').length;
    
    const totalQuantity = orders
      .filter(o => o.status !== 'Rejected')
      .reduce((sum, o) => sum + (Number(o.quantity) || 0), 0);

    const totalValue = orders
      .filter(o => o.status !== 'Rejected')
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    return {
      totalCount,
      pendingApproval,
      pendingExecution,
      completed,
      rejected,
      totalQuantity,
      totalValue
    };
  }, [orders]);

  // Handle Stage 1: Create / Register new pricing order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierName || !formData.itemType || !formData.quantity || !formData.price || !formData.region) {
      toast.error(isRtl ? 'يرجى ملء جميع الحقول الإلزامية المطلوبة' : 'Please fill all required fields');
      return;
    }

    const qty = parseFloat(formData.quantity) || 0;
    const unitPrice = parseFloat(formData.price) || 0;
    const totalAmount = qty * unitPrice;

    // Generate Order Number
    const timestamp = Date.now();
    const orderSeq = String(orders.length + 1).padStart(4, '0');
    const orderNumber = `REQ-${new Date().getFullYear()}-${orderSeq}`;

    const newOrder: PurchaseOrder = {
      id: `po_req_${timestamp}_${Math.random().toString(36).substr(2, 6)}`,
      orderNumber,
      pricingDate: formData.pricingDate,
      region: formData.region.trim(),
      supplierName: formData.supplierName.trim(),
      supplierCode: formData.supplierCode.trim(),
      itemType: formData.itemType.trim(),
      itemCategory: formData.itemCategory,
      quantity: qty,
      unit: formData.unit,
      price: unitPrice,
      totalAmount,
      currency: 'ج.م',
      notes: formData.notes.trim(),
      status: 'Pending Approval',
      createdBy: user?.uid || user?.username || 'unknown',
      createdByName: user?.displayName || user?.username || (isRtl ? 'مسئول التسجيل' : 'Registration Officer'),
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };

    setActionLoading(true);
    try {
      await storageService.savePurchaseOrder(newOrder);
      toast.success(isRtl ? `تم تسجيل طلب التسعير بنجاح برقم ${orderNumber} وتم تحويله لمسئول الاعتماد` : `Order registered successfully (${orderNumber})`);
      setIsCreateModalOpen(false);
      setFormData({
        pricingDate: new Date().toISOString().split('T')[0],
        region: '',
        supplierName: '',
        supplierCode: '',
        itemType: '',
        itemCategory: 'زيتون فريش',
        quantity: '',
        unit: 'كجم',
        price: '',
        notes: '',
      });
    } catch (err: any) {
      toast.error(isRtl ? `خطأ أثناء حفظ الطلب: ${err.message}` : `Error saving order: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit existing order (by creator / admin before final completion)
  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const qty = parseFloat(formData.quantity) || 0;
    const unitPrice = parseFloat(formData.price) || 0;
    const totalAmount = qty * unitPrice;

    const updatedOrder: PurchaseOrder = {
      ...selectedOrder,
      pricingDate: formData.pricingDate,
      region: formData.region.trim(),
      supplierName: formData.supplierName.trim(),
      supplierCode: formData.supplierCode.trim(),
      itemType: formData.itemType.trim(),
      itemCategory: formData.itemCategory,
      quantity: qty,
      unit: formData.unit,
      price: unitPrice,
      totalAmount,
      notes: formData.notes.trim(),
      lastUpdatedAt: new Date().toISOString(),
    };

    setActionLoading(true);
    try {
      await storageService.savePurchaseOrder(updatedOrder);
      toast.success(isRtl ? 'تم تحديث بيانات الطلب بنجاح' : 'Order updated successfully');
      setIsEditModalOpen(false);
      setSelectedOrder(null);
    } catch (err: any) {
      toast.error(isRtl ? `خطأ أثناء التحديث: ${err.message}` : `Update error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Stage 2: Approve Order
  const handleApproveOrder = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const updatedOrder: PurchaseOrder = {
        ...selectedOrder,
        status: 'Approved',
        approvedBy: user?.uid || user?.username || 'approver',
        approvedByName: user?.displayName || user?.username || (isRtl ? 'مسئول الاعتماد' : 'Approval Officer'),
        approvedAt: new Date().toISOString(),
        approvalNotes: approvalNotes.trim() || undefined,
        lastUpdatedAt: new Date().toISOString(),
      };

      await storageService.savePurchaseOrder(updatedOrder);
      toast.success(isRtl ? 'تم اعتماد الطلب والأسعار بنجاح! تم تحويله لمسئول التنفيذ لإصدار أمر التوريد.' : 'Order approved and sent for PO execution.');
      setIsApproveModalOpen(false);
      setSelectedOrder(null);
      setApprovalNotes('');
    } catch (err: any) {
      toast.error(isRtl ? `خطأ أثناء الاعتماد: ${err.message}` : `Approval error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Stage 2: Reject Order
  const handleRejectOrder = async () => {
    if (!selectedOrder) return;
    if (!rejectionReason.trim()) {
      toast.error(isRtl ? 'يرجى كتابة سبب الرفض' : 'Please provide a rejection reason');
      return;
    }
    setActionLoading(true);
    try {
      const updatedOrder: PurchaseOrder = {
        ...selectedOrder,
        status: 'Rejected',
        approvedBy: user?.uid || user?.username || 'approver',
        approvedByName: user?.displayName || user?.username || (isRtl ? 'مسئول الاعتماد' : 'Approval Officer'),
        approvedAt: new Date().toISOString(),
        rejectionReason: rejectionReason.trim(),
        lastUpdatedAt: new Date().toISOString(),
      };

      await storageService.savePurchaseOrder(updatedOrder);
      toast.error(isRtl ? 'تم رفض الطلب وتسجيل سبب الرفض.' : 'Order rejected.');
      setIsRejectModalOpen(false);
      setSelectedOrder(null);
      setRejectionReason('');
    } catch (err: any) {
      toast.error(isRtl ? `خطأ أثناء الرفض: ${err.message}` : `Rejection error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Stage 3: Execution / PO Generation & Finish
  const handleExecuteOrder = async () => {
    if (!selectedOrder) return;
    if (!poNumberInput.trim()) {
      toast.error(isRtl ? 'يرجى إدخال رقم أمر التوريد (PO Number)' : 'Please enter PO Number');
      return;
    }

    setActionLoading(true);
    try {
      const updatedOrder: PurchaseOrder = {
        ...selectedOrder,
        status: 'Completed',
        poNumber: poNumberInput.trim(),
        sapDocNumber: sapDocInput.trim() || undefined,
        executedBy: user?.uid || user?.username || 'executor',
        executedByName: user?.displayName || user?.username || (isRtl ? 'مسئول التنفيذ' : 'Execution Officer'),
        executedAt: new Date().toISOString(),
        executionNotes: executionNotesInput.trim() || undefined,
        lastUpdatedAt: new Date().toISOString(),
      };

      await storageService.savePurchaseOrder(updatedOrder);
      toast.success(isRtl ? `تم إنشاء أمر التوريد بنجاح برقم (${poNumberInput.trim()}) وإنهاء الإجراء!` : `PO created successfully (${poNumberInput.trim()})`);
      setIsExecuteModalOpen(false);
      setSelectedOrder(null);
      setPoNumberInput('');
      setSapDocInput('');
      setExecutionNotesInput('');
    } catch (err: any) {
      toast.error(isRtl ? `خطأ أثناء إصدار أمر التوريد: ${err.message}` : `Execution error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Order
  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm(isRtl ? 'هل أنت متأكد من حذف هذا الطلب نهائياً؟' : 'Are you sure you want to delete this order?')) return;
    try {
      await storageService.deletePurchaseOrder(id);
      toast.success(isRtl ? 'تم حذف الطلب بنجاح' : 'Order deleted');
    } catch (err: any) {
      toast.error(isRtl ? `خطأ في الحذف: ${err.message}` : `Delete error: ${err.message}`);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error(isRtl ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }

    const headers = [
      'رقم الطلب',
      'الحالة',
      'تاريخ التسعير',
      'المنطقة',
      'المورد',
      'الصنف',
      'الكمية',
      'الوحدة',
      'السعر',
      'الإجمالي (ج.م)',
      'رقم أمر التوريد (PO)',
      'مسئول التسجيل',
      'تاريخ التسجيل',
      'مسئول الاعتماد',
      'تاريخ الاعتماد',
      'مسئول التنفيذ',
      'تاريخ التنفيذ',
      'الملاحظات'
    ];

    const rows = filteredOrders.map(o => [
      `"${o.orderNumber || ''}"`,
      `"${getStatusBadge(o.status).label}"`,
      `"${o.pricingDate || ''}"`,
      `"${o.region || ''}"`,
      `"${o.supplierName || ''}"`,
      `"${o.itemType || ''}"`,
      o.quantity || 0,
      `"${o.unit || ''}"`,
      o.price || 0,
      o.totalAmount || 0,
      `"${o.poNumber || ''}"`,
      `"${o.createdByName || ''}"`,
      `"${o.createdAt ? new Date(o.createdAt).toLocaleDateString('ar-EG') : ''}"`,
      `"${o.approvedByName || ''}"`,
      `"${o.approvedAt ? new Date(o.approvedAt).toLocaleDateString('ar-EG') : ''}"`,
      `"${o.executedByName || ''}"`,
      `"${o.executedAt ? new Date(o.executedAt).toLocaleDateString('ar-EG') : ''}"`,
      `"${(o.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Purchase_Orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(isRtl ? 'تم تصدير ملف Excel بنجاح' : 'Excel file exported');
  };

  // Helper for Status Badge
  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'Pending Approval':
        return {
          label: isRtl ? 'في انتظار الاعتماد' : 'Pending Approval',
          color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          icon: Clock,
          step: 1
        };
      case 'Approved':
        return {
          label: isRtl ? 'معتمد (في انتظار أمر التوريد)' : 'Approved (Pending PO)',
          color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
          icon: UserCheck,
          step: 2
        };
      case 'Completed':
        return {
          label: isRtl ? 'تم إصدار أمر التوريد (مكتمل)' : 'PO Issued (Completed)',
          color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          icon: CheckCircle2,
          step: 3
        };
      case 'Rejected':
        return {
          label: isRtl ? 'مرفوض' : 'Rejected',
          color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
          icon: XCircle,
          step: 0
        };
      default:
        return {
          label: status,
          color: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
          icon: AlertTriangle,
          step: 0
        };
    }
  };

  // Trigger Print Voucher Modal
  const handlePrintVoucher = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-16" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Header Banner with Workflow Steps and New Request Button */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-800 to-zinc-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-emerald-200">
              <ShoppingBag size={14} />
              <span>{isRtl ? 'دورة عمل أوامر التوريد والتسعير' : 'Purchase Orders & Pricing Lifecycle'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isRtl ? 'إدارة واعتماد أوامر التوريد' : 'Purchase Orders Workflow'}
            </h1>
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
              {isRtl 
                ? 'مسار إلكتروني ثلاثي المراحل: يبدأ بتسجيل وتسعير الطلبات، يليه اعتماد ومراجعة الإدارة، ثم إصدار أمر التوريد والـ PO الفعلي.'
                : 'A 3-stage automated lifecycle: Registration & Pricing, Management Approval, and PO Generation & Execution.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0">
            {isRegistrationOfficer && (
              <button
                id="btn-new-purchase-order"
                onClick={() => {
                  setFormData({
                    pricingDate: new Date().toISOString().split('T')[0],
                    region: '',
                    supplierName: '',
                    supplierCode: '',
                    itemType: '',
                    itemCategory: 'زيتون فريش',
                    quantity: '',
                    unit: 'كجم',
                    price: '',
                    notes: '',
                  });
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95"
              >
                <Plus size={18} />
                <span>{isRtl ? 'تسجيل طلب تسعير جديد' : 'New Pricing Request'}</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-sm backdrop-blur-md transition-all active:scale-95"
              title={isRtl ? 'تصدير إكسل' : 'Export Excel'}
            >
              <FileSpreadsheet size={18} />
              <span className="hidden sm:inline">{isRtl ? 'تصدير Excel' : 'Export'}</span>
            </button>
          </div>
        </div>

        {/* 3-Step Lifecycle Visual Indicator */}
        <div className="relative mt-8 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-base shrink-0">
              1
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium">{isRtl ? 'المرحلة الأولى' : 'Stage 1'}</p>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{isRtl ? 'مسئول التسجيل' : 'Registration'}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-normal">
                  {stats.pendingApproval} {isRtl ? 'طلب' : 'reqs'}
                </span>
              </h4>
              <p className="text-[11px] text-zinc-300 truncate">{isRtl ? 'التسعير، المنطقة، المورد، الصنف' : 'Pricing, Region, Supplier, Qty'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-base shrink-0">
              2
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium">{isRtl ? 'المرحلة الثانية' : 'Stage 2'}</p>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{isRtl ? 'مسئول الاعتماد' : 'Approval'}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-normal">
                  {stats.pendingExecution} {isRtl ? 'طلب' : 'reqs'}
                </span>
              </h4>
              <p className="text-[11px] text-zinc-300 truncate">{isRtl ? 'مراجعة واعتماد الأسعار والبيانات' : 'Data & Price Verification'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-base shrink-0">
              3
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium">{isRtl ? 'المرحلة الثالثة' : 'Stage 3'}</p>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{isRtl ? 'مسئول التنفيذ' : 'PO Execution'}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">
                  {stats.completed} {isRtl ? 'أمر PO' : 'POs'}
                </span>
              </h4>
              <p className="text-[11px] text-zinc-300 truncate">{isRtl ? 'إصدار أمر التوريد والـ PO والانتهاء' : 'PO Creation & Completion'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
            <span>{isRtl ? 'إجمالي الطلبات' : 'Total Orders'}</span>
            <FileText size={16} className="text-zinc-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-zinc-900 dark:text-white">{stats.totalCount}</div>
            <p className="text-[11px] text-zinc-400 mt-0.5">{isRtl ? 'طلب مسجل بالنظام' : 'total registered'}</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveStageTab('pending_approval')}
          className={`bg-white dark:bg-zinc-900 p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${activeStageTab === 'pending_approval' ? 'ring-2 ring-amber-500 border-amber-500' : 'border-zinc-200 dark:border-zinc-800 hover:border-amber-400'}`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <span>{isRtl ? 'في انتظار الاعتماد' : 'Pending Approval'}</span>
            <Clock size={16} />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.pendingApproval}</div>
            <p className="text-[11px] text-zinc-400 mt-0.5">{isRtl ? 'تنتظر مراجعة المدير' : 'awaiting approval'}</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveStageTab('pending_execution')}
          className={`bg-white dark:bg-zinc-900 p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${activeStageTab === 'pending_execution' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-400'}`}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs font-semibold">
            <span>{isRtl ? 'في انتظار التنفيذ' : 'Pending Execution'}</span>
            <UserCheck size={16} />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.pendingExecution}</div>
            <p className="text-[11px] text-zinc-400 mt-0.5">{isRtl ? 'معتمدة - بإصدار PO' : 'approved for PO'}</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveStageTab('completed')}
          className={`bg-white dark:bg-zinc-900 p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${activeStageTab === 'completed' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-400'}`}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <span>{isRtl ? 'أوامر PO مصدرة' : 'PO Completed'}</span>
            <CheckCircle2 size={16} />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.completed}</div>
            <p className="text-[11px] text-zinc-400 mt-0.5">{isRtl ? 'تم إصدار الـ PO بنجاح' : 'POs generated'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
            <span>{isRtl ? 'إجمالي الكميات' : 'Total Quantities'}</span>
            <Layers size={16} className="text-indigo-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {stats.totalQuantity.toLocaleString()}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">{isRtl ? 'كجم / طن معتمد ومسجل' : 'kg / tons registered'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
            <span>{isRtl ? 'إجمالي القيمة' : 'Total Value'}</span>
            <DollarSign size={16} className="text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 truncate">
              {stats.totalValue.toLocaleString()} <span className="text-xs font-normal text-zinc-400">ج.م</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">{isRtl ? 'إجمالي أوامر التوريد' : 'total value in EGP'}</p>
          </div>
        </div>
      </div>

      {/* Unified Search & Multi-Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        
        {/* Stage Filter Tabs & Search Bar Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Stage Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/70 rounded-xl overflow-x-auto text-xs font-bold shrink-0">
            <button
              onClick={() => setActiveStageTab('all')}
              className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${activeStageTab === 'all' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
            >
              {isRtl ? 'جميع الطلبات' : 'All Requests'} ({orders.length})
            </button>
            <button
              onClick={() => setActiveStageTab('pending_approval')}
              className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${activeStageTab === 'pending_approval' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'}`}
            >
              <span>{isRtl ? 'بانتظار الاعتماد' : 'Pending Approval'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">{stats.pendingApproval}</span>
            </button>
            <button
              onClick={() => setActiveStageTab('pending_execution')}
              className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${activeStageTab === 'pending_execution' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-600 dark:text-blue-400 hover:bg-blue-500/10'}`}
            >
              <span>{isRtl ? 'بانتظار التنفيذ' : 'Pending Execution'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">{stats.pendingExecution}</span>
            </button>
            <button
              onClick={() => setActiveStageTab('completed')}
              className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${activeStageTab === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'}`}
            >
              <span>{isRtl ? 'أوامر PO مكتملة' : 'Completed PO'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">{stats.completed}</span>
            </button>
            <button
              onClick={() => setActiveStageTab('rejected')}
              className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${activeStageTab === 'rejected' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'}`}
            >
              <span>{isRtl ? 'مرفوض' : 'Rejected'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">{stats.rejected}</span>
            </button>
          </div>

          {/* Search Input and Filter Toggle */}
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? 'بحث برقم الـ PO، المورد، المنطقة، الصنف، رقم الطلب...' : 'Search PO, Supplier, Region, Item...'}
                className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${showFilters ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'}`}
            >
              <SlidersHorizontal size={16} />
              <span className="hidden sm:inline">{isRtl ? 'فلاتر متقدمة' : 'Filters'}</span>
            </button>
          </div>
        </div>

        {/* Expandable Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-3 border-t border-zinc-100 dark:border-zinc-800"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-semibold">
                
                {/* Region Filter */}
                <div className="space-y-1.5">
                  <label className="text-zinc-500 flex items-center gap-1">
                    <MapPin size={14} className="text-emerald-500" />
                    <span>{isRtl ? 'المنطقة' : 'Region'}</span>
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white"
                  >
                    <option value="">{isRtl ? 'جميع المناطق' : 'All Regions'}</option>
                    {uniqueRegions.map(reg => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>

                {/* Supplier Filter */}
                <div className="space-y-1.5">
                  <label className="text-zinc-500 flex items-center gap-1">
                    <Building2 size={14} className="text-teal-500" />
                    <span>{isRtl ? 'المورد' : 'Supplier'}</span>
                  </label>
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white"
                  >
                    <option value="">{isRtl ? 'جميع الموردين' : 'All Suppliers'}</option>
                    {uniqueSuppliers.map(sup => (
                      <option key={sup} value={sup}>{sup}</option>
                    ))}
                  </select>
                </div>

                {/* Item Type Filter */}
                <div className="space-y-1.5">
                  <label className="text-zinc-500 flex items-center gap-1">
                    <Layers size={14} className="text-indigo-500" />
                    <span>{isRtl ? 'نوع الصنف' : 'Item Type'}</span>
                  </label>
                  <select
                    value={selectedItemType}
                    onChange={(e) => setSelectedItemType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white"
                  >
                    <option value="">{isRtl ? 'جميع الأصناف' : 'All Items'}</option>
                    {uniqueItemTypes.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div className="space-y-1.5">
                  <label className="text-zinc-500 flex items-center gap-1">
                    <Calendar size={14} className="text-amber-500" />
                    <span>{isRtl ? 'من تاريخ' : 'From Date'}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white"
                    />
                    {(selectedRegion || selectedSupplier || selectedItemType || startDate || endDate) && (
                      <button
                        onClick={() => {
                          setSelectedRegion('');
                          setSelectedSupplier('');
                          setSelectedItemType('');
                          setStartDate('');
                          setEndDate('');
                        }}
                        className="px-3 py-2 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-xs font-bold shrink-0"
                      >
                        {isRtl ? 'مسح' : 'Clear'}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Orders List / Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          <p className="text-zinc-500 text-sm font-medium">{isRtl ? 'جاري تحميل أوامر التوريد...' : 'Loading purchase orders...'}</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-4 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
            <FileText size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
              {isRtl ? 'لا توجد أوامر توريد مطابقة' : 'No Purchase Orders Found'}
            </h3>
            <p className="text-zinc-500 text-xs max-w-md">
              {isRtl 
                ? 'لم يتم العثور على أي طلبات في هذه المرحلة أو الفلاتر المحددة. يمكنك الضغط على "تسجيل طلب تسعير جديد" للبدء.' 
                : 'No orders found matching the criteria. Click "New Pricing Request" to create one.'}
            </p>
          </div>
          {isRegistrationOfficer && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 hover:bg-emerald-600"
            >
              <Plus size={16} />
              <span>{isRtl ? 'تسجيل طلب تسعير جديد' : 'New Pricing Request'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const badge = getStatusBadge(order.status);
            const StatusIcon = badge.icon;

            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                {/* Header of Item Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-base text-zinc-900 dark:text-white">
                          {order.orderNumber || 'طلب تسعير'}
                        </span>
                        {order.poNumber && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500 text-white text-xs font-black tracking-wide flex items-center gap-1 shadow-sm">
                            <BadgeCheck size={13} />
                            <span>PO: {order.poNumber}</span>
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${badge.color}`}>
                          <StatusIcon size={13} />
                          <span>{badge.label}</span>
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>📅 {isRtl ? 'تاريخ التسعير:' : 'Pricing Date:'} {order.pricingDate}</span>
                        <span>•</span>
                        <span>📍 {order.region}</span>
                      </p>
                    </div>
                  </div>

                  {/* Pricing & Total Amount Highlight */}
                  <div className="flex items-center gap-3 self-start sm:self-auto bg-zinc-50 dark:bg-zinc-800/60 px-4 py-2 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">{isRtl ? 'إجمالي القيمة التقديرية' : 'Total Amount'}</p>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {order.totalAmount.toLocaleString()} <span className="text-xs font-bold text-zinc-500">ج.م</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Main Order Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-400 block mb-1 font-medium">{isRtl ? 'المورد' : 'Supplier'}</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm block truncate">
                      {order.supplierName}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-400 block mb-1 font-medium">{isRtl ? 'نوع الصنف' : 'Item Type'}</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm block truncate">
                      {order.itemType}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-400 block mb-1 font-medium">{isRtl ? 'الكمية المطلوبة' : 'Quantity'}</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm block">
                      {order.quantity.toLocaleString()} {order.unit}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-400 block mb-1 font-medium">{isRtl ? 'سعر الوحدة' : 'Unit Price'}</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm block">
                      {order.price.toLocaleString()} ج.م / {order.unit}
                    </span>
                  </div>
                </div>

                {/* Workflow Tracking History Bar */}
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-[11px] grid grid-cols-1 md:grid-cols-3 gap-2">
                  
                  {/* Step 1: Registered */}
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                      ✓
                    </div>
                    <div className="truncate">
                      <span className="text-zinc-400">{isRtl ? 'المسجل:' : 'Registered by:'}</span>{' '}
                      <strong className="text-zinc-800 dark:text-zinc-200">{order.createdByName || order.createdBy}</strong>
                      <span className="text-zinc-400 block text-[10px]">
                        {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>

                  {/* Step 2: Approved / Rejected */}
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${order.approvedByName ? 'bg-emerald-500/20 text-emerald-600' : order.status === 'Rejected' ? 'bg-rose-500/20 text-rose-600' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'}`}>
                      {order.approvedByName ? '✓' : order.status === 'Rejected' ? '✕' : '2'}
                    </div>
                    <div className="truncate">
                      <span className="text-zinc-400">{isRtl ? 'الاعتماد:' : 'Approved by:'}</span>{' '}
                      {order.approvedByName ? (
                        <strong className="text-zinc-800 dark:text-zinc-200">{order.approvedByName}</strong>
                      ) : (
                        <span className="text-amber-500 italic">{isRtl ? 'بانتظار الاعتماد...' : 'Pending...'}</span>
                      )}
                      {order.approvedAt && (
                        <span className="text-zinc-400 block text-[10px]">
                          {new Date(order.approvedAt).toLocaleDateString('ar-EG')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Executed (PO Created) */}
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${order.executedByName ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'}`}>
                      {order.executedByName ? '✓' : '3'}
                    </div>
                    <div className="truncate">
                      <span className="text-zinc-400">{isRtl ? 'التنفيذ (PO):' : 'PO by:'}</span>{' '}
                      {order.executedByName ? (
                        <strong className="text-zinc-800 dark:text-zinc-200">{order.executedByName} ({order.poNumber})</strong>
                      ) : order.status === 'Approved' ? (
                        <span className="text-blue-500 font-bold">{isRtl ? 'جاهز لإصدار الـ PO' : 'Ready for PO'}</span>
                      ) : (
                        <span className="text-zinc-400 italic">-</span>
                      )}
                      {order.executedAt && (
                        <span className="text-zinc-400 block text-[10px]">
                          {new Date(order.executedAt).toLocaleDateString('ar-EG')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes or Rejection Reason if present */}
                {(order.notes || order.approvalNotes || order.rejectionReason) && (
                  <div className="text-xs p-2.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-500/20 space-y-1">
                    {order.notes && (
                      <p className="text-zinc-600 dark:text-zinc-300">
                        <strong className="text-amber-700 dark:text-amber-400">{isRtl ? 'ملاحظات التسجيل:' : 'Notes:'}</strong> {order.notes}
                      </p>
                    )}
                    {order.approvalNotes && (
                      <p className="text-zinc-600 dark:text-zinc-300">
                        <strong className="text-blue-600 dark:text-blue-400">{isRtl ? 'ملاحظات الاعتماد:' : 'Approval notes:'}</strong> {order.approvalNotes}
                      </p>
                    )}
                    {order.rejectionReason && (
                      <p className="text-rose-600 dark:text-rose-400 font-semibold">
                        <strong>{isRtl ? 'سبب الرفض:' : 'Rejection Reason:'}</strong> {order.rejectionReason}
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    {/* Print / View Voucher Button */}
                    <button
                      onClick={() => handlePrintVoucher(order)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all"
                    >
                      <Printer size={14} />
                      <span>{isRtl ? 'سند أمر التوريد' : 'Voucher'}</span>
                    </button>

                    {/* Edit button (available for creator if pending approval) */}
                    {(isRegistrationOfficer && order.status === 'Pending Approval') && (
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setFormData({
                            pricingDate: order.pricingDate,
                            region: order.region,
                            supplierName: order.supplierName,
                            supplierCode: order.supplierCode || '',
                            itemType: order.itemType,
                            itemCategory: order.itemCategory || 'زيتون فريش',
                            quantity: String(order.quantity),
                            unit: order.unit,
                            price: String(order.price),
                            notes: order.notes || '',
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all"
                      >
                        <Edit3 size={14} />
                        <span>{isRtl ? 'تعديل' : 'Edit'}</span>
                      </button>
                    )}

                    {/* Delete button (creator if pending approval) */}
                    {(isRegistrationOfficer && order.status === 'Pending Approval') && (
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                        title={isRtl ? 'حذف' : 'Delete'}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Stage-Specific Workflow Actions */}
                  <div className="flex items-center gap-2">
                    
                    {/* Stage 2 Action: Approval Officer -> Approve or Reject */}
                    {isApprovalOfficer && order.status === 'Pending Approval' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setRejectionReason('');
                            setIsRejectModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-xs font-bold transition-all"
                        >
                          <X size={14} />
                          <span>{isRtl ? 'رفض' : 'Reject'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setApprovalNotes('');
                            setIsApproveModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
                        >
                          <Check size={14} />
                          <span>{isRtl ? 'اعتماد الأسعار والطلب' : 'Approve Order'}</span>
                        </button>
                      </>
                    )}

                    {/* Stage 3 Action: Execution Officer -> Create PO Number & Complete */}
                    {isExecutionOfficer && order.status === 'Approved' && (
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setPoNumberInput('');
                          setSapDocInput('');
                          setExecutionNotesInput('');
                          setIsExecuteModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-extrabold shadow-lg shadow-emerald-500/30 transition-all hover:scale-105"
                      >
                        <BadgeCheck size={16} />
                        <span>{isRtl ? 'إصدار أمر التوريد (إنشاء الـ PO)' : 'Issue PO Number'}</span>
                      </button>
                    )}

                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Registration Form (Stage 1)                                      */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 sm:p-8 w-full max-w-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {isRtl ? 'المرحلة الأولى: تسجيل طلب تسعير وتوريد' : 'Stage 1: Record Pricing & Order'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {isRtl ? 'يقوم مسئول التسجيل بإدخال بيانات المنطقة، المورد، الصنف والأسعار' : 'Enter pricing date, region, supplier, item, qty, and price.'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 mt-5">
              
              {/* Row 1: Pricing Date & Region */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'تاريخ التسعير' : 'Pricing Date'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.pricingDate}
                    onChange={(e) => setFormData({ ...formData, pricingDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-zinc-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'اسم المنطقة' : 'Region Name'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="regions-list"
                    placeholder={isRtl ? 'مثال: طريق مصر إسكندرية الصحراوي، وادي النطرون...' : 'e.g. Desert Road, Ismailia...'}
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-zinc-900 dark:text-white"
                  />
                  <datalist id="regions-list">
                    {COMMON_REGIONS.map(reg => <option key={reg} value={reg} />)}
                  </datalist>
                </div>
              </div>

              {/* Row 2: Supplier Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'اسم المورد' : 'Supplier Name'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="suppliers-list"
                    placeholder={isRtl ? 'اسم المورد أو المزرعة...' : 'Supplier / Farm name...'}
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-zinc-900 dark:text-white"
                  />
                  <datalist id="suppliers-list">
                    {uniqueSuppliers.map(sup => <option key={sup} value={sup} />)}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'كود المورد (اختياري)' : 'Supplier Code'}
                  </label>
                  <input
                    type="text"
                    placeholder="SUP-001"
                    value={formData.supplierCode}
                    onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Row 3: Item Type & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'نوع الصنف' : 'Item Type / Variety'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="items-list"
                    placeholder={isRtl ? 'مثال: زيتون تفاحي فريش، بيكوال...' : 'e.g. Kalamata Olives...'}
                    value={formData.itemType}
                    onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-zinc-900 dark:text-white"
                  />
                  <datalist id="items-list">
                    {COMMON_ITEM_TYPES.map(item => <option key={item} value={item} />)}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'التصنيف' : 'Category'}
                  </label>
                  <select
                    value={formData.itemCategory}
                    onChange={(e) => setFormData({ ...formData, itemCategory: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-zinc-900 dark:text-white"
                  >
                    <option value="زيتون فريش">{isRtl ? 'زيتون فريش' : 'Fresh Olives'}</option>
                    <option value="فلفل ومخللات">{isRtl ? 'فلفل ومخللات' : 'Peppers & Pickles'}</option>
                    <option value="خام زراعي">{isRtl ? 'خام زراعي' : 'Agri Raw Material'}</option>
                    <option value="مستلزمات إنتاج">{isRtl ? 'مستلزمات إنتاج' : 'Supplies'}</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Quantity, Unit, Price, Total live calculation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'الكمية' : 'Quantity'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-zinc-900 dark:text-white"
                    />
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="px-3 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white shrink-0"
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'سعر الوحدة (ج.م)' : 'Price per Unit (EGP)'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-zinc-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'الإجمالي التقديري' : 'Calculated Total'}
                  </label>
                  <div className="w-full px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-extrabold text-sm flex items-center justify-between">
                    <span>
                      {((parseFloat(formData.quantity) || 0) * (parseFloat(formData.price) || 0)).toLocaleString()}
                    </span>
                    <span className="text-xs font-bold">ج.م</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  {isRtl ? 'ملاحظات إضافية' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isRtl ? 'أي شروط تسليم، مواصفات فرز، أو تفاصيل خاصة...' : 'Any special terms or specifications...'}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-zinc-900 dark:text-white resize-none"
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  <span>{isRtl ? 'تسجيل وإرسال للاعتماد' : 'Save & Send to Approver'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Stage 2 - Approval Modal                                         */}
      {/* ========================================================================= */}
      {isApproveModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {isRtl ? 'المرحلة الثانية: اعتماد البيانات والأسعار' : 'Stage 2: Approve Order & Pricing'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {selectedOrder.orderNumber} • {selectedOrder.supplierName}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsApproveModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mt-5">
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/20 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">{isRtl ? 'المنطقة:' : 'Region:'}</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedOrder.region}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{isRtl ? 'الصنف والكمية:' : 'Item & Qty:'}</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedOrder.itemType} ({selectedOrder.quantity.toLocaleString()} {selectedOrder.unit})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{isRtl ? 'السعر المقترح:' : 'Price:'}</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedOrder.price.toLocaleString()} ج.م / {selectedOrder.unit}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-500/20 text-sm">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">{isRtl ? 'إجمالي القيمة:' : 'Total Value:'}</span>
                  <span className="font-black text-blue-600 dark:text-blue-400">{selectedOrder.totalAmount.toLocaleString()} ج.م</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  {isRtl ? 'ملاحظات الاعتماد (اختياري)' : 'Approval Notes (Optional)'}
                </label>
                <textarea
                  rows={3}
                  placeholder={isRtl ? 'تمت مراجعة الأسعار والموافقة على التوريد...' : 'Pricing verified and approved...'}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-zinc-900 dark:text-white resize-none"
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsApproveModalOpen(false)}
                  className="px-5 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleApproveOrder}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xl shadow-blue-500/20 disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{isRtl ? 'تأكيد الاعتماد ونقله لمسئول التنفيذ' : 'Confirm & Transfer to Execution'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Rejection Modal                                                  */}
      {/* ========================================================================= */}
      {isRejectModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold">
                  <XCircle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {isRtl ? 'رفض طلب التسعير' : 'Reject Pricing Request'}
                  </h3>
                  <p className="text-xs text-zinc-400">{selectedOrder.orderNumber}</p>
                </div>
              </div>
              <button onClick={() => setIsRejectModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mt-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  {isRtl ? 'سبب الرفض' : 'Rejection Reason'} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={isRtl ? 'السعر أعلى من السعر المحدد بالسوق، يرجى إعادة التفاوض...' : 'Price is higher than budget...'}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-rose-500 text-sm text-zinc-900 dark:text-white resize-none"
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-5 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleRejectOrder}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xl shadow-rose-500/20 disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw size={16} className="animate-spin" /> : <X size={16} />}
                  <span>{isRtl ? 'تأكيد الرفض' : 'Confirm Rejection'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Stage 3 - Execution Modal (PO Generation)                        */}
      {/* ========================================================================= */}
      {isExecuteModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                  <BadgeCheck size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {isRtl ? 'المرحلة الثالثة: إنشاء وإصدار أمر التوريد (PO)' : 'Stage 3: Issue Purchase Order'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {selectedOrder.orderNumber} • {selectedOrder.supplierName}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsExecuteModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mt-5">
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">{isRtl ? 'المورد المعتمد:' : 'Approved Supplier:'}</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedOrder.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{isRtl ? 'الصنف والكمية:' : 'Item & Quantity:'}</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedOrder.itemType} ({selectedOrder.quantity.toLocaleString()} {selectedOrder.unit})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{isRtl ? 'السعر المعتمد:' : 'Approved Price:'}</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedOrder.price.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-emerald-500/20 text-sm">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">{isRtl ? 'القيمة الإجمالية:' : 'Total Value:'}</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">{selectedOrder.totalAmount.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* PO Number Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center justify-between">
                  <span>{isRtl ? 'رقم أمر التوريد (PO Number)' : 'Purchase Order Number (PO)'} <span className="text-rose-500">*</span></span>
                  <button
                    type="button"
                    onClick={() => setPoNumberInput(`PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`)}
                    className="text-[11px] text-emerald-500 font-semibold hover:underline"
                  >
                    {isRtl ? 'توليد رقم تلقائي' : 'Auto Generate'}
                  </button>
                </label>
                <div className="relative">
                  <Hash className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="text"
                    required
                    placeholder="مثال: PO-2025-4581 أو رقم أمر الساب..."
                    value={poNumberInput}
                    onChange={(e) => setPoNumberInput(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* SAP Document Number (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  {isRtl ? 'رقم مستند SAP (اختياري)' : 'SAP Doc Number (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder="4500012345"
                  value={sapDocInput}
                  onChange={(e) => setSapDocInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-zinc-900 dark:text-white"
                />
              </div>

              {/* Execution Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  {isRtl ? 'ملاحظات التنفيذ' : 'Execution Notes'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isRtl ? 'تم إصدار أمر التوريد وإرساله للمورد ولإدارة المخازن...' : 'PO sent to supplier...'}
                  value={executionNotesInput}
                  onChange={(e) => setExecutionNotesInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-zinc-900 dark:text-white resize-none"
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsExecuteModalOpen(false)}
                  className="px-5 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteOrder}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-xs shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                  <span>{isRtl ? 'تأكيد إصدار أمر التوريد والإنهاء' : 'Confirm & Complete PO'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: Printable Purchase Order Official Voucher Modal                 */}
      {/* ========================================================================= */}
      {isViewModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 sm:p-8 w-full max-w-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 print:hidden">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Printer size={20} className="text-emerald-500" />
                <span>{isRtl ? 'معاينة سند أمر التوريد المعتمد' : 'Purchase Order Voucher'}</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20"
                >
                  <Printer size={16} />
                  <span>{isRtl ? 'طباعة السند' : 'Print'}</span>
                </button>
                <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div ref={printRef} className="mt-6 p-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-zinc-100 space-y-6 shadow-sm font-sans" dir="rtl">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-emerald-600 pb-4">
                <div>
                  <h1 className="text-2xl font-black text-emerald-800 dark:text-emerald-400 tracking-tight">
                    شركة ريتشلاند للصناعات الغذائية
                  </h1>
                  <p className="text-xs text-zinc-500 font-semibold mt-0.5">
                    إدارة المشتريات والتوريدات الزراعية • RICHLAND AGRI & FRESH SUPPLY
                  </p>
                </div>
                <div className="text-left" dir="ltr">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-lg inline-block mb-1">
                    PURCHASE ORDER
                  </span>
                  <p className="text-xs text-zinc-500 font-mono">Date: {selectedOrder.pricingDate}</p>
                </div>
              </div>

              {/* Title and PO Numbers */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-xs text-zinc-400 block font-bold">رقم الطلب المسجل:</span>
                  <span className="text-lg font-black text-zinc-800 dark:text-zinc-200 font-mono">{selectedOrder.orderNumber}</span>
                </div>
                {selectedOrder.poNumber && (
                  <div className="sm:text-left">
                    <span className="text-xs text-emerald-600 font-bold block">رقم أمر التوريد المعتمد (PO No):</span>
                    <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-wider">
                      {selectedOrder.poNumber}
                    </span>
                  </div>
                )}
              </div>

              {/* Information Table */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                  <span className="text-zinc-400 block mb-1">اسم المورد:</span>
                  <strong className="text-sm text-zinc-900 dark:text-white">{selectedOrder.supplierName}</strong>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                  <span className="text-zinc-400 block mb-1">المنطقة الجغرافية:</span>
                  <strong className="text-sm text-zinc-900 dark:text-white">{selectedOrder.region}</strong>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                  <span className="text-zinc-400 block mb-1">تاريخ التسعير:</span>
                  <strong className="text-sm text-zinc-900 dark:text-white">{selectedOrder.pricingDate}</strong>
                </div>
              </div>

              {/* Item Details Table */}
              <table className="w-full text-right text-xs border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <thead className="bg-zinc-100 dark:bg-zinc-800/80 font-bold text-zinc-700 dark:text-zinc-300">
                  <tr>
                    <th className="p-3 border-b">م</th>
                    <th className="p-3 border-b">نوع الصنف</th>
                    <th className="p-3 border-b">الكمية المطلوبة</th>
                    <th className="p-3 border-b">الوحدة</th>
                    <th className="p-3 border-b">السعر المتفق عليه</th>
                    <th className="p-3 border-b text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  <tr>
                    <td className="p-3 font-bold">1</td>
                    <td className="p-3 font-extrabold text-sm">{selectedOrder.itemType}</td>
                    <td className="p-3 font-bold">{selectedOrder.quantity.toLocaleString()}</td>
                    <td className="p-3">{selectedOrder.unit}</td>
                    <td className="p-3 font-bold">{selectedOrder.price.toLocaleString()} ج.م</td>
                    <td className="p-3 font-black text-sm text-emerald-600 dark:text-emerald-400 text-left">
                      {selectedOrder.totalAmount.toLocaleString()} ج.م
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-emerald-50 dark:bg-emerald-950/40 font-black text-sm">
                  <tr>
                    <td colSpan={5} className="p-3 text-right text-emerald-900 dark:text-emerald-200">
                      إجمالي قيمة أمر التوريد:
                    </td>
                    <td className="p-3 text-left text-emerald-700 dark:text-emerald-400 text-base">
                      {selectedOrder.totalAmount.toLocaleString()} ج.م
                    </td>
                  </tr>
                </tfoot>
              </table>

              {selectedOrder.notes && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-xs">
                  <span className="text-zinc-400 block mb-0.5 font-bold">ملاحظات وشروط التوريد:</span>
                  <p className="text-zinc-700 dark:text-zinc-300">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Three Official Signatures */}
              <div className="pt-6 border-t-2 border-zinc-200 dark:border-zinc-800 grid grid-cols-3 gap-4 text-center text-xs">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-400 block text-[11px] mb-1 font-bold">1. مسئول التسجيل</span>
                  <strong className="block text-zinc-800 dark:text-zinc-200 text-sm mb-4">
                    {selectedOrder.createdByName || selectedOrder.createdBy}
                  </strong>
                  <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 pt-1 text-[10px] text-zinc-400">
                    التوقيع: .....................
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-400 block text-[11px] mb-1 font-bold">2. مسئول الاعتماد</span>
                  <strong className="block text-zinc-800 dark:text-zinc-200 text-sm mb-4">
                    {selectedOrder.approvedByName || '.....................'}
                  </strong>
                  <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 pt-1 text-[10px] text-zinc-400">
                    التوقيع: .....................
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-400 block text-[11px] mb-1 font-bold">3. مسئول التنفيذ والمشتريات</span>
                  <strong className="block text-zinc-800 dark:text-zinc-200 text-sm mb-4">
                    {selectedOrder.executedByName || '.....................'}
                  </strong>
                  <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 pt-1 text-[10px] text-zinc-400">
                    التوقيع: .....................
                  </div>
                </div>
              </div>

              {/* Stamp & Footer notice */}
              <div className="flex items-center justify-between pt-4 text-[10px] text-zinc-400">
                <span>سند أمر توريد إلكتروني صادر ومعتمد من نظام إدارة المستودعات والمشتريات.</span>
                <span>ختم الشركة المعتمد [ .................... ]</span>
              </div>

            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
