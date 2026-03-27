<?php
    error_reporting(E_ALL);
    ini_set('display_errors', 1);

    require_once __DIR__ . '/../vendor/autoload.php';

    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();

    $host = $_ENV['DB_HOST'];
    $user = $_ENV['DB_USER'];
    $pass = $_ENV['DB_PASS'];
    $db_name = $_ENV['DB_NAME'];

    $conn = new mysqli($host, $user, $pass, $db_name);
    if($conn->connect_error) {
        die('Connection Error: '. $conn->connect_error);
    }
?>