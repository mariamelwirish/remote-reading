<!DOCTYPE html>
<html lang="en" data-bs-theme="auto">
    <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="canonical" href="https://getbootstrap.com/docs/5.3/examples/sidebars/">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-GLhlTQ8iRABdZLl6O3oVMWSktQOp6b7In1Zl3/Jr59b6EGGoI1aFkw7cmDA6j6gD" crossorigin="anonymous">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js" integrity="sha384-w76AqPfDkMBDXo30jS1Sgez6pr3x5MlQ1ZAGC+nuZB+EYdgRZgiwxhTBTkF7CXvN" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.6/dist/umd/popper.min.js" integrity="sha384-oBqDVmMz9ATKxIep9tiCxS/Z9fNfEXiDAYTujMAeBAsjFuCZSmKbSSUnQlmh/jp3" crossorigin="anonymous"></script>
    <script type="text/javascript" src="../js/recorder.js" defer></script>
    <script type="text/javascript" src="../js/record.js" defer></script>
    <script src="../js/color-modes.js"></script>

    
<meta name="theme-color" content="#7952b3">
    

    <style>
      .bd-placeholder-img {
        font-size: 1.125rem;
        text-anchor: middle;
        -webkit-user-select: none;
        -moz-user-select: none;
        user-select: none;
      }

      @media (min-width: 768px) {
        .bd-placeholder-img-lg {
          font-size: 3.5rem;
        }
      }

      .b-example-divider {
        width: 100%;
        height: 3rem;
        background-color: rgba(0, 0, 0, .1);
        border: solid rgba(0, 0, 0, .15);
        border-width: 1px 0;
        box-shadow: inset 0 .5em 1.5em rgba(0, 0, 0, .1), inset 0 .125em .5em rgba(0, 0, 0, .15);
      }

      .b-example-vr {
        flex-shrink: 0;
        width: 1.5rem;
        height: 100vh;
      }

      .bi {
        vertical-align: -.125em;
        fill: currentColor;
      }

      .nav-scroller {
        position: relative;
        z-index: 2;
        height: 2.75rem;
        overflow-y: hidden;
      }

      .nav-scroller .nav {
        display: flex;
        flex-wrap: nowrap;
        padding-bottom: 1rem;
        margin-top: -1px;
        overflow-x: auto;
        text-align: center;
        white-space: nowrap;
        -webkit-overflow-scrolling: touch;
      }

      .btn-bd-primary {
        --bd-violet-bg: #712cf9;
        --bd-violet-rgb: 112.520718, 44.062154, 249.437846;

        --bs-btn-font-weight: 600;
        --bs-btn-color: var(--bs-white);
        --bs-btn-bg: var(--bd-violet-bg);
        --bs-btn-border-color: var(--bd-violet-bg);
        --bs-btn-hover-color: var(--bs-white);
        --bs-btn-hover-bg: #6528e0;
        --bs-btn-hover-border-color: #6528e0;
        --bs-btn-focus-shadow-rgb: var(--bd-violet-rgb);
        --bs-btn-active-color: var(--bs-btn-hover-color);
        --bs-btn-active-bg: #5a23c8;
        --bs-btn-active-border-color: #5a23c8;
      }
      .bd-mode-toggle {
        z-index: 1500;
      }
    </style>

    
    <!-- Custom styles for this template -->
    <link href="../styles/sidebar.css" rel="stylesheet">

</head>
<body>
<?php
include_once('connect.php');

include('auth_session.php');

$username = $_SESSION['username'];
$room_number = $_SESSION['room'];
$infant_first_name = $_SESSION['infant_first_name'];
$infant_last_name = $_SESSION['infant_last_name'];
$infant_id = $_SESSION['infant_id'];

$recordingsDir = __DIR__ . '/../recordings';
$recordingsUrlPrefix = '../recordings/';
if (!is_dir($recordingsDir)) {
    mkdir($recordingsDir, 0755, true);
}

//get recordings from database
$newrecording = "SELECT * FROM `recordings` WHERE `recording_type`= 'new' AND `infant_id` = $infant_id ORDER BY recording_date DESC";
$oldrecording = "SELECT * FROM `recordings` WHERE `recording_type`= 'old' AND `infant_id` = $infant_id ORDER BY recording_date DESC";
$scheduledrecording = "SELECT * FROM `recording_schedule` JOIN `recordings` ON recording_schedule.recording_id = recordings.recording_id 
                        WHERE recording_schedule.infant_id = $infant_id AND recording_schedule.scheduled_time > CONVERT_TZ(NOW(), 'UTC', 'America/New_York')";

