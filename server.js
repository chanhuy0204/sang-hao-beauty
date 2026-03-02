// ============================================================
//  SANG HÀO BEAUTY — Express Backend Server
//  Run: node server.js  (or: npm run dev  for auto-reload)
// ============================================================

require('dotenv').config();
const express        = require('express');
const mysql          = require('mysql2/promise');
const bcrypt         = require('bcryptjs');
const session        = require('express-session');
const cors           = require('cors');
const path           = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARE ───────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret:            process.env.SESSION_SECRET || 'sang-hao-secret',
  resave:            false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 8 * 60 * 60 * 1000 } // 8 hours
}));

// ─── DATABASE CONNECTION ──────────────────────────────────
const dbConfig = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'sang_hao_beauty',
  charset:  'utf8mb4',
  ssl: { rejectUnauthorized: false }
};

let db;
async function connectDB() {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL database:', dbConfig.database);
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('   Check your .env file and make sure MySQL is running.');
    process.exit(1);
  }
}

// ─── AUTH MIDDLEWARE ──────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.staff) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized. Please log in.' });
}

// ─── HELPERS ─────────────────────────────────────────────
function generateRef() {
  return 'SH-' + Date.now().toString(36).toUpperCase();
}

function addMinutesToTime(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total  = h * 60 + m + mins;
  const endH   = Math.floor(total / 60);
  const endM   = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;
}

// ============================================================
//  ROUTES: SERVICES
// ============================================================

// GET /api/services — list all active services
app.get('/api/services', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM services WHERE is_active = 1 ORDER BY id'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/services error:', err);
    res.status(500).json({ error: 'Failed to fetch services.' });
  }
});

// ============================================================
//  ROUTES: AVAILABILITY
// ============================================================

// GET /api/slots?date=YYYY-MM-DD&duration_mins=90
// Returns which 30-min slots are booked/available for that date + duration
app.get('/api/slots', async (req, res) => {
  const { date, duration_mins } = req.query;
  if (!date || !duration_mins) {
    return res.status(400).json({ error: 'date and duration_mins are required.' });
  }

  try {
    // Get all bookings on that date that are not cancelled
    const [rows] = await db.query(
      `SELECT TIME_FORMAT(booking_time, '%H:%i') AS start,
              TIME_FORMAT(end_time,     '%H:%i') AS end
       FROM bookings
       WHERE booking_date = ? AND status != 'cancelled'`,
      [date]
    );

    const bookedRanges = rows.map(r => ({
      start: timeToMins(r.start),
      end:   timeToMins(r.end),
    }));

    // Generate all 30-min slots from 08:00 to 18:00
    const allSlots = [];
    for (let mins = 8 * 60; mins <= 17 * 60 + 30; mins += 30) {
      const h   = Math.floor(mins / 60);
      const m   = mins % 60;
      const label = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      const slotEnd = mins + parseInt(duration_mins);

      // Check conflict: new booking [mins, slotEnd] vs existing [start, end]
      const conflict = bookedRanges.some(r => mins < r.end && slotEnd > r.start);

      allSlots.push({ time: label, booked: conflict });
    }

    res.json({ success: true, date, data: allSlots });
  } catch (err) {
    console.error('GET /api/slots error:', err);
    res.status(500).json({ error: 'Failed to fetch slots.' });
  }
});

