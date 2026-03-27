# SQL Tables

This folder contains the SQL script used to create all database tables for the project. The database runs on AWS RDS (MySQL 8.4) in production and MariaDB locally via XAMPP.

---

## Files

| File | Description |
|------|-------------|
| `database_tables.sql` | SQL script that creates all tables used by the application |

---

## Tables

| Table | Description |
|-------|-------------|
| `infants` | Stores infant records — name, room number, and linked parent |
| `parents` | Stores parent records — name and username |
| `nurses` | Stores nurse records — name |
| `login` | Parent login credentials — username, password, and linked parent ID |
| `nurse_login` | Nurse login credentials — username, password, and linked nurse ID |
| `parent_login` | Alternative parent login table |
| `signup` | Stores signup data before a parent account is fully created |
| `recordings` | Stores audio recordings as blobs — includes name, date, length, playback status, and scheduled time |
| `recording_schedule` | Stores the scheduled playback time for each recording |
| `infantparent` | Junction table linking infants to parents |
| `infantrecording` | Junction table linking infants to recordings |
| `parentrecording` | Junction table linking parents to recordings |

---

## Importing the Schema

### MySQL 8 (Production / Linux / macOS)

```bash
mysql -u admin -p -e "CREATE DATABASE remote_reading;"
mysql -u admin -p remote_reading < database_tables.sql
```

### MariaDB — macOS (XAMPP)

MariaDB does not support the `utf8mb4_0900_ai_ci` collation used in this file. Run this first to create a compatible version:

```bash
sed 's/utf8mb4_0900_ai_ci/utf8mb4_general_ci/g' database_tables.sql > database_tables_local.sql
mysql -u root -p remote_reading < database_tables_local.sql
```

### MariaDB — Windows (XAMPP)

**Option 1 — PowerShell:**

```powershell
(Get-Content database_tables.sql) -replace 'utf8mb4_0900_ai_ci', 'utf8mb4_general_ci' | Set-Content database_tables_local.sql
mysql -u root -p remote_reading < database_tables_local.sql
```

**Option 2 — phpMyAdmin (works on all operating systems):**

1. Open `http://localhost/phpmyadmin`
2. Select the `remote_reading` database
3. Go to the Import tab
4. Click Choose File and select the modified SQL file
5. Uncheck "Enable foreign key checks"
6. Click Go

---

## Notes

- Foreign key checks must be disabled during import due to the order in which tables are created in the script
- The `recordings` table stores audio as `LONGBLOB` — suitable for storing `.wav` files directly in the database
- The `recording_schedule` table uses `datetime` for scheduled times — ensure the server and Raspberry Pi are synced to the same timezone