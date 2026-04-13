import React, { useState, useEffect } from 'react';
import { Package, Truck, History, Search, Filter, Plus, AlertCircle, CheckCircle2, ArrowDown, ArrowUp } from 'lucide-react';
import { Language, UserProfile, Barrel, BarrelMovement, BarrelType, BarrelOwnership } from '../types';
import { translations } from '../i18n';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
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

  const calculateBalances = () => {
    let myBarrelsAtSupplier = 0;
    let supplierBarrelsAtCompany = 0;

    movements.forEach(m => {
      if (m.ownership === 'ملكي') {
        if (m.location === 'Supplier') {
          myBarrelsAtSupplier += m.movementType === 'Dispatch' ? m.quantity : -m.quantity;
        }
      } else if (m.ownership === 'ملك المورد') {
        if (m.location === 'Company') {
          supplierBarrelsAtCompany += m.movementType === 'Receipt' ? m.quantity : -m.quantity;
        }
      }
    });

    return { myBarrelsAtSupplier, supplierBarrelsAtCompany };
  };

  const balances = calculateBalances();

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
            <select value={newMovement.movementType} onChange={e => setNewMovement({...newMovement, movementType: e.target.value as any})} className="p-2 border rounded-lg">
              <option value="Receipt">{lang === 'ar' ? 'استلام' : 'Receipt'}</option>
              <option value="Dispatch">{lang === 'ar' ? 'صرف' : 'Dispatch'}</option>
            </select>
            <select value={newMovement.barrelType} onChange={e => setNewMovement({...newMovement, barrelType: e.target.value as any})} className="p-2 border rounded-lg">
              <option value="سنابل">سنابل</option>
              <option value="البرتغاليه">البرتغاليه</option>
              <option value="وطنيه">وطنيه</option>
            </select>
            <select value={newMovement.ownership} onChange={e => setNewMovement({...newMovement, ownership: e.target.value as any})} className="p-2 border rounded-lg">
              <option value="ملكي">{lang === 'ar' ? 'ملكي' : 'Company Owned'}</option>
              <option value="ملك المورد">{lang === 'ar' ? 'ملك المورد' : 'Supplier Owned'}</option>
            </select>
            <input type="number" placeholder={lang === 'ar' ? 'العدد' : 'Quantity'} value={newMovement.quantity || ''} onChange={e => setNewMovement({...newMovement, quantity: parseInt(e.target.value) || 0})} className="p-2 border rounded-lg" />
          </div>
          <button onClick={handleAddMovement} className="w-full py-2 bg-emerald-500 text-white rounded-lg font-bold">{lang === 'ar' ? 'حفظ' : 'Save'}</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="font-bold text-zinc-900 dark:text-white mb-2">{lang === 'ar' ? 'براميل ملكي لدي المورد' : 'My Barrels at Supplier'}</h3>
          <p className="text-2xl font-black text-emerald-500">{balances.myBarrelsAtSupplier}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="font-bold text-zinc-900 dark:text-white mb-2">{lang === 'ar' ? 'براميل المورد لدي' : 'Supplier Barrels at Company'}</h3>
          <p className="text-2xl font-black text-blue-500">{balances.supplierBarrelsAtCompany}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <h3 className="font-bold text-zinc-900 dark:text-white">{lang === 'ar' ? 'سجل الحركات' : 'Movement Logs'}</h3>
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
                <th className="p-3">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id} className="border-b dark:border-zinc-800">
                  <td className="p-3">{m.movementType === 'Receipt' ? <ArrowDown className="text-emerald-500" size={16}/> : <ArrowUp className="text-red-500" size={16}/>}</td>
                  <td className="p-3">{m.location}</td>
                  <td className="p-3">{m.barrelType}</td>
                  <td className="p-3">{m.ownership}</td>
                  <td className="p-3">{m.quantity}</td>
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
            <input type="number" value={editingMovement.quantity || ''} onChange={e => setEditingMovement({...editingMovement, quantity: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded-lg" />
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
