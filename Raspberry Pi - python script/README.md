# Raspberry Pi

This folder contains the Python script that runs on the Raspberry Pi device placed in the NICU. The Pi connects to the AWS RDS database, checks for scheduled recordings, and plays them through a connected speaker at the appropriate time.

---

## Files

| File | Description |
|------|-------------|
| `playrecordings.py` | Connects to the database, checks for any recordings scheduled for the current time, fetches the audio data, and plays it through the speaker |

---

## How It Works

1. The script connects to the RDS MySQL database
2. It queries the `recording_schedule` table for any recordings scheduled at or before the current time that have not yet been played
3. It fetches the corresponding audio blob from the `recordings` table
4. It saves the blob as a temporary `.wav` file
5. It plays the `.wav` file through the connected speaker
6. It marks the recording as played in the database

---

## Prerequisites

- Python 3.6 or higher
- A connected speaker or audio output device
- Network access to the AWS RDS instance

---

## Installation

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure database credentials

Create a `.env` file in this folder (or update the credentials directly in `playrecordings.py`):

```
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_USER=admin
DB_PASS=your_rds_password
DB_NAME=remote_reading
```

---

## Running the Script

### Manually

```bash
python3 playrecordings.py
```

### Automatically on a Schedule (Recommended)

Use a cron job to run the script every minute so it checks for due recordings automatically:

```bash
crontab -e
```

Add this line:

```
* * * * * python3 /path/to/playrecordings.py
```

---

## Known Issues (In Progress)

- `infant_id` is currently hardcoded — needs to be dynamic based on which Pi is assigned to which infant
- No error handling if the database connection fails
- The script currently tries to fetch audio from an EC2 path instead of directly from the database — this is being fixed to fetch the blob directly from RDS