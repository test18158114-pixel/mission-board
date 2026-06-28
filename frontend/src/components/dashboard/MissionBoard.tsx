import React, { useState, useEffect, useRef } from 'react';
import { Heatmap, HeatmapDay } from './Heatmap';

// ==========================================
// MOCK DATA AND TYPES FOR RENDER
// ==========================================
interface Mission {
  id: string;
  title: string;
  type: 'checkbox' | 'numeric' | 'timer' | 'workout';
  category: string;
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  isPinned: boolean;
  colorLabel: string;
  icon: string;
  dueTime?: string;
  progress: {
    current: number;
    target: number;
    unit: string;
  };
  timer?: {
    duration: number; // in seconds
    elapsed: number;
    isRunning: boolean;
  };
}

interface FriendActivity {
  id: string;
  friendName: string;
  avatar: string;
  action: string;
  reactionCount: number;
  hasReacted: boolean;
}

interface LeaderboardUser {
  rank: number;
  name: string;
  avatar: string;
  completionRate: number;
  streak: number;
  totalXP: number;
}

export const MissionBoard: React.FC = () => {
  // 1. DASHBOARD STATES
  const [missions, setMissions] = useState<Mission[]>([
    {
      id: 'm1',
      title: 'Chest Workout (Push Day)',
      type: 'workout',
      category: 'workout',
      priority: 'high',
      isCompleted: true,
      isPinned: true,
      colorLabel: 'from-violet-500 to-purple-600',
      icon: '💪',
      progress: { current: 1, target: 1, unit: 'session' }
    },
    {
      id: 'm2',
      title: 'Hydrate Consistently',
      type: 'numeric',
      category: 'water',
      priority: 'medium',
      isCompleted: false,
      isPinned: true,
      colorLabel: 'from-cyan-500 to-blue-600',
      icon: '💧',
      progress: { current: 2.8, target: 4.0, unit: 'L' }
    },
    {
      id: 'm3',
      title: 'Stretching & Mobility',
      type: 'timer',
      category: 'mobility',
      priority: 'low',
      isCompleted: false,
      isPinned: false,
      colorLabel: 'from-emerald-500 to-teal-600',
      icon: '🧘',
      progress: { current: 0, target: 1, unit: 'session' },
      timer: { duration: 900, elapsed: 320, isRunning: false }
    },
    {
      id: 'm4',
      title: 'Eat 180g Protein',
      type: 'numeric',
      category: 'nutrition',
      priority: 'high',
      isCompleted: false,
      isPinned: false,
      colorLabel: 'from-orange-500 to-red-600',
      icon: '🥩',
      progress: { current: 145, target: 180, unit: 'g' }
    },
    {
      id: 'm5',
      title: 'Take Creatine Monohydrate',
      type: 'checkbox',
      category: 'supplements',
      priority: 'medium',
      isCompleted: true,
      isPinned: false,
      colorLabel: 'from-pink-500 to-rose-600',
      icon: '💊',
      progress: { current: 1, target: 1, unit: 'check' }
    }
  ]);

  const [feed, setFeed] = useState<FriendActivity[]>([
    { id: 'f1', friendName: 'Rohan Sharma', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100', action: 'completed Chest Workout 🔥', reactionCount: 8, hasReacted: true },
    { id: 'f2', friendName: 'Aman Verma', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100', action: 'completed Water Goal 💧 (4.0L/4.0L)', reactionCount: 3, hasReacted: false },
    { id: 'f3', friendName: 'Vivek Gupta', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', action: 'completed Sleep Goal 😴 (8 Hours)', reactionCount: 12, hasReacted: false }
  ]);

  const leaderboard: LeaderboardUser[] = [
    { rank: 1, name: 'Rahul Roy', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', completionRate: 98, streak: 14, totalXP: 3820 },
    { rank: 2, name: 'You', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', completionRate: 78, streak: 7, totalXP: 2480 },
    { rank: 3, name: 'Aman Verma', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100', completionRate: 72, streak: 5, totalXP: 1980 }
  ];

  const heatmapData: HeatmapDay[] = [
    { date: '2026-06-22', completed: 4, total: 5 },
    { date: '2026-06-23', completed: 5, total: 5 },
    { date: '2026-06-24', completed: 3, total: 5 },
    { date: '2026-06-25', completed: 0, total: 4 }, // Missed day
    { date: '2026-06-26', completed: 5, total: 5 },
    { date: '2026-06-27', completed: 4, total: 5 },
    { date: '2026-06-28', completed: 2, total: 5 } // Today
  ];

  // 2. TIMERS MANAGEMENT
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Tick active timers
    timerIntervalRef.current = setInterval(() => {
      setMissions(prevMissions => 
        prevMissions.map(m => {
          if (m.type === 'timer' && m.timer?.isRunning && m.timer.elapsed < m.timer.duration) {
            const nextElapsed = m.timer.elapsed + 1;
            const isFinished = nextElapsed >= m.timer.duration;
            return {
              ...m,
              isCompleted: isFinished ? true : m.isCompleted,
              timer: {
                ...m.timer,
                elapsed: nextElapsed,
                isRunning: !isFinished
              }
            };
          }
          return m;
        })
      );
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // 3. STATS CALCULATIONS
  const totalMissionsCount = missions.length;
  const completedMissionsCount = missions.filter(m => m.isCompleted).length;
  const pendingMissionsCount = totalMissionsCount - completedMissionsCount;
  const completionPercentage = totalMissionsCount > 0 ? Math.round((completedMissionsCount / totalMissionsCount) * 100) : 0;
  
  // Today's XP earned
  const todayXP = completedMissionsCount * 40; // simple mock calculation

  // 4. ACTION HANDLERS
  const handleToggleCheckbox = (id: string) => {
    setMissions(prev => prev.map(m => {
      if (m.id === id) {
        const nextCompleted = !m.isCompleted;
        return {
          ...m,
          isCompleted: nextCompleted,
          progress: { ...m.progress, current: nextCompleted ? m.progress.target : 0 }
        };
      }
      return m;
    }));
  };

  const handleAdjustNumeric = (id: string, delta: number) => {
    setMissions(prev => prev.map(m => {
      if (m.id === id && m.type === 'numeric') {
        const current = Math.max(0, parseFloat((m.progress.current + delta).toFixed(1)));
        const isCompleted = current >= m.progress.target;
        return {
          ...m,
          isCompleted,
          progress: { ...m.progress, current }
        };
      }
      return m;
    }));
  };

  const handleToggleTimer = (id: string) => {
    setMissions(prev => prev.map(m => {
      if (m.id === id && m.type === 'timer' && m.timer) {
        return {
          ...m,
          timer: { ...m.timer, isRunning: !m.timer.isRunning }
        };
      }
      return m;
    }));
  };

  const handlePinMission = (id: string) => {
    setMissions(prev => prev.map(m => m.id === id ? { ...m, isPinned: !m.isPinned } : m));
  };

  const handleReactToActivity = (id: string) => {
    setFeed(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          reactionCount: item.hasReacted ? item.reactionCount - 1 : item.reactionCount + 1,
          hasReacted: !item.hasReacted
        };
      }
      return item;
    }));
  };

  // Helper for timer text
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans overflow-x-hidden antialiased">
      {/* Background Neon Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-600/10 blur-[150px] pointer-events-none" />

      {/* Main Grid Wrapper */}
      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        
        {/* TOP NAVBAR */}
        <header className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-violet-500/20">
              M
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
                Mission Board
              </h1>
              <span className="text-xs text-zinc-400">Accountability System (PREMIUM)</span>
            </div>
          </div>
          
          {/* XP & Level Panel */}
          <div className="flex items-center space-x-3 bg-white/5 backdrop-blur-md px-4 py-2 border border-white/10 rounded-full">
            <span className="text-xs font-semibold text-zinc-400">Level 4</span>
            <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: '65%' }} />
            </div>
            <span className="text-xs font-bold text-violet-400">+{todayXP} XP Today</span>
          </div>
        </header>

        {/* HERO SECTION / KEY METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          
          {/* Progress Ring Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Today's Progress</span>
              <h3 className="text-3xl font-extrabold text-white mt-1">{completionPercentage}%</h3>
              <p className="text-xs text-zinc-400 mt-2">{completedMissionsCount} of {totalMissionsCount} completed</p>
            </div>
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-zinc-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-violet-500 transition-all duration-500 ease-out"
                  strokeDasharray={`${completionPercentage}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-zinc-300">
                🎯
              </div>
            </div>
          </div>

          {/* Active Streaks Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-2xl">
              🔥
            </div>
            <div>
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Overall Streak</span>
              <h3 className="text-3xl font-extrabold text-white mt-1">7 Days</h3>
              <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold">1 Streak Freeze Active</span>
            </div>
          </div>

          {/* Leaderboard Position Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl">
              🏆
            </div>
            <div>
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Leaderboard Rank</span>
              <h3 className="text-3xl font-extrabold text-white mt-1">#2</h3>
              <p className="text-xs text-zinc-400">Top 15% among friends</p>
            </div>
          </div>

          {/* Smart Notifications/Reminders Widget */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse mr-2" />
              Smart Reminders
            </span>
            <div className="mt-3 space-y-2">
              <div className="text-xs text-zinc-300 bg-white/5 p-2 rounded-xl border border-white/5">
                💧 "You still need <strong className="text-cyan-400">1.2L Water</strong> to hit goal."
              </div>
              <div className="text-xs text-zinc-300 bg-white/5 p-2 rounded-xl border border-white/5">
                🥩 "Need <strong className="text-orange-400">35g Protein</strong>. Try some Greek yogurt!"
              </div>
            </div>
          </div>

        </div>

        {/* THREE COLUMN GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SECTION (9 COLS ON LARGE SCREEN): MISSION LIST & ANALYTICS */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* ACTIVE MISSIONS */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Daily Missions</h2>
                  <p className="text-xs text-zinc-400">Maintain consistency to level up and earn XP rewards</p>
                </div>
                <button className="bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-violet-500/10">
                  + Add Custom Mission
                </button>
              </div>

              {/* Mission Items list */}
              <div className="space-y-4">
                {missions.map((mission) => {
                  const isCompleted = mission.isCompleted;
                  return (
                    <div 
                      key={mission.id} 
                      className={`relative overflow-hidden bg-zinc-900/60 border rounded-2xl p-4 transition-all duration-300 ${
                        isCompleted ? 'border-emerald-500/20 bg-emerald-950/5' : 'border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        
                        {/* Drag, Checkbox and Title */}
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          
                          {/* Drag & Reorder indicator */}
                          <div className="cursor-grab text-zinc-600 hover:text-zinc-400 select-none text-sm hidden md:block">
                            ⋮⋮
                          </div>

                          {/* Checkbox selector */}
                          {mission.type === 'checkbox' && (
                            <button
                              onClick={() => handleToggleCheckbox(mission.id)}
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                isCompleted 
                                  ? 'bg-emerald-500 border-emerald-400 text-white' 
                                  : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950'
                              }`}
                            >
                              {isCompleted && '✓'}
                            </button>
                          )}

                          {mission.type === 'workout' && (
                            <div className="relative">
                              <button
                                disabled
                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center bg-violet-600/10 border-violet-500/30 text-violet-400`}
                              >
                                {isCompleted ? '✓' : '🏋'}
                              </button>
                            </div>
                          )}

                          {mission.type === 'numeric' && (
                            <div className="relative">
                              <span className="text-xl">{mission.icon}</span>
                            </div>
                          )}

                          {mission.type === 'timer' && (
                            <div className="relative">
                              <span className="text-xl">{mission.icon}</span>
                            </div>
                          )}

                          {/* Title and details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className={`text-sm font-bold truncate ${isCompleted ? 'line-through text-zinc-500' : 'text-white'}`}>
                                {mission.title}
                              </h4>
                              {mission.isPinned && (
                                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-white/5 flex items-center">
                                  📌 Pinned
                                </span>
                              )}
                              <span className={`text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                                mission.priority === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                mission.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              }`}>
                                {mission.priority}
                              </span>
                            </div>
                            
                            {/* Mission Config / Type Specific Fields */}
                            {mission.type === 'numeric' && (
                              <div className="mt-2 flex items-center space-x-3">
                                <div className="flex-1 max-w-[200px] h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                                    style={{ width: `${Math.min(100, (mission.progress.current / mission.progress.target) * 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-zinc-400">
                                  {mission.progress.current} / {mission.progress.target} {mission.progress.unit}
                                </span>
                              </div>
                            )}

                            {mission.type === 'timer' && mission.timer && (
                              <div className="mt-2 flex items-center space-x-3">
                                <span className="font-mono text-xs text-zinc-300">
                                  {formatTime(mission.timer.duration - mission.timer.elapsed)} Left
                                </span>
                                <div className="flex-1 max-w-[120px] h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300"
                                    style={{ width: `${(mission.timer.elapsed / mission.timer.duration) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {mission.type === 'workout' && (
                              <p className="text-[10px] text-zinc-400 mt-1">
                                {isCompleted ? '✓ Workout completed on calendar' : '⌛ Links automatically with active logged workout'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Interactive Controls */}
                        <div className="flex items-center space-x-3">
                          {/* Numeric increment controls */}
                          {mission.type === 'numeric' && (
                            <div className="flex items-center space-x-1 bg-zinc-950 p-1 border border-white/5 rounded-lg">
                              <button 
                                onClick={() => handleAdjustNumeric(mission.id, -0.2)}
                                className="w-6 h-6 rounded flex items-center justify-center hover:bg-zinc-800 text-xs font-bold"
                              >
                                -
                              </button>
                              <button 
                                onClick={() => handleAdjustNumeric(mission.id, 0.2)}
                                className="w-6 h-6 rounded flex items-center justify-center hover:bg-zinc-800 text-xs font-bold"
                              >
                                +
                              </button>
                            </div>
                          )}

                          {/* Timer play/pause control */}
                          {mission.type === 'timer' && mission.timer && (
                            <button
                              onClick={() => handleToggleTimer(mission.id)}
                              disabled={isCompleted}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                                mission.timer.isRunning 
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' 
                                  : isCompleted 
                                    ? 'bg-zinc-800 text-zinc-500' 
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/30'
                              }`}
                            >
                              <span>{mission.timer.isRunning ? '⏸ Pause' : isCompleted ? '✓ Completed' : '▶ Start'}</span>
                            </button>
                          )}

                          {/* Options */}
                          <div className="flex space-x-1.5">
                            <button 
                              onClick={() => handlePinMission(mission.id)}
                              className="text-zinc-500 hover:text-zinc-300 p-1 text-sm"
                              title="Pin Mission"
                            >
                              {mission.isPinned ? '📌' : '📎'}
                            </button>
                            <button className="text-zinc-500 hover:text-rose-400 p-1 text-sm" title="Delete">
                              🗑
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* CONTRIBUTION HEATMAP COMPONENT */}
            <Heatmap data={heatmapData} viewMode="yearly" />

          </div>

          {/* RIGHT SIDEBAR (4 COLS): SOCIAL FEED & AI & LEADERBOARD */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* AI DAILY RECOMMENDATIONS PANEL */}
            <div className="bg-gradient-to-tr from-violet-950/30 to-cyan-950/20 backdrop-blur-xl border border-violet-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex items-center space-x-2.5 mb-4">
                <span className="text-lg">🤖</span>
                <div>
                  <h3 className="font-bold text-white text-sm">Morning AI Suggestions</h3>
                  <p className="text-[10px] text-zinc-400">Predictions based on personal habits</p>
                </div>
              </div>

              <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-4 space-y-3 mb-4">
                <div className="flex items-start space-x-2 text-xs">
                  <span className="text-emerald-400">✓</span>
                  <p className="text-zinc-300">
                    <strong className="text-white">Active Habit Detected:</strong> You slept past 11 PM 4 times this week. AI suggests archiving sleep goals temporarily or adjusting due-times.
                  </p>
                </div>
                <div className="flex items-start space-x-2 text-xs">
                  <span className="text-cyan-400">⚡</span>
                  <p className="text-zinc-300">
                    <strong className="text-white">Consistency Predictor:</strong> You are currently heading for a <strong className="text-cyan-400">82% weekly completion rate</strong>. Completing today's Water goals will lock it in!
                  </p>
                </div>
              </div>

              <button className="w-full bg-white/5 border border-white/10 hover:bg-white/10 py-2.5 rounded-xl text-xs font-bold transition-all">
                Load AI Suggestions (+4 Goals)
              </button>
            </div>

            {/* REAL-TIME FRIEND ACTIVITY FEED */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white text-sm">Friend Activity</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>

              <div className="space-y-4">
                {feed.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 text-xs">
                    <img 
                      src={activity.avatar} 
                      alt={activity.friendName} 
                      className="w-8 h-8 rounded-full border border-white/10 object-cover"
                    />
                    <div className="flex-1">
                      <p className="text-zinc-300">
                        <strong className="text-white">{activity.friendName}</strong> {activity.action}
                      </p>
                      
                      {/* Interaction Row */}
                      <div className="flex items-center space-x-3 mt-2 text-[10px] text-zinc-500">
                        <button 
                          onClick={() => handleReactToActivity(activity.id)}
                          className={`hover:text-white transition-colors ${activity.hasReacted ? 'text-violet-400 font-bold' : ''}`}
                        >
                          {activity.hasReacted ? '🔥 Liked' : '🔥 Like'}
                        </button>
                        <span>•</span>
                        <button className="hover:text-white transition-colors">💬 Comment</button>
                        <span>•</span>
                        <span className="text-zinc-400">{activity.reactionCount} reactions</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LEADERBOARD WIDGET */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
              <h3 className="font-bold text-white text-sm mb-4">Friend Leaderboard</h3>

              <div className="space-y-3">
                {leaderboard.map((user) => (
                  <div 
                    key={user.rank} 
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${
                      user.name === 'You' 
                        ? 'bg-violet-600/10 border-violet-500/20' 
                        : 'border-transparent hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-3 text-xs">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        user.rank === 1 ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {user.rank}
                      </span>
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-7 h-7 rounded-full border border-white/10 object-cover"
                      />
                      <div>
                        <p className="font-bold text-white">{user.name}</p>
                        <p className="text-[10px] text-zinc-400">🔥 {user.streak} Days streak</p>
                      </div>
                    </div>
                    
                    <div className="text-right text-xs">
                      <p className="font-bold text-white">{user.totalXP} XP</p>
                      <p className="text-[10px] text-violet-400 font-semibold">{user.completionRate}% Done</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
