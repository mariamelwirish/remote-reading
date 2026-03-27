<?php
//called at dashboard-parent.php line 54
include_once("connect.php");
$stmt = $conn->prepare("SELECT recordings.recording_id AS recording_id, MAX(recordings.requested_name) AS requested_name, MAX(recordings.is_played) AS is_played, MAX(recordings.date_played) AS date_played, MAX(recording_schedule.scheduled_time) AS scheduled_time
                        FROM recordings
                        LEFT JOIN recording_schedule
                        ON recordings.recording_id = recording_schedule.recording_id
                        GROUP BY recordings.recording_id
                        ORDER BY recording_id DESC;"
                        );
$stmt->execute();
$result = $stmt->get_result();
?>