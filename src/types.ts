export type UserRole = 'Admin' | 'Warehouse Manager' | 'Department Head' | 'Supervisor' | 'Warehouse Specialist' | 'Warehouse Keeper' | 'Assistant Warehouse Keeper' | 'Worker' | 'Security' | 'Quality' | 'Warehouse';

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

export type Language = 'ar' | 'en';
