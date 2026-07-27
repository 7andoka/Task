import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sprout,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Calendar,
  FileDown,
  FileUp,
  Download,
  Check,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  FileText,
  Trash,
  RefreshCw
} from 'lucide-react';
import { Language, UserProfile, AgriRawMaterial } from '../types';
import { translations } from '../i18n';
import { collection, query, orderBy, onSnapshot, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../constants';
import { storageService } from '../services/storageService';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface AgriRawMaterialProps {
  lang: Language;
  user: UserProfile;
}

export default function AgriRawMaterialPage({ lang, user }: AgriRawMaterialProps) {
  const isRtl = lang === 'ar';
  const t = translations[lang];

  // Role checking
  const hasRole = (rolesToCheck: string | string[]) => {
    const userRoles = user?.roles || (user?.role ? [user.role] : []);
    if (Array.isArray(rolesToCheck)) {
      return rolesToCheck.some(r => userRoles.includes(r as any));
    }
    return userRoles.includes(rolesToCheck as any);
  };

  const canEditOrDelete = hasRole(['Admin', 'Warehouse Manager', 'Department Head', 'Supervisor']);

  // Real-time State
  const [materials, setMaterials] = useState<AgriRawMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('All');
  const [filterType, setFilterType] = useState('All'); // 'All' | 'إضافة' | 'صرف'
  const [filterDate, setFilterDate] = useState('');
  const [filterItemName, setFilterItemName] = useState('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInlineAdding, setIsInlineAdding] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Partial<AgriRawMaterial>>({
    date: new Date().toISOString().slice(0, 10),
    movementType: 'إضافة',
    movementNumber: '',
    supplier: '',
    sapNumber: '',
    postNumber: '',
    deliveryNote: '',
    materialCode: '',
    itemName: '',
    size: '',
    batch: '',
    quantity: 0,
    unit: 'كجم',
    driverName: '',
    vehicleNumber: '',
    notes: '',
  });

  // Validation & Error States
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Confirmation Modals
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  // Hidden File Input Ref for Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync from Google Sheet CSV URL
  const handleSyncGoogleSheet = async () => {
    setIsSyncing(true);
    try {
      const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRFNg5YPWFp7SpmNAN5QLaePz-Jbs1IopAaTSTHrAmWENDODzLTu2BJEA0L5cuhZnxgpTmxKQsV65Oj/pub?gid=1406823805&single=true&output=csv";
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const csvText = await response.text();

      const workbook = XLSX.read(csvText, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonData.length === 0) {
        toast.error(isRtl ? 'ملف Google Sheet فارغ' : 'Google Sheet is empty');
        setIsSyncing(false);
        return;
      }

      let importedCount = 0;
      let skippedDuplicateCount = 0;
      let validationFailedCount = 0;

      const norm = (val: any) => String(val !== undefined && val !== null ? val : '').trim();

      const activeKeys = new Set(
        materials.map(m => 
          `${norm(m.date)}_${norm(m.movementType)}_${norm(m.movementNumber)}_${norm(m.supplier)}_${norm(m.sapNumber)}_${norm(m.postNumber)}_${norm(m.deliveryNote)}_${norm(m.materialCode)}_${norm(m.itemName)}_${norm(m.size)}_${norm(m.batch)}_${Number(m.quantity)}_${norm(m.unit)}_${norm(m.driverName)}_${norm(m.vehicleNumber)}_${norm(m.notes)}`
        )
      );

      for (const row of jsonData) {
        let rawDate = row['التاريخ'] || row['Date'] || row['date'] || Object.values(row)[0];
        let date = '';
        if (rawDate !== undefined && rawDate !== null) {
          const strDate = String(rawDate).trim();
          if (strDate) {
            date = strDate;
          }
        }
        if (!date) {
          date = new Date().toISOString().slice(0, 10);
        }

        let movementType = String(row['الحركة'] || row['Movement Type'] || row['movementType'] || 'إضافة').trim();
        let movementNumber = String(row['رقم الحركة'] || row['Movement Number'] || row['movementNumber'] || '').trim();
        let supplier = String(row['المورد'] || row['Supplier'] || row['supplier'] || '').trim();
        let sapNumber = String(row['رقم الساب'] || row['SAP Number'] || row['sapNumber'] || '').trim();
        let postNumber = String(row['رقم البوست'] || row['Post Number'] || row['postNumber'] || '').trim();
        let deliveryNote = String(row['إذن تسليم المورد'] || row['Supplier Delivery Note'] || row['deliveryNote'] || '').trim();
        let materialCode = String(row['الكود'] || row['Code'] || row['materialCode'] || '').trim();
        let itemName = String(row['الصنف'] || row['Item Name'] || row['itemName'] || '').trim();
        let size = String(row['الحجم'] || row['Size'] || row['size'] || '').trim();
        let batch = String(row['الباتش'] || row['Batch'] || row['batch'] || '').trim();
        const rawQuantity = row['الكمية'] || row['Quantity'] || row['quantity'];
        const quantity = Number(rawQuantity !== undefined && rawQuantity !== null ? rawQuantity : 0);
        let unit = String(row['الوحدة'] || row['Unit'] || row['unit'] || 'كجم').trim();
        let driverName = String(row['اسم السائق'] || row['Driver Name'] || row['driverName'] || '').trim();
        let vehicleNumber = String(row['رقم السيارة'] || row['Vehicle Number'] || row['vehicleNumber'] || '').trim();
        let notes = String(row['ملاحظات'] || row['Notes'] || row['notes'] || '').trim();

        const hasAnyContent = (itemName !== '' || materialCode !== '' || movementNumber !== '' || supplier !== '' || batch !== '');
        if (!hasAnyContent && (isNaN(quantity) || quantity <= 0)) {
          continue;
        }

        if (isNaN(quantity) || quantity <= 0 || (itemName === '' && materialCode === '')) {
          validationFailedCount++;
          continue;
        }

        if (!movementNumber) movementNumber = '-';
        if (!supplier) supplier = '-';
        if (!batch) batch = '-';
        if (!unit) unit = 'كجم';

        const normalizedType = (movementType.includes('صرف') || movementType.toLowerCase().includes('disp') || movementType.toLowerCase().includes('out')) ? 'صرف' : 'إضافة';

        const uniqueKey = `${norm(date)}_${norm(normalizedType)}_${norm(movementNumber)}_${norm(supplier)}_${norm(sapNumber)}_${norm(postNumber)}_${norm(deliveryNote)}_${norm(materialCode)}_${norm(itemName)}_${norm(size)}_${norm(batch)}_${Number(quantity)}_${norm(unit)}_${norm(driverName)}_${norm(vehicleNumber)}_${norm(notes)}`;

        let isDuplicate = false;
        if (activeKeys.has(uniqueKey)) {
          isDuplicate = true;
          skippedDuplicateCount++;
        } else {
          activeKeys.add(uniqueKey);
        }

        let finalNotes = notes;
        if (isDuplicate) {
          finalNotes = notes ? `[مكرر] ${notes}` : 'مكرر';
        }

        const record: AgriRawMaterial = {
          id: crypto.randomUUID(),
          date,
          movementType: normalizedType,
          movementNumber,
          supplier,
          sapNumber,
          postNumber,
          deliveryNote,
          materialCode,
          itemName,
          size,
          batch,
          quantity,
          unit,
          driverName,
          vehicleNumber,
          notes: finalNotes,
          isDuplicate,
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString()
        };

        await storageService.saveAgriRawMaterial(record);
        importedCount++;
      }

      toast.success(
        isRtl 
          ? `تمت مزامنة Google Sheet بنجاح! تم استيراد ${importedCount} سجل (مكرر: ${skippedDuplicateCount}, تخطي غير صالح: ${validationFailedCount})`
          : `Google Sheet synced successfully! Imported ${importedCount} records (duplicates: ${skippedDuplicateCount}, invalid skipped: ${validationFailedCount})`
      );
    } catch (error) {
      console.error('Error syncing Google Sheet:', error);
      toast.error(isRtl ? 'حدث خطأ أثناء مزامنة Google Sheet (تأكد من إتاحة النشر العلني للرابط)' : 'Error syncing Google Sheet (Ensure public CSV publish is enabled)');
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch Materials on Mount
  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.AGRI_RAW_MATERIAL),
      orderBy('date', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AgriRawMaterial));
      setMaterials(list);
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to agri raw materials:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Filter unique suppliers for the filter dropdown
  const uniqueSuppliers = Array.from(new Set(materials.map(m => m.supplier).filter(Boolean)));

  // Filter unique item names for the filter dropdown
  const uniqueItemNames = Array.from(new Set(materials.map(m => m.itemName).filter(Boolean)));

  // Filter and Search Logic
  const filteredMaterials = materials.filter(item => {
    // Search Term Filter
    const matchesSearch = searchTerm ? (
      (item.materialCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.itemName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.supplier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.batch || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.movementNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.vehicleNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    ) : true;

    // Supplier Filter
    const matchesSupplier = filterSupplier === 'All' ? true : item.supplier === filterSupplier;

    // Item Name Filter
    const matchesItemName = filterItemName === 'All' ? true : item.itemName === filterItemName;

    // Movement Type Filter
    const matchesType = filterType === 'All' ? true : item.movementType === filterType;

    // Date Filter
    const matchesDate = filterDate ? item.date === filterDate : true;

    return matchesSearch && matchesSupplier && matchesItemName && matchesType && matchesDate;
  });

  // Single-page list with scrollbar - currentItems contains all filtered materials
  const currentItems = filteredMaterials;
  const totalPages = 1;

  // Aggregate stats
  const totalQuantity = filteredMaterials.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const addedCount = filteredMaterials.filter(m => m.movementType === 'إضافة').length;
  const dispatchCount = filteredMaterials.filter(m => m.movementType === 'صرف').length;

  // Input Field validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.date) errors.date = isRtl ? 'حقل التاريخ مطلوب' : 'Date is required';
    if (!formData.movementType) errors.movementType = isRtl ? 'حقل الحركة مطلوب' : 'Movement type is required';
    if (!formData.movementNumber?.trim()) errors.movementNumber = isRtl ? 'حقل رقم الحركة مطلوب' : 'Movement number is required';
    if (!formData.supplier?.trim()) errors.supplier = isRtl ? 'حقل المورد مطلوب' : 'Supplier is required';
    if (!formData.materialCode?.trim()) errors.materialCode = isRtl ? 'حقل الكود مطلوب' : 'Code is required';
    if (!formData.itemName?.trim()) errors.itemName = isRtl ? 'حقل الصنف مطلوب' : 'Item name is required';
    if (!formData.batch?.trim()) errors.batch = isRtl ? 'حقل الباتش مطلوب' : 'Batch is required';
    if (!formData.unit?.trim()) errors.unit = isRtl ? 'حقل الوحدة مطلوب' : 'Unit is required';

    const qty = Number(formData.quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.quantity = isRtl ? 'يجب أن تكون الكمية أكبر من الصفر' : 'Quantity must be greater than zero';
    }

    // Duplication Check (Rule 12): movementNumber + materialCode + batch
    if (formData.movementNumber && formData.materialCode && formData.batch) {
      const isDuplicate = materials.some(item => 
        item.id !== formData.id && 
        item.movementNumber.trim() === formData.movementNumber?.trim() &&
        item.materialCode.trim() === formData.materialCode?.trim() &&
        item.batch.trim() === formData.batch?.trim()
      );

      if (isDuplicate) {
        const dupMessage = isRtl 
          ? 'السجل مكرر بالفعل (يتطابق رقم الحركة + الكود + الباتش مع سجل موجود)' 
          : 'Duplicate record (Movement Number + Code + Batch matches an existing record)';
        errors.duplicate = dupMessage;
        toast.error(dupMessage);
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open Create Modal (toggles inline horizontal bar and opens the modal dialog)
  const handleOpenCreate = () => {
    setIsInlineAdding(true);
    setModalMode('create');
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      movementType: 'إضافة',
      movementNumber: '',
      supplier: '',
      sapNumber: '',
      postNumber: '',
      deliveryNote: '',
      materialCode: '',
      itemName: '',
      size: '',
      batch: '',
      quantity: 0,
      unit: 'كجم',
      driverName: '',
      vehicleNumber: '',
      notes: '',
    });
    setValidationErrors({});
    setIsModalOpen(true);
    
    // Smooth scroll to the table/grid container to show the inline adding form row immediately
    setTimeout(() => {
      const container = document.getElementById('agri-raw-materials-table');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Inline Horizontal Save
  const handleInlineSave = async () => {
    if (!validateForm()) {
      // Find the first error to toast
      const firstErr = Object.values(validationErrors)[0] || (isRtl ? 'يرجى مراجعة وتعبئة الحقول المطلوبة' : 'Please check required fields');
      toast.error(firstErr);
      return;
    }

    try {
      const finalId = crypto.randomUUID();
      const recordToSave: AgriRawMaterial = {
        id: finalId,
        date: formData.date!,
        movementType: formData.movementType as 'إضافة' | 'صرف',
        movementNumber: formData.movementNumber!.trim(),
        supplier: formData.supplier!.trim(),
        sapNumber: (formData.sapNumber || '').trim(),
        postNumber: (formData.postNumber || '').trim(),
        deliveryNote: (formData.deliveryNote || '').trim(),
        materialCode: formData.materialCode!.trim(),
        itemName: formData.itemName!.trim(),
        size: (formData.size || '').trim(),
        batch: formData.batch!.trim(),
        quantity: Number(formData.quantity),
        unit: formData.unit!.trim(),
        driverName: (formData.driverName || '').trim(),
        vehicleNumber: (formData.vehicleNumber || '').trim(),
        notes: (formData.notes || '').trim(),
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };

      await storageService.saveAgriRawMaterial(recordToSave);
      
      toast.success(isRtl ? 'تمت إضافة الحركة الزراعية بنجاح' : 'Agricultural material movement added successfully');
      setIsInlineAdding(false);
      setFormData({
        date: new Date().toISOString().slice(0, 10),
        movementType: 'إضافة',
        movementNumber: '',
        supplier: '',
        sapNumber: '',
        postNumber: '',
        deliveryNote: '',
        materialCode: '',
        itemName: '',
        size: '',
        batch: '',
        quantity: 0,
        unit: 'كجم',
        driverName: '',
        vehicleNumber: '',
        notes: '',
      });
      setValidationErrors({});
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? 'حدث خطأ أثناء حفظ السجل' : 'Error saving record');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: AgriRawMaterial) => {
    setModalMode('edit');
    setFormData({ ...item });
    setValidationErrors({});
    setIsModalOpen(true);
  };

  // Save Record
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const finalId = modalMode === 'create' ? crypto.randomUUID() : formData.id!;
      const recordToSave: AgriRawMaterial = {
        id: finalId,
        date: formData.date!,
        movementType: formData.movementType as 'إضافة' | 'صرف',
        movementNumber: formData.movementNumber!.trim(),
        supplier: formData.supplier!.trim(),
        sapNumber: (formData.sapNumber || '').trim(),
        postNumber: (formData.postNumber || '').trim(),
        deliveryNote: (formData.deliveryNote || '').trim(),
        materialCode: formData.materialCode!.trim(),
        itemName: formData.itemName!.trim(),
        size: (formData.size || '').trim(),
        batch: formData.batch!.trim(),
        quantity: Number(formData.quantity),
        unit: formData.unit!.trim(),
        driverName: (formData.driverName || '').trim(),
        vehicleNumber: (formData.vehicleNumber || '').trim(),
        notes: (formData.notes || '').trim(),
        createdAt: formData.createdAt || new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };

      await storageService.saveAgriRawMaterial(recordToSave);
      
      toast.success(
        isRtl 
          ? (modalMode === 'create' ? 'تمت إضافة السجل بنجاح' : 'تم تحديث السجل بنجاح') 
          : (modalMode === 'create' ? 'Record added successfully' : 'Record updated successfully')
      );
      
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? 'حدث خطأ أثناء حفظ السجل' : 'Error saving record');
    }
  };

  // Delete Request
  const handleDeleteRequest = (id: string) => {
    setDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await storageService.deleteAgriRawMaterial(deleteId);
      toast.success(isRtl ? 'تم حذف السجل بنجاح' : 'Record deleted successfully');
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? 'حدث خطأ أثناء الحذف' : 'Error deleting record');
    } finally {
      setIsDeleteConfirmOpen(false);
      setDeleteId(null);
    }
  };

  // Bulk Delete Selected
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setLoading(true);
      await Promise.all(
        selectedIds.map(id => storageService.deleteAgriRawMaterial(id))
      );
      toast.success(
        isRtl 
          ? `تم حذف ${selectedIds.length} من السجلات بنجاح` 
          : `Successfully deleted ${selectedIds.length} records`
      );
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? 'حدث خطأ أثناء الحذف الجماعي' : 'Error during bulk deletion');
    } finally {
      setLoading(false);
      setIsBulkDeleteConfirmOpen(false);
    }
  };

  // Download Blank Excel Template
  const downloadExcelTemplate = () => {
    try {
      const headers = [
        'التاريخ', 'الحركة', 'رقم الحركة', 'المورد', 'رقم الساب', 'رقم البوست', 
        'إذن تسليم المورد', 'الكود', 'الصنف', 'الحجم', 'الباتش', 'الكمية', 
        'الوحدة', 'اسم السائق', 'رقم السيارة', 'ملاحظات'
      ];

      const demoRows = [
        [
          new Date().toISOString().slice(0, 10),
          'إضافة',
          'MOV-1001',
          'مورد خامات ممتاز',
          'SAP-100921',
          'PST-2003',
          'DEL-992',
          'MAT-AGRI-01',
          'زيتون تفاحي',
          'كبير جداً',
          'B-JUL26-01',
          1500,
          'كجم',
          'أحمد محمود الجمال',
          'أ ب ج 1234',
          'توريد عينة أولى ممتازة'
        ],
        [
          new Date().toISOString().slice(0, 10),
          'صرف',
          'MOV-1002',
          'مورد خامات ممتاز',
          '',
          '',
          '',
          'MAT-AGRI-01',
          'زيتون تفاحي',
          'كبير جداً',
          'B-JUL26-01',
          500,
          'كجم',
          'صابر عبد المولى',
          'س ص ع 5678',
          'صرف لخط الإنتاج الأول'
        ]
      ];

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...demoRows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'نموذج إدخال الحركات');
      
      XLSX.writeFile(workbook, `Agri_Raw_Material_Template.xlsx`);
      toast.success(isRtl ? 'تم تحميل نموذج Excel بنجاح' : 'Excel template downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? 'فشل تحميل النموذج' : 'Failed to download template');
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      const headers = isRtl ? [
        'التاريخ', 'الحركة', 'رقم الحركة', 'المورد', 'رقم الساب', 'رقم البوست', 
        'إذن تسليم المورد', 'الكود', 'الصنف', 'الحجم', 'الباتش', 'الكمية', 
        'الوحدة', 'اسم السائق', 'رقم السيارة', 'ملاحظات'
      ] : [
        'Date', 'Movement Type', 'Movement Number', 'Supplier', 'SAP Number', 'Post Number',
        'Supplier Delivery Note', 'Code', 'Item Name', 'Size', 'Batch', 'Quantity',
        'Unit', 'Driver Name', 'Vehicle Number', 'Notes'
      ];

      const rows = filteredMaterials.map(item => [
        item.date,
        item.movementType,
        item.movementNumber,
        item.supplier,
        item.sapNumber || '',
        item.postNumber || '',
        item.deliveryNote || '',
        item.materialCode,
        item.itemName,
        item.size || '',
        item.batch,
        item.quantity,
        item.unit,
        item.driverName || '',
        item.vehicleNumber || '',
        item.notes || ''
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, isRtl ? 'الخام الزراعي' : 'Agri Raw Materials');
      
      XLSX.writeFile(workbook, `Agricultural_Raw_Materials_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(isRtl ? 'تم تصدير ملف Excel بنجاح' : 'Excel file exported successfully');
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? 'خطأ في التصدير' : 'Export failed');
    }
  };

  // Export to PDF
  const exportToPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFont(isRtl ? 'Amiri' : 'helvetica');

      // Add main header
      doc.setFontSize(18);
      doc.text(isRtl ? 'الخام الزراعي - كشف حركات التوريد والصرف' : 'Agricultural Raw Materials Movements Report', 14, 15);
      
      // Filter details
      doc.setFontSize(10);
      doc.text(
        isRtl 
          ? `التاريخ: ${new Date().toLocaleDateString('ar-EG')} | إجمالي الحركات: ${filteredMaterials.length} | إجمالي الكمية: ${totalQuantity.toLocaleString()}`
          : `Date: ${new Date().toLocaleDateString()} | Total Movements: ${filteredMaterials.length} | Total Quantity: ${totalQuantity.toLocaleString()}`, 
        14, 22
      );

      const tableHeaders = isRtl ? [
        'التاريخ', 'الحركة', 'رقم الحركة', 'المورد', 'إذن التسليم', 'الكود', 'الصنف', 'الباتش', 'الكمية', 'الوحدة'
      ] : [
        'Date', 'Type', 'Mov.No', 'Supplier', 'Del.Note', 'Code', 'Item Name', 'Batch', 'Qty', 'Unit'
      ];

      const tableData = filteredMaterials.map(item => [
        item.date,
        item.movementType,
        item.movementNumber,
        item.supplier,
        item.deliveryNote || '',
        item.materialCode,
        item.itemName,
        item.batch,
        item.quantity.toString(),
        item.unit
      ]);

      (doc as any).autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 28,
        theme: 'striped',
        styles: {
          font: isRtl ? 'Amiri' : 'helvetica',
          halign: isRtl ? 'right' : 'left',
          fontSize: 9
        },
        headStyles: {
          fillColor: [16, 185, 129], // Emerald green matching brand theme
          textColor: [255, 255, 255]
        }
      });

      doc.save(`Agricultural_Raw_Materials_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(isRtl ? 'تم تصدير ملف PDF بنجاح' : 'PDF exported successfully');
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? 'خطأ في تصدير PDF' : 'PDF export failed');
    }
  };

  // Import from Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
          toast.error(isRtl ? 'الملف المستورد فارغ' : 'Imported file is empty');
          return;
        }

        let importedCount = 0;
        let skippedDuplicateCount = 0;
        let validationFailedCount = 0;

        // Helper to normalize and trim fields for robust duplicate checking
        const norm = (val: any) => String(val !== undefined && val !== null ? val : '').trim();

        // Collect all existing record keys using ALL data fields to prevent duplicates based on identical rows
        const activeKeys = new Set(
          materials.map(m => 
            `${norm(m.date)}_${norm(m.movementType)}_${norm(m.movementNumber)}_${norm(m.supplier)}_${norm(m.sapNumber)}_${norm(m.postNumber)}_${norm(m.deliveryNote)}_${norm(m.materialCode)}_${norm(m.itemName)}_${norm(m.size)}_${norm(m.batch)}_${Number(m.quantity)}_${norm(m.unit)}_${norm(m.driverName)}_${norm(m.vehicleNumber)}_${norm(m.notes)}`
          )
        );

        for (const row of jsonData) {
          // Robust Excel date parsing
          let rawDate = row['التاريخ'] || row['Date'] || row['date'];
          let date = '';
          if (rawDate !== undefined && rawDate !== null) {
            if (typeof rawDate === 'number') {
              // Convert Excel serial number to date
              const dateObj = new Date((rawDate - 25569) * 86400 * 1000);
              date = dateObj.toISOString().slice(0, 10);
            } else {
              const strDate = String(rawDate).trim();
              const parts = strDate.split(/[-/]/);
              if (parts.length === 3) {
                // Check if YYYY-MM-DD or DD/MM/YYYY
                if (parts[0].length === 4) {
                  date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                } else if (parts[2].length === 4) {
                  date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                } else {
                  date = strDate;
                }
              } else {
                date = strDate;
              }
            }
          }
          if (!date) {
            date = new Date().toISOString().slice(0, 10);
          }

          let movementType = String(row['الحركة'] || row['Movement Type'] || row['movementType'] || 'إضافة').trim();
          let movementNumber = String(row['رقم الحركة'] || row['Movement Number'] || row['movementNumber'] || '').trim();
          let supplier = String(row['المورد'] || row['Supplier'] || row['supplier'] || '').trim();
          let sapNumber = String(row['رقم الساب'] || row['SAP Number'] || row['sapNumber'] || '').trim();
          let postNumber = String(row['رقم البوست'] || row['Post Number'] || row['postNumber'] || '').trim();
          let deliveryNote = String(row['إذن تسليم المورد'] || row['Supplier Delivery Note'] || row['deliveryNote'] || '').trim();
          let materialCode = String(row['الكود'] || row['Code'] || row['materialCode'] || '').trim();
          let itemName = String(row['الصنف'] || row['Item Name'] || row['itemName'] || '').trim();
          let size = String(row['الحجم'] || row['Size'] || row['size'] || '').trim();
          let batch = String(row['الباتش'] || row['Batch'] || row['batch'] || '').trim();
          const rawQuantity = row['الكمية'] || row['Quantity'] || row['quantity'];
          const quantity = Number(rawQuantity !== undefined && rawQuantity !== null ? rawQuantity : 0);
          let unit = String(row['الوحدة'] || row['Unit'] || row['unit'] || 'كجم').trim();
          let driverName = String(row['اسم السائق'] || row['Driver Name'] || row['driverName'] || '').trim();
          let vehicleNumber = String(row['رقم السيارة'] || row['Vehicle Number'] || row['vehicleNumber'] || '').trim();
          let notes = String(row['ملاحظات'] || row['Notes'] || row['notes'] || '').trim();

          // Quietly skip empty trailing rows that sheet_to_json can read from formatting
          const hasAnyContent = (itemName !== '' || materialCode !== '' || movementNumber !== '' || supplier !== '' || batch !== '');
          if (!hasAnyContent && (isNaN(quantity) || quantity <= 0)) {
            continue;
          }

          // Validation: must have valid positive quantity, and at least code or item name
          if (isNaN(quantity) || quantity <= 0 || (itemName === '' && materialCode === '')) {
            validationFailedCount++;
            continue;
          }

          // Smart Auto-Filling from database history if one of the item details is empty
          if (itemName === '' && materialCode !== '') {
            const found = materials.find(m => m.materialCode === materialCode);
            itemName = found ? found.itemName : materialCode;
          }
          if (materialCode === '' && itemName !== '') {
            const found = materials.find(m => m.itemName === itemName);
            materialCode = found ? found.materialCode : '-';
          }

          // Safe fallbacks for optional fields to avoid blank missing items
          if (!movementNumber) movementNumber = '-';
          if (!supplier) supplier = '-';
          if (!batch) batch = '-';
          if (!unit) unit = 'كجم';

          // Normalize movementType to either Adding or Dispense in Arabic
          const normalizedType = (movementType.includes('صرف') || movementType.toLowerCase().includes('disp') || movementType.toLowerCase().includes('out')) ? 'صرف' : 'إضافة';

          // Unique key includes all core fields to ensure we only skip completely identical rows
          const uniqueKey = `${norm(date)}_${norm(normalizedType)}_${norm(movementNumber)}_${norm(supplier)}_${norm(sapNumber)}_${norm(postNumber)}_${norm(deliveryNote)}_${norm(materialCode)}_${norm(itemName)}_${norm(size)}_${norm(batch)}_${Number(quantity)}_${norm(unit)}_${norm(driverName)}_${norm(vehicleNumber)}_${norm(notes)}`;

          // Duplication Rule Guard (We now flag instead of skip!)
          let isDuplicate = false;
          if (activeKeys.has(uniqueKey)) {
            isDuplicate = true;
            skippedDuplicateCount++;
          } else {
            // Register new unique key
            activeKeys.add(uniqueKey);
          }

          let finalNotes = notes;
          if (isDuplicate) {
            finalNotes = notes ? `[مكرر] ${notes}` : 'مكرر';
          }

          // Build clean object
          const record: AgriRawMaterial = {
            id: crypto.randomUUID(),
            date,
            movementType: normalizedType,
            movementNumber,
            supplier,
            sapNumber,
            postNumber,
            deliveryNote,
            materialCode,
            itemName,
            size,
            batch,
            quantity,
            unit,
            driverName,
            vehicleNumber,
            notes: finalNotes,
            isDuplicate,
            createdAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString()
          };

          // Save to DB
          await storageService.saveAgriRawMaterial(record);
          importedCount++;
        }

        toast.success(
          isRtl 
            ? `تم استيراد ${importedCount} حركات بنجاح. (منها مكرر وتم وسمه: ${skippedDuplicateCount}, تخطي غير صالح: ${validationFailedCount})`
            : `Imported ${importedCount} records successfully. (Flagged duplicates: ${skippedDuplicateCount}, invalid skipped: ${validationFailedCount})`
        );

        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error(err);
        toast.error(isRtl ? 'حدث خطأ أثناء قراءة وتحليل ملف Excel' : 'Error parsing Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Drag and drop events for file import
  const [dragActive, setDragActive] = useState(false);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Trigger file input upload logic
        const event = { target: { files: e.dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleImportExcel(event);
      } else {
        toast.error(isRtl ? 'يرجى إسقاط ملفات Excel فقط (.xlsx, .xls)' : 'Please drop Excel files only (.xlsx, .xls)');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/5 flex items-center justify-center shrink-0">
            <Sprout className="text-emerald-500" size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              {isRtl ? '🌿 الخام الزراعي' : '🌿 Agricultural Raw Material'}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {isRtl ? 'إدارة وتتبع حركات توريد وصرف الخامات الزراعية والتحقق من التكرار' : 'Manage, track and validate agricultural raw material receipts & issues'}
            </p>
          </div>
        </div>

        {/* Buttons Action Group */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls"
            className="hidden"
          />

          <button
            onClick={downloadExcelTemplate}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl font-medium transition-all text-sm shadow-sm"
            title={isRtl ? 'تحميل نموذج Excel المفرغ' : 'Download blank Excel template'}
          >
            <Download size={18} />
            <span>{isRtl ? 'تحميل نموذج Excel' : 'Download Template'}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl font-medium transition-all text-sm shadow-sm"
            title={isRtl ? 'استيراد من Excel' : 'Import from Excel'}
          >
            <FileUp size={18} />
            <span>{isRtl ? 'استيراد Excel' : 'Import Excel'}</span>
          </button>

          <button
            onClick={handleSyncGoogleSheet}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all text-sm shadow-sm cursor-pointer disabled:opacity-50"
            title={isRtl ? 'جلب ومزامنة البيانات من Google Sheet' : 'Sync data from Google Sheet'}
          >
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isRtl ? 'مزامنة Google Sheet' : 'Sync Google Sheet'}</span>
          </button>

          <button
            onClick={exportToExcel}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl font-medium transition-all text-sm shadow-sm"
            title={isRtl ? 'تصدير إلى Excel' : 'Export to Excel'}
          >
            <FileDown size={18} />
            <span>{isRtl ? 'تصدير Excel' : 'Export Excel'}</span>
          </button>

          <button
            onClick={exportToPdf}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl font-medium transition-all text-sm shadow-sm"
            title={isRtl ? 'تصدير كتقرير PDF' : 'Export to PDF'}
          >
            <FileText size={18} />
            <span>{isRtl ? 'تقرير PDF' : 'PDF Report'}</span>
          </button>

          {canEditOrDelete && selectedIds.length > 0 && (
            <button
              onClick={() => setIsBulkDeleteConfirmOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-all text-sm shadow-lg shadow-rose-600/20 w-full sm:w-auto animate-pulse"
              title={isRtl ? 'حذف المحدد' : 'Delete Selected'}
            >
              <Trash2 size={18} />
              <span>
                {isRtl 
                  ? `مسح المحدد (${selectedIds.length})` 
                  : `Delete Selected (${selectedIds.length})`}
              </span>
            </button>
          )}

          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all text-sm shadow-lg shadow-emerald-500/20 w-full sm:w-auto"
          >
            <Plus size={18} />
            <span>{isRtl ? 'إضافة حركة جديدة' : 'Add New Movement'}</span>
          </button>
        </div>
      </div>

      {/* Aggregate Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Quantity */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500 font-medium">{isRtl ? 'إجمالي الكمية (المفلترة)' : 'Total Quantity (Filtered)'}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="text-emerald-500" size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{totalQuantity.toLocaleString()}</span>
            <span className="text-xs text-zinc-500">{isRtl ? 'وحدة خامة' : 'units'}</span>
          </div>
        </div>

        {/* Total Records */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500 font-medium">{isRtl ? 'عدد الحركات الإجمالي' : 'Total Movements Count'}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileText className="text-blue-500" size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{filteredMaterials.length}</span>
            <span className="text-xs text-zinc-500">{isRtl ? 'سجل' : 'records'}</span>
          </div>
        </div>

        {/* Added Movements Count */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500 font-medium">{isRtl ? 'عدد عمليات الإضافة' : 'Receipt (Add) Movements'}</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <TrendingUp className="text-teal-500" size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{addedCount}</span>
            <span className="text-xs text-zinc-500">{isRtl ? 'حركة وارد' : 'receipts'}</span>
          </div>
        </div>

        {/* Dispatch Movements Count */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500 font-medium">{isRtl ? 'عدد عمليات الصرف' : 'Issue (Dispense) Movements'}</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <TrendingDown className="text-rose-500" size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{dispatchCount}</span>
            <span className="text-xs text-zinc-500">{isRtl ? 'حركة صادر' : 'issues'}</span>
          </div>
        </div>
      </div>

      {/* Excel Drag and Drop Overlay */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-4 transition-all duration-200 text-center ${
          dragActive
            ? 'border-emerald-500 bg-emerald-500/5'
            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
        }`}
      >
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          💡 {isRtl 
            ? 'يمكنك سحب وإفلات ملف Excel (.xlsx) هنا للاستيراد السريع أو البحث والتصفية بالأسفل' 
            : 'You can drag & drop an Excel file (.xlsx) here for rapid importing or search & filter below'}
        </p>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
          <Filter size={16} />
          {isRtl ? 'البحث والتصفية المتقدمة' : 'Advanced Search & Filtering'}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Quick Search */}
          <div className="relative">
            <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-400`} size={18} />
            <input
              type="text"
              placeholder={isRtl ? 'بحث كود، صنف، مورد، باتش، حركة...' : 'Search code, item, supplier, batch, movement...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all text-zinc-900 dark:text-zinc-100`}
            />
          </div>

          {/* Supplier Dropdown */}
          <div className="relative">
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all text-zinc-900 dark:text-zinc-100 cursor-pointer"
            >
              <option value="All" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">{isRtl ? 'كل الموردين' : 'All Suppliers'}</option>
              {uniqueSuppliers.map(s => (
                <option key={s} value={s} className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">{s}</option>
              ))}
            </select>
          </div>

          {/* Item Name Dropdown */}
          <div className="relative">
            <select
              value={filterItemName}
              onChange={(e) => setFilterItemName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all text-zinc-900 dark:text-zinc-100 cursor-pointer"
            >
              <option value="All" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">{isRtl ? 'كل الأصناف' : 'All Items'}</option>
              {uniqueItemNames.map(name => (
                <option key={name} value={name} className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">{name}</option>
              ))}
            </select>
          </div>

          {/* Movement Type Filter */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all text-zinc-900 dark:text-zinc-100 cursor-pointer"
            >
              <option value="All" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">{isRtl ? 'كل الحركات (إضافة / صرف)' : 'All Movements'}</option>
              <option value="إضافة" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">{isRtl ? 'إضافة فقط' : 'Add Only'}</option>
              <option value="صرف" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">{isRtl ? 'صرف فقط' : 'Dispense Only'}</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="relative">
            <Calendar className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-zinc-400`} size={18} />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className={`w-full ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all text-zinc-900 dark:text-zinc-100`}
            />
          </div>
        </div>

        {/* Clear Filters indicator */}
        {(searchTerm || filterSupplier !== 'All' || filterItemName !== 'All' || filterType !== 'All' || filterDate) && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterSupplier('All');
                setFilterItemName('All');
                setFilterType('All');
                setFilterDate('');
              }}
              className="text-xs text-red-500 hover:underline flex items-center gap-1 font-medium"
            >
              <X size={14} />
              {isRtl ? 'إلغاء جميع الفلاتر' : 'Reset All Filters'}
            </button>
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            {isRtl ? 'جاري تحميل البيانات...' : 'Loading raw agricultural materials...'}
          </div>
        ) : (filteredMaterials.length === 0 && !isInlineAdding) ? (
          <div className="p-12 text-center text-zinc-500">
            <AlertTriangle className="mx-auto mb-4 text-zinc-400" size={32} />
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              {isRtl ? 'لا توجد سجلات مطابقة للبحث' : 'No matching records found'}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              {isRtl ? 'أضف حركة جديدة أو اضبط معايير الفرز' : 'Create a new entry or reset the filters'}
            </p>
          </div>
        ) : (
          <>
            {/* Scrollable Responsive Table Wrapper with custom scrollbar, max-height and sticky headers */}
            <div className="overflow-x-auto overflow-y-auto max-h-[580px] scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              <table id="agri-raw-materials-table" className="w-full text-sm text-right border-separate border-spacing-0" dir={isRtl ? 'rtl' : 'ltr'}>
                <thead className="sticky top-0 z-30 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.05)]">
                  <tr>
                    {canEditOrDelete && (
                      <th className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-center z-30 w-10">
                        <input
                          type="checkbox"
                          checked={filteredMaterials.length > 0 && selectedIds.length === filteredMaterials.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(filteredMaterials.map(m => m.id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                          className="rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer animate-pulse"
                        />
                      </th>
                    )}
                    <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-right whitespace-nowrap">{isRtl ? 'التاريخ' : 'Date'}</th>
                    <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-right whitespace-nowrap">{isRtl ? 'الحركة' : 'Movement'}</th>
                    <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-right whitespace-nowrap">{isRtl ? 'رقم الحركة' : 'Mov. No'}</th>
                    <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-right whitespace-nowrap">{isRtl ? 'المورد' : 'Supplier'}</th>
                    <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-right whitespace-nowrap">{isRtl ? 'رقم الساب' : 'SAP No'}</th>
                    <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-right whitespace-nowrap">{isRtl ? 'رقم البوست' : 'Post No'}</th>
                    <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-right whitespace-nowrap">{isRtl ? 'إذن التسليم' : 'Delivery Note'}</th>
                    <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-right whitespace-nowrap">{isRtl ? 'الكود' : 'Code'}</th>
                    <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-right whitespace-nowrap">{isRtl ? 'الصنف' : 'Item Name'}</th>
                    <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-right whitespace-nowrap">{isRtl ? 'الحجم' : 'Size'}</th>
                    <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-right whitespace-nowrap">{isRtl ? 'الباتش' : 'Batch'}</th>
                    <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-right whitespace-nowrap">{isRtl ? 'الكمية' : 'Quantity'}</th>
                    <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-right whitespace-nowrap">{isRtl ? 'الوحدة' : 'Unit'}</th>
                    <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-right whitespace-nowrap">{isRtl ? 'السائق' : 'Driver'}</th>
                    <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-right whitespace-nowrap">{isRtl ? 'السيارة' : 'Vehicle'}</th>
                    <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-right whitespace-nowrap">{isRtl ? 'ملاحظات' : 'Notes'}</th>
                    {canEditOrDelete && (
                      <th className="p-3.5 font-bold text-zinc-700 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md text-center whitespace-nowrap z-20">{isRtl ? 'إجراءات' : 'Actions'}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {/* Inline Horizontal Adding Row styled like the user's green image */}
                  {isInlineAdding && (
                    <tr className="bg-[#72b143] text-white">
                      {canEditOrDelete && (
                        <td className="p-2 border-b border-emerald-700 align-middle"></td>
                      )}
                      {/* 1. التاريخ */}
                      <td className="p-2 border-b border-emerald-700 align-middle">
                        <div className="flex flex-col gap-1 min-w-[130px]">
                          <span className="text-[10px] font-bold text-center text-white/90">{isRtl ? 'التاريخ' : 'Date'}</span>
                          <input
                            type="date"
                            required
                            value={formData.date || ''}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            className="w-full text-xs px-2 py-1 bg-white text-zinc-800 rounded border border-zinc-300 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          />
                        </div>
                      </td>

                      {/* 2. الحركة */}
                      <td className="p-2 border-b border-emerald-700 align-middle">
                        <div className="flex flex-col gap-1 min-w-[90px]">
                          <span className="text-[10px] font-bold text-center text-white/90">{isRtl ? 'الحركة' : 'Movement'}</span>
                          <select
                            value={formData.movementType || 'إضافة'}
                            onChange={e => setFormData({ ...formData, movementType: e.target.value as 'إضافة' | 'صرف' })}
                            className="w-full text-xs px-2 py-1 bg-white text-zinc-800 rounded border border-zinc-300 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          >
                            <option value="إضافة">{isRtl ? 'إضافة' : 'Add'}</option>
                            <option value="صرف">{isRtl ? 'صرف' : 'Dispense'}</option>
                          </select>
                        </div>
                      </td>

                      {/* 3. رقم الحركة */}
                      <td className="p-2 border-b border-emerald-700 align-middle">
                        <div className="flex flex-col gap-1 min-w-[110px]">
                          <span className="text-[10px] font-bold text-center text-white/90">{isRtl ? 'رقم الحركة' : 'Mov. No'}</span>
                          <input
                            type="text"
                            required
                            placeholder={isRtl ? 'مثال: MV-901' : 'e.g. MV-901'}
                            list="movementNumbers_list"
                            value={formData.movementNumber || ''}
                            onChange={e => setFormData({ ...formData, movementNumber: e.target.value })}
                            className="w-full text-xs px-2 py-1 bg-white text-zinc-800 rounded border border-zinc-300 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          />
                          <datalist id="movementNumbers_list">
                            {Array.from(new Set(materials.map(m => m.movementNumber).filter(Boolean))).map(val => (
                              <option key={val} value={val} />
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* 4. المورد */}
                      <td className="p-2 border-b border-emerald-700 align-middle">
                        <div className="flex flex-col gap-1 min-w-[140px]">
                          <span className="text-[10px] font-bold text-center text-white/90">{isRtl ? 'المورد' : 'Supplier'}</span>
                          <input
                            type="text"
                            required
                            placeholder={isRtl ? 'اسم المورد الرئيسي' : 'Supplier name'}
                            list="suppliers_list"
                            value={formData.supplier || ''}
                            onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                            className="w-full text-xs px-2 py-1 bg-white text-zinc-800 rounded border border-zinc-300 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          />
                          <datalist id="suppliers_list">
                            {Array.from(new Set(materials.map(m => m.supplier).filter(Boolean))).map(val => (
                              <option key={val} value={val} />
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* 5. رقم الساب */}
                      <td className="p-2 border-b border-emerald-700 align-middle">
                        <div className="flex flex-col gap-1 min-w-[110px]">
                          <span className="text-[10px] font-bold text-center text-white/90">{isRtl ? 'رقم الساب' : 'SAP No'}</span>
                          <input
                            type="text"
                            placeholder={isRtl ? 'رقم الساب الاختياري' : 'Optional SAP No'}
                            list="saps_list"
                            value={formData.sapNumber || ''}
                            onChange={e => setFormData({ ...formData, sapNumber: e.target.value })}
                            className="w-full text-xs px-2 py-1 bg-white text-zinc-800 rounded border border-zinc-300 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          />
                          <datalist id="saps_list">
                            {Array.from(new Set(materials.map(m => m.sapNumber).filter(Boolean))).map(val => (
                              <option key={val} value={val} />
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* 6. رقم البوست */}
                      <td className="p-2 border-b border-emerald-700 align-middle">
                        <div className="flex flex-col gap-1 min-w-[110px]">
                          <span className="text-[10px] font-bold text-center text-white/90">{isRtl ? 'رقم البوست' : 'Post No'}</span>
                          <input
                            type="text"
                            placeholder={isRtl ? 'رقم البوست الاختياري' : 'Optional Post No'}
                            list="posts_list"
                            value={formData.postNumber || ''}
                            onChange={e => setFormData({ ...formData, postNumber: e.target.value })}
                            className="w-full text-xs px-2 py-1 bg-white text-zinc-800 rounded border border-zinc-300 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          />
                          <datalist id="posts_list">
                            {Array.from(new Set(materials.map(m => m.postNumber).filter(Boolean))).map(val => (
                              <option key={val} value={val} />
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* 7. اذن تسليم المورد */}
                      <td className="p-2 border-b border-emerald-700 align-middle">
                        <div className="flex flex-col gap-1 min-w-[140px]">
                          <span className="text-[10px] font-bold text-center text-white/90">{isRtl ? 'إذن تسليم المورد' : 'Delivery Note'}</span>
                          <input
                            type="text"
                            placeholder={isRtl ? 'رقم إذن تسليم المورد' : 'Delivery note No'}
                            list="deliveryNotes_list"
                            value={formData.deliveryNote || ''}
                            onChange={e => setFormData({ ...formData, deliveryNote: e.target.value })}
                            className="w-full text-xs px-2 py-1 bg-white text-zinc-800 rounded border border-zinc-300 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          />
                          <datalist id="deliveryNotes_list">
                            {Array.from(new Set(materials.map(m => m.deliveryNote).filter(Boolean))).map(val => (
                              <option key={val} value={val} />
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* 8. الكود */}
                      <td className="p-2 border-b border-emerald-700 align-middle">
                        <div className="flex flex-col gap-1 min-w-[100px]">
                          <span className="text-[10px] font-bold text-center text-white/90">{isRtl ? 'الكود' : 'Code'}</span>
                          <input
                            type="text"
                            required
                            placeholder="CODE-102"
                            list="materialCodes_list"
                            value={formData.materialCode || ''}
                            onChange={e => setFormData({ ...formData, materialCode: e.target.value })}
                            className="w-full text-xs px-2 py-1 bg-white text-zinc-800 rounded border border-zinc-300 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          />
                          <datalist id="materialCodes_list">
                            {Array.from(new Set(materials.map(m => m.materialCode).filter(Boolean))).map(val => (
                              <option key={val} value={val} />
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* 9. الصنف */}
                      <td className="p-2 border-b border-emerald-700 align-middle">
                        <div className="flex flex-col gap-1 min-w-[140px]">
                          <span className="text-[10px] font-bold text-center text-white/90">{isRtl ? 'الصنف' : 'Item Name'}</span>
                          <input
                            type="text"
                            required
                            placeholder={isRtl ? 'اسم الصنف أو الخامة' : 'Material Name'}
                            list="itemNames_list"
                            value={formData.itemName || ''}
                            onChange={e => setFormData({ ...formData, itemName: e.target.value })}
                            className="w-full text-xs px-2 py-1 bg-white text-zinc-800 rounded border border-zinc-300 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          />
                          <datalist id="itemNames_list">
                            {Array.from(new Set(materials.map(m => m.itemName).filter(Boolean))).map(val => (
                              <option key={val} value={val} />
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* 10. الحجم */}
                      <td className="p-2 border-b border-emerald-700 align-middle">
                        <div className="flex flex-col gap-1 min-w-[100px]">
                          <span className="text-[10px] font-bold text-center text-white/90">{isRtl ? 'الحجم' : 'Size'}</span>
                          <input
                            type="text"
                            placeholder={isRtl ? 'كبير / 10 لتر' : 'Optional size'}
                            list="sizes_list"
                            value={formData.size || ''}
                            onChange={e => setFormData({ ...formData, size: e.target.value })}
                            className="w-full text-xs px-2 py-1 bg-white text-zinc-800 rounded border border-zinc-300 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          />
                          <datalist id="sizes_list">
                            {Array.from(new Set(materials.map(m => m.size).filter(Boolean))).map(val => (
                              <option key={val} value={val} />
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* 11. الباتش */}
                      <td className="p-2 border-b border-emerald-700 align-middle">
                        <div className="flex flex-col gap-1 min-w-[100px]">
                          <span className="text-[10px] font-bold text-center text-white/90">{isRtl ? 'الباتش' : 'Batch'}</span>
                          <input
                            type="text"
                            required
                            placeholder={isRtl ? 'رقم الباتش' : 'Batch ID'}
                            list="batches_list"
                            value={formData.batch || ''}
                            onChange={e => setFormData({ ...formData, batch: e.target.value })}
                            className="w-full text-xs px-2 py-1 bg-white text-zinc-800 rounded border border-zinc-300 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          />
                          <datalist id="batches_list">
                            {Array.from(new Set(materials.map(m => m.batch).filter(Boolean))).map(val => (
                              <option key={val} value={val} />
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* 12. الكمية */}
                      <td className="p-2 border-b border-emerald-700 align-middle">
                        <div className="flex flex-col gap-1 min-w-[100px]">
                          <span className="text-[10px] font-bold text-center text-white/90">{isRtl ? 'الكمية' : 'Quantity'}</span>
                          <input
                            type="number"
                            required
                            step="any"
                            placeholder="0.00"
                            value={formData.quantity || ''}
                            onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                            className="w-full text-xs px-2 py-1 bg-white text-zinc-800 rounded border border-zinc-300 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-center font-bold"
                          />
                        </div>
                      </td>

                      {/* 13. الوحدة */}
                      <td className="p-2 border-b border-emerald-700 align-middle">
                        <div className="flex flex-col gap-1 min-w-[80px]">
                          <span className="text-[10px] font-bold text-center text-white/90">{isRtl ? 'الوحدة' : 'Unit'}</span>
                          <input
                            type="text"
                            required
                            placeholder={isRtl ? 'كجم، طن...' : 'Unit'}
                            list="units_list"
                            value={formData.unit || 'كجم'}
                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                            className="w-full text-xs px-2 py-1 bg-white text-zinc-800 rounded border border-zinc-300 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          />
                          <datalist id="units_list">
                            {Array.from(new Set(materials.map(m => m.unit).filter(Boolean))).map(val => (
                              <option key={val} value={val} />
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* 14. اسم السائق */}
                      <td className="p-2 border-b border-emerald-700 align-middle">
                        <div className="flex flex-col gap-1 min-w-[130px]">
                          <span className="text-[10px] font-bold text-center text-white/90">{isRtl ? 'اسم السائق' : 'Driver Name'}</span>
                          <input
                            type="text"
                            placeholder={isRtl ? 'اسم السائق بالكامل' : 'Driver Name'}
                            list="drivers_list"
                            value={formData.driverName || ''}
                            onChange={e => setFormData({ ...formData, driverName: e.target.value })}
                            className="w-full text-xs px-2 py-1 bg-white text-zinc-800 rounded border border-zinc-300 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          />
                          <datalist id="drivers_list">
                            {Array.from(new Set(materials.map(m => m.driverName).filter(Boolean))).map(val => (
                              <option key={val} value={val} />
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* 15. رقم السيارة */}
                      <td className="p-2 border-b border-emerald-700 align-middle">
                        <div className="flex flex-col gap-1 min-w-[110px]">
                          <span className="text-[10px] font-bold text-center text-white/90">{isRtl ? 'رقم السيارة' : 'Vehicle No'}</span>
                          <input
                            type="text"
                            placeholder={isRtl ? 'أرقام وحروف اللوحة' : 'Plate No'}
                            list="vehicles_list"
                            value={formData.vehicleNumber || ''}
                            onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })}
                            className="w-full text-xs px-2 py-1 bg-white text-zinc-800 rounded border border-zinc-300 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          />
                          <datalist id="vehicles_list">
                            {Array.from(new Set(materials.map(m => m.vehicleNumber).filter(Boolean))).map(val => (
                              <option key={val} value={val} />
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* 16. ملاحظات */}
                      <td className="p-2 border-b border-emerald-700 align-middle">
                        <div className="flex flex-col gap-1 min-w-[160px]">
                          <span className="text-[10px] font-bold text-center text-white/90">{isRtl ? 'ملاحظات' : 'Notes'}</span>
                          <input
                            type="text"
                            placeholder={isRtl ? 'ملاحظات إضافية...' : 'Extra notes'}
                            value={formData.notes || ''}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full text-xs px-2 py-1 bg-white text-zinc-800 rounded border border-zinc-300 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          />
                        </div>
                      </td>

                      {/* 17. الإجراءات (حفظ وإلغاء) */}
                      {canEditOrDelete && (
                        <td className="p-2 border-b border-emerald-700 align-middle sticky left-0 z-25 bg-[#72b143]">
                          <div className="flex flex-col items-center justify-center gap-1.5 min-w-[110px]">
                            <span className="text-[10px] font-bold text-white/90">{isRtl ? 'الإجراءات' : 'Actions'}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={handleInlineSave}
                                className="px-2.5 py-1 bg-white text-[#72b143] hover:bg-emerald-50 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                title={isRtl ? 'حفظ البيانات' : 'Save Details'}
                              >
                                <Check size={12} />
                                <span>{isRtl ? 'حفظ' : 'Save'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsInlineAdding(false)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                title={isRtl ? 'إلغاء' : 'Cancel'}
                              >
                                <X size={12} />
                                <span>{isRtl ? 'إلغاء' : 'Cancel'}</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      )}
                    </tr>
                  )}
                  {currentItems.map((item) => {
                    const isAdd = item.movementType === 'إضافة';
                    return (
                      <tr
                        key={item.id}
                        className={`group hover:bg-emerald-500/5 dark:hover:bg-emerald-400/5 even:bg-zinc-50/30 dark:even:bg-zinc-800/10 border-b border-zinc-100 dark:border-zinc-800/50 transition-all duration-200 ${
                          item.isDuplicate ? 'bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 dark:hover:bg-amber-500/15 border-r-4 border-r-amber-500' : ''
                        }`}
                      >
                        {canEditOrDelete && (
                          <td className="p-3 text-center whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(prev => [...prev, item.id]);
                                } else {
                                  setSelectedIds(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                              className="rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            />
                          </td>
                        )}
                        {/* 1. التاريخ */}
                        <td className="p-3 whitespace-nowrap text-zinc-900 dark:text-zinc-100 font-semibold text-xs">
                          <div className="flex items-center gap-1.5 justify-start">
                            <span className="bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg text-zinc-700 dark:text-zinc-300 shadow-2xs font-medium">
                              {item.date}
                            </span>
                            {item.isDuplicate && (
                              <span className="bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md text-[10px] font-bold border border-amber-500/30 whitespace-nowrap animate-pulse">
                                {isRtl ? 'مكرر' : 'Duplicate'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. الحركة */}
                        <td className="p-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                            isAdd
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 group-hover:scale-105 shadow-2xs'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 group-hover:scale-105 shadow-2xs'
                          }`}>
                            {isAdd ? (
                              <>
                                <TrendingUp size={12} className="animate-pulse" />
                                <span>{isRtl ? 'إضافة' : 'Add'}</span>
                              </>
                            ) : (
                              <>
                                <TrendingDown size={12} className="animate-pulse" />
                                <span>{isRtl ? 'صرف' : 'Dispense'}</span>
                              </>
                            )}
                          </span>
                        </td>

                        {/* 3. رقم الحركة */}
                        <td className="p-3 whitespace-nowrap font-mono font-bold text-xs">
                          <span className="bg-zinc-100 dark:bg-zinc-800/80 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-2xs">
                            {item.movementNumber}
                          </span>
                        </td>

                        {/* 4. المورد */}
                        <td className="p-3 whitespace-nowrap text-zinc-800 dark:text-zinc-200 font-semibold text-xs">
                          {item.supplier}
                        </td>

                        {/* 5. رقم الساب */}
                        <td className="p-3 whitespace-nowrap font-mono text-xs">
                          {item.sapNumber ? (
                            <span className="bg-blue-50/50 dark:bg-blue-950/20 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400 font-bold border border-blue-100/50 dark:border-blue-900/20">
                              {item.sapNumber}
                            </span>
                          ) : <span className="text-zinc-300 dark:text-zinc-700">-</span>}
                        </td>

                        {/* 6. رقم البوست */}
                        <td className="p-3 whitespace-nowrap font-mono text-zinc-500 dark:text-zinc-400 text-xs">
                          {item.postNumber || <span className="text-zinc-300 dark:text-zinc-700">-</span>}
                        </td>

                        {/* 7. إذن التسليم */}
                        <td className="p-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400 text-xs">
                          {item.deliveryNote || <span className="text-zinc-300 dark:text-zinc-700">-</span>}
                        </td>

                        {/* 8. الكود */}
                        <td className="p-3 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-lg font-mono font-bold text-xs shadow-2xs">
                            {item.materialCode}
                          </span>
                        </td>

                        {/* 9. الصنف */}
                        <td className="p-3 whitespace-nowrap text-zinc-900 dark:text-zinc-100 font-bold text-xs">
                          {item.itemName}
                        </td>

                        {/* 10. الحجم */}
                        <td className="p-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400 text-xs">
                          {item.size || <span className="text-zinc-300 dark:text-zinc-700">-</span>}
                        </td>

                        {/* 11. الباتش */}
                        <td className="p-3 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20 rounded-lg font-mono font-bold text-xs shadow-2xs">
                            {item.batch}
                          </span>
                        </td>

                        {/* 12. الكمية */}
                        <td className="p-3 whitespace-nowrap text-left font-mono">
                          <span className={`text-sm font-black transition-all ${
                            isAdd
                              ? 'text-emerald-600 dark:text-emerald-400 group-hover:scale-105 inline-block'
                              : 'text-rose-600 dark:text-rose-400 group-hover:scale-105 inline-block'
                          }`}>
                            {isAdd ? '+' : '-'}{Number(item.quantity).toLocaleString()}
                          </span>
                        </td>

                        {/* 13. الوحدة */}
                        <td className="p-3 whitespace-nowrap">
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-semibold">
                            {item.unit}
                          </span>
                        </td>

                        {/* 14. السائق */}
                        <td className="p-3 whitespace-nowrap text-zinc-700 dark:text-zinc-300 text-xs">
                          {item.driverName || <span className="text-zinc-300 dark:text-zinc-700">-</span>}
                        </td>

                        {/* 15. السيارة */}
                        <td className="p-3 whitespace-nowrap font-mono text-zinc-700 dark:text-zinc-300 text-xs">
                          {item.vehicleNumber || <span className="text-zinc-300 dark:text-zinc-700">-</span>}
                        </td>

                        {/* 16. ملاحظات */}
                        <td className="p-3 max-w-xs truncate text-zinc-500 dark:text-zinc-400 text-xs" title={item.notes}>
                          {item.notes || <span className="text-zinc-300 dark:text-zinc-700">-</span>}
                        </td>
                        
                        {/* 17. الإجراءات */}
                        {canEditOrDelete && (
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-all transform hover:scale-110 active:scale-95"
                                title={isRtl ? 'تعديل السجل' : 'Edit record'}
                              >
                                <Edit size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteRequest(item.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg transition-all transform hover:scale-110 active:scale-95"
                                title={isRtl ? 'حذف السجل' : 'Delete record'}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Aggregated Total & Single-page scrollbar layout Footer */}
            <div className="p-4 bg-zinc-100/90 dark:bg-zinc-950/90 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Grand Total quantities of visible filtered list */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {isRtl ? 'إجمالي السجلات المفلترة:' : 'Filtered Movements:'}
                  </span>
                  <span className="px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-bold">
                    {filteredMaterials.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 border-r border-zinc-200 dark:border-zinc-800 pl-3 pr-3">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {isRtl ? 'إجمالي الكمية الحركة:' : 'Total Movement Quantity:'}
                  </span>
                  <span className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-500/10 transition-all">
                    {totalQuantity.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="text-zinc-400 dark:text-zinc-500 text-[11px] font-medium">
                {isRtl ? '🔄 جدول حركات موحد بصفحة واحدة (استخدم شريط التمرير لرؤية المزيد)' : '🔄 Single Unified Page (Scroll to view more records)'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* CREATE & EDIT FORM MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8"
            >
              {/* Modal Title */}
              <div className="px-6 py-4 border-b dark:border-zinc-800 flex items-center justify-between bg-emerald-500/5">
                <div className="flex items-center gap-2">
                  <Sprout className="text-emerald-500" size={20} />
                  <h3 className="font-bold text-zinc-950 dark:text-white">
                    {modalMode === 'create'
                      ? (isRtl ? 'تسجيل حركة خام جديدة' : 'Add New Agricultural Movement')
                      : (isRtl ? 'تعديل بيانات حركة الخام' : 'Edit Agricultural Movement')}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSave} className="p-6 overflow-y-auto max-h-[75vh] space-y-6">
                
                {/* Visual Alert if duplicate key is found */}
                {validationErrors.duplicate && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 rounded-xl flex items-start gap-2.5 text-xs">
                    <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                    <span>{validationErrors.duplicate}</span>
                  </div>
                )}

                {/* Grid 1: Basic Movement Properties */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider">{isRtl ? '1. تفاصيل الحركة اللوجستية' : '1. Movement & Logistic Details'}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Date */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">{isRtl ? 'التاريخ *' : 'Date *'}</label>
                      <input
                        type="date"
                        required
                        value={formData.date || ''}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        className={`w-full p-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white ${
                          validationErrors.date ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                      />
                    </div>

                    {/* Movement Type Addition or Issues */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">{isRtl ? 'نوع الحركة *' : 'Movement Type *'}</label>
                      <select
                        value={formData.movementType || 'إضافة'}
                        onChange={e => setFormData({ ...formData, movementType: e.target.value as 'إضافة' | 'صرف' })}
                        className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white appearance-none"
                      >
                        <option value="إضافة">{isRtl ? 'إضافة (وارد من مورد)' : 'Receipt (Add)'}</option>
                        <option value="صرف">{isRtl ? 'صرف (صادر)' : 'Dispense (Issue)'}</option>
                      </select>
                    </div>

                    {/* Movement Number */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">{isRtl ? 'رقم الحركة *' : 'Movement Number *'}</label>
                      <input
                        type="text"
                        required
                        value={formData.movementNumber || ''}
                        onChange={e => setFormData({ ...formData, movementNumber: e.target.value })}
                        placeholder={isRtl ? 'مثال: MV-901' : 'e.g. MV-901'}
                        list="movementNumbers_list"
                        className={`w-full p-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white ${
                          validationErrors.movementNumber ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                      />
                    </div>

                    {/* Supplier */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">{isRtl ? 'المورد *' : 'Supplier *'}</label>
                      <input
                        type="text"
                        required
                        value={formData.supplier || ''}
                        onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                        placeholder={isRtl ? 'اسم المورد الرئيسي' : 'Supplier full name'}
                        list="suppliers_list"
                        className={`w-full p-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white ${
                          validationErrors.supplier ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                      />
                    </div>

                    {/* SAP Number */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">{isRtl ? 'رقم الساب (SAP)' : 'SAP Number'}</label>
                      <input
                        type="text"
                        value={formData.sapNumber || ''}
                        onChange={e => setFormData({ ...formData, sapNumber: e.target.value })}
                        placeholder={isRtl ? 'رقم الساب الاختياري' : 'Optional SAP No'}
                        list="saps_list"
                        className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white"
                      />
                    </div>

                    {/* Post Number */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">{isRtl ? 'رقم البوست (Post)' : 'Post Number'}</label>
                      <input
                        type="text"
                        value={formData.postNumber || ''}
                        onChange={e => setFormData({ ...formData, postNumber: e.target.value })}
                        placeholder={isRtl ? 'رقم البوست الاختياري' : 'Optional Post No'}
                        list="posts_list"
                        className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white"
                      />
                    </div>

                    {/* Supplier Delivery Note */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">{isRtl ? 'إذن تسليم المورد' : 'Supplier Delivery Note'}</label>
                      <input
                        type="text"
                        value={formData.deliveryNote || ''}
                        onChange={e => setFormData({ ...formData, deliveryNote: e.target.value })}
                        placeholder={isRtl ? 'رقم إذن تسليم المورد' : 'Delivery note No'}
                        list="deliveryNotes_list"
                        className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Grid 2: Material Item Specific Properties */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider">{isRtl ? '2. تفاصيل الصنف والمادة الخام' : '2. Material Item Specifications'}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Material Code */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">{isRtl ? 'الكود *' : 'Material Code *'}</label>
                      <input
                        type="text"
                        required
                        value={formData.materialCode || ''}
                        onChange={e => setFormData({ ...formData, materialCode: e.target.value })}
                        placeholder={isRtl ? 'مثال: CODE-102' : 'e.g. CODE-102'}
                        list="materialCodes_list"
                        className={`w-full p-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white ${
                          validationErrors.materialCode ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                      />
                    </div>

                    {/* Item Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">{isRtl ? 'الصنف *' : 'Item Name *'}</label>
                      <input
                        type="text"
                        required
                        value={formData.itemName || ''}
                        onChange={e => setFormData({ ...formData, itemName: e.target.value })}
                        placeholder={isRtl ? 'اسم الصنف أو الخامة' : 'Material Name'}
                        list="itemNames_list"
                        className={`w-full p-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white ${
                          validationErrors.itemName ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                      />
                    </div>

                    {/* Size */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">{isRtl ? 'الحجم' : 'Size'}</label>
                      <input
                        type="text"
                        value={formData.size || ''}
                        onChange={e => setFormData({ ...formData, size: e.target.value })}
                        placeholder={isRtl ? 'مثال: كبير / 10 لتر' : 'e.g. Large / 10L'}
                        list="sizes_list"
                        className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white"
                      />
                    </div>

                    {/* Batch */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">{isRtl ? 'الباتش *' : 'Batch *'}</label>
                      <input
                        type="text"
                        required
                        value={formData.batch || ''}
                        onChange={e => setFormData({ ...formData, batch: e.target.value })}
                        placeholder={isRtl ? 'رقم الباتش الرئيسي' : 'Batch identifier'}
                        list="batches_list"
                        className={`w-full p-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white ${
                          validationErrors.batch ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                      />
                    </div>

                    {/* Quantity */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">{isRtl ? 'الكمية *' : 'Quantity *'}</label>
                      <input
                        type="number"
                        required
                        step="any"
                        value={formData.quantity || ''}
                        onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className={`w-full p-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white ${
                          validationErrors.quantity ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                      />
                    </div>

                    {/* Unit */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">{isRtl ? 'الوحدة *' : 'Unit *'}</label>
                      <input
                        type="text"
                        required
                        value={formData.unit || 'كجم'}
                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                        placeholder={isRtl ? 'كجم، طن، برميل...' : 'kg, ton, barrel...'}
                        list="units_list"
                        className={`w-full p-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white ${
                          validationErrors.unit ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Grid 3: Transport Info & Notes */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider">{isRtl ? '3. بيانات السائق والسيارة والملاحظات' : '3. Driver, Vehicle & Additional Notes'}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Driver Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">{isRtl ? 'اسم السائق' : 'Driver Name'}</label>
                      <input
                        type="text"
                        value={formData.driverName || ''}
                        onChange={e => setFormData({ ...formData, driverName: e.target.value })}
                        placeholder={isRtl ? 'اسم السائق بالكامل' : 'Full driver name'}
                        list="drivers_list"
                        className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white"
                      />
                    </div>

                    {/* Vehicle Number */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">{isRtl ? 'رقم السيارة' : 'Vehicle Number'}</label>
                      <input
                        type="text"
                        value={formData.vehicleNumber || ''}
                        onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })}
                        placeholder={isRtl ? 'أرقام وحروف اللوحة' : 'Plate number'}
                        list="vehicles_list"
                        className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1 mt-4">
                    <label className="text-xs font-medium text-zinc-500">{isRtl ? 'ملاحظات' : 'Notes'}</label>
                    <textarea
                      rows={3}
                      value={formData.notes || ''}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      placeholder={isRtl ? 'ملاحظات إضافية عن الحركة...' : 'Any extra comments...'}
                      className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white resize-none"
                    />
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl font-medium transition-all text-sm"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all text-sm shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                  >
                    <Check size={16} />
                    <span>{isRtl ? 'حفظ البيانات' : 'Save Details'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-zinc-900 dark:text-white text-lg">
                  {isRtl ? 'تأكيد حذف السجل' : 'Confirm Record Deletion'}
                </h3>
                <p className="text-sm text-zinc-500 mt-2">
                  {isRtl 
                    ? 'هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.' 
                    : 'Are you sure you want to delete this record permanently? This action cannot be undone.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl font-medium text-sm transition-colors"
                >
                  {isRtl ? 'إلغاء التراجع' : 'No, Keep It'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium text-sm transition-colors shadow-md shadow-rose-500/10"
                >
                  {isRtl ? 'حذف السجل' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BULK DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {isBulkDeleteConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-zinc-900 dark:text-white text-lg">
                  {isRtl ? 'تأكيد الحذف الجماعي' : 'Confirm Bulk Deletion'}
                </h3>
                <p className="text-sm text-zinc-500 mt-2">
                  {isRtl 
                    ? `هل أنت متأكد من رغبتك في حذف ${selectedIds.length} من السجلات المحددة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.` 
                    : `Are you sure you want to permanently delete the ${selectedIds.length} selected records? This action cannot be undone.`}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteConfirmOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl font-medium text-sm transition-colors"
                >
                  {isRtl ? 'إلغاء التراجع' : 'No, Keep Them'}
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium text-sm transition-colors shadow-md shadow-rose-500/10"
                >
                  {isRtl ? 'تأكيد حذف الجميع' : 'Yes, Delete All'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Datalist Autocomplete Suggestions */}
      <datalist id="movementNumbers_list">
        {Array.from(new Set(materials.map(m => m.movementNumber).filter(Boolean))).map(val => (
          <option key={val} value={val} />
        ))}
      </datalist>
      <datalist id="suppliers_list">
        {Array.from(new Set(materials.map(m => m.supplier).filter(Boolean))).map(val => (
          <option key={val} value={val} />
        ))}
      </datalist>
      <datalist id="saps_list">
        {Array.from(new Set(materials.map(m => m.sapNumber).filter(Boolean))).map(val => (
          <option key={val} value={val} />
        ))}
      </datalist>
      <datalist id="posts_list">
        {Array.from(new Set(materials.map(m => m.postNumber).filter(Boolean))).map(val => (
          <option key={val} value={val} />
        ))}
      </datalist>
      <datalist id="deliveryNotes_list">
        {Array.from(new Set(materials.map(m => m.deliveryNote).filter(Boolean))).map(val => (
          <option key={val} value={val} />
        ))}
      </datalist>
      <datalist id="materialCodes_list">
        {Array.from(new Set(materials.map(m => m.materialCode).filter(Boolean))).map(val => (
          <option key={val} value={val} />
        ))}
      </datalist>
      <datalist id="itemNames_list">
        {Array.from(new Set(materials.map(m => m.itemName).filter(Boolean))).map(val => (
          <option key={val} value={val} />
        ))}
      </datalist>
      <datalist id="sizes_list">
        {Array.from(new Set(materials.map(m => m.size).filter(Boolean))).map(val => (
          <option key={val} value={val} />
        ))}
      </datalist>
      <datalist id="batches_list">
        {Array.from(new Set(materials.map(m => m.batch).filter(Boolean))).map(val => (
          <option key={val} value={val} />
        ))}
      </datalist>
      <datalist id="units_list">
        {Array.from(new Set(materials.map(m => m.unit).filter(Boolean))).map(val => (
          <option key={val} value={val} />
        ))}
      </datalist>
      <datalist id="drivers_list">
        {Array.from(new Set(materials.map(m => m.driverName).filter(Boolean))).map(val => (
          <option key={val} value={val} />
        ))}
      </datalist>
      <datalist id="vehicles_list">
        {Array.from(new Set(materials.map(m => m.vehicleNumber).filter(Boolean))).map(val => (
          <option key={val} value={val} />
        ))}
      </datalist>
    </div>
  );
}
