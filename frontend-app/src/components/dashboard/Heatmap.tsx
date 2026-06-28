import React, { useState, useMemo } from 'react';

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  completed: number;
  total: number;
}

interface HeatmapProps {
  data: HeatmapDay[]; // Array of past logs
  viewMode: 'weekly' | 'monthly' | 'yearly';
}

export const Heatmap: React.FC<HeatmapProps> = ({ data, viewMode }) => {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

  // Group data by date for quick O(1) lookup
  const dataMap = useMemo(() => {
    const map = new Map<string, HeatmapDay>();
    data.forEach(d => map.set(d.date, d));
    return map;
  }, [data]);

  // Generate grid days depending on viewMode
  const gridDays = useMemo(() => {
    const days: Date[] = [];
    const now = new Date();
    let daysToGenerate = 365; // default yearly

    if (viewMode === 'weekly') {
      daysToGenerate = 7 * 4; // 4 weeks
    } else if (viewMode === 'monthly') {
      daysToGenerate = 30; // 1 month
    }

    // Set starting point to past N days
    const startDate = new Date();
    startDate.setDate(now.getDate() - daysToGenerate + 1);

    for (let i = 0; i < daysToGenerate; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  }, [viewMode]);

  // Helper to determine tailwind classes based on completion rates
  const getCellStyles = (dayData: HeatmapDay | undefined) => {
    if (!dayData || dayData.total === 0) {
      return 'bg-zinc-800 border-zinc-700/50 hover:bg-zinc-700'; // No missions today
    }
    const ratio = dayData.completed / dayData.total;
    if (ratio === 1) {
      return 'bg-emerald-500 shadow-lg shadow-emerald-500/20 border-emerald-400/30 hover:scale-110';
    } else if (ratio >= 0.7) {
      return 'bg-emerald-600/80 border-emerald-500/20 hover:scale-110';
    } else if (ratio >= 0.4) {
      return 'bg-emerald-700/50 border-emerald-600/20 hover:scale-110';
    } else if (ratio > 0) {
      return 'bg-amber-600/50 border-amber-500/20 hover:scale-110';
    } else {
      return 'bg-rose-500/80 shadow-lg shadow-rose-500/10 border-rose-400/30 hover:scale-110'; // Missed all missions
    }
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="relative p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-wide">Consistency Heatmap</h3>
          <p className="text-xs text-zinc-400">Green represents completed streaks, Red indicates missed goals</p>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-zinc-800 border border-zinc-700" />
            <span className="text-zinc-400">Rest</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-rose-500/80 border border-rose-400/30" />
            <span className="text-zinc-400">Missed</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-700/50 border border-emerald-600/20" />
            <span className="text-zinc-400">Partial</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500 border border-emerald-400/30" />
            <span className="text-zinc-400">100%</span>
          </div>
        </div>
      </div>

      {/* Grid calendar */}
      <div className="flex flex-wrap gap-1.5 justify-start md:justify-center overflow-visible py-2">
        {gridDays.map((date, idx) => {
          const dateStr = date.toISOString().split('T')[0];
          const dayData = dataMap.get(dateStr);
          const cellStyle = getCellStyles(dayData);

          return (
            <div
              key={idx}
              className={`w-4 h-4 rounded-sm border cursor-pointer transition-all duration-200 ${cellStyle}`}
              onMouseEnter={() => {
                if (dayData) {
                  setHoveredDay(dayData);
                } else {
                  setHoveredDay({ date: dateStr, completed: 0, total: 0 });
                }
              }}
              onMouseLeave={() => setHoveredDay(null)}
            />
          );
        })}
      </div>

      {/* Floating Tooltip */}
      {hoveredDay && (
        <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-3 bg-zinc-950/95 border border-white/15 px-3 py-2 rounded-lg backdrop-blur-md shadow-2xl text-left pointer-events-none transition-opacity duration-150">
          <p className="text-xs font-semibold text-zinc-300 mb-0.5">
            {formatDateLabel(hoveredDay.date)}
          </p>
          {hoveredDay.total > 0 ? (
            <div className="flex items-center space-x-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${hoveredDay.completed === hoveredDay.total ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <p className="text-xs text-white">
                {hoveredDay.completed}/{hoveredDay.total} Missions ({Math.round((hoveredDay.completed / hoveredDay.total) * 100)}%)
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Rest Day (No active missions)</p>
          )}
        </div>
      )}
    </div>
  );
};
