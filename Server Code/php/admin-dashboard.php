<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <title>Admin Dashboard – Remote Reading</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background-color: #f0f4f8; }
        .navbar { background-color: #2c3e50; }
        .navbar-brand, .nav-link { color: white !important; }
        .section-card { border-radius: 1rem; margin-bottom: 2rem; }
        .section-card .card-header { background-color: #2c3e50; color: white; border-radius: 1rem 1rem 0 0 !important; }
        .badge-code { background-color: #e74c3c; color: white; font-size: 1rem; padding: 5px 12px; border-radius: 8px; letter-spacing: 2px; }
        .table thead { background-color: #2c3e50; color: white; }
    </style>
</head>
<body>

<?php
    include_once('connect.php');
    session_start();

    // Protect this page — only admins can access it
    if (!isset($_SESSION['admin'])) {
        header("Location: admin-login.php");
        exit();
    }

    $success = '';
    $error   = '';
    $schema_warning = '';

    // Ensure nurse assignment column exists to avoid runtime SQL errors on older schemas.
    $has_nurse_id = false;
    $column_check = $conn->query("SHOW COLUMNS FROM infants LIKE 'nurse_id'");
    if ($column_check && $column_check->num_rows === 1) {
        $has_nurse_id = true;
    } else {
        // Best-effort migration for environments that still use the old schema.
        if ($conn->query("ALTER TABLE infants ADD COLUMN nurse_id INT DEFAULT NULL")) {
            $has_nurse_id = true;
        } else {
            $schema_warning = "Database is missing infants.nurse_id. Run migration: ALTER TABLE infants ADD COLUMN nurse_id INT DEFAULT NULL;";
        }
    }

    // Create Infant
    if (isset($_POST['create_infant'])) {
        $infant_id    = intval($_POST['infant_id']);
        $first_name   = mysqli_real_escape_string($conn, trim($_POST['infant_first_name']));
        $last_name    = mysqli_real_escape_string($conn, trim($_POST['infant_last_name']));
        $room_number  = intval($_POST['room_number']);

        $stmt = $conn->prepare("INSERT INTO infants (infant_id, infant_first_name, infant_last_name, room_number) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("issi", $infant_id, $first_name, $last_name, $room_number);

        if ($stmt->execute()) {
            $success = "Infant created successfully.";
        } else {
            $error = "Error creating infant: " . $stmt->error;
        }
        $stmt->close();
    }

    // Create Parent + generate code + link to infant
    if (isset($_POST['create_parent'])) {
        $first_name = mysqli_real_escape_string($conn, trim($_POST['parent_first_name']));
        $last_name  = mysqli_real_escape_string($conn, trim($_POST['parent_last_name']));
        $infant_id  = intval($_POST['parent_infant_id']);

        // Auto-generate a unique 6-digit parent code
        do {
            $parent_code = rand(100000, 999999);
            $check = $conn->query("SELECT parent_code FROM signup WHERE parent_code = $parent_code");
        } while ($check->num_rows > 0);

        // Insert into parents table
        $stmt = $conn->prepare("INSERT INTO parents (parent_first_name, parent_last_name) VALUES (?, ?)");
        $stmt->bind_param("ss", $first_name, $last_name);
        $stmt->execute();
        $parent_id = $stmt->insert_id;
        $stmt->close();

        // Link parent to infant in infantparent table
        $stmt = $conn->prepare("INSERT INTO infantparent (infantparent_infant_id, infantparent_parent_id) VALUES (?, ?)");
        $stmt->bind_param("ii", $infant_id, $parent_id);
        $stmt->execute();
        $stmt->close();

        // Update infants table with parent_id
        $stmt = $conn->prepare("UPDATE infants SET parent_id = ? WHERE infant_id = ?");
        $stmt->bind_param("ii", $parent_id, $infant_id);
        $stmt->execute();
        $stmt->close();

        // Insert into signup table
        $stmt = $conn->prepare("INSERT INTO signup (parent_code, infant_id, parent_first_name, parent_last_name) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("iiss", $parent_code, $infant_id, $first_name, $last_name);

        if ($stmt->execute()) {
            $success = "Parent created. Their code is: <span class='badge-code'>$parent_code</span> — give this to them to register.";
        } else {
            $error = "Error creating parent: " . $stmt->error;
        }
        $stmt->close();
    }

    // Create Nurse account
    if (isset($_POST['create_nurse'])) {
        if (!$has_nurse_id) {
            $error = "Cannot create nurse assignments until database migration is applied.";
        } else {
        $first_name = mysqli_real_escape_string($conn, trim($_POST['nurse_first_name']));
        $last_name  = mysqli_real_escape_string($conn, trim($_POST['nurse_last_name']));
        $username   = mysqli_real_escape_string($conn, trim($_POST['nurse_username']));
        $password   = mysqli_real_escape_string($conn, trim($_POST['nurse_password']));

        if ($first_name === '' || $last_name === '' || $username === '' || $password === '') {
            $error = "All nurse fields are required.";
        } else {
            $check_stmt = $conn->prepare("SELECT nurse_username FROM nurse_login WHERE nurse_username = ?");
            $check_stmt->bind_param("s", $username);
            $check_stmt->execute();
            $check_result = $check_stmt->get_result();

            if ($check_result->num_rows > 0) {
                $error = "Nurse username already exists. Please choose another one.";
            } else {
                $stmt = $conn->prepare("INSERT INTO nurses (nurse_first_name, nurse_last_name) VALUES (?, ?)");
                $stmt->bind_param("ss", $first_name, $last_name);

                if ($stmt->execute()) {
                    $nurse_id = $stmt->insert_id;
                    $stmt->close();

                    $stmt = $conn->prepare("INSERT INTO nurse_login (nurse_username, nurse_password, nurse_id) VALUES (?, ?, ?)");
                    $stmt->bind_param("ssi", $username, $password, $nurse_id);

                    if ($stmt->execute()) {
                        $success = "Nurse account created successfully.";
                    } else {
                        $error = "Error creating nurse login: " . $stmt->error;
                    }
                } else {
                    $error = "Error creating nurse: " . $stmt->error;
                }

                if (isset($stmt) && $stmt) {
                    $stmt->close();
                }
            }

            $check_stmt->close();
        }
        }
    }

    // Assign infant to nurse
    if (isset($_POST['assign_nurse'])) {
        if (!$has_nurse_id) {
            $error = "Cannot assign nurse until database migration is applied.";
        } else {
        $infant_id = intval($_POST['assign_infant_id']);
        $nurse_id  = intval($_POST['assign_nurse_id']);

        if ($infant_id <= 0 || $nurse_id <= 0) {
            $error = "Please select a valid infant and nurse.";
        } else {
            $stmt = $conn->prepare("UPDATE infants SET nurse_id = ? WHERE infant_id = ?");
            $stmt->bind_param("ii", $nurse_id, $infant_id);

            if ($stmt->execute() && $stmt->affected_rows >= 0) {
                $success = "Infant assigned to nurse successfully.";
            } else {
                $error = "Error assigning nurse: " . $stmt->error;
            }
            $stmt->close();
        }
        }
    }

    // FETCH all infants with their linked parents
    if ($has_nurse_id) {
        $infants_query = "
            SELECT i.infant_id, i.infant_first_name, i.infant_last_name, i.room_number,
                   p.parent_first_name, p.parent_last_name,
                   s.parent_code, s.is_used,
                   n.nurse_first_name, n.nurse_last_name
            FROM infants i
            LEFT JOIN parents p ON i.parent_id = p.parent_id
            LEFT JOIN signup s ON i.infant_id = s.infant_id
            LEFT JOIN nurses n ON i.nurse_id = n.nurse_id
            ORDER BY i.infant_id DESC
        ";
    } else {
        $infants_query = "
            SELECT i.infant_id, i.infant_first_name, i.infant_last_name, i.room_number,
                   p.parent_first_name, p.parent_last_name,
                   s.parent_code, s.is_used,
                   NULL AS nurse_first_name, NULL AS nurse_last_name
            FROM infants i
            LEFT JOIN parents p ON i.parent_id = p.parent_id
            LEFT JOIN signup s ON i.infant_id = s.infant_id
            ORDER BY i.infant_id DESC
        ";
    }
    $infants_result = mysqli_query($conn, $infants_query);

    // FETCH all infants for the parent dropdown
    $all_infants = mysqli_query($conn, "SELECT infant_id, infant_first_name, infant_last_name FROM infants ORDER BY infant_id");

    // FETCH all infants for nurse assignment dropdown
    $all_infants_assign = mysqli_query($conn, "SELECT infant_id, infant_first_name, infant_last_name FROM infants ORDER BY infant_id");

    // FETCH all nurses for assignment and visibility
    $all_nurses = $has_nurse_id
        ? mysqli_query($conn, "SELECT nurse_id, nurse_first_name, nurse_last_name FROM nurses ORDER BY nurse_first_name, nurse_last_name")
        : false;
?>

<!-- Navbar -->
<nav class="navbar navbar-expand-lg mb-4">
    <div class="container">
        <a class="navbar-brand fw-bold" href="#">🏥 Remote Reading — Admin</a>
        <div class="ms-auto">
            <span class="text-white me-3">Logged in as <strong><?php echo $_SESSION['admin']; ?></strong></span>
            <a href="logout.php" class="btn btn-outline-light btn-sm">Logout</a>
        </div>
    </div>
</nav>

<div class="container">

    <!-- Alerts -->
    <?php if ($success): ?>
        <div class="alert alert-success"><?php echo $success; ?></div>
    <?php endif; ?>
    <?php if ($error): ?>
        <div class="alert alert-danger"><?php echo $error; ?></div>
    <?php endif; ?>
    <?php if ($schema_warning): ?>
        <div class="alert alert-warning"><?php echo $schema_warning; ?></div>
    <?php endif; ?>

    <div class="row">

        <!-- Create Infant -->
        <div class="col-md-6">
            <div class="card section-card shadow">
                <div class="card-header p-3">
                    <h5 class="mb-0"> Add Infant</h5>
                </div>
                <div class="card-body p-4">
                    <form method="post">
                        <div class="mb-3">
                            <label class="form-label">Infant ID</label>
                            <input type="number" class="form-control" name="infant_id" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">First Name</label>
                            <input type="text" class="form-control" name="infant_first_name" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Last Name</label>
                            <input type="text" class="form-control" name="infant_last_name" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Room Number</label>
                            <input type="number" class="form-control" name="room_number" required>
                        </div>
                        <button type="submit" name="create_infant" class="btn btn-primary w-100">Create Infant</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Create Parent -->
        <div class="col-md-6">
            <div class="card section-card shadow">
                <div class="card-header p-3">
                    <h5 class="mb-0"> Add Parent</h5>
                </div>
                <div class="card-body p-4">
                    <form method="post">
                        <div class="mb-3">
                            <label class="form-label">First Name</label>
                            <input type="text" class="form-control" name="parent_first_name" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Last Name</label>
                            <input type="text" class="form-control" name="parent_last_name" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Link to Infant</label>
                            <select class="form-select" name="parent_infant_id" required>
                                <option value="">-- Select Infant --</option>
                                <?php while ($inf = mysqli_fetch_assoc($all_infants)): ?>
                                    <option value="<?php echo $inf['infant_id']; ?>">
                                        #<?php echo $inf['infant_id']; ?> — <?php echo $inf['infant_first_name'] . ' ' . $inf['infant_last_name']; ?>
                                    </option>
                                <?php endwhile; ?>
                            </select>
                        </div>
                        <button type="submit" name="create_parent" class="btn btn-primary w-100">Create Parent & Generate Code</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Create Nurse -->
        <div class="col-md-6">
            <div class="card section-card shadow">
                <div class="card-header p-3">
                    <h5 class="mb-0"> Add Nurse</h5>
                </div>
                <div class="card-body p-4">
                    <form method="post">
                        <div class="mb-3">
                            <label class="form-label">First Name</label>
                            <input type="text" class="form-control" name="nurse_first_name" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Last Name</label>
                            <input type="text" class="form-control" name="nurse_last_name" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Username</label>
                            <input type="text" class="form-control" name="nurse_username" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Password</label>
                            <input type="password" class="form-control" name="nurse_password" required>
                        </div>
                        <button type="submit" name="create_nurse" class="btn btn-primary w-100">Create Nurse</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Assign Nurse -->
        <div class="col-md-6">
            <div class="card section-card shadow">
                <div class="card-header p-3">
                    <h5 class="mb-0"> Assign Infant To Nurse</h5>
                </div>
                <div class="card-body p-4">
                    <form method="post">
                        <div class="mb-3">
                            <label class="form-label">Infant</label>
                            <select class="form-select" name="assign_infant_id" required>
                                <option value="">-- Select Infant --</option>
                                <?php while ($inf = mysqli_fetch_assoc($all_infants_assign)): ?>
                                    <option value="<?php echo $inf['infant_id']; ?>">
                                        #<?php echo $inf['infant_id']; ?> — <?php echo $inf['infant_first_name'] . ' ' . $inf['infant_last_name']; ?>
                                    </option>
                                <?php endwhile; ?>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nurse</label>
                            <select class="form-select" name="assign_nurse_id" required>
                                <option value="">-- Select Nurse --</option>
                                <?php while ($all_nurses && ($nurse = mysqli_fetch_assoc($all_nurses))): ?>
                                    <option value="<?php echo $nurse['nurse_id']; ?>">
                                        #<?php echo $nurse['nurse_id']; ?> — <?php echo $nurse['nurse_first_name'] . ' ' . $nurse['nurse_last_name']; ?>
                                    </option>
                                <?php endwhile; ?>
                            </select>
                        </div>
                        <button type="submit" name="assign_nurse" class="btn btn-primary w-100">Assign Nurse</button>
                    </form>
                </div>
            </div>
        </div>

    </div>

    <!-- Infants Table -->
    <div class="card section-card shadow">
        <div class="card-header p-3">
            <h5 class="mb-0"> All Infants & Parents</h5>
        </div>
        <div class="card-body p-0">
            <table class="table table-hover mb-0">
                <thead>
                    <tr>
                        <th>Infant ID</th>
                        <th>Infant Name</th>
                        <th>Room</th>
                        <th>Parent Name</th>
                        <th>Nurse Name</th>
                        <th>Parent Code</th>
                        <th>Code Used?</th>
                    </tr>
                </thead>
                <tbody>
                    <?php while ($row = mysqli_fetch_assoc($infants_result)): ?>
                    <tr>
                        <td><?php echo $row['infant_id']; ?></td>
                        <td><?php echo $row['infant_first_name'] . ' ' . $row['infant_last_name']; ?></td>
                        <td><?php echo $row['room_number']; ?></td>
                        <td><?php echo $row['parent_first_name'] ? $row['parent_first_name'] . ' ' . $row['parent_last_name'] : '<span class="text-muted">No parent yet</span>'; ?></td>
                        <td><?php echo $row['nurse_first_name'] ? $row['nurse_first_name'] . ' ' . $row['nurse_last_name'] : '<span class="text-muted">No nurse assigned</span>'; ?></td>
                        <td><?php echo $row['parent_code'] ? '<span class="badge-code">' . $row['parent_code'] . '</span>' : '<span class="text-muted">—</span>'; ?></td>
                        <td><?php echo $row['is_used'] ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-warning text-dark">No</span>'; ?></td>
                    </tr>
                    <?php endwhile; ?>
                </tbody>
            </table>
        </div>
    </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>