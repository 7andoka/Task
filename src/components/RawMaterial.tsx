import React, { useState, useEffect } from 'react';
import { Package, Truck, History, Search, Filter, Plus, AlertCircle, CheckCircle2, ArrowDown, ArrowUp } from 'lucide-react';
import { Language, UserProfile, Barrel, BarrelMovement, BarrelType, BarrelOwnership } from '../types';
import { translations } from '../i18n';
import { collection, query, orderBy, onSnapshot, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../constants';
import { toast } from 'sonner';

interface RawMaterialProps {
  lang: Language;
  user: UserProfile;
}

export default function RawMaterial({ lang, user }: RawMaterialProps) {
  const t = translations[lang];
  const [movements, setMovements] = useState<BarrelMovement[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newMovement, setNewMovement] = useState<Omit<BarrelMovement, 'id' | 'createdAt' | 'lastUpdatedAt'>>({
    supplierId: 'جمال سالم',
    barrelType: 'سنابل',
    ownership: 'ملكي',
    location: 'Company',
    quantity: 0,
    itemName: '',
    barrelWeight: 0,
    driverName: '',
    vehicleNumber: '',
    movementType: 'Receipt',
    movementTime: new Date().toISOString(),
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.BARREL_MOVEMENTS), orderBy('movementTime', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setMovements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BarrelMovement)));
    });
    return unsub;
  }, []);

  const handleAddMovement = async () => {
    try {
      const location = newMovement.movementType === 'Receipt' ? 'Company' : 'Supplier';
      const movementData = { ...newMovement };
      if (movementData.movementType === 'Dispatch') {
        movementData.itemName = '';
        movementData.barrelWeight = 0;
      }
      await addDoc(collection(db, COLLECTIONS.BARREL_MOVEMENTS), {
        ...movementData,
        location,
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      });
      setIsAdding(false);
      toast.success(lang === 'ar' ? 'تم تسجيل الحركة بنجاح' : 'Movement recorded successfully');
    } catch (error) {
      toast.error(lang === 'ar' ? 'خطأ في تسجيل الحركة' : 'Error recording movement');
    }
  };

  const [editingMovement, setEditingMovement] = useState<BarrelMovement | null>(null);

  const handleDeleteMovement = async () => {
    if (!editingMovement) return;
    try {
      const docRef = doc(db, COLLECTIONS.BARREL_MOVEMENTS, editingMovement.id);
      await deleteDoc(docRef);
      setEditingMovement(null);
      toast.success(lang === 'ar' ? 'تم حذف الحركة بنجاح' : 'Movement deleted successfully');
    } catch (error) {
      toast.error(lang === 'ar' ? 'خطأ في حذف الحركة' : 'Error deleting movement');
    }
  };

  const handleUpdateMovement = async () => {
    if (!editingMovement) return;
    try {
      const { id, ...data } = editingMovement;
      const docRef = doc(db, COLLECTIONS.BARREL_MOVEMENTS, id);
      await updateDoc(docRef, { ...data, lastUpdatedAt: new Date().toISOString() });
      setEditingMovement(null);
      toast.success(lang === 'ar' ? 'تم تحديث الحركة بنجاح' : 'Movement updated successfully');
    } catch (error) {
      toast.error(lang === 'ar' ? 'خطأ في تحديث الحركة' : 'Error updating movement');
    }
  };

  // ... (inside render, in table)
  // {user.role === 'Admin' && (
  //   <button onClick={() => setEditingMovement(m)} className="text-blue-500 hover:text-blue-700">
  //     {t.edit}
  //   </button>
  // )}

  // ... (add edit modal)
  // {editingMovement && (
  //   <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
  //     <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl w-full max-w-md space-y-4">
  //       <h3 className="font-bold text-lg">{t.edit}</h3>
  //       <input type="number" value={editingMovement.quantity} onChange={e => setEditingMovement({...editingMovement, quantity: parseInt(e.target.value)})} className="w-full p-2 border rounded-lg" />
  //       <div className="flex gap-2">
  //         <button onClick={handleUpdateMovement} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg">{t.save}</button>
  //         <button onClick={() => setEditingMovement(null)} className="flex-1 py-2 bg-zinc-200 rounded-lg">{t.cancel}</button>
  //       </div>
  //     </div>
  //   </div>
  // )}

  const [filterType, setFilterType] = useState<'لدي المورد' | 'لدى الشركة' | null>(null);

  const calculateBalances = () => {
    let myBarrelsAtSupplier = 0;
    let supplierBarrelsAtCompany = 0;
    const barrelTypeDetails: { [key: string]: { myBarrelsAtSupplier: number, supplierBarrelsAtCompany: number } } = {
       "سنابل": { myBarrelsAtSupplier: 0, supplierBarrelsAtCompany: 0 },
       "البرتغاليه": { myBarrelsAtSupplier: 0, supplierBarrelsAtCompany: 0 },
       "وطنيه": { myBarrelsAtSupplier: 0, supplierBarrelsAtCompany: 0 }
    };

    movements.forEach(m => {
      if (!barrelTypeDetails[m.barrelType]) barrelTypeDetails[m.barrelType] = { myBarrelsAtSupplier: 0, supplierBarrelsAtCompany: 0 };
      
      if (m.ownership === 'ملكي') {
        if (m.location === 'Supplier') {
          const qty = m.movementType === 'Dispatch' ? m.quantity : -m.quantity;
          myBarrelsAtSupplier += qty;
          barrelTypeDetails[m.barrelType].myBarrelsAtSupplier += qty;
        }
      } else if (m.ownership === 'ملك المورد') {
        if (m.location === 'Company') {
          const qty = m.movementType === 'Receipt' ? m.quantity : -m.quantity;
          supplierBarrelsAtCompany += qty;
          barrelTypeDetails[m.barrelType].supplierBarrelsAtCompany += qty;
        }
      }
    });

    return { myBarrelsAtSupplier, supplierBarrelsAtCompany, barrelTypeDetails };
  };

  const { myBarrelsAtSupplier, supplierBarrelsAtCompany, barrelTypeDetails } = calculateBalances();
  
  const filteredMovements = filterType 
    ? movements.filter(m => {
        if (filterType === 'لدي المورد') return m.ownership === 'ملكي' && m.location === 'Supplier';
        if (filterType === 'لدى الشركة') return m.ownership === 'ملك المورد' && m.location === 'Company';
        return true;
      })
    : movements;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Package className="text-emerald-500" />
            {t.rawMaterial}
          </h1>
        </div>

        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus size={20} />
          {lang === 'ar' ? 'تسجيل حركة جديدة' : 'Register New Movement'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <h3 className="font-bold text-lg">{lang === 'ar' ? 'تسجيل حركة براميل' : 'Register Barrel Movement'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={newMovement.movementType} onChange={e => setNewMovement({...newMovement, movementType: e.target.value as any})} className="p-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white [&>option]:text-zinc-900 [&>option]:bg-white dark:[&>option]:text-white dark:[&>option]:bg-zinc-800">
              <option value="Receipt">{lang === 'ar' ? 'استلام' : 'Receipt'}</option>
              <option value="Dispatch">{lang === 'ar' ? 'صرف براميل فارغة' : 'Empty Barrel Dispatch'}</option>
            </select>
            {newMovement.movementType !== 'Dispatch' && (
              <>
                <input type="text" placeholder={lang === 'ar' ? 'اسم الصنف' : 'Item Name'} value={newMovement.itemName} onChange={e => setNewMovement({...newMovement, itemName: e.target.value})} className="p-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white" />
                <input type="number" placeholder={lang === 'ar' ? 'وزن البرميل' : 'Barrel Weight'} value={newMovement.barrelWeight || ''} onChange={e => setNewMovement({...newMovement, barrelWeight: parseInt(e.target.value) || 0})} className="p-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white" />
                <div className="p-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                  <span>{lang === 'ar' ? 'إجمالي الوزن:' : 'Total Weight:'}</span>
                  <span className="font-bold text-emerald-500">{(newMovement.quantity * newMovement.barrelWeight).toLocaleString()}</span>
                </div>
              </>
            )}
            <input type="number" placeholder={lang === 'ar' ? 'العدد' : 'Quantity'} value={newMovement.quantity || ''} onChange={e => setNewMovement({...newMovement, quantity: parseInt(e.target.value) || 0})} className="p-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white" />
            <select value={newMovement.barrelType} onChange={e => setNewMovement({...newMovement, barrelType: e.target.value as any})} className="p-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white [&>option]:text-zinc-900 [&>option]:bg-white dark:[&>option]:text-white dark:[&>option]:bg-zinc-800">
              <option value="سنابل">سنابل</option>
              <option value="البرتغاليه">البرتغاليه</option>
              <option value="وطنيه">وطنيه</option>
            </select>
            <select value={newMovement.ownership} onChange={e => setNewMovement({...newMovement, ownership: e.target.value as any})} className="p-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white [&>option]:text-zinc-900 [&>option]:bg-white dark:[&>option]:text-white dark:[&>option]:bg-zinc-800">
              <option value="ملكي">{lang === 'ar' ? 'ملكي' : 'Company Owned'}</option>
              <option value="ملك المورد">{lang === 'ar' ? 'ملك المورد' : 'Supplier Owned'}</option>
            </select>
            <input type="text" placeholder={lang === 'ar' ? 'اسم السائق' : 'Driver Name'} value={newMovement.driverName} onChange={e => setNewMovement({...newMovement, driverName: e.target.value})} className="p-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white" />
            <input type="text" placeholder={lang === 'ar' ? 'رقم السيارة' : 'Vehicle Number'} value={newMovement.vehicleNumber} onChange={e => setNewMovement({...newMovement, vehicleNumber: e.target.value})} className="p-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white" />
          </div>
          <button onClick={handleAddMovement} className="w-full py-2 bg-emerald-500 text-white rounded-lg font-bold">{lang === 'ar' ? 'حفظ' : 'Save'}</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div 
          onClick={() => setFilterType(filterType === 'لدي المورد' ? null : 'لدي المورد')}
          className={`cursor-pointer bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm ${filterType === 'لدي المورد' ? 'ring-2 ring-emerald-500' : ''}`}
        >
          <h3 className="font-bold text-zinc-900 dark:text-white mb-1 text-sm">{lang === 'ar' ? 'ملكي لدى المورد' : 'My Barrels @ Supplier'}</h3>
          <p className="text-xl font-black text-emerald-500">{myBarrelsAtSupplier}</p>
          {filterType === 'لدي المورد' && (
            <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[10px] space-y-0.5">
              {Object.entries(barrelTypeDetails).map(([type, details]) => (
                <div key={type} className="flex justify-between">
                  <span>{type}</span>
                  <span className="font-bold">{details.myBarrelsAtSupplier}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div 
          onClick={() => setFilterType(filterType === 'لدى الشركة' ? null : 'لدى الشركة')}
          className={`cursor-pointer bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm ${filterType === 'لدى الشركة' ? 'ring-2 ring-blue-500' : ''}`}
        >
          <h3 className="font-bold text-zinc-900 dark:text-white mb-1 text-sm">{lang === 'ar' ? 'براميل المورد لدي' : 'Supplier Barrels @ Company'}</h3>
          <p className="text-xl font-black text-blue-500">{supplierBarrelsAtCompany}</p>
          {filterType === 'لدى الشركة' && (
            <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[10px] space-y-0.5">
              {Object.entries(barrelTypeDetails).map(([type, details]) => (
                <div key={type} className="flex justify-between">
                  <span>{type}</span>
                  <span className="font-bold">{details.supplierBarrelsAtCompany}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <h3 className="font-bold text-zinc-900 dark:text-white">{filterType ? `${lang === 'ar' ? 'سجل الحركات المفلترة:' : 'Filtered Movement Logs:'} ${filterType}` : (lang === 'ar' ? 'سجل الحركات' : 'Movement Logs')}</h3>
          {filterType && (
            <button onClick={() => setFilterType(null)} className="text-sm text-red-500 underline">{lang === 'ar' ? 'إلغاء التصفية' : 'Clear Filter'}</button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-100 dark:bg-zinc-800">
              <tr>
                <th className="p-3">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                <th className="p-3">{lang === 'ar' ? 'الموقع' : 'Location'}</th>
                <th className="p-3">{lang === 'ar' ? 'البرميل' : 'Barrel'}</th>
                <th className="p-3">{lang === 'ar' ? 'الملكية' : 'Ownership'}</th>
                <th className="p-3">{lang === 'ar' ? 'العدد' : 'Quantity'}</th>
                <th className="p-3">{lang === 'ar' ? 'اسم الصنف' : 'Item'}</th>
                <th className="p-3">{lang === 'ar' ? 'الوزن' : 'Weight'}</th>
                <th className="p-3">{lang === 'ar' ? 'إجمالي الوزن' : 'Total Weight'}</th>
                <th className="p-3">{lang === 'ar' ? 'السائق' : 'Driver'}</th>
                <th className="p-3">{lang === 'ar' ? 'السيارة' : 'Vehicle'}</th>
                <th className="p-3">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map(m => (
                <tr key={m.id} className="border-b dark:border-zinc-800">
                  <td className="p-3">{m.movementType === 'Receipt' ? <ArrowDown className="text-emerald-500" size={16}/> : <ArrowUp className="text-red-500" size={16}/>}</td>
                  <td className="p-3">{m.location}</td>
                  <td className="p-3">{m.barrelType}</td>
                  <td className="p-3">{m.ownership}</td>
                  <td className="p-3">{m.quantity}</td>
                  <td className="p-3">{m.itemName}</td>
                  <td className="p-3">{m.barrelWeight}</td>
                  <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{(m.quantity * m.barrelWeight).toLocaleString()}</td>
                  <td className="p-3">{m.driverName}</td>
                  <td className="p-3">{m.vehicleNumber}</td>
                  <td className="p-3">{new Date(m.movementTime).toLocaleDateString()}</td>
                  {user.role === 'Admin' && (
                    <td className="p-3">
                      <button onClick={() => setEditingMovement(m)} className="text-blue-500 hover:text-blue-700">
                        {t.edit}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {editingMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl w-full max-w-md space-y-4">
            <h3 className="font-bold text-lg">{t.edit}</h3>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">{lang === 'ar' ? 'العدد' : 'Quantity'}</label>
              <input type="number" value={editingMovement.quantity || ''} onChange={e => setEditingMovement({...editingMovement, quantity: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">{lang === 'ar' ? 'وزن البرميل' : 'Barrel Weight'}</label>
              <input type="number" value={editingMovement.barrelWeight || ''} onChange={e => setEditingMovement({...editingMovement, barrelWeight: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white" />
            </div>
            <div className="p-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
              <span>{lang === 'ar' ? 'إجمالي الوزن:' : 'Total Weight:'}</span>
              <span className="font-bold text-emerald-500">{(editingMovement.quantity * editingMovement.barrelWeight).toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleUpdateMovement} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg">{t.save}</button>
              <button onClick={handleDeleteMovement} className="flex-1 py-2 bg-red-500 text-white rounded-lg">{lang === 'ar' ? 'حذف' : 'Delete'}</button>
              <button onClick={() => setEditingMovement(null)} className="flex-1 py-2 bg-zinc-200 rounded-lg">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
