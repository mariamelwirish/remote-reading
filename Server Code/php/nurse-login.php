<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
	<title>Login</title>
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <?php
        include_once('connect.php');
        session_start();
        // When form submitted, check and create user session.
        if (isset($_POST['username'])) {
            $username = stripslashes($_REQUEST['username']);
            $username = mysqli_real_escape_string($conn, $username);
            $password = stripslashes($_REQUEST['password']);
            $password = mysqli_real_escape_string($conn, $password);
            $room_number = stripslashes($_REQUEST['room']);
            $room_number = mysqli_real_escape_string($conn, $room_number);
            // Check user is exist in the database
            $query    = "SELECT * FROM `nurse_login` JOIN `infants` WHERE nurse_username='$username'
                        AND nurse_password='$password' AND room_number='$room_number'";
            $result = mysqli_query($conn, $query) or die(mysqli_error($conn));
            $rows = mysqli_num_rows($result);
            $fetcharray = $result->fetch_assoc();
           
            if ($rows == 1) {
                $_SESSION['username'] = $username;
                $_SESSION['room'] = $room_number;
                $_SESSION['infant_first_name'] = $fetcharray['infant_first_name'];
                $_SESSION['infant_last_name'] = $fetcharray['infant_last_name'];
                $_SESSION['infant_id'] = $fetcharray['infant_id'];
                header("Location: get-recordings.php");
                
 
            } else {
                echo '<div class="card p-5 shadow" style="border-radius: 1rem;"> 
                <div class="card-body">
                    <h5 class="card-title">Incorrect Username/password.</h5>
                    <p>Click here to <a href="nurse-login.php">Login</a> again.</p>
                </div>
                </div>';
            }
        } else {
    ?>
    <section class="vh-100">
        <div class="container h-100">
            <div class="row d-flex justify-content-center align-items-center h-100">
                <div class="col-12 col-md-6 col-lg-5 col-xl-4">
                    <div class="card shadow" style="border-radius: 1rem;">
                        <div class="card-header text-center p-2">
                            <h4 class="card-title">Sign In</h4>
                        </div>
                        <div class="card-body p-5 text-center">
                            <form method="post">
                                <div class="mb-3">
                                    <!-- <label for="username" class="form-label">Username</label> -->
                                    <input type="text" class="form-control" id="username" name="username" placeholder="Username" autofocus="true" required>
                                </div>
                                <div class="mb-3">
                                    <!-- <label for="password" class="form-label">Password</label> -->
                                    <input type="password" class="form-control" id="password" name="password" placeholder="Password" required>
                                </div>
                                <div class="mb-3">
                                    <!-- <label for="room number" class="form-label">Password</label> -->
                                    <input type="room" class="form-control" id="room" name="room" placeholder="Room Number" required>
                                </div>
                                <div class="mb-3">
                                    <button type="submit" class="btn btn-primary">Login</button>
                                </div>
                                <br>
                                <p>
                                    Don't have an account? <a href="register.php">Sign up</a><br>
                                    Log In for Parents <a href="login.php">Log In</a>
                                </p>
                                
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    <?php
        }
    ?>
</body>
</html>