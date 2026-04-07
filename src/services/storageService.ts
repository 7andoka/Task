import { UserProfile, Task, Subtask, Comment, Notification, AuditLog, SupplyMovement } from '../types';
import { auth, db } from '../firebase';
import { collection, doc, getDocs, getDoc, setDoc, getDocFromServer, query, where, deleteDoc, orderBy } from 'firebase/firestore';
import { COLLECTIONS } from '../constants';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email?: string | null | undefined;
    emailVerified?: boolean | undefined;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
    },
    operationType,
    path
  };
  
  console.error('Firestore Error Details:', JSON.stringify(errInfo));
  
  // If it's a permission error or offline error, we want to know
  if (errInfo.error.includes('permission') || errInfo.error.includes('offline')) {
    window.dispatchEvent(new CustomEvent('firestore-connection-error', { detail: errInfo.error }));
  }

  throw new Error(JSON.stringify(errInfo));
}

// Test connection to Firestore
async function testConnection() {
  try {
    console.log("Testing Firestore connection to database:", (db as any)._databaseId?.database || 'default');
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful.");
  } catch (error) {
    console.error("Firestore Connection Test Error:", error);
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is reporting as offline.");
      window.dispatchEvent(new CustomEvent('firestore-connection-error', { detail: 'offline' }));
    }
  }
}
testConnection();

export const storageService = {
  getUsers: async (): Promise<UserProfile[]> => {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
      const users = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          uid: data.uid || doc.id
        } as UserProfile;
      });
      
      // Deduplicate by UID
      const uniqueUsers = Array.from(new Map(users.map(u => [u.uid, u])).values());

      if (uniqueUsers.length === 0) {
        const defaultAdmin: UserProfile = {
          uid: 'admin',
          username: 'admin',
          displayName: 'System Administrator',
          role: 'Admin',
          needsPasswordChange: false,
          initialPassword: 'admin',
          password: 'admin',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, COLLECTIONS.USERS, defaultAdmin.username), defaultAdmin);
        return [defaultAdmin];
      }
      return uniqueUsers;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.USERS);
    }
  },
  saveUsers: async (users: UserProfile[]) => {
    try {
      for (const user of users) {
        await setDoc(doc(db, COLLECTIONS.USERS, user.username), user);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.USERS);
    }
  },

  deleteUser: async (uid: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.USERS, uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.USERS}/${uid}`);
    }
  },

  getUserByUid: async (uid: string): Promise<UserProfile | undefined> => {
    try {
      // Since document ID is username, we need to query by UID field
      const snapshot = await getDocs(query(collection(db, COLLECTIONS.USERS), where('uid', '==', uid)));
      if (!snapshot.empty) {
        return snapshot.docs[0].data() as UserProfile;
      }
      return undefined;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.USERS);
    }
  },
  getUserByUsername: async (username: string): Promise<UserProfile | undefined> => {
    try {
      // For pre-created users, the username is the document ID
      const docSnap = await getDoc(doc(db, COLLECTIONS.USERS, username));
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }

      // If 'admin' is not found, bootstrap it (first run)
      if (username === 'admin') {
        const defaultAdmin: UserProfile = {
          uid: 'admin',
          username: 'admin',
          displayName: 'System Administrator',
          role: 'Admin',
          needsPasswordChange: false,
          initialPassword: 'admin',
          password: 'admin',
          createdAt: new Date().toISOString()
        };
        try {
          await setDoc(doc(db, COLLECTIONS.USERS, defaultAdmin.username), defaultAdmin);
          return defaultAdmin;
        } catch (bootstrapError) {
          console.error("Bootstrap Error:", bootstrapError);
        }
      }
      return undefined;
    } catch (error) {
      console.error("getUserByUsername Error:", error);
      // Don't throw for initial login check
      return undefined;
    }
  },
  saveUser: async (user: UserProfile) => {
    try {
      // Always use username as the document ID for the users collection
      await setDoc(doc(db, COLLECTIONS.USERS, user.username), user);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.USERS}/${user.username}`);
    }
  },
  getTasks: async (): Promise<Task[]> => {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.TASKS));
      const tasks = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: data.id || doc.id
        } as Task;
      });
      // Deduplicate by ID
      return Array.from(new Map(tasks.map(t => [t.id, t])).values());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.TASKS);
    }
  },
  saveTasks: async (tasks: Task[]) => {
    try {
      for (const task of tasks) {
        await setDoc(doc(db, COLLECTIONS.TASKS, task.id), task);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.TASKS);
    }
  },
  deleteTask: async (taskId: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.TASKS, taskId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.TASKS}/${taskId}`);
    }
  },

  saveTask: async (task: Task) => {
    try {
      const updatedTask = { ...task, lastUpdatedAt: new Date().toISOString() };
      await setDoc(doc(db, COLLECTIONS.TASKS, task.id), updatedTask);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.TASKS}/${task.id}`);
    }
  },
  sendUrgentReminder: async (taskId: string) => {
    try {
      const taskRef = doc(db, COLLECTIONS.TASKS, taskId);
      const snapshot = await getDoc(taskRef);
      if (snapshot.exists()) {
        const task = snapshot.data() as Task;
        const now = new Date().toISOString();
        await setDoc(taskRef, { 
          ...task, 
          lastReminderAt: now,
          lastUpdatedAt: now 
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.TASKS}/${taskId}`);
    }
  },
  getSubtasks: async (): Promise<Subtask[]> => {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.SUBTASKS));
      const subtasks = snapshot.docs.map(doc => doc.data() as Subtask);
      // Deduplicate by ID
      return Array.from(new Map(subtasks.map(s => [s.id, s])).values());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.SUBTASKS);
    }
  },
  saveSubtasks: async (subtasks: Subtask[]) => {
    try {
      for (const subtask of subtasks) {
        await setDoc(doc(db, COLLECTIONS.SUBTASKS, subtask.id), subtask);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.SUBTASKS);
    }
  },
  // Future proofing
  getComments: async (taskId: string): Promise<Comment[]> => {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.COMMENTS));
      return snapshot.docs.map(doc => doc.data() as Comment).filter(c => c.taskId === taskId);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.COMMENTS);
    }
  },
  saveComment: async (comment: Comment) => {
    try {
      await setDoc(doc(db, COLLECTIONS.COMMENTS, comment.id), comment);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.COMMENTS);
    }
  },
  getNotifications: async (userId: string): Promise<Notification[]> => {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.NOTIFICATIONS));
      return snapshot.docs.map(doc => doc.data() as Notification).filter(n => n.userId === userId);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.NOTIFICATIONS);
    }
  },
  saveNotification: async (notification: Notification) => {
    try {
      await setDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notification.id), notification);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.NOTIFICATIONS);
    }
  },

  // Supply Movement Methods
  getSupplyMovements: async (): Promise<SupplyMovement[]> => {
    try {
      const snapshot = await getDocs(query(collection(db, COLLECTIONS.SUPPLY_MOVEMENTS), orderBy('createdAt', 'desc')));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SupplyMovement));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.SUPPLY_MOVEMENTS);
    }
  },
  saveSupplyMovement: async (movement: SupplyMovement) => {
    try {
      await setDoc(doc(db, COLLECTIONS.SUPPLY_MOVEMENTS, movement.id), movement);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.SUPPLY_MOVEMENTS}/${movement.id}`);
    }
  },
};
