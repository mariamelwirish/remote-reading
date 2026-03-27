<?php
include_once('connect.php');
if (!empty($_POST)) {
    $requested_name = $_POST['recording-name'];
    $requested_message = $_POST['recording-message'];
    $infant_id = $_POST['infant_id'];
    if($_POST['datetime-input'] === '') {
        $requested_date = NULL;
    }
    else {
        $requested_date = $_POST['datetime-input'];
    }
    
    
}

if($_FILES) {
    $data = $_FILES;
    var_dump($data);
    $name = $data['audio_blob']['name'];
    $date = date("Y-m-d h:i:s");
    echo($date), "<br>";
    $file = $data['audio_blob']['tmp_name'];
    if(file_exists($file)) {
        echo "EXISTS";

        $recording = file_get_contents($file);
        $recording = bin2hex($recording);
        
        $query    = "INSERT into `recordings` (recording_name, recording_date, recording, requested_name, requested_message, requested_time,infant_id) 
                     VALUES ('$name', '$date', '$recording', '$requested_name', '$requested_message', '$requested_date','$infant_id')";
        $result   = mysqli_query($conn, $query);
        echo "SUCCESSFULLY UPLOADED";
    }
    else {
        echo "ERROR";
    }
    
}


?>