//delete recordings from scheduled table after a day
$num_days = 1;
$cutoff_date = date("Y-m-d H:i:s", strtotime("-$num_days days"));

$stmt = $conn->prepare("DELETE FROM `recording_schedule` WHERE scheduled_time < ?");
$stmt->bind_param("s", $cutoff_date);
$stmt->execute();


//execute statements
$resultnew = mysqli_query($conn, $newrecording) or die(mysqli_error($conn));
$resultold = mysqli_query($conn, $oldrecording) or die(mysqli_error($conn));
$resultschedule = mysqli_query($conn, $scheduledrecording) or die(mysqli_error($conn));




?>


<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
      <symbol id="check2" viewBox="0 0 16 16">
        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
      </symbol>
      <symbol id="circle-half" viewBox="0 0 16 16">
        <path d="M8 15A7 7 0 1 0 8 1v14zm0 1A8 8 0 1 1 8 0a8 8 0 0 1 0 16z"/>
      </symbol>
      <symbol id="moon-stars-fill" viewBox="0 0 16 16">
        <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
        <path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.734 1.734 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.734 1.734 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.734 1.734 0 0 0 1.097-1.097l.387-1.162zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L13.863.1z"/>
      </symbol>
      <symbol id="sun-fill" viewBox="0 0 16 16">
        <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
      </symbol>
    </svg>

    <div class="dropdown position-fixed bottom-0 end-0 mb-3 me-3 bd-mode-toggle">
      <button class="btn btn-bd-primary py-2 dropdown-toggle d-flex align-items-center"
              id="bd-theme"
              type="button"
              aria-expanded="false"
              data-bs-toggle="dropdown"
              aria-label="Toggle theme (auto)">
        <svg class="bi my-1 theme-icon-active" width="1em" height="1em"><use href="#circle-half"></use></svg>
        <span class="visually-hidden" id="bd-theme-text">Toggle theme</span>
      </button>
      <ul class="dropdown-menu dropdown-menu-end shadow" aria-labelledby="bd-theme-text">
        <li>
          <button type="button" class="dropdown-item d-flex align-items-center" data-bs-theme-value="light" aria-pressed="false">
            <svg class="bi me-2 opacity-50 theme-icon" width="1em" height="1em"><use href="#sun-fill"></use></svg>
            Light
            <svg class="bi ms-auto d-none" width="1em" height="1em"><use href="#check2"></use></svg>
          </button>
        </li>
        <li>
          <button type="button" class="dropdown-item d-flex align-items-center" data-bs-theme-value="dark" aria-pressed="false">
            <svg class="bi me-2 opacity-50 theme-icon" width="1em" height="1em"><use href="#moon-stars-fill"></use></svg>
            Dark
            <svg class="bi ms-auto d-none" width="1em" height="1em"><use href="#check2"></use></svg>
          </button>
        </li>
        <li>
          <button type="button" class="dropdown-item d-flex align-items-center active" data-bs-theme-value="auto" aria-pressed="true">
            <svg class="bi me-2 opacity-50 theme-icon" width="1em" height="1em"><use href="#circle-half"></use></svg>
            Auto
            <svg class="bi ms-auto d-none" width="1em" height="1em"><use href="#check2"></use></svg>
          </button>
        </li>
      </ul>
    </div>

    
