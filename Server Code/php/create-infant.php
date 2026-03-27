<?php 
    include_once('connect.php');

    if (isset($_POST['create'])) {
        $id = $_POST['InputID'];
        $firstName = $_POST['InputFirstName'];
        $lastName = $_POST['InputLastName'];

        // prepare and bind the SQL statement to prevent SQL injection
        $stmt = $conn->prepare("INSERT INTO infants (infant_id, infant_first_name, infant_last_name) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $id, $firstName, $lastName);
        
        if ($stmt->execute()) {
            echo "New record created successfully.";
        }
        else {
            echo "Error: " . $stmt->error;
        }
        
        // close the statement and database connection
        $stmt->close();
        $conn->close(); 
    }

    // this header can redirect the user back to a page once a new infant is added
    // header('location: ../../infants.php');
?>
