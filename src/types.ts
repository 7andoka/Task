export type UserRole = 
  | 'Admin' 
  | 'Warehouse Manager' 
  | 'Department Head' 
  | 'Supervisor' 
  | 'Warehouse Specialist' 
  | 'Warehouse Keeper' 
  | 'Assistant Warehouse Keeper' 
  | 'Worker' 
  | 'Security' 
  | 'Quality' 
  | 'Warehouse' 
  | 'Customer Operations' 
  | 'Warehouse Operations' 
  | 'Quality Operations' 
  | 'Purchasing Operations'
  | 'Registration Officer'
  | 'Approval Officer'
  | 'Execution Officer'
  | 'مسئول التسجيل'
  | 'مسئول الاعتماد'
  | 'مسئول التنفيذ';

export type SupplyStatus = 'Security Entry' | 'Quality Inspection' | 'Warehouse Unloading' | 'Security Exit' | 'Completed';
export type QualityDecision = 'Accepted' | 'Rejected' | 'Under Inspection' | 'Not Unloaded';

// Barrel types
export type BarrelType = 'سنابل' | 'البرتغاليه' | 'وطنيه';
export type BarrelOwnership = 'ملكي' | 'ملك المورد';

// Interface for a single barrel
export interface Barrel {
  id: string;
  type: BarrelType;
  ownership: BarrelOwnership;
  supplierId: string;
  currentQuantity: number;
  createdAt: string;
  lastUpdatedAt: string;
}

// Interface for barrel movements (receipts and dispatches)
export interface BarrelMovement {
  id: string;
  supplierId: string;
  barrelType: BarrelType;
  ownership: BarrelOwnership;
  location: 'Company' | 'Supplier'; // Where the movement happened
  quantity: number;
  itemName: string;
  barrelWeight: number;
  driverName: string;
  vehicleNumber: string;
  movementType: 'Receipt' | 'Dispatch';
  movementTime: string;
  notes?: string;
  createdAt: string;
  lastUpdatedAt: string;
}

export interface SupplyMovement {
  id: string;
  entryTime: string;
  exitTime?: string;
  clientName: string;
  itemName: string;
  driverName: string;
  vehicleNumber: string;
  poNumber?: string;
  status: SupplyStatus;
  
  // New additional fields for comprehensive raw material delivery tracking
  postNumber?: string;      // رقم البوست
  sapNumber?: string;       // رقم الساب
  movementNumber?: string;  // رقم الحركة
  movementType?: string;    // الحركة
  date?: string;            // التاريخ
  deliveryNote?: string;    // اذن تسليم المورد
  materialCode?: string;    // الكود
  size?: string;            // الحجم
  batch?: string;           // الباتش
  quantity?: number;        // الكمية
  unit?: string;            // الوحدة
  notes?: string;           // ملاحظات
  
  // Quality Section
  qualityDecision?: QualityDecision;
  qualityComments?: string;
  qualityInspectorId?: string;
  qualityTime?: string;
  
  // Warehouse Section
  warehouseComments?: string;
  warehouseOperatorId?: string;
  warehouseTime?: string;
  
  // Security Exit Section
  securityExitId?: string;
  
  createdAt: string;
  lastUpdatedAt: string;
}
// ... (rest of the file)

export interface NotificationPreferences {
  newAssignments: boolean;
  deadlineReminders: boolean;
  statusChanges: boolean;
}

export interface UserProfile {
  uid: string;
  id?: string;
  username?: string;
  email?: string;
  displayName: string;
  role: UserRole;
  roles?: UserRole[];
  managerId?: string;
  department?: string;
  photoURL?: string;
  phone?: string;
  createdAt: string;
  needsPasswordChange?: boolean;
  initialPassword?: string;
  password?: string;
  notificationPreferences?: NotificationPreferences;
  permissions?: string[];
}

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'Pending' | 'In Progress' | 'Pending Review' | 'Delayed' | 'Completed' | 'Cancelled';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
  estimatedTime: number;
  actualTimeSpent: number;
  progress: number;
  assigneeId: string;
  managerId: string;
  startTime?: string;
  endTime?: string;
  attachments?: string[];
  createdAt: string;
  lastUpdatedAt?: string;
  lastReminderAt?: string;
  completionNotes?: string;
  managerRating?: number;
  managerFeedback?: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  systemCode: string;
  supplierCode?: string;
  processingPricePerKg?: number;
  supplierName?: string;
  location?: string;
  contactName?: string;
  whatsappGroup?: string;
  createdAt: string;
}

export interface ProcessItem {
  code: string;
  name: string;
  type: string;
  direction?: string;
  process: string;
  size: string;
}

export type JobStatus = 'Draft' | 'Pending Warehouse' | 'Pending Quality' | 'Pending Purchasing' | 'Pending Completion' | 'Completed' | 'Rejected';

