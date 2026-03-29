<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
	<title>Nurse Login</title>
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <?php
        include_once('connect.php');
        session_start();

        $error = '';
        // When form submitted, check and create user session.
        if (isset($_POST['username'])) {
            $username = stripslashes($_REQUEST['username']);
            $username = mysqli_real_escape_string($conn, $username);
            $password = stripslashes($_REQUEST['password']);
            $password = mysqli_real_escape_string($conn, $password);

            $has_nurse_id = false;
            $column_check = $conn->query("SHOW COLUMNS FROM infants LIKE 'nurse_id'");
            if ($column_check && $column_check->num_rows === 1) {
                $has_nurse_id = true;
            }

            if (!$has_nurse_id) {
                $error = "Nurse login is not ready yet. Run: ALTER TABLE infants ADD COLUMN nurse_id INT DEFAULT NULL;";
            } else {

            // Validate nurse credentials only. Room selection happens on the nurse dashboard.
            $stmt = $conn->prepare(
                "SELECT nl.nurse_id, n.nurse_first_name, n.nurse_last_name
                 FROM nurse_login nl
                 INNER JOIN nurses n ON n.nurse_id = nl.nurse_id
                 WHERE nl.nurse_username = ?
                   AND nl.nurse_password = ?
                 LIMIT 1"
            );
            $stmt->bind_param("ss", $username, $password);
            $stmt->execute();
            $result = $stmt->get_result();
            $rows = $result->num_rows;
            $fetcharray = $result->fetch_assoc();
           
            if ($rows == 1) {
                $_SESSION['username'] = $username;
                $_SESSION['nurse_username'] = $username;
                $_SESSION['nurse_id'] = (int)$fetcharray['nurse_id'];
                $_SESSION['nurse_first_name'] = $fetcharray['nurse_first_name'];
                $_SESSION['nurse_last_name'] = $fetcharray['nurse_last_name'];
                header("Location: nurse-rooms.php");
                exit();
                
 
            } else {
                $error = "Invalid nurse username or password.";
            }

            $stmt->close();
            }
            }
    ?>
    <section class="vh-100">
        <div class="container h-100">
            <div class="row d-flex justify-content-center align-items-center h-100">
                <div class="col-12 col-md-6 col-lg-5 col-xl-4">
                    <div class="card shadow" style="border-radius: 1rem;">
                        <div class="card-header text-center p-2">
                            <h4 class="card-title">Nurse Sign In</h4>
                        </div>
                        <div class="card-body p-5 text-center">
                            <?php if ($error): ?>
                                <div class="alert alert-danger"><?php echo $error; ?></div>
                            <?php endif; ?>
                            <form method="post">
                                <div class="mb-3">
                                    <input type="text" class="form-control" id="username" name="username" placeholder="Username" autofocus="true" required>
                                </div>
                                <div class="mb-3">
                                    <input type="password" class="form-control" id="password" name="password" placeholder="Password" required>
                                </div>
                                <div class="mb-3">
                                    <button type="submit" class="btn btn-primary">Login</button>
                                </div>
                                <br>
                                <p>
                                    Nurse accounts are created by admin.<br>
                                    Log In for Parents <a href="login.php">Log In</a>
                                </p>
                                
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    <?php ?>
</body>
</html>