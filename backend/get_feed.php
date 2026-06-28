<?php
// ========================================================
// GET SOCIAL FEED API (PHP / MYSQL)
// ========================================================
require_once 'config.php';

try {
    // Query active feed posts joined with users who made them
    $stmt = $conn->prepare("
        SELECT 
            fp.id,
            u.username,
            u.avatar_url,
            fp.content,
            fp.created_at
        FROM feed_posts fp
        INNER JOIN users u ON fp.user_id = u.id
        ORDER BY fp.created_at DESC
        LIMIT 10
    ");
    $stmt->execute();
    $rawFeed = $stmt->fetchAll();

    $feed = [];
    foreach ($rawFeed as $row) {
        $feed[] = [
            'id' => 'f' . $row['id'],
            'friendName' => $row['username'],
            'avatar' => $row['avatar_url'] ?: "https://api.dicebear.com/7.x/adventurer/svg?seed=" . $row['username'],
            'action' => str_replace($row['username'] . ' ', '', $row['content']), // remove name prefix since it is displayed separately
            'reactionCount' => rand(1, 10), // mock static count for demo aesthetics
            'hasReacted' => false
        ];
    }

    echo json_encode($feed);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
