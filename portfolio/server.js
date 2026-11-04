const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'portfolio-db.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ---------------------------------------------------------------- Uploads
const ALLOWED_IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `img-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_IMAGE_EXT.has(ext) && /^image\//.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files (png, jpg, webp, gif) are allowed'));
  }
});

app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------- DB helpers
function readDb() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading db:', err);
    return null;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing db:', err);
    return false;
  }
}

// ---------------------------------------------------------------- PIN hashing
function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPin(pin, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(String(pin), salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === test.length && crypto.timingSafeEqual(expected, test);
}

// ---------------------------------------------------------------- Bootstrap / migrations
const SEED_ARTICLES = [
  {
    id: 'zatca-phase2-architecture',
    slug: 'zatca-phase2-architecture',
    titleAr: 'كيف بنينا محرك الفوترة الإلكترونية ZATCA المرحلة الثانية داخل نظام ERP',
    titleEn: 'How We Built a ZATCA Phase 2 E-Invoicing Engine Inside an ERP',
    excerptAr: 'رحلة هندسية من التوقيع الرقمي ECDSA إلى إنشاء فواتير UBL 2.1 والربط الحي مع منصة فاتورة.',
    excerptEn: 'An engineering journey from ECDSA signing to UBL 2.1 invoices and live Fatoora integration.',
    contentAr: '## لماذا المرحلة الثانية مختلفة؟\nالمرحلة الأولى كانت توليد فاتورة ورمز QR فقط. أما المرحلة الثانية فتتطلب **تكاملاً حياً** مع منصة فاتورة، وتوقيعاً رقمياً لكل فاتورة، وتسلسلاً مشفراً (Hash Chain).\n\n![لوحة تحليلات الفواتير](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80)\n\n## الأجزاء الرئيسية\n- توليد XML بصيغة UBL 2.1\n- توقيع ECDSA على منحنى secp256k1\n- حساب Hash الفاتورة السابقة (PIH)\n- الإبلاغ والتصريح عبر واجهات ZATCA\n\n> القاعدة الذهبية: لا تعدّل فاتورة مُصرَّح بها أبداً، أصدر إشعاراً دائناً.\n\n## نصائح عملية\n1. افصل مفاتيح التوقيع عن قاعدة البيانات.\n2. سجّل كل محاولة إرسال مع الاستجابة الكاملة.\n3. صمّم طابور إعادة محاولة للفواتير الفاشلة.\n\n```csharp\nvar hash = Convert.ToBase64String(SHA256.HashData(canonicalXml));\n```',
    contentEn: '## Why is Phase 2 different?\nPhase 1 only required generating an invoice and a QR code. Phase 2 demands **live integration** with the Fatoora platform, a digital signature per invoice and a cryptographic hash chain.\n\n![Invoice analytics dashboard](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80)\n\n## Key building blocks\n- UBL 2.1 XML generation\n- ECDSA signing on the secp256k1 curve\n- Previous Invoice Hash (PIH) chaining\n- Reporting & clearance through ZATCA APIs\n\n> Golden rule: never edit a cleared invoice — issue a credit note instead.\n\n## Practical tips\n1. Keep signing keys away from the database.\n2. Log every submission attempt with the full response.\n3. Build a retry queue for failed invoices.\n\n```csharp\nvar hash = Convert.ToBase64String(SHA256.HashData(canonicalXml));\n```',
    coverUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80',
    category: 'erp',
    tags: ['ZATCA', 'E-Invoicing', '.NET 8', 'Security'],
    status: 'published',
    featured: true,
    views: 0,
    likes: 0,
    createdAt: '2026-10-20T09:00:00.000Z',
    updatedAt: '2026-10-20T09:00:00.000Z',
    comments: []
  },
  {
    id: 'modular-monolith-erp',
    slug: 'modular-monolith-erp',
    titleAr: 'لماذا اخترنا Modular Monolith لنظام ERP بدلاً من Microservices؟',
    titleEn: 'Why We Chose a Modular Monolith Over Microservices for Our ERP',
    excerptAr: 'مقارنة صريحة بين البساطة التشغيلية وقابلية التوسع، وكيف حافظنا على حدود الوحدات نظيفة.',
    excerptEn: 'An honest comparison of operational simplicity vs scalability and how we kept module boundaries clean.',
    contentAr: '## القرار\nأنظمة ERP تتطلب **اتساقاً معاملاتياً** عالياً بين المحاسبة والمخزون والمشتريات. توزيعها على خدمات مستقلة يعني Sagas وتعقيداً لا تحتاجه معظم الشركات.\n\n![كود برمجي](https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80)\n\n## كيف نحافظ على النظافة؟\n- كل وحدة لها Domain / Application / Infrastructure خاصة بها\n- التواصل بين الوحدات عبر Contracts وأحداث داخلية فقط\n- اختبارات معمارية تمنع الاعتماد المتبادل\n\n> ابدأ بوحدات متماسكة، وافصل لاحقاً فقط إذا أثبتت الأرقام الحاجة.',
    contentEn: '## The decision\nERP systems need strong **transactional consistency** across accounting, inventory and procurement. Splitting them into services means sagas and complexity most companies do not need.\n\n![Source code](https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80)\n\n## Keeping it clean\n- Each module owns its Domain / Application / Infrastructure layers\n- Modules talk through contracts and in-process events only\n- Architecture tests forbid cross-module dependencies\n\n> Start with cohesive modules, and split later only if the numbers prove the need.',
    coverUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1400&q=80',
    category: 'architecture',
    tags: ['Architecture', 'Modular Monolith', 'CQRS'],
    status: 'published',
    featured: false,
    views: 0,
    likes: 0,
    createdAt: '2026-10-28T09:00:00.000Z',
    updatedAt: '2026-10-28T09:00:00.000Z',
    comments: []
  }
];

function bootstrapDb() {
  const db = readDb();
  if (!db) return;
  let changed = false;

  if (db.profile && db.profile.adminPin) {
    db.profile.adminPinHash = hashPin(db.profile.adminPin);
    delete db.profile.adminPin;
    changed = true;
    console.log('🔐 Admin PIN migrated to a salted hash.');
  }
  if (!Array.isArray(db.articles)) { db.articles = SEED_ARTICLES; changed = true; }
  if (!Array.isArray(db.messages)) { db.messages = []; changed = true; }
  if (!db.analytics) { db.analytics = { visits: {} }; changed = true; }
  if (changed) writeDb(db);
}
bootstrapDb();

// ---------------------------------------------------------------- Small utilities
const clean = (v, max = 200) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const today = () => new Date().toISOString().slice(0, 10);
const newId = (p) => `${p}-${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`;

function slugify(text) {
  const s = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
  return s || `article-${Date.now().toString(36)}`;
}

function uniqueSlug(db, base, ignoreId) {
  let slug = base, i = 2;
  while (db.articles.some(a => a.slug === slug && a.id !== ignoreId)) slug = `${base}-${i++}`;
  return slug;
}

// Simple in-memory rate limiter
const buckets = new Map();
function rateLimit(name, max, windowMs) {
  return (req, res, next) => {
    const key = `${name}:${req.ip}`;
    const now = Date.now();
    const b = buckets.get(key) || { count: 0, reset: now + windowMs };
    if (now > b.reset) { b.count = 0; b.reset = now + windowMs; }
    b.count++;
    buckets.set(key, b);
    if (b.count > max) {
      return res.status(429).json({ success: false, message: 'محاولات كثيرة، حاول لاحقاً (Too many requests)' });
    }
    next();
  };
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k); }, 10 * 60 * 1000).unref();

// ---------------------------------------------------------------- Admin sessions
const sessions = new Map(); // token -> expiresAt
const SESSION_TTL = 12 * 60 * 60 * 1000;

function authAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const exp = sessions.get(token);
  if (!token || !exp || exp < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ success: false, message: 'الجلسة منتهية، سجّل الدخول مجدداً (Unauthorized)' });
  }
  next();
}

const publicProfile = (db) => { const p = { ...db.profile }; delete p.adminPinHash; delete p.adminPin; return p; };

const articleSummary = (a) => {
  const { contentAr, contentEn, comments, ...rest } = a;
  const words = ((contentEn || '') + ' ' + (contentAr || '')).split(/\s+/).length / 2;
  return { ...rest, commentCount: (comments || []).filter(c => !c.hidden).length, readMinutes: Math.max(1, Math.round(words / 200)) };
};

// ================================================================ PUBLIC API
app.get('/api/portfolio', (req, res) => {
  const db = readDb();
  if (!db) return res.status(500).json({ error: 'Database error' });
  const { articles, messages, analytics, ...rest } = db;
  res.json({ ...rest, profile: publicProfile(db) });
});

app.post('/api/track', rateLimit('track', 60, 60 * 1000), (req, res) => {
  const db = readDb();
  if (!db) return res.json({ success: false });
  const d = today();
  db.analytics.visits[d] = (db.analytics.visits[d] || 0) + 1;
  writeDb(db);
  res.json({ success: true });
});

app.post('/api/messages', rateLimit('msg', 5, 10 * 60 * 1000), (req, res) => {
  const name = clean(req.body.name, 100);
  const contact = clean(req.body.contact, 150);
  const body = clean(req.body.body, 3000);
  if (!name || !contact || !body) return res.status(400).json({ success: false, message: 'يرجى ملء جميع الحقول' });
  const db = readDb();
  db.messages.unshift({ id: newId('msg'), name, contact, body, createdAt: new Date().toISOString(), read: false });
  writeDb(db);
  res.json({ success: true });
});

// Articles - public
app.get('/api/articles', (req, res) => {
  const db = readDb();
  if (!db) return res.status(500).json({ error: 'Database error' });
  const list = db.articles
    .filter(a => a.status === 'published')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(articleSummary);
  res.json(list);
});

app.get('/api/articles/:slug', (req, res) => {
  const db = readDb();
  const a = db.articles.find(x => x.slug === req.params.slug && x.status === 'published');
  if (!a) return res.status(404).json({ error: 'Article not found' });
  const related = db.articles
    .filter(x => x.id !== a.id && x.status === 'published')
    .map(x => ({ x, score: (x.tags || []).filter(t => (a.tags || []).includes(t)).length + (x.category === a.category ? 1 : 0) }))
    .sort((p, q) => q.score - p.score).slice(0, 3).map(o => articleSummary(o.x));
  res.json({
    ...articleSummary(a),
    contentAr: a.contentAr,
    contentEn: a.contentEn,
    comments: (a.comments || []).filter(c => !c.hidden).map(({ id, name, text, createdAt }) => ({ id, name, text, createdAt })),
    related
  });
});

app.post('/api/articles/:slug/view', rateLimit('view', 60, 60 * 1000), (req, res) => {
  const db = readDb();
  const a = db.articles.find(x => x.slug === req.params.slug);
  if (!a) return res.status(404).json({ error: 'Not found' });
  a.views = (a.views || 0) + 1;
  writeDb(db);
  res.json({ views: a.views });
});

app.post('/api/articles/:slug/like', rateLimit('like', 30, 60 * 1000), (req, res) => {
  const db = readDb();
  const a = db.articles.find(x => x.slug === req.params.slug);
  if (!a) return res.status(404).json({ error: 'Not found' });
  a.likes = Math.max(0, (a.likes || 0) + (req.body && req.body.unlike ? -1 : 1));
  writeDb(db);
  res.json({ likes: a.likes });
});

app.post('/api/articles/:slug/comments', rateLimit('comment', 6, 10 * 60 * 1000), (req, res) => {
  const name = clean(req.body.name, 60);
  const text = clean(req.body.text, 1500);
  if (!name || text.length < 2) return res.status(400).json({ success: false, message: 'الاسم والتعليق مطلوبان' });
  const db = readDb();
  const a = db.articles.find(x => x.slug === req.params.slug && x.status === 'published');
  if (!a) return res.status(404).json({ error: 'Not found' });
  a.comments = a.comments || [];
  const comment = { id: newId('c'), name, text, createdAt: new Date().toISOString(), hidden: false };
  a.comments.push(comment);
  writeDb(db);
  res.json({ success: true, comment: { id: comment.id, name, text, createdAt: comment.createdAt } });
});

// ================================================================ ADMIN API
app.post('/api/admin/login', rateLimit('login', 8, 15 * 60 * 1000), (req, res) => {
  const { pin } = req.body || {};
  const db = readDb();
  if (db && pin && verifyPin(String(pin).trim(), db.profile.adminPinHash)) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + SESSION_TTL);
    return res.json({ success: true, token, message: 'تم التحقق بنجاح' });
  }
  res.status(401).json({ success: false, message: 'رمز الأمان غير صحيح' });
});

app.post('/api/admin/logout', authAdmin, (req, res) => {
  sessions.delete((req.headers.authorization || '').slice(7));
  res.json({ success: true });
});

app.get('/api/admin/session', authAdmin, (req, res) => res.json({ success: true }));

// Full data for dashboard
app.get('/api/admin/data', authAdmin, (req, res) => {
  const db = readDb();
  res.json({ ...db, profile: publicProfile(db) });
});

// Profile
app.put('/api/admin/profile', authAdmin, (req, res) => {
  const db = readDb();
  const hash = db.profile.adminPinHash;
  const allowed = ['nameAr', 'nameEn', 'titleAr', 'titleEn', 'bioAr', 'bioEn', 'avatarUrl', 'email', 'phone',
    'locationAr', 'locationEn', 'githubUrl', 'linkedinUrl', 'whatsappUrl', 'resumeUrl', 'statusBadgeAr', 'statusBadgeEn'];
  allowed.forEach(k => { if (req.body[k] !== undefined) db.profile[k] = String(req.body[k]); });
  db.profile.adminPinHash = hash;
  writeDb(db) ? res.json({ success: true, profile: publicProfile(db) }) : res.status(500).json({ error: 'Failed to save' });
});

// Stats
app.put('/api/admin/stats', authAdmin, (req, res) => {
  if (!Array.isArray(req.body.stats)) return res.status(400).json({ error: 'stats must be an array' });
  const db = readDb();
  db.stats = req.body.stats.slice(0, 8).map((s, i) => ({
    id: s.id || i + 1, value: clean(s.value, 20), labelAr: clean(s.labelAr, 60), labelEn: clean(s.labelEn, 60)
  }));
  writeDb(db);
  res.json({ success: true, stats: db.stats });
});

// Projects
app.post('/api/admin/projects', authAdmin, (req, res) => {
  const db = readDb();
  const b = req.body;
  const project = {
    id: b.id || newId('proj'), category: b.category || 'erp', featured: b.featured !== undefined ? !!b.featured : true,
    icon: b.icon || 'pi-box', titleAr: b.titleAr || '', titleEn: b.titleEn || '', descriptionAr: b.descriptionAr || '',
    descriptionEn: b.descriptionEn || '', tags: Array.isArray(b.tags) ? b.tags : [], liveUrl: b.liveUrl || '',
    repoUrl: b.repoUrl || '', badgeAr: b.badgeAr || '', badgeEn: b.badgeEn || ''
  };
  db.projects.unshift(project);
  writeDb(db);
  res.json({ success: true, project });
});

app.put('/api/admin/projects/:id', authAdmin, (req, res) => {
  const db = readDb();
  const i = db.projects.findIndex(p => p.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Project not found' });
  db.projects[i] = { ...db.projects[i], ...req.body, id: req.params.id };
  writeDb(db);
  res.json({ success: true, project: db.projects[i] });
});

app.delete('/api/admin/projects/:id', authAdmin, (req, res) => {
  const db = readDb();
  db.projects = db.projects.filter(p => p.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// Experiences
app.post('/api/admin/experiences', authAdmin, (req, res) => {
  const db = readDb();
  const b = req.body;
  const exp = {
    id: b.id || newId('exp'), companyAr: b.companyAr || '', companyEn: b.companyEn || '', roleAr: b.roleAr || '',
    roleEn: b.roleEn || '', periodAr: b.periodAr || '', periodEn: b.periodEn || '',
    responsibilitiesAr: b.responsibilitiesAr || '', responsibilitiesEn: b.responsibilitiesEn || ''
  };
  db.experiences.unshift(exp);
  writeDb(db);
  res.json({ success: true, experience: exp });
});

app.put('/api/admin/experiences/:id', authAdmin, (req, res) => {
  const db = readDb();
  const i = db.experiences.findIndex(e => e.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Experience not found' });
  db.experiences[i] = { ...db.experiences[i], ...req.body, id: req.params.id };
  writeDb(db);
  res.json({ success: true, experience: db.experiences[i] });
});

app.delete('/api/admin/experiences/:id', authAdmin, (req, res) => {
  const db = readDb();
  db.experiences = db.experiences.filter(e => e.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// Skills
app.put('/api/admin/skills', authAdmin, (req, res) => {
  if (!Array.isArray(req.body.skills)) return res.status(400).json({ error: 'Skills must be an array' });
  const db = readDb();
  db.skills = req.body.skills.map(s => ({
    categoryAr: clean(s.categoryAr, 100), categoryEn: clean(s.categoryEn, 100),
    items: (Array.isArray(s.items) ? s.items : []).map(i => clean(i, 60)).filter(Boolean)
  }));
  writeDb(db);
  res.json({ success: true, skills: db.skills });
});

// Articles - admin
app.post('/api/admin/articles', authAdmin, (req, res) => {
  const db = readDb();
  const b = req.body;
  if (!clean(b.titleAr) && !clean(b.titleEn)) return res.status(400).json({ error: 'Title is required' });
  const now = new Date().toISOString();
  const article = {
    id: newId('art'),
    slug: uniqueSlug(db, slugify(b.slug || b.titleEn || b.titleAr)),
    titleAr: clean(b.titleAr, 200), titleEn: clean(b.titleEn, 200),
    excerptAr: clean(b.excerptAr, 400), excerptEn: clean(b.excerptEn, 400),
    contentAr: String(b.contentAr || ''), contentEn: String(b.contentEn || ''),
    coverUrl: clean(b.coverUrl, 500), category: clean(b.category, 40) || 'general',
    tags: (Array.isArray(b.tags) ? b.tags : []).map(t => clean(t, 30)).filter(Boolean).slice(0, 8),
    status: b.status === 'draft' ? 'draft' : 'published', featured: !!b.featured,
    views: 0, likes: 0, createdAt: now, updatedAt: now, comments: []
  };
  db.articles.unshift(article);
  writeDb(db);
  res.json({ success: true, article });
});

app.put('/api/admin/articles/:id', authAdmin, (req, res) => {
  const db = readDb();
  const a = db.articles.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Article not found' });
  const b = req.body;
  ['titleAr', 'titleEn'].forEach(k => { if (b[k] !== undefined) a[k] = clean(b[k], 200); });
  ['excerptAr', 'excerptEn'].forEach(k => { if (b[k] !== undefined) a[k] = clean(b[k], 400); });
  ['contentAr', 'contentEn'].forEach(k => { if (b[k] !== undefined) a[k] = String(b[k]); });
  if (b.coverUrl !== undefined) a.coverUrl = clean(b.coverUrl, 500);
  if (b.category !== undefined) a.category = clean(b.category, 40) || 'general';
  if (Array.isArray(b.tags)) a.tags = b.tags.map(t => clean(t, 30)).filter(Boolean).slice(0, 8);
  if (b.status) a.status = b.status === 'draft' ? 'draft' : 'published';
  if (b.featured !== undefined) a.featured = !!b.featured;
  if (b.slug && slugify(b.slug) !== a.slug) a.slug = uniqueSlug(db, slugify(b.slug), a.id);
  a.updatedAt = new Date().toISOString();
  writeDb(db);
  res.json({ success: true, article: a });
});

app.delete('/api/admin/articles/:id', authAdmin, (req, res) => {
  const db = readDb();
  db.articles = db.articles.filter(a => a.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// Comments moderation
app.put('/api/admin/articles/:id/comments/:cid', authAdmin, (req, res) => {
  const db = readDb();
  const a = db.articles.find(x => x.id === req.params.id);
  const c = a && (a.comments || []).find(x => x.id === req.params.cid);
  if (!c) return res.status(404).json({ error: 'Comment not found' });
  c.hidden = !!req.body.hidden;
  writeDb(db);
  res.json({ success: true });
});

app.delete('/api/admin/articles/:id/comments/:cid', authAdmin, (req, res) => {
  const db = readDb();
  const a = db.articles.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  a.comments = (a.comments || []).filter(c => c.id !== req.params.cid);
  writeDb(db);
  res.json({ success: true });
});

// Messages inbox
app.put('/api/admin/messages/:id', authAdmin, (req, res) => {
  const db = readDb();
  const m = db.messages.find(x => x.id === req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  m.read = req.body.read !== undefined ? !!req.body.read : true;
  writeDb(db);
  res.json({ success: true });
});

app.delete('/api/admin/messages/:id', authAdmin, (req, res) => {
  const db = readDb();
  db.messages = db.messages.filter(m => m.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// PIN change
app.put('/api/admin/pin', authAdmin, (req, res) => {
  const { currentPin, newPin } = req.body || {};
  const db = readDb();
  if (!verifyPin(String(currentPin || ''), db.profile.adminPinHash)) {
    return res.status(403).json({ error: 'الرمز الحالي غير صحيح' });
  }
  if (!newPin || String(newPin).trim().length < 4) {
    return res.status(400).json({ error: 'PIN must be at least 4 characters' });
  }
  db.profile.adminPinHash = hashPin(String(newPin).trim());
  writeDb(db);
  sessions.clear();
  res.json({ success: true, message: 'تم تغيير رمز الأمان بنجاح' });
});

// Image upload (avatar, article cover, inline images)
app.post('/api/admin/upload', authAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ success: true, url: `/uploads/${req.file.filename}` });
  });
});

// ---------------------------------------------------------------- Pages
const page = (file) => (req, res) => res.sendFile(path.join(__dirname, 'public', file));
app.get('/admin', page('admin.html'));
app.get('/articles', page('articles.html'));
app.get('/article/:slug', page('article.html'));
app.get('/api/*', (req, res) => res.status(404).json({ error: 'Not found' }));
app.get('*', page('index.html'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Portfolio & CV App running on http://localhost:${PORT}`);
});
