Folder: Raspberry Pi - python script
#Contains the python script running on the raspberry pi to obtain recordings from database and ec2 instance. 
-play_recordings.py : will check database for any scheduled recordings and retrieve them from the ec2 instance, then play at appropriate time

Folder: Server Code 
#contains all the server code hosted on the aws ec2 instance
  -SubFolder: assets
  #png file that contains logo for website
  emoji_books_.png 
	
  -SubFolder: js
  #contains all javascript files for server code
  color-modes.js : used to toggle from dark mode and light mode in website
  record.js : js file used to start, pause and end recordings, as well as schedule, reschedule, and delete recordings
  recorder.js : js file to record audio from web browser, create playback bar and download link
  sidebar.js : tooltips for website sidebar

  -SubFolder: php
  #contains all php files for server code
  auth_session.php : authorizes session for current user if logged in
  connect.php : used to make connection to database, RDS server
  cover.php : cover page used for parent dashboard
  create-infant.php : adds new infant into database
  dashboard-nurse.php : *not used but contains code to show all infants, and add infant button
  dashboard-parent.php : parent dashboard, contains buttons to record, play, and pause and sent messages
  delete-recording.php : deletes recording from database
  get-infants.php : nurse dashboard, shows all new, old, and scheduled messages
  index.php : index page, contains login page
  login.php : login page, checks is parent already in database
  logout.php : logout page
  mark_as_played : marks a recording as played and inserts it as played into the database
  navbar.php : *unused but creates navigation bar
  nurse-login.php : login for nurses, checks database
  parent-message-nav.php : displayed in dashboard-parent.php, shows the status of all sent recordings(not played, scheduled, played)
  register.php : register for new accounts
  reschedule-recording.php : used to reschedule recording for recordings that have been previously scheduled
  schedule-recording.php : used to schedule a recording for a specific date and time
  send-recording-modal.php : modal that pops up when the parent sends the recording, asks for name, message, and optional time + date
  sendblob.php : sends the actual recording blob to the database
  show-played-recordings.php : *unused, but was previously used to show played recordings sent by parent, same function as parent-message-nav.php 
  sidebar.php : creates a sidebar which is used by the nurse dashboard for the new, old, and scheduled recordings. 

  -SubFolder: styles
  #css code for the styling of pages
  cover.css : styles for the cover page of the parent dashboard
  sidebar.css : styles for the sidebar of the nurse dashboard
  
  

Folder: SQL tables
#contains sql script to create all database tables
-database_tables.sql : sql script to create the database tables for infants, parents, recordings, etc.. 
