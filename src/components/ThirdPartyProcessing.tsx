import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Save, 
  ArrowRight, 
  History, 
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  FileSpreadsheet,
  Share2,
  MessageCircle,
  Mail,
  FileText,
  Building2,
  Database,
  Users,
  Settings,
  AtSign,
  Pencil,
  X,
  Tag,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  Language, 
  UserProfile, 
  ProcessingJob, 
  ProcessItem,
  Warehouse
} from '../types';
import { translations } from '../i18n';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, setDoc, getDocs, writeBatch, where } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../constants';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  TextRun, 
  AlignmentType, 
  WidthType, 
  BorderStyle, 
  VerticalAlign,
  ShadingType,
  PageOrientation
} from 'docx';

interface ThirdPartyProcessingProps {
  lang: Language;
  user: UserProfile;
}

// Representative items categories based on provided labels
const CATEGORIES = {
  process: [
    { id: 'SLC', labelAr: 'شرائح', labelEn: 'SLC', aliases: ['slice', 'slices', 'سلايس', 'شرايح'] },
    { id: 'Pre', labelAr: 'خام', labelEn: 'Pre', aliases: ['raw', 'preparation', 'تجهيز', 'خامات', 'خام'] },
    { id: 'Grd', labelAr: 'مدرج', labelEn: 'Graded', aliases: ['grd', 'graded', 'فرز', 'تدريج'] },
    { id: 'PTD', labelAr: 'مخلي', labelEn: 'Pitted', aliases: ['ptd', 'pitted', 'مخلي', 'مخلي من النوي'] },
    { id: 'FARZA', labelAr: 'فرزه', labelEn: 'Farza', aliases: ['reject', 'bi products', 'فرزة', 'فرزة زيت', 'فرزه زيت'] },
  ],
  direction: [
    { id: 'Green', labelAr: 'مطبوخ', labelEn: 'Green', aliases: ['gree', 'olive', 'green', 'green olive', 'cooked', 'اخضر'] },
    { id: 'Black', labelAr: 'مياه وملح', labelEn: 'Black', aliases: ['brine', 'black', 'water and salt', 'م م', 'مياه ملح', 'اسود'] },
  ],
  type: [
    { id: 'Picual', labelAr: 'بيكوال', labelEn: 'Picual', aliases: ['pic', 'picual', 'بيكوال'] },
    { id: 'Azizi', labelAr: 'عجيزي', labelEn: 'Azizi', aliases: ['azizi', 'عجيزي'] },
    { id: 'Akas', labelAr: 'عقص', labelEn: 'Akas', aliases: ['akas', 'عقص'] },
    { id: 'Kobrosy', labelAr: 'قبرصي', labelEn: 'Kobrosy', aliases: ['kobrosi', 'kob', 'قبرصي'] },
    { id: 'Manzanilla', labelAr: 'منزنيـلو', labelEn: 'Manzanilla', aliases: ['manz', 'منزنيللو', 'منزنيلا'] },
    { id: 'Nour Sabah', labelAr: 'نور صباح', labelEn: 'Nour Sabah', aliases: ['نور صباح'] },
    { id: 'Sers Cola', labelAr: 'سرس كولا', labelEn: 'Sers Cola', aliases: ['serscola', 'سرس'] },
    { id: 'Kalamata', labelAr: 'كلاماتا', labelEn: 'Kalamata', aliases: ['kal', 'كلاماتا'] },
    { id: 'Dolsy', labelAr: 'دولسي', labelEn: 'Dolsy', aliases: ['دولسى'] },
    { id: 'Nepal', labelAr: 'نيبال', labelEn: 'Nepal', aliases: ['نيبال'] },
    { id: 'Farza Olive For Oil', labelAr: 'فرزة زيت للزيت', labelEn: 'Farza Olive For Oil', aliases: ['olv', 'oil', 'زيت'] },
    { id: 'Pepperoncini', labelAr: 'فلفل بيبرونسيني', labelEn: 'Pepperoncini', aliases: ['pep', 'فلفل'] },
    { id: 'Karotina', labelAr: 'كاروتينا', labelEn: 'Karotina', aliases: ['كاروتينا'] },
    { id: 'Tofahi', labelAr: 'تفاحي', labelEn: 'Tofahi', aliases: ['تفاحي'] },
    { id: 'Hamed', labelAr: 'حامد', labelEn: 'Hamed', aliases: ['حامد'] },
    { id: 'Baldiat', labelAr: 'بلديات', labelEn: 'Baldiat', aliases: ['بلديات'] },
    { id: 'Senara', labelAr: 'سنارة', labelEn: 'Senara', aliases: ['سنارة'] },
    { id: 'Mexican Pepper', labelAr: 'فلفل مكسيكي', labelEn: 'Mexican Pepper', aliases: ['مكسيكي'] },
    { id: 'Olive Oil', labelAr: 'زيت زيتون', labelEn: 'Olive Oil', aliases: ['olv', 'زيت'] },
    { id: 'Banana Pepper Mix Colour', labelAr: 'موز بيبر ملون', labelEn: 'Banana Pepper Mix Colour', aliases: ['موز'] },
  ],
  size: [
    { id: 'L', labelAr: 'L', labelEn: 'L', aliases: ['كبير', 'لارج'] },
    { id: 'M', labelAr: 'M', labelEn: 'M', aliases: ['وسط', 'ميديم'] },
    { id: 'S', labelAr: 'S', labelEn: 'S', aliases: ['صغير', 'سمول'] },
    { id: 'XXXS', labelAr: 'XXXS', labelEn: 'XXXS' },
    { id: 'XXS', labelAr: 'XXS', labelEn: 'XXS' },
    { id: 'Natural Black', labelAr: 'طبيعي أسود', labelEn: 'Natural Black', aliases: ['طبيعي'] },
    { id: 'Mesh', labelAr: 'شبك / مش', labelEn: 'Mesh', aliases: ['mesh.', 'شبك', 'مش'] },
    { id: 'Raw', labelAr: 'خام', labelEn: 'Raw', aliases: ['pre', 'خام', 'raw'] },
  ]
};

// Comprehensive list from user provided data
const PROCESS_ITEMS_LIST: ProcessItem[] = [
  // SLC
  { code: '12000008', name: 'SLC OLV Picual Black M', type: 'Picual', process: 'SLC', direction: 'Black', size: 'M' },
  { code: '12000043', name: 'SLC OLV Azizi Green L', type: 'Azizi', process: 'SLC', direction: 'Green', size: 'L' },
  { code: '12000050', name: 'SLC OLV Picual Green M', type: 'Picual', process: 'SLC', direction: 'Green', size: 'M' },
  { code: '12000057', name: 'SLC OLV Azizi Green M', type: 'Azizi', process: 'SLC', direction: 'Green', size: 'M' },
  { code: '12000058', name: 'SLC OLV Akas Green M', type: 'Akas', process: 'SLC', direction: 'Green', size: 'M' },
  { code: '12000062', name: 'SLC OLV Manzanilla Green M', type: 'Manzanilla', process: 'SLC', direction: 'Green', size: 'M' },
  { code: '12000064', name: 'SLC OLV Picual Green S', type: 'Picual', process: 'SLC', direction: 'Green', size: 'S' },
  { code: '12000071', name: 'SLC OLV Azizi Green S', type: 'Azizi', process: 'SLC', direction: 'Green', size: 'S' },
  { code: '12000072', name: 'SLC OLV Akas Green S', type: 'Akas', process: 'SLC', direction: 'Green', size: 'S' },
  { code: '12000076', name: 'SLC OLV Manzanilla Green S', type: 'Manzanilla', process: 'SLC', direction: 'Green', size: 'S' },

  // Pre
  { code: '12000106', name: 'Pre OLV Picual Green', type: 'Picual', process: 'Pre', direction: 'Green', size: 'Pre' },
  { code: '12000107', name: 'Pre OLV Tofahi Green', type: 'Tofahi', process: 'Pre', direction: 'Green', size: 'Pre' },
  { code: '12000113', name: 'Pre OLV Azizi Green', type: 'Azizi', process: 'Pre', direction: 'Green', size: 'Pre' },
  { code: '12000114', name: 'Pre OLV Akas Green', type: 'Akas', process: 'Pre', direction: 'Green', size: 'Pre' },
  { code: '12000115', name: 'Pre OLV Kobrosi Green', type: 'Kobrosi', process: 'Pre', direction: 'Green', size: 'Pre' },
  { code: '12000116', name: 'Pre OLV Karotina Green', type: 'Karotina', process: 'Pre', direction: 'Green', size: 'Pre' },
  { code: '12000118', name: 'Pre OLV Manzanilla Green', type: 'Manzanilla', process: 'Pre', direction: 'Green', size: 'Pre' },
  { code: '12000119', name: 'Pre OLV Nour Sabah Green', type: 'Nour Sabah', process: 'Pre', direction: 'Green', size: 'Pre' },
  { code: '12000120', name: 'Pre OLV Picual Black', type: 'Picual', process: 'Pre', direction: 'Black', size: 'Pre' },
  { code: '12000121', name: 'Pre OLV Tofahi Black', type: 'Tofahi', process: 'Pre', direction: 'Black', size: 'Pre' },
  { code: '12000122', name: 'Pre OLV Hamed Black', type: 'Hamed', process: 'Pre', direction: 'Black', size: 'Pre' },
  { code: '12000123', name: 'Pre OLV Dolsy Black', type: 'Dolsy', process: 'Pre', direction: 'Black', size: 'Pre' },
  { code: '12000124', name: 'Pre OLV Baldiat Black', type: 'Baldiat', process: 'Pre', direction: 'Black', size: 'Pre' },
  { code: '12000125', name: 'Pre OLV Senara Black', type: 'Senara', process: 'Pre', direction: 'Black', size: 'Pre' },
  { code: '12000126', name: 'Pre OLV Sers Cola Black', type: 'Sers Cola', process: 'Pre', direction: 'Black', size: 'Pre' },
  { code: '12000127', name: 'Pre OLV Azizi Black', type: 'Azizi', process: 'Pre', direction: 'Black', size: 'Pre' },
  { code: '12000128', name: 'Pre OLV Akas Black', type: 'Akas', process: 'Pre', direction: 'Black', size: 'Pre' },
  { code: '12000129', name: 'Pre OLV Kobrosi Black', type: 'Kobrosi', process: 'Pre', direction: 'Black', size: 'Pre' },
  { code: '12000130', name: 'Pre OLV Karotina Black', type: 'Karotina', process: 'Pre', direction: 'Black', size: 'Pre' },
  { code: '12000131', name: 'Pre OLV Kalamata Black', type: 'Kalamata', process: 'Pre', direction: 'Black', size: 'Pre' },
  { code: '12000132', name: 'Pre OLV Manzanilla Black', type: 'Manzanilla', process: 'Pre', direction: 'Black', size: 'Pre' },
  { code: '12000133', name: 'Pre OLV Nour Sabah Black', type: 'Nour Sabah', process: 'Pre', direction: 'Black', size: 'Pre' },
  { code: '12002038', name: 'Pre OLV Karotina Mesh. Black', type: 'Karotina', process: 'Pre', direction: 'Black', size: 'Mesh.' },

  // Grd
  { code: '12000134', name: 'Grd OLV Picual Green L', type: 'Picual', process: 'Grd', direction: 'Green', size: 'L' },
  { code: '12000141', name: 'Grd OLV Azizi Green L', type: 'Azizi', process: 'Grd', direction: 'Green', size: 'L' },
  { code: '12000142', name: 'Grd OLV Akas Green L', type: 'Akas', process: 'Grd', direction: 'Green', size: 'L' },
  { code: '12000146', name: 'Grd OLV Manzanilla Green L', type: 'Manzanilla', process: 'Grd', direction: 'Green', size: 'L' },
  { code: '12000148', name: 'Grd OLV Picual Green M', type: 'Picual', process: 'Grd', direction: 'Green', size: 'M' },
  { code: '12000155', name: 'Grd OLV Azizi Green M', type: 'Azizi', process: 'Grd', direction: 'Green', size: 'M' },
  { code: '12000156', name: 'Grd OLV Akas Green M', type: 'Akas', process: 'Grd', direction: 'Green', size: 'M' },
  { code: '12000158', name: 'Grd OLV Karotina Green M', type: 'Karotina', process: 'Grd', direction: 'Green', size: 'M' },
  { code: '12000160', name: 'Grd OLV Manzanilla Green M', type: 'Manzanilla', process: 'Grd', direction: 'Green', size: 'M' },
  { code: '12000163', name: 'Grd OLV Picual Green S', type: 'Picual', process: 'Grd', direction: 'Green', size: 'S' },
  { code: '12000169', name: 'Grd OLV Azizi Green S', type: 'Azizi', process: 'Grd', direction: 'Green', size: 'S' },
  { code: '12000170', name: 'Grd OLV Akas Green S', type: 'Akas', process: 'Grd', direction: 'Green', size: 'S' },
  { code: '12000172', name: 'Grd OLV Karotina Green S', type: 'Karotina', process: 'Grd', direction: 'Green', size: 'S' },
  { code: '12000174', name: 'Grd OLV Manzanilla Green S', type: 'Manzanilla', process: 'Grd', direction: 'Green', size: 'S' },
  { code: '12000175', name: 'Grd OLV Nour Sabah Green S', type: 'Nour Sabah', process: 'Grd', direction: 'Green', size: 'S' },
  { code: '12000176', name: 'Grd OLV Picual Black L', type: 'Picual', process: 'Grd', direction: 'Black', size: 'L' },
  { code: '12000177', name: 'Grd OLV Tofahi Black L', type: 'Tofahi', process: 'Grd', direction: 'Black', size: 'L' },
  { code: '12000180', name: 'Grd OLV Baldiat Black L', type: 'Baldiat', process: 'Grd', direction: 'Black', size: 'L' },
  { code: '12000184', name: 'Grd OLV Akas Black L', type: 'Akas', process: 'Grd', direction: 'Black', size: 'L' },
  { code: '12000185', name: 'Grd OLV Kobrosi Black L', type: 'Kobrosi', process: 'Grd', direction: 'Black', size: 'L' },
  { code: '12000187', name: 'Grd OLV Kalamata Black L', type: 'Kalamata', process: 'Grd', direction: 'Black', size: 'L' },
  { code: '12000188', name: 'Grd OLV Manzanilla Black L', type: 'Manzanilla', process: 'Grd', direction: 'Black', size: 'L' },
  { code: '12000190', name: 'Grd OLV Picual Black M', type: 'Picual', process: 'Grd', direction: 'Black', size: 'M' },
  { code: '12000194', name: 'Grd OLV Baldiat Black M', type: 'Baldiat', process: 'Grd', direction: 'Black', size: 'M' },
  { code: '12000197', name: 'Grd OLV Azizi Black M', type: 'Azizi', process: 'Grd', direction: 'Black', size: 'M' },
  { code: '12000198', name: 'Grd OLV Akas Black M', type: 'Akas', process: 'Grd', direction: 'Black', size: 'M' },
  { code: '12000199', name: 'Grd OLV Kobrosi Black M', type: 'Kobrosi', process: 'Grd', direction: 'Black', size: 'M' },
  { code: '12000201', name: 'Grd OLV Kalamata Black M', type: 'Kalamata', process: 'Grd', direction: 'Black', size: 'M' },
  { code: '12000202', name: 'Grd OLV Manzanilla Black M', type: 'Manzanilla', process: 'Grd', direction: 'Black', size: 'M' },
  { code: '12000204', name: 'Grd OLV Picual Black S', type: 'Picual', process: 'Grd', direction: 'Black', size: 'S' },
  { code: '12000208', name: 'Grd OLV Baldiat Black S', type: 'Baldiat', process: 'Grd', direction: 'Black', size: 'S' },
  { code: '12000211', name: 'Grd OLV Azizi Black S', type: 'Azizi', process: 'Grd', direction: 'Black', size: 'S' },
  { code: '12000212', name: 'Grd OLV Akas Black S', type: 'Akas', process: 'Grd', direction: 'Black', size: 'S' },
  { code: '12000213', name: 'Grd OLV Kobrosi Black S', type: 'Kobrosi', process: 'Grd', direction: 'Black', size: 'S' },
  { code: '12000215', name: 'Grd OLV Kalamata Black S', type: 'Kalamata', process: 'Grd', direction: 'Black', size: 'S' },
  { code: '12000216', name: 'Grd OLV Manzanilla Black S', type: 'Manzanilla', process: 'Grd', direction: 'Black', size: 'S' },
  { code: '12002009', name: 'Grd OLV Picual Black XXXS', type: 'Picual', process: 'Grd', direction: 'Black', size: 'XXXS' },
  { code: '12002010', name: 'Grd OLV Picual Green XXXS', type: 'Picual', process: 'Grd', direction: 'Green', size: 'XXXS' },
  { code: '12002011', name: 'Grd OLV Azizi Black XXXS', type: 'Azizi', process: 'Grd', direction: 'Black', size: 'XXXS' },
  { code: '12002012', name: 'Grd OLV Azizi Green XXXS', type: 'Azizi', process: 'Grd', direction: 'Green', size: 'XXXS' },
  { code: '12002013', name: 'Grd OLV Akas Black XXXS', type: 'Akas', process: 'Grd', direction: 'Black', size: 'XXXS' },
  { code: '12002014', name: 'Grd OLV Akas Green XXXS', type: 'Akas', process: 'Grd', direction: 'Green', size: 'XXXS' },
  { code: '12002015', name: 'Grd OLV Kobrosi Black XXXS', type: 'Kobrosi', process: 'Grd', direction: 'Black', size: 'XXXS' },
  { code: '12002017', name: 'Grd OLV Manzanilla Black XXXS', type: 'Manzanilla', process: 'Grd', direction: 'Black', size: 'XXXS' },
  { code: '12002018', name: 'Grd OLV Manzanilla Green XXXS', type: 'Manzanilla', process: 'Grd', direction: 'Green', size: 'XXXS' },
  { code: '12002025', name: 'Grd OLV Kalamata Black XXXS', type: 'Kalamata', process: 'Grd', direction: 'Black', size: 'XXXS' },

  // PTD
  { code: '12000270', name: 'PTD OLV Azizi Black L', type: 'Azizi', process: 'PTD', direction: 'Black', size: 'L' },
  { code: '12000288', name: 'PTD OLV Kalamata Black M', type: 'Kalamata', process: 'PTD', direction: 'Black', size: 'M' },
  { code: '12000289', name: 'PTD OLV Manzanilla Black M', type: 'Manzanilla', process: 'PTD', direction: 'Black', size: 'M' },
  { code: '12000305', name: 'PTD OLV Picual Green L', type: 'Picual', process: 'PTD', direction: 'Green', size: 'L' },
  { code: '12000312', name: 'PTD OLV Azizi Green L', type: 'Azizi', process: 'PTD', direction: 'Green', size: 'L' },
  { code: '12000313', name: 'PTD OLV Akas Green L', type: 'Akas', process: 'PTD', direction: 'Green', size: 'L' },
  { code: '12000319', name: 'PTD OLV Picual Green M', type: 'Picual', process: 'PTD', direction: 'Green', size: 'M' },
  { code: '12000326', name: 'PTD OLV Azizi Green M', type: 'Azizi', process: 'PTD', direction: 'Green', size: 'M' },
  { code: '12000327', name: 'PTD OLV Akas Green M', type: 'Akas', process: 'PTD', direction: 'Green', size: 'M' },
  { code: '12000331', name: 'PTD OLV Manzanilla Green M', type: 'Manzanilla', process: 'PTD', direction: 'Green', size: 'M' },
  { code: '12000332', name: 'PTD OLV Nour Sabah Green M', type: 'Nour Sabah', process: 'PTD', direction: 'Green', size: 'M' },
  { code: '12000341', name: 'PTD OLV Akas Green S', type: 'Akas', process: 'PTD', direction: 'Green', size: 'S' },

  // FARZA / Bi Products
  { code: '13000001', name: 'Bi Products Pepper', type: 'Pepper', process: 'FARZA', direction: 'Any', size: 'N/A' },
  { code: '13000021', name: 'Bi Products OLV FARZA', type: 'Other', process: 'FARZA', direction: 'Any', size: 'N/A' },
  { code: '13000101', name: 'Bi Product OLV bits', type: 'Other', process: 'FARZA', direction: 'Any', size: 'N/A' },
  { code: '13000102', name: 'Bi Products OLV XXS', type: 'Other', process: 'FARZA', direction: 'Any', size: 'XXS' },
  { code: '13000120', name: 'Bi Product OLV PTD', type: 'Other', process: 'FARZA', direction: 'Any', size: 'N/A' },
  { code: '13000121', name: 'Bi Product OLV SLC', type: 'Other', process: 'FARZA', direction: 'Any', size: 'N/A' },
  { code: '13000122', name: 'Bi Products Cauliflower', type: 'Cauliflower', process: 'FARZA', direction: 'Any', size: 'N/A' },
];


