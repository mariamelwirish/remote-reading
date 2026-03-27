<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <title>Register – Remote Reading</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<?php
    require_once('connect.php');

    if (isset($_POST['username'])) {
        $username    = stripslashes($_REQUEST['username']);
        $username    = mysqli_real_escape_string($conn, $username);
        $password    = stripslashes($_REQUEST['password']);
        $password    = mysqli_real_escape_string($conn, $password);
        $parent_code = intval($_REQUEST['parent_code']);

        // Step 1: Check the parent code exists and hasn't been used
        $stmt = $conn->prepare("SELECT * FROM signup WHERE parent_code = ? AND is_used = 0");
        $stmt->bind_param("i", $parent_code);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows !== 1) {
            $error = "Invalid or already used parent code. Please check your code and try again.";
        } else {
            $signup_row = $result->fetch_assoc();
            $infant_id  = $signup_row['infant_id'];

            // Step 2: Check username isn't already taken
            $check = $conn->prepare("SELECT username FROM login WHERE username = ?");
            $check->bind_param("s", $username);
            $check->execute();
            $check->store_result();

            if ($check->num_rows > 0) {
                $error = "Username already exists. Please choose a different one.";
            } else {
                // Step 3: Insert into login table
                $stmt2 = $conn->prepare("INSERT INTO login (username, password, parent_id) VALUES (?, ?, ?)");
                // We'll use parent_code as a stand-in for parent_id link via signup
                // First get the parent_id from infantparent table
                $ip_stmt = $conn->prepare("SELECT infantparent_parent_id FROM infantparent WHERE infantparent_infant_id = ?");
                $ip_stmt->bind_param("i", $infant_id);
                $ip_stmt->execute();
                $ip_result = $ip_stmt->get_result();
                $ip_row    = $ip_result->fetch_assoc();
                $parent_id = $ip_row['infantparent_parent_id'];

                $stmt2->bind_param("ssi", $username, $password, $parent_id);

                if ($stmt2->execute()) {
                    // Step 4: Mark code as used
                    $mark = $conn->prepare("UPDATE signup SET is_used = 1 WHERE parent_code = ?");
                    $mark->bind_param("i", $parent_code);
                    $mark->execute();

                    // Step 5: Update parents table with username
                    $upd = $conn->prepare("UPDATE parents SET parent_username = ? WHERE parent_id = ?");
                    $upd->bind_param("si", $username, $parent_id);
                    $upd->execute();

                    $success = true;
                } else {
                    $error = "Registration failed. Please try again.";
                }
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
                        <h4 class="mb-0">Parent Sign Up</h4>
                        <small class="text-white-50">Remote Reading for Newborns</small>
                    </div>
                    <div class="card-body p-5 text-center">

                        <?php if (!empty($success)): ?>
                            <div class="alert alert-success">
                                <h5>Registered successfully!</h5>
                                <p>Click here to <a href="login.php">Login</a>.</p>
                            </div>
                        <?php elseif (!empty($error)): ?>
                            <div class="alert alert-danger"><?php echo $error; ?></div>
                        <?php endif; ?>

                        <?php if (empty($success)): ?>
                        <form method="post">
                            <div class="mb-3">
                                <input type="number" class="form-control" name="parent_code" placeholder="Parent Code (given by nurse)" required>
                            </div>
                            <div class="mb-3">
                                <input type="text" class="form-control" name="username" placeholder="Choose a Username" autofocus required>
                            </div>
                            <div class="mb-3">
                                <input type="password" class="form-control" name="password" placeholder="Choose a Password" required>
                            </div>
                            <div class="mb-3">
                                <button type="submit" class="btn btn-primary w-100">Register</button>
                            </div>
                            <p class="text-muted small">Already have an account? <a href="login.php">Login</a></p>
                        </form>
                        <?php endif; ?>

                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>