<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
  <symbol id="bootstrap" viewBox="0 0 118 94">
    <title>Bootstrap</title>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M24.509 0c-6.733 0-11.715 5.893-11.492 12.284.214 6.14-.064 14.092-2.066 20.577C8.943 39.365 5.547 43.485 0 44.014v5.972c5.547.529 8.943 4.649 10.951 11.153 2.002 6.485 2.28 14.437 2.066 20.577C12.794 88.106 17.776 94 24.51 94H93.5c6.733 0 11.714-5.893 11.491-12.284-.214-6.14.064-14.092 2.066-20.577 2.009-6.504 5.396-10.624 10.943-11.153v-5.972c-5.547-.529-8.934-4.649-10.943-11.153-2.002-6.484-2.28-14.437-2.066-20.577C105.214 5.894 100.233 0 93.5 0H24.508zM80 57.863C80 66.663 73.436 72 62.543 72H44a2 2 0 01-2-2V24a2 2 0 012-2h18.437c9.083 0 15.044 4.92 15.044 12.474 0 5.302-4.01 10.049-9.119 10.88v.277C75.317 46.394 80 51.21 80 57.863zM60.521 28.34H49.948v14.934h8.905c6.884 0 10.68-2.772 10.68-7.727 0-4.643-3.264-7.207-9.012-7.207zM49.948 49.2v16.458H60.91c7.167 0 10.964-2.876 10.964-8.281 0-5.406-3.903-8.178-11.425-8.178H49.948z"></path>
  </symbol>
  <symbol id="home" viewBox="0 0 16 16">
    <path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146zM2.5 14V7.707l5.5-5.5 5.5 5.5V14H10v-4a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v4H2.5z"/>
  </symbol>
  <symbol id="speedometer2" viewBox="0 0 16 16">
    <path d="M8 4a.5.5 0 0 1 .5.5V6a.5.5 0 0 1-1 0V4.5A.5.5 0 0 1 8 4zM3.732 5.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707zM2 10a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 10zm9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5zm.754-4.246a.389.389 0 0 0-.527-.02L7.547 9.31a.91.91 0 1 0 1.302 1.258l3.434-4.297a.389.389 0 0 0-.029-.518z"/>
    <path fill-rule="evenodd" d="M0 10a8 8 0 1 1 15.547 2.661c-.442 1.253-1.845 1.602-2.932 1.25C11.309 13.488 9.475 13 8 13c-1.474 0-3.31.488-4.615.911-1.087.352-2.49.003-2.932-1.25A7.988 7.988 0 0 1 0 10zm8-7a7 7 0 0 0-6.603 9.329c.203.575.923.876 1.68.63C4.397 12.533 6.358 12 8 12s3.604.532 4.923.96c.757.245 1.477-.056 1.68-.631A7 7 0 0 0 8 3z"/>
  </symbol>
  <symbol id="table" viewBox="0 0 16 16">
    <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/>
  </symbol>
  <symbol id="people-circle" viewBox="0 0 16 16">
    <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
    <path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
  </symbol>
  <symbol id="grid" viewBox="0 0 16 16">
    <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
  </symbol>
</svg>

<main class="d-flex flex-nowrap">
  <h1 class="visually-hidden">Sidebars examples</h1>

  <div class="d-flex flex-column flex-shrink-0 p-3 text-bg-dark" style="width: 280px;">
    <a href="/" class="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
      <img src="../assets/emoji_books.png" alt="Logo" width="25" height="25" class="logo me-2">
      <span class="fs-4">Remote Reading</span>
    </a>
    <hr>
    <ul class="nav nav-pills flex-column mb-auto" id="pills-tab" role="tablist">
      <li class="nav-item" role="presentation">
        <a href="#new-recordings" class="nav-link active" id="new-recordings-tab" data-bs-toggle="tab" role="tab" aria-controls="pills-home" aria-selected="true">
          <svg class="bi pe-none me-2" width="16" height="16"><use xlink:href="#home"/></svg>
          New 
        </a>
      </li>
      <li class="nav-item" role="presentation">
        <a href="#old-recordings" class="nav-link" id="old-recordings-tab" data-bs-toggle="tab" role="tab" aria-controls="pills-profile" aria-selected="false">
          <svg class="bi pe-none me-2" width="16" height="16"><use xlink:href="#speedometer2"/></svg>
          Old 
        </a>
      </li>
      <li class="nav-item" role="presentation">
        <a href="#scheduled-recordings" class="nav-link" id="scheduled-recordings-tab" data-bs-toggle="tab" role="tab" aria-controls="pills-contact" aria-selected="false">
          <svg class="bi pe-none me-2" width="16" height="16"><use xlink:href="#table"/></svg>
          Scheduled 
        </a>
      </li>
      <li>
        
      </li>
    </ul>
    <hr>
    <div class="dropdown">
      <a href="#" class="d-flex align-items-center text-white text-decoration-none dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
        <strong><?php echo $infant_first_name . " " . $infant_last_name ?></strong>
      </a>
      <ul class="dropdown-menu dropdown-menu-dark text-small shadow">
        
        <li><a class="dropdown-item" href="#">Change Room</a></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item" href="logout.php">Sign out</a></li>
      </ul>
    </div>
  </div>
  <div class="b-example-divider b-example-vr">
  
  
  </div>

