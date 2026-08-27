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
  SlidersHorizontal,
  Undo2,
  ChevronUp,
  User,
  Info,
  PackageCheck,
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, UserProfile, PurchaseOrder, PurchaseOrderStatus } from '../types';
import ModernPurchaseOrderVoucher from './ModernPurchaseOrderVoucher';
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

const COMMON_ITEM_CATEGORIES = [
  'زيتون فريش',
  'زيتون مياه وملح',
  'زيتون مطبوخ',
  'خام زراعي'
];

const INITIAL_ROUTING_OPTIONS = [
  'مياه وملح',
  'مطبوخ',
  'أخرى'
];

const ANALYSIS_OPTIONS = [
  'مبيدات',
  'خالي المبيدات',
  'عشوائي'
];

const UNITS = ['كجم'];

export default function PurchaseOrders({ lang, user }: PurchaseOrdersProps) {
  const isRtl = lang === 'ar';
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  
  // Strict Permission checks (No overlapping of generic roles)
  const isAdmin = userRoles.includes('Admin') || userRoles.includes('Warehouse Manager');
  // Only explicitly assigned officers can perform workflow actions, ensuring strict separation of duties.
  // Admins can view everything and edit/delete pending orders, but for normal users, roles are strictly siloed.
  const isRegistrationOfficer = userRoles.includes('Registration Officer');
  const isApprovalOfficer = userRoles.includes('Approval Officer');
  const isExecutionOfficer = userRoles.includes('Execution Officer');

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
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Form states for Registration (Stage 1)
  const [formData, setFormData] = useState({
    pricingDate: new Date().toISOString().split('T')[0],
    region: '',
    supplierName: '',
    supplierCode: '',
    itemType: '',
    itemCategory: 'زيتون فريش',
    initialRouting: 'مياه وملح',
    analysisType: 'مبيدات',
    paymentMethod: '',
    quantity: '',
    unit: 'كجم',
    price: '',
    notes: '',
    unloadingLocations: [] as string[],
    customUnloadingLocation: '',
  });

  // Action input states (Approval / Execution / Receiving)
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [poNumberInput, setPoNumberInput] = useState('');
  const [sapDocInput, setSapDocInput] = useState('');
  const [executionNotesInput, setExecutionNotesInput] = useState('');
  const [receivedQtyInput, setReceivedQtyInput] = useState('');
  const [receivingNotesInput, setReceivingNotesInput] = useState('');
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

    const validPricedOrders = orders.filter(o => o.status !== 'Rejected' && Number(o.price) > 0);
    const averagePrice = totalQuantity > 0 
      ? totalValue / totalQuantity 
      : (validPricedOrders.length > 0 
          ? validPricedOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0) / validPricedOrders.length 
          : 0);

    return {
      totalCount,
      pendingApproval,
      pendingExecution,
      completed,
      rejected,
      totalQuantity,
      totalValue,
      averagePrice
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
      initialRouting: formData.initialRouting,
      analysisType: formData.analysisType,
      paymentMethod: formData.paymentMethod.trim(),
      quantity: qty,
      unit: formData.unit,
      price: unitPrice,
      totalAmount,
      currency: 'ج.م',
      notes: formData.notes.trim(),
      unloadingLocations: [...formData.unloadingLocations.filter(loc => loc !== 'أخرى'), formData.customUnloadingLocation.trim()].filter(Boolean),
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
        initialRouting: 'مياه وملح',
        analysisType: 'مبيدات',
        paymentMethod: '',
        quantity: '',
        unit: 'كجم',
        price: '',
        notes: '',
        unloadingLocations: [],
        customUnloadingLocation: '',
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
      initialRouting: formData.initialRouting,
      analysisType: formData.analysisType,
      paymentMethod: formData.paymentMethod.trim(),
      quantity: qty,
      unit: formData.unit,
      price: unitPrice,
      totalAmount,
      notes: formData.notes.trim(),
      unloadingLocations: [...formData.unloadingLocations.filter(loc => loc !== 'أخرى'), formData.customUnloadingLocation.trim()].filter(Boolean),
      lastUpdatedAt: new Date().toISOString(),
      ...(selectedOrder.status === 'Rejected' ? { 
        status: 'Pending Approval', 
        rejectedBy: undefined, 
        rejectedByName: undefined, 
        rejectionReason: undefined 
      } : {})
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

  // Handle Undo Approval
  const handleUndoApproval = async (order: PurchaseOrder) => {
    setActionLoading(true);
    try {
      const updatedOrder: PurchaseOrder = {
        ...order,
        status: 'Pending Approval',
        approvedBy: undefined,
        approvedByName: undefined,
        approvedAt: undefined,
        approvalNotes: undefined,
        lastUpdatedAt: new Date().toISOString(),
      };

      await storageService.savePurchaseOrder(updatedOrder);
      toast.success(isRtl ? 'تم إلغاء الموافقة بنجاح. يمكنك الآن تعديله والموافقة عليه مرة أخرى.' : 'Approval undone successfully. Order can now be edited.');
    } catch (err: any) {
      toast.error(isRtl ? `خطأ أثناء الإلغاء: ${err.message}` : `Undo error: ${err.message}`);
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
        rejectedBy: user?.uid || user?.username || 'approver',
        rejectedByName: user?.displayName || user?.username || (isRtl ? 'مسئول الاعتماد' : 'Approval Officer'),
        rejectedAt: new Date().toISOString(),
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
      const qtyReceived = receivedQtyInput.trim() ? parseFloat(receivedQtyInput) : undefined;
      const isQtyValid = qtyReceived !== undefined && !isNaN(qtyReceived) && qtyReceived >= 0;

      const updatedOrder: PurchaseOrder = {
        ...selectedOrder,
        status: 'Completed',
        poNumber: poNumberInput.trim(),
        sapDocNumber: sapDocInput.trim() || undefined,
        executedBy: user?.uid || user?.username || 'executor',
        executedByName: user?.displayName || user?.username || (isRtl ? 'مسئول التنفيذ' : 'Execution Officer'),
        executedAt: new Date().toISOString(),
        executionNotes: executionNotesInput.trim() || undefined,
        ...(isQtyValid ? {
          receivedQuantity: qtyReceived,
          receivedTotalAmount: qtyReceived * (selectedOrder.price || 0),
          receivedAt: new Date().toISOString(),
          receivedBy: user?.uid || user?.username || 'executor',
          receivedByName: user?.displayName || user?.username || (isRtl ? 'مسئول التنفيذ' : 'Execution Officer'),
          receivingNotes: receivingNotesInput.trim() || undefined,
        } : {}),
        lastUpdatedAt: new Date().toISOString(),
      };

      await storageService.savePurchaseOrder(updatedOrder);
      toast.success(isRtl ? `تم إنشاء أمر التوريد بنجاح برقم (${poNumberInput.trim()}) وإنهاء الإجراء!` : `PO created successfully (${poNumberInput.trim()})`);
      setIsExecuteModalOpen(false);
      setSelectedOrder(null);
      setPoNumberInput('');
      setSapDocInput('');
      setExecutionNotesInput('');
      setReceivedQtyInput('');
      setReceivingNotesInput('');
    } catch (err: any) {
      toast.error(isRtl ? `خطأ أثناء إصدار أمر التوريد: ${err.message}` : `Execution error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Stage 4: Actual Receipt Recording (بعد إصدار أمر التوريد)
  const handleSaveReceipt = async () => {
    if (!selectedOrder) return;
    const qtyReceived = parseFloat(receivedQtyInput);
    if (isNaN(qtyReceived) || qtyReceived < 0) {
      toast.error(isRtl ? 'يرجى إدخال كمية مستلمة صحيحة بالكيلو جرام' : 'Please enter a valid received quantity in kg');
      return;
    }

    setActionLoading(true);
    try {
      const receivedTotal = qtyReceived * (selectedOrder.price || 0);
      const updatedOrder: PurchaseOrder = {
        ...selectedOrder,
        receivedQuantity: qtyReceived,
        receivedTotalAmount: receivedTotal,
        receivedAt: new Date().toISOString(),
        receivedBy: user?.uid || user?.username || 'receiver',
        receivedByName: user?.displayName || user?.username || (isRtl ? 'مسئول الاستلام' : 'Receiving Officer'),
        receivingNotes: receivingNotesInput.trim() || undefined,
        lastUpdatedAt: new Date().toISOString(),
      };

      await storageService.savePurchaseOrder(updatedOrder);
      toast.success(isRtl ? `تم حفظ الكمية المستلمة فعلياً بنجاح (${qtyReceived.toLocaleString()} كجم)!` : `Actual received quantity saved (${qtyReceived.toLocaleString()} kg)!`);
      setIsReceiveModalOpen(false);
      setSelectedOrder(null);
      setReceivedQtyInput('');
      setReceivingNotesInput('');
    } catch (err: any) {
      toast.error(isRtl ? `خطأ أثناء حفظ الاستلام: ${err.message}` : `Receipt error: ${err.message}`);
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
      'التصنيف',
      'التوجيه الأولي',
      'التحليل',
      'طريقة السداد',
      'الكمية المطلوبة',
      'الوحدة',
      'السعر للكيلو',
      'الإجمالي المطلوب (ج.م)',
      'الكمية المستلمة فعلياً (كجم)',
      'فارق الكمية (كجم)',
      'الإجمالي الفعلي المستحق (ج.م)',
      'رقم أمر التوريد (PO)',
      'مسئول التسجيل',
      'تاريخ التسجيل',
      'مسئول الاعتماد',
      'تاريخ الاعتماد',
      'مسئول التنفيذ',
      'تاريخ التنفيذ',
      'مسئول الاستلام',
      'تاريخ الاستلام',
      'ملاحظات الاستلام',
      'الملاحظات'
    ];

    const rows = filteredOrders.map(o => [
      `"${o.orderNumber || ''}"`,
      `"${getStatusBadge(o.status).label}"`,
      `"${o.pricingDate || ''}"`,
      `"${o.region || ''}"`,
      `"${o.supplierName || ''}"`,
      `"${o.itemType || ''}"`,
      `"${o.itemCategory || 'زيتون فريش'}"`,
      `"${o.initialRouting || 'مياه وملح'}"`,
      `"${o.analysisType || 'مبيدات'}"`,
      `"${o.paymentMethod || ''}"`,
      o.quantity || 0,
      `"${o.unit || 'كجم'}"`,
      o.price || 0,
      o.totalAmount || 0,
      o.receivedQuantity !== undefined ? o.receivedQuantity : '',
      o.receivedQuantity !== undefined ? (o.receivedQuantity - o.quantity) : '',
      o.receivedTotalAmount !== undefined ? o.receivedTotalAmount : (o.receivedQuantity !== undefined ? o.receivedQuantity * o.price : ''),
      `"${o.poNumber || ''}"`,
      `"${o.createdByName || ''}"`,
      `"${o.createdAt ? new Date(o.createdAt).toLocaleDateString('ar-EG') : ''}"`,
      `"${o.approvedByName || ''}"`,
      `"${o.approvedAt ? new Date(o.approvedAt).toLocaleDateString('ar-EG') : ''}"`,
      `"${o.executedByName || ''}"`,
      `"${o.executedAt ? new Date(o.executedAt).toLocaleDateString('ar-EG') : ''}"`,
      `"${o.receivedByName || ''}"`,
      `"${o.receivedAt ? new Date(o.receivedAt).toLocaleDateString('ar-EG') : ''}"`,
      `"${(o.receivingNotes || '').replace(/"/g, '""')}"`,
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-zinc-900 p-4 sm:p-5 text-white shadow-lg">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-emerald-200">
              <ShoppingBag size={13} />
              <span>{isRtl ? 'دورة عمل أوامر التوريد والتسعير' : 'Purchase Orders & Pricing Lifecycle'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {isRtl ? 'إدارة واعتماد أوامر التوريد' : 'Purchase Orders Workflow'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
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
                    initialRouting: 'مياه وملح',
                    analysisType: 'مبيدات',
                    paymentMethod: 'تحويل بنكي',
                    quantity: '',
                    unit: 'كجم',
                    price: '',
                    notes: '',
                    unloadingLocations: [],
                    customUnloadingLocation: '',
                  });
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus size={16} />
                <span>{isRtl ? 'تسجيل طلب تسعير جديد' : 'New Pricing Request'}</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-xs backdrop-blur-md transition-all active:scale-95"
              title={isRtl ? 'تصدير إكسل' : 'Export Excel'}
            >
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">{isRtl ? 'تصدير Excel' : 'Export'}</span>
            </button>
          </div>
        </div>

        {/* 3-Step Lifecycle Visual Indicator */}
        <div className="relative mt-3.5 pt-3.5 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
              1
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">{isRtl ? 'مسئول التسجيل' : 'Registration'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold">
                  {stats.pendingApproval} {isRtl ? 'طلب' : 'reqs'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-300 truncate">{isRtl ? 'التسعير والبيانات' : 'Pricing & Details'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
              2
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">{isRtl ? 'مسئول الاعتماد' : 'Approval'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold">
                  {stats.pendingExecution} {isRtl ? 'طلب' : 'reqs'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-300 truncate">{isRtl ? 'المراجعة والاعتماد' : 'Review & Approval'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
              3
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">{isRtl ? 'مسئول التنفيذ' : 'PO Execution'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                  {stats.completed} {isRtl ? 'أمر PO' : 'POs'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-300 truncate">{isRtl ? 'إصدار أمر PO' : 'PO Creation'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compact KPI Cards Grid (8 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-2.5">
        
        {/* 1. Total Requests */}
        <div 
          onClick={() => setActiveStageTab('all')}
          className={`bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${activeStageTab === 'all' ? 'ring-2 ring-zinc-400 dark:ring-zinc-600 border-zinc-400' : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300'}`}
        >
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-bold">
            <span className="truncate">{isRtl ? 'إجمالي الطلبات' : 'Total Orders'}</span>
            <FileText size={13} className="text-zinc-400 shrink-0" />
          </div>
          <div className="mt-1.5">
            <div className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white leading-tight">{stats.totalCount}</div>
            <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{isRtl ? 'طلب مسجل' : 'registered'}</p>
          </div>
        </div>

        {/* 2. Pending Approval */}
        <div 
          onClick={() => setActiveStageTab('pending_approval')}
          className={`bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${activeStageTab === 'pending_approval' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-500/5' : 'border-zinc-200/80 dark:border-zinc-800 hover:border-amber-400'}`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-[11px] font-bold">
            <span className="truncate">{isRtl ? 'قيد الاعتماد' : 'Pending'}</span>
            <Clock size={13} className="shrink-0" />
          </div>
          <div className="mt-1.5">
            <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 leading-tight">{stats.pendingApproval}</div>
            <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{isRtl ? 'تنتظر المدير' : 'needs approval'}</p>
          </div>
        </div>

        {/* 3. Pending Execution */}
        <div 
          onClick={() => setActiveStageTab('pending_execution')}
          className={`bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${activeStageTab === 'pending_execution' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-500/5' : 'border-zinc-200/80 dark:border-zinc-800 hover:border-blue-400'}`}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-[11px] font-bold">
            <span className="truncate">{isRtl ? 'قيد التنفيذ' : 'Execution'}</span>
            <UserCheck size={13} className="shrink-0" />
          </div>
          <div className="mt-1.5">
            <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 leading-tight">{stats.pendingExecution}</div>
            <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{isRtl ? 'بإصدار PO' : 'ready for PO'}</p>
          </div>
        </div>

        {/* 4. Completed POs */}
        <div 
          onClick={() => setActiveStageTab('completed')}
          className={`bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${activeStageTab === 'completed' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/5' : 'border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-400'}`}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
            <span className="truncate">{isRtl ? 'أوامر مصدرة' : 'Completed'}</span>
            <CheckCircle2 size={13} className="shrink-0" />
          </div>
          <div className="mt-1.5">
            <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">{stats.completed}</div>
            <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{isRtl ? 'PO مصدر' : 'issued POs'}</p>
          </div>
        </div>

        {/* 5. Rejected Orders */}
        <div 
          onClick={() => setActiveStageTab('rejected')}
          className={`bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${activeStageTab === 'rejected' ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-500/5' : 'border-zinc-200/80 dark:border-zinc-800 hover:border-rose-400'}`}
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-[11px] font-bold">
            <span className="truncate">{isRtl ? 'الطلبات المرفوضة' : 'Rejected'}</span>
            <XCircle size={13} className="shrink-0" />
          </div>
          <div className="mt-1.5">
            <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 leading-tight">{stats.rejected}</div>
            <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{isRtl ? 'مرفوض من الإدارة' : 'rejected'}</p>
          </div>
        </div>

        {/* 6. Total Quantities */}
        <div className="bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 text-[11px] font-bold">
            <span className="truncate">{isRtl ? 'إجمالي الكميات' : 'Quantities'}</span>
            <Layers size={13} className="text-indigo-400 shrink-0" />
          </div>
          <div className="mt-1.5">
            <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 leading-tight truncate">
              {stats.totalQuantity.toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{isRtl ? 'كجم / طن' : 'kg / tons'}</p>
          </div>
        </div>

        {/* 7. Average Price */}
        <div className="bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 text-[11px] font-bold">
            <span className="truncate">{isRtl ? 'متوسط السعر' : 'Avg Price'}</span>
            <TrendingUp size={13} className="text-teal-500 shrink-0" />
          </div>
          <div className="mt-1.5">
            <div className="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400 leading-tight truncate">
              {stats.averagePrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span className="text-[10px] font-normal text-zinc-400">ج.م</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{isRtl ? 'متوسط الطن / كجم' : 'avg unit price'}</p>
          </div>
        </div>

        {/* 8. Total Value */}
        <div className="bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
            <span className="truncate">{isRtl ? 'إجمالي القيمة' : 'Total Value'}</span>
            <DollarSign size={13} className="text-emerald-500 shrink-0" />
          </div>
          <div className="mt-1.5">
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight truncate">
              {stats.totalValue.toLocaleString()} <span className="text-[10px] font-normal text-zinc-400">ج.م</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{isRtl ? 'إجمالي الأوامر' : 'total value'}</p>
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
        <div className="space-y-2">
          {filteredOrders.map((order) => {
            const badge = getStatusBadge(order.status);
            const StatusIcon = badge.icon;
            const isExpanded = expandedOrderId === order.id;

            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                className={`bg-white dark:bg-zinc-900 rounded-xl border transition-all space-y-2 cursor-pointer ${
                  isExpanded 
                    ? 'border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30 p-3 sm:p-4' 
                    : 'border-zinc-200/90 dark:border-zinc-800 p-2.5 sm:p-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm'
                }`}
              >
                {/* Row 1: Core Order Data & Status & Total Value */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-extrabold text-sm text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md shrink-0">
                      {order.orderNumber || 'طلب تسعير'}
                    </span>

                    {order.poNumber && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[11px] font-black flex items-center gap-1 shadow-xs shrink-0">
                        <BadgeCheck size={12} />
                        <span>PO: {order.poNumber}</span>
                      </span>
                    )}

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border shrink-0 ${badge.color}`}>
                      <StatusIcon size={12} />
                      <span>{badge.label}</span>
                    </span>

                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                      📅 {order.pricingDate}
                    </span>

                    <span className="text-[11px] text-zinc-400">•</span>

                    <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[180px] sm:max-w-[240px]" title={order.supplierName}>
                      🏢 {order.supplierName}
                    </span>

                    <span className="text-[11px] text-zinc-400">•</span>

                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      🌿 {order.itemType} {order.itemCategory ? `(${order.itemCategory})` : ''}
                    </span>
                  </div>

                  {/* Pricing / Total Calculation & Actual Received Badge */}
                  <div className="flex items-center gap-2 ms-auto flex-wrap justify-end">
                    {order.receivedQuantity !== undefined && (
                      <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-500/20 text-xs">
                        <PackageCheck size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                          {isRtl ? 'المستلم فعلياً:' : 'Received:'}
                        </span>
                        <strong className="text-xs font-black text-purple-700 dark:text-purple-300">
                          {order.receivedQuantity.toLocaleString()} {order.unit || 'كجم'}
                        </strong>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                          order.receivedQuantity < order.quantity
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                            : order.receivedQuantity > order.quantity
                            ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                            : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                        }`}>
                          {order.receivedQuantity < order.quantity
                            ? `عجز: -${(order.quantity - order.receivedQuantity).toLocaleString()} كجم`
                            : order.receivedQuantity > order.quantity
                            ? `زيادة: +${(order.receivedQuantity - order.quantity).toLocaleString()} كجم`
                            : 'مطابق 100%'}
                        </span>
                      </div>
                    )}

                    <div className="text-end bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium me-1">
                        {order.quantity.toLocaleString()} {order.unit} × {order.price.toLocaleString()} ج.م =
                      </span>
                      <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {order.totalAmount.toLocaleString()} ج.م
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Row 2: Region, Unloading Locations & Full Visible Notes & Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px]">
                  
                  {/* Region & Full Notes (User names removed to give full space to notes) */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-zinc-500 dark:text-zinc-400 flex-1 min-w-0">
                    <span className="inline-flex items-center gap-1 shrink-0">
                      📍 <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">{order.region}</strong>
                    </span>
                    
                    {order.unloadingLocations && order.unloadingLocations.length > 0 && (
                      <span className="inline-flex items-center gap-1 shrink-0">
                        🚛 <span className="text-zinc-700 dark:text-zinc-300">{order.unloadingLocations.join('، ')}</span>
                      </span>
                    )}

                    {/* Registration Notes (Full text visible) */}
                    {order.notes && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-500/20 text-[11px] font-medium max-w-full">
                        <span className="shrink-0 font-bold">💬 {isRtl ? 'ملاحظات:' : 'Notes:'}</span>
                        <span className="break-words">{order.notes}</span>
                      </div>
                    )}

                    {/* Approval Notes (Full text visible) */}
                    {order.approvalNotes && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50/90 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border border-blue-500/20 text-[11px] font-medium max-w-full">
                        <span className="shrink-0 font-bold">✓ {isRtl ? 'ملاحظة الاعتماد:' : 'Approval Note:'}</span>
                        <span className="break-words">{order.approvalNotes}</span>
                      </div>
                    )}

                    {/* Rejection Reason (Full text visible) */}
                    {order.status === 'Rejected' && order.rejectionReason && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50/90 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-500/20 text-[11px] font-medium max-w-full">
                        <span className="shrink-0 font-bold">✕ {isRtl ? 'سبب الرفض:' : 'Rejection Reason:'}</span>
                        <span className="break-words">{order.rejectionReason}</span>
                      </div>
                    )}

                    {/* Execution Notes (Full text visible) */}
                    {order.executionNotes && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-500/20 text-[11px] font-medium max-w-full">
                        <span className="shrink-0 font-bold">📦 {isRtl ? 'ملاحظة PO:' : 'PO Note:'}</span>
                        <span className="break-words">{order.executionNotes}</span>
                      </div>
                    )}

                    {/* Receiving Notes (Full text visible) */}
                    {order.receivingNotes && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50/90 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border border-purple-500/20 text-[11px] font-medium max-w-full">
                        <span className="shrink-0 font-bold">📥 {isRtl ? 'ملاحظة الاستلام:' : 'Receipt Note:'}</span>
                        <span className="break-words">{order.receivingNotes}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-1.5 ms-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Print / View Voucher Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintVoucher(order);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-bold transition-all"
                      title={isRtl ? 'معاينة سند أمر التوريد' : 'Voucher'}
                    >
                      <Printer size={13} />
                      <span className="hidden sm:inline">{isRtl ? 'السند' : 'Voucher'}</span>
                    </button>

                    {/* Stage 4 Action: Actual Receipt recording / editing */}
                    {order.status === 'Completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                          setReceivedQtyInput(order.receivedQuantity !== undefined ? String(order.receivedQuantity) : '');
                          setReceivingNotesInput(order.receivingNotes || '');
                          setIsReceiveModalOpen(true);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all shadow-xs ${
                          order.receivedQuantity !== undefined
                            ? 'bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-800 dark:text-purple-200 border border-purple-400/30'
                            : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                        title={isRtl ? 'تسجيل / تعديل الكمية المستلمة فعلياً بالمخزن' : 'Record / Edit actual received quantity'}
                      >
                        <PackageCheck size={13} />
                        <span>
                          {order.receivedQuantity !== undefined
                            ? (isRtl ? `الاستلام (${order.receivedQuantity.toLocaleString()} كجم)` : `Receipt (${order.receivedQuantity} kg)`)
                            : (isRtl ? 'تسجيل الاستلام الفعلي' : 'Record Receipt')}
                        </span>
                      </button>
                    )}

                    {/* Edit button */}
                    {(((isRegistrationOfficer && order.createdBy === user?.uid) || isAdmin || isApprovalOfficer) && ['Pending Approval', 'Rejected'].includes(order.status)) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                          setFormData({
                            pricingDate: order.pricingDate,
                            region: order.region,
                            supplierName: order.supplierName,
                            supplierCode: order.supplierCode || '',
                            itemType: order.itemType,
                            itemCategory: order.itemCategory || 'زيتون فريش',
                            initialRouting: order.initialRouting || 'مياه وملح',
                            analysisType: order.analysisType || 'مبيدات',
                            paymentMethod: order.paymentMethod || '',
                            quantity: String(order.quantity),
                            unit: order.unit,
                            price: String(order.price),
                            notes: order.notes || '',
                            unloadingLocations: [
                              ...(order.unloadingLocations?.filter(loc => ['اوليف لاند', 'ريتش لاند', 'Jps'].includes(loc)) || []),
                              ...(order.unloadingLocations?.some(loc => !['اوليف لاند', 'ريتش لاند', 'Jps'].includes(loc)) ? ['أخرى'] : [])
                            ],
                            customUnloadingLocation: order.unloadingLocations?.find(loc => !['اوليف لاند', 'ريتش لاند', 'Jps'].includes(loc)) || '',
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-bold transition-all"
                      >
                        <Edit3 size={13} />
                        <span>{isRtl ? 'تعديل' : 'Edit'}</span>
                      </button>
                    )}

                    {/* Delete button */}
                    {(((isRegistrationOfficer && order.createdBy === user?.uid) || isAdmin) && ['Pending Approval', 'Rejected'].includes(order.status)) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOrder(order.id);
                        }}
                        className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                        title={isRtl ? 'حذف' : 'Delete'}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                    {/* Stage 2 Action: Undo Approval (Admin & Approval Officer) */}
                    {(isAdmin || isApprovalOfficer) && order.status === 'Approved' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUndoApproval(order);
                        }}
                        disabled={actionLoading}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-500 text-[11px] font-bold transition-all disabled:opacity-50"
                      >
                        <Undo2 size={13} />
                        <span>{isRtl ? 'إلغاء الموافقة' : 'Undo Approval'}</span>
                      </button>
                    )}

                    {/* Stage 2 Action: Approval Officer -> Approve or Reject */}
                    {isApprovalOfficer && order.status === 'Pending Approval' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                            setRejectionReason('');
                            setIsRejectModalOpen(true);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-[11px] font-bold transition-all"
                        >
                          <X size={13} />
                          <span>{isRtl ? 'رفض' : 'Reject'}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                            setApprovalNotes('');
                            setIsApproveModalOpen(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-xs transition-all"
                        >
                          <Check size={13} />
                          <span>{isRtl ? 'اعتماد' : 'Approve'}</span>
                        </button>
                      </>
                    )}

                    {/* Stage 3 Action: Execution Officer -> Create PO Number & Complete */}
                    {isExecutionOfficer && order.status === 'Approved' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                          setPoNumberInput('');
                          setSapDocInput('');
                          setExecutionNotesInput('');
                          setIsExecuteModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[11px] font-extrabold shadow-sm transition-all hover:scale-102"
                      >
                        <BadgeCheck size={14} />
                        <span>{isRtl ? 'إصدار الـ PO' : 'Issue PO'}</span>
                      </button>
                    )}

                    {/* Expand / Collapse Indicator Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedOrderId(isExpanded ? null : order.id);
                      }}
                      className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all flex items-center gap-1 text-[10px] font-semibold"
                      title={isExpanded ? (isRtl ? 'إخفاء التفاصيل' : 'Hide Details') : (isRtl ? 'عرض التفاصيل الكاملة' : 'Show Details')}
                    >
                      <ChevronDown size={15} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-emerald-500' : ''}`} />
                    </button>
                  </div>

                </div>

                {/* Expanded Details Panel (Shows Full Audit Trail, Users, Timestamps, and Complete Specs) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden pt-3 border-t border-zinc-200 dark:border-zinc-800/90 mt-2 space-y-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Section 1: Workflow Stages & Assigned Users History */}
                      <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-3 border border-zinc-200/70 dark:border-zinc-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-200">
                          <div className="flex items-center gap-1.5">
                            <UserCheck size={14} className="text-emerald-500" />
                            <span>{isRtl ? 'مراحل ومسئولي العمليات والتسجيل والاستلام' : 'Workflow & Receipt Audit Trail'}</span>
                          </div>
                          {order.status === 'Completed' && (
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setReceivedQtyInput(order.receivedQuantity !== undefined ? String(order.receivedQuantity) : '');
                                setReceivingNotesInput(order.receivingNotes || '');
                                setIsReceiveModalOpen(true);
                              }}
                              className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-bold"
                            >
                              <PackageCheck size={13} />
                              <span>{order.receivedQuantity !== undefined ? (isRtl ? 'تعديل بيانات الاستلام' : 'Edit Receipt') : (isRtl ? 'تسجيل الاستلام الفعلي' : 'Record Receipt')}</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                          {/* Stage 1: Registration Officer */}
                          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                              ✓
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-zinc-400 block font-bold uppercase">{isRtl ? 'مسئول التسجيل (المرحلة 1)' : 'Registered By (Stage 1)'}</span>
                              <strong className="text-zinc-900 dark:text-zinc-100 font-bold block truncate">
                                {order.createdByName || order.createdBy}
                              </strong>
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                                🕒 {new Date(order.createdAt).toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
                              </span>
                            </div>
                          </div>

                          {/* Stage 2: Approval Officer */}
                          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-start gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 ${
                              order.approvedByName ? 'bg-emerald-500/20 text-emerald-600' : 
                              order.status === 'Rejected' ? 'bg-rose-500/20 text-rose-600' : 
                              'bg-amber-500/20 text-amber-600'
                            }`}>
                              {order.approvedByName ? '✓' : order.status === 'Rejected' ? '✕' : '2'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-zinc-400 block font-bold uppercase">{isRtl ? 'مسئول الاعتماد (المرحلة 2)' : 'Approved By (Stage 2)'}</span>
                              {order.approvedByName ? (
                                <>
                                  <strong className="text-zinc-900 dark:text-zinc-100 font-bold block truncate">{order.approvedByName}</strong>
                                  {order.approvedAt && (
                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                                      🕒 {new Date(order.approvedAt).toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
                                    </span>
                                  )}
                                </>
                              ) : order.status === 'Rejected' ? (
                                <>
                                  <strong className="text-rose-600 font-bold block truncate">{order.rejectedByName || (isRtl ? 'تم الرفض' : 'Rejected')}</strong>
                                  {order.rejectedAt && (
                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                                      🕒 {new Date(order.rejectedAt).toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-amber-500 font-semibold italic text-xs">{isRtl ? 'بانتظار مراجعة واعتماد المدير' : 'Pending review...'}</span>
                              )}
                            </div>
                          </div>

                          {/* Stage 3: Execution Officer */}
                          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-start gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 ${
                              order.executedByName ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'
                            }`}>
                              {order.executedByName ? '✓' : '3'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-zinc-400 block font-bold uppercase">{isRtl ? 'مسئول التنفيذ (المرحلة 3)' : 'Executed By (Stage 3)'}</span>
                              {order.executedByName ? (
                                <>
                                  <strong className="text-zinc-900 dark:text-zinc-100 font-bold block truncate">
                                    {order.executedByName}
                                  </strong>
                                  <div className="flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                                    <span>PO: {order.poNumber}</span>
                                    {order.sapDocNumber && <span>• SAP: {order.sapDocNumber}</span>}
                                  </div>
                                  {order.executedAt && (
                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                                      🕒 {new Date(order.executedAt).toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
                                    </span>
                                  )}
                                </>
                              ) : order.status === 'Approved' ? (
                                <span className="text-blue-500 font-bold text-xs">{isRtl ? 'معتمد - جاهز لإصدار أمر التوريد PO' : 'Approved - Ready for PO'}</span>
                              ) : (
                                <span className="text-zinc-400 text-xs italic">{isRtl ? 'لم يبدأ بعد' : 'Not started'}</span>
                              )}
                            </div>
                          </div>

                          {/* Stage 4: Actual Warehouse Receipt */}
                          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-start gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 ${
                              order.receivedQuantity !== undefined 
                                ? 'bg-purple-600 text-white' 
                                : order.status === 'Completed' 
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-600' 
                                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'
                            }`}>
                              {order.receivedQuantity !== undefined ? '✓' : '4'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-zinc-400 block font-bold uppercase">{isRtl ? 'الاستلام الفعلي بالمخزن (المرحلة 4)' : 'Actual Receipt (Stage 4)'}</span>
                              {order.receivedQuantity !== undefined ? (
                                <>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <strong className="text-purple-700 dark:text-purple-300 font-extrabold text-xs">
                                      {order.receivedQuantity.toLocaleString()} كجم
                                    </strong>
                                    <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                                      order.receivedQuantity < order.quantity ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' :
                                      order.receivedQuantity > order.quantity ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300' :
                                      'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                    }`}>
                                      {order.receivedQuantity < order.quantity ? `عجز ${(order.quantity - order.receivedQuantity).toLocaleString()} كجم` :
                                       order.receivedQuantity > order.quantity ? `زيادة +${(order.receivedQuantity - order.quantity).toLocaleString()} كجم` : 'مطابق'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-zinc-600 dark:text-zinc-300 block truncate mt-0.5 font-medium">
                                    👤 {order.receivedByName || order.receivedBy}
                                  </span>
                                  {order.receivedAt && (
                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">
                                      🕒 {new Date(order.receivedAt).toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
                                    </span>
                                  )}
                                </>
                              ) : order.status === 'Completed' ? (
                                <span className="text-purple-600 dark:text-purple-400 font-bold text-xs italic">
                                  {isRtl ? 'بانتظار إثبات الكمية المستلمة' : 'Awaiting receipt...'}
                                </span>
                              ) : (
                                <span className="text-zinc-400 text-xs italic">{isRtl ? 'بعد إصدار الـ PO' : 'After PO'}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Detailed Specs & Metadata Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
                          <span className="text-zinc-400 text-[10px] font-bold block mb-0.5">{isRtl ? 'كود المورد' : 'Supplier Code'}</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{order.supplierCode || '—'}</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
                          <span className="text-zinc-400 text-[10px] font-bold block mb-0.5">{isRtl ? 'تصنيف الصنف' : 'Item Category'}</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{order.itemCategory || 'زيتون فريش'}</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
                          <span className="text-zinc-400 text-[10px] font-bold block mb-0.5">{isRtl ? 'التوجيه الأولي' : 'Initial Routing'}</span>
                          <span className="font-bold text-blue-700 dark:text-blue-400">{order.initialRouting || 'مياه وملح'}</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
                          <span className="text-zinc-400 text-[10px] font-bold block mb-0.5">{isRtl ? 'التحليل' : 'Analysis'}</span>
                          <span className="font-bold text-amber-700 dark:text-amber-400">{order.analysisType || 'مبيدات'}</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
                          <span className="text-zinc-400 text-[10px] font-bold block mb-0.5">{isRtl ? 'طريقة السداد' : 'Payment Method'}</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{order.paymentMethod || (isRtl ? 'غير محددة' : 'Not specified')}</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
                          <span className="text-zinc-400 text-[10px] font-bold block mb-0.5">{isRtl ? 'سعر الكيلو المحدد' : 'Unit Price (kg)'}</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{order.price.toLocaleString()} ج.م / {order.unit || 'كجم'}</span>
                        </div>

                        {order.receivedQuantity !== undefined && (
                          <>
                            <div className="p-2.5 rounded-lg bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900">
                              <span className="text-purple-600 dark:text-purple-400 text-[10px] font-bold block mb-0.5">{isRtl ? 'الكمية المستلمة فعلياً' : 'Actual Received Qty'}</span>
                              <span className="font-black text-purple-900 dark:text-purple-200 text-sm">{order.receivedQuantity.toLocaleString()} كجم</span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900">
                              <span className="text-purple-600 dark:text-purple-400 text-[10px] font-bold block mb-0.5">{isRtl ? 'القيمة المستحقة الفعلية' : 'Actual Total Due'}</span>
                              <span className="font-black text-purple-900 dark:text-purple-200 text-sm">
                                {(order.receivedTotalAmount || order.receivedQuantity * order.price).toLocaleString()} ج.م
                              </span>
                            </div>
                          </>
                        )}

                        <div className="p-2.5 rounded-lg bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800 sm:col-span-2 lg:col-span-4">
                          <span className="text-zinc-400 text-[10px] font-bold block mb-0.5">{isRtl ? 'أماكن التنزيل' : 'Unloading Locations'}</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate block" title={order.unloadingLocations?.join(' • ') || '—'}>
                            {order.unloadingLocations?.join(' • ') || '—'}
                          </span>
                        </div>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1 & Edit: Registration Form (Stage 1) / Edit                        */}
      {/* ========================================================================= */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-[24px] p-5 sm:p-6 w-full max-w-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                  {isEditModalOpen ? <Edit3 size={20} /> : <FileText size={20} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {isEditModalOpen 
                      ? (isRtl ? 'تعديل طلب التسعير والتوريد' : 'Edit Pricing & Order') 
                      : (isRtl ? 'المرحلة الأولى: تسجيل طلب تسعير وتوريد' : 'Stage 1: Record Pricing & Order')}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {isRtl ? 'يقوم مسئول التسجيل بإدخال بيانات المنطقة، المورد، الصنف والأسعار' : 'Enter pricing date, region, supplier, item, qty, and price.'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={isEditModalOpen ? handleUpdateOrder : handleCreateOrder} className="space-y-3 mt-4">
              
              {/* Row 1: Pricing Date & Region */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'تاريخ التسعير' : 'Pricing Date'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.pricingDate}
                    onChange={(e) => setFormData({ ...formData, pricingDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-zinc-900 dark:text-white"
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
                    placeholder={isRtl ? 'اسم المنطقة...' : 'Region...'}
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-zinc-900 dark:text-white"
                  />
                  <datalist id="regions-list">
                    {COMMON_REGIONS.map(reg => <option key={reg} value={reg} />)}
                  </datalist>
                </div>
              </div>

              {/* Row 2: Supplier Name & Code */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'اسم المورد' : 'Supplier Name'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="suppliers-list"
                    placeholder={isRtl ? 'اسم المورد...' : 'Supplier...'}
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-zinc-900 dark:text-white"
                  />
                  <datalist id="suppliers-list">
                    {uniqueSuppliers.map(sup => <option key={sup} value={sup} />)}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'كود المورد' : 'Supplier Code'}
                  </label>
                  <input
                    type="text"
                    placeholder="SUP-001"
                    value={formData.supplierCode}
                    onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Row 3: Item Type & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'نوع الصنف' : 'Item Variety'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="items-list"
                    placeholder={isRtl ? 'مثال: تفاحي...' : 'e.g. Kalamata...'}
                    value={formData.itemType}
                    onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-zinc-900 dark:text-white"
                  />
                  <datalist id="items-list">
                    {COMMON_ITEM_TYPES.map(item => <option key={item} value={item} />)}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'التصنيف' : 'Category'} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.itemCategory}
                    onChange={(e) => setFormData({ ...formData, itemCategory: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold text-zinc-900 dark:text-white"
                  >
                    {COMMON_ITEM_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3.5: New Specific Fields (التوجيه الأولي & التحليل & طريقة السداد) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'التوجيه الأولي' : 'Initial Routing'} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.initialRouting}
                    onChange={(e) => setFormData({ ...formData, initialRouting: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold text-zinc-900 dark:text-white"
                  >
                    {INITIAL_ROUTING_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'التحليل' : 'Analysis'} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.analysisType}
                    onChange={(e) => setFormData({ ...formData, analysisType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold text-zinc-900 dark:text-white"
                  >
                    {ANALYSIS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'طريقة السداد' : 'Payment Method'}
                  </label>
                  <input
                    type="text"
                    placeholder={isRtl ? 'مثال: نقداً / شيك 30 يوم / تحويل...' : 'e.g. Cash / Bank transfer / Check...'}
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Row 4: Quantity, Unit (كيلو جرام فقط), Price, Total live calculation */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'الكمية (كيلو جرام)' : 'Quantity (kg)'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold text-zinc-900 dark:text-white"
                    />
                    <div className="px-3 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-extrabold text-zinc-800 dark:text-zinc-200 shrink-0 select-none">
                      كجم
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'سعر الكيلو جرام' : 'Price per kg'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold text-zinc-900 dark:text-white"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1 space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {isRtl ? 'الإجمالي التقديري' : 'Calculated Total'}
                  </label>
                  <div className="w-full px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs flex items-center justify-between">
                    <span>
                      {((parseFloat(formData.quantity) || 0) * (parseFloat(formData.price) || 0)).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold">ج.م</span>
                  </div>
                </div>
              </div>

              {/* Unloading Locations (مكان التنزيل / التعتيق) */}
              <div className="space-y-2 border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  {isRtl ? 'مكان التنزيل / التعتيق' : 'Unloading Location'} <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {['اوليف لاند', 'ريتش لاند', 'Jps'].map(loc => (
                    <label key={loc} className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={formData.unloadingLocations.includes(loc)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, unloadingLocations: [...formData.unloadingLocations, loc] });
                          } else {
                            setFormData({ ...formData, unloadingLocations: formData.unloadingLocations.filter(l => l !== loc) });
                          }
                        }}
                        className="w-3.5 h-3.5 text-emerald-500 rounded border-zinc-300 dark:border-zinc-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{loc}</span>
                    </label>
                  ))}
                  
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={formData.unloadingLocations.includes('أخرى')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, unloadingLocations: [...formData.unloadingLocations, 'أخرى'] });
                        } else {
                          setFormData({ ...formData, unloadingLocations: formData.unloadingLocations.filter(l => l !== 'أخرى'), customUnloadingLocation: '' });
                        }
                      }}
                      className="w-3.5 h-3.5 text-emerald-500 rounded border-zinc-300 dark:border-zinc-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{isRtl ? 'أخرى' : 'Other'}</span>
                  </label>
                </div>
                {formData.unloadingLocations.includes('أخرى') && (
                  <input
                    type="text"
                    required
                    placeholder={isRtl ? 'اكتب مكان التعتيق...' : 'Enter location...'}
                    value={formData.customUnloadingLocation}
                    onChange={(e) => setFormData({ ...formData, customUnloadingLocation: e.target.value })}
                    className="w-full mt-2 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-zinc-900 dark:text-white"
                  />
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  {isRtl ? 'ملاحظات إضافية' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isRtl ? 'أي شروط تسليم أو تفاصيل خاصة...' : 'Any special terms...'}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-zinc-900 dark:text-white resize-none"
                />
              </div>

              <div className="pt-3 mt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
                  className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  <span>{isEditModalOpen ? (isRtl ? 'حفظ التعديلات' : 'Save Changes') : (isRtl ? 'تسجيل الطلب' : 'Submit')}</span>
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

              {/* Optional Actual Received Quantity (If already delivered) */}
              <div className="space-y-1.5 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50">
                <label className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <PackageCheck size={14} className="text-purple-600" />
                    <span>{isRtl ? 'الكمية المستلمة فعلياً (اختياري إذا تم الاستلام)' : 'Actual Received Qty (Optional)'}</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-normal">كجم</span>
                </label>
                <input
                  type="number"
                  placeholder={isRtl ? `الكمية المطلوبة: ${selectedOrder.quantity.toLocaleString()} كجم` : `Requested: ${selectedOrder.quantity} kg`}
                  value={receivedQtyInput}
                  onChange={(e) => setReceivedQtyInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-purple-200 dark:border-purple-800 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold text-zinc-900 dark:text-white"
                />
                {receivedQtyInput && !isNaN(parseFloat(receivedQtyInput)) && (
                  <div className="flex items-center justify-between text-[11px] font-bold text-purple-700 dark:text-purple-300 pt-1">
                    <span>
                      {isRtl ? 'الإجمالي الفعلي المستحق:' : 'Actual Due:'}{' '}
                      {(parseFloat(receivedQtyInput) * (selectedOrder.price || 0)).toLocaleString()} ج.م
                    </span>
                    <span className={parseFloat(receivedQtyInput) < selectedOrder.quantity ? 'text-amber-600' : 'text-emerald-600'}>
                      {parseFloat(receivedQtyInput) < selectedOrder.quantity 
                        ? `عجز ${(selectedOrder.quantity - parseFloat(receivedQtyInput)).toLocaleString()} كجم`
                        : parseFloat(receivedQtyInput) > selectedOrder.quantity
                        ? `زيادة +${(parseFloat(receivedQtyInput) - selectedOrder.quantity).toLocaleString()} كجم`
                        : 'مطابق'}
                    </span>
                  </div>
                )}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl"
          >
            <ModernPurchaseOrderVoucher
              order={selectedOrder}
              companyName="شركة ريتشلاند للصناعات الغذائية"
              companySubtitle="إدارة المشتريات والتوريدات الزراعية • RICHLAND AGRI & FRESH SUPPLY"
              onClose={() => setIsViewModalOpen(false)}
            />
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: Stage 4 - Actual Receipt Recording Modal                         */}
      {/* ========================================================================= */}
      {isReceiveModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center font-bold">
                  <PackageCheck size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {isRtl ? 'تسجيل الكمية المستلمة فعلياً' : 'Record Actual Received Quantity'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {selectedOrder.orderNumber} • {selectedOrder.poNumber ? `PO: ${selectedOrder.poNumber}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsReceiveModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mt-5">
              {/* Order Info Summary Card */}
              <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-500/20 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">{isRtl ? 'المورد:' : 'Supplier:'}</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedOrder.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{isRtl ? 'الصنف والتصنيف:' : 'Item & Category:'}</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedOrder.itemType} ({selectedOrder.itemCategory || 'زيتون فريش'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{isRtl ? 'الكمية المطلوبة بأمر التوريد:' : 'Requested Quantity:'}</span>
                  <span className="font-extrabold text-zinc-900 dark:text-white text-sm">{selectedOrder.quantity.toLocaleString()} كجم</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{isRtl ? 'السعر للكيلو:' : 'Price / kg:'}</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedOrder.price.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-purple-500/20">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">{isRtl ? 'الإجمالي المطلوب المعتمد:' : 'Requested Total:'}</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{selectedOrder.totalAmount.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* Input: Actual Received Quantity (kg) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center justify-between">
                  <span>{isRtl ? 'الكمية المستلمة فعلياً بالمخزن (كجم)' : 'Actual Received Quantity (kg)'} <span className="text-rose-500">*</span></span>
                  <button
                    type="button"
                    onClick={() => setReceivedQtyInput(String(selectedOrder.quantity))}
                    className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                  >
                    {isRtl ? 'مطابق للطلب تماماً' : 'Same as requested'}
                  </button>
                </label>
                <div className="relative">
                  <Scale className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="أدخل وزن الكمية المستلمة الفعلي..."
                    value={receivedQtyInput}
                    onChange={(e) => setReceivedQtyInput(e.target.value)}
                    className="w-full pl-4 pr-11 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-purple-300 dark:border-purple-800 outline-none focus:ring-2 focus:ring-purple-500 text-base font-black text-purple-900 dark:text-purple-100"
                  />
                </div>
              </div>

              {/* Real-time Variance Calculation */}
              {receivedQtyInput && !isNaN(parseFloat(receivedQtyInput)) && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">{isRtl ? 'نسبة الاستلام:' : 'Receipt Ratio:'}</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {((parseFloat(receivedQtyInput) / selectedOrder.quantity) * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">{isRtl ? 'فارق الكمية (الوزن):' : 'Quantity Variance:'}</span>
                    <span className={`font-black ${
                      parseFloat(receivedQtyInput) < selectedOrder.quantity ? 'text-amber-600' :
                      parseFloat(receivedQtyInput) > selectedOrder.quantity ? 'text-blue-600' : 'text-emerald-600'
                    }`}>
                      {parseFloat(receivedQtyInput) < selectedOrder.quantity
                        ? `عجز: -${(selectedOrder.quantity - parseFloat(receivedQtyInput)).toLocaleString()} كجم`
                        : parseFloat(receivedQtyInput) > selectedOrder.quantity
                        ? `زيادة: +${(parseFloat(receivedQtyInput) - selectedOrder.quantity).toLocaleString()} كجم`
                        : 'مطابق بنسبة 100%'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-zinc-700 text-sm">
                    <span className="font-extrabold text-zinc-900 dark:text-white">
                      {isRtl ? 'القيمة المستحقة الفعلية للصرف:' : 'Actual Due Amount:'}
                    </span>
                    <span className="font-black text-purple-700 dark:text-purple-300 text-base">
                      {(parseFloat(receivedQtyInput) * (selectedOrder.price || 0)).toLocaleString()} ج.م
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Receiving Notes / Discrepancy Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  {isRtl ? 'ملاحظات الاستلام والمطابقة (اختياري)' : 'Receiving & Inspection Notes (Optional)'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isRtl ? 'تم استلام الشحنة وتفريغها في مخزن...' : 'Delivered and unloaded at warehouse...'}
                  value={receivingNotesInput}
                  onChange={(e) => setReceivingNotesInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-purple-500 text-sm text-zinc-900 dark:text-white resize-none"
                />
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-5 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveReceipt}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-xl shadow-purple-600/20 disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw size={16} className="animate-spin" /> : <PackageCheck size={16} />}
                  <span>{isRtl ? 'حفظ وتأكيد الاستلام الفعلي' : 'Save & Confirm Receipt'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
