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


// Set the timezone to UTC
$timezone_utc = new DateTimeZone('UTC');

// Create a DateTime object with the current date and time in UTC
$date_utc = new DateTime('now', $timezone_utc);

// Set the timezone to Eastern Standard Time (EST)
$timezone_est = new DateTimeZone('America/New_York');
$date_est = $date_utc->setTimezone($timezone_est);

// Format the date and time as a string
$date_str = $date_est->format('Y-m-d H:i:s');


$stmt = $conn->prepare("INSERT INTO `recording_schedule`(recording_id, scheduled_time,infant_id) VALUES(?, ?,?)");
$stmt->bind_param("isi", $recording_id, $scheduled_time,$infant_id);
$stmt->execute();

$old_recording = 'old';

$stmt = $conn->prepare("UPDATE `recordings` SET `recording_type` = ?,`date_played`=? WHERE `recording_id` =  ?");
$stmt->bind_param("ssi", $old_recording, $scheduled_time, $recording_id);
$stmt->execute();


?>