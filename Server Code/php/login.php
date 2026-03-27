<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <title>Login – Remote Reading</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
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

        // Step 1: Check credentials in login table
        $stmt = $conn->prepare("SELECT * FROM login WHERE username = ? AND password = ?");
        $stmt->bind_param("ss", $username, $password);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows !== 1) {
            $error = "Incorrect username or password.";
        } else {
            $login_row = $result->fetch_assoc();
            $parent_id = $login_row['parent_id'];

            // Step 2: Get the infant linked to this parent
            $stmt2 = $conn->prepare("SELECT infantparent_infant_id FROM infantparent WHERE infantparent_parent_id = ?");
            $stmt2->bind_param("i", $parent_id);
            $stmt2->execute();
            $result2 = $stmt2->get_result();

            if ($result2->num_rows !== 1) {
                $error = "No infant linked to your account. Please contact your nurse.";
            } else {
                $row = $result2->fetch_assoc();
                $_SESSION['username']  = $username;
                $_SESSION['parent_id'] = $parent_id;
                $_SESSION['infant_id'] = $row['infantparent_infant_id'];
                header("Location: dashboard-parent.php");
                exit();
            }
        }
    }
?>

<section class="vh-100">
    <div class="container h-100">
        <div class="row d-flex justify-content-center align-items-center h-100">
            <div class="col-12 col-md-6 col-lg-5 col-xl-4">
                <div class="card shadow" style="border-radius: 1rem;">
                    <div class="card-header text-center p-3" style="background-color: #2c3e50; color: white; border-radius: 1rem 1rem 0 0;">
                        <h4 class="mb-0">Parent Login</h4>
                        <small class="text-white-50">Remote Reading for Newborns</small>
                    </div>
                    <div class="card-body p-5 text-center">

                        <?php if (!empty($error)): ?>
                            <div class="alert alert-danger">
                                <?php echo $error; ?>
                                <br><a href="login.php">Try again</a>
                            </div>
                        <?php endif; ?>

                        <form method="post">
                            <div class="mb-3">
                                <input type="text" class="form-control" name="username" placeholder="Username" autofocus required>
                            </div>
                            <div class="mb-3">
                                <input type="password" class="form-control" name="password" placeholder="Password" required>
                            </div>
                            <div class="mb-3">
                                <button type="submit" class="btn btn-primary w-100">Login</button>
                            </div>
                            <p class="text-muted small">
                                Don't have an account? <a href="register.php">Sign up</a><br>
                                Nurse? <a href="nurse-login.php">Login here</a>
                            </p>
                        </form>

                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>