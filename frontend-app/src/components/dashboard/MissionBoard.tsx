"use client";

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Heatmap, HeatmapDay } from './Heatmap';

// ==========================================
// TYPES AND INTERFACES
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

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const MissionBoard: React.FC = () => {
  // 1. DASHBOARD STATES
  const [missions, setMissions] = useState<Mission[]>([]);
  const [feed, setFeed] = useState<FriendActivity[]>([
    { id: 'f1', friendName: 'Rohan Sharma', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100', action: 'completed Chest Workout 🔥', reactionCount: 8, hasReacted: true },
    { id: 'f2', friendName: 'Aman Verma', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100', action: 'completed Water Goal 💧 (4.0L/4.0L)', reactionCount: 3, hasReacted: false },
    { id: 'f3', friendName: 'Vivek Gupta', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', action: 'completed Sleep Goal 😴 (8 Hours)', reactionCount: 12, hasReacted: false }
  ]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [overallStreak, setOverallStreak] = useState<number>(7);
  const [todayXP, setTodayXP] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 2. CONNECT TO BACKEND & LOAD INITIAL DATA
  useEffect(() => {
    async function loadData() {
      try {
        const [resMissions, resLeaderboard, resStats] = await Promise.all([
          fetch(`${BACKEND_URL}/api/v1/missions/today`),
          fetch(`${BACKEND_URL}/api/v1/leaderboard`),
          fetch(`${BACKEND_URL}/api/v1/stats`)
        ]);

        if (resMissions.ok) setMissions(await resMissions.json());
        if (resLeaderboard.ok) setLeaderboard(await resLeaderboard.json());
        if (resStats.ok) {
          const stats = await resStats.json();
          setHeatmapData(stats.heatmap);
          setOverallStreak(stats.streak);
          setTodayXP(stats.completedXP || 0);
        }
      } catch (err) {
        console.warn('Could not connect to live backend API. Running in local mock mode.', err);
        // Fallback to local mock templates if server is offline
        seedMockLocalData();
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Initialize Socket.IO connection
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      autoConnect: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to real-time sync server.');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Real-time sync server disconnected.');
    });

    // Handle real-time updates from friends
    socket.on('friend:mission_completed', (data: any) => {
      // Add friend action to activity feed
      const newPost: FriendActivity = {
        id: data.feedPostId || String(Date.now()),
        friendName: data.friendName,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${data.friendName}`,
        action: `completed ${data.title} 🎯 (+${data.xpAwarded} XP, Streak: ${data.overallStreak} days)`,
        reactionCount: 0,
        hasReacted: false
      };
      setFeed(prev => [newPost, ...prev.slice(0, 8)]);
    });

    socket.on('friend:mission_progressed', (data: any) => {
      // Temporary live progress flash in feed (optional UI indicator)
      console.log(`${data.friendName} progressed on ${data.missionId}: ${data.currentValue} / ${data.targetValue}`);
    });

    socket.on('user:level_up', (data: any) => {
      alert(`🎉 LEVEL UP! ${data.message}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Seed local fallback data
  const seedMockLocalData = () => {
    setMissions([
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

    setLeaderboard([
      { rank: 1, name: 'Rohan Sharma', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100', completionRate: 98, streak: 14, totalXP: 3820 },
      { rank: 2, name: 'You', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', completionRate: 78, streak: 7, totalXP: 2480 },
      { rank: 3, name: 'Aman Verma', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100', completionRate: 72, streak: 5, totalXP: 1980 }
    ]);

    const mockHeatmap: HeatmapDay[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      mockHeatmap.push({
        date: date.toISOString().split('T')[0],
        completed: Math.floor(Math.random() * 5),
        total: 5
      });
    }
    setHeatmapData(mockHeatmap);
  };

  // 3. TICK TIMER MISSIONS
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setMissions(prev => 
        prev.map(m => {
          if (m.type === 'timer' && m.timer?.isRunning && m.timer.elapsed < m.timer.duration) {
            const nextElapsed = m.timer.elapsed + 1;
            const isFinished = nextElapsed >= m.timer.duration;
            
            if (isFinished) {
              triggerMissionCompletion(m.id);
            }
            
            return {
              ...m,
              isCompleted: isFinished ? true : m.isCompleted,
              timer: { ...m.timer, elapsed: nextElapsed, isRunning: !isFinished }
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

  // 4. EMIT REAL-TIME SYNCHRONIZATIONS
  const triggerMissionCompletion = (id: string) => {
    // 1. Calculate XP reward
    const targetMission = missions.find(m => m.id === id);
    if (!targetMission) return;
    const xpAwarded = targetMission.priority === 'high' ? 100 : 40;

    setTodayXP(prev => prev + xpAwarded);

    // 2. Emit Socket IO completion event to sync with online friends
    if (socketRef.current && isConnected) {
      socketRef.current.emit('mission:complete', {
        missionId: id,
        logId: id, // In dynamic dev mode, log ID is mock-mapped to mission ID
        xpAwarded
      });
    }
  };

  const handleToggleCheckbox = (id: string) => {
    setMissions(prev => prev.map(m => {
      if (m.id === id) {
        const nextCompleted = !m.isCompleted;
        if (nextCompleted) triggerMissionCompletion(m.id);
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
        const isAlreadyCompleted = m.isCompleted;
        const isNowCompleted = current >= m.progress.target;
        
        // Trigger sync if completed for the first time
        if (isNowCompleted && !isAlreadyCompleted) {
          triggerMissionCompletion(m.id);
        }

        // Emit Socket live slider progress updates (debounced)
        if (socketRef.current && isConnected) {
          socketRef.current.emit('mission:progress', {
            missionId: id,
            currentValue: current,
            targetValue: m.progress.target,
            unit: m.progress.unit
          });
        }

        return {
          ...m,
          isCompleted: isNowCompleted,
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
        // Emit like to friends via WebSocket
        if (socketRef.current && isConnected) {
          socketRef.current.emit('feed:react', {
            feedPostId: id,
            reactionType: 'fire'
          });
        }
        return {
          ...item,
          reactionCount: item.hasReacted ? item.reactionCount - 1 : item.reactionCount + 1,
          hasReacted: !item.hasReacted
        };
      }
      return item;
    }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalMissionsCount = missions.length;
  const completedMissionsCount = missions.filter(m => m.isCompleted).length;
  const completionPercentage = totalMissionsCount > 0 ? Math.round((completedMissionsCount / totalMissionsCount) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-zinc-400">Loading Premium Mission Board...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans overflow-x-hidden antialiased">
      {/* Sync Status Banner */}
      <div className={`text-center py-1.5 text-xs font-semibold tracking-wide transition-all ${
        isConnected ? 'bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-b border-rose-500/20'
      }`}>
        {isConnected 
          ? '● Live Real-Time Synchronizer Active (Socket.IO Connected)' 
          : '○ Offline Mode (Backend Server at localhost:5000 not detected, operating in offline fallback)'}
      </div>

      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-600/10 blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        
        {/* NAVBAR */}
        <header className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-violet-500/20">
              M
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
                Mission Board
              </h1>
              <span className="text-xs text-zinc-400">Advanced Daily Accountability</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 bg-white/5 backdrop-blur-md px-4 py-2 border border-white/10 rounded-full">
            <span className="text-xs font-semibold text-zinc-400">Level 4</span>
            <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: '65%' }} />
            </div>
            <span className="text-xs font-bold text-violet-400">+{todayXP} XP Earned</span>
          </div>
        </header>

        {/* HERO CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Today's Progress</span>
              <h3 className="text-3xl font-extrabold text-white mt-1">{completionPercentage}%</h3>
              <p className="text-xs text-zinc-400 mt-2">{completedMissionsCount} of {totalMissionsCount} completed</p>
            </div>
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-zinc-800" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-violet-500 transition-all duration-500 ease-out" strokeDasharray={`${completionPercentage}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-zinc-300">🎯</div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-2xl">🔥</div>
            <div>
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Overall Streak</span>
              <h3 className="text-3xl font-extrabold text-white mt-1">{overallStreak} Days</h3>
              <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold">1 Streak Freeze Active</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl">🏆</div>
            <div>
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Leaderboard Rank</span>
              <h3 className="text-3xl font-extrabold text-white mt-1">#2</h3>
              <p className="text-xs text-zinc-400">Top 15% among friends</p>
            </div>
          </div>

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

        {/* COLUMNS LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT 8 COLS */}
          <div className="lg:col-span-8 space-y-8">
            
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

              {/* MISSION ITEMS */}
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
                        
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          
                          <div className="cursor-grab text-zinc-600 hover:text-zinc-400 select-none text-sm hidden md:block">⋮⋮</div>

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

                          {mission.type === 'numeric' && <div className="relative"><span className="text-xl">{mission.icon}</span></div>}
                          {mission.type === 'timer' && <div className="relative"><span className="text-xl">{mission.icon}</span></div>}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className={`text-sm font-bold truncate ${isCompleted ? 'line-through text-zinc-500' : 'text-white'}`}>
                                {mission.title}
                              </h4>
                              {mission.isPinned && (
                                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-white/5">📌 Pinned</span>
                              )}
                              <span className={`text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                                mission.priority === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                mission.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              }`}>
                                {mission.priority}
                              </span>
                            </div>
                            
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

                        <div className="flex items-center space-x-3">
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

                          <div className="flex space-x-1.5">
                            <button 
                              onClick={() => handlePinMission(mission.id)}
                              className="text-zinc-500 hover:text-zinc-300 p-1 text-sm"
                            >
                              {mission.isPinned ? '📌' : '📎'}
                            </button>
                            <button className="text-zinc-500 hover:text-rose-400 p-1 text-sm">🗑</button>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            <Heatmap data={heatmapData} viewMode="yearly" />

          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-4 space-y-8">
            
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

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
              <h3 className="font-bold text-white text-sm mb-4">Friend Leaderboard</h3>

              <div className="space-y-3">
                {leaderboard.map((user) => (
                  <div 
                    key={user.rank} 
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${
                      user.name === 'You' 
                        ? 'bg-violet-600/10 border-violet-500/25' 
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
