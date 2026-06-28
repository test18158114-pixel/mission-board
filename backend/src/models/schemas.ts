import { Schema, model, Document, Types } from 'mongoose';

// ==========================================
// 1. USER SCHEMA EXTENSION
// ==========================================
export interface IUser extends Document {
  username: string;
  email: string;
  avatarUrl: string;
  xp: number;
  level: number;
  badges: string[];
  privacy: 'public' | 'friends' | 'private';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true },
  avatarUrl: { type: String, default: '' },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  badges: [{ type: String }],
  privacy: { type: String, enum: ['public', 'friends', 'private'], default: 'friends' }
}, { timestamps: true });

// ==========================================
// 2. MISSION TEMPLATE SCHEMA
// ==========================================
export type MissionType = 'checkbox' | 'numeric' | 'timer' | 'workout';
export type MissionCategory = 
  | 'workout' | 'nutrition' | 'water' | 'supplements' 
  | 'sleep' | 'recovery' | 'cardio' | 'mobility' 
  | 'mental_health' | 'learning' | 'custom';

export interface IMission extends Document {
  userId: Types.ObjectId;
  title: string;
  type: MissionType;
  category: MissionCategory;
  priority: 'low' | 'medium' | 'high';
  colorLabel?: string;
  notes?: string;
  icon?: string;
  isArchived: boolean;
  isPinned: boolean;
  
  // Recurrence configuration
  recurrence: {
    frequency: 'daily' | 'weekly' | 'custom';
    daysOfWeek?: number[]; // [0 = Sunday, ..., 6 = Saturday]
  };

  // Type-specific goals
  config: {
    targetValue?: number; // e.g. 4 for 4L water, 10000 for steps, 180 for protein
    unit?: string;        // e.g. "L", "g", "steps", "kcal"
    timerDuration?: number; // in seconds, e.g. 900 for 15 minutes
    workoutId?: string;   // Reference to target Workout template if type = 'workout'
  };

  // Due time & Reminders
  dueTime?: string; // "HH:MM" e.g., "23:00"
  reminders: {
    enabled: boolean;
    time?: string; // "HH:MM"
    message?: string;
  }[];

  createdAt: Date;
  updatedAt: Date;
}

const MissionSchema = new Schema<IMission>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ['checkbox', 'numeric', 'timer', 'workout'], required: true },
  category: { 
    type: String, 
    enum: [
      'workout', 'nutrition', 'water', 'supplements', 
      'sleep', 'recovery', 'cardio', 'mobility', 
      'mental_health', 'learning', 'custom'
    ], 
    required: true 
  },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  colorLabel: { type: String },
  notes: { type: String },
  icon: { type: String },
  isArchived: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  recurrence: {
    frequency: { type: String, enum: ['daily', 'weekly', 'custom'], default: 'daily' },
    daysOfWeek: [{ type: Number }]
  },
  config: {
    targetValue: { type: Number },
    unit: { type: String },
    timerDuration: { type: Number },
    workoutId: { type: String }
  },
  dueTime: { type: String },
  reminders: [{
    enabled: { type: Boolean, default: false },
    time: { type: String },
    message: { type: String }
  }]
}, { timestamps: true });

// COMPOUND INDEX: Querying active non-archived missions for a specific user
MissionSchema.index({ userId: 1, isArchived: 1, isPinned: -1 });

// ==========================================
// 3. MISSION DAILY LOG SCHEMA (Historical Tracking)
// ==========================================
export interface IMissionLog extends Document {
  userId: Types.ObjectId;
  missionId: Types.ObjectId; // References Mission template
  date: string;              // Format: "YYYY-MM-DD"
  state: 'pending' | 'completed' | 'missed';
  
  // Current values based on mission type
  progress: {
    isCompletedCheckbox: boolean;
    currentValue: number;      // e.g. 2.8 for water, 7200 for steps
    elapsedSeconds: number;     // for timer missions
    workoutCompleted: boolean;  // for workout type
  };

  xpAwarded: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MissionLogSchema = new Schema<IMissionLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  missionId: { type: Schema.Types.ObjectId, ref: 'Mission', required: true, index: true },
  date: { type: String, required: true, index: true }, // Index for fast lookup of a specific day's board
  state: { type: String, enum: ['pending', 'completed', 'missed'], default: 'pending' },
  progress: {
    isCompletedCheckbox: { type: Boolean, default: false },
    currentValue: { type: Number, default: 0 },
    elapsedSeconds: { type: Number, default: 0 },
    workoutCompleted: { type: Boolean, default: false }
  },
  xpAwarded: { type: Number, default: 0 },
  completedAt: { type: Date }
}, { timestamps: true });