const ShortcutSelector = ({ 
  filters, 
  setFilters, 
  selectedCode, 
  setSelectedCode,
  availableItems,
  title,
  lang,
  themeColor = 'emerald',
  enforcedType = '',
  searchTerm = '',
  setSearchTerm
}: { 
  filters: any, 
  setFilters: any, 
  selectedCode: string, 
  setSelectedCode: any,
  availableItems: ProcessItem[],
  title: string,
  lang: Language,
  themeColor?: 'emerald' | 'blue',
  enforcedType?: string,
  searchTerm?: string,
  setSearchTerm?: (val: string) => void
}) => {
  const isRtl = lang === 'ar';
  const accentClass = themeColor === 'emerald' ? 'emerald' : 'blue';

  // Auto-selection mechanism based on the 4 filter choices:
  // Whenever the available filtered items list changes:
  useEffect(() => {
    const hasAnyFilter = !!(filters.process || filters.direction || filters.type || filters.size);
    
    if (availableItems.length === 1) {
      // If exactly one item matches the current filters, select it automatically!
      if (selectedCode !== availableItems[0].code) {
        setSelectedCode(availableItems[0].code);
      }
    } else if (availableItems.length > 1) {
      // If there are multiple items, check if the currently selected code is still valid according to the new filters
      const currentValid = availableItems.some(item => item.code === selectedCode);
      if (selectedCode && !currentValid) {
        // Clear if the current code is no longer a valid result under the new filters
        setSelectedCode('');
      } else if (!selectedCode && hasAnyFilter) {
        // If nothing is selected, check if we have a very precise matching state where all 4 filters are filled
        const allFiltersSet = !!(filters.process && filters.direction && filters.type && filters.size);
        if (allFiltersSet) {
          // Select the first matched item as the sensible default
          setSelectedCode(availableItems[0].code);
        }
      }
    } else {
      // If no items match, clear the selection
      if (selectedCode) {
        setSelectedCode('');
      }
    }
  }, [availableItems, filters, selectedCode, setSelectedCode]);

  // Find the currently selected item object to display its detailed info or a success indicator
  const selectedItem = availableItems.find(item => item.code === selectedCode);

  return (
    <div className={`p-5 rounded-3xl bg-${accentClass}-50/30 dark:bg-${accentClass}-900/10 border border-${accentClass}-100 dark:border-${accentClass}-900/30 space-y-5 shadow-sm`}>
      <h3 className={`font-bold text-${accentClass}-600 dark:text-${accentClass}-400 flex items-center gap-2 text-sm uppercase tracking-wider`}>
        {themeColor === 'emerald' ? <ArrowRight size={16} className={isRtl ? 'rotate-180' : ''} /> : <CheckCircle2 size={16} />}
        {title}
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Process Select */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase">{isRtl ? 'التشغيل' : 'Process'}</span>
          <select 
            value={filters.process}
            onChange={(e) => { 
              setFilters({ ...filters, process: e.target.value });
            }}
            className="w-full px-2 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="">{isRtl ? '-- التشغيل --' : '-- Process --'}</option>
            {CATEGORIES.process.map(c => <option key={c.id} value={c.id}>{isRtl ? c.labelAr : c.labelEn}</option>)}
          </select>
        </div>

        {/* Direction Select */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase">{isRtl ? 'التوجيه' : 'Direction'}</span>
          <select 
            value={filters.direction}
            onChange={(e) => {
              setFilters({ ...filters, direction: e.target.value });
            }}
            className="w-full px-2 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="">{isRtl ? '-- التوجيه --' : '-- Direction --'}</option>
            {CATEGORIES.direction.map(c => <option key={c.id} value={c.id}>{isRtl ? c.labelAr : c.labelEn}</option>)}
          </select>
        </div>

        {/* Type Select */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase">{isRtl ? 'النوع' : 'Type'}</span>
          <select 
            value={filters.type}
            disabled={!!enforcedType && themeColor === 'blue'}
            onChange={(e) => {
              setFilters({ ...filters, type: e.target.value });
            }}
            className={`w-full px-2 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-1 focus:ring-emerald-500 outline-none ${!!enforcedType && themeColor === 'blue' ? 'opacity-70 cursor-not-allowed bg-zinc-100 dark:bg-zinc-700' : ''}`}
          >
            <option value="">{isRtl ? '-- النوع --' : '-- Type --'}</option>
            {CATEGORIES.type.map(c => <option key={c.id} value={c.id}>{isRtl ? c.labelAr : c.labelEn}</option>)}
          </select>
        </div>

        {/* Size Select */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase">{isRtl ? 'المقاس' : 'Size'}</span>
          <select 
            value={filters.size}
            onChange={(e) => {
              setFilters({ ...filters, size: e.target.value });
            }}
            className="w-full px-2 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="">{isRtl ? '-- المقاس --' : '-- Size --'}</option>
            {CATEGORIES.size.map(c => <option key={c.id} value={c.id}>{isRtl ? c.labelAr : c.labelEn}</option>)}
          </select>
        </div>
      </div>

      {/* Selected Item Feedback Indicator */}
      {selectedItem && (
        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 animate-bounce" />
            <span className="font-extrabold text-zinc-700 dark:text-zinc-200">
              {isRtl 
                ? `تم اختيار: ${selectedItem.name}` 
                : `Selected: ${selectedItem.name}`}
            </span>
          </div>
          <span className="font-mono bg-emerald-100/50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-lg">
            {selectedItem.code}
          </span>
        </div>
      )}

      {/* Global Search and Select */}
      <div className="space-y-3 bg-white/50 dark:bg-black/20 p-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
          {/* Text Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input 
              type="text"
              placeholder={isRtl ? 'بحث باسم الصنف أو الكود...' : 'Search by name or code...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm?.(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">{isRtl ? 'أو اختر الصنف يدوياً من نتائج المطابقة' : 'Or Select Item Manually from Matching Results'}</span>
            <select 
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">{isRtl ? `--- نتائج التصفية (${availableItems.length}) ---` : `--- Filter Results (${availableItems.length}) ---`}</option>
                {availableItems.map(item => (
                  <option key={item.code} value={item.code}>{item.code} - {item.name}</option>
                ))}
              </select>
              {availableItems.length === 0 && (filters.process || filters.direction || filters.type || filters.size || searchTerm) && (
                <p className="text-[10px] text-red-500 mt-1 italic font-medium">
                  {isRtl ? 'لا يوجد صنف يطابق هذه المعايير' : 'No item matches these criteria'}
                </p>
              )}
          </div>
      </div>
    </div>
  );
};

export default function ThirdPartyProcessing({ lang, user }: ThirdPartyProcessingProps) {
  const hasRole = (rolesToCheck: string | string[]) => {
    const userRoles = user?.roles || (user?.role ? [user.role] : []);
    if (Array.isArray(rolesToCheck)) {
      return rolesToCheck.some(r => userRoles.includes(r as any));
    }
    return userRoles.includes(rolesToCheck as any);
  };

  const canEditJob = (job: ProcessingJob) => {
    if (hasRole('Admin')) return true;
    if (job.status === 'Completed' || job.status === 'Rejected') return false;

    // Warehouse Operations can edit in all active stages
    if (hasRole('Warehouse Operations')) return true;

    // Creator can only edit if status is Pending Warehouse
    if (job.createdBy === user?.uid && job.status === 'Pending Warehouse') return true;

    // Purchasing Operations can edit in Pending Purchasing
    if (hasRole('Purchasing Operations') && job.status === 'Pending Purchasing') return true;

    return false;
  };

  const t = translations[lang];
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [dynamicItems, setDynamicItems] = useState<ProcessItem[]>(PROCESS_ITEMS_LIST);

  const getOperationLabel = (op: string | undefined) => {
    if (!op) return '';
    if (op === 'Grading') return lang === 'ar' ? 'تدريج' : 'Grading';
    if (op === 'PittingAndSlicing') return lang === 'ar' ? 'خلي وشرائح' : 'Pitting & Slicing';
    if (op === 'Other') return lang === 'ar' ? 'أخرى' : 'Other';
    return op;
  };

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ uid: doc.id, id: doc.id, ...doc.data() })) as UserProfile[];
      setUsers(usersData);
    });
    return () => unsubscribe();
  }, []);
  const [isAdding, setIsAdding] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toEmails, setToEmails] = useState<string[]>(['Khaled.Shaaban@RichLandfi.com']);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [emailType, setEmailType] = useState<'to' | 'cc'>('to');

  // Excel importing and mode selection states
  const [showImportConfirmation, setShowImportConfirmation] = useState(false);
  const [itemsToImport, setItemsToImport] = useState<ProcessItem[]>([]);
  const [importFileName, setImportFileName] = useState('');

  // States for manual custom item additions
  const [showManualAddItem, setShowManualAddItem] = useState(false);
  const [manualItem, setManualItem] = useState<Omit<ProcessItem, 'code' | 'name'>>({
    type: 'Picual',
    process: 'Gen',
    direction: 'Any',
    size: 'Gen'
  });
  const [manualItemCode, setManualItemCode] = useState('');
  const [manualItemName, setManualItemName] = useState('');
  
  const [newJob, setNewJob] = useState<Omit<ProcessingJob, 'id' | 'createdAt' | 'createdBy'>>({
    date: new Date().toISOString().split('T')[0],
    warehouseId: '',
    warehouseName: '',
    warehouseCode: '',
    inputs: [],
    outputs: [],
    scrapQty: 0,
    farzaQty: 0,
    seedQty: 0,
    wasteQty: 0,
    status: 'Pending Warehouse',
    notes: '',
    qualityComments: '',
    poNumber: '',
    confirmedPrice: 0,
    processOperation: ''
  });

  const [jobActionsState, setJobActionsState] = useState<{
    [jobId: string]: {
      qualityComments?: string;
      confirmedPrice?: number;
      poNumber?: string;
      defectForeignBodies?: number;
      defectOlivesInsects?: number;
      defectSoftTexture?: number;
      defectBadColor?: number;
      defectOlivesStem?: number;
      defectSkinDefect?: number;
      defectGasPocket?: number;
      defectOlivesLoseSkin?: number;
      defectOtherVariety?: number;
      defectTotalDefect?: number;
      defectComments?: string;
      slicingTime?: string;
      slicingWeightPerKg?: string;
      slicingPreProdBroken?: number;
      slicingPitDefects?: number;
      slicingBrokenOlives?: number;
      slicingPits?: number;
      slicingTotalRejected?: number;
      slicingFloatSalinity?: string;
      slicingAction?: string;
      slicingProduction?: string;
      slicingQualityControl?: string;
    }
  }>({});

  const [expandedJobs, setExpandedJobs] = useState<{[jobId: string]: boolean}>({});

  const toggleJobExpanded = (jobId: string) => {
    setExpandedJobs(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  const handleUpdateManualPrice = async (jobId: string, newPrice: number) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.THIRD_PARTY_PROCESSING, jobId), {
        confirmedPrice: newPrice,
        serverTimestamp: serverTimestamp()
      });
      toast.success(lang === 'ar' ? 'تم تحديث السعر بنجاح' : 'Price updated successfully');
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل تحديث السعر' : 'Failed to update price');
    }
  };

  const handleUpdateJobActionState = (jobId: string, field: string, value: any) => {
    setJobActionsState(prev => ({
      ...prev,
      [jobId]: {
        ...prev[jobId],
        [field]: value
      }
    }));
  };

  const handleUpdateDefect = (jobId: string, field: string, valueStr: string) => {
    const val = valueStr === '' ? undefined : parseFloat(valueStr);
    
    setJobActionsState(prev => ({
      ...prev,
      [jobId]: {
        ...(prev[jobId] || {}),
        [field]: val
      }
    }));
  };

  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    systemCode: '',
    supplierCode: '',
    processingPricePerKg: '',
    contactName: '',
    whatsappGroup: ''
  });
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);

  const [inputFilters, setInputFilters] = useState({ process: '', direction: '', type: '', size: '' });
  const [currentInput, setCurrentInput] = useState({ itemCode: '', quantity: 0, unit: 'kg' });
  
  const [outputFilters, setOutputFilters] = useState({ process: '', direction: '', type: '', size: '' });
  const [currentOutput, setCurrentOutput] = useState({ itemCode: '', quantity: 0, unit: 'kg' });

  // Enforce same type for output as inputs
  const enforcedType = newJob.inputs.length > 0 
    ? dynamicItems.find(i => i.code === newJob.inputs[0].itemCode)?.type || '' 
    : '';

  useEffect(() => {
    if (enforcedType) {
      setOutputFilters(prev => ({ ...prev, type: enforcedType }));
    }
  }, [enforcedType]);

  // Filter items matching the selection
  const getFilteredItems = (filters: typeof inputFilters, search: string = '') => {
    // Robust normalization for Arabic and general text
    const normalize = (text: string) => {
      if (!text) return "";
      let normalized = text.toLowerCase().trim();
      
      // Arabic normalization: Alef, Teh Marbuta, Yeh, Kashida
      normalized = normalized
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/ئ/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/\u0640/g, ''); // Remove Arabic Kashida
        
      // Also remove common punctuation that might interfere with word matching
      normalized = normalized.replace(/[._\-/\\]/g, ' ');
      return normalized.trim().replace(/\s+/g, ' ');
    };

    const getTargetInfo = (val: string, categoryKey: keyof typeof CATEGORIES) => {
      const category = CATEGORIES[categoryKey] as any[];
      const normVal = normalize(val);
      if (!normVal) return null;

      const matchedEntry = category.find(c => {
        const cId = normalize(c.id);
        const cAr = normalize(c.labelAr);
        const cEn = normalize(c.labelEn);
        const aliases = (c.aliases || []).map((a: string) => normalize(a));

        return (
          cId === normVal || 
          cAr === normVal || 
          cEn === normVal ||
          aliases.includes(normVal) ||
          (c.labelAr.includes('/') && c.labelAr.split('/').some((p: string) => normalize(p) === normVal)) ||
          (c.labelEn.includes('/') && c.labelEn.split('/').some((p: string) => normalize(p) === normVal))
        );
      });

      if (!matchedEntry) return null;

      const allTerms = new Set<string>();
      allTerms.add(normalize(matchedEntry.id));
      allTerms.add(normalize(matchedEntry.labelAr));
      allTerms.add(normalize(matchedEntry.labelEn));
      if (matchedEntry.aliases) matchedEntry.aliases.forEach((a: string) => allTerms.add(normalize(a)));
      if (matchedEntry.labelAr.includes('/')) matchedEntry.labelAr.split('/').forEach((p: string) => allTerms.add(normalize(p)));
      if (matchedEntry.labelEn.includes('/')) matchedEntry.labelEn.split('/').forEach((p: string) => allTerms.add(normalize(p)));

      return { id: matchedEntry.id, terms: allTerms };
    };

    const matchesFilter = (itemValue: string, filterValue: string, categoryKey: keyof typeof CATEGORIES, itemName: string, itemProcess?: string) => {
      if (!filterValue) return true;

      const normItemName = itemName.toLowerCase();
      const isFarzaName = normItemName.includes('farza') || 
                          normItemName.includes('bi product') || 
                          normItemName.includes('bi products') || 
                          itemName.includes('فرزة') || 
                          itemName.includes('فرزه');
      
      const isFarza = itemProcess === 'FARZA' || isFarzaName;

      // Special exception: FARZA items are general and can bypass type, size, or direction filter restrictions
      if (isFarza && (categoryKey === 'type' || categoryKey === 'size' || categoryKey === 'direction')) {
        return true;
      }

      // If filtering by process and the filter is 'FARZA', also accept any item that is Farza by name
      if (categoryKey === 'process' && filterValue === 'FARZA' && isFarza) {
        return true;
      }

      const filtInfo = getTargetInfo(filterValue, categoryKey);
      if (!filtInfo) return true; // Shouldn't happen but fallback to match all

      // Check if the filter itself is a generic "Any" or "Other" placeholder
      const genericTerms = ['any', 'gen', 'general', 'other', 'others', 'na', 'all', 'الكل', 'اي', 'اخري', 'اخرى'];
      if (genericTerms.includes(normalize(filtInfo.id))) return true;

      const itemInfo = itemValue ? getTargetInfo(itemValue, categoryKey) : null;

      // 1. STRICT CATEGORY CHECK
      // If the item has a specific category assigned (e.g. SLC) and it's DIFFERENT from the filter (e.g. Pre)
      // we reject it immediately. This prevents Slices appearing when selecting Raw/Pre.
      if (itemInfo) {
        if (itemInfo.id === filtInfo.id) return true;
        
        // If they are different specific categories, don't fallback to name-matching
        const isItemGeneric = genericTerms.includes(normalize(itemInfo.id));
        if (!isItemGeneric) return false;
      }

      // 2. NAME MATCHING FALLBACK
      // If item property is missing or generic (like 'Any'), check the item name for indicators.
      const nameNorm = normalize(itemName);
      const nameWords = nameNorm.split(/\s+/).filter(Boolean);

      for (const term of filtInfo.terms) {
        if (term.length <= 2) {
          // Word-level check for short strings (M, S, L, etc) to avoid partial matches
          if (nameWords.includes(term)) return true;
        } else {
          // Substring match for longer terms
          if (nameNorm.includes(term)) return true;
        }
      }

      return false;
    };

    return dynamicItems.filter(item => {
      // 1. Check Dropdown Filters (Must match all selected)
      if (!matchesFilter(item.process, filters.process, 'process', item.name, item.process)) return false;
      if (!matchesFilter(item.direction, filters.direction, 'direction', item.name, item.process)) return false;
      if (!matchesFilter(item.type, filters.type, 'type', item.name, item.process)) return false;
      if (!matchesFilter(item.size, filters.size, 'size', item.name, item.process)) return false;

      // 2. Check Global Text Search (Search against code, name, and attributes)
      if (search) {
        const searchWords = normalize(search).split(/\s+/).filter(Boolean);
        const itemCodeNorm = normalize(item.code);
        const itemNameNorm = normalize(item.name);
        
        // Match each word against all possible attributes of the item
        const matchesAllSearchWords = searchWords.every(word => {
          if (itemCodeNorm.includes(word)) return true;
          if (itemNameNorm.includes(word)) return true;
          
          // Check if word matches any of the item's property categories
          const checkWordInProperty = (propValue: string, key: keyof typeof CATEGORIES) => {
            const info = getTargetInfo(propValue, key);
            return info?.terms.has(word);
          };

          if (checkWordInProperty(item.process, 'process')) return true;
          if (checkWordInProperty(item.direction, 'direction')) return true;
          if (checkWordInProperty(item.type, 'type')) return true;
          if (checkWordInProperty(item.size, 'size')) return true;
          
          return false;
        });

        if (!matchesAllSearchWords) return false;
      }
      
      return true;
    });
  };

  const [inputSearch, setInputSearch] = useState('');
  const [outputSearch, setOutputSearch] = useState('');

  const availableInputItems = getFilteredItems(inputFilters, inputSearch);
  const availableOutputItems = getFilteredItems(outputFilters, outputSearch);

  // Auto-select item if only one result remains
  useEffect(() => {
    if (availableInputItems.length === 1 && !currentInput.itemCode) {
      setCurrentInput(prev => ({ ...prev, itemCode: availableInputItems[0].code }));
    }
  }, [availableInputItems, currentInput.itemCode]);

  useEffect(() => {
    if (availableOutputItems.length === 1 && !currentOutput.itemCode) {
      setCurrentOutput(prev => ({ ...prev, itemCode: availableOutputItems[0].code }));
    }
  }, [availableOutputItems, currentOutput.itemCode]);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.THIRD_PARTY_PROCESSING), 
      orderBy('date', 'desc')
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProcessingJob));
      setJobs(jobsData);
    });

    const unsubWh = onSnapshot(collection(db, COLLECTIONS.WAREHOUSES), (snap) => {
      setWarehouses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse)));
    });

    // Load Email Settings
    const unsubSettings = onSnapshot(doc(db, COLLECTIONS.SETTINGS, 'processing_emails'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.to) setToEmails(data.to);
        if (data.cc) setCcEmails(data.cc);
      }
    });

    // Load Dynamic Items
    const unsubItems = onSnapshot(collection(db, COLLECTIONS.PROCESS_ITEMS), (snap) => {
      if (!snap.empty) {
        const dbItems = snap.docs.map(d => d.data() as ProcessItem);
        const mergedMap = new Map<string, ProcessItem>();
        
        // Load defaults first to ensure they are always present
        PROCESS_ITEMS_LIST.forEach(item => {
          mergedMap.set(item.code, item);
        });
        
        // Override with DB items (DB items take precedence)
        dbItems.forEach(item => {
          mergedMap.set(item.code, item);
        });
        
        setDynamicItems(Array.from(mergedMap.values()));
      } else {
        setDynamicItems(PROCESS_ITEMS_LIST);
      }
    });
    
    return () => {
      unsub();
      unsubWh();
      unsubSettings();
      unsubItems();
    };
  }, []);

  const handleAddInput = () => {
    if (!currentInput.itemCode || currentInput.quantity <= 0) {
      toast.error(lang === 'ar' ? 'يرجى اختيار صنف وكمية صالحة' : 'Please select an item and a valid quantity');
      return;
    }
    const item = dynamicItems.find(i => i.code === currentInput.itemCode);
    setNewJob({
      ...newJob,
      inputs: [...newJob.inputs, { ...currentInput, itemName: item?.name || '' }]
    });
    setCurrentInput({ itemCode: '', quantity: 0, unit: 'kg' });
  };

  const handleAddOutput = () => {
    if (!currentOutput.itemCode || currentOutput.quantity <= 0) {
      toast.error(lang === 'ar' ? 'يرجى اختيار صنف وكمية صالحة' : 'Please select an item and a valid quantity');
      return;
    }
    const item = dynamicItems.find(i => i.code === currentOutput.itemCode);
    setNewJob({
      ...newJob,
      outputs: [...newJob.outputs, { ...currentOutput, itemName: item?.name || '' }]
    });
    setCurrentOutput({ itemCode: '', quantity: 0, unit: 'kg' });
  };

  const removeInput = (index: number) => {
    const updatedInputs = [...newJob.inputs];
    updatedInputs.splice(index, 1);
    setNewJob({ ...newJob, inputs: updatedInputs });
  };

  const removeOutput = (index: number) => {
    const updatedOutputs = [...newJob.outputs];
    updatedOutputs.splice(index, 1);
    setNewJob({ ...newJob, outputs: updatedOutputs });
  };

  const handleAddWarehouse = async () => {
    if (!newWarehouse.name || !newWarehouse.systemCode) {
      toast.error(lang === 'ar' ? 'يرجى إدخال اسم المخزن وكود النظام' : 'Please enter warehouse name and system code');
      return;
    }
    try {
      const warehouseData = {
        ...newWarehouse,
        processingPricePerKg: newWarehouse.processingPricePerKg ? parseFloat(newWarehouse.processingPricePerKg) : 0
      };

      if (editingWarehouseId) {
        await updateDoc(doc(db, COLLECTIONS.WAREHOUSES, editingWarehouseId), {
          ...warehouseData,
          updatedAt: new Date().toISOString()
        });
        toast.success(lang === 'ar' ? 'تم تحديث المخزن بنجاح' : 'Warehouse updated successfully');
      } else {
        await addDoc(collection(db, COLLECTIONS.WAREHOUSES), {
          ...warehouseData,
          createdAt: new Date().toISOString()
        });
        toast.success(lang === 'ar' ? 'تم إضافة المخزن بنجاح' : 'Warehouse added successfully');
      }
      
      setNewWarehouse({ 
        name: '', 
        systemCode: '', 
        supplierCode: '',
        processingPricePerKg: '',
        contactName: '', 
        whatsappGroup: '' 
      });
      setEditingWarehouseId(null);
    } catch (e) {
      toast.error(lang === 'ar' ? 'فشل العملية' : 'Operation failed');
    }
  };

  const startEditingWarehouse = (w: Warehouse) => {
    setNewWarehouse({
      name: w.name,
      systemCode: w.systemCode,
      supplierCode: w.supplierCode || '',
      processingPricePerKg: w.processingPricePerKg?.toString() || '',
      contactName: w.contactName || '',
      whatsappGroup: w.whatsappGroup || ''
    });
    setEditingWarehouseId(w.id);
  };

  const handleDeleteWarehouse = async (id: string) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا المخزن؟' : 'Are you sure you want to delete this warehouse?')) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.WAREHOUSES, id));
      toast.success(lang === 'ar' ? 'تم حذف المخزن' : 'Warehouse deleted');
    } catch (e) {
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Deletion failed');
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error(lang === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح' : 'Please enter a valid email');
      return;
    }
    
    if (toEmails.includes(newEmail) || ccEmails.includes(newEmail)) {
      toast.error(lang === 'ar' ? 'البريد موجود بالفعل' : 'Email already exists');
      return;
    }
    
    const updatedTo = emailType === 'to' ? [...toEmails, newEmail] : toEmails;
    const updatedCc = emailType === 'cc' ? [...ccEmails, newEmail] : ccEmails;
    
    try {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'processing_emails'), {
        to: updatedTo,
        cc: updatedCc,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setNewEmail('');
      toast.success(lang === 'ar' ? 'تم إضافة البريد بنجاح' : 'Email added successfully');
    } catch (e) {
      toast.error(lang === 'ar' ? 'فشل حفظ الإعدادات' : 'Failed to save settings');
    }
  };

  const handleRemoveEmail = async (email: string, type: 'to' | 'cc') => {
    const updatedTo = type === 'to' ? toEmails.filter(e => e !== email) : toEmails;
    const updatedCc = type === 'cc' ? ccEmails.filter(e => e !== email) : ccEmails;
    
    try {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'processing_emails'), {
        to: updatedTo,
        cc: updatedCc,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success(lang === 'ar' ? 'تم حذف البريد' : 'Email removed');
    } catch (e) {
      toast.error(lang === 'ar' ? 'فشل التحديث' : 'Update failed');
    }
  };

  const handleImportItems = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
          toast.error(lang === 'ar' ? 'الملف فارغ' : 'File is empty');
          return;
        }

        const newItems: ProcessItem[] = jsonData.map(row => {
          const code = row.code || row['كود'] || row['الكود'];
          const name = row.item || row['صنف'] || row['الصنف'] || row.name || row['الأصناف'];
          
          if (!code || !name) return null;

          return {
            code: String(code),
            name: String(name).trim(),
            type: row.type || row['النوع'] || '',
            process: row.process || row['العملية'] || 'Gen',
            direction: row.direction || row['الاتجاه'] || 'Any',
            size: row.size || row['المقاس'] || 'Gen'
          };
        }).filter(Boolean) as ProcessItem[];

        if (newItems.length === 0) {
          toast.error(lang === 'ar' ? 'لم يتم العثور على بيانات صالحة (كود وصنف)' : 'No valid data found (code and item)');
          return;
        }

        setItemsToImport(newItems);
        setShowImportConfirmation(true);
        event.target.value = ''; // Reset input
      } catch (err) {
        console.error('Import error:', err);
        toast.error(lang === 'ar' ? 'فشل قراءة الملف' : 'Failed to read file');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportJobDetailsExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let parsedInputs: Array<{ itemCode: string; itemName: string; quantity: number; unit: string; }> = [];
        let parsedOutputs: Array<{ itemCode: string; itemName: string; quantity: number; unit: string; }> = [];

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const rowData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          if (!rowData || rowData.length === 0) continue;

          let currentSection: 'inputs' | 'outputs' | 'none' = 'none';

          let hasTypeColumn = false;
          let typeColIdx = -1;
          let codeColIdx = -1;
          let nameColIdx = -1;
          let qtyColIdx = -1;
          let unitColIdx = -1;

          for (let r = 0; r < Math.min(5, rowData.length); r++) {
            const row = rowData[r];
            if (!Array.isArray(row)) continue;
            for (let c = 0; c < row.length; c++) {
              const val = String(row[c] || '').toLowerCase().trim();
              if (val.includes('حركة') || val.includes('النوع') || val.includes('القسم') || val.includes('type') || val.includes('direction') || val.includes('motion')) {
                hasTypeColumn = true;
                typeColIdx = c;
              }
              if (val.includes('كود') || val.includes('code')) {
                codeColIdx = c;
              }
              if (val.includes('صنف') || val.includes('item') || val.includes('name') || val.includes('الاسم')) {
                nameColIdx = c;
              }
              if (val.includes('كمية') || val.includes('qty') || val.includes('quantity') || val.includes('الوزن') || val.includes('weight')) {
                qtyColIdx = c;
              }
              if (val.includes('وحد') || val.includes('unit')) {
                unitColIdx = c;
              }
            }
            if (hasTypeColumn || (codeColIdx !== -1 && qtyColIdx !== -1)) {
              break; 
            }
          }

          if (hasTypeColumn && codeColIdx !== -1 && qtyColIdx !== -1) {
            for (let r = 0; r < rowData.length; r++) {
              const row = rowData[r];
              if (!Array.isArray(row) || row.length <= Math.max(typeColIdx, codeColIdx, qtyColIdx)) continue;
              
              const typeVal = String(row[typeColIdx] || '').toLowerCase().trim();
              const codeVal = String(row[codeColIdx] || '').toUpperCase().trim();
              const qtyVal = parseFloat(String(row[qtyColIdx] || ''));
              
              if (!codeVal || isNaN(qtyVal) || qtyVal <= 0) continue;
              if (codeVal.includes('كود') || codeVal.includes('CODE')) continue;

              const nameVal = nameColIdx !== -1 && row[nameColIdx] 
                ? String(row[nameColIdx]).trim() 
                : (dynamicItems.find(item => item.code === codeVal)?.name || codeVal);

              const unitVal = unitColIdx !== -1 && row[unitColIdx] ? String(row[unitColIdx]).trim() : 'kg';

              const isInput = typeVal.includes('مدخل') || typeVal.includes('in') || typeVal.includes('حظر') || typeVal.includes('خام');
              
              if (isInput) {
                parsedInputs.push({
                  itemCode: codeVal,
                  itemName: nameVal,
                  quantity: qtyVal,
                  unit: unitVal
                });
              } else {
                parsedOutputs.push({
                  itemCode: codeVal,
                  itemName: nameVal,
                  quantity: qtyVal,
                  unit: unitVal
                });
              }
            }
          } else {
            for (let r = 0; r < rowData.length; r++) {
              const row = rowData[r];
              if (!Array.isArray(row) || row.length === 0) continue;

              let switched = false;
              for (const cell of row) {
                const text = String(cell || '').trim();
                if (text === 'المدخلات' || text === 'Inputs' || text === 'المدخلات والمواد الخام' || text.toLowerCase() === 'inputs' || text.toLowerCase() === 'in' || text === 'المدخلات (In)') {
                  currentSection = 'inputs';
                  switched = true;
                  break;
                }
                if (text === 'المخرجات' || text === 'Outputs' || text === 'المخرجات والعناصر الناتجة' || text.toLowerCase() === 'outputs' || text.toLowerCase() === 'out' || text === 'المخرجات (Out)') {
                  currentSection = 'outputs';
                  switched = true;
                  break;
                }
              }

              if (switched) continue;

              if (currentSection === 'none') continue;

              let rowCode = '';
              let rowName = '';
              let rowQty = 0;
              let rowUnit = 'kg';

              const nonNullCells = row.map(v => v !== null && v !== undefined ? String(v).trim() : '');
              const numbersList = nonNullCells.map(v => parseFloat(v)).filter(n => !isNaN(n));
              
              for (const cell of nonNullCells) {
                if (!cell) continue;
                if (dynamicItems.some(i => i.code === cell)) {
                  rowCode = cell;
                  break;
                }
              }

              if (!rowCode && nonNullCells.length > 0) {
                for (const cell of nonNullCells) {
                  const num = parseFloat(cell);
                  if (isNaN(num) && cell.length >= 3 && cell.length <= 15 && (cell.includes('-') || /^[A-Z0-9_]+$/.test(cell))) {
                    rowCode = cell;
                    break;
                  }
                }
              }

              if (!rowCode && nonNullCells[0] && isNaN(parseFloat(nonNullCells[0])) && nonNullCells[0].length > 1) {
                const c0 = nonNullCells[0];
                if (!c0.includes('المدخلات') && !c0.includes('المخرجات') && !c0.includes('صنف') && !c0.includes('الكود') && !c0.includes('كود') && !c0.includes('Code') && !c0.includes('Item')) {
                  rowCode = c0;
                }
              }

              if (!rowCode) continue;

              const dbItem = dynamicItems.find(item => item.code === rowCode);
              rowName = dbItem ? dbItem.name : rowCode;

              for (const cell of nonNullCells) {
                if (!cell) continue;
                if (cell !== rowCode && isNaN(parseFloat(cell)) && cell.length > 2) {
                  const lower = cell.toLowerCase();
                  if (lower !== 'kg' && lower !== 'unit' && !lower.includes('كيلو') && !lower.includes('طن') && !lower.includes('كود') && !lower.includes('code') && !lower.includes('صنف') && !lower.includes('item')) {
                    rowName = cell;
                    break;
                  }
                }
              }

              if (numbersList.length > 0) {
                rowQty = numbersList[0];
              }

              if (rowQty <= 0) continue;

              for (const cell of nonNullCells) {
                const lower = cell.toLowerCase();
                if (lower === 'kg' || lower.includes('كيلو') || lower.includes('كجم')) {
                  rowUnit = 'kg';
                  break;
                }
                if (lower === 'pcs' || lower.includes('عدد') || lower.includes('قطعة')) {
                  rowUnit = 'pcs';
                  break;
                }
              }

              if (currentSection === 'inputs') {
                parsedInputs.push({
                  itemCode: rowCode,
                  itemName: rowName,
                  quantity: rowQty,
                  unit: rowUnit
                });
              } else if (currentSection === 'outputs') {
                parsedOutputs.push({
                  itemCode: rowCode,
                  itemName: rowName,
                  quantity: rowQty,
                  unit: rowUnit
                });
              }
            }
          }
        }

        const dedupInputsMap = new Map<string, typeof parsedInputs[0]>();
        parsedInputs.forEach(item => dedupInputsMap.set(item.itemCode, item));
        
        const dedupOutputsMap = new Map<string, typeof parsedOutputs[0]>();
        parsedOutputs.forEach(item => dedupOutputsMap.set(item.itemCode, item));

        const finalInputs = Array.from(dedupInputsMap.values());
        const finalOutputs = Array.from(dedupOutputsMap.values());

        if (finalInputs.length === 0 && finalOutputs.length === 0) {
          toast.error(lang === 'ar' 
            ? 'فشل العثور على أي مدخلات أو مخرجات صالحة في الملف. يرجى التأكد من احتواء الملف على قسم "المدخلات" وقسم "المخرجات".' 
            : 'Could not recognize any valid inputs or outputs in the Excel file. Please ensure it has "Inputs" and "Outputs" labels.'
          );
          return;
        }

        setNewJob(prev => ({
          ...prev,
          inputs: finalInputs,
          outputs: finalOutputs
        }));

        toast.success(lang === 'ar' 
          ? `تم استرجاع وتحديث بيانات التشغيل بالكامل! تم تعبئة ${finalInputs.length} مدخلات و ${finalOutputs.length} مخرجات بنجاح.` 
          : `Success! Fully updated job components with ${finalInputs.length} inputs and ${finalOutputs.length} outputs parsed from Excel.`
        );

        event.target.value = '';
      } catch (err) {
        console.error('Import job components error:', err);
        toast.error(lang === 'ar' ? 'فشل قراءة الملف أو تحليله' : 'Failed to parse processing job Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async (mode: 'replace' | 'merge') => {
    try {
      if (itemsToImport.length === 0) return;

      if (mode === 'replace') {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.PROCESS_ITEMS));
        const batch = writeBatch(db);
        querySnapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();

        const chunkSize = 500;
        for (let i = 0; i < itemsToImport.length; i += chunkSize) {
          const chunk = itemsToImport.slice(i, i + chunkSize);
          await Promise.all(chunk.map(item => 
            setDoc(doc(db, COLLECTIONS.PROCESS_ITEMS, item.code), item)
          ));
        }

        toast.success(lang === 'ar' 
          ? `تم استبدال الأصناف وتثبيت ${itemsToImport.length} صنف بنجاح` 
          : `Replaced items list with ${itemsToImport.length} items successfully`
        );
      } else {
        // Deduplicate locally
        const uniqueItemsMap = new Map<string, ProcessItem>();
        dynamicItems.forEach(item => uniqueItemsMap.set(item.code, item));
        itemsToImport.forEach(item => uniqueItemsMap.set(item.code, item));
        
        const finalizedItems = Array.from(uniqueItemsMap.values());

        const chunkSize = 500;
        for (let i = 0; i < finalizedItems.length; i += chunkSize) {
          const chunk = finalizedItems.slice(i, i + chunkSize);
          await Promise.all(chunk.map(item => 
            setDoc(doc(db, COLLECTIONS.PROCESS_ITEMS, item.code), item)
          ));
        }

        toast.success(lang === 'ar' 
          ? `تم استيراد ودمج ${itemsToImport.length} صنف بنجاح` 
          : `Merged and imported ${itemsToImport.length} items successfully`
        );
      }

      setShowImportConfirmation(false);
      setItemsToImport([]);
      setImportFileName('');
    } catch (err) {
      console.error('Import confirmation error:', err);
      toast.error(lang === 'ar' ? 'فشل استيراد الملف' : 'Failed to import file');
    }
  };

  const handleAddManualItem = async () => {
    if (!manualItemCode || !manualItemName) {
      toast.error(lang === 'ar' ? 'يرجى إدخال الكود والاسم بشكل صحيح' : 'Please enter code and name correctly');
      return;
    }

    try {
      await setDoc(doc(db, COLLECTIONS.PROCESS_ITEMS, manualItemCode.trim()), {
        code: manualItemCode.trim(),
        name: manualItemName.trim(),
        type: manualItem.type || 'Picual',
        process: manualItem.process || 'Gen',
        direction: manualItem.direction || 'Any',
        size: manualItem.size || 'Gen'
      });
      toast.success(lang === 'ar' ? 'تم إضافة الصنف الجديد بنجاح' : 'New item added successfully');
      setManualItemCode('');
      setManualItemName('');
      setManualItem({
        type: 'Picual',
        process: 'Gen',
        direction: 'Any',
        size: 'Gen'
      });
      setShowManualAddItem(false);
    } catch (e) {
      toast.error(lang === 'ar' ? 'فشل إضافة الصنف' : 'Failed to add item');
    }
  };

  const generateJobCode = async (wh: Warehouse, date: string) => {
    const prefix = (wh.contactName || wh.systemCode || wh.name.substring(0, 2)).toUpperCase();
    const dateParts = date.split('-'); 
    const yy = dateParts[0].substring(2);
    const mm = dateParts[1];
    const dd = dateParts[2];
    const dateStamp = `${dd}${mm}${yy}`;
    
    const q = query(
      collection(db, COLLECTIONS.THIRD_PARTY_PROCESSING),
      where('warehouseId', '==', wh.id),
      where('date', '==', date)
    );
    const snap = await getDocs(q);
    const sequence = snap.size + 1;
    const seqString = String(sequence).padStart(3, '0');
    
    return `${prefix}-${dateStamp}-${seqString}`;
  };

  const handleSaveJob = async () => {
    if (!newJob.warehouseId || newJob.inputs.length === 0 || newJob.outputs.length === 0) {
      toast.error(lang === 'ar' ? 'يرجى ملء جميع البيانات الأساسية والمدخلات والمخرجات' : 'Please fill all basic info, inputs, and outputs');
      return;
    }

    if (!newJob.processOperation) {
      toast.error(lang === 'ar' ? 'يرجى اختيار نوع عملية التشغيل' : 'Please select the type of process operation');
      return;
    }

    // Validation: Total quantity check
    const totalIn = newJob.inputs.reduce((sum, i) => sum + i.quantity, 0);
    const totalOut = newJob.outputs.reduce((sum, i) => sum + i.quantity, 0);

    if (totalOut > totalIn) {
      const excess = totalOut - totalIn;
      const percentage = ((excess / totalIn) * 100).toFixed(1);
      toast.warning(lang === 'ar' 
        ? `تنبيه: كمية المخرجات أكبر من المدخلات! الزيادة: ${excess} كجم (${percentage}%)`
        : `Warning: Output quantity exceeds input! Excess: ${excess} kg (${percentage}%)`,
        { duration: 5000 }
      );
    }

    // Validation: Item types matching (Input types must be present in output)
    const inputTypes = Array.from(new Set(newJob.inputs.map(i => {
      const item = dynamicItems.find(p => p.code === i.itemCode);
      return item?.type;
    }).filter(Boolean)));

    const outputTypes = new Set(newJob.outputs.map(o => {
      const item = dynamicItems.find(p => p.code === o.itemCode);
      return item?.type;
    }).filter(Boolean));

    const missingInOutput = inputTypes.filter(type => type && !outputTypes.has(type));

    if (missingInOutput.length > 0) {
      const typeLabels = missingInOutput.map(t => {
        const category = CATEGORIES.type.find(cat => cat.id === t);
        return lang === 'ar' ? category?.labelAr : category?.labelEn || t;
      }).join(' و ');

      toast.error(lang === 'ar' 
        ? `خطأ: المخرجات يجب أن تحتوي على نفس أنواع المدخلات. مفقود: ${typeLabels}`
        : `Error: Outputs must contain the same item types as inputs. Missing: ${typeLabels}`
      );
      return;
    }

    try {
      const selectedWh = warehouses.find(w => w.id === newJob.warehouseId);
      let jobCode = '';
      if (!editingJobId && selectedWh) {
        jobCode = await generateJobCode(selectedWh, newJob.date);
      }

      const jobData = {
        ...newJob,
        jobCode: editingJobId ? jobs.find(j => j.id === editingJobId)?.jobCode : jobCode,
        status: editingJobId ? newJob.status : 'Pending Warehouse',
        warehouseName: selectedWh?.name || '',
        warehouseCode: selectedWh?.systemCode || '',
        updatedAt: new Date().toISOString(),
      };

      if (editingJobId) {
        await updateDoc(doc(db, COLLECTIONS.THIRD_PARTY_PROCESSING, editingJobId), {
          ...jobData,
          serverTimestamp: serverTimestamp()
        });
        toast.success(lang === 'ar' ? 'تم تحديث عملية التشغيل بنجاح' : 'Processing job updated successfully');
        
        // Auto share after edit
        const updatedJob: ProcessingJob = {
          id: editingJobId,
          ...newJob,
          warehouseName: selectedWh?.name || '',
          warehouseCode: selectedWh?.systemCode || '',
          createdBy: jobs.find(j => j.id === editingJobId)?.createdBy || user.uid,
          createdAt: jobs.find(j => j.id === editingJobId)?.createdAt || new Date().toISOString()
        };
        handleShareWhatsApp(updatedJob);
      } else {
        const docRef = await addDoc(collection(db, COLLECTIONS.THIRD_PARTY_PROCESSING), {
          ...jobData,
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
          serverTimestamp: serverTimestamp()
        });
        toast.success(lang === 'ar' ? 'تم حفظ عملية التشغيل بنجاح' : 'Processing job saved successfully');
        
        // Auto share after new job
        const createdJob: ProcessingJob = {
          id: docRef.id,
          ...newJob,
          warehouseName: selectedWh?.name || '',
          warehouseCode: selectedWh?.systemCode || '',
          createdBy: user.uid,
          createdAt: new Date().toISOString()
        };
        handleShareWhatsApp(createdJob);
      }
      
      setIsAdding(false);
      setEditingJobId(null);
      setNewJob({
        date: new Date().toISOString().split('T')[0],
        warehouseId: '',
        warehouseName: '',
        warehouseCode: '',
        inputs: [],
        outputs: [],
        scrapQty: 0,
        farzaQty: 0,
        seedQty: 0,
        wasteQty: 0,
        status: 'Pending Warehouse',
        notes: '',
        processOperation: ''
      });
    } catch (error) {
      console.error("Save job error:", error);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving job');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه التشغيلة؟ نهائياً؟' : 'Are you sure you want to delete this job permanently?')) return;
    
    try {
      await deleteDoc(doc(db, COLLECTIONS.THIRD_PARTY_PROCESSING, jobId));
      toast.success(lang === 'ar' ? 'تم حذف التشغيلة بنجاح' : 'Job deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء الحذف' : 'Error deleting job');
    }
  };

  const handleEditJob = (job: ProcessingJob) => {
    setNewJob({
      date: job.date,
      warehouseId: job.warehouseId,
      warehouseName: job.warehouseName,
      warehouseCode: job.warehouseCode,
      inputs: job.inputs,
      outputs: job.outputs,
      scrapQty: job.scrapQty || 0,
      farzaQty: job.farzaQty || 0,
      seedQty: job.seedQty || 0,
      wasteQty: job.wasteQty || 0,
      status: job.status,
      notes: job.notes || '',
      processOperation: job.processOperation || ''
    });
    setEditingJobId(job.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredJobs = jobs.filter(job => {
    // Search filter
    const matchesSearch = (
      job.warehouseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (!matchesSearch) return false;

    // All jobs are visible to all users
    return true;
  });

  const handleApproveWarehouse = async (job: ProcessingJob) => {
    try {
      const updateData = {
        status: 'Pending Quality',
        warehouseApproverId: user.uid,
        warehouseApprovalTime: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      };
      await updateDoc(doc(db, COLLECTIONS.THIRD_PARTY_PROCESSING, job.id), updateData);
      toast.success(lang === 'ar' ? 'تم اعتماد المخزن بنجاح' : 'Warehouse approval successful');
      
      // Auto share after warehouse approval
      handleShareWhatsApp({ ...job, ...updateData } as ProcessingJob);
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل الاعتماد' : 'Approval failed');
    }
  };

  const handleApproveQuality = async (job: ProcessingJob, isAccepted: boolean) => {
    try {
      const state = jobActionsState[job.id] || {};
      const comments = state.qualityComments || '';
      const updateData: any = {
        status: isAccepted ? 'Pending Purchasing' : 'Rejected',
        qualityApproverId: user.uid,
        qualityApprovalTime: new Date().toISOString(),
        qualityComments: comments,
        serverTimestamp: serverTimestamp()
      };

      if (job.processOperation === 'Grading') {
        updateData.defectForeignBodies = state.defectForeignBodies !== undefined ? state.defectForeignBodies : (job.defectForeignBodies || 0);
        updateData.defectOlivesInsects = state.defectOlivesInsects !== undefined ? state.defectOlivesInsects : (job.defectOlivesInsects || 0);
        updateData.defectSoftTexture = state.defectSoftTexture !== undefined ? state.defectSoftTexture : (job.defectSoftTexture || 0);
        updateData.defectBadColor = state.defectBadColor !== undefined ? state.defectBadColor : (job.defectBadColor || 0);
        updateData.defectOlivesStem = state.defectOlivesStem !== undefined ? state.defectOlivesStem : (job.defectOlivesStem || 0);
        updateData.defectSkinDefect = state.defectSkinDefect !== undefined ? state.defectSkinDefect : (job.defectSkinDefect || 0);
        updateData.defectGasPocket = state.defectGasPocket !== undefined ? state.defectGasPocket : (job.defectGasPocket || 0);
        updateData.defectOlivesLoseSkin = state.defectOlivesLoseSkin !== undefined ? state.defectOlivesLoseSkin : (job.defectOlivesLoseSkin || 0);
        updateData.defectOtherVariety = state.defectOtherVariety !== undefined ? state.defectOtherVariety : (job.defectOtherVariety || 0);
        updateData.defectTotalDefect = state.defectTotalDefect !== undefined ? state.defectTotalDefect : (job.defectTotalDefect || 0);
        updateData.defectComments = state.defectComments !== undefined ? state.defectComments : (job.defectComments || '');
      }

      if (job.processOperation === 'PittingAndSlicing') {
        updateData.slicingTime = state.slicingTime !== undefined ? state.slicingTime : (job.slicingTime || '');
        updateData.slicingWeightPerKg = state.slicingWeightPerKg !== undefined ? state.slicingWeightPerKg : (job.slicingWeightPerKg || '');
        updateData.slicingPreProdBroken = state.slicingPreProdBroken !== undefined ? state.slicingPreProdBroken : (job.slicingPreProdBroken || 0);
        updateData.slicingPitDefects = state.slicingPitDefects !== undefined ? state.slicingPitDefects : (job.slicingPitDefects || 0);
        updateData.slicingBrokenOlives = state.slicingBrokenOlives !== undefined ? state.slicingBrokenOlives : (job.slicingBrokenOlives || 0);
        updateData.slicingPits = state.slicingPits !== undefined ? state.slicingPits : (job.slicingPits || 0);
        updateData.slicingTotalRejected = state.slicingTotalRejected !== undefined ? state.slicingTotalRejected : (job.slicingTotalRejected || 0);
        updateData.slicingFloatSalinity = state.slicingFloatSalinity !== undefined ? state.slicingFloatSalinity : (job.slicingFloatSalinity || '');
        updateData.slicingAction = state.slicingAction !== undefined ? state.slicingAction : (job.slicingAction || '');
        updateData.slicingProduction = state.slicingProduction !== undefined ? state.slicingProduction : (job.slicingProduction || '');
        updateData.slicingQualityControl = state.slicingQualityControl !== undefined ? state.slicingQualityControl : (job.slicingQualityControl || '');
      }

      await updateDoc(doc(db, COLLECTIONS.THIRD_PARTY_PROCESSING, job.id), updateData);
      toast.success(isAccepted 
        ? (lang === 'ar' ? 'تم اعتماد الجودة بنجاح' : 'Quality approval successful')
        : (lang === 'ar' ? 'تم رفض التشغيلة' : 'Job rejected')
      );

      // Auto share after quality approval
      handleShareWhatsApp({ ...job, ...updateData } as ProcessingJob);
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل العملية' : 'Operation failed');
    }
  };

  const handleApprovePurchasing = async (job: ProcessingJob) => {
    try {
      const price = jobActionsState[job.id]?.confirmedPrice || job.confirmedPrice || 0;
      const updateData = {
        status: 'Pending Completion',
        purchasingApproverId: user.uid,
        purchasingApprovalTime: new Date().toISOString(),
        confirmedPrice: price,
        serverTimestamp: serverTimestamp()
      };
      await updateDoc(doc(db, COLLECTIONS.THIRD_PARTY_PROCESSING, job.id), updateData);
      toast.success(lang === 'ar' ? 'تم اعتماد المشتريات بنجاح' : 'Purchasing approval successful');

      // Auto share after purchasing approval
      handleShareWhatsApp({ ...job, ...updateData } as ProcessingJob);
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل الاعتماد' : 'Approval failed');
    }
  };

  const handleCompleteJob = async (job: ProcessingJob) => {
    try {
      const po = jobActionsState[job.id]?.poNumber || '';
      await updateDoc(doc(db, COLLECTIONS.THIRD_PARTY_PROCESSING, job.id), {
        status: 'Completed',
        completerId: user.uid,
        completionTime: new Date().toISOString(),
        poNumber: po,
        serverTimestamp: serverTimestamp()
      });
      toast.success(lang === 'ar' ? 'تم إكمال التشغيلة بنجاح' : 'Job completed successfully');
      
      // Auto share Word via Outlook after completion
      handleShareWhatsApp({ 
        ...job, 
        status: 'Completed', 
        poNumber: po 
      });
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل الإكمال' : 'Completion failed');
    }
  };

  const handleShareWhatsApp = (job: ProcessingJob) => {
    const isRtl = lang === 'ar';
    const totalIn = job.inputs.reduce((sum, i) => sum + i.quantity, 0);
    const totalOut = job.outputs.reduce((sum, i) => sum + i.quantity, 0);
    const yieldPercentage = totalIn > 0 ? ((totalOut / totalIn) * 100).toFixed(1) : '0.0';
    const lossPercentage = totalIn > 0 ? (((totalIn - totalOut) / totalIn) * 100).toFixed(1) : '0.0';

    const gradingDefectsTextAr = (job.processOperation === 'Grading' && job.defectTotalDefect !== undefined)
      ? `\n📊 *عيوب جودة التدريج:*\n` +
        `• Foreign Bodies: ${job.defectForeignBodies ?? 0}%\n` +
        `• Olives have Insects: ${job.defectOlivesInsects ?? 0}%\n` +
        `• Soft texture: ${job.defectSoftTexture ?? 0}%\n` +
        `• Bad Color: ${job.defectBadColor ?? 0}%\n` +
        `• Olives have stem: ${job.defectOlivesStem ?? 0}%\n` +
        `• Skin Defect: ${job.defectSkinDefect ?? 0}%\n` +
        `• Gas Pocket: ${job.defectGasPocket ?? 0}%\n` +
        `• Olives lose skin: ${job.defectOlivesLoseSkin ?? 0}%\n` +
        `• Other Variety: ${job.defectOtherVariety ?? 0}%\n` +
        `• *إجمالي العيوب (Total):* ${job.defectTotalDefect}%\n` +
        (job.defectComments ? `• *تعليقات العيوب:* ${job.defectComments}\n` : '')
      : '';

    const slicingTextAr = (job.processOperation === 'PittingAndSlicing' && (job.slicingTime || job.slicingPreProdBroken !== undefined))
      ? `\n📊 *جودة عملية الخلي والشرائح:*\n` +
        `• الوقت: ${job.slicingTime || '-'}\n` +
        `• وزن/اسم لكل 1 كجم: ${job.slicingWeightPerKg || '-'}\n` +
        `• كسر ما قبل الإنتاج (≤10%): ${job.slicingPreProdBroken ?? 0}%\n` +
        `• عيوب النوى (≤5%): ${job.slicingPitDefects ?? 0}%\n` +
        `• كسر الزيتون (≤5%): ${job.slicingBrokenOlives ?? 0}%\n` +
        `• النوى (≤5%): ${job.slicingPits ?? 0}%\n` +
        `• *إجمالي المنزل (≤12%):* ${job.slicingTotalRejected ?? 0}%\n` +
        `• ملوحة محلول العوامة: ${job.slicingFloatSalinity || '-'}\n` +
        `• الإجراء: ${job.slicingAction || '-'}\n` +
        `• الإنتاج: ${job.slicingProduction || '-'}\n` +
        `• رقابة الجودة: ${job.slicingQualityControl || '-'}\n`
      : '';

    const gradingDefectsTextEn = (job.processOperation === 'Grading' && job.defectTotalDefect !== undefined)
      ? `\n📊 *Grading Quality Defects:*\n` +
        `• Foreign Bodies: ${job.defectForeignBodies ?? 0}%\n` +
        `• Olives have Insects: ${job.defectOlivesInsects ?? 0}%\n` +
        `• Soft texture: ${job.defectSoftTexture ?? 0}%\n` +
        `• Bad Color: ${job.defectBadColor ?? 0}%\n` +
        `• Olives have stem: ${job.defectOlivesStem ?? 0}%\n` +
        `• Skin Defect: ${job.defectSkinDefect ?? 0}%\n` +
        `• Gas Pocket: ${job.defectGasPocket ?? 0}%\n` +
        `• Olives lose skin: ${job.defectOlivesLoseSkin ?? 0}%\n` +
        `• Other Variety: ${job.defectOtherVariety ?? 0}%\n` +
        `• *Total Defect:* ${job.defectTotalDefect}%\n` +
        (job.defectComments ? `• *Comments:* ${job.defectComments}\n` : '')
      : '';

    const slicingTextEn = (job.processOperation === 'PittingAndSlicing' && (job.slicingTime || job.slicingPreProdBroken !== undefined))
      ? `\n📊 *Slicing & Pitting Quality:*\n` +
        `• Time: ${job.slicingTime || '-'}\n` +
        `• Weight/Name per 1 Kg: ${job.slicingWeightPerKg || '-'}\n` +
        `• Pre-Prod Broken (≤10%): ${job.slicingPreProdBroken ?? 0}%\n` +
        `• Pit Defects (≤5%): ${job.slicingPitDefects ?? 0}%\n` +
        `• Broken Olives (≤5%): ${job.slicingBrokenOlives ?? 0}%\n` +
        `• Pits (≤5%): ${job.slicingPits ?? 0}%\n` +
        `• *Total Rejected (≤12%):* ${job.slicingTotalRejected ?? 0}%\n` +
        `• Float Salinity: ${job.slicingFloatSalinity || '-'}\n` +
        `• Action: ${job.slicingAction || '-'}\n` +
        `• Production: ${job.slicingProduction || '-'}\n` +
        `• Quality Control: ${job.slicingQualityControl || '-'}\n`
      : '';

    const text = isRtl
      ? `📋 *تقرير عملية تشغيل (Third Party Job)*\n\n` +
        `• *رقم العملية:* ${job.jobCode || '-'}\n` +
        `• *التاريخ:* ${job.date}\n` +
        `• *المخزن:* ${job.warehouseName || '-'}\n` +
        `• *الحالة:* ${job.status}\n\n` +
        `📥 *المدخلات:* ${totalIn.toLocaleString()} kg\n` +
        `📤 *المخرجات:* ${totalOut.toLocaleString()} kg\n` +
        `📊 *نسبة التشغيل:* ${yieldPercentage}%\n` +
        `📉 *نسبة الفقد:* ${lossPercentage}%\n` +
        gradingDefectsTextAr + slicingTextAr + `\n` +
        (job.notes ? `*ملاحظات:* ${job.notes}\n` : '') +
        (job.qualityComments ? `*تعليقات الجودة:* ${job.qualityComments}\n` : '')
      : `📋 *Processing Job Report*\n\n` +
        `• *Job Code:* ${job.jobCode || '-'}\n` +
        `• *Date:* ${job.date}\n` +
        `• *Warehouse:* ${job.warehouseName || '-'}\n` +
        `• *Status:* ${job.status}\n\n` +
        `📥 *Inputs:* ${totalIn.toLocaleString()} kg\n` +
        `📤 *Outputs:* ${totalOut.toLocaleString()} kg\n` +
        `📊 *Yield:* ${yieldPercentage}%\n` +
        `📉 *Loss:* ${lossPercentage}%\n` +
        gradingDefectsTextEn + slicingTextEn + `\n` +
        (job.notes ? `*Notes:* ${job.notes}\n` : '') +
        (job.qualityComments ? `*Quality Comments:* ${job.qualityComments}\n` : '');

    navigator.clipboard.writeText(text).then(() => {
      toast.success(isRtl ? 'تم نسخ تفاصيل التشغيلة وجاري فتح الواتساب' : 'Job details copied and opening WhatsApp');
      
      const wh = warehouses.find(w => w.id === job.warehouseId);
      const whatsappGroupUrl = wh?.whatsappGroup || 'https://chat.whatsapp.com/Hg1v0O51VxW8vEAs8JusPA';
      
      try {
        window.open(whatsappGroupUrl, '_blank');
      } catch (e) {
        window.location.href = whatsappGroupUrl;
      }
    }).catch(err => {
      console.error('Could not copy text: ', err);
      toast.error(isRtl ? 'فشل نسخ التفاصيل' : 'Failed to copy details');
    });
  };

  const handleShareWordOutlook = async (job: ProcessingJob) => {
    try {
      const isRtl = lang === 'ar';
      const trans = translations[lang];
      const date = new Date(job.date).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US');

      const totalIn = job.inputs.reduce((sum, i) => sum + i.quantity, 0);
      const totalOut = job.outputs.reduce((sum, i) => sum + i.quantity, 0);
      const yieldPercentage = totalIn > 0 ? ((totalOut / totalIn) * 100).toFixed(1) : '0.0';
      const lossPercentage = totalIn > 0 ? (((totalIn - totalOut) / totalIn) * 100).toFixed(1) : '0.0';

      const warehouse = warehouses.find(w => w.id === job.warehouseId);
      const pricePerKg = job.confirmedPrice || warehouse?.processingPricePerKg || 0;
      const supplierCode = warehouse?.supplierCode || job.warehouseCode || "-";
      const totalCost = totalIn * pricePerKg;
      const lossPercentStr = totalIn > 0 ? (((totalIn - totalOut) / totalIn) * 100).toFixed(1) + '%' : '0%';

      const maxRows = Math.max(job.inputs.length, job.outputs.length);
      const rowsCount = Math.max(maxRows, 5);

      const findUserName = (uid: string | undefined) => {
        if (!uid) return ".............";
        const u = users.find(u => u.id === uid || u.uid === uid);
        return u?.displayName || u?.email?.split('@')[0] || ".............";
      };

      // Helper for creating centered bold cells
      const createCell = (text: string, options: any = {}) => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: String(text), size: options.size || 18, bold: options.bold, color: options.color || "000000" })],
          alignment: options.align || AlignmentType.CENTER,
        })],
        shading: options.bg ? { fill: options.bg, type: ShadingType.CLEAR } : undefined,
        verticalAlign: VerticalAlign.CENTER,
        width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
        borders: options.noBorder ? {
          top: { style: BorderStyle.NONE, size: 0 },
          bottom: { style: BorderStyle.NONE, size: 0 },
          left: { style: BorderStyle.NONE, size: 0 },
          right: { style: BorderStyle.NONE, size: 0 },
        } : undefined,
      });

      // 1. Metadata Table
      const metadataTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0 },
          bottom: { style: BorderStyle.NONE, size: 0 },
          left: { style: BorderStyle.NONE, size: 0 },
          right: { style: BorderStyle.NONE, size: 0 },
          insideHorizontal: { style: BorderStyle.NONE, size: 0 },
          insideVertical: { style: BorderStyle.NONE, size: 0 },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 47, type: WidthType.PERCENTAGE },
                children: [
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                      new TableRow({ children: [
                        createCell(isRtl ? "سعر التشغيل للكيلو" : "Price / KG", { bg: "F1F5F9", bold: true, width: 55 }),
                        createCell(`${pricePerKg.toLocaleString()} EGP`, { width: 45, bold: true })
                      ]}),
                      new TableRow({ children: [
                        createCell(isRtl ? "اجمالى تكلفة التشغيل" : "Total Processing Cost", { bg: "F1F5F9", bold: true }),
                        createCell(`${totalCost.toLocaleString()} EGP`, { bg: "F8FAFC", bold: true })
                      ]}),
                      new TableRow({ children: [
                        createCell(isRtl ? "الفرق" : "Difference", { bg: "F1F5F9", bold: true }),
                        createCell(`${(totalIn - totalOut).toLocaleString()} kg`, { bg: "F8FAFC", bold: true, color: "2563EB" })
                      ]}),
                      new TableRow({ children: [
                        createCell(isRtl ? "نسبة الفقد" : "Loss %", { bg: "F1F5F9", bold: true }),
                        createCell(lossPercentStr, { bg: "F8FAFC", bold: true, color: "DC2626" })
                      ]}),
                    ]
                  })
                ]
              }),
              new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, children: [] }),
              new TableCell({
                width: { size: 47, type: WidthType.PERCENTAGE },
                children: [
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                      new TableRow({ children: [
                        createCell(isRtl ? "كود المورد" : "Supplier Code", { bg: "F1F5F9", bold: true, width: 40 }),
                        createCell(supplierCode, { width: 60, bold: true })
                      ]}),
                      new TableRow({ children: [
                        createCell(isRtl ? "اسم المورد" : "Supplier Name", { bg: "F1F5F9", bold: true }),
                        createCell(job.warehouseName || job.supplierName || job.thirdPartyName || "-", { bg: "F8FAFC", bold: true })
                      ]}),
                      new TableRow({ children: [
                        createCell(isRtl ? "كود المخزن" : "Warehouse Code", { bg: "F1F5F9", bold: true }),
                        createCell(job.warehouseCode || "-", { bg: "F8FAFC", bold: true })
                      ]}),
                      new TableRow({ children: [
                        createCell(isRtl ? "رقم العملية" : "Process Code", { bg: "F1F5F9", bold: true }),
                        createCell(job.jobCode || "-", { bg: "F8FAFC", bold: true, color: "059669" })
                      ]}),
                      new TableRow({ children: [
                        createCell(isRtl ? "رقم PO" : "PO Number", { bg: "F1F5F9", bold: true }),
                        createCell(job.poNumber || "-", { bg: "F8FAFC", bold: true, color: "2563EB" })
                      ]}),
                      new TableRow({ children: [
                        createCell(isRtl ? "عملية التشغيل" : "Process Operation", { bg: "F1F5F9", bold: true }),
                        createCell(getOperationLabel(job.processOperation) || "-", { bg: "F8FAFC", bold: true })
                      ]}),
                    ]
                  })
                ]
              })
            ]
          })
        ]
      });

      // 2. Main Tables
      const inputsRowsList = [
        new TableRow({
          children: [
            createCell("كود ساب", { bg: "DBEAFE", bold: true, width: 25, color: "1E3A8A" }),
            createCell("اسم الصنف", { bg: "DBEAFE", bold: true, width: 55, color: "1E3A8A" }),
            createCell("الكمية", { bg: "DBEAFE", bold: true, width: 20, color: "1E3A8A" }),
          ]
        })
      ];

      for (let i = 0; i < rowsCount; i++) {
        const input = job.inputs[i];
        inputsRowsList.push(new TableRow({
          children: [
            createCell(input ? input.itemCode : "", { bold: true }),
            createCell(input ? input.itemName : "", { align: AlignmentType.RIGHT }),
            createCell(input ? input.quantity.toLocaleString() : "", { bold: true }),
          ]
        }));
      }

      inputsRowsList.push(new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [new Paragraph({ children: [new TextRun({ text: "إجمالي المدخلات", bold: true })], alignment: AlignmentType.RIGHT })],
            shading: { fill: "FACC15", type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
          }),
          createCell(totalIn.toLocaleString(), { bg: "FACC15", bold: true }),
        ]
      }));

      const outputsRowsList = [
        new TableRow({
          children: [
            createCell("كود ساب مخرج", { bg: "FFEDD5", bold: true, width: 25, color: "7C2D12" }),
            createCell("اسم الصنف مخرج", { bg: "FFEDD5", bold: true, width: 55, color: "7C2D12" }),
            createCell("الكمية مخرج", { bg: "FBBF24", bold: true, width: 20, color: "000000" }),
          ]
        })
      ];

      for (let i = 0; i < rowsCount; i++) {
        const output = job.outputs[i];
        outputsRowsList.push(new TableRow({
          children: [
            createCell(output ? output.itemCode : "", { bold: true }),
            createCell(output ? output.itemName : "", { align: AlignmentType.RIGHT }),
            createCell(output ? output.quantity.toLocaleString() : "", { bg: output ? "FEF3C7" : undefined, bold: true }),
          ]
        }));
      }

      outputsRowsList.push(new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [new Paragraph({ children: [new TextRun({ text: "إجمالي المخرجات", bold: true })], alignment: AlignmentType.RIGHT })],
            shading: { fill: "FACC15", type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
          }),
          createCell(totalOut.toLocaleString(), { bg: "FACC15", bold: true }),
        ]
      }));

      const mainTables = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0 },
          bottom: { style: BorderStyle.NONE, size: 0 },
          left: { style: BorderStyle.NONE, size: 0 },
          right: { style: BorderStyle.NONE, size: 0 },
          insideHorizontal: { style: BorderStyle.NONE, size: 0 },
          insideVertical: { style: BorderStyle.NONE, size: 0 },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 48.5, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "المدخلات (Inputs)", bold: true, color: "1E3A8A" })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 }
                  }),
                  new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: inputsRowsList })
                ]
              }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, children: [] }),
              new TableCell({
                width: { size: 48.5, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "المخرجات (Outputs)", bold: true, color: "7C2D12" })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 }
                  }),
                  new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: outputsRowsList })
                ]
              })
            ]
          })
        ]
      });

      // Assemble all comments
      const allComments = [];
      if (job.notes) allComments.push({ label: isRtl ? "ملاحظات العميل: " : "Customer Notes: ", text: job.notes });
      if (job.qualityComments) allComments.push({ label: isRtl ? "تعليقات الجودة: " : "Quality Comments: ", text: job.qualityComments });

      // 3. Secondary Outputs & Losses Table
      const showSecondaryTable = !!(job.scrapQty || job.farzaQty || job.seedQty || job.wasteQty);
      
      const secondaryTableTitle = new Paragraph({
        children: [new TextRun({ 
          text: isRtl ? "المخرجات الفرعية والفواقد" : "Secondary Outputs & Losses",
          bold: true,
          size: 24,
          color: "B45309"
        })],
        alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { before: 300, after: 120 }
      });

      const secondaryTableRows = [
        new TableRow({
          children: [
            createCell(isRtl ? "نوع المخرج الفرعي / الفاقد" : "Secondary Output / Loss Category", { bg: "FEF3C7", bold: true, width: 70, align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
            createCell(isRtl ? "الكمية" : "Quantity", { bg: "FEF3C7", bold: true, width: 30 })
          ]
        })
      ];

      if (job.scrapQty) {
        secondaryTableRows.push(new TableRow({
          children: [
            createCell(isRtl ? "هري التشغيل" : "Processing Scrap", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
            createCell(`${job.scrapQty.toLocaleString()} kg`, { bold: true, color: "B45309" })
          ]
        }));
      }
      if (job.farzaQty) {
        secondaryTableRows.push(new TableRow({
          children: [
            createCell(isRtl ? "الفرزة" : "Reject (Farza)", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
            createCell(`${job.farzaQty.toLocaleString()} kg`, { bold: true, color: "B45309" })
          ]
        }));
      }
      if (job.seedQty) {
        secondaryTableRows.push(new TableRow({
          children: [
            createCell(isRtl ? "البذرة" : "Seed", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
            createCell(`${job.seedQty.toLocaleString()} kg`, { bold: true, color: "B45309" })
          ]
        }));
      }
      if (job.wasteQty) {
        secondaryTableRows.push(new TableRow({
          children: [
            createCell(isRtl ? "الهالك" : "Waste / Loss", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
            createCell(`${job.wasteQty.toLocaleString()} kg`, { bold: true, color: "B45309" })
          ]
        }));
      }

      const secondaryTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: secondaryTableRows
      });

      const showQualityReport = (job.processOperation === 'Grading' && job.defectTotalDefect !== undefined) ||
                                (job.processOperation === 'PittingAndSlicing' && (
                                  job.slicingTime !== undefined ||
                                  job.slicingWeightPerKg !== undefined ||
                                  job.slicingPreProdBroken !== undefined
                                ));

      const qualityReportTitle = new Paragraph({
        children: [new TextRun({ 
          text: isRtl ? "تقرير الجودة" : "Quality Report",
          bold: true,
          size: 24,
          color: "1E3A8A"
        })],
        alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { before: 300, after: 120 }
      });

      const qualityTable = job.processOperation === 'Grading' ? new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              createCell(isRtl ? "نوع العيب / الاختبار" : "Defect / Test Type", { bg: "FEF3C7", bold: true, width: 70, align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(isRtl ? "النسبة المئوية (%)" : "Percentage (%)", { bg: "FEF3C7", bold: true, width: 30 })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "شوائب وأجسام غريبة (Foreign Bodies)" : "Foreign Bodies", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectForeignBodies ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "ثمار مصابة بحشرات (Olives have Insects)" : "Olives have Insects", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectOlivesInsects ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "قوام طري (Soft texture)" : "Soft texture", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectSoftTexture ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "لون غير متجانس (Bad Color)" : "Bad Color", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectBadColor ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "ثمار بعنق (Olives have stem)" : "Olives have stem", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectOlivesStem ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "عيوب قشرة (Skin Defect)" : "Skin Defect", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectSkinDefect ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "جيوب غازية (Gas Pocket)" : "Gas Pocket", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectGasPocket ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "ثمار منزوعة القشرة (Olives lose skin)" : "Olives lose skin", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectOlivesLoseSkin ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "صنف آخر (Other Variety)" : "Other Variety", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectOtherVariety ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "إجمالي العيوب (Total defect)" : "Total defect", { bg: "FEE2E2", bold: true, align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT, color: "991B1B" }),
              createCell(`${job.defectTotalDefect ?? 0}%`, { bg: "FEE2E2", bold: true, color: "991B1B" })
            ]
          })
        ]
      }) : new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              createCell(isRtl ? "بيانات وبنود اختبار الجودة (شرائح وخلي)" : "Quality Test Field", { bg: "FEF3C7", bold: true, width: 60, align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(isRtl ? "المواصفة والبيان" : "Specification & Metric", { bg: "FEF3C7", bold: true, width: 40 })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "الوقت (Time)" : "Time", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingTime || "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "وزن/اسم لكل 1 كجم (Weight/Name per 1 Kg)" : "Weight/Name per 1 Kg", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingWeightPerKg || "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "نسبة عيوب كسر ما قبل الإنتاج (Pre-prod broken - ≤10%)" : "Pre-production Broken defects (≤10%)", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingPreProdBroken !== undefined ? `${job.slicingPreProdBroken}%` : "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "عيوب النوى (Pit defects - ≤5%)" : "Pit defects (≤5%)", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingPitDefects !== undefined ? `${job.slicingPitDefects}%` : "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "كسر الزيتون (Broken olives - ≤5%)" : "Broken olives (≤5%)", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingBrokenOlives !== undefined ? `${job.slicingBrokenOlives}%` : "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "النوى (Pits - ≤5%)" : "Pits (≤5%)", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingPits !== undefined ? `${job.slicingPits}%` : "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "إجمالي المنزّل (Total rejected/home - ≤12%)" : "Total home/rejected (≤12%)", { bg: "FEE2E2", color: "991B1B", align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingTotalRejected !== undefined ? `${job.slicingTotalRejected}%` : "-", { bg: "FEE2E2", color: "991B1B", bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "نسبة ملوحة محلول العوامة (Float salinity brine)" : "Float salinity brine", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingFloatSalinity || "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "الإجراء (Action)" : "Action", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingAction || "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "الإنتاج (Production)" : "Production", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingProduction || "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "رقابة الجودة (Quality Control)" : "Quality Control", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingQualityControl || "-", { bold: true })
            ]
          })
        ]
      });

      const qualityCommentsParagraph = job.defectComments ? new Paragraph({
        children: [
          new TextRun({ text: isRtl ? "ملاحظات عيوب التدريج: " : "Grading Defects Comments: ", bold: true }),
          new TextRun({ text: job.defectComments, italics: true })
        ],
        spacing: { before: 120 }
      }) : null;

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              size: { orientation: PageOrientation.PORTRAIT },
              margin: { top: 720, bottom: 720, left: 720, right: 720 },
            }
          },
          children: [
            new Paragraph({
              children: [new TextRun({ 
                text: `عملية تشغيل لدى ${job.warehouseName || job.supplierName || job.thirdPartyName || ''} بتاريخ ${job.date}`,
                bold: true,
                size: 32,
                color: "1E3A8A"
              })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
              border: { bottom: { color: "1E3A8A", space: 1, style: BorderStyle.SINGLE, size: 12 } }
            }),
            metadataTable,
            new Paragraph({ text: "", spacing: { after: 200 } }),
            mainTables,
            ...(showSecondaryTable ? [
              secondaryTableTitle,
              secondaryTable
            ] : []),
            ...(showQualityReport ? [
              qualityReportTitle,
              qualityTable,
              ...(qualityCommentsParagraph ? [qualityCommentsParagraph] : [])
            ] : []),
            ...allComments.map(comment => new Paragraph({
              children: [
                new TextRun({ text: comment.label, bold: true }),
                new TextRun({ text: comment.text })
              ],
              spacing: { before: 200 }
            })),
            new Paragraph({ text: "", spacing: { before: 800 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE, size: 0 },
                bottom: { style: BorderStyle.NONE, size: 0 },
                left: { style: BorderStyle.NONE, size: 0 },
                right: { style: BorderStyle.NONE, size: 0 },
                insideHorizontal: { style: BorderStyle.NONE, size: 0 },
                insideVertical: { style: BorderStyle.NONE, size: 0 },
              },
              rows: [
                new TableRow({
                  children: [
                    createCell(isRtl ? "مسئول المشتريات" : "Purchasing Officer", { bold: true, noBorder: true, size: 22 }),
                    createCell(isRtl ? "مسئول الجودة" : "Quality Officer", { bold: true, noBorder: true, size: 22 }),
                    createCell(isRtl ? "مسئول المخزن" : "Warehouse Officer", { bold: true, noBorder: true, size: 22 }),
                    createCell(isRtl ? "مستلم العميل" : "Customer Recipient", { bold: true, noBorder: true, size: 22 }),
                  ]
                }),
                new TableRow({
                  children: [
                    createCell(isRtl ? `بواسطة: ${findUserName(job.purchasingApproverId)}` : `By: ${findUserName(job.purchasingApproverId)}`, { noBorder: true, size: 18 }),
                    createCell(isRtl ? `بواسطة: ${findUserName(job.qualityApproverId)}` : `By: ${findUserName(job.qualityApproverId)}`, { noBorder: true, size: 18 }),
                    createCell(isRtl ? `بواسطة: ${findUserName(job.warehouseApproverId)}` : `By: ${findUserName(job.warehouseApproverId)}`, { noBorder: true, size: 18 }),
                    createCell(isRtl ? `بواسطة: ${findUserName(job.createdBy)}` : `By: ${findUserName(job.createdBy)}`, { noBorder: true, size: 18 }),
                  ]
                })
              ]
            })
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      const fileName = `JobReport_${job.warehouseCode || 'Report'}_${job.date}.docx`;

      // Compose Email Body
      const gradingDefectSummary = (job.processOperation === 'Grading' && job.defectTotalDefect !== undefined)
        ? `${isRtl ? 'إجمالي عيوب التدريج:' : 'Total Grading Defects:'} ${job.defectTotalDefect}%` + (job.defectComments ? ` (${job.defectComments})` : '')
        : '';
      const slicingDefectSummary = (job.processOperation === 'PittingAndSlicing' && job.slicingTotalRejected !== undefined)
        ? `${isRtl ? 'إجمالي مخرج المنزل لشرائح الجودة والخلي:' : 'Total Quality Reject:'} ${job.slicingTotalRejected}%`
        : '';
      const commentsText = [
        job.notes && `${isRtl ? 'ملاحظات:' : 'Notes:'} ${job.notes}`,
        job.qualityComments && `${isRtl ? 'تعليقات الجودة:' : 'Quality Comments:'} ${job.qualityComments}`,
        gradingDefectSummary,
        slicingDefectSummary
      ].filter(Boolean).join('\n');

      const recipientList = [...toEmails];
      if (job.status === 'Pending Completion' || job.status === 'Completed') {
        if (!recipientList.includes('y.tawfiq@monairy.com')) {
          recipientList.push('y.tawfiq@monairy.com');
        }
      }
      const recipient = recipientList.join(',') || 'Khaled.Shaaban@RichLandfi.com';
      const ccList = ccEmails.join(',');
      const subject = encodeURIComponent(`${isRtl ? '\u200Fتشغيلة جديدة / محدثة - ' : 'New / Updated Job - '}${job.jobCode ? `${job.jobCode} - ` : ''}${job.warehouseName} - ${job.date}`);
      
      const rlm = '\u200F';
      const rle = '\u202B';
      const pdf = '\u202C';
      const bodyText = isRtl ? (
        `${rle}${rlm}تحية طيبة،${pdf}\n\n` +
        `${rle}${rlm}يرجى العلم بأنه تم تحديث التشغيلة التالية:${pdf}\n\n` +
        `${rle}${rlm}تقرير تشغيل ملف Word مرفق${pdf}\n` +
        `${rle}${rlm}--------------------${pdf}\n` +
        `${rle}${rlm}المخزن: ${job.warehouseName} (${job.warehouseCode})${pdf}\n` +
        `${rle}${rlm}التاريخ: ${job.date}${pdf}\n` +
        `${rle}${rlm}الحالة: ${job.status}${pdf}\n` +
        `${rle}${rlm}رقم العملية: ${job.jobCode || '-'}${pdf}\n` +
        `${rle}${rlm}رقم PO: ${job.poNumber || '-'}${pdf}\n\n` +
        (commentsText ? `${commentsText.split('\n').map(line => `${rle}${rlm}${line}${pdf}`).join('\n')}\n\n` : '') +
        `${rle}${rlm}يرجى مراجعة ملف Word المرفق.${pdf}`
      ) : (
        `Hello,\n\nPlease be informed that the following job has been updated:\n\n` +
        `Word Job Report Attached\n` +
        `--------------------\n` +
        `Warehouse: ${job.warehouseName} (${job.warehouseCode})\n` +
        `Date: ${job.date}\n` +
        `Status: ${job.status}\n` +
        `Job Code: ${job.jobCode || '-'}\n` +
        `PO Number: ${job.poNumber || '-'}\n\n` +
        (commentsText ? `${commentsText}\n\n` : '') +
        `Please review the attached Word file.`
      );

      const body = encodeURIComponent(bodyText);

      const mailtoUrl = `mailto:${recipient}?cc=${ccList}&subject=${subject}&body=${body}`;
      window.location.href = mailtoUrl;

      // Also trigger download of DOCX so user can attach it
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(isRtl ? 'تم تجهيز الإيميل وبدء تحميل ملف Word' : 'Email prepared and Word download started');
    } catch (error) {
      console.error("Share error:", error);
      toast.error(lang === 'ar' ? 'فشل التجهيز' : 'Preparation failed');
    }
  };

  // Deduplicated section

  // Deleting duplicate...

  // Deleting duplicate part 2...

  const handlePrint = (job: ProcessingJob) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const isRtl = lang === 'ar';
    const direction = isRtl ? 'rtl' : 'ltr';

    const content = `
      <!DOCTYPE html>
      <html lang="${lang}" dir="${direction}">
      <head>
        <meta charset="UTF-8">
        <title>${lang === 'ar' ? 'نموذج عملية تشغيل' : 'Processing Job Template'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; direction: ${direction}; margin: 0; }
          .container { max-width: 800px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 40px; border-radius: 20px; }
          .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
          .title-group h1 { font-size: 28px; font-weight: 800; color: #10b981; margin: 0; }
          .title-group p { font-size: 14px; color: #6b7280; margin: 5px 0 0 0; }
          .date-badge { background: #f0fdf4; color: #10b981; padding: 8px 16px; rounded: 12px; font-weight: bold; font-size: 14px; border: 1px solid #d1fae5; border-radius: 10px; }
          
          .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 40px; }
          .info-card { background: #f9fafb; padding: 16px; border-radius: 16px; border: 1px solid #f3f4f6; }
          .info-label { font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; display: block; }
          .info-value { font-size: 16px; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 8px; }
          .code-tag { font-family: monospace; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 12px; }

          .stats-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; }
          .stat-item { text-align: center; padding: 20px; border-radius: 20px; }
          .stat-in { background: #ecfdf5; color: #065f46; border: 1px solid #d1fae5; }
          .stat-out { background: #eff6ff; color: #1e40af; border: 1px solid #dbeafe; }
          .stat-yield { background: #fafafa; color: #404040; border: 1px solid #f5f5f5; }
          .stat-val { font-size: 24px; font-weight: 800; display: block; margin-top: 4px; }
          
          .tables-container { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .section-header { font-size: 12px; font-weight: 800; color: #9ca3af; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: ${isRtl ? 'right' : 'left'}; font-size: 11px; color: #9ca3af; padding: 8px; font-weight: 600; }
          td { padding: 12px 8px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
          .item-code { font-family: monospace; font-size: 11px; color: #9ca3af; }
          .item-qty { font-weight: 800; }

          .footer-notes { margin-top: 40px; padding: 24px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 20px; font-style: italic; color: #92400e; font-size: 14px; }
          
          @media print {
            body { padding: 0; }
            .container { border: none; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title-group">
              <h1>${t.thirdPartyProcessing}</h1>
              <p>${isRtl ? 'نموذج رسمي لعملية التشغيل' : 'Official Processing Job Record'}</p>
            </div>
            <div class="date-badge">
              ${new Date(job.date).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { dateStyle: 'long' })}
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-card">
              <span class="info-label">${lang === 'ar' ? 'المخزن' : 'Warehouse'}</span>
              <div class="info-value">
                📍 ${job.warehouseName || '-'} 
                <span class="code-tag">${job.warehouseCode || '-'}</span>
              </div>
            </div>
          </div>

          <div class="stats-bar">
            <div class="stat-item stat-in">
              <span class="info-label">${lang === 'ar' ? 'إجمالي المدخلات' : 'Total Inputs'}</span>
              <span class="stat-val">${job.inputs.reduce((s, i) => s + i.quantity, 0).toLocaleString()} <small>kg</small></span>
            </div>
            <div class="stat-item stat-out">
              <span class="info-label">${lang === 'ar' ? 'إجمالي المخرجات' : 'Total Outputs'}</span>
              <span class="stat-val">${job.outputs.reduce((s, i) => s + i.quantity, 0).toLocaleString()} <small>kg</small></span>
            </div>
            <div class="stat-item stat-yield">
              <span class="info-label">${lang === 'ar' ? 'نسبة التشغيل' : 'Yield'}</span>
              <span class="stat-val">${(job.inputs.reduce((s, i) => s + i.quantity, 0) > 0 
                ? (job.outputs.reduce((s, i) => s + i.quantity, 0) / job.inputs.reduce((s, i) => s + i.quantity, 0) * 100).toFixed(1)
                : '0.0')}%</span>
            </div>
            <div class="stat-item" style="background: #fff1f2; color: #9f1239; border: 1px solid #ffe4e6;">
              <span class="info-label">${lang === 'ar' ? 'نسبة الفقد' : 'Loss %'}</span>
              <span class="stat-val">${(job.inputs.reduce((s, i) => s + i.quantity, 0) > 0 
                ? (((job.inputs.reduce((s, i) => s + i.quantity, 0) - job.outputs.reduce((s, i) => s + i.quantity, 0)) / job.inputs.reduce((s, i) => s + i.quantity, 0)) * 100).toFixed(1)
                : '0.0')}%</span>
            </div>
          </div>

          <div class="tables-container">
            <div>
              <div class="section-header">${t.inputs}</div>
              <table>
                <thead>
                  <tr>
                    <th>${lang === 'ar' ? 'الكود' : 'Code'}</th>
                    <th>${lang === 'ar' ? 'الصنف' : 'Item'}</th>
                    <th>${t.quantity}</th>
                  </tr>
                </thead>
                <tbody>
                  ${job.inputs.map(input => `
                    <tr>
                      <td class="item-code">${input.itemCode}</td>
                      <td>${input.itemName}</td>
                      <td class="item-qty" style="color: #059669;">${input.quantity} ${input.unit}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div>
              <div class="section-header">${t.outputs}</div>
              <table>
                <thead>
                  <tr>
                    <th>${lang === 'ar' ? 'الكود' : 'Code'}</th>
                    <th>${lang === 'ar' ? 'الصنف' : 'Item'}</th>
                    <th>${t.quantity}</th>
                  </tr>
                </thead>
                <tbody>
                  ${job.outputs.map(output => `
                    <tr>
                      <td class="item-code">${output.itemCode}</td>
                      <td>${output.itemName}</td>
                      <td class="item-qty" style="color: #2563eb;">${output.quantity} ${output.unit}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          ${(job.scrapQty || job.farzaQty || job.seedQty || job.wasteQty) ? `
            <div style="margin-top: 40px; border-top: 2px solid #e5e7eb; padding-top: 24px;">
              <div class="section-header" style="font-size: 14px; font-weight: 800; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 16px;">
                ${lang === 'ar' ? 'المخرجات الفرعية والفواقد' : 'Secondary Outputs & Losses'}
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #e5e7eb;">
                    <th style="padding: 10px; text-align: ${isRtl ? 'right' : 'left'}; font-size: 12px; color: #4b5563; font-weight: bold; width: 60%;">${lang === 'ar' ? 'نوع المخرج الفرعي / الفاقد' : 'Secondary Output / Loss Category'}</th>
                    <th style="padding: 10px; text-align: ${isRtl ? 'right' : 'left'}; font-size: 12px; color: #4b5563; font-weight: bold; width: 40%;">${lang === 'ar' ? 'الكمية' : 'Quantity'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${job.scrapQty ? `
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                      <td style="padding: 12px 10px; font-size: 13px; color: #374151; font-weight: 600;">${lang === 'ar' ? 'هري التشغيل' : 'Processing Scrap'}</td>
                      <td style="padding: 12px 10px; font-size: 13px; font-weight: 800; color: #b45309;">${job.scrapQty.toLocaleString()} kg</td>
                    </tr>
                  ` : ''}
                  ${job.farzaQty ? `
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                      <td style="padding: 12px 10px; font-size: 13px; color: #374151; font-weight: 600;">${lang === 'ar' ? 'الفرزة' : 'Reject (Farza)'}</td>
                      <td style="padding: 12px 10px; font-size: 13px; font-weight: 800; color: #b45309;">${job.farzaQty.toLocaleString()} kg</td>
                    </tr>
                  ` : ''}
                  ${job.seedQty ? `
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                      <td style="padding: 12px 10px; font-size: 13px; color: #374151; font-weight: 600;">${lang === 'ar' ? 'البذرة' : 'Seed'}</td>
                      <td style="padding: 12px 10px; font-size: 13px; font-weight: 800; color: #b45309;">${job.seedQty.toLocaleString()} kg</td>
                    </tr>
                  ` : ''}
                  ${job.wasteQty ? `
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                      <td style="padding: 12px 10px; font-size: 13px; color: #374151; font-weight: 600;">${lang === 'ar' ? 'الهالك' : 'Waste / Loss'}</td>
                      <td style="padding: 12px 10px; font-size: 13px; font-weight: 800; color: #b45309;">${job.wasteQty.toLocaleString()} kg</td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${job.notes ? `
            <div class="footer-notes">
              <span class="info-label">${t.comments}</span>
              "${job.notes}"
            </div>
          ` : ''}
        </div>

        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const exportSingleJobToExcel = async (job: ProcessingJob) => {
    const isRtl = lang === 'ar';
    const trans = translations[lang];
    const toastId = toast.loading(isRtl ? 'جاري تحضير ملف Excel...' : 'Preparing Excel file...');

    try {
      // 1. Prepare data rows
      const inputRows: { code: string; name: string | number; qty: number | string }[] = [];
      job.inputs.forEach(input => {
        inputRows.push({
          code: input.itemCode,
          name: input.itemName,
          qty: input.quantity
        });
      });

      if (job.scrapQty) {
        inputRows.push({
          code: isRtl ? 'هري التشغيل' : 'Processing Scrap',
          name: job.scrapQty,
          qty: ''
        });
      }
      if (job.farzaQty) {
        inputRows.push({
          code: isRtl ? 'الفرزة' : 'Reject (Farza)',
          name: job.farzaQty,
          qty: ''
        });
      }
      if (job.seedQty) {
        inputRows.push({
          code: isRtl ? 'البذرة' : 'Seed',
          name: job.seedQty,
          qty: ''
        });
      }
      if (job.wasteQty) {
        inputRows.push({
          code: isRtl ? 'الهالك' : 'Waste / Loss',
          name: job.wasteQty,
          qty: ''
        });
      }

      const outputRows: { code: string; name: string; qty: number | string }[] = [];
      job.outputs.forEach(output => {
        outputRows.push({
          code: output.itemCode,
          name: output.itemName,
          qty: output.quantity
        });
      });

      const numDataRows = Math.max(inputRows.length, outputRows.length, 1);

      const warehouse = warehouses.find(w => w.id === job.warehouseId);
      const pricePerKg = job.confirmedPrice || warehouse?.processingPricePerKg || 0;
      const supplierCode = warehouse?.supplierCode || job.warehouseCode || '';
      const supplierName = job.supplierName || job.thirdPartyName || warehouse?.name || '';
      const warehouseCode = job.warehouseCode || '';

      let workbook = new ExcelJS.Workbook();
      let worksheet: ExcelJS.Worksheet;
      let loadedFromTemplate = false;

      try {
        const response = await fetch('/op.xlsx');
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          await workbook.xlsx.load(arrayBuffer);
          worksheet = workbook.worksheets[0] || workbook.getWorksheet(1);
          loadedFromTemplate = true;
        }
      } catch (templateError) {
        console.warn("Could not load template, using fallback styling from scratch", templateError);
      }

      if (loadedFromTemplate && worksheet!) {
        // Adjust sheet row counts
        const defaultTemplateDataRows = 3; // rows 2, 3, 4 are template data rows
        const originalTotalRowIdx = 5;

        if (numDataRows > defaultTemplateDataRows) {
          const rowsToAdd = numDataRows - defaultTemplateDataRows;
          for (let k = 0; k < rowsToAdd; k++) {
            const insertIdx = originalTotalRowIdx + k;
            worksheet.insertRow(insertIdx, []);
            
            // Copy cell styles from Row 2 to the newly inserted row
            const srcRow = worksheet.getRow(2);
            const destRow = worksheet.getRow(insertIdx);
            destRow.height = srcRow.height;
            for (let c = 1; c <= 16; c++) {
              const srcCell = srcRow.getCell(c);
              const destCell = destRow.getCell(c);
              destCell.style = JSON.parse(JSON.stringify(srcCell.style || {}));
            }
          }
        } else if (numDataRows < defaultTemplateDataRows) {
          const rowsToRemove = defaultTemplateDataRows - numDataRows;
          for (let k = 0; k < rowsToRemove; k++) {
            const deleteIdx = 4 - k;
            worksheet.spliceRows(deleteIdx, 1);
          }
        }

        const totalRowIdx = numDataRows + 2;

        // Populate Data Rows
        for (let i = 0; i < numDataRows; i++) {
          const r = i + 2;
          const row = worksheet.getRow(r);

          // Date in Column A
          if (i === 0) {
            row.getCell(1).value = job.date;
          } else {
            row.getCell(1).value = '';
          }

          // Input Columns (B, C, D)
          if (i < inputRows.length) {
            const item = inputRows[i];
            row.getCell(2).value = item.code;
            row.getCell(3).value = item.name;
            row.getCell(4).value = item.qty !== '' ? Number(item.qty) : '';
          } else {
            row.getCell(2).value = '';
            row.getCell(3).value = '';
            row.getCell(4).value = '';
          }

          // Output Columns (E, F, G)
          if (i < outputRows.length) {
            const item = outputRows[i];
            row.getCell(5).value = item.code;
            row.getCell(6).value = item.name;
            row.getCell(7).value = item.qty !== '' ? Number(item.qty) : '';
          } else {
            row.getCell(5).value = '';
            row.getCell(6).value = '';
            row.getCell(7).value = '';
          }

          // Metadata Columns (J, K, L, M) - on first data row only
          if (i === 0) {
            row.getCell(10).value = supplierCode;
            row.getCell(11).value = supplierName;
            row.getCell(12).value = warehouseCode;
            row.getCell(13).value = job.notes || '';
          } else {
            row.getCell(10).value = '';
            row.getCell(11).value = '';
            row.getCell(12).value = '';
            row.getCell(13).value = '';
          }

          // Clear remaining cells on data rows for safe formatting
          row.getCell(8).value = ''; // H (سعر التشغيل)
          row.getCell(9).value = ''; // I (اجمالى سعر التشغيل)
          row.getCell(14).value = ''; // N (الفرق)
          row.getCell(15).value = ''; // O (النسبة)
          row.getCell(16).value = ''; // P (السعر)
        }

        // Populate Total Row
        const totalRow = worksheet.getRow(totalRowIdx);
        totalRow.getCell(1).value = isRtl ? 'الاجمالي' : 'Total';
        totalRow.getCell(4).value = { formula: `SUM(D2:D${totalRowIdx - 1})` };
        totalRow.getCell(7).value = { formula: `SUM(G2:G${totalRowIdx - 1})` };
        totalRow.getCell(8).value = Number(pricePerKg);
        totalRow.getCell(9).value = { formula: `H${totalRowIdx}*D${totalRowIdx}` };
        totalRow.getCell(14).value = { formula: `D${totalRowIdx}-G${totalRowIdx}` };
        totalRow.getCell(15).value = { formula: `N${totalRowIdx}/D${totalRowIdx}` };

        // Ensure proper percentage styling is retained
        const cellO = totalRow.getCell(15);
        cellO.numFmt = '0.0%';

        // Force RTL view state and gridlines visible
        worksheet.views = [{ showGridLines: true, rightToLeft: true }];

        // Explicitly set column widths to ensure perfect readability and avoid "#####"
        worksheet.getColumn(1).width = 14;  // التاريخ
        worksheet.getColumn(2).width = 16;  // كود ساب مدخل
        worksheet.getColumn(3).width = 42;  // اسم الصنف مدخل
        worksheet.getColumn(4).width = 16;  // الكمية مدخل
        worksheet.getColumn(5).width = 16;  // كود ساب مخرج
        worksheet.getColumn(6).width = 42;  // اسم الصنف مخرج
        worksheet.getColumn(7).width = 16;  // الكمية مخرج
        worksheet.getColumn(8).width = 16;  // سعر التشغيل
        worksheet.getColumn(9).width = 22;  // اجمالى سعر التشغيل
        worksheet.getColumn(10).width = 16; // كود المورد
        worksheet.getColumn(11).width = 28; // المورد
        worksheet.getColumn(12).width = 16; // كود المخزن
        worksheet.getColumn(13).width = 30; // ملاحظات
        worksheet.getColumn(14).width = 16; // الفرق
        worksheet.getColumn(15).width = 16; // النسبة
        worksheet.getColumn(16).width = 16; // السعر

      } else {
        // High fidelity styled manual fallback
        worksheet = workbook.addWorksheet('Sheet1', { views: [{ showGridLines: true, rightToLeft: true }] });

        // Set column widths
        worksheet.getColumn(1).width = 14;  // التاريخ
        worksheet.getColumn(2).width = 16;  // كود ساب مدخل
        worksheet.getColumn(3).width = 42;  // اسم الصنف مدخل
        worksheet.getColumn(4).width = 16;  // الكمية مدخل
        worksheet.getColumn(5).width = 16;  // كود ساب مخرج
        worksheet.getColumn(6).width = 42;  // اسم الصنف مخرج
        worksheet.getColumn(7).width = 16;  // الكمية مخرج
        worksheet.getColumn(8).width = 16;  // سعر التشغيل
        worksheet.getColumn(9).width = 22;  // اجمالى سعر التشغيل
        worksheet.getColumn(10).width = 16; // كود المورد
        worksheet.getColumn(11).width = 28; // المورد
        worksheet.getColumn(12).width = 16; // كود المخزن
        worksheet.getColumn(13).width = 30; // ملاحظات
        worksheet.getColumn(14).width = 16; // الفرق
        worksheet.getColumn(15).width = 16; // النسبة
        worksheet.getColumn(16).width = 16; // السعر

        // Define styling objects
        const headerFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 11, bold: true, color: { argb: '000000' } };
        const dataFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 10, color: { argb: '000000' } };
        const boldDataFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 10, bold: true, color: { argb: '000000' } };
        const redBoldFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 10, bold: true, color: { argb: '9C0006' } };

        const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9D9D9' } }; // Light gray header
        const qtyFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } }; // Soft gold/yellow
        const supplierFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FCE4D6' } }; // Soft orange
        const codeFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DDEBF7' } }; // Soft blue
        const totalRowFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Yellow
        const ratioFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Special ratio row column
        
        const thinBorder: Partial<ExcelJS.Borders> = {
          top: { style: 'thin' as const, color: { argb: 'A0A0A0' } },
          left: { style: 'thin' as const, color: { argb: 'A0A0A0' } },
          bottom: { style: 'thin' as const, color: { argb: 'A0A0A0' } },
          right: { style: 'thin' as const, color: { argb: 'A0A0A0' } }
        };

        const centerAlignment: Partial<ExcelJS.Alignment> = { 
          vertical: 'middle' as const, 
          horizontal: 'center' as const, 
          wrapText: true 
        };

        // 1. Write Header Row
        const headers = [
          isRtl ? 'التاريخ' : 'Date',
          isRtl ? 'كود ساب مدخل' : 'Input SAP Code',
          isRtl ? 'اسم الصنف مدخل' : 'Input Item Name',
          isRtl ? 'الكمية مدخل' : 'Input Qty',
          isRtl ? 'كود ساب مخرج' : 'Output SAP Code',
          isRtl ? 'اسم الصنف مخرج' : 'Output Item Name',
          isRtl ? 'الكمية مخرج' : 'Output Qty',
          isRtl ? 'سعر التشغيل' : 'Processing Price',
          isRtl ? 'اجمالى سعر التشغيل' : 'Total Processing Price',
          isRtl ? 'كود المورد' : 'Supplier Code',
          isRtl ? 'المورد' : 'Supplier',
          isRtl ? 'كود المخزن' : 'Warehouse Code',
          isRtl ? 'ملاحظات' : 'Notes',
          isRtl ? 'الفرق' : 'Difference',
          isRtl ? 'النسبة' : 'Percentage',
          isRtl ? 'السعر' : 'Price'
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.height = 30;
        for (let c = 1; c <= 16; c++) {
          const cell = headerRow.getCell(c);
          cell.value = headers[c - 1];
          cell.font = headerFont;
          cell.fill = headerFill;
          cell.border = thinBorder;
          cell.alignment = centerAlignment;
        }

        // 2. Populate Data Rows
        for (let i = 0; i < numDataRows; i++) {
          const r = i + 2;
          const row = worksheet.getRow(r);
          row.height = 24;

          for (let c = 1; c <= 16; c++) {
            const cell = row.getCell(c);
            cell.font = dataFont;
            cell.border = thinBorder;
            cell.alignment = centerAlignment;
          }

          // Date Col A
          if (i === 0) {
            row.getCell(1).value = job.date;
          }

          // Input B, C, D
          if (i < inputRows.length) {
            const item = inputRows[i];
            row.getCell(2).value = item.code;
            row.getCell(3).value = item.name;
            if (item.qty !== '') {
              row.getCell(4).value = Number(item.qty);
              row.getCell(4).fill = qtyFill;
              row.getCell(4).numFmt = '#,##0';
            }
          }

          // Output E, F, G
          if (i < outputRows.length) {
            const item = outputRows[i];
            row.getCell(5).value = item.code;
            row.getCell(6).value = item.name;
            if (item.qty !== '') {
              row.getCell(7).value = Number(item.qty);
              row.getCell(7).fill = qtyFill;
              row.getCell(7).numFmt = '#,##0';
            }
          }

          // Metadata J, K, L, M
          if (i === 0) {
            row.getCell(10).value = supplierCode;
            row.getCell(10).fill = codeFill;
            row.getCell(11).value = supplierName;
            row.getCell(11).fill = supplierFill;
            row.getCell(12).value = warehouseCode;
            row.getCell(13).value = job.notes || '';
          }
        }

        // 3. Populate Total Row (Row numDataRows + 2)
        const totalRowIdx = numDataRows + 2;
        const totalRow = worksheet.getRow(totalRowIdx);
        totalRow.height = 28;

        for (let c = 1; c <= 16; c++) {
          const cell = totalRow.getCell(c);
          cell.font = boldDataFont;
          cell.border = thinBorder;
          cell.alignment = centerAlignment;
          cell.fill = totalRowFill;
        }

        totalRow.getCell(1).value = isRtl ? 'الاجمالي' : 'Total';
        
        const cellD = totalRow.getCell(4);
        cellD.value = { formula: `SUM(D2:D${totalRowIdx - 1})` };
        cellD.numFmt = '#,##0';

        const cellG = totalRow.getCell(7);
        cellG.value = { formula: `SUM(G2:G${totalRowIdx - 1})` };
        cellG.numFmt = '#,##0';

        const cellH = totalRow.getCell(8);
        cellH.value = Number(pricePerKg);
        cellH.numFmt = '#,##0.00';

        const cellI = totalRow.getCell(9);
        cellI.value = { formula: `H${totalRowIdx}*D${totalRowIdx}` };
        cellI.numFmt = '#,##0.00';

        const cellN = totalRow.getCell(14);
        cellN.value = { formula: `D${totalRowIdx}-G${totalRowIdx}` };
        cellN.numFmt = '#,##0';

        const cellO = totalRow.getCell(15);
        cellO.value = { formula: `N${totalRowIdx}/D${totalRowIdx}` };
        cellO.numFmt = '0.0%';
        cellO.font = redBoldFont; // Red text for loss ratio
      }

      // Write and save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `Job_${job.warehouseCode || 'Report'}_${job.date}.xlsx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(isRtl ? 'تم تحميل ملف Excel بنجاح' : 'Excel file downloaded successfully', { id: toastId });
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error(isRtl ? 'فشل تصدير Excel' : 'Excel export failed', { id: toastId });
    }
  };

  const exportSingleJobToWord = async (job: ProcessingJob) => {
    const isRtl = lang === 'ar';
    const toastId = toast.loading(isRtl ? 'جاري تحضير ملف Word...' : 'Preparing Word file...');
    try {
      const warehouse = warehouses.find(w => w.id === job.warehouseId);
      const pricePerKg = job.confirmedPrice || warehouse?.processingPricePerKg || 0;
      const supplierCode = warehouse?.supplierCode || job.warehouseCode || "-";

      const totalIn = job.inputs.reduce((sum, i) => sum + i.quantity, 0);
      const totalOut = job.outputs.reduce((sum, i) => sum + i.quantity, 0);
      const totalCost = totalIn * pricePerKg;
      const lossPercent = totalIn > 0 ? (((totalIn - totalOut) / totalIn) * 100).toFixed(1) + '%' : '0%';

      const maxRows = Math.max(job.inputs.length, job.outputs.length);
      const rowsCount = Math.max(maxRows, 5);

      const findUserName = (uid: string | undefined) => {
        if (!uid) return ".............";
        const u = users.find(u => u.id === uid || u.uid === uid);
        return u?.displayName || u?.email?.split('@')[0] || ".............";
      };

      // Helper for creating centered bold cells
      const createCell = (text: string, options: any = {}) => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: String(text), size: options.size || 18, bold: options.bold, color: options.color || "000000" })],
          alignment: options.align || AlignmentType.CENTER,
        })],
        shading: options.bg ? { fill: options.bg, type: ShadingType.CLEAR } : undefined,
        verticalAlign: VerticalAlign.CENTER,
        width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
        borders: options.noBorder ? {
          top: { style: BorderStyle.NONE, size: 0 },
          bottom: { style: BorderStyle.NONE, size: 0 },
          left: { style: BorderStyle.NONE, size: 0 },
          right: { style: BorderStyle.NONE, size: 0 },
        } : undefined,
      });

      // 1. Metadata Table
      const metadataTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0 },
          bottom: { style: BorderStyle.NONE, size: 0 },
          left: { style: BorderStyle.NONE, size: 0 },
          right: { style: BorderStyle.NONE, size: 0 },
          insideHorizontal: { style: BorderStyle.NONE, size: 0 },
          insideVertical: { style: BorderStyle.NONE, size: 0 },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 47, type: WidthType.PERCENTAGE },
                children: [
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                      new TableRow({ children: [
                        createCell(isRtl ? "سعر التشغيل للكيلو" : "Price / KG", { bg: "F1F5F9", bold: true, width: 55 }),
                        createCell(`${pricePerKg.toLocaleString()} EGP`, { width: 45, bold: true })
                      ]}),
                      new TableRow({ children: [
                        createCell(isRtl ? "اجمالى تكلفة التشغيل" : "Total Processing Cost", { bg: "F1F5F9", bold: true }),
                        createCell(`${totalCost.toLocaleString()} EGP`, { bg: "F8FAFC", bold: true })
                      ]}),
                      new TableRow({ children: [
                        createCell(isRtl ? "الفرق" : "Difference", { bg: "F1F5F9", bold: true }),
                        createCell(`${(totalIn - totalOut).toLocaleString()} kg`, { bg: "F8FAFC", bold: true, color: "2563EB" })
                      ]}),
                      new TableRow({ children: [
                        createCell(isRtl ? "نسبة الفقد" : "Loss %", { bg: "F1F5F9", bold: true }),
                        createCell(lossPercent, { bg: "F8FAFC", bold: true, color: "DC2626" })
                      ]}),
                    ]
                  })
                ]
              }),
              new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, children: [] }),
              new TableCell({
                width: { size: 47, type: WidthType.PERCENTAGE },
                children: [
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                      new TableRow({ children: [
                        createCell(isRtl ? "كود المورد" : "Supplier Code", { bg: "F1F5F9", bold: true, width: 40 }),
                        createCell(supplierCode, { width: 60, bold: true })
                      ]}),
                      new TableRow({ children: [
                        createCell(isRtl ? "اسم المورد" : "Supplier Name", { bg: "F1F5F9", bold: true }),
                        createCell(job.warehouseName || job.supplierName || job.thirdPartyName || "-", { bg: "F8FAFC", bold: true })
                      ]}),
                      new TableRow({ children: [
                        createCell(isRtl ? "كود المخزن" : "Warehouse Code", { bg: "F1F5F9", bold: true }),
                        createCell(job.warehouseCode || "-", { bg: "F8FAFC", bold: true })
                      ]}),
                      new TableRow({ children: [
                        createCell(isRtl ? "رقم العملية" : "Process Code", { bg: "F1F5F9", bold: true }),
                        createCell(job.jobCode || "-", { bg: "F8FAFC", bold: true, color: "059669" })
                      ]}),
                      new TableRow({ children: [
                        createCell(isRtl ? "رقم PO" : "PO Number", { bg: "F1F5F9", bold: true }),
                        createCell(job.poNumber || "-", { bg: "F8FAFC", bold: true, color: "2563EB" })
                      ]}),
                      new TableRow({ children: [
                        createCell(isRtl ? "عملية التشغيل" : "Process Operation", { bg: "F1F5F9", bold: true }),
                        createCell(getOperationLabel(job.processOperation) || "-", { bg: "F8FAFC", bold: true })
                      ]}),
                    ]
                  })
                ]
              })
            ]
          })
        ]
      });

      // 2. Main Tables
      const inputsRowsList = [
        new TableRow({
          children: [
            createCell("كود ساب", { bg: "DBEAFE", bold: true, width: 25, color: "1E3A8A" }),
            createCell("اسم الصنف", { bg: "DBEAFE", bold: true, width: 55, color: "1E3A8A" }),
            createCell("الكمية", { bg: "DBEAFE", bold: true, width: 20, color: "1E3A8A" }),
          ]
        })
      ];

      for (let i = 0; i < rowsCount; i++) {
        const input = job.inputs[i];
        inputsRowsList.push(new TableRow({
          children: [
            createCell(input ? input.itemCode : "", { bold: true }),
            createCell(input ? input.itemName : "", { align: AlignmentType.RIGHT }),
            createCell(input ? input.quantity.toLocaleString() : "", { bold: true }),
          ]
        }));
      }

      inputsRowsList.push(new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [new Paragraph({ children: [new TextRun({ text: "إجمالي المدخلات", bold: true })], alignment: AlignmentType.RIGHT })],
            shading: { fill: "FACC15", type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
          }),
          createCell(totalIn.toLocaleString(), { bg: "FACC15", bold: true }),
        ]
      }));

      const outputsRowsList = [
        new TableRow({
          children: [
            createCell("كود ساب مخرج", { bg: "FFEDD5", bold: true, width: 25, color: "7C2D12" }),
            createCell("اسم الصنف مخرج", { bg: "FFEDD5", bold: true, width: 55, color: "7C2D12" }),
            createCell("الكمية مخرج", { bg: "FBBF24", bold: true, width: 20, color: "000000" }),
          ]
        })
      ];

      for (let i = 0; i < rowsCount; i++) {
        const output = job.outputs[i];
        outputsRowsList.push(new TableRow({
          children: [
            createCell(output ? output.itemCode : "", { bold: true }),
            createCell(output ? output.itemName : "", { align: AlignmentType.RIGHT }),
            createCell(output ? output.quantity.toLocaleString() : "", { bg: output ? "FEF3C7" : undefined, bold: true }),
          ]
        }));
      }

      outputsRowsList.push(new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [new Paragraph({ children: [new TextRun({ text: "إجمالي المخرجات", bold: true })], alignment: AlignmentType.RIGHT })],
            shading: { fill: "FACC15", type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
          }),
          createCell(totalOut.toLocaleString(), { bg: "FACC15", bold: true }),
        ]
      }));

      const mainTables = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0 },
          bottom: { style: BorderStyle.NONE, size: 0 },
          left: { style: BorderStyle.NONE, size: 0 },
          right: { style: BorderStyle.NONE, size: 0 },
          insideHorizontal: { style: BorderStyle.NONE, size: 0 },
          insideVertical: { style: BorderStyle.NONE, size: 0 },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 48.5, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "المدخلات (Inputs)", bold: true, color: "1E3A8A" })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 }
                  }),
                  new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: inputsRowsList })
                ]
              }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, children: [] }),
              new TableCell({
                width: { size: 48.5, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "المخرجات (Outputs)", bold: true, color: "7C2D12" })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 }
                  }),
                  new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: outputsRowsList })
                ]
              })
            ]
          })
        ]
      });

      // Assemble all comments
      const allComments = [];
      if (job.notes) allComments.push({ label: isRtl ? "ملاحظات العميل: " : "Customer Notes: ", text: job.notes });
      if (job.qualityComments) allComments.push({ label: isRtl ? "تعليقات الجودة: " : "Quality Comments: ", text: job.qualityComments });

      // 3. Secondary Outputs & Losses Table
      const showSecondaryTable = !!(job.scrapQty || job.farzaQty || job.seedQty || job.wasteQty);
      
      const secondaryTableTitle = new Paragraph({
        children: [new TextRun({ 
          text: isRtl ? "المخرجات الفرعية والفواقد" : "Secondary Outputs & Losses",
          bold: true,
          size: 24,
          color: "B45309"
        })],
        alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { before: 300, after: 120 }
      });

      const secondaryTableRows = [
        new TableRow({
          children: [
            createCell(isRtl ? "نوع المخرج الفرعي / الفاقد" : "Secondary Output / Loss Category", { bg: "FEF3C7", bold: true, width: 70, align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
            createCell(isRtl ? "الكمية" : "Quantity", { bg: "FEF3C7", bold: true, width: 30 })
          ]
        })
      ];

      if (job.scrapQty) {
        secondaryTableRows.push(new TableRow({
          children: [
            createCell(isRtl ? "هري التشغيل" : "Processing Scrap", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
            createCell(`${job.scrapQty.toLocaleString()} kg`, { bold: true, color: "B45309" })
          ]
        }));
      }
      if (job.farzaQty) {
        secondaryTableRows.push(new TableRow({
          children: [
            createCell(isRtl ? "الفرزة" : "Reject (Farza)", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
            createCell(`${job.farzaQty.toLocaleString()} kg`, { bold: true, color: "B45309" })
          ]
        }));
      }
      if (job.seedQty) {
        secondaryTableRows.push(new TableRow({
          children: [
            createCell(isRtl ? "البذرة" : "Seed", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
            createCell(`${job.seedQty.toLocaleString()} kg`, { bold: true, color: "B45309" })
          ]
        }));
      }
      if (job.wasteQty) {
        secondaryTableRows.push(new TableRow({
          children: [
            createCell(isRtl ? "الهالك" : "Waste / Loss", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
            createCell(`${job.wasteQty.toLocaleString()} kg`, { bold: true, color: "B45309" })
          ]
        }));
      }

      const secondaryTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: secondaryTableRows
      });

      const showQualityReport = (job.processOperation === 'Grading' && job.defectTotalDefect !== undefined) ||
                                (job.processOperation === 'PittingAndSlicing' && (
                                  job.slicingTime !== undefined ||
                                  job.slicingWeightPerKg !== undefined ||
                                  job.slicingPreProdBroken !== undefined
                                ));

      const qualityReportTitle = new Paragraph({
        children: [new TextRun({ 
          text: isRtl ? "تقرير الجودة" : "Quality Report",
          bold: true,
          size: 24,
          color: "1E3A8A"
        })],
        alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { before: 300, after: 120 }
      });

      const qualityTable = job.processOperation === 'Grading' ? new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              createCell(isRtl ? "نوع العيب / الاختبار" : "Defect / Test Type", { bg: "FEF3C7", bold: true, width: 70, align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(isRtl ? "النسبة المئوية (%)" : "Percentage (%)", { bg: "FEF3C7", bold: true, width: 30 })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "شوائب وأجسام غريبة (Foreign Bodies)" : "Foreign Bodies", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectForeignBodies ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "ثمار مصابة بحشرات (Olives have Insects)" : "Olives have Insects", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectOlivesInsects ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "قوام طري (Soft texture)" : "Soft texture", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectSoftTexture ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "لون غير متجانس (Bad Color)" : "Bad Color", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectBadColor ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "ثمار بعنق (Olives have stem)" : "Olives have stem", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectOlivesStem ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "عيوب قشرة (Skin Defect)" : "Skin Defect", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectSkinDefect ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "جيوب غازية (Gas Pocket)" : "Gas Pocket", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectGasPocket ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "ثمار منزوعة القشرة (Olives lose skin)" : "Olives lose skin", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectOlivesLoseSkin ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "أصناف أخرى (Other Variety)" : "Other Variety", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(`${job.defectOtherVariety ?? 0}%`, { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "إجمالي العيوب (Total defect)" : "Total defect", { bg: "FEE2E2", bold: true, align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT, color: "991B1B" }),
              createCell(`${job.defectTotalDefect ?? 0}%`, { bg: "FEE2E2", bold: true, color: "991B1B" })
            ]
          })
        ]
      }) : new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              createCell(isRtl ? "بيانات وبنود اختبار الجودة (شرائح وخلي)" : "Quality Test Field", { bg: "FEF3C7", bold: true, width: 60, align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(isRtl ? "المواصفة والبيان" : "Specification & Metric", { bg: "FEF3C7", bold: true, width: 40 })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "الوقت (Time)" : "Time", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingTime || "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "وزن/اسم لكل 1 كجم (Weight/Name per 1 Kg)" : "Weight/Name per 1 Kg", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingWeightPerKg || "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "نسبة عيوب كسر ما قبل الإنتاج (Pre-prod broken - ≤10%)" : "Pre-production Broken defects (≤10%)", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingPreProdBroken !== undefined ? `${job.slicingPreProdBroken}%` : "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "عيوب النوى (Pit defects - ≤5%)" : "Pit defects (≤5%)", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingPitDefects !== undefined ? `${job.slicingPitDefects}%` : "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "كسر الزيتون (Broken olives - ≤5%)" : "Broken olives (≤5%)", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingBrokenOlives !== undefined ? `${job.slicingBrokenOlives}%` : "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "النوى (Pits - ≤5%)" : "Pits (≤5%)", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingPits !== undefined ? `${job.slicingPits}%` : "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "إجمالي المنزّل (Total rejected/home - ≤12%)" : "Total home/rejected (≤12%)", { bg: "FEE2E2", color: "991B1B", align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingTotalRejected !== undefined ? `${job.slicingTotalRejected}%` : "-", { bg: "FEE2E2", color: "991B1B", bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "نسبة ملوحة محلول العوامة (Float salinity brine)" : "Float salinity brine", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingFloatSalinity || "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "الإجراء (Action)" : "Action", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingAction || "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "الإنتاج (Production)" : "Production", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingProduction || "-", { bold: true })
            ]
          }),
          new TableRow({
            children: [
              createCell(isRtl ? "رقابة الجودة (Quality Control)" : "Quality Control", { align: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT }),
              createCell(job.slicingQualityControl || "-", { bold: true })
            ]
          })
        ]
      });

      const qualityCommentsParagraph = job.defectComments ? new Paragraph({
        children: [
          new TextRun({ text: isRtl ? "ملاحظات عيوب التدريج: " : "Grading Defects Comments: ", bold: true }),
          new TextRun({ text: job.defectComments, italics: true })
        ],
        spacing: { before: 120 }
      }) : null;

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              size: { orientation: PageOrientation.PORTRAIT },
              margin: { top: 720, bottom: 720, left: 720, right: 720 },
            }
          },
          children: [
            new Paragraph({
              children: [new TextRun({ 
                text: `عملية تشغيل لدى ${job.warehouseName || job.supplierName || job.thirdPartyName || ''} بتاريخ ${job.date}`,
                bold: true,
                size: 32,
                color: "1E3A8A"
              })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
              border: { bottom: { color: "1E3A8A", space: 1, style: BorderStyle.SINGLE, size: 12 } }
            }),
            metadataTable,
            new Paragraph({ text: "", spacing: { after: 200 } }),
            mainTables,
            ...(showSecondaryTable ? [
              secondaryTableTitle,
              secondaryTable
            ] : []),
            ...(showQualityReport ? [
              qualityReportTitle,
              qualityTable,
              ...(qualityCommentsParagraph ? [qualityCommentsParagraph] : [])
            ] : []),
            ...allComments.map(comment => new Paragraph({
              children: [
                new TextRun({ text: comment.label, bold: true }),
                new TextRun({ text: comment.text })
              ],
              spacing: { before: 200 }
            })),
            new Paragraph({ text: "", spacing: { before: 800 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE, size: 0 },
                bottom: { style: BorderStyle.NONE, size: 0 },
                left: { style: BorderStyle.NONE, size: 0 },
                right: { style: BorderStyle.NONE, size: 0 },
                insideHorizontal: { style: BorderStyle.NONE, size: 0 },
                insideVertical: { style: BorderStyle.NONE, size: 0 },
              },
              rows: [
                new TableRow({
                  children: [
                    createCell(isRtl ? "مسئول المشتريات" : "Purchasing Officer", { bold: true, noBorder: true, size: 22 }),
                    createCell(isRtl ? "مسئول الجودة" : "Quality Officer", { bold: true, noBorder: true, size: 22 }),
                    createCell(isRtl ? "مسئول المخزن" : "Warehouse Officer", { bold: true, noBorder: true, size: 22 }),
                    createCell(isRtl ? "مستلم العميل" : "Customer Recipient", { bold: true, noBorder: true, size: 22 }),
                  ]
                }),
                new TableRow({
                  children: [
                    createCell(isRtl ? `بواسطة: ${findUserName(job.purchasingApproverId)}` : `By: ${findUserName(job.purchasingApproverId)}`, { noBorder: true, size: 18 }),
                    createCell(isRtl ? `بواسطة: ${findUserName(job.qualityApproverId)}` : `By: ${findUserName(job.qualityApproverId)}`, { noBorder: true, size: 18 }),
                    createCell(isRtl ? `بواسطة: ${findUserName(job.warehouseApproverId)}` : `By: ${findUserName(job.warehouseApproverId)}`, { noBorder: true, size: 18 }),
                    createCell(isRtl ? `بواسطة: ${findUserName(job.createdBy)}` : `By: ${findUserName(job.createdBy)}`, { noBorder: true, size: 18 }),
                  ]
                })
              ]
            })
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `JobReport_${job.warehouseCode || 'Report'}_${job.date}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(isRtl ? 'تم تصدير ملف Word بنجاح' : 'Word file exported successfully', { id: toastId });
    } catch (error) {
      console.error("Word export error:", error);
      toast.error(isRtl ? 'فشل تصدير ملف Word' : 'Failed to export Word file', { id: toastId });
    }
  };

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="text-emerald-500" />
            {t.thirdPartyProcessing}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            {lang === 'ar' ? 'إدارة عمليات التشغيل والتحويل لدى الجهات الخارجية' : 'Manage processing jobs and conversions at third parties'}
          </p>
        </div>

        {!isAdding && !isSettingsOpen && (
          <div className="flex gap-2">
            {hasRole('Admin') && (
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-2xl font-bold transition-all"
              >
                <Settings size={20} className="text-zinc-500" />
                {lang === 'ar' ? 'ضبط التشغيلات' : 'Processing Settings'}
              </button>
            )}
            {hasRole(['Admin', 'Customer Operations', 'Warehouse Operations']) && (
              <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                <Plus size={20} />
                {t.addJob}
              </button>
            )}
          </div>
        )}
      </div>

      {isSettingsOpen ? (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden transition-all duration-300">
          <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Settings className="text-emerald-500" />
              {lang === 'ar' ? 'ضبط التشغيلات' : 'Processing Settings'}
            </h2>
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="px-4 py-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium transition-colors"
            >
              {lang === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
          
          <div className="p-6 space-y-10">
            {/* Email Management Section */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600">
                  <Mail size={18} />
                </div>
                <h3 className="font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-sm">
                  {lang === 'ar' ? 'إدارة البريد الإلكتروني (Outlook)' : 'Email Contacts Management (Outlook)'}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50/30 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-xs font-bold text-zinc-500 block px-1 uppercase">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input 
                      type="email" 
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="example@RichLandfi.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 block px-1 uppercase">{lang === 'ar' ? 'نوع الإدراج' : 'Field Type'}</label>
                  <div className="flex gap-2 h-[46px]">
                    <select 
                      value={emailType}
                      onChange={e => setEmailType(e.target.value as 'to' | 'cc')}
                      className="flex-1 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    >
                      <option value="to">TO</option>
                      <option value="cc">CC</option>
                    </select>
                    <button 
                      onClick={handleAddEmail}
                      className="aspect-square bg-blue-600 text-white flex items-center justify-center rounded-xl hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-500/20"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* TO Emails List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    To (المستلمون الأساسيون)
                  </h4>
                  <div className="space-y-2">
                    {toEmails.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                        {lang === 'ar' ? 'لا يوجد ميلات مضافة في To' : 'No emails added in TO field'}
                      </p>
                    ) : (
                      toEmails.map(email => (
                        <div key={email} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:border-emerald-200 dark:hover:border-emerald-900/30 transition-all group">
                          <span className="text-sm font-medium font-mono">{email}</span>
                          <button 
                            onClick={() => handleRemoveEmail(email, 'to')}
                            className="p-2 text-zinc-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* CC Emails List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    Cc (نسخة كربونية)
                  </h4>
                  <div className="space-y-2">
                    {ccEmails.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                        {lang === 'ar' ? 'لا يوجد ميلات مضافة في CC' : 'No emails added in CC field'}
                      </p>
                    ) : (
                      ccEmails.map(email => (
                        <div key={email} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:border-blue-200 dark:hover:border-blue-900/30 transition-all group">
                          <span className="text-sm font-medium font-mono">{email}</span>
                          <button 
                            onClick={() => handleRemoveEmail(email, 'cc')}
                            className="p-2 text-zinc-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Warehouse Management Section */}
            <section className="space-y-6 pt-10 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                  <Building2 size={18} />
                </div>
                <h3 className="font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-sm">
                  {lang === 'ar' ? 'إدارة المستودعات/المخازن' : 'Warehouse Management'}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/30 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 block px-1 uppercase">{lang === 'ar' ? 'اسم المخزن' : 'Warehouse Name'}</label>
                  <input 
                    type="text" 
                    value={newWarehouse.name}
                    onChange={e => setNewWarehouse({...newWarehouse, name: e.target.value})}
                    placeholder={lang === 'ar' ? 'مثال: مخزن القاهرة' : 'e.g. Cairo Warehouse'}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 block px-1 uppercase">{lang === 'ar' ? 'كود السيستم' : 'System Code'}</label>
                  <input 
                    type="text" 
                    value={newWarehouse.systemCode}
                    onChange={e => setNewWarehouse({...newWarehouse, systemCode: e.target.value})}
                    placeholder="e.g. WH-001"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 block px-1 uppercase">{lang === 'ar' ? 'كود المورد' : 'Supplier Code'}</label>
                  <input 
                    type="text" 
                    value={newWarehouse.supplierCode}
                    onChange={e => setNewWarehouse({...newWarehouse, supplierCode: e.target.value})}
                    placeholder="e.g. SUP-001"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 block px-1 uppercase">{lang === 'ar' ? 'سعر التشغيل للكيلو' : 'Processing Price / KG'}</label>
                  <input 
                    type="number" 
                    value={newWarehouse.processingPricePerKg}
                    onChange={e => setNewWarehouse({...newWarehouse, processingPricePerKg: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 block px-1 uppercase">{lang === 'ar' ? 'رمز المخزن' : 'Warehouse Code'}</label>
                  <input 
                    type="text" 
                    value={newWarehouse.contactName}
                    onChange={e => setNewWarehouse({...newWarehouse, contactName: e.target.value})}
                    placeholder={lang === 'ar' ? 'مثل Bcl' : 'e.g. WH'}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-mono uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 block px-1 uppercase">{lang === 'ar' ? 'رابط جروب الواتساب' : 'WhatsApp Group Link'}</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newWarehouse.whatsappGroup}
                      onChange={e => setNewWarehouse({...newWarehouse, whatsappGroup: e.target.value})}
                      placeholder="https://chat.whatsapp.com/..."
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500 flex-1 font-medium text-xs"
                    />
                    {editingWarehouseId ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={handleAddWarehouse}
                          title={lang === 'ar' ? 'تحديث' : 'Update'}
                          className="bg-emerald-600 text-white px-5 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                        >
                          <Save size={20} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingWarehouseId(null);
                            setNewWarehouse({ name: '', systemCode: '', supplierCode: '', processingPricePerKg: '', contactName: '', whatsappGroup: '' });
                          }}
                          title={lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={handleAddWarehouse}
                        className="bg-emerald-600 text-white px-5 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        <Plus size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouses.length === 0 ? (
                   <p className="col-span-full text-center py-10 text-zinc-500 italic">
                      {lang === 'ar' ? 'لا يوجد مخازن مضافة بعد' : 'No warehouses added yet'}
                   </p>
                ) : (
                  warehouses.map(w => (
                    <div key={w.id} className={`p-5 rounded-2xl border ${editingWarehouseId === w.id ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-zinc-200 dark:border-zinc-800'} bg-white dark:bg-zinc-900 shadow-sm relative group hover:ring-2 hover:ring-emerald-500/20 transition-all`}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:scale-110 transition-transform">
                          <Database size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{w.name}</h4>
                          <div className="flex flex-wrap gap-2">
                            <p className="text-[10px] text-zinc-500 font-mono font-bold tracking-wider">{w.systemCode}</p>
                            {w.supplierCode && (
                              <p className="text-[10px] text-emerald-500 font-mono font-bold tracking-wider">[{w.supplierCode}]</p>
                            )}
                            {w.processingPricePerKg !== undefined && (
                              <p className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-1.5 rounded font-bold">
                                {w.processingPricePerKg} EGP/kg
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => startEditingWarehouse(w)}
                          title={lang === 'ar' ? 'تعديل' : 'Edit'}
                          className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                        >
                          <Pencil size={15} />
                        </button>
                        <button 
                          onClick={() => handleDeleteWarehouse(w.id)}
                          title={lang === 'ar' ? 'حذف' : 'Delete'}
                          className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="mt-4 pt-4 border-t border-zinc-50 dark:border-zinc-800/50 flex flex-col gap-2">
                        {w.contactName && (
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                             <Tag size={12} className="text-emerald-500" />
                             <span className="font-bold">{lang === 'ar' ? 'رمز المخزن:' : 'Warehouse Code:'}</span>
                             <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-bold">{w.contactName}</span>
                          </div>
                        )}
                        {w.whatsappGroup && (
                          <a 
                            href={w.whatsappGroup} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-2 text-xs text-emerald-500 font-bold hover:underline"
                          >
                            <MessageCircle size={14} />
                            {lang === 'ar' ? 'جروب الواتساب' : 'WhatsApp Group'}
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Items Management Section */}
            <section className="space-y-6 pt-10 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg text-orange-600">
                    <FileSpreadsheet size={18} />
                  </div>
                  <h3 className="font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-sm">
                    {lang === 'ar' ? 'إدارة الأصناف' : 'Items Management'}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setShowManualAddItem(!showManualAddItem)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-850 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all border border-zinc-200 dark:border-zinc-700"
                  >
                    <Plus size={14} />
                    {lang === 'ar' ? 'إضافة صنف يدوي' : 'Add Item Manually'}
                  </button>

                  <label className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-orange-500/20">
                    <Download size={14} />
                    {lang === 'ar' ? 'استيراد أصناف (Excel)' : 'Import Items (Excel)'}
                    <input 
                      type="file" 
                      accept=".xlsx, .xls" 
                      onChange={handleImportItems}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {showManualAddItem && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
                  <h4 className="font-bold text-xs text-zinc-750 dark:text-zinc-300 uppercase tracking-widest">
                    {lang === 'ar' ? 'إضافة صنف جديد يدوياً' : 'Add New Item Manually'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-400 block pb-0.5">{lang === 'ar' ? 'كود الصنف' : 'Item Code'}</label>
                      <input 
                        type="text"
                        value={manualItemCode}
                        onChange={e => setManualItemCode(e.target.value)}
                        placeholder="e.g. PIC-S-G"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs text-zinc-800 dark:text-zinc-200 font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-400 block pb-0.5">{lang === 'ar' ? 'اسم الصنف' : 'Item Name'}</label>
                      <input 
                        type="text"
                        value={manualItemName}
                        onChange={e => setManualItemName(e.target.value)}
                        placeholder={lang === 'ar' ? 'اسم الصنف بالكامل' : 'Full Item Name'}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs text-zinc-800 dark:text-zinc-200 font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-400 block pb-0.5">{lang === 'ar' ? 'النوع' : 'Type Family'}</label>
                      <select 
                        value={manualItem.type}
                        onChange={e => setManualItem({ ...manualItem, type: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs text-zinc-850 dark:text-zinc-200 font-medium"
                      >
                        {CATEGORIES.type.map(cat => (
                          <option key={cat.id} value={cat.id}>{lang === 'ar' ? cat.labelAr : cat.labelEn}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-400 block pb-0.5">{lang === 'ar' ? 'العملية' : 'Process'}</label>
                      <select 
                        value={manualItem.process}
                        onChange={e => setManualItem({ ...manualItem, process: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs text-zinc-850 dark:text-zinc-200 font-medium"
                      >
                        {CATEGORIES.process.map(cat => (
                          <option key={cat.id} value={cat.id}>{lang === 'ar' ? cat.labelAr : cat.labelEn}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-400 block pb-0.5">{lang === 'ar' ? 'الاتجاه' : 'Direction'}</label>
                      <select 
                        value={manualItem.direction}
                        onChange={e => setManualItem({ ...manualItem, direction: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs text-zinc-850 dark:text-zinc-200 font-medium"
                      >
                        <option value="Any">{lang === 'ar' ? 'أي اتجاه (Any)' : 'Any'}</option>
                        {CATEGORIES.direction.map(cat => (
                          <option key={cat.id} value={cat.id}>{lang === 'ar' ? cat.labelAr : cat.labelEn}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-400 block pb-0.5">{lang === 'ar' ? 'المقاس' : 'Size'}</label>
                      <select 
                        value={manualItem.size}
                        onChange={e => setManualItem({ ...manualItem, size: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs text-zinc-850 dark:text-zinc-200 font-medium"
                      >
                        {CATEGORIES.size.map(cat => (
                          <option key={cat.id} value={cat.id}>{lang === 'ar' ? cat.labelAr : cat.labelEn}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <button 
                      type="button"
                      onClick={() => setShowManualAddItem(false)}
                      className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all"
                    >
                      {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button 
                      type="button"
                      onClick={handleAddManualItem}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-orange-500/20"
                    >
                      {lang === 'ar' ? 'إضافة الصنف' : 'Add Item'}
                    </button>
                  </div>
                </div>
              )}

              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                {dynamicItems.length === 0 ? (
                  <p className="text-center py-10 text-zinc-500 italic">
                    {lang === 'ar' ? 'لا يوجد أصناف مضافة بعد' : 'No items added yet'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dynamicItems.length > 50 && (
                      <div className="col-span-full p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-[10px] text-zinc-500 text-center">
                        {lang === 'ar' ? `يتم عرض ${dynamicItems.length} صنف` : `Displaying ${dynamicItems.length} items`}
                      </div>
                    )}
                    {dynamicItems.slice().sort((a,b) => a.name.localeCompare(b.name)).map(item => (
                      <div key={item.code} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:border-orange-200 dark:hover:border-orange-900/30 transition-all group">
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">{item.name}</span>
                          <span className="text-[10px] font-mono text-zinc-500">{item.code}</span>
                        </div>
                        <button 
                          onClick={async () => {
                            if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) {
                              try {
                                await deleteDoc(doc(db, COLLECTIONS.PROCESS_ITEMS, item.code));
                                toast.success(lang === 'ar' ? 'تم حذف الصنف' : 'Item removed');
                              } catch (e) {
                                toast.error(lang === 'ar' ? 'فشل الحذف' : 'Removal failed');
                              }
                            }
                          }}
                          className="p-2 text-zinc-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : isAdding ? (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden transition-all duration-300">
          <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              {editingJobId ? <Save className="text-blue-500" /> : <Plus className="text-emerald-500" />}
              {editingJobId ? (lang === 'ar' ? 'تعديل عملية التشغيل' : 'Edit Processing Job') : t.addJob}
            </h2>
            <button 
              onClick={() => {
                setIsAdding(false);
                setEditingJobId(null);
                setNewJob({
                  date: new Date().toISOString().split('T')[0],
                  warehouseId: '',
                  warehouseName: '',
                  warehouseCode: '',
                  inputs: [],
                  outputs: [],
                  scrapQty: 0,
                  farzaQty: 0,
                  seedQty: 0,
                  wasteQty: 0,
                  status: 'Pending Warehouse',
                  notes: '',
                  processOperation: ''
                });
              }}
              className="px-4 py-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium transition-colors"
            >
              {t.cancel}
            </button>
          </div>

          <div className="p-6 space-y-8">
            {/* Efficiency Summary Bar */}
            {(newJob.inputs.length > 0 || newJob.outputs.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1">
                    {lang === 'ar' ? 'إجمالي المدخلات' : 'Total Inputs'}
                  </span>
                  <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                    {newJob.inputs.reduce((sum, i) => sum + i.quantity, 0).toLocaleString()} <span className="text-xs">kg</span>
                  </span>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-1">
                    {lang === 'ar' ? 'إجمالي المخرجات' : 'Total Outputs'}
                  </span>
                  <span className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {newJob.outputs.reduce((sum, i) => sum + i.quantity, 0).toLocaleString()} <span className="text-xs">kg</span>
                  </span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                    {lang === 'ar' ? 'نسبة التشغيل (الهالك)' : 'Yield / Efficiency'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-zinc-900 dark:text-white">
                      {(() => {
                        const totalIn = newJob.inputs.reduce((sum, i) => sum + i.quantity, 0);
                        const totalOut = newJob.outputs.reduce((sum, i) => sum + i.quantity, 0);
                        return (totalIn > 0 ? ((totalOut / totalIn) * 100).toFixed(1) : '0.0') + '%';
                      })()}</span>
                    <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500" 
                        style={{ 
                          width: `${(() => {
                            const totalIn = newJob.inputs.reduce((sum, i) => sum + i.quantity, 0);
                            const totalOut = newJob.outputs.reduce((sum, i) => sum + i.quantity, 0);
                            return Math.min(100, totalIn > 0 ? (totalOut / totalIn) * 100 : 0);
                          })()}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    {lang === 'ar' ? 'المخزن' : 'Warehouse'}
                  </label>
                  {newJob.warehouseId && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 font-bold uppercase">{lang === 'ar' ? 'كود المخزن:' : 'WH Code:'}</span>
                      <span className="text-xs font-mono bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-100 dark:border-emerald-900/30">
                        {warehouses.find(w => w.id === newJob.warehouseId)?.systemCode}
                      </span>
                    </div>
                  )}
                </div>
                <select 
                  value={newJob.warehouseId}
                  onChange={(e) => {
                    setNewJob({ 
                      ...newJob, 
                      warehouseId: e.target.value
                    });
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all"
                >
                  <option value="">{lang === 'ar' ? '-- اختر المخزن --' : '-- Select Warehouse --'}</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.systemCode})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t.processDate}</label>
                <input 
                  type="date" 
                  value={newJob.date}
                  onChange={(e) => setNewJob({ ...newJob, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  {lang === 'ar' ? 'عملية التشغيل' : 'Process Operation'}
                </label>
                <select
                  value={newJob.processOperation || ''}
                  onChange={(e) => setNewJob({ ...newJob, processOperation: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all"
                >
                  <option value="">{lang === 'ar' ? '-- اختر عملية التشغيل --' : '-- Select Operation --'}</option>
                  <option value="Grading">{lang === 'ar' ? 'تدريج' : 'Grading'}</option>
                  <option value="PittingAndSlicing">{lang === 'ar' ? 'خلي وشرائح' : 'Pitting & Slicing'}</option>
                  <option value="Other">{lang === 'ar' ? 'أخرى' : 'Other'}</option>
                </select>
              </div>
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Inputs Section */}
              <div className="space-y-4">
                  <ShortcutSelector 
                    title={t.inputs}
                    filters={inputFilters}
                    setFilters={setInputFilters}
                    selectedCode={currentInput.itemCode}
                    setSelectedCode={(code: string) => setCurrentInput({ ...currentInput, itemCode: code })}
                    availableItems={availableInputItems}
                    lang={lang}
                    themeColor="emerald"
                    searchTerm={inputSearch}
                    setSearchTerm={setInputSearch}
                  />
                
                <div className="p-4 rounded-2xl bg-emerald-50/10 dark:bg-emerald-900/5 border border-emerald-100/50 dark:border-emerald-900/20 space-y-4">
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={currentInput.quantity || ''}
                      onChange={(e) => setCurrentInput({ ...currentInput, quantity: parseFloat(e.target.value) || 0 })}
                      placeholder={t.quantity}
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button 
                      onClick={handleAddInput}
                      className="px-6 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center"
                    >
                      <Plus size={24} />
                    </button>
                  </div>

                  {newJob.inputs.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {newJob.inputs.map((input, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20 shadow-sm">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-400 font-mono">{input.itemCode}</span>
                            <span className="font-bold text-sm text-zinc-700 dark:text-zinc-200">{input.itemName}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-lg text-sm">{input.quantity} {input.unit}</span>
                            <button 
                              onClick={() => removeInput(idx)}
                              className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Outputs Section */}
              <div className="space-y-4">
                  <ShortcutSelector 
                    title={t.outputs}
                    filters={outputFilters}
                    setFilters={setOutputFilters}
                    selectedCode={currentOutput.itemCode}
                    setSelectedCode={(code: string) => setCurrentOutput({ ...currentOutput, itemCode: code })}
                    availableItems={availableOutputItems}
                    lang={lang}
                    themeColor="blue"
                    enforcedType={enforcedType}
                    searchTerm={outputSearch}
                    setSearchTerm={setOutputSearch}
                  />
                
                <div className="p-4 rounded-2xl bg-blue-50/10 dark:bg-blue-900/5 border border-blue-100/50 dark:border-blue-900/20 space-y-4">
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={currentOutput.quantity || ''}
                      onChange={(e) => setCurrentOutput({ ...currentOutput, quantity: parseFloat(e.target.value) || 0 })}
                      placeholder={t.quantity}
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button 
                      onClick={handleAddOutput}
                      className="px-6 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center"
                    >
                      <Plus size={24} />
                    </button>
                  </div>

                  {newJob.outputs.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {newJob.outputs.map((output, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 shadow-sm">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-400 font-mono">{output.itemCode}</span>
                            <span className="font-bold text-sm text-zinc-700 dark:text-zinc-200">{output.itemName}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg text-sm">{output.quantity} {output.unit}</span>
                            <button 
                              onClick={() => removeOutput(idx)}
                              className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Secondary Outputs & Losses */}
            <div className="p-5 rounded-3xl bg-amber-50/10 dark:bg-amber-900/5 border border-amber-100/50 dark:border-amber-900/20 space-y-4">
              <h3 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 text-xs uppercase tracking-wider">
                <Trash2 size={16} />
                {lang === 'ar' ? 'كميات المخرجات الفرعية والفواقد (كجم)' : 'Secondary Outputs & Losses (kg)'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{lang === 'ar' ? 'هري التشغيل' : 'Processing Scrap'}</span>
                  <input 
                    type="number" 
                    value={newJob.scrapQty || ''}
                    onChange={(e) => setNewJob({ ...newJob, scrapQty: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{lang === 'ar' ? 'الفرزة' : 'Reject (Farza)'}</span>
                  <input 
                    type="number" 
                    value={newJob.farzaQty || ''}
                    onChange={(e) => setNewJob({ ...newJob, farzaQty: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{lang === 'ar' ? 'البذرة' : 'Seed'}</span>
                  <input 
                    type="number" 
                    value={newJob.seedQty || ''}
                    onChange={(e) => setNewJob({ ...newJob, seedQty: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{lang === 'ar' ? 'الهالك' : 'Waste / Loss'}</span>
                  <input 
                    type="number" 
                    value={newJob.wasteQty || ''}
                    onChange={(e) => setNewJob({ ...newJob, wasteQty: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t.comments}</label>
              <textarea 
                value={newJob.notes}
                onChange={(e) => setNewJob({ ...newJob, notes: e.target.value })}
                rows={3}
                placeholder={lang === 'ar' ? 'أضف ملاحظات إضافية هنا...' : 'Add extra notes here...'}
                className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all resize-none"
              />
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={handleSaveJob}
                className="flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all shadow-xl shadow-emerald-500/20"
              >
                <Save size={20} />
                {t.save}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats/Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text"
                placeholder={lang === 'ar' ? 'البحث في سجل التشغيل...' : 'Search processing history...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:border-emerald-500 transition-all shadow-sm"
              />
            </div>

            <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm font-medium">
                {lang === 'ar' ? 'إجمالي العمليات:' : 'Total Jobs:'} {filteredJobs.length}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 border-dashed">
                <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <History className="text-zinc-400" />
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                  {lang === 'ar' ? 'لا توجد عمليات تشغيل مسجلة بعد' : 'No processing jobs recorded yet'}
                </p>
              </div>
            ) : (
              filteredJobs.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((job) => {
                const isExpanded = !!expandedJobs[job.id];
                return (
                  <div 
                    key={job.id}
                    className="group bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-all duration-300"
                  >
                    {/* Collapsible Header Summary Block */}
                    <div 
                      onClick={() => toggleJobExpanded(job.id)}
                      className="p-4 cursor-pointer select-none flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-all rounded-3xl"
                    >
                      {/* Left: Job Info */}
                      <div className="flex gap-3 items-center">
                        <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-100 dark:border-emerald-800/50">
                          <span className="text-[10px] font-bold uppercase leading-none opacity-60 mb-0.5">
                            {new Date(job.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short' })}
                          </span>
                          <span className="text-base font-black leading-none">{new Date(job.date).getDate()}</span>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-base text-zinc-900 dark:text-white leading-tight">
                              {job.warehouseName}
                            </h4>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-lg font-bold uppercase tracking-wider shrink-0 select-text ${
                              job.status === 'Completed' 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                : job.status === 'Rejected'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                : job.status.startsWith('Pending')
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}>
                              {job.status === 'Completed' 
                                ? (lang === 'ar' ? 'مكتمل' : 'Completed') 
                                : job.status === 'Pending Warehouse'
                                ? (lang === 'ar' ? 'قيد اعتماد المخزن' : 'Pending Warehouse')
                                : job.status === 'Pending Quality'
                                ? (lang === 'ar' ? 'قيد الجودة' : 'Pending Quality')
                                : job.status === 'Pending Purchasing'
                                ? (lang === 'ar' ? 'قيد المشتريات' : 'Pending Purchasing')
                                : job.status === 'Pending Completion'
                                ? (lang === 'ar' ? 'قيد الإكمال' : 'Pending Completion')
                                : job.status === 'Rejected'
                                ? (lang === 'ar' ? 'مرفوض' : 'Rejected')
                                : (lang === 'ar' ? 'مسودة' : 'Draft')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-bold text-zinc-500">
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono">
                              <Building2 size={14} className="opacity-70" />
                              {job.warehouseCode}
                              {job.jobCode && (
                                <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
                                  {job.jobCode}
                                </span>
                              )}
                            </span>
                            <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                            <span className="flex items-center gap-1">
                              <Clock size={14} className="opacity-70" />
                              {new Date(job.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' })}
                            </span>
                            {job.processOperation && (
                              <>
                                <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                                <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-lg text-[10px] font-black border border-amber-200 dark:border-amber-900/40">
                                  {getOperationLabel(job.processOperation)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Top Summary Stats */}
                      <div className="grid grid-cols-4 gap-1.5 flex-1 max-w-lg">
                        <div className="p-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-center">
                          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-0.5 leading-none">{lang === 'ar' ? 'المدخلات' : 'Inputs'}</span>
                          <span className="text-[11px] font-black text-zinc-900 dark:text-white leading-none">
                            {job.inputs.reduce((s, i) => s + i.quantity, 0).toLocaleString()} <span className="text-[8px] opacity-40">kg</span>
                          </span>
                        </div>
                        <div className="p-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-center">
                          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-0.5 leading-none">{lang === 'ar' ? 'المخرجات' : 'Outputs'}</span>
                          <span className="text-[11px] font-black text-zinc-900 dark:text-white leading-none">
                            {job.outputs.reduce((s, i) => s + i.quantity, 0).toLocaleString()} <span className="text-[8px] opacity-40">kg</span>
                          </span>
                        </div>
                        <div className="p-1.5 rounded-xl bg-emerald-100/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 text-center">
                          <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-0.5 leading-none">{lang === 'ar' ? 'التشغيل' : 'Yield'}</span>
                          <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 leading-none">
                            {(job.inputs.reduce((s, i) => s + i.quantity, 0) > 0 
                              ? (job.outputs.reduce((s, i) => s + i.quantity, 0) / job.inputs.reduce((s, i) => s + i.quantity, 0) * 100).toFixed(1)
                              : '0.0')}%
                          </span>
                        </div>
                        <div className="p-1.5 rounded-xl bg-rose-100/50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 text-center">
                          <span className="text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest block mb-0.5 leading-none">{lang === 'ar' ? 'الفقد' : 'Loss'}</span>
                          <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 leading-none">
                            {(job.inputs.reduce((s, i) => s + i.quantity, 0) > 0 
                              ? (((job.inputs.reduce((s, i) => s + i.quantity, 0) - job.outputs.reduce((s, i) => s + i.quantity, 0)) / job.inputs.reduce((s, i) => s + i.quantity, 0)) * 100).toFixed(1)
                              : '0.0')}%
                          </span>
                        </div>
                      </div>

                      {/* Chevron Trigger */}
                      <div className="flex items-center justify-center p-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {/* Collapsible Details Content */}
                    {isExpanded && (
                      <div className="p-4 pt-0 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        
                        {/* Actions row */}
                        <div className="mt-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100/80 dark:border-zinc-800/80">
                          {/* Role Specific Actions */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Warehouse Step 1 Actions */}
                            {hasRole(['Admin', 'Warehouse Operations']) && job.status === 'Pending Warehouse' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleApproveWarehouse(job); }}
                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 h-9"
                              >
                                <CheckCircle2 size={14} />
                                {lang === 'ar' ? 'اعتماد المخزن' : 'Warehouse Approve'}
                              </button>
                            )}

                             {/* Quality Actions */}
                             {hasRole(['Admin', 'Quality Operations']) && job.status === 'Pending Quality' && (
                               <div className="flex flex-col gap-4 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
                                 <div className="flex items-center gap-2 pb-1 border-b border-zinc-100 dark:border-zinc-800">
                                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                   <h4 className="text-[10px] font-black tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
                                     {job.processOperation === 'Grading' 
                                       ? (lang === 'ar' ? 'اعتماد جودة تشغيلة التدريج' : 'Grading Quality Approval Panel')
                                       : job.processOperation === 'PittingAndSlicing'
                                       ? (lang === 'ar' ? 'اعتماد جودة تشغيلة الخلي والشرائح' : 'Slicing Quality Approval Panel')
                                       : (lang === 'ar' ? 'اعتماد جودة التشغيلة' : 'Quality Approval Panel')}
                                   </h4>
                                 </div>

                                 {job.processOperation === 'Grading' ? (
                                   <div className="space-y-4">
                                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
                                       <div className="space-y-1">
                                         <span className="text-[10px] font-bold text-zinc-500 block leading-tight">Foreign Bodies</span>
                                         <input
                                           type="number"
                                           step="0.01"
                                           className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                           value={jobActionsState[job.id]?.defectForeignBodies !== undefined ? jobActionsState[job.id]?.defectForeignBodies : (job.defectForeignBodies || '')}
                                           onChange={(e) => handleUpdateDefect(job.id, 'defectForeignBodies', e.target.value)}
                                           placeholder="0"
                                         />
                                       </div>
                                       <div className="space-y-1">
                                         <span className="text-[10px] font-bold text-zinc-500 block leading-tight">Olives have Insects</span>
                                         <input
                                           type="number"
                                           step="0.01"
                                           className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                           value={jobActionsState[job.id]?.defectOlivesInsects !== undefined ? jobActionsState[job.id]?.defectOlivesInsects : (job.defectOlivesInsects || '')}
                                           onChange={(e) => handleUpdateDefect(job.id, 'defectOlivesInsects', e.target.value)}
                                           placeholder="0"
                                         />
                                       </div>
                                       <div className="space-y-1">
                                         <span className="text-[10px] font-bold text-zinc-500 block leading-tight">Soft texture</span>
                                         <input
                                           type="number"
                                           step="0.01"
                                           className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                           value={jobActionsState[job.id]?.defectSoftTexture !== undefined ? jobActionsState[job.id]?.defectSoftTexture : (job.defectSoftTexture || '')}
                                           onChange={(e) => handleUpdateDefect(job.id, 'defectSoftTexture', e.target.value)}
                                           placeholder="0"
                                         />
                                       </div>
                                       <div className="space-y-1">
                                         <span className="text-[10px] font-bold text-zinc-500 block leading-tight">Bad Color</span>
                                         <input
                                           type="number"
                                           step="0.01"
                                           className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                           value={jobActionsState[job.id]?.defectBadColor !== undefined ? jobActionsState[job.id]?.defectBadColor : (job.defectBadColor || '')}
                                           onChange={(e) => handleUpdateDefect(job.id, 'defectBadColor', e.target.value)}
                                           placeholder="0"
                                         />
                                       </div>
                                       <div className="space-y-1">
                                         <span className="text-[10px] font-bold text-zinc-500 block leading-tight">Olives have stem</span>
                                         <input
                                           type="number"
                                           step="0.01"
                                           className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                           value={jobActionsState[job.id]?.defectOlivesStem !== undefined ? jobActionsState[job.id]?.defectOlivesStem : (job.defectOlivesStem || '')}
                                           onChange={(e) => handleUpdateDefect(job.id, 'defectOlivesStem', e.target.value)}
                                           placeholder="0"
                                         />
                                       </div>
                                       <div className="space-y-1">
                                         <span className="text-[10px] font-bold text-zinc-500 block leading-tight">Skin Defect</span>
                                         <input
                                           type="number"
                                           step="0.01"
                                           className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                           value={jobActionsState[job.id]?.defectSkinDefect !== undefined ? jobActionsState[job.id]?.defectSkinDefect : (job.defectSkinDefect || '')}
                                           onChange={(e) => handleUpdateDefect(job.id, 'defectSkinDefect', e.target.value)}
                                           placeholder="0"
                                         />
                                       </div>
                                       <div className="space-y-1">
                                         <span className="text-[10px] font-bold text-zinc-500 block leading-tight">Gas Pocket</span>
                                         <input
                                           type="number"
                                           step="0.01"
                                           className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                           value={jobActionsState[job.id]?.defectGasPocket !== undefined ? jobActionsState[job.id]?.defectGasPocket : (job.defectGasPocket || '')}
                                           onChange={(e) => handleUpdateDefect(job.id, 'defectGasPocket', e.target.value)}
                                           placeholder="0"
                                         />
                                       </div>
                                       <div className="space-y-1">
                                         <span className="text-[10px] font-bold text-zinc-500 block leading-tight">Olives lose skin</span>
                                         <input
                                           type="number"
                                           step="0.01"
                                           className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                           value={jobActionsState[job.id]?.defectOlivesLoseSkin !== undefined ? jobActionsState[job.id]?.defectOlivesLoseSkin : (job.defectOlivesLoseSkin || '')}
                                           onChange={(e) => handleUpdateDefect(job.id, 'defectOlivesLoseSkin', e.target.value)}
                                           placeholder="0"
                                         />
                                       </div>
                                       <div className="space-y-1">
                                         <span className="text-[10px] font-bold text-zinc-500 block leading-tight">Other Variety</span>
                                         <input
                                           type="number"
                                           step="0.01"
                                           className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                           value={jobActionsState[job.id]?.defectOtherVariety !== undefined ? jobActionsState[job.id]?.defectOtherVariety : (job.defectOtherVariety || '')}
                                           onChange={(e) => handleUpdateDefect(job.id, 'defectOtherVariety', e.target.value)}
                                           placeholder="0"
                                         />
                                       </div>
                                       <div className="space-y-1">
                                         <span className="text-[10px] font-black text-rose-500 block leading-tight">Total defect</span>
                                         <input
                                           type="number"
                                           step="0.01"
                                           className="w-full px-2 py-1.5 text-xs font-black rounded-lg bg-rose-50/50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 outline-none text-center"
                                           value={jobActionsState[job.id]?.defectTotalDefect !== undefined ? jobActionsState[job.id]?.defectTotalDefect : (job.defectTotalDefect || '')}
                                           onChange={(e) => handleUpdateDefect(job.id, 'defectTotalDefect', e.target.value)}
                                           placeholder="0"
                                         />
                                       </div>
                                     </div>
                                     <div className="space-y-1">
                                       <span className="text-[10px] font-bold text-zinc-500 block leading-tight">Comments</span>
                                       <textarea
                                         placeholder={lang === 'ar' ? 'تعليقات العيوب الإضافية...' : 'Additional defects comments...'}
                                         value={jobActionsState[job.id]?.defectComments !== undefined ? jobActionsState[job.id]?.defectComments : (job.defectComments || '')}
                                         onChange={(e) => handleUpdateJobActionState(job.id, 'defectComments', e.target.value)}
                                         className="w-full p-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none h-12 resize-none"
                                       />
                                     </div>
                                   </div>
                                 ) : job.processOperation === 'PittingAndSlicing' ? (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-semibold text-zinc-500 block leading-tight">
                                            {lang === 'ar' ? 'الوقت' : 'Time'}
                                          </span>
                                          <input
                                            type="text"
                                            className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                            value={jobActionsState[job.id]?.slicingTime !== undefined ? jobActionsState[job.id]?.slicingTime : (job.slicingTime || '')}
                                            onChange={(e) => handleUpdateJobActionState(job.id, 'slicingTime', e.target.value)}
                                            placeholder="12:00"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <span className="text-[10px] font-semibold text-zinc-500 block leading-tight">
                                            {lang === 'ar' ? 'وزن/اسم لكل 1 كجم' : 'Weight/Name per 1 Kg'}
                                          </span>
                                          <input
                                            type="text"
                                            className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                            value={jobActionsState[job.id]?.slicingWeightPerKg !== undefined ? jobActionsState[job.id]?.slicingWeightPerKg : (job.slicingWeightPerKg || '')}
                                            onChange={(e) => handleUpdateJobActionState(job.id, 'slicingWeightPerKg', e.target.value)}
                                            placeholder="350 / L"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <span className="text-[10px] font-semibold text-zinc-500 block leading-tight text-amber-600 dark:text-amber-400">
                                            {lang === 'ar' ? 'كسر ما قبل الإنتاج (≤10%)' : 'Pre-Prod Broken (≤10%)'}
                                          </span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                            value={jobActionsState[job.id]?.slicingPreProdBroken !== undefined ? jobActionsState[job.id]?.slicingPreProdBroken : (job.slicingPreProdBroken !== undefined ? job.slicingPreProdBroken : '')}
                                            onChange={(e) => handleUpdateJobActionState(job.id, 'slicingPreProdBroken', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                            placeholder="1%"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <span className="text-[10px] font-semibold text-zinc-500 block leading-tight text-amber-600 dark:text-amber-400">
                                            {lang === 'ar' ? 'عيوب النوى (≤5%)' : 'Pit Defects (≤5%)'}
                                          </span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                            value={jobActionsState[job.id]?.slicingPitDefects !== undefined ? jobActionsState[job.id]?.slicingPitDefects : (job.slicingPitDefects !== undefined ? job.slicingPitDefects : '')}
                                            onChange={(e) => handleUpdateJobActionState(job.id, 'slicingPitDefects', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                            placeholder="5%"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <span className="text-[10px] font-semibold text-zinc-500 block leading-tight text-rose-600 dark:text-rose-400">
                                            {lang === 'ar' ? 'كسر الزيتون (≤5%)' : 'Broken Olives (≤5%)'}
                                          </span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                            value={jobActionsState[job.id]?.slicingBrokenOlives !== undefined ? jobActionsState[job.id]?.slicingBrokenOlives : (job.slicingBrokenOlives !== undefined ? job.slicingBrokenOlives : '')}
                                            onChange={(e) => handleUpdateJobActionState(job.id, 'slicingBrokenOlives', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                            placeholder="5%"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <span className="text-[10px] font-semibold text-zinc-500 block leading-tight text-rose-600 dark:text-rose-400">
                                            {lang === 'ar' ? 'النوى (≤5%)' : 'Pits (≤5%)'}
                                          </span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                            value={jobActionsState[job.id]?.slicingPits !== undefined ? jobActionsState[job.id]?.slicingPits : (job.slicingPits !== undefined ? job.slicingPits : '')}
                                            onChange={(e) => handleUpdateJobActionState(job.id, 'slicingPits', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                            placeholder="5%"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <span className="text-[10px] font-black text-rose-500 block leading-tight">
                                            {lang === 'ar' ? 'إجمالي المنزل (≤12%)' : 'Total Home/Rejected (≤12%)'}
                                          </span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                            value={jobActionsState[job.id]?.slicingTotalRejected !== undefined ? jobActionsState[job.id]?.slicingTotalRejected : (job.slicingTotalRejected !== undefined ? job.slicingTotalRejected : '')}
                                            onChange={(e) => handleUpdateJobActionState(job.id, 'slicingTotalRejected', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                            placeholder="12%"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <span className="text-[10px] font-semibold text-zinc-500 block leading-tight">
                                            {lang === 'ar' ? 'ملوحة العوامة' : 'Float Salinity'}
                                          </span>
                                          <input
                                            type="text"
                                            className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                            value={jobActionsState[job.id]?.slicingFloatSalinity !== undefined ? jobActionsState[job.id]?.slicingFloatSalinity : (job.slicingFloatSalinity || '')}
                                            onChange={(e) => handleUpdateJobActionState(job.id, 'slicingFloatSalinity', e.target.value)}
                                            placeholder="7%"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <span className="text-[10px] font-semibold text-zinc-500 block leading-tight">
                                            {lang === 'ar' ? 'الإجراء' : 'Action'}
                                          </span>
                                          <input
                                            type="text"
                                            className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                            value={jobActionsState[job.id]?.slicingAction !== undefined ? jobActionsState[job.id]?.slicingAction : (job.slicingAction || '')}
                                            onChange={(e) => handleUpdateJobActionState(job.id, 'slicingAction', e.target.value)}
                                            placeholder={lang === 'ar' ? 'الإجراء المتبع' : 'Procedure'}
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <span className="text-[10px] font-semibold text-zinc-500 block leading-tight">
                                            {lang === 'ar' ? 'الإنتاج' : 'Production'}
                                          </span>
                                          <input
                                            type="text"
                                            className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                            value={jobActionsState[job.id]?.slicingProduction !== undefined ? jobActionsState[job.id]?.slicingProduction : (job.slicingProduction || '')}
                                            onChange={(e) => handleUpdateJobActionState(job.id, 'slicingProduction', e.target.value)}
                                            placeholder={lang === 'ar' ? 'توقيع الإنتاج' : 'Production'}
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <span className="text-[10px] font-semibold text-zinc-500 block leading-tight">
                                            {lang === 'ar' ? 'رقابة الجودة' : 'Quality Control'}
                                          </span>
                                          <input
                                            type="text"
                                            className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-center"
                                            value={jobActionsState[job.id]?.slicingQualityControl !== undefined ? jobActionsState[job.id]?.slicingQualityControl : (job.slicingQualityControl || '')}
                                            onChange={(e) => handleUpdateJobActionState(job.id, 'slicingQualityControl', e.target.value)}
                                            placeholder={lang === 'ar' ? 'رقابة الجودة' : 'Quality Control'}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}

                                 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                                   <div className="flex-1">
                                     <textarea
                                       placeholder={lang === 'ar' ? 'إضافة تعليق عام للتشغيلة...' : 'Add general comments...'}
                                       value={jobActionsState[job.id]?.qualityComments || ''}
                                       onChange={(e) => handleUpdateJobActionState(job.id, 'qualityComments', e.target.value)}
                                       className="w-full p-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none h-11 resize-none"
                                     />
                                   </div>
                                   <div className="flex gap-1.5 shrink-0 select-none">
                                     <button 
                                       onClick={(e) => { e.stopPropagation(); handleApproveQuality(job, true); }}
                                       className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all h-11"
                                     >
                                       {lang === 'ar' ? 'اعتماد' : 'Approve'}
                                     </button>
                                     <button 
                                       onClick={(e) => { e.stopPropagation(); handleApproveQuality(job, false); }}
                                       className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-all h-11"
                                     >
                                       {lang === 'ar' ? 'رفض' : 'Reject'}
                                     </button>
                                   </div>
                                 </div>
                               </div>
                             )}

                            {/* Purchasing Actions */}
                            {hasRole(['Admin', 'Purchasing Operations']) && job.status === 'Pending Purchasing' && (
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-1.5 rounded-xl w-full sm:w-auto shadow-sm">
                                <input
                                  type="number"
                                  placeholder={lang === 'ar' ? 'سعر الكيلو' : 'Price/kg'}
                                  value={jobActionsState[job.id]?.confirmedPrice !== undefined ? jobActionsState[job.id]?.confirmedPrice : (job.confirmedPrice || '')}
                                  onChange={(e) => handleUpdateJobActionState(job.id, 'confirmedPrice', parseFloat(e.target.value))}
                                  className="w-full sm:w-24 p-1.5 text-[10px] rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none font-bold text-center h-8"
                                />
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleApprovePurchasing(job); }}
                                  className="py-1.5 px-3 bg-emerald-500 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-600 transition-all h-8"
                                >
                                  {lang === 'ar' ? 'اعتماد المشتريات' : 'Approve Purchasing'}
                                </button>
                              </div>
                            )}

                            {/* Warehouse Completion Actions */}
                            {hasRole(['Admin', 'Warehouse Operations']) && job.status === 'Pending Completion' && (
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-1.5 rounded-xl w-full sm:w-auto shadow-sm">
                                <input
                                  type="text"
                                  placeholder={lang === 'ar' ? 'رقم PO' : 'PO Number'}
                                  value={jobActionsState[job.id]?.poNumber || ''}
                                  onChange={(e) => handleUpdateJobActionState(job.id, 'poNumber', e.target.value)}
                                  className="w-full sm:w-32 p-1.5 text-[10px] rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none font-mono font-bold text-center h-9"
                                />
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleCompleteJob(job); }}
                                  className="py-1.5 px-4 bg-blue-500 text-white rounded-lg text-[10px] font-bold hover:bg-blue-600 transition-all h-9"
                                >
                                  {lang === 'ar' ? 'مكتمل' : 'Complete'}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Utilities and Export buttons */}
                          <div className="flex flex-wrap items-center gap-1 bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shrink-0">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleShareWordOutlook(job); }}
                              className="p-2 text-blue-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all"
                              title={lang === 'ar' ? 'مشاركة عبر الإيميل' : 'Share via Email'}
                            >
                              <Mail size={18} />
                            </button>

                            <button 
                              onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(job); }}
                              className="p-2 text-emerald-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all"
                              title={lang === 'ar' ? 'مشاركة واتساب' : 'Share WhatsApp'}
                            >
                              <MessageCircle size={18} />
                            </button>

                            <button 
                              onClick={(e) => { e.stopPropagation(); exportSingleJobToWord(job); }}
                              className="p-2 text-blue-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all"
                              title={lang === 'ar' ? 'تصدير Word' : 'Export Word'}
                            >
                              <FileText size={18} />
                            </button>

                            <button 
                              onClick={(e) => { e.stopPropagation(); exportSingleJobToExcel(job); }}
                              className="p-2 text-emerald-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all"
                              title={lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}
                            >
                              <FileSpreadsheet size={18} />
                            </button>

                            <button 
                              onClick={(e) => { e.stopPropagation(); handlePrint(job); }}
                              className="p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all"
                              title={lang === 'ar' ? 'طباعة' : 'Print'}
                            >
                              <Printer size={18} />
                            </button>
                            <div className="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-700 mx-1 xl:block" />
                            <div className="flex items-center gap-1">
                              {canEditJob(job) && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleEditJob(job); }}
                                  className="p-2 text-blue-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all"
                                  title={lang === 'ar' ? 'تعديل' : 'Edit'}
                                >
                                  <Pencil size={18} />
                                </button>
                              )}
                              {hasRole('Admin') && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id); }}
                                  className="p-2 text-rose-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all"
                                  title={lang === 'ar' ? 'حذف' : 'Delete'}
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Grading Quality Defects Report */}
                        {job.processOperation === 'Grading' && job.defectTotalDefect !== undefined && (
                          <div className="bg-amber-50/40 dark:bg-amber-950/5 p-4 rounded-3xl border border-amber-200/30 dark:border-amber-900/10 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[11px] font-black tracking-wider text-amber-800 dark:text-amber-400 uppercase">
                                {lang === 'ar' ? 'تقرير عيوب جودة التدريج' : 'Grading Quality Defects Report'}
                              </h4>
                              <span className="text-xs font-black px-2.5 py-1 bg-amber-100 dark:bg-amber-950/45 text-amber-700 dark:text-amber-300 rounded-lg">
                                {lang === 'ar' ? `إجمالي العيوب: ${job.defectTotalDefect}` : `Total Defect: ${job.defectTotalDefect}`}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">Foreign Bodies</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.defectForeignBodies ?? 0}</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">Olives have Insects</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.defectOlivesInsects ?? 0}</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">Soft texture</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.defectSoftTexture ?? 0}</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">Bad Color</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.defectBadColor ?? 0}</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">Olives have stem</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.defectOlivesStem ?? 0}</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">Skin Defect</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.defectSkinDefect ?? 0}</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">Gas Pocket</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.defectGasPocket ?? 0}</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">Olives lose skin</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.defectOlivesLoseSkin ?? 0}</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">Other Variety</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.defectOtherVariety ?? 0}</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center col-span-2 sm:col-span-1">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">Total Defect</span>
                                <span className="text-xs font-black text-rose-500">{job.defectTotalDefect ?? 0}</span>
                              </div>
                            </div>
                            {job.defectComments && (
                              <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                <span className="text-[10px] font-black text-zinc-400 uppercase block mb-1">
                                  {lang === 'ar' ? 'ملاحظات عيوب التدريج' : 'Grading Defects Comments'}
                                </span>
                                <p className="text-xs text-zinc-650 dark:text-zinc-350 italic">"{job.defectComments}"</p>
                              </div>
                            )}
                          </div>
                        )}

                        {job.processOperation === 'PittingAndSlicing' && (job.slicingTime !== undefined || job.slicingPreProdBroken !== undefined) && (
                          <div className="bg-emerald-50/40 dark:bg-emerald-950/5 p-4 rounded-3xl border border-emerald-200/30 dark:border-emerald-900/10 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[11px] font-black tracking-wider text-emerald-800 dark:text-emerald-400 uppercase">
                                {lang === 'ar' ? 'تقرير رقابة جودة الشرائح والخلي' : 'Slicing & Pitting Quality Report'}
                              </h4>
                              <span className="text-xs font-black px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-300 rounded-lg">
                                {lang === 'ar' ? `إجمالي المنزل: ${job.slicingTotalRejected ?? 0}%` : `Total Rejected: ${job.slicingTotalRejected ?? 0}%`}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">{lang === 'ar' ? 'الوقت' : 'Time'}</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.slicingTime || '-'}</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">{lang === 'ar' ? 'وزن/اسم لكل 1 كجم' : 'Weight/Name per 1 Kg'}</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.slicingWeightPerKg || '-'}</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">{lang === 'ar' ? 'كسر قبل الإنتاج (≤10%)' : 'Pre-Prod Broken (≤10%)'}</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.slicingPreProdBroken ?? 0}%</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">{lang === 'ar' ? 'عيوب النوى (≤5%)' : 'Pit Defects (≤5%)'}</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.slicingPitDefects ?? 0}%</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">{lang === 'ar' ? 'كسر الزيتون (≤5%)' : 'Broken Olives (≤5%)'}</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.slicingBrokenOlives ?? 0}%</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">{lang === 'ar' ? 'النوى (≤5%)' : 'Pits (≤5%)'}</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.slicingPits ?? 0}%</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">{lang === 'ar' ? 'إجمالي المنزل (≤12%)' : 'Total Home/Rejected (≤12%)'}</span>
                                <span className="text-xs font-rose-500 font-black">{job.slicingTotalRejected ?? 0}%</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">{lang === 'ar' ? 'ملوحة العوامة' : 'Float Salinity'}</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.slicingFloatSalinity || '-'}</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">{lang === 'ar' ? 'الإجراء' : 'Action'}</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{job.slicingAction || '-'}</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">{lang === 'ar' ? 'الإنتاج' : 'Production'}</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-205">{job.slicingProduction || '-'}</span>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-xl text-center col-span-2 sm:col-span-1">
                                <span className="text-[9px] font-bold text-zinc-400 block mb-0.5 leading-tight">{lang === 'ar' ? 'رقابة الجودة' : 'Quality Control'}</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-205">{job.slicingQualityControl || '-'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Workflow Info section */}
                        {(job.qualityComments || (job.confirmedPrice && job.confirmedPrice > 0) || job.poNumber) && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-50/50 dark:bg-zinc-800/20 p-4 rounded-3xl border border-zinc-100/50 dark:border-zinc-800/50">
                            {job.qualityComments && (
                              <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                                 <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">{lang === 'ar' ? 'تعليقات الجودة' : 'Quality Comments'}</span>
                                 <p className="text-xs text-zinc-700 dark:text-zinc-300 italic">"{job.qualityComments}"</p>
                              </div>
                            )}
                            {(job.confirmedPrice > 0 || hasRole(['Admin', 'Purchasing Operations'])) && (
                              <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                                 <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">{lang === 'ar' ? 'السعر المؤكد' : 'Confirmed Price'}</span>
                                 {hasRole(['Admin', 'Purchasing Operations']) ? (
                                   <div className="flex items-center gap-2">
                                     <input 
                                       type="number"
                                       className="text-xs font-black text-emerald-600 bg-transparent border-b border-emerald-500/30 outline-none w-20"
                                       value={jobActionsState[job.id]?.confirmedPrice !== undefined ? jobActionsState[job.id]?.confirmedPrice : (job.confirmedPrice || 0)}
                                       onChange={(e) => handleUpdateJobActionState(job.id, 'confirmedPrice', parseFloat(e.target.value))}
                                     />
                                     <button 
                                       onClick={(e) => { e.stopPropagation(); handleUpdateManualPrice(job.id, jobActionsState[job.id]?.confirmedPrice || 0); }}
                                       className="p-1 text-emerald-600 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-all"
                                       title={lang === 'ar' ? 'حفظ السعر' : 'Save Price'}
                                     >
                                       <Save size={14} />
                                     </button>
                                   </div>
                                 ) : (
                                   <p className="text-xs font-black text-emerald-600">{job.confirmedPrice} <span className="text-[10px] font-normal opacity-60">per kg</span></p>
                                 )}
                              </div>
                            )}
                            {job.poNumber && (
                              <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                                 <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">{lang === 'ar' ? 'رقم PO' : 'PO Number'}</span>
                                 <p className="text-xs font-mono font-bold text-blue-600">{job.poNumber}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Approvals Tracking */}
                        <div className="flex flex-wrap gap-4 text-[10px] font-medium text-zinc-400 bg-zinc-50/50 dark:bg-zinc-800/30 p-2.5 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/50">
                          {job.warehouseApprovalTime && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-500" />
                              {lang === 'ar' ? 'المخزن:' : 'WH:'} {new Date(job.warehouseApprovalTime).toLocaleDateString()}
                            </div>
                          )}
                          {job.qualityApprovalTime && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-500" />
                              {lang === 'ar' ? 'الجودة:' : 'Quality:'} {new Date(job.qualityApprovalTime).toLocaleDateString()}
                            </div>
                          )}
                          {job.purchasingApprovalTime && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-500" />
                              {lang === 'ar' ? 'المشتريات:' : 'Purchasing:'} {new Date(job.purchasingApprovalTime).toLocaleDateString()}
                            </div>
                          )}
                          {job.completionTime && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-500" />
                              {lang === 'ar' ? 'مكتمل:' : 'Completed:'} {new Date(job.completionTime).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Details section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Inputs details */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">{t.inputs}</label>
                              <span className="text-[9px] font-bold text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">{job.inputs.length} {lang === 'ar' ? 'أصناف' : 'items'}</span>
                            </div>
                            <div className="grid gap-1.5">
                              {job.inputs.map((input, i) => (
                                <div key={i} className="group/item flex items-center justify-between p-2 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-xl border border-zinc-100/50 dark:border-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-900/30 transition-all">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-zinc-400 font-mono leading-none mb-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">{input.itemCode}</span>
                                    <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200">{input.itemName}</span>
                                  </div>
                                  <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg">
                                    {input.quantity} {input.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Outputs details */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">{t.outputs}</label>
                              <span className="text-[9px] font-bold text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">{job.outputs.length} {lang === 'ar' ? 'أصناف' : 'items'}</span>
                            </div>
                            <div className="grid gap-1.5">
                              {job.outputs.map((output, i) => (
                                <div key={i} className="group/item flex items-center justify-between p-2 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-xl border border-zinc-100/50 dark:border-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 hover:border-blue-200 dark:hover:border-blue-900/30 transition-all">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-zinc-400 font-mono leading-none mb-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">{output.itemCode}</span>
                                    <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200">{output.itemName}</span>
                                  </div>
                                  <span className="text-[11px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg">
                                    {output.quantity} {output.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Secondary Outputs & Losses details */}
                        {(job.scrapQty || job.farzaQty || job.seedQty || job.wasteQty) ? (
                          <div className="mt-4 p-4 rounded-2xl bg-amber-50/10 dark:bg-amber-900/5 border border-amber-100/50 dark:border-amber-900/20">
                            <h4 className="text-[10px] font-black tracking-wider text-amber-600 dark:text-amber-400 uppercase mb-3 flex items-center gap-2">
                              <Trash2 size={12} />
                              {lang === 'ar' ? 'المخرجات الفرعية والفواقد' : 'Secondary Outputs & Losses'}
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {job.scrapQty ? (
                                <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-700/50">
                                  <span className="text-[9px] text-zinc-400 font-bold block leading-none mb-1">{lang === 'ar' ? 'هري التشغيل' : 'Processing Scrap'}</span>
                                  <span className="text-xs font-black text-amber-600 font-mono">{job.scrapQty.toLocaleString()} kg</span>
                                </div>
                              ) : null}
                              {job.farzaQty ? (
                                <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-700/50">
                                  <span className="text-[9px] text-zinc-400 font-bold block leading-none mb-1">{lang === 'ar' ? 'الفرزة' : 'Reject (Farza)'}</span>
                                  <span className="text-xs font-black text-amber-600 font-mono">{job.farzaQty.toLocaleString()} kg</span>
                                </div>
                              ) : null}
                              {job.seedQty ? (
                                <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-700/50">
                                  <span className="text-[9px] text-zinc-400 font-bold block leading-none mb-1">{lang === 'ar' ? 'البذرة' : 'Seed'}</span>
                                  <span className="text-xs font-black text-amber-600 font-mono">{job.seedQty.toLocaleString()} kg</span>
                                </div>
                              ) : null}
                              {job.wasteQty ? (
                                <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-700/50">
                                  <span className="text-[9px] text-zinc-400 font-bold block leading-none mb-1">{lang === 'ar' ? 'الهالك' : 'Waste / Loss'}</span>
                                  <span className="text-xs font-black text-amber-600 font-mono">{job.wasteQty.toLocaleString()} kg</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        {/* Comments/Notes section */}
                        {job.notes && (
                          <div className="mt-4 p-3 bg-amber-50/30 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/10 rounded-xl text-[11px] text-amber-700/80 dark:text-amber-400 leading-relaxed shadow-inner">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                              <span className="text-[9px] font-black uppercase tracking-widest">{t.comments}</span>
                            </div>
                            "{job.notes}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {showImportConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-800/50 dark:to-zinc-800/30 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4">
              <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-500/20">
                <FileSpreadsheet size={28} />
              </div>
              <div className="text-right flex-1">
                <h3 className="font-extrabold text-zinc-900 dark:text-white text-lg">
                  {lang === 'ar' ? 'تأكيد طريقة استيراد الأصناف' : 'Confirm Items Import Mode'}
                </h3>
                <p className="text-xs text-zinc-500 font-medium">
                  {lang === 'ar' ? `الملف: ${importFileName}` : `File: ${importFileName}`}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="p-4 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 rounded-2xl flex items-center justify-between">
                <span className="text-sm font-bold text-orange-850 dark:text-orange-400 animate-pulse">
                  {lang === 'ar' ? 'عدد الأصناف المكتشفة بالملف:' : 'Parsed Items Found:'}
                </span>
                <span className="text-lg font-black text-orange-650 bg-white dark:bg-zinc-900 px-4 py-1.5 rounded-xl border border-orange-100 dark:border-orange-900/20 shadow-sm leading-none">
                  {itemsToImport.length} {lang === 'ar' ? 'صنف' : 'items'}
                </span>
              </div>

              <div className="space-y-4">
                {/* Mode 1: Replace All */}
                <button 
                  onClick={() => confirmImport('replace')}
                  className="w-full text-right p-4 rounded-2xl border-2 border-red-100 dark:border-red-950/40 bg-red-50/20 hover:bg-red-50/50 dark:hover:bg-red-950/10 text-zinc-800 dark:text-zinc-200 transition-all flex flex-col gap-1 focus:outline-none hover:border-red-500 focus:border-red-500 cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-red-650 dark:text-red-400 font-extrabold text-sm">
                    <Trash2 size={16} />
                    <span>{lang === 'ar' ? 'الخيار الأول: استبدال قائمة الأصناف الحالية (كاملة)' : 'Option 1: Overwrite/Replace Current List'}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed pr-6">
                    {lang === 'ar' 
                      ? 'سيقوم بحذف جميع الأصناف الحالية من النظام بالكامل، ويصبح الملف المرفوع هو القائمة الجديدة الوحيدة بدل الموجودة.'
                      : 'This will delete all current items in the database first and then insert only the items from the uploaded file.'
                    }
                  </p>
                </button>

                {/* Mode 2: Merge / Update */}
                <button 
                  onClick={() => confirmImport('merge')}
                  className="w-full text-right p-4 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 hover:bg-zinc-50 hover:border-zinc-300 dark:hover:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200 transition-all flex flex-col gap-1 focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-extrabold text-sm">
                    <Plus size={16} />
                    <span>{lang === 'ar' ? 'الخيار الثاني: دمج وإضافة الأصناف للموجود حالياً' : 'Option 2: Merge & Append to Current List'}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed pr-6">
                    {lang === 'ar' 
                      ? 'يبقي على جميع الأصناف الحالية كما هي، ويقوم بإضافة الأصناف الجديدة مع تحديث العناصر ذات الكود المكرر.'
                      : 'This will keep existing items intact, only adding new ones or updating matches with the same code.'
                    }
                  </p>
                </button>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
              <button 
                onClick={() => {
                  setShowImportConfirmation(false);
                  setItemsToImport([]);
                  setImportFileName('');
                }}
                className="px-6 py-2.5 bg-white dark:bg-zinc-900 hover:bg-zinc-100 text-zinc-750 dark:text-zinc-350 rounded-xl text-xs font-bold transition-all border border-zinc-200 dark:border-zinc-800 cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء الأمر' : 'Cancel Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
