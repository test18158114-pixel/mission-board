<?php
// ========================================================
// GET STATS & HEATMAP API (PHP / MYSQL)
// ========================================================
require_once 'config.php';

try {
    $userId = 1;

    // 1. Fetch current overall streak
    $streakStmt = $conn->prepare("SELECT current_streak FROM streaks WHERE user_id = :user_id AND type = 'overall'");
    $streakStmt->execute(['user_id' => $userId]);
    $streak = $streakStmt->fetch();
    $currentStreak = $streak ? (int)$streak['current_streak'] : 0;

    // 2. Fetch completed XP sum for today
    $xpStmt = $conn->prepare("
        SELECT SUM(xp_awarded) as today_xp 
        FROM mission_logs 
        WHERE user_id = :user_id AND date = CURDATE() AND state = 'completed'
    ");
    $xpStmt->execute(['user_id' => $userId]);
    $xp = $xpStmt->fetch();
    $todayXP = $xp['today_xp'] ? (int)$xp['today_xp'] : 0;

    // 3. Fetch last 30 days log counts for heatmap
    $heatmapStmt = $conn->prepare("
        SELECT date, COUNT(*) as total, SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END) as completed
        FROM mission_logs
        WHERE user_id = :user_id AND date >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
        GROUP BY date
        ORDER BY date ASC
    ");
    $heatmapStmt->execute(['user_id' => $userId]);
    $dbLogs = $heatmapStmt->fetchAll();

    // Map logs by date
    $logMap = [];
    foreach ($dbLogs as $log) {
        $logMap[$log['date']] = [
            'completed' => (int)$log['completed'],
            'total' => (int)$log['total']
        ];
    }

    // Generate last 30 calendar days to make sure empty days are filled
    $heatmap = [];
    for ($i = 29; $i >= 0; $i--) {
        $dateStr = date('Y-m-d', strtotime("-$i days"));
        if (isset($logMap[$dateStr])) {
            $heatmap[] = [
                'date' => $dateStr,
                'completed' => $logMap[$dateStr]['completed'],
                'total' => $logMap[$dateStr]['total']
            ];
        } else {
            // Empty rest day
            $heatmap[] = [
                'date' => $dateStr,
                'completed' => 0,
                'total' => 0
            ];
        }
    }

    echo json_encode([
        "streak" => $currentStreak,
        "completedXP" => $todayXP,
        "heatmap" => $heatmap
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