<div class="tab-content" id="pills-tabContent">
  <!-- Cards section -->
    
        <div id="new-recordings" class="tab-pane fade show active" role="tabpanel" aria-labelledby="pills-home-tab">
          <div class="new-r" >
            <h2>New Recordings</h2>
            <div class="old-r d-flex flex-row flex-wrap" >
                <?php
                //loop through all rows in the database in recordings table
                while($rows = mysqli_fetch_assoc($resultnew)) {
                    //retrieve blob from recordings table
                    $blob = $rows['recording'];
                    //decode blob
                    $blob = hex2bin($blob);
                    //default generated filename when audio file created
                    $fileName = $rows['recording_name'] . ".wav";
                    file_put_contents($recordingsDir . "/" . $fileName, $blob);
                    $fileSource = $fileName; 
                    $is_played = $rows['is_played'];
                    //if parents inputted a name for the audio file, user that name, otherwise use default generated name
                    if ($rows['requested_name'] == NULL) {
                        $requested_name = $fileName;
                    }
                    else {
                        $requested_name = $rows['requested_name'];
                    }

                    if ($rows['requested_time'] == NULL) {
                        $requested_time = NULL;
                    }
                    else {
                        $requested_time = $rows['requested_time'];
                    }
                    //message input by parents after creating audio
                    $requested_message = $rows['requested_message'];
                    
                   
                ?>
                
                <div class="card mx-3 my-2" style="max-width: 28rem;" style="max-width: 28rem; flex: 0 0 auto;" style="max-width: 28rem;" id="new-recording-card-<?php echo $rows['recording_id']; ?>">
                    <div class="card-header bg-danger text-white" >
                        <strong><?php echo $requested_name  ?></strong>
                    </div>
                    <div class="card-body">
                        <p class="card-text">
                            <!-- when recording played, markAsPlayed defined in record.js-->
                            <audio controls>
                            <source src = "<?php echo "recordings/" . $fileSource; ?>" type = "audio/wav">  
                            </audio><br>
                            <!--Play now button -->
                            <button id="play-now-button" type="button" class="btn btn-primary" onclick="markAsPlayed(<?php echo $rows['recording_id'] . ',' . $rows['infant_id']; ?>)">Play Now</button>
                            <!--Schedule message button -->
                            <button id="schedule-button" type="button" class="btn btn-secondary" onclick="scheduleRecording(<?php echo $rows['recording_id'] . ',' . $rows['infant_id']; ?>)">Schedule For Later</button>
                            <!--Delete button -->
                            <button id="delete-recording" type="button" class="btn btn-danger" onclick="deleteRecording(<?php echo $rows['recording_id']; ?>)">Delete</button>
                            <br><br>
                            <?php  if ($requested_time != '0000-00-00 00:00:00') {
                                        echo "Requested Time: " . $requested_time . '<br>';
                            ?>
                                        <!--button to schedule recording at request time by parent -->
                                        <button id="schedule-requested-button" type="button" class="btn btn-primary" onclick="scheduleRecording(<?php echo $rows['recording_id'];?>, '<?php echo $rows['infant_id']; ?>', '<?php echo $requested_time; ?>')">Schedule for requested time</button>         
                            <?php  }
                            ?> 
    
                            <?php        echo '<br>Message: ' . $requested_message; ?>
                        </p>
                    </div>
                    <div class="card-footer text-muted" >
                        2 days ago
                    </div>
                </div>
                <br><br>
            <?php
                }
            ?>
           </div>
            </div>
        </div> 


<!-- Old Recordings Cards-->

        <div id="old-recordings" class="tab-pane fade" role="tabpanel" aria-labelledby="pills-home-profile">
          
            <h2>Old Recordings</h2>
            <div class="old-r d-flex flex-row flex-wrap" >
                    <?php
                    //loop through all rows in the database in recordings table
                    while($rows = mysqli_fetch_assoc($resultold)) {
                        //retrieve blob from recordings table
                        $blob = $rows['recording'];
                        //decode blob
                        $blob = hex2bin($blob);
                        //default generated filename when audio file created
                        $fileName = $rows['recording_name'] . ".wav";
                        file_put_contents("recordings/" . $fileName,$blob);
                        $fileSource = $fileName; 
                        $is_played = $rows['is_played'];
                        //if parents inputted a name for the audio file, user that name, otherwise use default generated name
                        if ($rows['requested_name'] == NULL) {
                            $requested_name = $fileName;
                        }
                        else {
                            $requested_name = $rows['requested_name'];
                        }
                        //message input by parents after creating audio
                        $requested_message = $rows['requested_message'];
                    ?>
                    
                    <div class="card mx-3 my-2" style="max-width: 28rem;" style="max-width: 28rem; flex: 0 0 auto;" id="old-recording-card-<?php echo $rows['recording_id']; ?>">
                        <div class="card-header bg-danger text-white" >
                            <strong><?php echo $requested_name; ?></strong>
                        </div>
                        <div class="card-body">
                            <p class="card-text">
                                <audio controls>
                                <source src = "<?php echo "recordings/" . $fileSource; ?>" type = "audio/wav">  
                                </audio><br>
                                <!--Play now button -->
                                <button id="play-now-button" type="button" class="btn btn-primary" onclick="markAsPlayed(<?php echo $rows['recording_id'] . ',' . $rows['infant_id']; ?>)">Play Now</button>
                                <!--Schedule message button -->
                                <button id="schedule-button" type="button" class="btn btn-secondary" onclick="scheduleRecording(<?php echo $rows['recording_id'] . ',' . $rows['infant_id']; ?>)">Schedule For Later</button>
                                <!--Delete button -->
                                <button id="delete-recording" type="button" class="btn btn-danger" onclick="deleteRecording(<?php echo $rows['recording_id']; ?>)">Delete</button>
                                <br>
                                <?php echo '<br>' . $requested_message; ?>
                            </p>
                        </div>
                        <div class="card-footer text-muted" >
                            2 days ago
                        </div>
                    </div>
                    <br><br>    
                <?php
                    }
                ?>

            </div>
        </div>

