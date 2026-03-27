<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Remote Reading for Newborns</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-GLhlTQ8iRABdZLl6O3oVMWSktQOp6b7In1Zl3/Jr59b6EGGoI1aFkw7cmDA6j6gD" crossorigin="anonymous">
    <style>
        .card-body.tab-content.overflow-auto {
            max-height: 300px;
            overflow: auto;
        }
        .card {
            height: 300px; /* or any other fixed value you want */
        }
    </style>
  </head>

  <body>
  <?php 
  //called at dashboard-parent.php line 54
  include_once("connect.php");
  $stmt = $conn->prepare("SELECT recordings.recording_id AS recording_id, MAX(recordings.requested_name) AS requested_name, MAX(recordings.is_played) AS is_played, MAX(recordings.date_played) AS date_played, MAX(recording_schedule.scheduled_time) AS scheduled_time
                          FROM recordings
                          LEFT JOIN recording_schedule
                          ON recordings.recording_id = recording_schedule.recording_id
                          WHERE recordings.infant_id = $infant_id
                          GROUP BY recordings.recording_id
                          ORDER BY recording_id DESC;"
                          );
  $stmt->execute();
  $result = $stmt->get_result();


  

  ?>

<div class="card text-center" style="width: 22rem;">
    <div class="card-header">
        <ul class="nav nav-tabs card-header-tabs flex-nowrap" id="myTab" role="tablist">
            <li class="nav-item">
                <button class="nav-link active" id="home-tab" data-bs-toggle="tab" data-bs-target="#home" type="button" role="tab" aria-controls="home" aria-selected="true">Unplayed</button>
            </li>
            <li class="nav-item">
                <button class="nav-link" id="profile-tab" data-bs-toggle="tab" data-bs-target="#profile" type="button" role="tab" aria-controls="profile" aria-selected="false">Played</button>
            </li>
            <li class="nav-item">
                <button class="nav-link" id="messages-tab" data-bs-toggle="tab" data-bs-target="#messages" type="button" role="tab" aria-controls="messages" aria-selected="false">Scheduled</button>
            </li>
        </ul>
    </div>

    <div class="card-body tab-content overflow-auto">
        <?php
            $home_content = '';
            $profile_content = '';
            $messages_content = '';
            
            while ($row = $result->fetch_assoc()) {
                // set default timezone to EST

                // get current time in EST

                // convert scheduled_time to EST


                if ($row['scheduled_time'] == NULL && $row['date_played'] == NULL) {
                    $home_content .= '<li class="list-group-item">';
                    $home_content .= '<strong>' . $row['requested_name'] . '</strong>' . "<br>  ";
                    $home_content .= "Message Not Yet Played ";
                    $home_content .= '</li>';
                } elseif ($row['date_played'] != NULL) {
                    $profile_content .= '<li class="list-group-item">';
                    $profile_content .= '<strong>' . $row['requested_name'] . '</strong>' . "<br>  ";
                    $profile_content .= 'Message Played At:  ' . $row['date_played'] . "<br>";
                    $profile_content .= '</li>';
                } elseif ( $row['scheduled_time'] != NULL) {
                    $messages_content .= '<li class="list-group-item">';
                    $messages_content .= '<strong>' . $row['requested_name'] . '</strong>' . "<br>  ";
                    $messages_content .= 'Message Scheduled For:  ' . $row['scheduled_time'] . "<br>";
                    $messages_content .= '</li>';
                } else {
                    continue;
                }
            }
            
            // Display tab contents
            echo '<div class="tab-pane fade show active" id="home" role="tabpanel" aria-labelledby="home-tab">';
            echo '<ul class="list-group list-group-flush">' . $home_content . '</ul>';
            echo '</div>';
            
            echo '<div class="tab-pane fade" id="profile" role="tabpanel" aria-labelledby="profile-tab">';
            echo '<ul class="list-group list-group-flush">' . $profile_content . '</ul>';
            echo '</div>';

            echo '<div class="tab-pane fade" id="messages" role="tabpanel" aria-labelledby="profile-tab">';
            echo '<ul class="list-group list-group-flush">' . $messages_content . '</ul>';
            echo '</div>';

            ?>
    </div>



    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js" integrity="sha384-w76AqPfDkMBDXo30jS1Sgez6pr3x5MlQ1ZAGC+nuZB+EYdgRZgiwxhTBTkF7CXvN" crossorigin="anonymous"></script>
  </body>
</html>