export interface ProcessingJob {
  id: string;
  jobCode?: string;
  date: string;
  thirdPartyName?: string;
  supplierName?: string;
  location?: string;
  warehouseId?: string;
  warehouseName?: string;
  warehouseCode?: string;
  inputs: {
    itemCode: string;
    itemName: string;
    quantity: number;
    unit: string;
  }[];
  outputs: {
    itemCode: string;
    itemName: string;
    quantity: number;
    unit: string;
  }[];
  scrapQty?: number;
  farzaQty?: number;
  seedQty?: number;
  wasteQty?: number;
  notes?: string;
  processOperation?: string;
  status: JobStatus;
  createdAt: string;
  createdBy: string;
  
  // Workflow fields
  confirmedPrice?: number;
  qualityComments?: string;
  poNumber?: string;

  // Grading Specific Quality defects
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

  // Slicing Specific Quality fields
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
  
  // Track timestamps/users for each stage
  warehouseApprovalTime?: string;
  warehouseApproverId?: string;
  qualityApprovalTime?: string;
  qualityApproverId?: string;
  purchasingApprovalTime?: string;
  purchasingApproverId?: string;
  completionTime?: string;
  completerId?: string;
}

export interface AgriRawMaterial {
  id: string;
  date: string; // التاريخ
  movementType: 'إضافة' | 'صرف'; // الحركة
  movementNumber: string; // رقم الحركة
  supplier: string; // المورد
  sapNumber: string; // رقم الساب
  postNumber: string; // رقم البوست
  deliveryNote: string; // إذن تسليم المورد
  materialCode: string; // الكود
  itemName: string; // الصنف
  size: string; // الحجم
  batch: string; // الباتش
  quantity: number; // الكمية
  unit: string; // الوحدة
  driverName: string; // اسم السائق
  vehicleNumber: string; // رقم السيارة
  notes?: string; // ملاحظات
  isDuplicate?: boolean; // هل الصف مكرر؟
  createdAt: string;
  lastUpdatedAt: string;
}

export interface ScaleSettings {
  companyName?: string;
  companyAddress?: string;
  companyLogo?: string;
  unit?: string;
  [key: string]: any;
}

export interface Operation {
  id?: string;
  operationNo: string;
  vehicleNo: string;
  driver?: string;
  supplier?: string;
  customer?: string;
  item: string;
  poNumber?: string;
  soNumber?: string;
  permitNumber?: string;
  direction?: string;
  quantity?: number | string;
  grossWeight?: number;
  tareWeight?: number;
  firstWeight?: number;
  secondWeight?: number;
  netWeight: number;
  date: string;
  time: string;
  firstWeightDate?: string;
  firstWeightTime?: string;
  secondWeightDate?: string;
  secondWeightTime?: string;
  userName?: string;
  remarks?: string;
  [key: string]: any;
}

export type Language = 'ar' | 'en';

export type PurchaseOrderStatus = 
  | 'Pending Approval'     // في انتظار الاعتماد (المسجل أنشأ الطلب)
  | 'Approved'             // معتمد (مسئول الاعتماد وافق عليه)
  | 'Rejected'             // مرفوض من مسئول الاعتماد
  | 'Modification Requested' // طلب تعديل
  | 'Completed';           // منتهي (مسئول التنفيذ أنشأ أمر التوريد وأدخل رقم الـ PO)

export interface PurchaseOrder {
  id: string;
  orderNumber?: string;        // رقم تسلسلي داخلي للطلب
  pricingDate: string;         // تاريخ التسعير
  region: string;              // اسم المنطقة
  supplierName: string;        // اسم المورد
  supplierCode?: string;       // كود المورد
  itemType: string;            // نوع الصنف
  itemCategory?: string;       // التصنيف (زيتون / فلفل / خام زراعي / إلخ)
  quantity: number;            // الكمية
  unit: string;                // الوحدة (كجم / طن / عدد)
  price: number;               // السعر للوحدة
  totalAmount: number;         // إجمالي القيمة (الكمية × السعر)
  currency?: string;           // العملة (ج.م)
  notes?: string;              // ملاحظات التسجيل

  // Stage 1: Registration info
  createdBy: string;           // اسم / معرف مسجل الطلب
  createdByName?: string;      // اسم مسجل الطلب المعروض
  createdAt: string;           // تاريخ ووقت التسجيل

  // Stage 2: Approval info
  status: PurchaseOrderStatus;
  approvedBy?: string;         // معرف مسئول الاعتماد
  approvedByName?: string;     // اسم مسئول الاعتماد
  approvedAt?: string;         // تاريخ ووقت الاعتماد
  approvalNotes?: string;      // ملاحظات الاعتماد / سبب الرفض
  rejectionReason?: string;    // سبب الرفض

  // Stage 3: Execution / PO Generation info
  poNumber?: string;           // رقم أمر التوريد (الـ PO)
  executedBy?: string;         // معرف مسئول التنفيذ
  executedByName?: string;     // اسم مسئول التنفيذ
  executedAt?: string;         // تاريخ ووقت إصدار أمر التوريد
  executionNotes?: string;     // ملاحظات التنفيذ
  sapDocNumber?: string;       // رقم مستند ساب إن وجد

  lastUpdatedAt: string;
}