<!-- Schedule Recordings Cards-->

        <div id="scheduled-recordings" class="tab-pane fade" role="tabpanel" aria-labelledby="pills-home-contact">
            
                <h2 class="w-101">Scheduled Recordings</h2>
                    <?php
                    //loop through all rows in the database in recordings table
                    while($rows = mysqli_fetch_assoc($resultschedule)) {
                        //retrieve blob from recordings table
                        $blob = $rows['recording'];
                        //decode blob
                        $blob = hex2bin($blob);
                        //default generated filename when audio file created
                        $fileName = $rows['recording_name'] . ".wav";
                        file_put_contents("recordings/" . $fileName,$blob);
                        $fileSource = $fileName; 
                        $is_played = $rows['is_played'];
                        //if parents inputted a name for the audio file, user that name, otherwise use default generated name
                        if ($rows['requested_name'] == NULL) {
                            $requested_name = $fileName;
                        }
                        else {
                            $requested_name = $rows['requested_name'];
                        }
                        //message input by parents after creating audio
                        $requested_message = $rows['requested_message'];
                        $actual_schedule = $rows['scheduled_time'];
                    ?>
                    <div class="scheduled-r d-flex flex-row flex-wrap" >
                    <div class="card mx-3 my-2" style="max-width: 28rem;" style="max-width: 28rem; flex: 0 0 auto;" id="scheduled-recording-card-<?php echo $rows['recording_id']; ?>">
                        <div class="card-header bg-danger text-white" >
                           <strong><?php echo $requested_name; ?></strong>
                        </div>
                        <div class="card-body">
                            <p class="card-text">
                                <audio controls>
                                <source src = "<?php echo "recordings/" . $fileSource; ?>" type = "audio/wav">  
                                </audio><br>
                                <!--Play now button -->
                                <button id="play-now-button" type="button" class="btn btn-primary" onclick="markAsPlayed(<?php echo $rows['recording_id'] . ',' . $rows['infant_id']; ?>)">Play Now</button>
                                <!--Schedule message button -->
                                <button id="schedule-button" type="button" class="btn btn-secondary" onclick="rescheduleRecording(<?php echo $rows['recording_id'] . ',' . $rows['infant_id']; ?>)">Reschedule</button>
                                <!--Delete button -->
				<button type="button" class="btn btn-danger" onclick="deleteRecording(<?php echo $rows['recording_id']; ?>)">Delete</button>
                                <br>
                                <?php echo '<br>' . 'Recording scheduled for: ' . $actual_schedule; ?>
                                <br>
                                <?php echo '<br>' . $requested_message; ?>
                            </p>
                        </div>
                        <div class="card-footer text-muted" >
                            2 days ago
                        </div>
                    </div>
                    <br><br>    
                <?php
                    }
                ?>
            </div>
        </div>
    

</div>



</main>


<main>

<!-- Modal -->
<div class="modal fade" id="scheduleModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="exampleModalLabel">Schedule Recording</h5>
        <button type="button" class="close" data-bs-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
            <label for="datetime-schedule">Select a date and time:</label>
            <input type="datetime-local" class="form-control" id="datetime-schedule" name="datetime">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        <button id="sendschedule" type="button" class="btn btn-primary">Save changes</button>
      </div>
    </div>
  </div>
</div>

<script src="../js/sidebar.js"></script>  
</main>

   
</body>
</html>
