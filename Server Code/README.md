# Server Code

This folder contains all the web server code hosted on the AWS EC2 instance. The server runs Apache with PHP and connects to an AWS RDS MySQL database.

---

## Folder Structure

```
Server Code/
├── php/          PHP backend files
├── js/           JavaScript files
├── styles/       CSS stylesheets
├── assets/       Static assets (images, icons)
├── .env          Environment variables (not committed)
├── .env.example  Environment variable template
├── .gitignore
├── composer.json
└── composer.lock
```

---

## Subfolders

### php/

Contains all PHP backend files. Apache serves this folder as the web root.

| File | Description |
|------|-------------|
| `index.php` | Entry point — loads the login page |
| `connect.php` | Establishes the MySQL database connection using credentials from `.env` |
| `auth_session.php` | Checks if a user is logged in; redirects to login if not |
| `login.php` | Parent login page — validates credentials against the database |
| `nurse-login.php` | Nurse login page — separate login flow for nurses |
| `logout.php` | Destroys the current session and redirects to login |
| `register.php` | Parent registration page — creates a new account |
| `cover.php` | Cover/landing page shown inside the parent dashboard |
| `dashboard-parent.php` | Main parent dashboard — contains record, pause, and stop buttons and displays sent messages |
| `dashboard-nurse.php` | Nurse dashboard — shows all infants and recording statuses (currently unused) |
| `navbar.php` | Navigation bar component (currently unused) |
| `sidebar.php` | Sidebar used by the nurse dashboard — shows new, old, and scheduled recordings |
| `parent-message-nav.php` | Displayed inside `dashboard-parent.php` — shows status of all sent recordings (not played, scheduled, played) |
| `send-recording-modal.php` | Modal that appears when a parent sends a recording — collects name, message, and optional scheduled date/time |
| `sendblob.php` | Receives the audio blob from the browser and saves it to the database |
| `schedule-recording.php` | Schedules a recording for a specific date and time |
| `reschedule-recording.php` | Reschedules a previously scheduled recording |
| `delete-recording.php` | Deletes a recording from the database |
| `mark_as_played.php` | Marks a recording as played and logs the time it was played |
| `get-infants.php` | Used by the nurse dashboard — retrieves all infants from the database |
| `get-recordings.php` | Retrieves recordings for a given infant |
| `create-infant.php` | Adds a new infant record to the database |
| `show-played-recordings.php` | Shows recordings that have been played (currently unused — replaced by `parent-message-nav.php`) |

---

### js/

Contains all JavaScript files used by the frontend.

| File | Description |
|------|-------------|
| `record.js` | Handles start, pause, and stop recording actions; also manages schedule, reschedule, and delete operations |
| `recorder.js` | Records audio from the browser microphone, creates a playback bar and download link |
| `color-modes.js` | Toggles between dark mode and light mode |
| `sidebar.js` | Manages tooltips for the nurse dashboard sidebar |

---

### styles/

Contains CSS files for page styling.

| File | Description |
|------|-------------|
| `cover.css` | Styles for the parent dashboard cover page |
| `sidebar.css` | Styles for the nurse dashboard sidebar |

---

### assets/

Contains static assets used by the frontend.

| File | Description |
|------|-------------|
| `emoji_books_.png` | Logo image used in the website header |

---

## Setup

See the main `README.md` at the root of this repository for full local and production setup instructions.

---

## Environment Variables

This folder requires a `.env` file at the root of `Server Code/`. Copy `.env.example` and fill in your values:

```
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=remote_reading
```

The `.env` file is loaded automatically by `connect.php` using the `vlucas/phpdotenv` library.

---

## Dependencies

PHP dependencies are managed via Composer. To install:

```bash
composer install
```

To add a new package:

```bash
composer require vendor/package-name
```

Never commit the `vendor/` folder — it is listed in `.gitignore` and regenerated automatically during deployment via `composer install`.