function timeToMins(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// ============================================================
//  ROUTES: BOOKINGS (PUBLIC)
// ============================================================

// POST /api/bookings — create a new booking
app.post('/api/bookings', async (req, res) => {
  const {
    first_name, last_name, email, phone,
    service_id, booking_date, booking_time, notes
  } = req.body;

  // Validation
  if (!first_name || !last_name || !email || !service_id || !booking_date || !booking_time) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin. / Please fill in all required fields.' });
  }

  try {
    // Get service to determine duration
    const [svcRows] = await db.query('SELECT * FROM services WHERE id = ? AND is_active = 1', [service_id]);
    if (!svcRows.length) {
      return res.status(404).json({ error: 'Service not found.' });
    }
    const service = svcRows[0];
    const end_time = addMinutesToTime(booking_time, service.duration_mins);

    // Double-check slot is still available
    const [conflicts] = await db.query(
      `SELECT id FROM bookings
       WHERE booking_date = ?
         AND status != 'cancelled'
         AND booking_time < ?
         AND end_time > ?`,
      [booking_date, end_time, booking_time + ':00']
    );
    if (conflicts.length > 0) {
      return res.status(409).json({
        error: 'Khung giờ này vừa được đặt. Vui lòng chọn giờ khác. / This slot was just booked. Please choose another time.'
      });
    }

    const ref_code = generateRef();

    await db.query(
      `INSERT INTO bookings
         (ref_code, first_name, last_name, email, phone, service_id, booking_date, booking_time, end_time, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [ref_code, first_name, last_name, email, phone || null,
       service_id, booking_date, booking_time + ':00', end_time, notes || null]
    );

    res.status(201).json({
      success: true,
      message: 'Đặt lịch thành công! / Booking created successfully!',
      data: {
        ref_code,
        service_name_vi: service.name_vi,
        service_name_en: service.name_en,
        service_price:   service.price,
        duration_mins:   service.duration_mins,
        booking_date,
        booking_time,
      }
    });
  } catch (err) {
    console.error('POST /api/bookings error:', err);
    res.status(500).json({ error: 'Failed to create booking.' });
  }
});

// ============================================================
//  ROUTES: STAFF AUTH
// ============================================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM staff WHERE username = ? AND is_active = 1', [username]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng. / Invalid credentials.' });
    }

    const staff = rows[0];
    const match = await bcrypt.compare(password, staff.password);
    if (!match) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng. / Invalid credentials.' });
    }

    req.session.staff = { id: staff.id, username: staff.username, role: staff.role, full_name: staff.full_name };
    res.json({ success: true, data: { username: staff.username, role: staff.role, full_name: staff.full_name } });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET /api/auth/me — check if logged in
app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.staff) {
    res.json({ success: true, data: req.session.staff });
  } else {
    res.status(401).json({ error: 'Not logged in.' });
  }
});

// ============================================================
//  ROUTES: STAFF DASHBOARD (protected)
// ============================================================

// GET /api/admin/bookings — list all bookings with filters
app.get('/api/admin/bookings', requireAuth, async (req, res) => {
  const { status, date, service_id, search } = req.query;

  let sql = `
    SELECT b.*,
           s.name_vi AS service_name_vi,
           s.name_en AS service_name_en,
           s.icon    AS service_icon,
           s.price   AS service_price,
           s.duration_mins,
           TIME_FORMAT(b.booking_time, '%H:%i') AS booking_time_fmt,
           TIME_FORMAT(b.end_time,     '%H:%i') AS end_time_fmt
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'all') {
    sql += ' AND b.status = ?'; params.push(status);
  }
  if (date) {
    sql += ' AND b.booking_date = ?'; params.push(date);
  }
  if (service_id) {
    sql += ' AND b.service_id = ?'; params.push(service_id);
  }
  if (search) {
    sql += ' AND (b.first_name LIKE ? OR b.last_name LIKE ? OR b.email LIKE ? OR b.ref_code LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  sql += ' ORDER BY b.created_at DESC';

  try {
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/admin/bookings error:', err);
    res.status(500).json({ error: 'Failed to fetch bookings.' });
  }
});

// GET /api/admin/stats — dashboard statistics
app.get('/api/admin/stats', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [[{ total }]]     = await db.query('SELECT COUNT(*) AS total FROM bookings');
    const [[{ today_cnt }]] = await db.query('SELECT COUNT(*) AS today_cnt FROM bookings WHERE booking_date = ?', [today]);
    const [[{ pending }]]   = await db.query("SELECT COUNT(*) AS pending FROM bookings WHERE status = 'pending'");
    const [[{ confirmed }]] = await db.query("SELECT COUNT(*) AS confirmed FROM bookings WHERE status = 'confirmed'");

    res.json({ success: true, data: { total, today: today_cnt, pending, confirmed } });
  } catch (err) {
    console.error('GET /api/admin/stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// PUT /api/admin/bookings/:id/status — update booking status
app.put('/api/admin/bookings/:id/status', requireAuth, async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;
  const allowed    = ['pending', 'confirmed', 'cancelled'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  try {
    const [result] = await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    res.json({ success: true, message: 'Status updated.' });
  } catch (err) {
    console.error('PUT /api/admin/bookings/:id/status error:', err);
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// GET /api/admin/bookings/:id — single booking detail
app.get('/api/admin/bookings/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*,
              s.name_vi AS service_name_vi,
              s.name_en AS service_name_en,
              s.icon    AS service_icon,
              s.price   AS service_price,
              s.duration_mins,
              TIME_FORMAT(b.booking_time, '%H:%i') AS booking_time_fmt,
              TIME_FORMAT(b.end_time,     '%H:%i') AS end_time_fmt
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       WHERE b.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Booking not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch booking.' });
  }
});

// ─── SERVE FRONTEND ───────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START SERVER ─────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🌸 Sang Hào Beauty server running at http://localhost:${PORT}`);
    console.log(`   Press Ctrl+C to stop.\n`);
  });
});
