# Remote Reading for Newborns

A full-stack web application that allows parents to record voice messages for their newborns in the NICU, played automatically through a Raspberry Pi speaker at the baby's bedside.

---

## How It Works

Parents log in through a web interface, record a voice message, and request a playback time. A nurse reviews and approves the schedule. At the scheduled time, a Raspberry Pi connected to the baby's room fetches the recording from the database and plays it — no manual intervention needed.

```
Parent (Browser) → Web Server (EC2) → Database (RDS) → Raspberry Pi → Speaker
```

---

## Tech Stack

| Layer           | Technology                         |
|-----------------|------------------------------------|
| Frontend        | HTML, CSS, JavaScript, Bootstrap 5 |
| Backend         | PHP 8+                             |
| Web Server      | Apache                             |
| Database        | MySQL 8 / MariaDB                  |
| Cloud           | AWS EC2 + AWS RDS                  |
| Edge Device     | Raspberry Pi (Python)              |
| Package Manager | Composer                           |

---

## Project Structure

```
Code/
├── Server Code/          Web server code (runs on AWS EC2)
├── Raspberry Pi/         Pi script (runs on the physical device)
└── SQL tables/           Database schema
```

Each folder contains its own README with detailed file descriptions.

---

## Prerequisites

- PHP 8.0 or higher
- Composer
- MySQL 8+ or MariaDB 10.4+
- Apache with mod_php enabled
- Python 3 (for Raspberry Pi component)

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/mariamelwirish/remote-reading.git
cd remote-reading
```

### 2. Install PHP dependencies

```bash
cd "Server Code"
composer install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your local credentials:

```
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=remote_reading
```

### 4. Set up the database

See `SQL tables/README.md` for full import instructions including OS-specific steps.

### 5. Configure your web server

Point Apache's document root to `Server Code/php/`.

**macOS (XAMPP) — using a symlink:**
```bash
sudo ln -s "/path/to/project/Code/Server Code/php" /Applications/XAMPP/xamppfiles/htdocs/remote-reading
```

**Linux:**
```bash
sudo ln -s "/path/to/project/Code/Server Code/php" /var/www/html/remote-reading
```

**Windows (XAMPP):**

Open `C:\xampp\apache\conf\extra\httpd-vhosts.conf` and add:

```apache
<VirtualHost *:80>
    DocumentRoot "C:/path/to/project/Code/Server Code/php"
    ServerName localhost
    <Directory "C:/path/to/project/Code/Server Code/php">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

Then restart Apache in the XAMPP control panel.

> **macOS note:** Keep the project outside OneDrive/iCloud folders — Apache cannot access files stored there due to macOS security restrictions.

### 6. Access the app

```
http://localhost/remote-reading/
```

---

## Production Deployment (AWS)

### Infrastructure

- **EC2:** Ubuntu 24.04 LTS, t2.micro, Apache + PHP
- **RDS:** MySQL 8.4, db.t4g.micro (free tier)
- **Elastic IP:** Static public IP assigned to EC2

### Automated Deployment

This project uses GitHub Actions for CI/CD. Every push to `main` automatically deploys to EC2. See `.github/workflows/deploy.yml` for the workflow.

### Production Environment Variables

On the EC2 instance, create `/var/www/html/.env`:

```
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_USER=admin
DB_PASS=your_rds_password
DB_NAME=remote_reading
```

---

## Raspberry Pi Setup

See `Raspberry Pi/README.md` for full setup instructions.

---

## Environment Variables Reference

| Variable | Description       | Example                         |
|----------|-------------------|---------------------------------|
| DB_HOST  | Database host     | localhost or RDS endpoint       |
| DB_USER  | Database username | root or admin                   |
| DB_PASS  | Database password | your_password                   |
| DB_NAME  | Database name     | remote_reading                  |

---

## Contributing

1. Always work on the `dev` branch — never commit directly to `main`
2. Test locally before pushing
3. Open a pull request from `dev` into `main` to trigger deployment
4. Never commit `.env` or any credentials

---

## Security Notes

- All credentials are managed via `.env` files and never hardcoded in source code
- `.env` is listed in `.gitignore` and will never be committed to the repository
- Password hashing via `password_hash()` is in progress
- Prepared statements to replace raw SQL queries are in progress
- HTTPS via SSL/TLS (Certbot) is in progress

---

## License

This project is private. All rights reserved.