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
  AtSign
} from 'lucide-react';
import { 
  Language, 
  UserProfile, 
  ProcessingJob, 
  ProcessItem,
  Warehouse
} from '../types';
import { translations } from '../i18n';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../constants';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
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
    { id: 'SLC', labelAr: 'شرائح', labelEn: 'Slices' },
    { id: 'Pre', labelAr: 'خام', labelEn: 'Raw' },
    { id: 'Grd', labelAr: 'مدرج', labelEn: 'Graded' },
    { id: 'PTD', labelAr: 'مخلي', labelEn: 'Pitted' },
    { id: 'FARZA', labelAr: 'فرزه', labelEn: 'Farza' },
  ],
  direction: [
    { id: 'Green', labelAr: 'مطبوخ', labelEn: 'Cooked/Green' },
    { id: 'Black', labelAr: 'ماء وملح', labelEn: 'Brine/Black' },
  ],
  type: [
    { id: 'Picual', labelAr: 'بيكوال', labelEn: 'Picual' },
    { id: 'Azizi', labelAr: 'عجيزي', labelEn: 'Azizi' },
    { id: 'Akas', labelAr: 'عقص', labelEn: 'Akas' },
    { id: 'Manzanilla', labelAr: 'منزنيلو', labelEn: 'Manzanilla' },
    { id: 'Tofahi', labelAr: 'تفاحي', labelEn: 'Tofahi' },
    { id: 'Kobrosi', labelAr: 'قبرصي', labelEn: 'Kobrosi' },
    { id: 'Karotina', labelAr: 'كاروتينا', labelEn: 'Karotina' },
    { id: 'Nour Sabah', labelAr: 'نور صباح', labelEn: 'Nour Sabah' },
    { id: 'Kalamata', labelAr: 'كلاماتا', labelEn: 'Kalamata' },
    { id: 'Hamed', labelAr: 'حامد', labelEn: 'Hamed' },
    { id: 'Dolsy', labelAr: 'دولسي', labelEn: 'Dolsy' },
    { id: 'Baldiat', labelAr: 'بلديات', labelEn: 'Baldiat' },
    { id: 'Senara', labelAr: 'سنارة', labelEn: 'Senara' },
    { id: 'Sers Cola', labelAr: 'سرس كولا', labelEn: 'Sers Cola' },
    { id: 'Pepper', labelAr: 'فلفل', labelEn: 'Pepper' },
    { id: 'Cauliflower', labelAr: 'قرنبيط', labelEn: 'Cauliflower' },
    { id: 'Other', labelAr: 'اخري', labelEn: 'Other' },
  ],
  size: [
    { id: 'L', labelAr: 'L', labelEn: 'L' },
    { id: 'M', labelAr: 'M', labelEn: 'M' },
    { id: 'S', labelAr: 'S', labelEn: 'S' },
    { id: 'XXXS', labelAr: 'XXXS', labelEn: 'XXXS' },
    { id: 'XXS', labelAr: 'XXS', labelEn: 'XXS' },
    { id: 'Pre', labelAr: 'خام', labelEn: 'Raw' },
    { id: 'Mesh.', labelAr: 'مهروس', labelEn: 'Mesh' },
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
  enforcedType = ''
}: { 
  filters: any, 
  setFilters: any, 
  selectedCode: string, 
  setSelectedCode: any,
  availableItems: ProcessItem[],
  title: string,
  lang: Language,
  themeColor?: 'emerald' | 'blue',
  enforcedType?: string
}) => {
  const isRtl = lang === 'ar';
  const accentClass = themeColor === 'emerald' ? 'emerald' : 'blue';

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
              setSelectedCode('');
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
              setSelectedCode('');
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
              setSelectedCode('');
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
              setSelectedCode('');
            }}
            className="w-full px-2 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="">{isRtl ? '-- المقاس --' : '-- Size --'}</option>
            {CATEGORIES.size.map(c => <option key={c.id} value={c.id}>{isRtl ? c.labelAr : c.labelEn}</option>)}
          </select>
        </div>
      </div>

      {/* Final Item List */}
      <div className="space-y-1 bg-white/50 dark:bg-black/20 p-3 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
         <span className="text-[10px] font-bold text-zinc-400 uppercase">{isRtl ? 'اختيار الصنف المطابق' : 'Select Matching Item'}</span>
         <select 
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">{isRtl ? `--- اختر من النتائج (${availableItems.length}) ---` : `--- Select from results (${availableItems.length}) ---`}</option>
            {availableItems.map(item => (
              <option key={item.code} value={item.code}>{item.code} - {item.name}</option>
            ))}
          </select>
          {availableItems.length === 0 && (filters.process || filters.direction || filters.type || filters.size) && (
            <p className="text-[10px] text-red-500 mt-1 italic font-medium">
              {isRtl ? 'لا يوجد صنف يطابق هذه الفلاتر' : 'No item matches these filters'}
            </p>
          )}
      </div>
    </div>
  );
};

