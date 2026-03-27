<?php
    session_start();
    setcookie(session_name(),'',100);
    session_unset();
    // Destroy session
    if(session_destroy()) {
        $_SESSION = array();
        // Redirecting To Home Page
        header("Location: login.php");
    }
?>