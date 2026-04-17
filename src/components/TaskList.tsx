import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Paperclip,
  Trash2,
  Share2,
  Edit2,
  XCircle,
  Bell
} from 'lucide-react';
import { translations } from '../i18n';
import { Language, Task, UserProfile, TaskStatus, TaskPriority, Subtask } from '../types';
import { storageService } from '../services/storageService';

interface TaskListProps {
  lang: Language;
  user: UserProfile;
  tasks: Task[];
  subordinates: UserProfile[];
  allUsers: UserProfile[];
}

export default function TaskList({ lang, user, tasks, subordinates, allUsers }: TaskListProps) {
  const t = translations[lang];
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<TaskStatus | "All">("All");
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [shareError, setShareError] = React.useState<string | null>(null);

  // New Task Form State
  const [newTitle, setNewTitle] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [newAssignee, setNewAssignee] = React.useState("");
  const [newPriority, setNewPriority] = React.useState<TaskPriority>("Medium");
  const [newDeadline, setNewDeadline] = React.useState("");
  const [newEstimatedTime, setNewEstimatedTime] = React.useState(0);
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);

  const [subtasks, setSubtasks] = React.useState<Subtask[]>([]);
  
  // Review & Rating State
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);
  const [completionNotes, setCompletionNotes] = React.useState("");
  const [isReviewing, setIsReviewing] = React.useState(false);
  const [managerRating, setManagerRating] = React.useState(0);
  const [managerFeedback, setManagerFeedback] = React.useState("");

  React.useEffect(() => {
    if (selectedTask) {
      setIsSubmittingReview(false);
      setCompletionNotes(selectedTask.completionNotes || "");
      setIsReviewing(false);
      setManagerRating(selectedTask.managerRating || 0);
      setManagerFeedback(selectedTask.managerFeedback || "");
    }
  }, [selectedTask?.id]);

  React.useEffect(() => {
    const fetchSubtasks = async () => {
      const data = await storageService.getSubtasks();
      setSubtasks(data);
    };
    fetchSubtasks();
  }, []);

  const addSubtask = async (taskId: string, title: string) => {
    if (!title) return;
    const newSubtask: Subtask = {
      id: Date.now().toString(),
      taskId,
      title,
      isCompleted: false
    };
    const updatedSubtasks = [...subtasks, newSubtask];
    await storageService.saveSubtasks(updatedSubtasks);
    setSubtasks(updatedSubtasks);
  };

  const toggleSubtask = async (id: string, isCompleted: boolean) => {
    const updatedSubtasks = subtasks.map(st => 
      st.id === id ? { ...st, isCompleted: !isCompleted } : st
    );
    await storageService.saveSubtasks(updatedSubtasks);
    setSubtasks(updatedSubtasks);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "All" || task.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newAssignee) return;

    if (editingTaskId) {
      const now = new Date().toISOString();
      const updatedTasks = tasks.map(t => t.id === editingTaskId ? {
        ...t,
        title: newTitle,
        description: newDesc,
        assigneeId: newAssignee,
        priority: newPriority,
        deadline: new Date(newDeadline).toISOString(),
        estimatedTime: newEstimatedTime,
        lastUpdatedAt: now
      } : t);
      await storageService.saveTasks(updatedTasks);
      if (selectedTask && selectedTask.id === editingTaskId) {
        setSelectedTask(updatedTasks.find(t => t.id === editingTaskId) || null);
      }
      setIsModalOpen(false);
      resetForm();
    } else {
      const now = new Date().toISOString();
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTitle,
        description: newDesc,
        assigneeId: newAssignee,
        managerId: user.uid,
        priority: newPriority,
        status: 'Pending',
        deadline: new Date(newDeadline).toISOString(),
        estimatedTime: newEstimatedTime,
        actualTimeSpent: 0,
        progress: 0,
        createdAt: now,
        lastUpdatedAt: now
      };
      
      const updatedTasks = [...tasks, newTask];
      await storageService.saveTasks(updatedTasks);
      setIsModalOpen(false);
      resetForm();
      
      // Auto-share after creation
      handleShareTask(newTask);
    }
  };

  const openEditModal = (task: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNewTitle(task.title);
    setNewDesc(task.description);
    setNewAssignee(task.assigneeId);
    setNewPriority(task.priority);
    // Format date for input type="date" (YYYY-MM-DD)
    const dateObj = new Date(task.deadline);
    const formattedDate = !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : '';
    setNewDeadline(formattedDate);
    setNewEstimatedTime(task.estimatedTime);
    setEditingTaskId(task.id);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setNewTitle("");
    setNewDesc("");
    setNewAssignee("");
    setNewPriority("Medium");
    setNewDeadline("");
    setNewEstimatedTime(0);
    setEditingTaskId(null);
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const now = new Date().toISOString();
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status, lastUpdatedAt: now } : t);
    await storageService.saveTasks(updatedTasks);
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({ ...selectedTask, status, lastUpdatedAt: now });
    }
  };

  const handleSubmitForReview = async (taskId: string) => {
    const now = new Date().toISOString();
    const updatedTasks = tasks.map(t => t.id === taskId ? { 
      ...t, 
      status: 'Pending Review' as TaskStatus, 
      completionNotes,
      lastUpdatedAt: now
    } : t);
    await storageService.saveTasks(updatedTasks);
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({ ...selectedTask, status: 'Pending Review', completionNotes });
      setIsSubmittingReview(false);
    }
  };

  const handleSendReminder = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await storageService.sendUrgentReminder(taskId);
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({ ...selectedTask, lastReminderAt: new Date().toISOString() });
    }
    // Show success toast or feedback
    alert(lang === 'ar' ? 'تم إرسال تنبيه استعجال للموظف' : 'Urgent reminder sent to employee');
  };

  const handleConfirmCompletion = async (taskId: string) => {
    const now = new Date().toISOString();
    const updatedTasks = tasks.map(t => t.id === taskId ? { 
      ...t, 
      status: 'Completed' as TaskStatus, 
      managerRating, 
      managerFeedback,
      lastUpdatedAt: now
    } : t);
    await storageService.saveTasks(updatedTasks);
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({ ...selectedTask, status: 'Completed', managerRating, managerFeedback, lastUpdatedAt: now });
      setIsReviewing(false);
    }
  };

  const updateTaskProgress = async (taskId: string, progress: number) => {
    const now = new Date().toISOString();
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, progress, lastUpdatedAt: now } : t);
    await storageService.saveTasks(updatedTasks);
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({ ...selectedTask, progress, lastUpdatedAt: now });
    }
  };

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه المهمة؟' : 'Are you sure you want to delete this task?')) return;
    
    try {
      await storageService.deleteTask(taskId);
      // Local state will be updated by onSnapshot in App.tsx
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(null);
      }
    } catch (error) {
      console.error("Delete Task Error:", error);
    }
  };

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case 'Urgent': return 'text-red-500 bg-red-500/10';
      case 'High': return 'text-orange-500 bg-orange-500/10';
      case 'Medium': return 'text-blue-500 bg-blue-500/10';
      case 'Low': return 'text-zinc-500 bg-zinc-500/10';
    }
  };

  const getStatusColor = (s: TaskStatus) => {
    switch (s) {
      case 'Completed': return 'text-emerald-500 bg-emerald-500/10';
      case 'Delayed': return 'text-red-500 bg-red-500/10';
      case 'In Progress': return 'text-blue-500 bg-blue-500/10';
      case 'Pending Review': return 'text-purple-500 bg-purple-500/10';
      case 'Cancelled': return 'text-zinc-500 bg-zinc-500/10';
      case 'Pending': return 'text-amber-500 bg-amber-500/10';
    }
  };

  const handleShareTask = (task: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const assignee = allUsers.find(u => u.uid === task.assigneeId);
    
    if (!assignee || !assignee.phone) {
      setShareError(lang === 'ar' ? 'لا يوجد رقم هاتف مسجل لهذا الموظف' : 'No phone number registered for this employee');
      setTimeout(() => setShareError(null), 3000);
      return;
    }

    const priorityText = t[task.priority.toLowerCase() as keyof typeof t] || task.priority;
    const deadlineText = new Date(task.deadline).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
    
    const text = lang === 'ar' 
      ? `*مهمة: ${task.title}*\n\n${task.description}\n\nالأولوية: ${priorityText}\nالموعد النهائي: ${deadlineText}`
      : `*Task: ${task.title}*\n\n${task.description}\n\nPriority: ${priorityText}\nDeadline: ${deadlineText}`;
      
    const encodedText = encodeURIComponent(text);
    const phone = assignee.phone.replace(/[^0-9+]/g, '');
    const url = `https://wa.me/${phone}?text=${encodedText}`;
    
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {shareError && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-[200] bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2"
          >
            <AlertCircle size={20} />
            <span className="font-medium text-sm">{shareError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder={lang === 'ar' ? 'البحث عن المهام...' : 'Search tasks...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-800/10 dark:border-zinc-100/10 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-800/10 dark:border-zinc-100/10 outline-none text-zinc-900 dark:text-white [&>option]:text-zinc-900 [&>option]:bg-white dark:[&>option]:text-white dark:[&>option]:bg-zinc-800"
          >
            <option value="All">{lang === 'ar' ? 'الكل' : 'All'}</option>
            {['Pending', 'In Progress', 'Pending Review', 'Delayed', 'Completed', 'Cancelled'].map(s => (
              <option key={s} value={s}>{t[s.charAt(0).toLowerCase() + s.slice(1).replace(' ', '') as keyof typeof t] || s}</option>
            ))}
          </select>
          
          {user.role !== 'Worker' && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Plus size={20} />
              <span>{t.createTask}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-800/20">
            {t.noTasks}
          </div>
        ) : (
          filteredTasks.map((task, i) => (
            <motion.div
              key={task.id}
              whileHover={{ scale: 1.01 }}
              className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
              onClick={() => setSelectedTask(task)}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={cn("w-2 h-12 rounded-full shrink-0", getPriorityColor(task.priority).split(' ')[1])} />
                <div className="min-w-0 flex flex-col gap-1 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm truncate max-w-[200px]">{task.title}</h3>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", getStatusColor(task.status))}>
                      {t[task.status.charAt(0).toLowerCase() + task.status.slice(1).replace(' ', '') as keyof typeof t] || task.status}
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", getPriorityColor(task.priority))}>
                      {t[task.priority.toLowerCase() as keyof typeof t] || task.priority}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-[10px] truncate">{task.description}</p>
                  
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500 mt-0.5 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/50 px-1.5 py-0.5 rounded-md border border-zinc-100 dark:border-zinc-800">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-[8px]">
                        {allUsers.find(u => u.uid === task.assigneeId)?.displayName?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <span className="truncate max-w-[80px] font-medium text-zinc-700 dark:text-zinc-300">
                        {allUsers.find(u => u.uid === task.assigneeId)?.displayName || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={10} />
                      <span>{new Date(task.deadline).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{task.estimatedTime} {lang === 'ar' ? 'ساعة' : 'hrs'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">{editingTaskId ? t.editTask : t.createTask}</h3>
                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveTask} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-500">{t.title}</label>
                  <input 
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-500">{t.description}</label>
                  <textarea 
                    rows={4}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-500">{t.assignee}</label>
                    <select 
                      required
                      value={newAssignee}
                      onChange={(e) => setNewAssignee(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white [&>option]:text-zinc-900 [&>option]:bg-white dark:[&>option]:text-white dark:[&>option]:bg-zinc-800"
                    >
                      <option value="">{lang === 'ar' ? 'اختر الموظف' : 'Select Employee'}</option>
                      {subordinates.map(s => (
                        <option key={s.uid} value={s.uid}>{s.displayName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-500">{t.priority}</label>
                    <select 
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white [&>option]:text-zinc-900 [&>option]:bg-white dark:[&>option]:text-white dark:[&>option]:bg-zinc-800"
                    >
                      {['Low', 'Medium', 'High', 'Urgent'].map(p => (
                        <option key={p} value={p}>{t[p.toLowerCase() as keyof typeof t] || p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-500">{t.deadline}</label>
                    <input 
                      type="date"
                      required
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-500">{t.estimatedTime}</label>
                    <input 
                      type="number"
                      value={newEstimatedTime}
                      onChange={(e) => setNewEstimatedTime(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20"
                  >
                    {editingTaskId ? t.update : t.save}
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setIsModalOpen(false); resetForm(); }}
                    className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                  >
                    {t.cancel}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Task Details Modal (Simplified) */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">{selectedTask.title}</h3>
                <div className="flex items-center gap-2">
                  {(user.role === 'Admin' || user.role === 'Warehouse Manager' || user.role === 'Department Head' || user.role === 'Supervisor') && (
                    <>
                      <button 
                        onClick={(e) => handleSendReminder(selectedTask.id, e)}
                        title={lang === 'ar' ? 'تنبيه استعجال' : 'Urgent Reminder'}
                        className="p-2 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-full transition-colors"
                      >
                        <Bell size={20} />
                      </button>
                      <button 
                        onClick={(e) => {
                          updateTaskStatus(selectedTask.id, 'Cancelled');
                          setSelectedTask({...selectedTask, status: 'Cancelled'});
                        }}
                        title={lang === 'ar' ? 'إلغاء المهمة' : 'Cancel Task'}
                        className="p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full transition-colors"
                      >
                        <XCircle size={20} />
                      </button>
                      <button 
                        onClick={(e) => {
                          setSelectedTask(null);
                          openEditModal(selectedTask, e);
                        }}
                        title={t.editTask}
                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full transition-colors"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button 
                        onClick={(e) => {
                          handleDeleteTask(selectedTask.id, e);
                          setSelectedTask(null);
                        }}
                        title={lang === 'ar' ? 'حذف المهمة' : 'Delete Task'}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </>
                  )}
                  <button 
                    onClick={(e) => handleShareTask(selectedTask, e)}
                    title={t.shareTask}
                    className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full transition-colors"
                  >
                    <Share2 size={20} />
                  </button>
                  <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">{t.description}</h5>
                  <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">{selectedTask.description}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: t.status, value: selectedTask.status, color: getStatusColor(selectedTask.status) },
                    { label: t.priority, value: selectedTask.priority, color: getPriorityColor(selectedTask.priority) },
                    { label: t.deadline, value: new Date(selectedTask.deadline).toLocaleDateString(), color: 'text-zinc-500 bg-zinc-500/10' }
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-transparent">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">{item.label}</p>
                      <p className={cn("text-xs font-bold px-2 py-1 rounded-full inline-block", item.color)}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{t.progress}</h5>
                    <span className="text-sm font-bold text-emerald-500">{selectedTask.progress}%</span>
                  </div>
                  {selectedTask.assigneeId === user.uid ? (
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={selectedTask.progress ?? 0}
                      onChange={(e) => updateTaskProgress(selectedTask.id, parseInt(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  ) : (
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedTask.progress}%` }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                  )}
                </div>

                {/* Subtasks */}
                <div className="space-y-4">
                  <h5 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{t.subtasks}</h5>
                  <div className="space-y-2">
                    {subtasks.filter(st => st.taskId === selectedTask.id).map(st => (
                      <div key={st.id} className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-transparent">
                        <input 
                          type="checkbox" 
                          checked={st.isCompleted}
                          onChange={() => toggleSubtask(st.id, st.isCompleted)}
                          className="w-5 h-5 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className={cn("text-sm", st.isCompleted && "line-through text-zinc-600 dark:text-zinc-500")}>{st.title}</span>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder={lang === 'ar' ? 'إضافة مهمة فرعية...' : 'Add subtask...'}
                        className="flex-1 px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addSubtask(selectedTask.id, (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Update Status (for assignee) */}
                {selectedTask.assigneeId === user.uid && selectedTask.status !== 'Completed' && (
                  <div className="space-y-4">
                    <h5 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{lang === 'ar' ? 'تحديث الحالة' : 'Update Status'}</h5>
                    <div className="flex flex-wrap gap-2">
                      {['Pending', 'In Progress', 'Delayed'].map(s => (
                        <button
                          key={s}
                          onClick={() => updateTaskStatus(selectedTask.id, s as TaskStatus)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                            selectedTask.status === s ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200"
                          )}
                        >
                          {t[s.charAt(0).toLowerCase() + s.slice(1).replace(' ', '') as keyof typeof t] || s}
                        </button>
                      ))}
                      
                      {selectedTask.status !== 'Pending Review' && (
                        <button
                          onClick={() => setIsSubmittingReview(true)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                          )}
                        >
                          {t.submitForReview}
                        </button>
                      )}
                    </div>

                    {isSubmittingReview && (
                      <div className="mt-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-3">
                        <label className="text-sm font-semibold">{t.completionNotes}</label>
                        <textarea
                          value={completionNotes}
                          onChange={(e) => setCompletionNotes(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none text-sm min-h-[80px]"
                          placeholder={lang === 'ar' ? 'أضف ملاحظاتك حول إنجاز المهمة...' : 'Add your completion notes...'}
                        />
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => setIsSubmittingReview(false)}
                            className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          >   
                            {t.cancel}
                          </button>
                          <button 
                            onClick={() => handleSubmitForReview(selectedTask.id)}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 text-white hover:bg-blue-600"
                          >
                            {t.submitForReview}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Manager Review Section */}
                {(selectedTask.managerId === user.uid || user.role === 'Admin' || user.role === 'Warehouse Manager') && selectedTask.status === 'Pending Review' && (
                  <div className="space-y-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30">
                    <h5 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{t.rateTask}</h5>
                    
                    {selectedTask.completionNotes && (
                      <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <p className="text-xs text-zinc-500 mb-1">{t.completionNotes}:</p>
                        <p className="text-sm">{selectedTask.completionNotes}</p>
                      </div>
                    )}

                    {!isReviewing ? (
                      <button
                        onClick={() => setIsReviewing(true)}
                        className="w-full px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                      >
                        {t.confirmCompletion}
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold block mb-2">{t.managerRating}</label>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                onClick={() => setManagerRating(star)}
                                className={cn(
                                  "p-2 rounded-lg transition-all text-xl",
                                  managerRating >= star ? "text-yellow-500 bg-yellow-500/10" : "text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                )}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-semibold block mb-2">{t.managerFeedback}</label>
                          <textarea
                            value={managerFeedback}
                            onChange={(e) => setManagerFeedback(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none text-sm min-h-[80px]"
                            placeholder={lang === 'ar' ? 'أضف ملاحظاتك وتقييمك للموظف...' : 'Add your feedback for the employee...'}
                          />
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => setIsReviewing(false)}
                            className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          >   
                            {t.cancel}
                          </button>
                          <button 
                            onClick={() => handleConfirmCompletion(selectedTask.id)}
                            disabled={managerRating === 0}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                          >
                            {t.confirmCompletion}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Completed Task Info */}
                {selectedTask.status === 'Completed' && (
                  <div className="space-y-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                      <CheckCircle2 size={20} />
                      <h5 className="font-bold">{t.completed}</h5>
                    </div>
                    
                    {selectedTask.completionNotes && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">{t.completionNotes}:</p>
                        <p className="text-sm bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">{selectedTask.completionNotes}</p>
                      </div>
                    )}

                    {selectedTask.managerRating && (
                      <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-800/50">
                        <p className="text-xs text-zinc-500 mb-1">{t.managerRating}:</p>
                        <div className="flex gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} className={cn("text-xl", star <= selectedTask.managerRating! ? "text-yellow-500" : "text-zinc-300 dark:text-zinc-700")}>
                              ★
                            </span>
                          ))}
                        </div>
                        {selectedTask.managerFeedback && (
                          <>
                            <p className="text-xs text-zinc-500 mb-1">{t.managerFeedback}:</p>
                            <p className="text-sm bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">{selectedTask.managerFeedback}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
