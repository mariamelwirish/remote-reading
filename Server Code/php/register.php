<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
	<title>Register</title>
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <?php
        require_once('connect.php');
        // When form submitted, insert values into the database.
        if (isset($_REQUEST['username'])) {
            // removes backslashes
            $username = stripslashes($_REQUEST['username']);
            //escapes special characters in a string
            $username = mysqli_real_escape_string($conn, $username);
            // $email    = stripslashes($_REQUEST['email']);
            // $email    = mysqli_real_escape_string($con, $email);
            $password = stripslashes($_REQUEST['password']);
            $password = mysqli_real_escape_string($conn, $password);
            // $create_datetime = date("Y-m-d H:i:s");
            $query    = "INSERT into `login` (username, password)
                        VALUES ('$username', '$password')";
            $result   = mysqli_query($conn, $query);
            if ($result) {
                echo '<div class="card p-5 shadow" style="border-radius: 1rem;"> 
                    <div class="card-body">
                        <h5 class="card-title">You are registered successfully.</h5>
                        <p>Click here to <a href="login.php">Login</a> again.</p>
                    </div>
                    </div>';

            } else {
                echo '<div class="card p-5 shadow" style="border-radius: 1rem;"> 
                    <div class="card-body">
                        <h5 class="card-title">Username already exists.</h5>
                        <p>Click here to <a href="register.php">register</a> again.</p>
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
                            <h4 class="card-title">Sign up</h4>
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
                                    <button type="submit" class="btn btn-primary">Register</button>
                                </div>
                                <p>
                                    Click here to <a href="login.php">Login</a>
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