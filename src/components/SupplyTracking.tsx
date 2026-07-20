import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Plus, 
  ArrowRight, 
  MessageSquare,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Camera,
  Download
} from 'lucide-react';
import { SupplyMovement, UserProfile, Language, SupplyStatus, QualityDecision } from '../types';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../constants';
import { handleFirestoreError, OperationType, storageService } from '../services/storageService';
import { translations } from '../i18n';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { notifyUser } from '../services/notificationService';
import * as XLSX from 'xlsx';

interface SupplyTrackingProps {
  lang: Language;
  user: UserProfile;
  allUsers: UserProfile[];
}

export default function SupplyTracking({ lang, user, allUsers }: SupplyTrackingProps) {
  const hasRole = (rolesToCheck: string | string[]) => {
    const userRoles = user?.roles || (user?.role ? [user.role] : []);
    if (Array.isArray(rolesToCheck)) {
      return rolesToCheck.some(r => userRoles.includes(r as any));
    }
    return userRoles.includes(rolesToCheck as any);
  };
  const t = translations[lang];
  const [movements, setMovements] = useState<SupplyMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingMovement, setEditingMovement] = useState<SupplyMovement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<SupplyStatus | 'All'>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state for new movement (Security) with 16 comprehensive fields
  const [newMovement, setNewMovement] = useState({
    postNumber: '',
    sapNumber: '',
    clientName: '',
    movementNumber: '',
    movementType: 'استلام', // Default to receipt
    date: new Date().toISOString().split('T')[0], // Default to current date YYYY-MM-DD
    deliveryNote: '',
    materialCode: '',
    itemName: '',
    size: '',
    batch: '',
    quantity: '',
    unit: 'كجم', // Default to Kg
    driverName: '',
    vehicleNumber: '',
    notes: '',
  });

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.SUPPLY_MOVEMENTS), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SupplyMovement));
      setMovements(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.SUPPLY_MOVEMENTS);
    });

    return () => unsubscribe();
  }, []);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/LD2Puiu3KEv1qZx0LmiB70';

  const shareToWhatsApp = (movement: SupplyMovement, action: string) => {
    const serialNumber = movement.id.slice(0, 8).toUpperCase();
    const header = action === 'Entry' ? `*حركة توريد جديدة* ${serialNumber}` : `حركة توريد رقم ${serialNumber}`;
    
    let statusLabel = '';
    let actionLabel = '';

    if (movement.status === 'Security Entry') {
      statusLabel = 'تم الدخول';
      actionLabel = 'يرجى الفحص';
    } else if (movement.status === 'Quality Inspection') {
      statusLabel = 'تم الفحص';
      actionLabel = 'برجاء التنزيل';
    } else if (movement.status === 'Warehouse Unloading') {
      if (movement.qualityDecision === 'Rejected') {
        statusLabel = '*تم الفحص (مرفوض)*';
        actionLabel = '*برجاء عدم التنزيل*';
      } else if (movement.qualityDecision === 'Not Unloaded') {
        statusLabel = '*لم يتم التنزيل*';
        actionLabel = '*يرجي الخروج*';
      } else {
        statusLabel = 'تم الفحص (مقبول)';
        actionLabel = 'برجاء التنزيل';
      }
    } else if (movement.status === 'Security Exit') {
      statusLabel = 'تم التنزيل';
      actionLabel = 'يرجي الخروج';
    } else if (movement.status === 'Completed') {
      statusLabel = 'تم الخروج';
      actionLabel = 'مكتملة';
    } else {
      statusLabel = getStatusLabel(movement.status);
      actionLabel = action;
    }

    const message = `
${header}
التاريخ: ${movement.date || format(new Date(movement.entryTime), 'yyyy-MM-dd')}
رقم البوست: ${movement.postNumber || '-'}
رقم الساب: ${movement.sapNumber || '-'}
المورد: ${movement.clientName}
رقم الحركة: ${movement.movementNumber || '-'}
الحركة: ${movement.movementType || '-'}
اذن تسليم المورد: ${movement.deliveryNote || '-'}
الكود: ${movement.materialCode || '-'}
الصنف: ${movement.itemName}
الحجم: ${movement.size || '-'}
الباتش: ${movement.batch || '-'}
الكمية: ${movement.quantity || '-'}
الوحدة: ${movement.unit || '-'}
اسم السائق: ${movement.driverName}
رقم السيارة: ${movement.vehicleNumber}
ملاحظات: ${movement.notes || '-'}
الحالة: ${statusLabel}
الإجراء: ${actionLabel}
التوقيت: ${format(new Date(), 'p - dd/MM/yyyy', { locale: lang === 'ar' ? ar : enUS })}
    `.trim();

    navigator.clipboard.writeText(message);
    toast.success(lang === 'ar' ? 'تم نسخ تفاصيل الحركة، يرجى لصقها في واتساب' : 'Movement details copied, please paste in WhatsApp');
    
    // Clear temporary image after sharing
    setSelectedImage(null);
    
    window.open(WHATSAPP_GROUP_URL, '_system');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => setSelectedImage(e.target?.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const movement: SupplyMovement = {
      id: crypto.randomUUID(),
      entryTime: new Date().toISOString(),
      clientName: newMovement.clientName,
      itemName: newMovement.itemName,
      driverName: newMovement.driverName,
      vehicleNumber: newMovement.vehicleNumber,
      poNumber: newMovement.postNumber, // Keep poNumber backward compatible with postNumber
      status: 'Security Entry',
      
      // Save all 16 comprehensive fields
      postNumber: newMovement.postNumber,
      sapNumber: newMovement.sapNumber,
      movementNumber: newMovement.movementNumber,
      movementType: newMovement.movementType,
      date: newMovement.date,
      deliveryNote: newMovement.deliveryNote,
      materialCode: newMovement.materialCode,
      size: newMovement.size,
      batch: newMovement.batch,
      quantity: parseFloat(newMovement.quantity) || 0,
      unit: newMovement.unit,
      notes: newMovement.notes,
      
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };

    try {
      await storageService.saveSupplyMovement(movement);
      setMovements([movement, ...movements]);
      setIsAdding(false);
      setNewMovement({
        postNumber: '',
        sapNumber: '',
        clientName: '',
        movementNumber: '',
        movementType: 'استلام',
        date: new Date().toISOString().split('T')[0],
        deliveryNote: '',
        materialCode: '',
        itemName: '',
        size: '',
        batch: '',
        quantity: '',
        unit: 'كجم',
        driverName: '',
        vehicleNumber: '',
        notes: '',
      });
      toast.success(lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Entry recorded successfully');
      
      // Open WhatsApp first, then notify
      shareToWhatsApp(movement, lang === 'ar' ? 'تسجيل دخول' : 'Entry');
      
      setTimeout(() => {
        notifyUser(lang === 'ar' ? 'تم إضافة حركة توريد جديدة' : 'New supply movement added', false);
      }, 500);
    } catch (error) {
      toast.error(lang === 'ar' ? 'خطأ في الحفظ' : 'Error saving');
    }
  };

  const handleEditMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovement) return;

    try {
      const updatedMovement = {
        ...editingMovement,
        lastUpdatedAt: new Date().toISOString(),
      };
      await storageService.saveSupplyMovement(updatedMovement);
      setMovements(movements.map(m => m.id === updatedMovement.id ? updatedMovement : m));
      setIsEditing(false);
      setEditingMovement(null);
      toast.success(lang === 'ar' ? 'تم التعديل بنجاح' : 'Edited successfully');
      shareToWhatsApp(updatedMovement, lang === 'ar' ? 'تعديل بيانات' : 'Data Edit');
    } catch (error) {
      toast.error(lang === 'ar' ? 'خطأ في التعديل' : 'Error editing');
    }
  };

  const handleUpdateStatus = async (movement: SupplyMovement, nextStatus: SupplyStatus, updates: Partial<SupplyMovement>) => {
    console.log('handleUpdateStatus called', { movement, nextStatus, updates });
    toast.info('Updating status...');
    const updatedMovement = {
      ...movement,
      ...updates,
      status: nextStatus,
      lastUpdatedAt: new Date().toISOString(),
    };

    try {
      await storageService.saveSupplyMovement(updatedMovement);
      setMovements(prev => prev.map(m => m.id === movement.id ? updatedMovement : m));
      toast.success(lang === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully');
      shareToWhatsApp(updatedMovement, lang === 'ar' ? 'تحديث الحالة' : 'Status Update');
    } catch (error) {
      toast.error(lang === 'ar' ? 'خطأ في التحديث' : 'Error updating');
    }
  };

  const getUserName = (uid?: string) => {
    if (!uid) return '-';
    const u = allUsers.find(user => user.uid === uid);
    return u ? u.displayName : uid;
  };

  const exportToExcel = () => {
    const data = movements.map(m => ({
      'Client Name': m.clientName,
      'Item Name': m.itemName,
      'Driver Name': m.driverName,
      'Vehicle Number': m.vehicleNumber,
      'Status': m.status,
      'Quality Decision': m.qualityDecision || 'N/A',
      'Entry Time': m.entryTime,
      'Quality Time': m.qualityTime || 'N/A',
      'Warehouse Time': m.warehouseTime || 'N/A',
      'Exit Time': m.exitTime || 'N/A',
      'PO Number': m.poNumber || 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movements");
    XLSX.writeFile(wb, "SupplyMovements.xlsx");
  };

  const filteredMovements = movements.filter(m => {
    const matchesSearch = 
      m.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.driverName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Role-based filtering
    let isRelevant = true;
    const userRoles = user?.roles || (user?.role ? [user.role] : []);
    if (userRoles.includes('Quality')) {
      isRelevant = m.status === 'Security Entry' || m.status === 'Quality Inspection';
    } else if (userRoles.includes('Warehouse')) {
      isRelevant = m.status === 'Warehouse Unloading';
    } else if (userRoles.includes('Security')) {
      isRelevant = m.status !== 'Completed';
    } else if (!userRoles.includes('Admin')) {
      isRelevant = false; // Other roles don't see movements
    }

    const matchesFilter = filterStatus === 'All' || m.status === filterStatus;
    return matchesSearch && matchesFilter && isRelevant;
  });

  const getStatusColor = (status: SupplyStatus) => {
    switch (status) {
      case 'Security Entry': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'Quality Inspection': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'Warehouse Unloading': return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'Security Exit': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'Completed': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
      default: return 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30';
    }
  };

  const getStatusLabel = (status: SupplyStatus) => {
    switch (status) {
      case 'Security Entry': return lang === 'ar' ? 'تم الدخول' : 'Vehicle Entered';
      case 'Quality Inspection': return lang === 'ar' ? 'تم الفحص' : 'Inspected';
      case 'Warehouse Unloading': return lang === 'ar' ? 'تم التنزيل' : 'Unloaded';
      case 'Security Exit': return lang === 'ar' ? 'تم الخروج' : 'Exited';
      case 'Completed': return t.status_completed;
      default: return status;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Truck className="text-emerald-500" />
            {t.supplyTracking}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            {lang === 'ar' ? 'متابعة حركة توريد الخام والمنتجات' : 'Track raw material and product supply movement'}
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus size={20} />
          {lang === 'ar' ? 'تسجيل حركة جديدة' : 'Register New Movement'}
        </button>
      </div>

      {/* Search and Filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-400`} size={20} />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث باسم العميل، السائق، أو رقم السيارة...' : 'Search by client, driver, or vehicle number...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
          />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Filter className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-400`} size={20} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none transition-all text-zinc-900 dark:text-white [&>option]:text-zinc-900 [&>option]:bg-white dark:[&>option]:text-white dark:[&>option]:bg-zinc-800`}
            >
              <option value="All">{lang === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
              <option value="Quality Inspection">{t.status_quality_inspection}</option>
              <option value="Warehouse Unloading">{t.status_warehouse_unloading}</option>
              <option value="Security Exit">{t.status_security_exit}</option>
              <option value="Completed">{t.status_completed}</option>
            </select>
          </div>

        </div>
      </div>

      {/* Movements List */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredMovements.map((movement) => (
            <motion.div
              key={movement.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => setExpandedId(expandedId === movement.id ? null : movement.id)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex flex-col md:flex-row justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Truck className="text-emerald-500" size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-white">{movement.clientName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(movement.status)}`}>
                        {getStatusLabel(movement.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <User size={12} />
                        <span>{movement.driverName} ({movement.vehicleNumber})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlertCircle size={12} />
                        <span>{movement.itemName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        <span>{format(new Date(movement.entryTime), 'p - dd/MM/yyyy', { locale: lang === 'ar' ? ar : enUS })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Quality Actions */}
                  {(movement.status === 'Quality Inspection' || movement.status === 'Security Entry') && hasRole(['Quality', 'Admin']) && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleUpdateStatus(movement, 'Warehouse Unloading', { 
                          qualityDecision: 'Accepted', 
                          qualityInspectorId: user.uid,
                          qualityTime: new Date().toISOString()
                        })}
                        className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all"
                      >
                        {t.accepted}
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(movement, 'Quality Inspection', { 
                          qualityDecision: 'Under Inspection', 
                          qualityInspectorId: user.uid,
                          qualityTime: new Date().toISOString()
                        })}
                        className="flex-1 sm:flex-none px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 transition-all"
                      >
                        {t.underInspection}
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(movement, 'Warehouse Unloading', { 
                          qualityDecision: 'Rejected', 
                          qualityInspectorId: user.uid,
                          qualityTime: new Date().toISOString()
                        })}
                        className="flex-1 sm:flex-none px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all"
                      >
                        {t.rejected}
                      </button>
                    </div>
                  )}

                  {/* Start Unloading Action */}
                  {movement.status === 'Quality Inspection' && movement.qualityDecision === 'Accepted' && hasRole(['Warehouse', 'Admin']) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUpdateStatus(movement, 'Warehouse Unloading', { 
                        warehouseOperatorId: user.uid,
                        warehouseTime: new Date().toISOString()
                      })}}
                      className="w-full sm:w-auto px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all"
                    >
                      {lang === 'ar' ? 'بدء التنزيل' : 'Start Unloading'}
                    </button>
                  )}

                  {/* Warehouse Actions */}
                  {movement.status === 'Warehouse Unloading' && hasRole(['Warehouse', 'Admin']) && (
                    <div className="flex gap-2">
                      {movement.qualityDecision === 'Rejected' ? (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(movement, 'Quality Inspection', { qualityDecision: 'Under Inspection' }) }}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 transition-all"
                          >
                            {lang === 'ar' ? 'إعادة الفحص' : 'Re-inspect'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(movement, 'Security Exit', { qualityDecision: 'Not Unloaded' }) }}
                            className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all"
                          >
                            {lang === 'ar' ? 'عدم التنزيل' : 'Don\'t Unload'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUpdateStatus(movement, 'Security Exit', { 
                            warehouseOperatorId: user.uid,
                            warehouseTime: new Date().toISOString()
                          })}}
                          className="w-full sm:w-auto px-6 py-2 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 transition-all"
                        >
                          {t.unloading}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Security Exit Actions */}
                  {movement.status === 'Security Exit' && hasRole(['Security', 'Admin']) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUpdateStatus(movement, 'Completed', { 
                        securityExitId: user.uid,
                        exitTime: new Date().toISOString()
                      })}}
                      className="w-full sm:w-auto px-6 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all"
                    >
                      {t.confirmExit}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedId === movement.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800"
                  >
                    {/* ERP Comprehensive Receipt Sheet */}
                    <div className="mb-4">
                      <p className="font-black text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
                        {lang === 'ar' ? 'مستند حركة توريد الخام بالتفصيل' : 'Detailed Raw Material Delivery Sheet'}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-50 dark:bg-zinc-800/20 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/60">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-medium text-zinc-400 block">{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
                          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{movement.date || format(new Date(movement.entryTime), 'yyyy-MM-dd')}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-medium text-zinc-400 block">{lang === 'ar' ? 'الحركة' : 'Movement'}</span>
                          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{movement.movementType || 'استلام'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-medium text-zinc-400 block">{lang === 'ar' ? 'رقم الحركة' : 'Movement No.'}</span>
                          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{movement.movementNumber || '-'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-medium text-zinc-400 block">{lang === 'ar' ? 'رقم البوست' : 'Post No.'}</span>
                          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{movement.postNumber || '-'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-medium text-zinc-400 block">{lang === 'ar' ? 'رقم الساب' : 'SAP No.'}</span>
                          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{movement.sapNumber || '-'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-medium text-zinc-400 block">{lang === 'ar' ? 'المورد' : 'Supplier'}</span>
                          <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{movement.clientName}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-medium text-zinc-400 block">{lang === 'ar' ? 'اذن تسليم المورد' : 'Supplier Permit'}</span>
                          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{movement.deliveryNote || '-'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-medium text-zinc-400 block">{lang === 'ar' ? 'الكود' : 'Code'}</span>
                          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{movement.materialCode || '-'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-medium text-zinc-400 block">{lang === 'ar' ? 'الصنف' : 'Item'}</span>
                          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{movement.itemName}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-medium text-zinc-400 block">{lang === 'ar' ? 'الحجم' : 'Size'}</span>
                          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{movement.size || '-'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-medium text-zinc-400 block">{lang === 'ar' ? 'الباتش' : 'Batch'}</span>
                          <span className="font-bold text-sm font-mono text-blue-600 dark:text-blue-400">{movement.batch || '-'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-medium text-zinc-400 block">{lang === 'ar' ? 'الكمية والوحدة' : 'Qty & Unit'}</span>
                          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{movement.quantity?.toLocaleString() || '0'} {movement.unit || 'كجم'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-medium text-zinc-400 block">{lang === 'ar' ? 'اسم السائق' : 'Driver Name'}</span>
                          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{movement.driverName}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-medium text-zinc-400 block">{lang === 'ar' ? 'رقم السيارة' : 'Vehicle No.'}</span>
                          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{movement.vehicleNumber}</span>
                        </div>
                        <div className="space-y-0.5 col-span-2">
                          <span className="text-[10px] font-medium text-zinc-400 block">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</span>
                          <span className="text-xs text-zinc-600 dark:text-zinc-400 block">{movement.notes || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                      <div className="space-y-2">
                        <p className="font-bold text-zinc-900 dark:text-white">{lang === 'ar' ? 'تفاصيل العمليات' : 'Operation Details'}</p>
                        <div className="text-zinc-500 dark:text-zinc-400 space-y-1">
                          <p>{lang === 'ar' ? 'دخول الأمن' : 'Security Entry'}: {getUserName(movement.qualityInspectorId || movement.warehouseOperatorId || movement.securityExitId ? 'Security' : undefined)} - {format(new Date(movement.entryTime), 'p - dd/MM/yyyy', { locale: lang === 'ar' ? ar : enUS })}</p>
                          {movement.qualityTime && <p>{t.inspection}: {getUserName(movement.qualityInspectorId)} - {format(new Date(movement.qualityTime), 'p - dd/MM/yyyy', { locale: lang === 'ar' ? ar : enUS })}</p>}
                          {movement.warehouseTime && <p>{t.unloading}: {getUserName(movement.warehouseOperatorId)} - {format(new Date(movement.warehouseTime), 'p - dd/MM/yyyy', { locale: lang === 'ar' ? ar : enUS })}</p>}
                          {movement.exitTime && <p>{t.confirmExit}: {getUserName(movement.securityExitId)} - {format(new Date(movement.exitTime), 'p - dd/MM/yyyy', { locale: lang === 'ar' ? ar : enUS })}</p>}
                        </div>
                      </div>
                      
                      {/* Comments/Details Section */}
                      {(movement.qualityComments || movement.warehouseComments) && (
                        <div className="space-y-2">
                          <p className="font-bold text-zinc-900 dark:text-white">{t.comments}</p>
                          {movement.qualityComments && (
                            <div className="flex gap-2">
                              <MessageSquare size={16} className="text-emerald-500 shrink-0" />
                              <span className="text-zinc-600 dark:text-zinc-400">{movement.qualityComments}</span>
                            </div>
                          )}
                          {movement.warehouseComments && (
                            <div className="flex gap-2">
                              <MessageSquare size={16} className="text-purple-500 shrink-0" />
                              <span className="text-zinc-600 dark:text-zinc-400">{movement.warehouseComments}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Admin Actions */}
                    {hasRole('Admin') && (
                      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditingMovement(movement);
                            setIsEditing(true);
                          }}
                          className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          {t.edit || 'Edit'}
                        </button>
                        <button
                          onClick={async (e) => { 
                            e.stopPropagation(); 
                            if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه الحركة؟' : 'Are you sure you want to delete this movement?')) {
                              try {
                                await storageService.deleteSupplyMovement(movement.id);
                                setMovements(movements.filter(m => m.id !== movement.id));
                                toast.success(lang === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
                              } catch (error) {
                                toast.error(lang === 'ar' ? 'خطأ في الحذف' : 'Error deleting');
                              }
                            }
                          }}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
                        >
                          {t.delete || 'Delete'}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {!loading && filteredMovements.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="text-zinc-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
              {lang === 'ar' ? 'لا توجد حركات توريد' : 'No supply movements found'}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400">
              {lang === 'ar' ? 'جرب تغيير معايير البحث أو الفلترة' : 'Try changing your search or filter criteria'}
            </p>
          </div>
        )}
      </div>

      {/* Add Movement Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden my-8"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  {lang === 'ar' ? 'تسجيل حركة توريد جديدة' : 'Register New Supply Movement'}
                </h2>
                <button onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleAddMovement} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* التاريخ */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'التاريخ' : 'Date'}</label>
                    <input
                      required
                      type="date"
                      value={newMovement.date}
                      onChange={(e) => setNewMovement({ ...newMovement, date: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  {/* الحركة */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'الحركة' : 'Movement'}</label>
                    <select
                      value={newMovement.movementType}
                      onChange={(e) => setNewMovement({ ...newMovement, movementType: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm text-zinc-900 dark:text-white"
                    >
                      <option value="استلام">{lang === 'ar' ? 'استلام (توريد)' : 'Receipt'}</option>
                      <option value="صرف">{lang === 'ar' ? 'صرف' : 'Issue'}</option>
                    </select>
                  </div>

                  {/* رقم الحركة */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'رقم الحركة' : 'Movement Number'}</label>
                    <input
                      type="text"
                      value={newMovement.movementNumber}
                      onChange={(e) => setNewMovement({ ...newMovement, movementNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder={lang === 'ar' ? 'أدخل رقم الحركة' : 'Enter movement number'}
                    />
                  </div>

                  {/* رقم البوست */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'رقم البوست' : 'Post Number'}</label>
                    <input
                      type="text"
                      value={newMovement.postNumber}
                      onChange={(e) => setNewMovement({ ...newMovement, postNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder={lang === 'ar' ? 'أدخل رقم البوست' : 'Enter post number'}
                    />
                  </div>

                  {/* رقم الساب */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'رقم الساب' : 'SAP Number'}</label>
                    <input
                      type="text"
                      value={newMovement.sapNumber}
                      onChange={(e) => setNewMovement({ ...newMovement, sapNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder={lang === 'ar' ? 'أدخل رقم الساب' : 'Enter SAP number'}
                    />
                  </div>

                  {/* المورد */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'المورد *' : 'Supplier *'}</label>
                    <input
                      required
                      type="text"
                      value={newMovement.clientName}
                      onChange={(e) => setNewMovement({ ...newMovement, clientName: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder={lang === 'ar' ? 'اسم المورد / العميل' : 'Supplier/Client name'}
                    />
                  </div>

                  {/* اذن تسليم المورد */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'اذن تسليم المورد' : 'Supplier Delivery Permit'}</label>
                    <input
                      type="text"
                      value={newMovement.deliveryNote}
                      onChange={(e) => setNewMovement({ ...newMovement, deliveryNote: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder={lang === 'ar' ? 'رقم إذن التسليم' : 'Permit number'}
                    />
                  </div>

                  {/* الكود */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'الكود' : 'Code'}</label>
                    <input
                      type="text"
                      value={newMovement.materialCode}
                      onChange={(e) => setNewMovement({ ...newMovement, materialCode: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder={lang === 'ar' ? 'كود الصنف' : 'Material code'}
                    />
                  </div>

                  {/* الصنف */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'الصنف *' : 'Item *'}</label>
                    <input
                      required
                      type="text"
                      value={newMovement.itemName}
                      onChange={(e) => setNewMovement({ ...newMovement, itemName: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder={lang === 'ar' ? 'اسم الصنف أو المادة' : 'Item/Material name'}
                    />
                  </div>

                  {/* الحجم */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'الحجم' : 'Size'}</label>
                    <input
                      type="text"
                      value={newMovement.size}
                      onChange={(e) => setNewMovement({ ...newMovement, size: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder={lang === 'ar' ? 'مثال: 100-110 أو كبير' : 'e.g. 100-110'}
                    />
                  </div>

                  {/* الباتش */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'الباتش' : 'Batch'}</label>
                    <input
                      type="text"
                      value={newMovement.batch}
                      onChange={(e) => setNewMovement({ ...newMovement, batch: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder={lang === 'ar' ? 'رقم الـ Batch' : 'Batch number'}
                    />
                  </div>

                  {/* الكمية */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'الكمية' : 'Quantity'}</label>
                    <input
                      type="number"
                      step="any"
                      value={newMovement.quantity}
                      onChange={(e) => setNewMovement({ ...newMovement, quantity: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder={lang === 'ar' ? 'مثال: 5000' : 'e.g. 5000'}
                    />
                  </div>

                  {/* الوحدة */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'الوحدة' : 'Unit'}</label>
                    <select
                      value={newMovement.unit}
                      onChange={(e) => setNewMovement({ ...newMovement, unit: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm text-zinc-900 dark:text-white"
                    >
                      <option value="كجم">{lang === 'ar' ? 'كيلوجرام (كجم)' : 'Kilogram'}</option>
                      <option value="طن">{lang === 'ar' ? 'طن' : 'Ton'}</option>
                      <option value="لتر">{lang === 'ar' ? 'لتر' : 'Liter'}</option>
                      <option value="برميل">{lang === 'ar' ? 'برميل' : 'Barrel'}</option>
                      <option value="كرتونة">{lang === 'ar' ? 'كرتونة' : 'Carton'}</option>
                    </select>
                  </div>

                  {/* اسم السائق */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'اسم السائق *' : 'Driver Name *'}</label>
                    <input
                      required
                      type="text"
                      value={newMovement.driverName}
                      onChange={(e) => setNewMovement({ ...newMovement, driverName: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder={lang === 'ar' ? 'اسم السائق الثلاثي' : 'Driver full name'}
                    />
                  </div>

                  {/* رقم السيارة */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'رقم السيارة *' : 'Vehicle Number *'}</label>
                    <input
                      required
                      type="text"
                      value={newMovement.vehicleNumber}
                      onChange={(e) => setNewMovement({ ...newMovement, vehicleNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder={lang === 'ar' ? 'رقم اللوحة / السيارة' : 'License plate number'}
                    />
                  </div>

                  {/* ملاحظات */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</label>
                    <textarea
                      value={newMovement.notes}
                      onChange={(e) => setNewMovement({ ...newMovement, notes: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm min-h-[60px]"
                      placeholder={lang === 'ar' ? 'أي ملاحظات إضافية على التوريد...' : 'Additional notes...'}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-xl font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Movement Modal */}
      <AnimatePresence>
        {isEditing && editingMovement && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsEditing(false); setEditingMovement(null); }}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden my-8"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  {lang === 'ar' ? 'تعديل حركة التوريد' : 'Edit Supply Movement'}
                </h2>
                <button onClick={() => { setIsEditing(false); setEditingMovement(null); }} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleEditMovement} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* التاريخ */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'التاريخ' : 'Date'}</label>
                    <input
                      required
                      type="date"
                      value={editingMovement.date || ''}
                      onChange={(e) => setEditingMovement({ ...editingMovement, date: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  {/* الحركة */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'الحركة' : 'Movement'}</label>
                    <select
                      value={editingMovement.movementType || 'استلام'}
                      onChange={(e) => setEditingMovement({ ...editingMovement, movementType: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm text-zinc-900 dark:text-white"
                    >
                      <option value="استلام">{lang === 'ar' ? 'استلام (توريد)' : 'Receipt'}</option>
                      <option value="صرف">{lang === 'ar' ? 'صرف' : 'Issue'}</option>
                    </select>
                  </div>

                  {/* رقم الحركة */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'رقم الحركة' : 'Movement Number'}</label>
                    <input
                      type="text"
                      value={editingMovement.movementNumber || ''}
                      onChange={(e) => setEditingMovement({ ...editingMovement, movementNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder={lang === 'ar' ? 'رقم الحركة' : 'Movement number'}
                    />
                  </div>

                  {/* رقم البوست */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'رقم البوست' : 'Post Number'}</label>
                    <input
                      type="text"
                      value={editingMovement.postNumber || ''}
                      onChange={(e) => setEditingMovement({ ...editingMovement, postNumber: e.target.value, poNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder={lang === 'ar' ? 'رقم البوست' : 'Post number'}
                    />
                  </div>

                  {/* رقم الساب */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'رقم الساب' : 'SAP Number'}</label>
                    <input
                      type="text"
                      value={editingMovement.sapNumber || ''}
                      onChange={(e) => setEditingMovement({ ...editingMovement, sapNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder={lang === 'ar' ? 'رقم الساب' : 'SAP number'}
                    />
                  </div>

                  {/* المورد */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'المورد *' : 'Supplier *'}</label>
                    <input
                      required
                      type="text"
                      value={editingMovement.clientName}
                      onChange={(e) => setEditingMovement({ ...editingMovement, clientName: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  {/* اذن تسليم المورد */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'اذن تسليم المورد' : 'Supplier Delivery Permit'}</label>
                    <input
                      type="text"
                      value={editingMovement.deliveryNote || ''}
                      onChange={(e) => setEditingMovement({ ...editingMovement, deliveryNote: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  {/* الكود */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'الكود' : 'Code'}</label>
                    <input
                      type="text"
                      value={editingMovement.materialCode || ''}
                      onChange={(e) => setEditingMovement({ ...editingMovement, materialCode: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  {/* الصنف */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'الصنف *' : 'Item *'}</label>
                    <input
                      required
                      type="text"
                      value={editingMovement.itemName}
                      onChange={(e) => setEditingMovement({ ...editingMovement, itemName: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  {/* الحجم */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'الحجم' : 'Size'}</label>
                    <input
                      type="text"
                      value={editingMovement.size || ''}
                      onChange={(e) => setEditingMovement({ ...editingMovement, size: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  {/* الباتش */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'الباتش' : 'Batch'}</label>
                    <input
                      type="text"
                      value={editingMovement.batch || ''}
                      onChange={(e) => setEditingMovement({ ...editingMovement, batch: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  {/* الكمية */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'الكمية' : 'Quantity'}</label>
                    <input
                      type="number"
                      step="any"
                      value={editingMovement.quantity || ''}
                      onChange={(e) => setEditingMovement({ ...editingMovement, quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  {/* الوحدة */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'الوحدة' : 'Unit'}</label>
                    <select
                      value={editingMovement.unit || 'كجم'}
                      onChange={(e) => setEditingMovement({ ...editingMovement, unit: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm text-zinc-900 dark:text-white"
                    >
                      <option value="كجم">{lang === 'ar' ? 'كيلوجرام (كجم)' : 'Kilogram'}</option>
                      <option value="طن">{lang === 'ar' ? 'طن' : 'Ton'}</option>
                      <option value="لتر">{lang === 'ar' ? 'لتر' : 'Liter'}</option>
                      <option value="برميل">{lang === 'ar' ? 'برميل' : 'Barrel'}</option>
                      <option value="كرتونة">{lang === 'ar' ? 'كرتونة' : 'Carton'}</option>
                    </select>
                  </div>

                  {/* اسم السائق */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'اسم السائق *' : 'Driver Name *'}</label>
                    <input
                      required
                      type="text"
                      value={editingMovement.driverName}
                      onChange={(e) => setEditingMovement({ ...editingMovement, driverName: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  {/* رقم السيارة */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'رقم السيارة *' : 'Vehicle Number *'}</label>
                    <input
                      required
                      type="text"
                      value={editingMovement.vehicleNumber}
                      onChange={(e) => setEditingMovement({ ...editingMovement, vehicleNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>

                  {/* الحالة */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'الحالة' : 'Status'}</label>
                    <select
                      value={editingMovement.status}
                      onChange={(e) => setEditingMovement({ ...editingMovement, status: e.target.value as SupplyStatus })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm text-zinc-900 dark:text-white"
                    >
                      <option value="Security Entry">{lang === 'ar' ? 'دخول الأمن' : 'Security Entry'}</option>
                      <option value="Quality Inspection">{lang === 'ar' ? 'فحص الجودة' : 'Quality Inspection'}</option>
                      <option value="Warehouse Unloading">{lang === 'ar' ? 'تفريغ المخزن' : 'Warehouse Unloading'}</option>
                      <option value="Security Exit">{lang === 'ar' ? 'خروج الأمن' : 'Security Exit'}</option>
                      <option value="Completed">{lang === 'ar' ? 'مكتمل' : 'Completed'}</option>
                    </select>
                  </div>

                  {/* ملاحظات */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</label>
                    <textarea
                      value={editingMovement.notes || ''}
                      onChange={(e) => setEditingMovement({ ...editingMovement, notes: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm min-h-[60px]"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => { setIsEditing(false); setEditingMovement(null); }}
                    className="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-xl font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
