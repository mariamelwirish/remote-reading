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

    // FETCH all infants with their linked parents
    $infants_query = "
        SELECT i.infant_id, i.infant_first_name, i.infant_last_name, i.room_number,
               p.parent_first_name, p.parent_last_name,
               s.parent_code, s.is_used
        FROM infants i
        LEFT JOIN parents p ON i.parent_id = p.parent_id
        LEFT JOIN signup s ON i.infant_id = s.infant_id
        ORDER BY i.infant_id DESC
    ";
    $infants_result = mysqli_query($conn, $infants_query);

    // FETCH all infants for the parent dropdown
    $all_infants = mysqli_query($conn, "SELECT infant_id, infant_first_name, infant_last_name FROM infants ORDER BY infant_id");
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