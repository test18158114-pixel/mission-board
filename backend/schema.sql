-- ========================================================
-- DATABASE SCHEMA FOR MYSQL (INFINITYFREE COMPATIBLE)
-- ========================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `avatar_url` VARCHAR(255) DEFAULT '',
  `xp` INT DEFAULT 0,
  `level` INT DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. MISSIONS TEMPLATE TABLE
CREATE TABLE IF NOT EXISTS `missions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `type` ENUM('checkbox', 'numeric', 'timer', 'workout') NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `priority` ENUM('low', 'medium', 'high') DEFAULT 'medium',
  `color_label` VARCHAR(50) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `icon` VARCHAR(10) DEFAULT '🎯',
  `target_value` DECIMAL(10,2) DEFAULT NULL,
  `unit` VARCHAR(20) DEFAULT NULL,
  `timer_duration` INT DEFAULT NULL, -- in seconds
  `is_pinned` TINYINT(1) DEFAULT 0,
  `is_archived` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. MISSION DAILY LOGS
CREATE TABLE IF NOT EXISTS `mission_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `mission_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `state` ENUM('pending', 'completed', 'missed') DEFAULT 'pending',
  `current_value` DECIMAL(10,2) DEFAULT 0.00,
  `elapsed_seconds` INT DEFAULT 0,
  `xp_awarded` INT DEFAULT 0,
  `completed_at` DATETIME DEFAULT NULL,
  UNIQUE KEY `idx_mission_date` (`mission_id`, `date`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`mission_id`) REFERENCES `missions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. STREAKS TRACKER
CREATE TABLE IF NOT EXISTS `streaks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `type` VARCHAR(50) NOT NULL, -- 'overall' or category names
  `current_streak` INT DEFAULT 0,
  `longest_streak` INT DEFAULT 0,
  `last_completed_date` DATE DEFAULT NULL,
  UNIQUE KEY `idx_user_streak` (`user_id`, `type`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. FRIENDSHIPS
CREATE TABLE IF NOT EXISTS `friendships` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `requester_id` INT NOT NULL,
  `recipient_id` INT NOT NULL,
  `status` ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
  UNIQUE KEY `idx_friendship` (`requester_id`, `recipient_id`),
  FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. FEED POSTS (SOCIAL FEED)
CREATE TABLE IF NOT EXISTS `feed_posts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `mission_log_id` INT NOT NULL,
  `content` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`mission_log_id`) REFERENCES `mission_logs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================
-- INITIAL SEED DATA
-- ========================================================
INSERT INTO `users` (`id`, `username`, `email`, `avatar_url`, `xp`, `level`) VALUES
(1, 'You', 'you@example.com', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', 2480, 4),
(2, 'Rohan', 'rohan@example.com', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100', 3820, 6),
(3, 'Aman', 'aman@example.com', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100', 1980, 3);

INSERT INTO `streaks` (`user_id`, `type`, `current_streak`, `longest_streak`, `last_completed_date`) VALUES
(1, 'overall', 7, 12, DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
(2, 'overall', 14, 20, CURDATE()),
(3, 'overall', 5, 5, CURDATE());

INSERT INTO `missions` (`id`, `user_id`, `title`, `type`, `category`, `priority`, `color_label`, `icon`, `target_value`, `unit`, `timer_duration`, `is_pinned`) VALUES
(1, 1, 'Chest Workout (Push Day)', 'workout', 'workout', 'high', 'from-violet-500 to-purple-600', '💪', 1.00, 'session', NULL, 1),
(2, 1, 'Hydrate Consistently', 'numeric', 'water', 'medium', 'from-cyan-500 to-blue-600', '💧', 4.00, 'L', NULL, 1),
(3, 1, 'Stretching & Mobility', 'timer', 'mobility', 'low', 'from-emerald-500 to-teal-600', '🧘', 1.00, 'session', 900, 0),
(4, 1, 'Eat 180g Protein', 'numeric', 'nutrition', 'high', 'from-orange-500 to-red-600', '🥩', 180.00, 'g', NULL, 0),
(5, 1, 'Take Creatine Monohydrate', 'checkbox', 'supplements', 'medium', 'from-pink-500 to-rose-600', '💊', 1.00, 'check', NULL, 0);

-- Mock Feed Posts to populate immediately
INSERT INTO `mission_logs` (`id`, `user_id`, `mission_id`, `date`, `state`, `current_value`, `xp_awarded`, `completed_at`) VALUES
(100, 2, 1, CURDATE(), 'completed', 1.00, 100, NOW());
INSERT INTO `feed_posts` (`user_id`, `mission_log_id`, `content`) VALUES
(2, 100, 'Rohan completed Chest Workout 🔥');
