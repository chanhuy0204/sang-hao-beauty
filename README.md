# 🌸 Sang Hào Beauty — Booking System

## Project Structure
```
sang-hao-beauty/
├── database.sql        ← Run this in MySQL Workbench first
├── server.js           ← Node.js/Express backend
├── package.json        ← Dependencies
├── .env.example        ← Copy to .env and fill in your values
├── public/
│   └── index.html      ← Frontend (served by Express)
└── README.md
```

---

## ⚙️ Setup Instructions

### Step 1 — Install Node.js
Download from: https://nodejs.org (choose LTS version)

### Step 2 — Set up the Database
1. Open **MySQL Workbench**
2. Connect to your local MySQL server
3. Open the file `database.sql`
4. Click ⚡ (Execute) to run it
5. This creates the `sang_hao_beauty` database with all tables and seed data

### Step 3 — Configure Environment
1. Copy `.env.example` to `.env`
   ```
   cp .env.example .env
   ```
2. Open `.env` and set your MySQL password:
   ```
   DB_PASSWORD=your_mysql_root_password
   ```

### Step 4 — Install Dependencies
Open a terminal in VS Code (`Ctrl + `` `) and run:
```bash
npm install
```

### Step 5 — Start the Server
```bash
# Normal start
node server.js

# Auto-reload on file changes (recommended for development)
npm run dev
```

### Step 6 — Open the Website
Open your browser and go to: **http://localhost:3000**

---

## 🔐 Staff Login
| Username | Password    | Role  |
|----------|-------------|-------|
| admin    | reserve2025 | Admin |
| staff    | staff123    | Staff |

---

## 📡 API Endpoints

| Method | URL                              | Auth | Description              |
|--------|----------------------------------|------|--------------------------|
| GET    | /api/services                    | No   | List all services        |
| GET    | /api/slots?date=&duration_mins=  | No   | Available time slots     |
| POST   | /api/bookings                    | No   | Create a booking         |
| POST   | /api/auth/login                  | No   | Staff login              |
| POST   | /api/auth/logout                 | Yes  | Staff logout             |
| GET    | /api/auth/me                     | Yes  | Check session            |
| GET    | /api/admin/bookings              | Yes  | List all bookings        |
| GET    | /api/admin/bookings/:id          | Yes  | Single booking detail    |
| PUT    | /api/admin/bookings/:id/status   | Yes  | Update booking status    |
| GET    | /api/admin/stats                 | Yes  | Dashboard statistics     |

---

## 🛠️ Troubleshooting

**"MySQL connection failed"**
→ Make sure MySQL is running and your `.env` password is correct

**"Cannot find module"**
→ Run `npm install` again

**Port already in use**
→ Change `PORT=3001` in your `.env` file
