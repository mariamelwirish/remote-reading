<?php
include_once('connect.php');

$requested_name = '';
$requested_message = '';
$infant_id = 0;
$requested_date = NULL;

if (!empty($_POST)) {
    $requested_name = isset($_POST['recording-name']) ? $_POST['recording-name'] : '';
    $requested_message = isset($_POST['recording-message']) ? $_POST['recording-message'] : '';
    $infant_id = isset($_POST['infant_id']) ? (int)$_POST['infant_id'] : 0;
    
    if(!empty($_POST['datetime-input']) && $_POST['datetime-input'] !== '') {
        $requested_date = $_POST['datetime-input'];
    }
}

if(!empty($_FILES) && isset($_FILES['audio_blob'])) {
    $data = $_FILES;
    $name = $data['audio_blob']['name'];
    $date = date("Y-m-d h:i:s");
    $file = $data['audio_blob']['tmp_name'];

    if(file_exists($file) && $infant_id > 0) {
        $recording = file_get_contents($file);
        $recording = bin2hex($recording);

        // Use prepared statement to prevent SQL injection
        $stmt = $conn->prepare("INSERT into `recordings` (recording_name, recording_date, recording, requested_name, requested_message, requested_time, infant_id) 
                               VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        if ($stmt === false) {
            echo "ERROR: " . $conn->error;
        } else {
            $stmt->bind_param("ssssssi", $name, $date, $recording, $requested_name, $requested_message, $requested_date, $infant_id);
            $result = $stmt->execute();
            echo $result ? "SUCCESS" : "ERROR: " . $stmt->error;
            $stmt->close();
        }
    }
    else {
        echo "ERROR";
    }
}

?>