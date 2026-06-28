<?php
// ========================================================
// COMPLETE / UPDATE MISSION LOGS API (PHP / MYSQL)
// ========================================================
require_once 'config.php';

// Decode JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['logId'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing required parameter: logId"]);
    exit();
}

$logId = $input['logId'];
$userId = 1; // Mocking current user = 1
$todayStr = date('Y-m-d');

try {
    // Begin transaction for safety
    $conn->beginTransaction();

    // 1. Fetch current log and template details
    $logStmt = $conn->prepare("
        SELECT ml.*, m.title, m.type, m.category, m.target_value, m.timer_duration
        FROM mission_logs ml
        INNER JOIN missions m ON ml.mission_id = m.id
        WHERE ml.id = :id AND ml.user_id = :user_id
    ");
    $logStmt->execute(['id' => $logId, 'user_id' => $userId]);
    $log = $logStmt->fetch();

    if (!$log) {
        $conn->rollBack();
        http_response_code(404);
        echo json_encode(["error" => "Mission log not found"]);
        exit();
    }

    $isAlreadyCompleted = ($log['state'] === 'completed');
    $newState = $log['state'];
    $xpAwarded = 0;

    // Handle updates based on input type
    if (isset($input['currentValue'])) {
        // Numeric update
        $val = floatval($input['currentValue']);
        $target = floatval($log['target_value']);
        $newState = ($val >= $target) ? 'completed' : 'pending';
        
        $updateStmt = $conn->prepare("UPDATE mission_logs SET current_value = :val, state = :state WHERE id = :id");
        $updateStmt->execute(['val' => $val, 'state' => $newState, 'id' => $logId]);
    } 
    elseif (isset($input['elapsedSeconds'])) {
        // Timer update
        $elapsed = intval($input['elapsedSeconds']);
        $duration = intval($log['timer_duration']);
        $newState = ($elapsed >= $duration) ? 'completed' : 'pending';

        $updateStmt = $conn->prepare("UPDATE mission_logs SET elapsed_seconds = :elapsed, state = :state WHERE id = :id");
        $updateStmt->execute(['elapsed' => $elapsed, 'state' => $newState, 'id' => $logId]);
    } 
    else {
        // Checkbox / Workout toggle complete
        $newState = ($log['state'] === 'completed') ? 'pending' : 'completed';
        
        $updateStmt = $conn->prepare("UPDATE mission_logs SET state = :state WHERE id = :id");
        $updateStmt->execute(['state' => $newState, 'id' => $logId]);
    }

    // 2. Process XP, Streaks, and Feed Posts on transition to COMPLETED
    if ($newState === 'completed' && !$isAlreadyCompleted) {
        // Determine XP reward
        $xpAwarded = ($log['type'] === 'workout') ? 100 : (($log['category'] === 'nutrition') ? 30 : 20);

        // Update user XP & Level
        $userStmt = $conn->prepare("SELECT xp, level FROM users WHERE id = :user_id");
        $userStmt->execute(['user_id' => $userId]);
        $user = $userStmt->fetch();

        $newXP = $user['xp'] + $xpAwarded;
        $newLevel = floor(sqrt($newXP / 100)) + 1;
        $levelUp = ($newLevel > $user['level']);

        $updateUser = $conn->prepare("UPDATE users SET xp = :xp, level = :level WHERE id = :user_id");
        $updateUser->execute(['xp' => $newXP, 'level' => $newLevel, 'user_id' => $userId]);

        // Update Streaks (Overall and Category)
        $categoriesToUpdate = ['overall', $log['category']];
        foreach ($categoriesToUpdate as $cat) {
            $streakStmt = $conn->prepare("SELECT * FROM streaks WHERE user_id = :user_id AND type = :type");
            $streakStmt->execute(['user_id' => $userId, 'type' => $cat]);
            $streak = $streakStmt->fetch();

            if (!$streak) {
                $insertStreak = $conn->prepare("
                    INSERT INTO streaks (user_id, type, current_streak, longest_streak, last_completed_date) 
                    VALUES (:user_id, :type, 1, 1, :date)
                ");
                $insertStreak->execute(['user_id' => $userId, 'type' => $cat, 'date' => $todayStr]);
            } else {
                $lastDate = $streak['last_completed_date'];
                if ($lastDate !== $todayStr) {
                    $yesterdayStr = date('Y-m-d', strtotime('-1 day'));
                    $current = $streak['current_streak'];
                    
                    if ($lastDate === $yesterdayStr) {
                        $current += 1;
                    } else {
                        $current = 1;
                    }

                    $longest = max($streak['longest_streak'], $current);
                    
                    $updateStreak = $conn->prepare("
                        UPDATE streaks 
                        SET current_streak = :current, longest_streak = :longest, last_completed_date = :date 
                        WHERE id = :id
                    ");
                    $updateStreak->execute([
                        'current' => $current,
                        'longest' => $longest,
                        'date' => $todayStr,
                        'id' => $streak['id']
                    ]);
                }
            }
        }

        // Add completed_at timestamp
        $updateTime = $conn->prepare("UPDATE mission_logs SET completed_at = NOW(), xp_awarded = :xp WHERE id = :id");
        $updateTime->execute(['xp' => $xpAwarded, 'id' => $logId]);

        // Insert Feed Post
        $feedContent = "You completed " . $log['title'] . " 🎯";
        $insertFeed = $conn->prepare("INSERT INTO feed_posts (user_id, mission_log_id, content) VALUES (:user_id, :log_id, :content)");
        $insertFeed->execute([
            'user_id' => $userId,
            'log_id' => $logId,
            'content' => $feedContent
        ]);
    }

    // Commit changes
    $conn->commit();

    echo json_encode([
        "success" => true,
        "state" => $newState,
        "xpAwarded" => $xpAwarded
    ]);

} catch (Exception $e) {
    $conn->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
