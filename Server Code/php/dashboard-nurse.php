<!DOCTYPE html>
<html>
<head>
</head>
<body>
    <?php
        include("auth_session.php");
        include("navbar.php");
        include("get-infants.php"); 
    ?>

    
    <br>
    <br>

    <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createEntry">
    Add Infant
    </button>

    <br><br>

    <!-- Create -->
    <div class="modal fade" id="createEntry" tabindex="-1" aria-labelledby="ModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="ModalLabel">New Entry</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form method="POST" action="create-infant.php">
                        <div class="mb-3">
                            <label for="InputID" class="form-label">Infant ID</label>
                            <input type="text" class="form-control" id="InputID" name="InputID">
                        </div>
                        <div class="mb-3">
                            <label for="InputFirstName" class="form-label">Infant First Name</label>
                            <input type="text" class="form-control" id="InputFirstName" name="InputFirstName">
                        </div>
                        <div class="mb-3">
                            <label for="InputLastName" class="form-label">Infant Last Name</label>
                            <input type="text" class="form-control" id="InputLastName" name="InputLastName">
                        </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" name="create" class="btn btn-success">Submit</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </form>
                </div>
            </div>
        </div>
    </div>



    <main>
        <?php
        while($row = mysqli_fetch_assoc($result)) {
        ?>
        <div class="card bg-light mb-3" style="max-width: 18rem;">
        
        <div class="card-header">Infant</div>
        <div class="card-body">
        <h5 class="card-title"><?php echo $row['infant_first_name'], " ", $row['infant_last_name']; ?></h5>
        <p class="card-text"></p>
        <a href="get-recordings.php" class="btn btn-primary">View Messages</a>
        </div>
        </div>
        
        <?php
        }
        ?>
    </main>
</body>
</html>