export default function ThirdPartyProcessing({ lang, user }: ThirdPartyProcessingProps) {
  const t = translations[lang];
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [dynamicItems, setDynamicItems] = useState<ProcessItem[]>(PROCESS_ITEMS_LIST);
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
    status: (user.role === 'Admin' || user.role === 'Warehouse Operations') ? 'Completed' : 'Pending Approval',
    notes: ''
  });

  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    systemCode: '',
    contactName: '',
    whatsappGroup: ''
  });

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
  const getFilteredItems = (filters: typeof inputFilters) => {
    return dynamicItems.filter(item => {
      if (filters.process && item.process !== filters.process) return false;
      if (filters.direction && item.direction !== filters.direction && item.direction !== 'Any') return false;
      if (filters.type && item.type !== filters.type) return false;
      if (filters.size && item.size !== filters.size) return false;
      return true;
    });
  };

  const availableInputItems = getFilteredItems(inputFilters);
  const availableOutputItems = getFilteredItems(outputFilters);

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
        setDynamicItems(snap.docs.map(d => d.data() as ProcessItem));
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
      await addDoc(collection(db, COLLECTIONS.WAREHOUSES), {
        ...newWarehouse,
        createdAt: new Date().toISOString()
      });
      setNewWarehouse({ 
        name: '', 
        systemCode: '', 
        contactName: '', 
        whatsappGroup: '' 
      });
      toast.success(lang === 'ar' ? 'تم إضافة المخزن بنجاح' : 'Warehouse added successfully');
    } catch (e) {
      toast.error(lang === 'ar' ? 'فشل إضافة المخزن' : 'Failed to add warehouse');
    }
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

  const handleSaveJob = async () => {
    if (!newJob.warehouseId || newJob.inputs.length === 0 || newJob.outputs.length === 0) {
      toast.error(lang === 'ar' ? 'يرجى ملء جميع البيانات الأساسية والمدخلات والمخرجات' : 'Please fill all basic info, inputs, and outputs');
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
      const jobData = {
        ...newJob,
        status: (user.role === 'Admin' || user.role === 'Warehouse Operations') ? newJob.status : 'Pending Approval',
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
        
        // Auto share after edit if it is "Completed"
        const updatedJob: ProcessingJob = {
          id: editingJobId,
          ...newJob,
          warehouseName: selectedWh?.name || '',
          warehouseCode: selectedWh?.systemCode || '',
          createdBy: user.uid, // Keep original or update? Usually keep original
          createdAt: new Date().toISOString() // This is not quite right for edit but handleShareWhatsApp only needs basic info
        };
        if (updatedJob.status === 'Completed') {
          handleShareExcelOutlook(updatedJob);
        }
      } else {
        const docRef = await addDoc(collection(db, COLLECTIONS.THIRD_PARTY_PROCESSING), {
          ...jobData,
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
          serverTimestamp: serverTimestamp()
        });
        toast.success(lang === 'ar' ? 'تم حفظ عملية التشغيل بنجاح' : 'Processing job saved successfully');
        
        // Auto share after new job if it is "Completed"
        const createdJob: ProcessingJob = {
          id: docRef.id,
          ...newJob,
          warehouseName: selectedWh?.name || '',
          warehouseCode: selectedWh?.systemCode || '',
          createdBy: user.uid,
          createdAt: new Date().toISOString()
        };
        if (createdJob.status === 'Completed') {
          handleShareExcelOutlook(createdJob);
        }
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
        status: (user.role === 'Admin' || user.role === 'Warehouse Operations') ? 'Completed' : 'Pending Approval',
        notes: ''
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
      status: job.status,
      notes: job.notes || ''
    });
    setEditingJobId(job.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredJobs = jobs.filter(job => {
    // Role based visibility: 
    // - Customer Operations only see their own jobs
    // - Warehouse Operations see all Pending Approval and Completed jobs
    // - Admins see everything
    
    if (user.role === 'Customer Operations' && job.createdBy !== user.uid) {
      return false;
    }

    if (user.role === 'Warehouse Operations' && job.status === 'Draft') {
      return false;
    }

    return (
      job.warehouseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleApproveJob = async (job: ProcessingJob) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.THIRD_PARTY_PROCESSING, job.id), {
        status: 'Completed',
        approvedBy: user.uid,
        approvedAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      });
      toast.success(lang === 'ar' ? 'تم اعتماد التشغيلة بنجاح' : 'Job approved successfully');
      
      // Auto share Excel via Outlook after approval
      handleShareExcelOutlook({ ...job, status: 'Completed' });
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل اعتماد التشغيلة' : 'Failed to approve job');
    }
  };

  const handleShareExcelOutlook = async (job: ProcessingJob) => {
    try {
      const isRtl = lang === 'ar';
      const trans = translations[lang];
      const date = new Date(job.date).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US');

      const totalIn = job.inputs.reduce((sum, i) => sum + i.quantity, 0);
      const totalOut = job.outputs.reduce((sum, i) => sum + i.quantity, 0);
      const efficiency = totalIn > 0 ? ((totalOut / totalIn) * 100).toFixed(1) + '%' : '0%';
      const lossWeight = totalIn - totalOut;
      const lossPercentage = totalIn > 0 ? ((lossWeight / totalIn) * 100).toFixed(1) + '%' : '0%';

      const reportRows = [
        [isRtl ? 'نموذج عملية تشغيل لدى الغير' : 'Third-Party Processing Report'],
        [],
        [isRtl ? 'بيانات العملية' : 'Job Details'],
        [trans.processDate, date],
        [isRtl ? 'المخزن' : 'Warehouse', `${job.warehouseName || '-'} (${job.warehouseCode || '-'})`],
        [],
        [isRtl ? 'ملخص الكميات' : 'Quantities Summary'],
        [isRtl ? 'إجمالي المدخلات' : 'Total Inputs', `${totalIn} kg`],
        [isRtl ? 'إجمالي المخرجات' : 'Total Outputs', `${totalOut} kg`],
        [isRtl ? 'نسبة التشغيل' : 'Yield', efficiency],
        [isRtl ? 'نسبة الفقد' : 'Loss %', lossPercentage],
        [],
        [trans.inputs],
        [isRtl ? 'كود الصنف' : 'Item Code', isRtl ? 'اسم الصنف' : 'Item Name', trans.quantity],
        ...job.inputs.map(i => [i.itemCode, i.itemName, `${i.quantity} ${i.unit}`]),
        [],
        [trans.outputs],
        [isRtl ? 'كود الصنف' : 'Item Code', isRtl ? 'اسم الصنف' : 'Item Name', trans.quantity],
        ...job.outputs.map(o => [o.itemCode, o.itemName, `${o.quantity} ${o.unit}`]),
        [],
        [trans.comments],
        [job.notes || '-']
      ];

      const ws = XLSX.utils.aoa_to_sheet(reportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const filename = `Job_${job.warehouseCode || 'Report'}_${job.date}.xlsx`;
      const file = new File([blob], filename, { type: blob.type });

      // Download file automatically
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      const toList = toEmails.length > 0 ? toEmails.join(',') : 'Khaled.Shaaban@RichLandfi.com';
      const ccList = ccEmails.length > 0 ? `&cc=${ccEmails.join(',')}` : '';
      
      const recipient = toList;
      const subjectText = isRtl ? `تقرير عملية تشغيل: ${job.warehouseName}` : `Processing Report: ${job.warehouseName}`;
      const bodyText = isRtl 
        ? `برجاء الاطلاع على تقرير عملية التشغيل المرفق لـ ${job.warehouseName} بتاريخ ${date}. (تم تحميل الملف المرفق تلقائياً، يرجى إرفاقه في حال لم يظهر)` 
        : `Please find the attached processing report for ${job.warehouseName} dated ${date}. (File was downloaded automatically, please attach it if not showing)`;

      const subject = encodeURIComponent(subjectText);
      const body = encodeURIComponent(bodyText);
      
      // Open the Outlook App directly (Desktop/Mobile) with the recipients pre-filled
      const outlookAppUrl = `ms-outlook://compose?to=${recipient}${ccList}&subject=${subject}&body=${body}`;
      const mailtoUrl = `mailto:${recipient}?subject=${subject}&body=${body}${ccList}`;

      // Create a hidden link to trigger the app protocol
      const link = document.createElement('a');
      link.href = outlookAppUrl;
      link.click();

      // 2. Fallback to standard mailto if Outlook app isn't the handler
      setTimeout(() => {
        if (document.hasFocus()) {
          window.location.href = mailtoUrl;
        }
      }, 1000);
      
      toast.info(isRtl 
        ? 'تم فتح Outlook وتحميل الملف. يرجى إرفاق الملف يدوياً.' 
        : 'Outlook opened and file downloaded. Please attach the file manually.');

    } catch (error) {
      console.error("Outlook share error:", error);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء المشاركة' : 'Error during sharing');
    }
  };

  const exportToExcel = () => {
    try {
      const data = jobs.flatMap(job => {
        const rows: any[] = [];
        const maxLen = Math.max(job.inputs.length, job.outputs.length);
        const totalIn = job.inputs.reduce((sum, i) => sum + i.quantity, 0);
        const totalOut = job.outputs.reduce((sum, i) => sum + i.quantity, 0);
        const yieldPct = totalIn > 0 ? ((totalOut / totalIn) * 100).toFixed(1) + '%' : '0%';
        const lossWeight = totalIn - totalOut;
        const lossPercentage = totalIn > 0 ? ((lossWeight / totalIn) * 100).toFixed(1) + '%' : '0%';
        
        for (let i = 0; i < maxLen; i++) {
          rows.push({
            [lang === 'ar' ? 'التاريخ' : 'Date']: job.date,
            [lang === 'ar' ? 'المخزن' : 'Warehouse']: job.warehouseName || '',
            [lang === 'ar' ? 'كود المخزن' : 'WH Code']: job.warehouseCode || '',
            [lang === 'ar' ? 'مدخلات - الكود' : 'Input - Code']: job.inputs[i]?.itemCode || '',
            [lang === 'ar' ? 'مدخلات - الصنف' : 'Input - Item']: job.inputs[i]?.itemName || '',
            [lang === 'ar' ? 'مدخلات - الكمية' : 'Input - Qty']: job.inputs[i]?.quantity || '',
            [lang === 'ar' ? 'مخرجات - الكود' : 'Output - Code']: job.outputs[i]?.itemCode || '',
            [lang === 'ar' ? 'مخرجات - الصنف' : 'Output - Item']: job.outputs[i]?.itemName || '',
            [lang === 'ar' ? 'مخرجات - الكمية' : 'Output - Qty']: job.outputs[i]?.quantity || '',
            [lang === 'ar' ? 'إجمالي المدخلات' : 'Total In']: i === 0 ? totalIn : '',
            [lang === 'ar' ? 'إجمالي المخرجات' : 'Total Out']: i === 0 ? totalOut : '',
            [lang === 'ar' ? 'نسبة التشغيل' : 'Yield %']: i === 0 ? yieldPct : '',
            [lang === 'ar' ? 'نسبة الفقد' : 'Loss %']: i === 0 ? lossPercentage : '',
            [lang === 'ar' ? 'ملاحظات' : 'Notes']: i === 0 ? job.notes || '' : '',
          });
        }
        return rows;
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Processing Jobs");
      XLSX.writeFile(wb, `Processing_Jobs_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(lang === 'ar' ? 'تم استخراج ملف Excel بنجاح' : 'Excel file exported successfully');
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء التصدير' : 'Error exporting Excel');
    }
  };

  const handleShareWhatsApp = async (job: ProcessingJob) => {
    const isRtl = lang === 'ar';
    const date = new Date(job.date).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US');
    const trans = translations[lang];

    // Create a temporary container for the template
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.dir = isRtl ? 'rtl' : 'ltr';
    document.body.appendChild(container);

    const totalIn = job.inputs.reduce((s, i) => s + i.quantity, 0);
    const totalOut = job.outputs.reduce((s, i) => s + i.quantity, 0);
    const yieldPercentage = totalIn > 0 ? ((totalOut / totalIn) * 100).toFixed(1) : '0.0';
    const lossWeight = totalIn - totalOut;
    const lossPercentage = totalIn > 0 ? ((lossWeight / totalIn) * 100).toFixed(1) : '0.0';

    container.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 20px; font-family: sans-serif; color: #1a1a1a;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #10b981; padding-bottom: 15px; margin-bottom: 20px;">
          <div>
            <h1 style="color: #10b981; margin: 0; font-size: 22px;">${trans.thirdPartyProcessing}</h1>
          </div>
          <div style="background: #f0fdf4; color: #10b981; padding: 6px 12px; border-radius: 8px; font-weight: bold; border: 1px solid #d1fae5; font-size: 14px;">
            ${date}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 25px;">
          <div style="background: #f9fafb; padding: 10px; border-radius: 12px; border: 1px solid #f3f4f6; display: flex; flex-direction: column; justify-content: center;">
            <span style="font-size: 7px; font-weight: 800; color: #9ca3af; text-transform: uppercase;">${isRtl ? 'المخزن' : 'Warehouse'}</span>
            <div style="font-size: 11px; font-weight: 700; color: #1f2937; margin-top: 2px;">
              📍 ${job.warehouseName || '-'}
              <div style="font-size: 9px; color: #6b7280; font-weight: normal;">${job.warehouseCode || '-'}</div>
            </div>
          </div>
          <div style="background: #ecfdf5; padding: 8px; border-radius: 12px; text-align: center; border: 1px solid #d1fae5; display: flex; flex-direction: column; justify-content: center;">
            <span style="font-size: 7px; font-weight: 800; color: #065f46; text-transform: uppercase;">${lang === 'ar' ? 'إجمالي المدخلات' : 'Total Inputs'}</span>
            <span style="display: block; font-size: 12px; font-weight: 800; margin-top: 2px; color: #065f46;">${totalIn.toLocaleString()} <small style="font-size: 7px;">kg</small></span>
          </div>
          <div style="background: #eff6ff; padding: 8px; border-radius: 12px; text-align: center; border: 1px solid #dbeafe; display: flex; flex-direction: column; justify-content: center;">
            <span style="font-size: 7px; font-weight: 800; color: #1e40af; text-transform: uppercase;">${lang === 'ar' ? 'إجمالي المخرجات' : 'Total Outputs'}</span>
            <span style="display: block; font-size: 12px; font-weight: 800; margin-top: 2px; color: #1e40af;">${totalOut.toLocaleString()} <small style="font-size: 7px;">kg</small></span>
          </div>
          <div style="background: #f8fafc; padding: 8px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: center;">
            <span style="font-size: 7px; font-weight: 800; color: #475569; text-transform: uppercase;">${lang === 'ar' ? 'نسبة التشغيل' : 'Yield'}</span>
            <span style="display: block; font-size: 12px; font-weight: 800; margin-top: 2px; color: #1e293b;">${yieldPercentage}%</span>
          </div>
          <div style="background: #fff1f2; padding: 8px; border-radius: 12px; text-align: center; border: 1px solid #ffe4e6; display: flex; flex-direction: column; justify-content: center;">
            <span style="font-size: 7px; font-weight: 800; color: #9f1239; text-transform: uppercase;">${lang === 'ar' ? 'نسبة الفقد' : 'Loss %'}</span>
            <span style="display: block; font-size: 12px; font-weight: 800; margin-top: 2px; color: #9f1239;">${lossPercentage}%</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
          <div>
            <h3 style="font-size: 12px; font-weight: 800; color: #9ca3af; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 10px;">${trans.inputs}</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${job.inputs.map(i => `
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 10px 0; font-size: 13px;">
                    <div style="font-weight: bold;">${i.itemName}</div>
                    <div style="font-size: 10px; color: #9ca3af; font-family: monospace;">${i.itemCode}</div>
                  </td>
                  <td style="padding: 10px 0; font-size: 13px; text-align: ${isRtl ? 'left' : 'right'}; font-weight: 700; color: #059669;">${i.quantity} ${i.unit}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          <div>
            <h3 style="font-size: 12px; font-weight: 800; color: #9ca3af; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 10px;">${trans.outputs}</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${job.outputs.map(o => `
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 10px 0; font-size: 13px;">
                    <div style="font-weight: bold;">${o.itemName}</div>
                    <div style="font-size: 10px; color: #9ca3af; font-family: monospace;">${o.itemCode}</div>
                  </td>
                  <td style="padding: 10px 0; font-size: 13px; text-align: ${isRtl ? 'left' : 'right'}; font-weight: 700; color: #2563eb;">${o.quantity} ${o.unit}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        </div>

        ${job.notes ? `
          <div style="margin-top: 30px; padding: 20px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 16px; font-style: italic; color: #92400e;">
            <strong>${trans.comments}:</strong> ${job.notes}
          </div>
        ` : ''}
        
        <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #9ca3af;">
          ${isRtl ? 'تم الإنشاء بواسطة نظام إدارة المخازن' : 'Generated by Warehouse Management System'} • ${new Date().toLocaleString()}
        </div>
      </div>
    `;

    try {
      toast.loading(isRtl ? 'جاري تحضير النموذج...' : 'Preparing template...');
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });
      
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to create image');

      const textFallback = `📦 *${trans.thirdPartyProcessing}*\n🗓️ ${date}\n🏢 ${job.warehouseName} (${job.warehouseCode})\n\n📊 ${lang === 'ar' ? 'نسبة التشغيل' : 'Yield'}: ${yieldPercentage}%\n📉 ${lang === 'ar' ? 'نسبة الفقد' : 'Loss'}: ${lossPercentage}%\n📥 ${lang === 'ar' ? 'المدخلات' : 'Inputs'}: ${totalIn}kg\n📤 ${lang === 'ar' ? 'المخرجات' : 'Outputs'}: ${totalOut}kg`;

      // Copy image to clipboard
      try {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        toast.success(isRtl ? 'تم نسخ صورة التقرير! يمكنك لصقها في واتساب' : 'Report image copied! You can paste it in WhatsApp');
      } catch (err) {
        console.warn('Clipboard copy failed, downloading report', err);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Job_Report_${job.warehouseCode}_${job.date}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }

      // Directly open WhatsApp
      const warehouse = warehouses.find(w => w.id === job.warehouseId);
      const whatsappUrl = warehouse?.whatsappGroup 
        ? (warehouse.whatsappGroup.startsWith('http') ? warehouse.whatsappGroup : `https://wa.me/${warehouse.whatsappGroup.replace(/\D/g, '')}?text=${encodeURIComponent(textFallback)}`)
        : `https://wa.me/?text=${encodeURIComponent(textFallback)}`;

      window.open(whatsappUrl, '_blank');
      toast.dismiss();
    } catch (error) {
      console.error('Share error:', error);
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      toast.dismiss();
      toast.error(isRtl ? 'حدث خطأ أثناء المشاركة' : 'Error during sharing');
      
      // Final fallback to text version
      const totalIn = job.inputs.reduce((s, i) => s + i.quantity, 0);
      const totalOut = job.outputs.reduce((s, i) => s + i.quantity, 0);
      const yieldPercentage = totalIn > 0 ? ((totalOut / totalIn) * 100).toFixed(1) : '0.0';
      const lossWeight = totalIn - totalOut;
      const lossPercentage = totalIn > 0 ? ((lossWeight / totalIn) * 100).toFixed(1) : '0.0';
      
      const absoluteFallback = `📦 *${trans.thirdPartyProcessing}*\n🗓️ ${new Date(job.date).toLocaleDateString()}\n🏢 ${job.warehouseName}\n\n📊 ${lang === 'ar' ? 'نسبة التشغيل' : 'Yield'}: ${yieldPercentage}%\n📉 ${lang === 'ar' ? 'نسبة الفقد' : 'Loss'}: ${lossPercentage}%\n📥 In: ${totalIn}kg\n📤 Out: ${totalOut}kg`;
      window.open(`https://wa.me/?text=${encodeURIComponent(absoluteFallback)}`, '_blank');
    }
  };

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
      let workbook;
      let worksheet;
      let loadedFromTemplate = false;

      try {
        const response = await fetch('/sub.xlsx');
        if (!response.ok) {
          throw new Error('Template file sub.xlsx not found in public folder');
        }
        const arrayBuffer = await response.arrayBuffer();
        workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        worksheet = workbook.Sheets[sheetName];
        loadedFromTemplate = true;
      } catch (templateError) {
        console.warn("Could not load sub.xlsx template, falling back to clean sheet", templateError);
      }

      if (loadedFromTemplate && worksheet) {
        const setCellValue = (ws: any, r: number, c: number, val: any) => {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!ws[cellRef]) {
            ws[cellRef] = { t: 's', v: '' };
          }
          if (val === null || val === undefined || val === '') {
            ws[cellRef].v = '';
            ws[cellRef].t = 's';
          } else if (typeof val === 'number') {
            ws[cellRef].v = val;
            ws[cellRef].t = 'n';
          } else {
            ws[cellRef].v = String(val);
            ws[cellRef].t = 's';
          }
        };

        const setCellFormula = (ws: any, r: number, c: number, formula: string) => {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!ws[cellRef]) {
            ws[cellRef] = {};
          }
          ws[cellRef].t = 'n';
          ws[cellRef].f = formula;
          delete ws[cellRef].v; // Allow Excel to compute
        };

        // Write supplier / warehouse metadata in Column D rows 2, 3, 4 (0-indexed: row indexes 1, 2, 3)
        // D2 value for "كود المورد"
        setCellValue(worksheet, 1, 3, job.supplierName || job.thirdPartyName || '');
        // D3 value for "المورد" / "اسم المورد"
        setCellValue(worksheet, 2, 3, job.supplierName || job.thirdPartyName || '');
        // D4 value for "كود المخزن"
        setCellValue(worksheet, 3, 3, job.warehouseCode || '');

        // G2, G3, G4, G5 are labels. Value cells are H2, H3, H4, H5 in Column H (col index 7)
        setCellValue(worksheet, 1, 7, 0); // "سعر التشغيل" (Default to 0)
        setCellFormula(worksheet, 2, 7, 'H2*H27'); // "اجمالى سعر التشغيل"
        setCellFormula(worksheet, 3, 7, 'D27-H27'); // "الفرق"
        setCellFormula(worksheet, 4, 7, 'IF(D27>0,H4/D27,0)'); // "النسبة"

        const maxItems = Math.max(job.inputs.length, job.outputs.length);
        
        // Loop through the 18 pre-styled data rows: from template row index 8 to 25 (Excel rows 9 to 26)
        for (let i = 0; i < 18; i++) {
          const rowNum = 8 + i; 

          // Date in Col 0 (Col A)
          if (i < maxItems) {
            setCellValue(worksheet, rowNum, 0, job.date);
          } else {
            setCellValue(worksheet, rowNum, 0, '');
          }

          // Inputs (Col 1: SAP code, Col 2: Name, Col 3: Qty)
          if (i < job.inputs.length) {
            const input = job.inputs[i];
            setCellValue(worksheet, rowNum, 1, input.itemCode);
            setCellValue(worksheet, rowNum, 2, input.itemName);
            setCellValue(worksheet, rowNum, 3, input.quantity);
          } else {
            setCellValue(worksheet, rowNum, 1, '');
            setCellValue(worksheet, rowNum, 2, '');
            setCellValue(worksheet, rowNum, 3, '');
          }

          // Outputs (Col 5: SAP code, Col 6: Name, Col 7: Qty)
          if (i < job.outputs.length) {
            const output = job.outputs[i];
            setCellValue(worksheet, rowNum, 5, output.itemCode);
            setCellValue(worksheet, rowNum, 6, output.itemName);
            setCellValue(worksheet, rowNum, 7, output.quantity);
          } else {
            setCellValue(worksheet, rowNum, 5, '');
            setCellValue(worksheet, rowNum, 6, '');
            setCellValue(worksheet, rowNum, 7, '');
          }
        }

        // Keep original ref block so formulas like SUM(D9:D26) are respected
        worksheet['!ref'] = 'A1:H27';

        XLSX.writeFile(workbook, `Job_${job.warehouseCode || 'Report'}_${job.date}.xlsx`);
        toast.success(isRtl ? 'تم تصدير ملف Excel بنجاح' : 'Excel file exported successfully', { id: toastId });
      } else {
        const totalIn = job.inputs.reduce((sum, i) => sum + i.quantity, 0);
        const totalOut = job.outputs.reduce((sum, i) => sum + i.quantity, 0);
        const efficiency = totalIn > 0 ? ((totalOut / totalIn) * 100).toFixed(1) + '%' : '0%';
        const lossWeight = totalIn - totalOut;
        const lossPercentage = totalIn > 0 ? ((lossWeight / totalIn) * 100).toFixed(1) + '%' : '0%';

        const reportRows = [
          [isRtl ? 'نموذج عملية تشغيل لدى الغير' : 'Third-Party Processing Report'],
          [],
          [isRtl ? 'بيانات العملية' : 'Job Details'],
          [trans.processDate, job.date],
          [isRtl ? 'المخزن' : 'Warehouse', `${job.warehouseName || '-'} (${job.warehouseCode || '-'})`],
          [],
          [isRtl ? 'ملخص الكميات' : 'Quantities Summary'],
          [isRtl ? 'إجمالي المدخلات' : 'Total Inputs', `${totalIn} kg`],
          [isRtl ? 'إجمالي المخرجات' : 'Total Outputs', `${totalOut} kg`],
          [isRtl ? 'نسبة التشغيل' : 'Yield', efficiency],
          [isRtl ? 'نسبة الفقد' : 'Loss %', lossPercentage],
          [],
          [trans.inputs],
          [isRtl ? 'كود الصنف' : 'Item Code', isRtl ? 'اسم الصنف' : 'Item Name', trans.quantity],
          ...job.inputs.map(i => [i.itemCode, i.itemName, `${i.quantity} ${i.unit}`]),
          [],
          [trans.outputs],
          [isRtl ? 'كود الصنف' : 'Item Code', isRtl ? 'اسم الصنف' : 'Item Name', trans.quantity],
          ...job.outputs.map(i => [i.itemCode, i.itemName, `${i.quantity} ${i.unit}`]),
          [],
          [trans.comments],
          [job.notes || '-']
        ];

        const ws = XLSX.utils.aoa_to_sheet(reportRows);
        const wscols = [
          { wch: 25 },
          { wch: 40 },
          { wch: 15 }
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `Job_${job.warehouseCode || 'Report'}_${job.date}.xlsx`);
        toast.success(isRtl ? 'تم تصدير ملف Excel بنجاح' : 'Excel file exported successfully', { id: toastId });
      }
    } catch (error) {
      console.error("Single excel export error:", error);
      toast.error(lang === 'ar' ? 'فشل التصدير' : 'Export failed', { id: toastId });
    }
  };

  const exportSingleJobToWord = async (job: ProcessingJob) => {
    const isRtl = lang === 'ar';
    const toastId = toast.loading(isRtl ? 'جاري تحضير ملف Word...' : 'Preparing Word file...');
    try {
      const totalIn = job.inputs.reduce((sum, i) => sum + i.quantity, 0);
      const totalOut = job.outputs.reduce((sum, i) => sum + i.quantity, 0);
      const lossPercent = totalIn > 0 ? (((totalIn - totalOut) / totalIn) * 100).toFixed(1) + '%' : '0%';

      const maxRows = Math.max(job.inputs.length, job.outputs.length);
      const rowsCount = Math.max(maxRows, 5);

      // Helper for creating centered bold cells
      const createCell = (text: string, options: any = {}) => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text, size: options.size || 18, bold: options.bold, color: options.color || "000000" })],
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

      // 1. Metadata Table (Pricing and Vendor split)
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
              // Left: Pricing
              new TableCell({
                width: { size: 47, type: WidthType.PERCENTAGE },
                children: [
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                      new TableRow({ children: [
                        createCell("سعر التشغيل", { bg: "F1F5F9", bold: true, width: 55 }),
                        createCell("0.00", { width: 45, bold: true })
                      ]}),
                      new TableRow({ children: [
                        createCell("اجمالى سعر التشغيل", { bg: "F1F5F9", bold: true }),
                        createCell("0.00", { bg: "F8FAFC", bold: true })
                      ]}),
                      new TableRow({ children: [
                        createCell("الفرق", { bg: "F1F5F9", bold: true }),
                        createCell(`${(totalIn - totalOut).toLocaleString()} kg`, { bg: "F8FAFC", bold: true, color: "2563EB" })
                      ]}),
                      new TableRow({ children: [
                        createCell("نسبة الفقد", { bg: "F1F5F9", bold: true }),
                        createCell(lossPercent, { bg: "F8FAFC", bold: true, color: "DC2626" })
                      ]}),
                    ]
                  })
                ]
              }),
              // Spacer
              new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, children: [], borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } } }),
              // Right: Vendor
              new TableCell({
                width: { size: 47, type: WidthType.PERCENTAGE },
                children: [
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                      new TableRow({ children: [
                        createCell("كود المورد", { bg: "F1F5F9", bold: true, width: 40 }),
                        createCell(job.warehouseCode || "-", { width: 60, bold: true })
                      ]}),
                      new TableRow({ children: [
                        createCell("اسم المورد", { bg: "F1F5F9", bold: true }),
                        createCell(job.warehouseName || job.supplierName || job.thirdPartyName || "-", { bg: "F8FAFC", bold: true })
                      ]}),
                      new TableRow({ children: [
                        createCell("كود المخزن", { bg: "F1F5F9", bold: true }),
                        createCell(job.warehouseCode || "-", { bg: "F8FAFC", bold: true })
                      ]}),
                    ]
                  })
                ]
              })
            ]
          })
        ]
      });

      // 2. Main Tables (Inputs and Outputs)
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
          createCell("إجمالي المدخلات", { bg: "FACC15", bold: true, width: 80, align: AlignmentType.RIGHT }),
          createCell(totalIn.toLocaleString(), { bg: "FACC15", bold: true, width: 20 }),
        ],
        // Merge the first two cells manually since createCell creates a single cell
      }));
      // Adjusting the last row merge logic: docx requires column spans
      const lastInputRow = new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [new Paragraph({ children: [new TextRun({ text: "إجمالي المدخلات", bold: true })], alignment: AlignmentType.RIGHT })],
            shading: { fill: "FACC15", type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
          }),
          createCell(totalIn.toLocaleString(), { bg: "FACC15", bold: true }),
        ]
      });
      inputsRowsList.pop();
      inputsRowsList.push(lastInputRow);

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

      const lastOutputRow = new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [new Paragraph({ children: [new TextRun({ text: "إجمالي المخرجات", bold: true })], alignment: AlignmentType.RIGHT })],
            shading: { fill: "FACC15", type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
          }),
          createCell(totalOut.toLocaleString(), { bg: "FACC15", bold: true }),
        ]
      });
      outputsRowsList.push(lastOutputRow);

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
              // Inputs Table
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
              // Spacer
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, children: [] }),
              // Outputs Table
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

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              size: { orientation: PageOrientation.PORTRAIT },
              margin: { top: 720, bottom: 720, left: 720, right: 720 }, // 0.5 inch
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
            ...(job.notes ? [
              new Paragraph({ text: "", spacing: { before: 300 } }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({
                          children: [
                            new TextRun({ text: isRtl ? "ملاحظات: " : "Notes: ", bold: true }),
                            new TextRun({ text: job.notes })
                          ]
                        })],
                        shading: { fill: "FEF3C7", type: ShadingType.CLEAR },
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 6, color: "FBBF24" },
                          bottom: { style: BorderStyle.SINGLE, size: 6, color: "FBBF24" },
                          left: { style: BorderStyle.SINGLE, size: 6, color: "FBBF24" },
                          right: { style: BorderStyle.SINGLE, size: 6, color: "FBBF24" },
                        },
                        margins: { top: 120, bottom: 120, left: 120, right: 120 }
                      })
                    ]
                  })
                ]
              })
            ] : []),
            new Paragraph({ text: "", spacing: { before: 800 } }), // Space before signatures
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
                    createCell(isRtl ? "اسم المستخدم: ............." : "User: .............", { noBorder: true, size: 18 }),
                    createCell(isRtl ? "اسم المستخدم: ............." : "User: .............", { noBorder: true, size: 18 }),
                    createCell(isRtl ? `بواسطة: ${user.displayName || "............."}` : `By: ${user.displayName || "............."}`, { noBorder: true, size: 18 }),
                    createCell(isRtl ? "اسم المستخدم: ............." : "User: .............", { noBorder: true, size: 18 }),
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
      link.download = `Job_${job.warehouseCode || 'Report'}_${job.date}.docx`;
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
            {user.role === 'Admin' && (
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-2xl font-bold transition-all"
              >
                <Settings size={20} className="text-zinc-500" />
                {lang === 'ar' ? 'ضبط التشغيلات' : 'Processing Settings'}
              </button>
            )}
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20"
            >
              <Plus size={20} />
              {t.addJob}
            </button>
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
                  <label className="text-xs font-bold text-zinc-500 block px-1 uppercase">{lang === 'ar' ? 'اسم مسؤول التواصل' : 'Contact Person'}</label>
                  <input 
                    type="text" 
                    value={newWarehouse.contactName}
                    onChange={e => setNewWarehouse({...newWarehouse, contactName: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
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
                    <button 
                      onClick={handleAddWarehouse}
                      className="bg-emerald-600 text-white px-5 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <Plus size={20} />
                    </button>
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
                    <div key={w.id} className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative group hover:ring-2 hover:ring-emerald-500/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:scale-110 transition-transform">
                          <Database size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{w.name}</h4>
                          <p className="text-[10px] text-zinc-500 font-mono font-bold tracking-wider">{w.systemCode}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteWarehouse(w.id)}
                        className="absolute top-4 right-4 p-2 text-zinc-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="mt-4 pt-4 border-t border-zinc-50 dark:border-zinc-800/50 flex flex-col gap-2">
                        {w.contactName && (
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                             <Users size={12} />
                             {w.contactName}
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
                  status: (user.role === 'Admin' || user.role === 'Warehouse Operations') ? 'Completed' : 'Pending Approval',
                  notes: ''
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

            {/* Excel Import for Job Components */}
            <div className="p-5 bg-orange-50/10 dark:bg-orange-950/5 border border-dashed border-orange-200 dark:border-orange-900/40 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-right flex-1">
                <h4 className="text-sm font-extrabold text-orange-650 dark:text-orange-400 flex items-center gap-2">
                  <FileSpreadsheet size={16} />
                  <span>{lang === 'ar' ? 'تعبئة العملية تلقائياً من ملف Excel' : 'Auto-fill Job from Excel File'}</span>
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  {lang === 'ar'
                    ? 'يمكنك رفع ملف Excel التشغيل ليقوم النظام تلقائياً باستخراج "المدخلات" و"المخرجات" ونسب الهالك وتعبئتها بالكامل بدلاً من إدخالها يدوياً.'
                    : 'Upload the processing Excel file to automatically extract all inputs and outputs for this job, replacing any manually added list items.'
                  }
                </p>
              </div>
              <label className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-orange-500/20 shrink-0">
                <Download size={16} />
                {lang === 'ar' ? 'اختر ملف Excel للتشغيل' : 'Select Job Excel File'}
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleImportJobDetailsExcel}
                  className="hidden"
                />
              </label>
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
              <button 
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 dark:text-emerald-400 rounded-xl transition-all text-sm font-bold"
                title={lang === 'ar' ? 'استخراج اكسيل' : 'Export to Excel'}
              >
                <FileSpreadsheet size={18} />
                <span className="hidden sm:inline">{lang === 'ar' ? 'تصدير' : 'Export'}</span>
              </button>
              <div className="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800" />
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
              filteredJobs.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((job) => (
                <div 
                  key={job.id}
                  className="group bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-all duration-300"
                >
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                        {/* Left: Job Info */}
                        <div className="flex gap-4">
                          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-100 dark:border-emerald-800/50">
                            <span className="text-xs font-bold uppercase leading-none opacity-60 mb-1">
                              {new Date(job.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short' })}
                            </span>
                            <span className="text-xl font-black leading-none">{new Date(job.date).getDate()}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-lg text-zinc-900 dark:text-white leading-tight">
                                {job.warehouseName}
                              </h4>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                job.status === 'Completed' 
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                  : job.status === 'Pending Approval'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                              }`}>
                                {job.status === 'Completed' 
                                  ? (lang === 'ar' ? 'معتمد' : 'Approved') 
                                  : job.status === 'Pending Approval'
                                  ? (lang === 'ar' ? 'قيد المراجعة' : 'Pending Approval')
                                  : (lang === 'ar' ? 'مسودة' : 'Draft')}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-bold text-zinc-500">
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <Building2 size={14} className="opacity-70" />
                                {job.warehouseCode}
                              </span>
                              <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                              <span className="flex items-center gap-1">
                                <Clock size={14} className="opacity-70" />
                                {new Date(job.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Top Summary Stats */}
                        <div className="grid grid-cols-4 gap-2 flex-1">
                          <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1 leading-none">{lang === 'ar' ? 'المدخلات' : 'Inputs'}</span>
                            <span className="text-xs font-black text-zinc-900 dark:text-white leading-none">
                              {job.inputs.reduce((s, i) => s + i.quantity, 0).toLocaleString()} <span className="text-[9px] opacity-40">kg</span>
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1 leading-none">{lang === 'ar' ? 'المخرجات' : 'Outputs'}</span>
                            <span className="text-xs font-black text-zinc-900 dark:text-white leading-none">
                              {job.outputs.reduce((s, i) => s + i.quantity, 0).toLocaleString()} <span className="text-[9px] opacity-40">kg</span>
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-emerald-100/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50">
                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1 leading-none">{lang === 'ar' ? 'التشغيل' : 'Yield'}</span>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 leading-none">
                              {(job.inputs.reduce((s, i) => s + i.quantity, 0) > 0 
                                ? (job.outputs.reduce((s, i) => s + i.quantity, 0) / job.inputs.reduce((s, i) => s + i.quantity, 0) * 100).toFixed(1)
                                : '0.0')}%
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-rose-100/50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50">
                            <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest block mb-1 leading-none">{lang === 'ar' ? 'الفقد' : 'Loss'}</span>
                            <span className="text-xs font-black text-rose-600 dark:text-rose-400 leading-none">
                              {(job.inputs.reduce((s, i) => s + i.quantity, 0) > 0 
                                ? (((job.inputs.reduce((s, i) => s + i.quantity, 0) - job.outputs.reduce((s, i) => s + i.quantity, 0)) / job.inputs.reduce((s, i) => s + i.quantity, 0)) * 100).toFixed(1)
                                : '0.0')}%
                            </span>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex lg:flex-col items-center gap-1 bg-zinc-50 dark:bg-zinc-800 p-1 rounded-[20px] border border-zinc-100 dark:border-zinc-800 w-fit">
                          {(user.role === 'Admin' || user.role === 'Warehouse Operations') && job.status === 'Pending Approval' && (
                            <button 
                              onClick={() => handleApproveJob(job)}
                              className="p-2.5 text-emerald-600 hover:bg-white dark:hover:bg-zinc-700 rounded-2xl transition-all shadow-sm shadow-transparent hover:shadow-black/5"
                              title={lang === 'ar' ? 'اعتماد' : 'Approve'}
                            >
                              <CheckCircle2 size={18} />
                            </button>
                          )}
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleShareWhatsApp(job)}
                              className="p-2.5 text-emerald-500 hover:bg-white dark:hover:bg-zinc-700 rounded-2xl transition-all"
                              title={lang === 'ar' ? 'مشاركة واتساب' : 'Share WhatsApp'}
                            >
                              <MessageCircle size={18} />
                            </button>
                            <button 
                              onClick={() => handleShareExcelOutlook(job)}
                              className="p-2.5 text-blue-600 hover:bg-white dark:hover:bg-zinc-700 rounded-2xl transition-all"
                              title={lang === 'ar' ? 'مشاركة أوتلوك' : 'Share Outlook'}
                            >
                              <Mail size={18} />
                            </button>
                            <button 
                              onClick={() => handlePrint(job)}
                              className="p-2.5 text-zinc-400 hover:bg-white dark:hover:bg-zinc-700 rounded-2xl transition-all hover:text-blue-500"
                              title={lang === 'ar' ? 'طباعة / PDF' : 'Print / PDF'}
                            >
                              <Printer size={18} />
                            </button>
                            <button 
                              onClick={() => exportSingleJobToWord(job)}
                              className="p-2.5 text-blue-500 hover:bg-white dark:hover:bg-zinc-700 rounded-2xl transition-all"
                              title={lang === 'ar' ? 'تصدير Word' : 'Export Word'}
                            >
                              <FileText size={18} />
                            </button>
                            <button 
                              onClick={() => exportSingleJobToExcel(job)}
                              className="p-2.5 text-emerald-600 hover:bg-white dark:hover:bg-zinc-700 rounded-2xl transition-all"
                              title={lang === 'ar' ? 'تصدير اكسيل' : 'Export Excel'}
                            >
                              <FileSpreadsheet size={18} />
                            </button>
                          </div>
                          <div className="h-[1px] w-full bg-zinc-200 dark:bg-zinc-700 my-0.5 hidden lg:block" />
                          <div className="flex items-center gap-1">
                            {(user.role === 'Admin' || user.role === 'Warehouse Operations' || job.createdBy === user.uid) && (
                              <button 
                                onClick={() => handleEditJob(job)}
                                className="p-2.5 text-blue-500 hover:bg-white dark:hover:bg-zinc-700 rounded-2xl transition-all"
                                title={lang === 'ar' ? 'تعديل' : 'Edit'}
                              >
                                <Save size={18} />
                              </button>
                            )}
                            {user.role === 'Admin' && (
                              <button 
                                onClick={() => handleDeleteJob(job.id)}
                                className="p-2.5 text-rose-500 hover:bg-white dark:hover:bg-zinc-700 rounded-2xl transition-all"
                                title={lang === 'ar' ? 'حذف' : 'Delete'}
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Details section */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Inputs details */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">{t.inputs}</label>
                            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-md">{job.inputs.length} {lang === 'ar' ? 'أصناف' : 'items'}</span>
                          </div>
                          <div className="grid gap-2">
                        {job.inputs.map((input, i) => (
                              <div key={i} className="group/item flex items-center justify-between p-3 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-900/30 transition-all">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-zinc-400 font-mono leading-none mb-1 opacity-0 group-hover/item:opacity-100 transition-opacity">{input.itemCode}</span>
                                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{input.itemName}</span>
                                </div>
                                <span className="text-sm font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-xl">
                                  {input.quantity} {input.unit}
                                </span>
                              </div>
                        ))}
                      </div>
                    </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">{t.outputs}</label>
                            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-md">{job.outputs.length} {lang === 'ar' ? 'أصناف' : 'items'}</span>
                          </div>
                          <div className="grid gap-2">
                        {job.outputs.map((output, i) => (
                              <div key={i} className="group/item flex items-center justify-between p-3 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 hover:border-blue-200 dark:hover:border-blue-900/30 transition-all">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-zinc-400 font-mono leading-none mb-1 opacity-0 group-hover/item:opacity-100 transition-opacity">{output.itemCode}</span>
                                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{output.itemName}</span>
                                </div>
                                <span className="text-sm font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-xl">
                                  {output.quantity} {output.unit}
                                </span>
                              </div>
                        ))}
                      </div>
                    </div>
                  </div>

                      {job.notes && (
                        <div className="mt-8 p-4 bg-amber-50/30 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/10 rounded-2xl text-xs text-amber-700/80 dark:text-amber-400 leading-relaxed shadow-inner">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t.comments}</span>
                          </div>
                          "{job.notes}"
                        </div>
                      )}
                </div>
              ))
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
