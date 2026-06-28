import { Server, Socket } from 'socket.io';
import { MissionLog, Friendship, User, Streak, FeedPost, XPLog } from '../models/schemas';

// Map to track active user socket connections: userId -> socketId
const activeConnections = new Map<string, string>();

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    username: string;
  };
}

export function registerMissionHandlers(io: Server, socket: AuthenticatedSocket) {
  if (!socket.user) return;
  const userId = socket.user.id;
  const username = socket.user.username;

  // Track the active socket connection for this user
  activeConnections.set(userId, socket.id);

  // 1. JOIN ROOMS
  // Join own private channel (for targeted notifications or multi-device sync)
  socket.join(`user:${userId}`);

  // Join feed rooms of all accepted friends to receive their updates
  Friendship.find({
    $or: [{ requesterId: userId }, { recipientId: userId }],
    status: 'accepted'
  }).then((friendships) => {
    friendships.forEach((rel) => {
      const friendId = rel.requesterId.toString() === userId 
        ? rel.recipientId.toString() 
        : rel.requesterId.toString();
      
      // Listen to this friend's updates by joining their feed room
      socket.join(`user:${friendId}:feed`);
    });
  }).catch((err) => {
    console.error('Error fetching friends for socket rooms:', err);
  });

  // 2. CREATE MISSION EVENT HANDLER
  socket.on('mission:create', async (data: { missionId: string; title: string; category: string }) => {
    // Broadcast to friends that the user has added a new goal
    socket.to(`user:${userId}:feed`).emit('friend:mission_created', {
      friendId: userId,
      friendName: username,
      missionId: data.missionId,
      title: data.title,
      category: data.category,
      timestamp: new Date()
    });
  });

  // 3. PROGRESS UPDATE EVENT HANDLER (e.g. Numeric/Timer progress)
  socket.on('mission:progress', async (data: { 
    missionId: string; 
    logId: string; 
    currentValue: number; 
    targetValue: number; 
    unit: string; 
  }) => {
    // Broadcast real-time counter changes (debounced on client side)
    socket.to(`user:${userId}:feed`).emit('friend:mission_progressed', {
      friendId: userId,
      friendName: username,
      missionId: data.missionId,
      currentValue: data.currentValue,
      targetValue: data.targetValue,
      unit: data.unit,
      timestamp: new Date()
    });
  });

  // 4. COMPLETION EVENT HANDLER (Triggers Streak, XP, Level Ups & Social Feed Posts)
  socket.on('mission:complete', async (data: { missionId: string; logId: string; xpAwarded: number }) => {
    try {
      // 1. Verify log update in DB
      const log = await MissionLog.findById(data.logId).populate('missionId');
      if (!log || log.state !== 'completed') return;

      // 2. Fetch User & Update XP
      const user = await User.findById(userId);
      if (!user) return;
      
      const oldLevel = user.level;
      user.xp += data.xpAwarded;
      
      // Standard dynamic level-up logic: Level = floor(sqrt(XP / 100)) + 1
      const newLevel = Math.floor(Math.sqrt(user.xp / 100)) + 1;
      let levelUpOccurred = false;
      if (newLevel > oldLevel) {
        user.level = newLevel;
        levelUpOccurred = true;
      }
      await user.save();

      // 3. Log XP transaction
      await XPLog.create({
        userId,
        missionLogId: log._id,
        amount: data.xpAwarded,
        source: 'mission_completed',
        description: `Completed daily mission: ${log.missionId ? (log.missionId as any).title : 'Mission'}`
      });

      // 4. Check & Update category-specific and overall streaks
      const missionCategory = (log.missionId as any).category;
      
      // Update overall streak & category streak
      const categoriesToUpdate = ['overall', missionCategory];
      const streakUpdates = await Promise.all(categoriesToUpdate.map(async (catType) => {
        let streak = await Streak.findOne({ userId, type: catType });
        const todayStr = new Date().toISOString().split('T')[0];
        
        if (!streak) {
          const newStreak = new Streak({ userId, type: catType, currentStreak: 1, longestStreak: 1, lastCompletedDate: todayStr });
          await newStreak.save();
          return newStreak;
        } else {
          // If already completed today, keep current. If completed yesterday, increment. If earlier, reset to 1.
          const lastDate = streak.lastCompletedDate;
          if (lastDate !== todayStr) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            if (lastDate === yesterdayStr) {
              streak.currentStreak += 1;
            } else {
              streak.currentStreak = 1;
            }
            
            if (streak.currentStreak > streak.longestStreak) {
              streak.longestStreak = streak.currentStreak;
            }
            streak.lastCompletedDate = todayStr;
            await streak.save();
          }
          return streak;
        }
      }));

      const overallStreak = streakUpdates.find(s => s && s.type === 'overall')?.currentStreak || 1;

      // 5. Create Feed Post for the completed activity
      const feedContent = `${username} completed ${(log.missionId as any).title} 🎯`;
      const post = await FeedPost.create({
        userId,
        missionLogId: log._id,
        content: feedContent
      });

      // 6. Broadcast completion update to friends room
      socket.to(`user:${userId}:feed`).emit('friend:mission_completed', {
        friendId: userId,
        friendName: username,
        missionId: data.missionId,
        logId: data.logId,
        title: (log.missionId as any).title,
        category: missionCategory,
        overallStreak,
        xpAwarded: data.xpAwarded,
        levelUp: levelUpOccurred ? { oldLevel, newLevel } : null,
        feedPostId: post._id,
        timestamp: new Date()
      });

      // Emit level-up notification back to the user themselves
      if (levelUpOccurred) {
        socket.emit('user:level_up', {
          level: newLevel,
          xp: user.xp,
          message: `🎉 Level up! You are now Level ${newLevel}!`
        });
      }

    } catch (err) {
      console.error('Error handling mission completion WebSocket event:', err);
    }
  });

  // 5. SOCIAL COMMENTS AND REACTIONS
  socket.on('feed:react', async (data: { feedPostId: string; reactionType: 'like' | 'fire' | 'celebrate' | 'clapping' }) => {
    try {
      const post = await FeedPost.findById(data.feedPostId);
      if (!post) return;

      // Add or replace reaction
      const existingReactionIndex = post.reactions.findIndex(r => r.userId.toString() === userId);
      if (existingReactionIndex > -1) {
        post.reactions[existingReactionIndex].type = data.reactionType;
      } else {
        post.reactions.push({ userId: userId as any, type: data.reactionType });
      }
      post.likesCount = post.reactions.length;
      await post.save();

      // Broadcast reaction to the owner's friends
      socket.to(`user:${post.userId.toString()}:feed`).emit('feed:reaction_updated', {
        feedPostId: data.feedPostId,
        reactorId: userId,
        reactorName: username,
        reactionType: data.reactionType,
        likesCount: post.likesCount
      });
    } catch (err) {
      console.error('Error reacting to feed post:', err);
    }
  });

  socket.on('disconnect', () => {
    activeConnections.delete(userId);
    // User automatically leaves all socket.io rooms upon disconnecting
  });
}
