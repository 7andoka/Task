export type UserRole = 'Admin' | 'Warehouse Manager' | 'Department Head' | 'Supervisor' | 'Warehouse Specialist' | 'Warehouse Keeper' | 'Assistant Warehouse Keeper' | 'Worker';

export interface NotificationPreferences {
  newAssignments: boolean;
  deadlineReminders: boolean;
  statusChanges: boolean;
}

export interface UserProfile {
  uid: string;
  username?: string;
  email: string;
  displayName: string;
  role: UserRole;
  managerId?: string;
  department?: string;
  photoURL?: string;
  phone?: string;
  createdAt: string;
  needsPasswordChange?: boolean;
  initialPassword?: string;
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