// COMPOUND INDEX: Avoid double logs for same mission on same day
MissionLogSchema.index({ missionId: 1, date: 1 }, { unique: true });
// Index for generating Heatmaps: Lookup user logs within a date range
MissionLogSchema.index({ userId: 1, date: 1 });

// ==========================================
// 4. STREAK SYSTEM SCHEMA
// ==========================================
export interface IStreak extends Document {
  userId: Types.ObjectId;
  type: 'overall' | MissionCategory;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string; // "YYYY-MM-DD"
  freezeCount: number;         // Streak freezes available
  updatedAt: Date;
}

const StreakSchema = new Schema<IStreak>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    required: true,
    enum: [
      'overall', 'workout', 'nutrition', 'water', 'supplements', 
      'sleep', 'recovery', 'cardio', 'mobility', 
      'mental_health', 'learning', 'custom'
    ] 
  },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastCompletedDate: { type: String },
  freezeCount: { type: Number, default: 2 } // Starts with 2 free freezes
}, { timestamps: true });

StreakSchema.index({ userId: 1, type: 1 }, { unique: true });

// ==========================================
// 5. XP LOGS SCHEMA (Audit & Levels)
// ==========================================
export interface IXPLog extends Document {
  userId: Types.ObjectId;
  missionLogId?: Types.ObjectId; // Null if manual override/bonus
  amount: number;
  source: 'mission_completed' | 'streak_milestone' | 'bonus';
  description: string;
  createdAt: Date;
}

const XPLogSchema = new Schema<IXPLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  missionLogId: { type: Schema.Types.ObjectId, ref: 'MissionLog' },
  amount: { type: Number, required: true },
  source: { type: String, enum: ['mission_completed', 'streak_milestone', 'bonus'], required: true },
  description: { type: String, required: true }
}, { timestamps: true });

// ==========================================
// 6. FRIENDSHIP SCHEMA (For Social Feed / Leaderboard)
// ==========================================
export interface IFriendship extends Document {
  requesterId: Types.ObjectId;
  recipientId: Types.ObjectId;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

const FriendshipSchema = new Schema<IFriendship>({
  requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'accepted', 'blocked'], required: true }
}, { timestamps: true });

FriendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

// ==========================================
// 7. FEED POSTS SCHEMA
// ==========================================
export interface IFeedPost extends Document {
  userId: Types.ObjectId;
  missionLogId: Types.ObjectId;
  content: string; // Auto-generated e.g. "Rohan completed Chest Workout 🔥"
  likesCount: number;
  reactions: {
    userId: Types.ObjectId;
    type: 'like' | 'fire' | 'celebrate' | 'clapping';
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const FeedPostSchema = new Schema<IFeedPost>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  missionLogId: { type: Schema.Types.ObjectId, ref: 'MissionLog', required: true, unique: true },
  content: { type: String, required: true },
  likesCount: { type: Number, default: 0 },
  reactions: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'fire', 'celebrate', 'clapping'], required: true }
  }]
}, { timestamps: true });

// ==========================================
// 8. SOCIAL COMMENTS SCHEMA
// ==========================================
export interface IComment extends Document {
  feedPostId: Types.ObjectId;
  userId: Types.ObjectId;
  text: string;
  createdAt: Date;
}

const CommentSchema = new Schema<IComment>({
  feedPostId: { type: Schema.Types.ObjectId, ref: 'FeedPost', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true }
}, { timestamps: true });

// Export Models
export const User = model<IUser>('User', UserSchema);
export const Mission = model<IMission>('Mission', MissionSchema);
export const MissionLog = model<IMissionLog>('MissionLog', MissionLogSchema);
export const Streak = model<IStreak>('Streak', StreakSchema);
export const XPLog = model<IXPLog>('XPLog', XPLogSchema);
export const Friendship = model<IFriendship>('Friendship', FriendshipSchema);
export const FeedPost = model<IFeedPost>('FeedPost', FeedPostSchema);
export const Comment = model<IComment>('Comment', CommentSchema);
