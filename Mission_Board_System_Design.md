# Mission Board: Premium Daily Accountability System
### Architectural Blueprint & Product Specification

---

## 1. Product & Feature Overview (Senior PM Perspective)

The **Mission Board** is a premium, gamified daily fitness accountability system designed to convert short-term motivation into long-term consistency. Unlike basic to-do lists, this system tracks multiple mission types, rewards XP, maintains multi-dimensional streaks, supports privacy control levels, and relies on real-time social syncing so friends act as consistency regulators.

### 1.1 Core Gamification Mechanics
*   **XP System**: Every daily task completed awards XP based on effort and category:
    *   *Workout Missions*: +100 XP
    *   *Cardio Missions*: +50 XP
    *   *Sleep Goal*: +40 XP
    *   *Protein Goal*: +30 XP
    *   *Water Goal*: +20 XP
    *   *Mental Health / Meditation*: +25 XP
*   **Leveling Engine**: Level threshold is defined by:
    $$\text{Level} = \lfloor\sqrt{\text{XP} / 100}\rfloor + 1$$
    This progression slows as the user levels up, encouraging continuous engagement.
*   **Streak Mechanics**: Users maintain an *Overall Consistency Streak* alongside category-specific streaks (e.g., Water Streak). If a user misses their overall goals, the streak resets unless they activate a *Streak Freeze* (max 2 freezes held at a time, unlocked per 500 XP earned).

### 1.2 Social & Privacy Control Matrix
Every user can configure their privacy settings:
*   `public`: Anyone can follow, view their heatmap, and see active board progress.
*   `friends`: Only accepted friendships receive live Socket.IO events and activity feeds.
*   `private`: Heatmap, completion stats, and activities are hidden; not visible in leaderboards.

---

## 2. Visual Design System & UX (Senior UI/UX Designer Perspective)

The Mission Board features a **sleek dark mode** using glassmorphic layers to create a spatial, high-fidelity experience that looks premium.

### 2.1 Aesthetic Specs
*   **Colors**: Dark zinc baseline (`bg-zinc-950`), accented by neon cyan (`#06b6d4` for water/hydration), violet (`#8b5cf6` for workouts/movement), and emerald (`#10b981` for completed states).
*   **Glassmorphism Glass Layer**: `bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl`
*   **Typography**: Inter / Outfit fonts. High visual hierarchy with uppercase tracking labels and glowing gradients for headers.

### 2.2 Dashboard Layout Grid
```
+-------------------------------------------------------------------------------+
| [Logo] Mission Board                                    Level 4 [======-] XP  |
+-------------------------------------------------------------------------------+
| [Today's Progress Ring]  [Overall Streak]  [Leaderboard Rank]  [Smart Alerts] |
| 78% Completed           🔥 7 Days Streak    #2 Rank            💧 1.2L left   |
+-------------------------------------------------------------------------------+
|  ACTIVE MISSIONS PANEL (8 Cols)              | SIDEBAR PANEL (4 Cols)          |
|  - 💪 Chest Workout (Workout) [Pinned] [✓]   |                                 |
|  - 💧 Water Goal: 2.8L/4L   [+] [-]          | 🤖 MORNING AI SUGGESTIONS       |
|  - 🧘 stretching: 9:40 Left [▶]              |    "Slept late 4 times, shift   |
|  - 🥩 Eat 180g Protein      [+] [-]          |    sleep due-time?"            |
|                                              |                                 |
|  CONTRIBUTION HEATMAP (GRID)                 | 👥 FRIEND ACTIVITY FEED (LIVE)  |
|  [■][■][■][■][■][■][■]                       |    - Rohan completed Chest Day  |
|  [■][■][■][■][■][■][■]                       |                                 |
|  (Green = Done, Red = Missed, Dark = Rest)   | 🏆 FRIEND LEADERBOARD           |
|                                              |    1. Rahul (3820 XP)           |
+-------------------------------------------------------------------------------+
```

---

## 3. System Architecture & Databases (Senior Full-Stack Architect)

The system relies on an event-driven loop to process real-time updates and update MongoDB transactionally while distributing feed messages via a WebSocket layer.

