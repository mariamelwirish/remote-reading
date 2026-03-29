<?php
//marks a recording as played and inserts time it is played into the db.  
//file called at record.js

include_once('connect.php');

$recording_id = isset($_POST['recording_id']) ? (int)$_POST['recording_id'] : 0;
$scheduled_time = $_POST['scheduled_time'] ?? '';
$infant_id = isset($_POST['infant_id']) ? (int)$_POST['infant_id'] : 0;

if ($recording_id <= 0 || $infant_id <= 0 || $scheduled_time === '') {
    http_response_code(400);
    echo "Invalid schedule payload";
    exit();
}

// Upsert schedule row for this recording and infant.
$check = $conn->prepare("SELECT schedule_id FROM recording_schedule WHERE recording_id = ? LIMIT 1");
$check->bind_param("i", $recording_id);
$check->execute();
$existing = $check->get_result();

if ($existing && $existing->num_rows > 0) {
    $stmt = $conn->prepare("UPDATE recording_schedule SET scheduled_time = ?, infant_id = ? WHERE recording_id = ?");
    $stmt->bind_param("sii", $scheduled_time, $infant_id, $recording_id);
} else {
    $stmt = $conn->prepare("INSERT INTO recording_schedule (recording_id, scheduled_time, infant_id) VALUES (?, ?, ?)");
    $stmt->bind_param("isi", $recording_id, $scheduled_time, $infant_id);
}
$stmt->execute();

// Scheduling should not mark as played; keep it in "new" until play-now happens.
$new_recording = 'new';
$played_zero = 0;
$null_date_played = null;
$stmt_update = $conn->prepare("UPDATE recordings SET recording_type = ?, is_played = ?, date_played = ? WHERE recording_id = ?");
$stmt_update->bind_param("sisi", $new_recording, $played_zero, $null_date_played, $recording_id);
$stmt_update->execute();

$check->close();
$stmt->close();
$stmt_update->close();

echo "OK";


?>