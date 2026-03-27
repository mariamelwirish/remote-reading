<?php
    include_once('connect.php');
    
    $query = "SELECT * FROM `infants`";
    $result = mysqli_query($conn, $query) or die(mysqli_error($conn));
    $rows = mysqli_num_rows($result);
    
?>