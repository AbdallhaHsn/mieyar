const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'portfolio-db.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage for avatar / project image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `upload-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Read DB
function readDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db:', err);
    return null;
  }
}

// Helper: Write DB
function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing db:', err);
    return false;
  }
}

// Admin PIN Auth Middleware
function authAdmin(req, res, next) {
  const pin = req.headers['x-admin-pin'] || req.query.pin || (req.body && req.body.pin);
  const db = readDb();
  if (!db || !pin || String(pin).trim() !== String(db.profile.adminPin).trim()) {
    return res.status(401).json({ success: false, message: 'رمز الأمان غير صحيح (Unauthorized: Invalid Admin PIN)' });
  }
  next();
}

// Public API: Get all portfolio data
app.get('/api/portfolio', (req, res) => {
  const db = readDb();
  if (!db) return res.status(500).json({ error: 'Database error' });
  // Exclude admin PIN from public response
  const sanitized = JSON.parse(JSON.stringify(db));
  delete sanitized.profile.adminPin;
  res.json(sanitized);
});

// Admin Login Check
app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  const db = readDb();
  if (db && pin && String(pin).trim() === String(db.profile.adminPin).trim()) {
    res.json({ success: true, message: 'تم التحقق بنجاح' });
  } else {
    res.status(401).json({ success: false, message: 'رمز الأمان غير صحيح' });
  }
});

// Admin: Update Profile
app.put('/api/admin/profile', authAdmin, (req, res) => {
  const db = readDb();
  if (!db) return res.status(500).json({ error: 'Database error' });
  
  const currentPin = db.profile.adminPin;
  db.profile = { ...db.profile, ...req.body };
  // Keep original PIN unless changed via dedicated endpoint
  db.profile.adminPin = currentPin;
  
  if (writeDb(db)) {
    res.json({ success: true, profile: db.profile });
  } else {
    res.status(500).json({ error: 'Failed to save changes' });
  }
});

// Admin: Add or Update Project
app.post('/api/admin/projects', authAdmin, (req, res) => {
  const db = readDb();
  if (!db) return res.status(500).json({ error: 'Database error' });
  
  const newProject = {
    id: req.body.id || `proj-${Date.now()}`,
    category: req.body.category || 'erp',
    featured: req.body.featured !== undefined ? req.body.featured : true,
    icon: req.body.icon || 'pi-box',
    titleAr: req.body.titleAr || '',
    titleEn: req.body.titleEn || '',
    descriptionAr: req.body.descriptionAr || '',
    descriptionEn: req.body.descriptionEn || '',
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    liveUrl: req.body.liveUrl || '',
    repoUrl: req.body.repoUrl || '',
    badgeAr: req.body.badgeAr || '',
    badgeEn: req.body.badgeEn || ''
  };
  
  db.projects.unshift(newProject);
  writeDb(db);
  res.json({ success: true, project: newProject });
});

app.put('/api/admin/projects/:id', authAdmin, (req, res) => {
  const db = readDb();
  if (!db) return res.status(500).json({ error: 'Database error' });
  
  const index = db.projects.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Project not found' });
  
  db.projects[index] = { ...db.projects[index], ...req.body, id: req.params.id };
  writeDb(db);
  res.json({ success: true, project: db.projects[index] });
});

app.delete('/api/admin/projects/:id', authAdmin, (req, res) => {
  const db = readDb();
  if (!db) return res.status(500).json({ error: 'Database error' });
  
  db.projects = db.projects.filter(p => p.id !== req.params.id);
  writeDb(db);
  res.json({ success: true, message: 'Project deleted' });
});

// Admin: Add / Update / Delete Experience
app.post('/api/admin/experiences', authAdmin, (req, res) => {
  const db = readDb();
  if (!db) return res.status(500).json({ error: 'Database error' });
  
  const newExp = {
    id: req.body.id || `exp-${Date.now()}`,
    companyAr: req.body.companyAr || '',
    companyEn: req.body.companyEn || '',
    roleAr: req.body.roleAr || '',
    roleEn: req.body.roleEn || '',
    periodAr: req.body.periodAr || '',
    periodEn: req.body.periodEn || '',
    responsibilitiesAr: req.body.responsibilitiesAr || '',
    responsibilitiesEn: req.body.responsibilitiesEn || ''
  };
  
  db.experiences.unshift(newExp);
  writeDb(db);
  res.json({ success: true, experience: newExp });
});

app.put('/api/admin/experiences/:id', authAdmin, (req, res) => {
  const db = readDb();
  if (!db) return res.status(500).json({ error: 'Database error' });
  
  const index = db.experiences.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Experience not found' });
  
  db.experiences[index] = { ...db.experiences[index], ...req.body, id: req.params.id };
  writeDb(db);
  res.json({ success: true, experience: db.experiences[index] });
});

app.delete('/api/admin/experiences/:id', authAdmin, (req, res) => {
  const db = readDb();
  if (!db) return res.status(500).json({ error: 'Database error' });
  
  db.experiences = db.experiences.filter(e => e.id !== req.params.id);
  writeDb(db);
  res.json({ success: true, message: 'Experience deleted' });
});

// Admin: Update Skills
app.put('/api/admin/skills', authAdmin, (req, res) => {
  const db = readDb();
  if (!db) return res.status(500).json({ error: 'Database error' });
  
  if (Array.isArray(req.body.skills)) {
    db.skills = req.body.skills;
    writeDb(db);
    res.json({ success: true, skills: db.skills });
  } else {
    res.status(400).json({ error: 'Skills must be an array' });
  }
});

// Admin: Change PIN
app.put('/api/admin/pin', authAdmin, (req, res) => {
  const { newPin } = req.body;
  if (!newPin || String(newPin).trim().length < 4) {
    return res.status(400).json({ error: 'PIN must be at least 4 digits' });
  }
  const db = readDb();
  db.profile.adminPin = String(newPin).trim();
  writeDb(db);
  res.json({ success: true, message: 'تم تغيير رمز الأمان بنجاح' });
});

// Admin: Upload Avatar
app.post('/api/admin/upload-avatar', authAdmin, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const avatarUrl = `/uploads/${req.file.filename}`;
  
  const db = readDb();
  db.profile.avatarUrl = avatarUrl;
  writeDb(db);
  
  res.json({ success: true, avatarUrl });
});

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Portfolio & CV App running on http://localhost:${PORT}`);
});
