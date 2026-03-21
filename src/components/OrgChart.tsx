import React from 'react';
import { motion } from 'motion/react';
import { 
  ChevronRight, 
  ChevronDown, 
  User, 
  Mail, 
  Briefcase,
  Search
} from 'lucide-react';
import { translations } from '../i18n';
import { Language, UserProfile } from '../types';

interface OrgChartProps {
  lang: Language;
  users: UserProfile[];
}

interface TreeNodeProps {
  user: UserProfile;
  allUsers: UserProfile[];
  lang: Language;
  level: number;
  key?: string;
}

const TreeNode = ({ user, allUsers, lang, level }: TreeNodeProps) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const subordinates = allUsers.filter(u => u.managerId === user.uid);
  const hasSubordinates = subordinates.length > 0;
  const isRtl = lang === 'ar';

  return (
    <div className={cn("relative", level > 0 ? (isRtl ? "mr-8" : "ml-8") : "")}>
      {/* Connector Line */}
      {level > 0 && (
        <div className={cn(
          "absolute top-0 bottom-0 w-px bg-zinc-800/10 dark:border-zinc-100/10",
          isRtl ? "-right-4" : "-left-4"
        )} />
      )}
      
      <div className="flex items-center gap-4 py-3 group">
        {hasSubordinates ? (
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            {isOpen ? <ChevronDown size={16} /> : (isRtl ? <ChevronRight size={16} className="rotate-180" /> : <ChevronRight size={16} />)}
          </button>
        ) : (
          <div className="w-6" />
        )}

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-800/10 dark:border-zinc-100/10 shadow-sm min-w-[300px]"
        >
          <img 
            src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} 
            alt={user.displayName}
            className="w-12 h-12 rounded-full border-2 border-emerald-500"
            referrerPolicy="no-referrer"
          />
          <div>
            <h4 className="text-sm font-bold">{user.displayName}</h4>
            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
              <Briefcase size={12} />
              <span>{translations[lang][user.role.charAt(0).toLowerCase() + user.role.slice(1).replace(' ', '') as keyof typeof translations['en']] || user.role}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {hasSubordinates && isOpen && (
        <div className="space-y-1">
          {subordinates.map(sub => (
            <TreeNode key={sub.uid} user={sub} allUsers={allUsers} lang={lang} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function OrgChart({ lang, users }: OrgChartProps) {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = React.useState("");
  
  // Find top-level managers (those who don't have a managerId or their manager isn't in our list)
  const topLevelUsers = users.filter(u => !u.managerId || !users.find(m => m.uid === u.managerId));

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input 
          type="text" 
          placeholder={lang === 'ar' ? 'البحث عن موظف...' : 'Search employee...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-800/10 dark:border-zinc-100/10 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
        />
      </div>

      <div className="p-8 rounded-3xl bg-white dark:bg-zinc-950/50 border border-zinc-800/5 dark:border-zinc-100/5 overflow-x-auto min-h-[600px]">
        {searchQuery ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map(user => (
              <div key={user.uid} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-800/10 dark:border-zinc-100/10 shadow-sm">
                <img 
                  src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} 
                  alt={user.displayName}
                  className="w-12 h-12 rounded-full border-2 border-emerald-500"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-sm font-bold">{user.displayName}</h4>
                  <p className="text-xs text-zinc-500">{user.role}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="inline-block min-w-full">
            {topLevelUsers.map(user => (
              <TreeNode key={user.uid} user={user} allUsers={users} lang={lang} level={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
