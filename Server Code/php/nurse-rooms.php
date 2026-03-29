<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Nurse Rooms</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        :root {
            --bg: #f6f7fb;
            --ink: #1f2937;
            --muted: #6b7280;
            --card: #ffffff;
            --brand: #0d3b66;
            --accent: #2a9d8f;
        }

        body {
            background: radial-gradient(circle at 10% 10%, #e8f1ff 0%, var(--bg) 45%, #eefaf7 100%);
            color: var(--ink);
            min-height: 100vh;
        }

        .topbar {
            background: linear-gradient(120deg, var(--brand), #1d4e89);
            color: #fff;
            border-bottom-left-radius: 1rem;
            border-bottom-right-radius: 1rem;
            box-shadow: 0 10px 25px rgba(13, 59, 102, 0.18);
        }

        .room-card {
            border: 0;
            border-radius: 1rem;
            background: var(--card);
            box-shadow: 0 10px 28px rgba(31, 41, 55, 0.09);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .room-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 18px 34px rgba(31, 41, 55, 0.13);
        }

        .room-badge {
            background: rgba(42, 157, 143, 0.14);
            color: #0f766e;
            font-weight: 600;
            border-radius: 999px;
            padding: 0.3rem 0.75rem;
            display: inline-block;
        }

        .empty-state {
            border: 1px dashed #cbd5e1;
            border-radius: 1rem;
            background: #fff;
            color: var(--muted);
        }
    </style>
</head>
<body>
<?php
    include_once('connect.php');
    session_start();

    if (!isset($_SESSION['nurse_id'])) {
        header("Location: nurse-login.php");
        exit();
    }

    $nurse_id = (int)$_SESSION['nurse_id'];
    $nurse_first_name = $_SESSION['nurse_first_name'] ?? '';
    $nurse_last_name = $_SESSION['nurse_last_name'] ?? '';
    $error = '';

    if (isset($_POST['open_room'])) {
        $infant_id = isset($_POST['infant_id']) ? (int)$_POST['infant_id'] : 0;

        $stmt = $conn->prepare("SELECT infant_id, infant_first_name, infant_last_name, room_number
                                FROM infants
                                WHERE infant_id = ? AND nurse_id = ?
                                LIMIT 1");
        $stmt->bind_param("ii", $infant_id, $nurse_id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result && $result->num_rows === 1) {
            $infant = $result->fetch_assoc();
            $_SESSION['username'] = $_SESSION['nurse_username'];
            $_SESSION['room'] = $infant['room_number'];
            $_SESSION['infant_first_name'] = $infant['infant_first_name'];
            $_SESSION['infant_last_name'] = $infant['infant_last_name'];
            $_SESSION['infant_id'] = $infant['infant_id'];
            header("Location: get-recordings.php");
            exit();
        }

        $error = "That room is unavailable for your account.";
        $stmt->close();
    }

    $stmt_rooms = $conn->prepare("SELECT infant_id, infant_first_name, infant_last_name, room_number
                                  FROM infants
                                  WHERE nurse_id = ?
                                  ORDER BY room_number ASC, infant_first_name ASC");
    $stmt_rooms->bind_param("i", $nurse_id);
    $stmt_rooms->execute();
    $rooms_result = $stmt_rooms->get_result();

    $rooms = [];
    if ($rooms_result) {
        while ($row = $rooms_result->fetch_assoc()) {
            $room_no = (int)$row['room_number'];
            if (!isset($rooms[$room_no])) {
                $rooms[$room_no] = [];
            }
            $rooms[$room_no][] = $row;
        }
    }
?>

<div class="topbar py-4 mb-4">
    <div class="container d-flex flex-wrap align-items-center justify-content-between">
        <div>
            <h2 class="mb-1">Managed Rooms</h2>
            <p class="mb-0 opacity-75">Choose a room to manage scheduled and new recordings.</p>
        </div>
        <div class="text-end">
            <div class="fw-semibold mb-2">Nurse: <?php echo htmlspecialchars(trim($nurse_first_name . ' ' . $nurse_last_name)); ?></div>
            <a href="logout.php" class="btn btn-outline-light btn-sm">Logout</a>
        </div>
    </div>
</div>

<div class="container pb-5">
    <?php if ($error): ?>
        <div class="alert alert-danger"><?php echo htmlspecialchars($error); ?></div>
    <?php endif; ?>

    <?php if (empty($rooms)): ?>
        <div class="empty-state p-4 text-center">
            <h5>No rooms assigned yet</h5>
            <p class="mb-0">Ask an admin to assign one or more infants to your account.</p>
        </div>
    <?php else: ?>
        <div class="row g-4">
            <?php foreach ($rooms as $roomNumber => $infants): ?>
                <div class="col-12 col-md-6 col-xl-4">
                    <div class="card room-card h-100">
                        <div class="card-body p-4">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h5 class="mb-0">Room <?php echo $roomNumber; ?></h5>
                                <span class="room-badge"><?php echo count($infants); ?> infant<?php echo count($infants) > 1 ? 's' : ''; ?></span>
                            </div>

                            <?php foreach ($infants as $infant): ?>
                                <form method="post" class="d-flex align-items-center justify-content-between border rounded p-2 mb-2">
                                    <div>
                                        <div class="fw-semibold"><?php echo htmlspecialchars($infant['infant_first_name'] . ' ' . $infant['infant_last_name']); ?></div>
                                        <small class="text-muted">Infant #<?php echo (int)$infant['infant_id']; ?></small>
                                    </div>
                                    <input type="hidden" name="infant_id" value="<?php echo (int)$infant['infant_id']; ?>">
                                    <button type="submit" name="open_room" class="btn btn-sm btn-primary">Open</button>
                                </form>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>

<?php $stmt_rooms->close(); ?>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
