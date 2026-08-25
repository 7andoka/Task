import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, X, ChevronDown, Clock, Check, Sparkles, Filter } from 'lucide-react';

export interface DateFilterValue {
  mode: 'all' | 'single' | 'range' | 'preset';
  presetKey?: string;
  singleDate?: string;
  startDate?: string;
  endDate?: string;
}

interface DateRangeFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  availableDates?: string[]; // Optional list of existing dates in dataset
  isRtl?: boolean;
  className?: string;
  hideLabel?: boolean;
  hideQuickChips?: boolean;
  compact?: boolean;
  buttonClassName?: string;
  placeholder?: string;
}

// Helpers to compute ISO dates (YYYY-MM-DD)
const toIsoString = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getPresetDates = (presetKey: string): { startDate?: string; endDate?: string; singleDate?: string } => {
  const now = new Date();
  
  switch (presetKey) {
    case 'today': {
      const todayIso = toIsoString(now);
      return { singleDate: todayIso, startDate: todayIso, endDate: todayIso };
    }
    case 'yesterday': {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestIso = toIsoString(yest);
      return { singleDate: yestIso, startDate: yestIso, endDate: yestIso };
    }
    case 'last7': {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { startDate: toIsoString(start), endDate: toIsoString(now) };
    }
    case 'last30': {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return { startDate: toIsoString(start), endDate: toIsoString(now) };
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: toIsoString(start), endDate: toIsoString(end) };
    }
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: toIsoString(start), endDate: toIsoString(end) };
    }
    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { startDate: toIsoString(start), endDate: toIsoString(end) };
    }
    default:
      return {};
  }
};

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  availableDates = [],
  isRtl = true,
  className = '',
  hideLabel = false,
  hideQuickChips = false,
  compact = false,
  buttonClassName = '',
  placeholder = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'range' | 'single'>(
    value.mode === 'range' ? 'range' : value.mode === 'single' ? 'single' : 'presets'
  );
  const [tempSingleDate, setTempSingleDate] = useState(value.singleDate || '');
  const [tempStartDate, setTempStartDate] = useState(value.startDate || '');
  const [tempEndDate, setTempEndDate] = useState(value.endDate || '');
  const [searchTerm, setSearchTerm] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal state when external value changes
  useEffect(() => {
    setTempSingleDate(value.singleDate || '');
    setTempStartDate(value.startDate || '');
    setTempEndDate(value.endDate || '');
    if (value.mode === 'range') setActiveTab('range');
    else if (value.mode === 'single') setActiveTab('single');
    else if (value.mode === 'preset') setActiveTab('presets');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const presets = [
    { key: 'today', labelAr: 'اليوم', labelEn: 'Today' },
    { key: 'yesterday', labelAr: 'أمس', labelEn: 'Yesterday' },
    { key: 'last7', labelAr: 'آخر 7 أيام', labelEn: 'Last 7 Days' },
    { key: 'last30', labelAr: 'آخر 30 يوم', labelEn: 'Last 30 Days' },
    { key: 'thisMonth', labelAr: 'هذا الشهر', labelEn: 'This Month' },
    { key: 'lastMonth', labelAr: 'الشهر السابق', labelEn: 'Last Month' },
    { key: 'thisYear', labelAr: 'هذا العام', labelEn: 'This Year' },
  ];

  const handleApplyPreset = (presetKey: string) => {
    const { startDate, endDate, singleDate } = getPresetDates(presetKey);
    onChange({
      mode: 'preset',
      presetKey,
      startDate,
      endDate,
      singleDate
    });
    setIsOpen(false);
  };

  const handleApplySingleDate = (date: string) => {
    if (!date) return;
    onChange({
      mode: 'single',
      singleDate: date,
      startDate: date,
      endDate: date
    });
    setIsOpen(false);
  };

  const handleApplyRange = () => {
    if (!tempStartDate && !tempEndDate) {
      handleClear();
      return;
    }
    onChange({
      mode: 'range',
      startDate: tempStartDate,
      endDate: tempEndDate,
      singleDate: tempStartDate === tempEndDate ? tempStartDate : undefined
    });
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTempSingleDate('');
    setTempStartDate('');
    setTempEndDate('');
    onChange({
      mode: 'all'
    });
    setIsOpen(false);
  };

  // Human readable label for trigger
  const getDisplayText = () => {
    if (value.mode === 'preset' && value.presetKey) {
      const match = presets.find(p => p.key === value.presetKey);
      if (match) return isRtl ? match.labelAr : match.labelEn;
    }
    if (value.mode === 'single' && value.singleDate) {
      return `${isRtl ? 'يوم:' : 'Date:'} ${value.singleDate}`;
    }
    if (value.mode === 'range') {
      if (value.startDate && value.endDate) {
        if (value.startDate === value.endDate) {
          return `${isRtl ? 'يوم:' : 'Date:'} ${value.startDate}`;
        }
        return `${value.startDate}  ←  ${value.endDate}`;
      }
      if (value.startDate) return `${isRtl ? 'من:' : 'From:'} ${value.startDate}`;
      if (value.endDate) return `${isRtl ? 'إلى:' : 'To:'} ${value.endDate}`;
    }
    if (value.startDate || value.endDate || value.singleDate) {
      return value.singleDate || `${value.startDate || '...'} → ${value.endDate || '...'}`;
    }
    if (placeholder) return placeholder;
    return isRtl ? 'تصفية بالتاريخ / الفترة' : 'Filter Date / Period';
  };

  const isFiltered = value.mode !== 'all' && (value.startDate || value.endDate || value.singleDate || value.presetKey);

  // Filter available dates by search term
  const filteredAvailableDates = availableDates.filter(d => 
    !searchTerm.trim() || d.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div ref={containerRef} className={`relative inline-block text-right ${className}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Label and Main Trigger */}
      <div className={hideLabel ? '' : 'space-y-1.5'}>
        {!hideLabel && (
          <div className="flex items-center justify-between gap-1.5">
            <label className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <CalendarIcon size={14} className="text-emerald-500" />
              <span>{isRtl ? 'تصفية بالتاريخ / الفترة' : 'Filter Date / Period'}</span>
            </label>
            {isFiltered && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] text-red-500 hover:text-red-600 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <X size={12} />
                <span>{isRtl ? 'مسح الفلتر' : 'Clear'}</span>
              </button>
            )}
          </div>
        )}

        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 border rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer select-none whitespace-nowrap ${
            isFiltered
              ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/20 bg-emerald-500/10'
              : 'border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-800/30 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          } ${buttonClassName}`}
        >
          <div className="flex items-center gap-2 truncate">
            <CalendarIcon size={14} className={isFiltered ? 'text-emerald-500' : 'text-zinc-400'} />
            <span className="truncate">{getDisplayText()}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0 text-zinc-400">
            {isFiltered && (
              <span 
                onClick={handleClear}
                className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-red-500 transition-colors"
                title={isRtl ? 'إلغاء الفلتر' : 'Clear filter'}
              >
                <X size={13} />
              </span>
            )}
            <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>

      {/* Quick Chips Bar below trigger */}
      {!hideQuickChips && (
        <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto scrollbar-none pb-0.5 max-w-full">
          <button
            type="button"
            onClick={() => onChange({ mode: 'all' })}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
              !isFiltered
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {isRtl ? 'الكل' : 'All'}
          </button>
          {presets.slice(0, 4).map(p => {
            const isActive = value.mode === 'preset' && value.presetKey === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => handleApplyPreset(p.key)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {isRtl ? p.labelAr : p.labelEn}
              </button>
            );
          })}
        </div>
      )}

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-2 right-0 left-auto w-[330px] sm:w-[380px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 text-right animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
          {/* Tabs header */}
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800/70 rounded-xl mb-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'presets'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-extrabold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Clock size={13} />
              <span>{isRtl ? 'فترات جاهزة' : 'Presets'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('range')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'range'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-extrabold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <CalendarIcon size={13} />
              <span>{isRtl ? 'فترة (من / إلى)' : 'Range (From/To)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'single'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-extrabold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Sparkles size={13} />
              <span>{isRtl ? 'يوم محدد' : 'Specific Day'}</span>
            </button>
          </div>

          {/* TAB 1: Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {presets.map(p => {
                  const isActive = value.mode === 'preset' && value.presetKey === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleApplyPreset(p.key)}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-right flex items-center justify-between transition-all cursor-pointer ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 text-zinc-700 dark:text-zinc-200'
                      }`}
                    >
                      <span>{isRtl ? p.labelAr : p.labelEn}</span>
                      {isActive && <Check size={14} className="text-emerald-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Date Range (من / إلى) */}
          {activeTab === 'range' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">
                    {isRtl ? 'من تاريخ:' : 'From Date:'}
                  </label>
                  <input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">
                    {isRtl ? 'إلى تاريخ:' : 'To Date:'}
                  </label>
                  <input
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApplyRange}
                  disabled={!tempStartDate && !tempEndDate}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{isRtl ? 'تطبيق الفترة المحددة' : 'Apply Range'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempStartDate('');
                    setTempEndDate('');
                  }}
                  className="py-2 px-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {isRtl ? 'إفراغ' : 'Reset'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Specific Single Date */}
          {activeTab === 'single' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">
                  {isRtl ? 'اختر يوماً من التقويم:' : 'Pick date from calendar:'}
                </label>
                <input
                  type="date"
                  value={tempSingleDate}
                  onChange={(e) => {
                    setTempSingleDate(e.target.value);
                    if (e.target.value) handleApplySingleDate(e.target.value);
                  }}
                  className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                />
              </div>

              {availableDates.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                    <span>{isRtl ? 'أو اختر من التواريخ المسجلة:' : 'Or pick from recorded dates:'}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">({filteredAvailableDates.length})</span>
                  </div>

                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={isRtl ? 'بحث في التواريخ...' : 'Search date...'}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-1"
                  />

                  <div className="max-h-36 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 p-1 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                    {filteredAvailableDates.slice(0, 50).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleApplySingleDate(d)}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono text-right flex items-center justify-between transition-colors cursor-pointer ${
                          value.singleDate === d
                            ? 'bg-emerald-500 text-white font-black'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <span>{d}</span>
                        {value.singleDate === d && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer with Reset All button */}
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 font-bold transition-colors cursor-pointer"
            >
              {isRtl ? 'عرض كل التواريخ (إلغاء التصفية)' : 'Show All Dates (Reset)'}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer"
            >
              {isRtl ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default DateRangeFilter;
