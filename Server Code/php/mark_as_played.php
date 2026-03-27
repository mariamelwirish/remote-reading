<?php
//marks a recording as played and inserts time it is played into the db.  
//file called at record.js

include_once('connect.php');

$recording_id = isset($_POST['recording_id']) ? (int)$_POST['recording_id'] : 0;
$infant_id = isset($_POST['infant_id']) ? (int)$_POST['infant_id'] : 0;
$recording_type = "old";

if ($recording_id <= 0 || $infant_id <= 0) {
    http_response_code(400);
    echo "Invalid recording or infant id";
    exit();
}

// Set the timezone to UTC
$timezone_utc = new DateTimeZone('UTC');

// Create a DateTime object with the current date and time in UTC
$date_utc = new DateTime('now', $timezone_utc);
// Add 5 seconds to the DateTime object
$date_utc->add(new DateInterval('PT2S'));
// Set the timezone to Eastern Standard Time (EST)
$timezone_est = new DateTimeZone('America/New_York');
$date_est = $date_utc->setTimezone($timezone_est);

// Format the date and time as a string
$date_str = $date_est->format('Y-m-d H:i:s');

$stmt = $conn->prepare("INSERT INTO `recording_schedule`(recording_id, scheduled_time, infant_id) VALUES(?, ?, ?)");
$stmt->bind_param("isi", $recording_id, $date_str, $infant_id);
$stmt->execute();

$stmt = $conn->prepare("UPDATE recordings SET is_played = 1, date_played = ?, recording_type = ? WHERE recording_id = ? ");
$stmt->bind_param("ssi", $date_str, $recording_type, $recording_id);
$stmt->execute();

?>