### 3.1 Component Architecture
```
  [ Next.js Client ]
      │         ▲
      │ HTTPS   │ WebSocket (Socket.IO)
      ▼         │
  [ Express API Gateway ] ──────► [ Socket.IO Server ]
      │                                │
      ▼                                ▼
  [ MongoDB Database ] ◄──────── [ Redis Adapter ] (Syncs events across scale instances)
```

### 3.2 Real-time Sync Scaling with Redis
To keep resources lean and support horizontal scale (multiple instances behind a Load Balancer):
1. Sockets join rooms partitioned as:
   *   `user:<userId>`: User private events.
   *   `user:<userId>:feed`: Friends join this room to subscribe to this user's activities.
2. We connect Socket.IO to a **Redis Adapter**.
3. When User A completes a mission, the node server writes to MongoDB and broadcasts a `friend:mission_completed` event to `user:<userId>:feed`. Redis handles forwarding this packet to all other running server nodes hosting active sockets of User A's friends.

---

## 4. API & Socket Contract Specifications

### 4.1 REST API endpoints
#### `POST /api/v1/missions`
Creates a mission template.
*   **Request Body**:
    ```json
    {
      "title": "Drink 4L Water",
      "type": "numeric",
      "category": "water",
      "priority": "medium",
      "recurrence": { "frequency": "daily" },
      "config": { "targetValue": 4, "unit": "L" }
    }
    ```

#### `GET /api/v1/missions/today`
Returns the generated daily log list (merging templates and logs).
*   **Response**:
    ```json
    [
      {
        "id": "log123",
        "missionId": "mis456",
        "title": "Drink 4L Water",
        "state": "pending",
        "progress": { "currentValue": 2.8, "targetValue": 4 }
      }
    ]
    ```

### 4.2 Socket.IO Event Schema
*   **Publish Events** (Client $\rightarrow$ Server):
    *   `mission:progress`: `{ missionId: string, logId: string, currentValue: number }`
    *   `mission:complete`: `{ missionId: string, logId: string, xpAwarded: number }`
    *   `feed:react`: `{ feedPostId: string, reactionType: "like"|"fire"|"celebrate" }`
*   **Subscribe Events** (Server $\rightarrow$ Client):
    *   `friend:mission_progressed`: Emitted on active slider increment.
    *   `friend:mission_completed`: Broadcasted to friends feed room on task completion.
    *   `feed:reaction_updated`: Real-time social interaction update.
    *   `user:level_up`: Direct level promotion event.

---

## 5. Directory & Folder Layout
```
g_micro/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   └── schemas.ts          # Mongoose Schemas (Missions, Logs, Feed, Friends)
│   │   ├── sockets/
│   │   │   └── missionHandler.ts   # Socket.IO Connection & Sync Handlers
│   │   ├── controllers/
│   │   │   └── aiController.ts     # Pre-calculated Morning AI Generator
│   │   └── server.ts               # Core Server setup (Express & HTTP Wrapper)
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── dashboard/
    │   │       ├── MissionBoard.tsx # Main Premium UI Dashboard
    │   │       └── Heatmap.tsx      # Contribution Calendar
    │   └── styles/
    │       └── index.css            # Base Tailwind and glassmorphic designs
```

---

## 6. Implementation Roadmap

### Phase 1: Database & API Core (Weeks 1-2)
*   Deploy MongoDB instance. Implement Mongoose models (`schemas.ts`) with indices optimized for daily fetches and date range filters.
*   Build basic CRUD REST API endpoints.

### Phase 2: WebSocket Layer & Scaling (Weeks 3-4)
*   Configure Express Socket.IO server. Implement friendship subscription filters.
*   Integrate Redis Adapter for multi-node event distribution.
*   Establish client-side WebSocket hook and connect real-time progress broadcasts.

### Phase 3: Premium UI & Gamification (Weeks 5-6)
*   Build Next.js Frontend Dashboard and Heatmap with Glassmorphism styling and Framer Motion transitions.
*   Build XP calculation engine and category/overall streak state-machine.

### Phase 4: AI Recommendations & Background Jobs (Weeks 7-8)
*   Configure background Cron jobs for morning calculations (5 AM).
*   Create AI prompt templates aggregating user consistency metrics and generate daily recommendations to preemptively write into logs.
