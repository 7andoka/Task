export type UserRole = 'Admin' | 'Warehouse Manager' | 'Department Head' | 'Supervisor' | 'Warehouse Specialist' | 'Warehouse Keeper' | 'Assistant Warehouse Keeper' | 'Worker' | 'Security' | 'Quality' | 'Warehouse' | 'Customer Operations' | 'Warehouse Operations' | 'Quality Operations' | 'Purchasing Operations';

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
  username?: string;
  email?: string;
  displayName: string;
  role: UserRole;
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

export interface ProcessingJob {
  id: string;
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
  notes?: string;
  status: 'Draft' | 'Completed';
  createdAt: string;
  createdBy: string;
}

export type Language = 'ar' | 'en';
