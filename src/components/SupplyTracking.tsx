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
  Camera
} from 'lucide-react';
import { SupplyMovement, UserProfile, Language, SupplyStatus, QualityDecision } from '../types';
import { storageService } from '../services/storageService';
import { translations } from '../i18n';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { toast } from 'sonner';

interface SupplyTrackingProps {
  lang: Language;
  user: UserProfile;
  allUsers: UserProfile[];
}

export default function SupplyTracking({ lang, user, allUsers }: SupplyTrackingProps) {
  const t = translations[lang];
  const [movements, setMovements] = useState<SupplyMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingMovement, setEditingMovement] = useState<SupplyMovement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<SupplyStatus | 'All'>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state for new movement (Security)
  const [newMovement, setNewMovement] = useState({
    clientName: '',
    itemName: '',
    driverName: '',
    vehicleNumber: '',
  });

  useEffect(() => {
    const fetchMovements = async () => {
      try {
        const data = await storageService.getSupplyMovements();
        setMovements(data);
      } catch (error) {
        console.error("Error fetching supply movements:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovements();
  }, []);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/LD2Puiu3KEv1qZx0LmiB70';

  const shareToWhatsApp = (movement: SupplyMovement, action: string) => {
    const message = `
*حركة توريد جديدة*
العميل: ${movement.clientName}
الصنف: ${movement.itemName}
السائق: ${movement.driverName}
رقم السيارة: ${movement.vehicleNumber}
الحالة: ${getStatusLabel(movement.status)}
الإجراء: ${action}
التوقيت: ${format(new Date(), 'p - dd/MM/yyyy', { locale: lang === 'ar' ? ar : enUS })}
    `.trim();

    navigator.clipboard.writeText(message);
    toast.success(lang === 'ar' ? 'تم نسخ تفاصيل الحركة، يرجى لصقها في واتساب' : 'Movement details copied, please paste in WhatsApp');
    
    // Clear temporary image after sharing
    setSelectedImage(null);
    
    window.open(WHATSAPP_GROUP_URL, '_blank');
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
      status: 'Quality Inspection',
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };

    try {
      await storageService.saveSupplyMovement(movement);
      setMovements([movement, ...movements]);
      setIsAdding(false);
      setNewMovement({ clientName: '', itemName: '', driverName: '', vehicleNumber: '' });
      toast.success(lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Entry recorded successfully');
      shareToWhatsApp(movement, lang === 'ar' ? 'تسجيل دخول' : 'Entry');
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
    const updatedMovement = {
      ...movement,
      ...updates,
      status: nextStatus,
      lastUpdatedAt: new Date().toISOString(),
    };

    try {
      await storageService.saveSupplyMovement(updatedMovement);
      setMovements(movements.map(m => m.id === movement.id ? updatedMovement : m));
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

  const filteredMovements = movements.filter(m => {
    const matchesSearch = 
      m.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.driverName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || m.status === filterStatus;
    return matchesSearch && matchesFilter;
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
      case 'Security Entry': return t.status_security_entry;
      case 'Quality Inspection': return t.status_quality_inspection;
      case 'Warehouse Unloading': return t.status_warehouse_unloading;
      case 'Security Exit': return t.status_security_exit;
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

        {user.role === 'Security' || user.role === 'Admin' ? (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus size={20} />
            {lang === 'ar' ? 'تسجيل دخول سيارة' : 'Register Vehicle Entry'}
          </button>
        ) : null}
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
        <div className="relative">
          <Filter className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-400`} size={20} />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none transition-all`}
          >
            <option value="All">{lang === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
            <option value="Quality Inspection">{t.status_quality_inspection}</option>
            <option value="Warehouse Unloading">{t.status_warehouse_unloading}</option>
            <option value="Security Exit">{t.status_security_exit}</option>
            <option value="Completed">{t.status_completed}</option>
          </select>
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
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 md:p-3 shadow-sm hover:shadow-md transition-all cursor-pointer"
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
                  {/* Camera Input */}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageChange}
                      className="hidden"
                      id={`camera-${movement.id}`}
                    />
                    <label
                      htmlFor={`camera-${movement.id}`}
                      className={`flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-all ${selectedImage ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'}`}
                    >
                      <Camera size={20} />
                    </label>
                  </div>

                  {/* Quality Actions */}
                  {movement.status === 'Quality Inspection' && (user.role === 'Quality' || user.role === 'Admin') && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(movement, 'Warehouse Unloading', { 
                          qualityDecision: 'Accepted', 
                          qualityInspectorId: user.uid,
                          qualityTime: new Date().toISOString()
                        })}}
                        className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all"
                      >
                        {t.accepted}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(movement, 'Quality Inspection', { 
                          qualityDecision: 'Under Inspection', 
                          qualityInspectorId: user.uid,
                          qualityTime: new Date().toISOString()
                        })}}
                        className="flex-1 sm:flex-none px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 transition-all"
                      >
                        {t.underInspection}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(movement, 'Completed', { 
                          qualityDecision: 'Rejected', 
                          qualityInspectorId: user.uid,
                          qualityTime: new Date().toISOString()
                        })}}
                        className="flex-1 sm:flex-none px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all"
                      >
                        {t.rejected}
                      </button>
                    </div>
                  )}

                  {/* Warehouse Actions */}
                  {movement.status === 'Warehouse Unloading' && (user.role === 'Warehouse' || user.role === 'Admin') && (
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

                  {/* Security Exit Actions */}
                  {movement.status === 'Security Exit' && (user.role === 'Security' || user.role === 'Admin') && (
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                    {user.role === 'Admin' && (
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{lang === 'ar' ? 'تسجيل دخول سيارة' : 'Register Vehicle Entry'}</h2>
                <button onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleAddMovement} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.clientName}</label>
                  <input
                    required
                    type="text"
                    value={newMovement.clientName}
                    onChange={(e) => setNewMovement({ ...newMovement, clientName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.itemName}</label>
                  <input
                    required
                    type="text"
                    value={newMovement.itemName}
                    onChange={(e) => setNewMovement({ ...newMovement, itemName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.driverName}</label>
                    <input
                      required
                      type="text"
                      value={newMovement.driverName}
                      onChange={(e) => setNewMovement({ ...newMovement, driverName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.vehicleNumber}</label>
                    <input
                      required
                      type="text"
                      value={newMovement.vehicleNumber}
                      onChange={(e) => setNewMovement({ ...newMovement, vehicleNumber: e.target.value })}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsEditing(false); setEditingMovement(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{lang === 'ar' ? 'تعديل حركة التوريد' : 'Edit Supply Movement'}</h2>
                <button onClick={() => { setIsEditing(false); setEditingMovement(null); }} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleEditMovement} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.clientName}</label>
                  <input
                    required
                    type="text"
                    value={editingMovement.clientName}
                    onChange={(e) => setEditingMovement({ ...editingMovement, clientName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.itemName}</label>
                  <input
                    required
                    type="text"
                    value={editingMovement.itemName}
                    onChange={(e) => setEditingMovement({ ...editingMovement, itemName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.driverName}</label>
                    <input
                      required
                      type="text"
                      value={editingMovement.driverName}
                      onChange={(e) => setEditingMovement({ ...editingMovement, driverName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.vehicleNumber}</label>
                    <input
                      required
                      type="text"
                      value={editingMovement.vehicleNumber}
                      onChange={(e) => setEditingMovement({ ...editingMovement, vehicleNumber: e.target.value })}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
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
