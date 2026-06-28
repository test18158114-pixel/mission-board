<?php
// ========================================================
// GET TODAY'S MISSIONS API (PHP / MYSQL)
// ========================================================
require_once 'config.php';

try {
    // 1. Resolve User ID (Mocking "You" user ID = 1 for simple deployment)
    $userId = 1;
    $todayStr = date('Y-m-d');

    // 2. Fetch active mission templates for this user
    $stmt = $conn->prepare("SELECT * FROM missions WHERE user_id = :user_id AND is_archived = 0");
    $stmt->execute(['user_id' => $userId]);
    $templates = $stmt->fetchAll();

    // 3. For each active mission, ensure a daily log entry exists for today
    foreach ($templates as $tmpl) {
        $logStmt = $conn->prepare("SELECT id FROM mission_logs WHERE mission_id = :mission_id AND date = :date");
        $logStmt->execute([
            'mission_id' => $tmpl['id'],
            'date' => $todayStr
        ]);
        $logExists = $logStmt->fetch();

        // If no daily log exists for this template today, create a pending log
        if (!$logExists) {
            // Assign default XP based on type
            $xpAwarded = 20;
            if ($tmpl['type'] === 'workout') {
                $xpAwarded = 100;
            } elseif ($tmpl['type'] === 'numeric' && $tmpl['unit'] === 'g') {
                $xpAwarded = 30;
            }

            $insertStmt = $conn->prepare("
                INSERT INTO mission_logs (user_id, mission_id, date, state, current_value, elapsed_seconds, xp_awarded) 
                VALUES (:user_id, :mission_id, :date, 'pending', 0.00, 0, :xp_awarded)
            ");
            $insertStmt->execute([
                'user_id' => $userId,
                'mission_id' => $tmpl['id'],
                'date' => $todayStr,
                'xp_awarded' => $xpAwarded
            ]);
        }
    }

    // 4. Query joint missions and daily logs for today to output
    $queryStmt = $conn->prepare("
        SELECT 
            m.id as missionId,
            ml.id as id,
            m.title,
            m.type,
            m.category,
            m.priority,
            m.color_label as colorLabel,
            m.icon,
            ml.state,
            m.is_pinned as isPinned,
            ml.current_value as currentVal,
            m.target_value as targetVal,
            m.unit,
            m.timer_duration as duration,
            ml.elapsed_seconds as elapsed
        FROM missions m
        INNER JOIN mission_logs ml ON m.id = ml.mission_id
        WHERE m.user_id = :user_id AND ml.date = :date AND m.is_archived = 0
    ");
    
    $queryStmt->execute([
        'user_id' => $userId,
        'date' => $todayStr
    ]);
    
    $rawMissions = $queryStmt->fetchAll();

    // 5. Format results to match frontend data expectations
    $formattedMissions = [];
    foreach ($rawMissions as $row) {
        $isCompleted = ($row['state'] === 'completed');
        
        $mission = [
          'id' => $row['id'],
          'missionId' => $row['missionId'],
          'title' => $row['title'],
          'type' => $row['type'],
          'category' => $row['category'],
          'priority' => $row['priority'],
          'isCompleted' => $isCompleted,
          'isPinned' => (bool)$row['isPinned'],
          'colorLabel' => $row['colorLabel'] ?? 'from-zinc-500 to-zinc-600',
          'icon' => $row['icon'],
          'progress' => [
            'current' => (float)$row['currentVal'],
            'target' => (float)$row['targetVal'],
            'unit' => $row['unit'] ?? ''
          ]
        ];

        if ($row['type'] === 'timer') {
            $mission['timer'] = [
                'duration' => (int)$row['duration'],
                'elapsed' => (int)$row['elapsed'],
                'isRunning' => false
            ];
        }

        $formattedMissions[] = $mission;
    }

    echo json_encode($formattedMissions);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
