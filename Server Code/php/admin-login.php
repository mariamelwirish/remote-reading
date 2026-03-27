<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <title>Admin Login – Remote Reading</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background-color: #f0f4f8; }
        .card { border-radius: 1rem; }
        .card-header { background-color: #2c3e50; color: white; border-radius: 1rem 1rem 0 0 !important; }
        .btn-primary { background-color: #2c3e50; border-color: #2c3e50; }
        .btn-primary:hover { background-color: #1a252f; border-color: #1a252f; }
        .badge-admin { background-color: #e74c3c; color: white; font-size: 0.7rem; padding: 3px 8px; border-radius: 10px; vertical-align: middle; }
    </style>
</head>
<body>
<?php
    include_once('connect.php');
    session_start();

    if (isset($_POST['username'])) {
        $username = stripslashes($_REQUEST['username']);
        $username = mysqli_real_escape_string($conn, $username);
        $password = stripslashes($_REQUEST['password']);
        $password = mysqli_real_escape_string($conn, $password);

        $stmt = $conn->prepare("SELECT * FROM admins WHERE admin_username = ? AND admin_password = ?");
        $stmt->bind_param("ss", $username, $password);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $_SESSION['admin'] = $username;
            header("Location: admin-dashboard.php");
            exit();
        } else {
            $error = "Incorrect username or password.";
        }
    }
    if (isset($error)) {
        echo '<div class="container mt-5">
                <div class="row justify-content-center">
                    <div class="col-md-5">
                        <div class="card p-4 shadow">
                            <div class="card-body">
                                <h5 class="card-title text-danger">' . $error . '</h5>
                                <p>Click here to <a href="admin-login.php">try again</a>.</p>
                            </div>
                        </div>
                    </div>
                </div>
              </div>';
    } else {
?>
<section class="vh-100">
    <div class="container h-100">
        <div class="row d-flex justify-content-center align-items-center h-100">
            <div class="col-12 col-md-6 col-lg-5 col-xl-4">
                <div class="card shadow">
                    <div class="card-header text-center p-3">
                        <h4 class="mb-0">
                            Admin Panel
                            <span class="badge-admin ms-2">ADMIN</span>
                        </h4>
                        <small class="text-white-50">Remote Reading for Newborns</small>
                    </div>
                    <div class="card-body p-5 text-center">
                        <form method="post">
                            <div class="mb-3">
                                <input type="text" class="form-control" name="username" placeholder="Nurse Username" autofocus required>
                            </div>
                            <div class="mb-3">
                                <input type="password" class="form-control" name="password" placeholder="Password" required>
                            </div>
                            <div class="mb-3">
                                <button type="submit" class="btn btn-primary w-100">Login</button>
                            </div>
                            <p class="text-muted small">This portal is for authorized staff only.</p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
<?php } ?>
</body>
</html>