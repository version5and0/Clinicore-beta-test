const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'cliniCoreSecretKey12345', // maxfiy kalitni o'zgartiring
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 } // 1 soat sessiya muddati
}));

// Static fayllar
app.use(express.static(path.join(__dirname, 'public')));

// Data fayllar joyi
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const HEALTH_FILE = path.join(DATA_DIR, 'health.json');

// Helper: JSON fayldan o'qish
function readJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Helper: JSON faylga yozish
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Middleware: faqat login qilingan foydalanuvchilar uchun
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Iltimos, tizimga kiring.' });
  }
  next();
}

// Middleware: faqat admin uchun
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin ruxsatnomasi kerak.' });
  }
  next();
}

// --- API: Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Noto‘g‘ri login yoki parol' });
  }

  req.session.user = { id: user.id, username: user.username, role: user.role };
  res.json({ role: user.role });
});

// API: Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Chiqish amalga oshirildi' });
  });
});

// --- API: Comments (admin boshqaruvi)

// Fikrlarni olish (admin uchun)
app.get('/api/comments', requireAdmin, (req, res) => {
  const comments = readJSON(COMMENTS_FILE);
  res.json(comments);
});

// Fikr qo'shish (admin uchun)
app.post('/api/comments', requireAdmin, (req, res) => {
  const { author, content, rating } = req.body;
  if (!author || !content || !rating) {
    return res.status(400).json({ error: 'To‘liq ma‘lumot kiriting' });
  }
  const comments = readJSON(COMMENTS_FILE);
  const newComment = { id: uuidv4(), author, content, rating: Number(rating) };
  comments.push(newComment);
  writeJSON(COMMENTS_FILE, comments);
  res.json(newComment);
});

// Fikrni tahrirlash (admin uchun)
app.put('/api/comments/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  const { author, content, rating } = req.body;
  const comments = readJSON(COMMENTS_FILE);
  const idx = comments.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Fikr topilmadi' });

  comments[idx] = { ...comments[idx], author, content, rating: Number(rating) };
  writeJSON(COMMENTS_FILE, comments);
  res.json(comments[idx]);
});

// Fikrni o'chirish (admin uchun)
app.delete('/api/comments/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  let comments = readJSON(COMMENTS_FILE);
  comments = comments.filter(c => c.id !== id);
  writeJSON(COMMENTS_FILE, comments);
  res.json({ message: 'Fikr o‘chirildi' });
});

// --- API: Foydalanuvchi kasallik tarixlari

// Kasallik tarixlarini olish (faqat login qilgan user uchun)
app.get('/api/health', requireLogin, (req, res) => {
  const healthData = readJSON(HEALTH_FILE);
  const userData = healthData.find(h => h.userId === req.session.user.id);
  res.json(userData ? userData.records : []);
});

// Kasallik tarixiga yozuv qo'shish
app.post('/api/health', requireLogin, (req, res) => {
  const { disease, date, notes } = req.body;
  if (!disease || !date) {
    return res.status(400).json({ error: 'Kasallik nomi va sana kiriting' });
  }

  let healthData = readJSON(HEALTH_FILE);
  let userData = healthData.find(h => h.userId === req.session.user.id);

  const newRecord = {
    id: uuidv4(),
    disease,
    date,
    notes: notes || ''
  };

  if (userData) {
    userData.records.push(newRecord);
  } else {
    healthData.push({
      userId: req.session.user.id,
      records: [newRecord]
    });
  }

  writeJSON(HEALTH_FILE, healthData);
  res.json(newRecord);
});

// --- Serverni ishga tushurish
app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT} manzilida ishga tushdi`);
});
