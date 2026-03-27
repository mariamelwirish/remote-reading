<?php
//delete a recording
include_once('connect.php');

$recording_id = $_POST['recording_id'];

$stmt = $conn->prepare("DELETE FROM `recordings` WHERE `recording_id` = ?");
$stmt->bind_param("i", $recording_id);
$stmt->execute();

?>