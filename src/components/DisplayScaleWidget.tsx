import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Monitor, 
  Layout, 
  Check, 
  Sliders, 
  X,
  Sparkles
} from 'lucide-react';
import { useDisplay, LayoutWidthMode } from '../contexts/DisplayContext';

interface DisplayScaleWidgetProps {
  isRtl: boolean;
  inline?: boolean;
}

export default function DisplayScaleWidget({ isRtl, inline = false }: DisplayScaleWidgetProps) {
  const { zoomLevel, widthMode, setZoomLevel, zoomIn, zoomOut, resetZoom, setWidthMode } = useDisplay();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const zoomPresets = [75, 85, 90, 95, 100, 105, 110, 120, 125, 140];

  const widthOptions: { id: LayoutWidthMode; titleAr: string; titleEn: string; descAr: string; descEn: string; width: string }[] = [
    { 
      id: 'full', 
      titleAr: 'عرض كامل للشاشة (100%)', 
      titleEn: 'Full Screen Width (100%)', 
      descAr: 'استغلال أقصى مساحة للشاشة (ممتاز للجداول الكبيرة والتقارير)', 
      descEn: 'Maximize full screen estate for wide tables & reports',
      width: '100%'
    },
    { 
      id: 'ultra', 
      titleAr: 'عرض فائق (1850px)', 
      titleEn: 'Ultra Wide (1850px)', 
      descAr: 'مساحة عريضة جداً ومريحة للشاشات الكبيرة', 
      descEn: 'Very wide and comfortable for large monitors',
      width: '1850px'
    },
    { 
      id: 'standard', 
      titleAr: 'عرض قياسي (1440px)', 
      titleEn: 'Standard Width (1440px)', 
      descAr: 'المقاس الكلاسيكي المتوازن للعمل اليومي', 
      descEn: 'Balanced classic size for daily work',
      width: '1440px'
    },
    { 
      id: 'compact', 
      titleAr: 'عرض مدمج ومركزي (1100px)', 
      titleEn: 'Compact Boxed (1100px)', 
      descAr: 'تركيز المحتوى في المنتصف لقراءة مريحة', 
      descEn: 'Centered boxed content for easy reading',
      width: '1100px'
    }
  ];

  if (inline) {
    // Render as a full inline card section (for Settings page)
    return (
      <div className="space-y-6 text-right" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Zoom Controls Card */}
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <ZoomIn size={16} />
              </div>
              <div>
                <h4 className="font-black text-sm text-zinc-900 dark:text-white">
                  {isRtl ? 'نسبة تكبير وتصغير التطبيق (Zoom Scale)' : 'App Zoom Scale'}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {isRtl ? 'التحكم في حجم النصوص والعناصر لكامل شاشات التطبيق' : 'Control font and elements size across all views'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-sm font-black shadow-xs">
                {zoomLevel}%
              </span>
              {zoomLevel !== 100 && (
                <button
                  onClick={resetZoom}
                  className="px-2.5 py-1 text-xs font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  title={isRtl ? 'استعادة 100%' : 'Reset 100%'}
                >
                  <RotateCcw size={12} />
                  <span>100%</span>
                </button>
              )}
            </div>
          </div>

          {/* Slider & Quick +/- */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={zoomOut}
              disabled={zoomLevel <= 60}
              className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer shadow-2xs transition-all active:scale-95"
              title={isRtl ? 'تصغير (-5%)' : 'Zoom Out (-5%)'}
            >
              <ZoomOut size={16} />
            </button>

            <input 
              type="range"
              min={60}
              max={150}
              step={5}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="flex-1 accent-emerald-500 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
            />

            <button
              onClick={zoomIn}
              disabled={zoomLevel >= 150}
              className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer shadow-2xs transition-all active:scale-95"
              title={isRtl ? 'تكبير (+5%)' : 'Zoom In (+5%)'}
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-bold text-zinc-400 ml-2">
              {isRtl ? 'نسب سريعة:' : 'Presets:'}
            </span>
            {zoomPresets.map(preset => (
              <button
                key={preset}
                onClick={() => setZoomLevel(preset)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  zoomLevel === preset
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>

        {/* Layout Width Options */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Layout size={16} />
            </div>
            <div>
              <h4 className="font-black text-sm text-zinc-900 dark:text-white">
                {isRtl ? 'أبعاد ومساحة عرض الصفحة (Page Max Width)' : 'Page Max Width & Layout Dimensions'}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isRtl ? 'اختر مساحة العرض المناسبة لحجم شاشتك' : 'Select optimal display container width for your screen'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {widthOptions.map(opt => {
              const isSelected = widthMode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setWidthMode(opt.id)}
                  className={`p-4 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20 shadow-md'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      {opt.width}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-black ${
                      isSelected ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {isSelected ? (isRtl ? 'محدد' : 'Active') : (isRtl ? 'اختيار' : 'Select')}
                    </span>
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-zinc-900 dark:text-white">
                      {isRtl ? opt.titleAr : opt.titleEn}
                    </h5>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      {isRtl ? opt.descAr : opt.descEn}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Top Bar Dropdown Trigger
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Top Bar Quick Trigger Button */}
      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/80 rounded-xl p-0.5 shadow-2xs">
        <button
          onClick={zoomOut}
          disabled={zoomLevel <= 60}
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300 disabled:opacity-30 cursor-pointer transition-colors"
          title={isRtl ? 'تصغير (-5%)' : 'Zoom Out (-5%)'}
        >
          <ZoomOut size={13} />
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-1 flex items-center gap-1 text-xs font-black text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 rounded-lg cursor-pointer transition-all select-none"
          title={isRtl ? 'تغيير أبعاد وتكبير الشاشة' : 'Display Dimensions & Zoom'}
        >
          <Maximize2 size={12} className="text-emerald-500" />
          <span className="font-mono text-[11px]">{zoomLevel}%</span>
        </button>

        <button
          onClick={zoomIn}
          disabled={zoomLevel >= 150}
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300 disabled:opacity-30 cursor-pointer transition-colors"
          title={isRtl ? 'تكبير (+5%)' : 'Zoom In (+5%)'}
        >
          <ZoomIn size={13} />
        </button>
      </div>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div 
          className="absolute top-full mt-2 right-0 sm:right-auto sm:left-0 z-[9999] w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-right"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-emerald-500" />
              <span className="font-black text-xs text-zinc-900 dark:text-white">
                {isRtl ? 'أبعاد ومساحة عرض التطبيق' : 'Display Dimensions & Zoom'}
              </span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Zoom Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-600 dark:text-zinc-300">
                {isRtl ? 'نسبة التكبير (Zoom):' : 'Zoom Scale:'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 text-[11px]">
                  {zoomLevel}%
                </span>
                {zoomLevel !== 100 && (
                  <button
                    onClick={resetZoom}
                    className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline cursor-pointer"
                  >
                    {isRtl ? 'استعادة' : 'Reset'}
                  </button>
                )}
              </div>
            </div>

            {/* Slider */}
            <div className="flex items-center gap-2">
              <button
                onClick={zoomOut}
                disabled={zoomLevel <= 60}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 cursor-pointer"
              >
                <ZoomOut size={13} />
              </button>
              <input 
                type="range"
                min={60}
                max={150}
                step={5}
                value={zoomLevel}
                onChange={(e) => setZoomLevel(Number(e.target.value))}
                className="flex-1 accent-emerald-500 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
              />
              <button
                onClick={zoomIn}
                disabled={zoomLevel >= 150}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 cursor-pointer"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            {/* Preset pills */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {[75, 85, 90, 100, 110, 120, 125, 140].map(preset => (
                <button
                  key={preset}
                  onClick={() => setZoomLevel(preset)}
                  className={`py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                    zoomLevel === preset
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>

          {/* Width Section */}
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span className="font-bold text-xs text-zinc-600 dark:text-zinc-300 block">
              {isRtl ? 'عرض ومساحة المحتوى:' : 'Content Width Mode:'}
            </span>

            <div className="grid grid-cols-2 gap-1.5">
              {widthOptions.map(opt => {
                const isSelected = widthMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setWidthMode(opt.id)}
                    className={`p-2 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-black">
                      <span>{opt.width}</span>
                      {isSelected && <Check size={12} className="text-emerald-500" />}
                    </div>
                    <span className="text-[10px] opacity-80 truncate block mt-0.5">
                      {isRtl ? opt.titleAr.split('(')[0] : opt.titleEn.split('(')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
