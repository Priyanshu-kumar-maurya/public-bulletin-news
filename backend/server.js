import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDB, getDBConnection } from './database.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pb-bulletin-jwt-secret-key-change-me-in-prod';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Initialize SQLite database
let db;
try {
  db = await initDB();
} catch (err) {
  console.error('Failed to initialize database:', err);
  process.exit(1);
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

// Require Admin Role Middleware
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
}

// Generate UID helper
function uid(){ return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

// Save base64 image helper
async function saveBase64Image(base64DataUrl) {
  const matches = base64DataUrl.match(/^data:image\/([A-Za-z0-9-+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid image base64 data');
  }
  
  const extension = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');
  
  const filename = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${extension}`;
  const uploadsDir = path.join(__dirname, '../frontend/uploads');
  
  // Ensure directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const filePath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(filePath, buffer);
  
  return `/uploads/${filename}`;
}

// --- API ROUTES ---

// 0. User Registration (Signup)
app.post('/api/register', async (req, res) => {
  const { username, password, phone } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const userId = uid();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Normal signup defaults to 'user' role, with optional phone
    await db.run(
      'INSERT INTO users (id, username, password, role, phone) VALUES (?, ?, ?, ?, ?)',
      [userId, username, hashedPassword, 'user', phone || null]
    );

    const token = jwt.sign({ id: userId, username, role: 'user' }, JWT_SECRET, { expiresIn: '12h' });
    res.status(201).json({ token, username, role: 'user', phone: phone || null });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// 1. Unified Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, username: user.username, role: user.role, phone: user.phone || null });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// 2. Get All Articles (supports optional search query `q` and category filter `cat`)
app.get('/api/articles', async (req, res) => {
  const { cat, q } = req.query;
  try {
    let query = 'SELECT * FROM articles';
    let params = [];

    if (cat && q) {
      query += ' WHERE cat = ? AND (title LIKE ? OR excerpt LIKE ? OR content LIKE ?)';
      params = [cat, `%${q}%`, `%${q}%`, `%${q}%`];
    } else if (cat) {
      query += ' WHERE cat = ?';
      params = [cat];
    } else if (q) {
      query += ' WHERE title LIKE ? OR excerpt LIKE ? OR content LIKE ?';
      params = [`%${q}%`, `%${q}%`, `%${q}%`];
    }

    query += ' ORDER BY date DESC';

    const articles = await db.all(query, params);
    res.json(articles);
  } catch (err) {
    console.error('Error fetching articles:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 3. Get Breaking Articles
app.get('/api/articles/breaking', async (req, res) => {
  try {
    const breakingArticles = await db.all('SELECT * FROM articles WHERE breaking = 1 ORDER BY date DESC');
    res.json(breakingArticles);
  } catch (err) {
    console.error('Error fetching breaking articles:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 4. Get Single Article
app.get('/api/articles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Increment view count
    await db.run('UPDATE articles SET views = views + 1 WHERE id = ?', [id]);

    const article = await db.get('SELECT * FROM articles WHERE id = ?', [id]);
    if (!article) {
      return res.status(404).json({ error: 'Article not found.' });
    }
    res.json(article);
  } catch (err) {
    console.error('Error fetching article:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 5. Create Article (Protected - Admin only)
app.post('/api/articles', authenticateToken, requireAdmin, async (req, res) => {
  const { title, cat, img, imgUpload, excerpt, content, author, breaking } = req.body;
  if (!title || !cat || !excerpt || !content) {
    return res.status(400).json({ error: 'Title, category, excerpt, and content are required fields.' });
  }

  try {
    let finalImg = img;
    if (imgUpload) {
      try {
        finalImg = await saveBase64Image(imgUpload);
      } catch (uploadErr) {
        console.error('File upload error:', uploadErr);
        return res.status(400).json({ error: 'Failed to process uploaded image file.' });
      }
    }

    const articleId = uid();
    const date = new Date().toISOString();
    const isBreaking = breaking ? 1 : 0;
    const defaultImg = finalImg || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=1200&auto=format&fit=crop';
    const finalAuthor = author || 'Desk Report';

    await db.run(
      `INSERT INTO articles (id, title, cat, img, excerpt, content, author, breaking, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [articleId, title, cat, defaultImg, excerpt, content, finalAuthor, isBreaking, date]
    );

    const newArticle = await db.get('SELECT * FROM articles WHERE id = ?', [articleId]);
    res.status(201).json(newArticle);
  } catch (err) {
    console.error('Error creating article:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 6. Update Article (Protected - Admin only)
app.put('/api/articles/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, cat, img, imgUpload, excerpt, content, author, breaking } = req.body;

  if (!title || !cat || !excerpt || !content) {
    return res.status(400).json({ error: 'Title, category, excerpt, and content are required fields.' });
  }

  try {
    let finalImg = img;
    if (imgUpload) {
      try {
        finalImg = await saveBase64Image(imgUpload);
      } catch (uploadErr) {
        console.error('File upload error:', uploadErr);
        return res.status(400).json({ error: 'Failed to process uploaded image file.' });
      }
    }

    const isBreaking = breaking ? 1 : 0;
    const defaultImg = finalImg || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=1200&auto=format&fit=crop';
    const finalAuthor = author || 'Desk Report';

    const result = await db.run(
      `UPDATE articles 
       SET title = ?, cat = ?, img = ?, excerpt = ?, content = ?, author = ?, breaking = ?
       WHERE id = ?`,
      [title, cat, defaultImg, excerpt, content, finalAuthor, isBreaking, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Article not found or no changes made.' });
    }

    const updatedArticle = await db.get('SELECT * FROM articles WHERE id = ?', [id]);
    res.json(updatedArticle);
  } catch (err) {
    console.error('Error updating article:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 7. Delete Article (Protected - Admin only)
app.delete('/api/articles/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.run('DELETE FROM articles WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Article not found.' });
    }
    res.json({ message: 'Article deleted successfully.' });
  } catch (err) {
    console.error('Error deleting article:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 8. Get Admin Dashboard Stats (Protected - Admin only)
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const articlesCount = await db.get('SELECT COUNT(*) as count FROM articles');
    const viewsSum = await db.get('SELECT SUM(views) as sum FROM articles');
    const usersCount = await db.get('SELECT COUNT(*) as count FROM users');
    
    const categoryStats = await db.all('SELECT cat, COUNT(*) as articles, SUM(views) as views FROM articles GROUP BY cat');
    const topArticles = await db.all('SELECT id, title, cat, views, date FROM articles ORDER BY views DESC LIMIT 5');

    res.json({
      totalArticles: articlesCount.count || 0,
      totalViews: viewsSum.sum || 0,
      totalAdmins: usersCount.count || 0,
      categoryStats,
      topArticles
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'Internal server error fetching stats.' });
  }
});

// 9. Get Admin Users List (Protected - Admin only)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await db.all('SELECT id, username FROM users');
    res.json(users);
  } catch (err) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ error: 'Internal server error fetching users.' });
  }
});

// 10. Add New Admin User (Protected - Admin only)
app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists.' });
    }

    const userId = uid();
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.run(
      'INSERT INTO users (id, username, password) VALUES (?, ?, ?)',
      [userId, username, hashedPassword]
    );

    res.status(201).json({ message: 'Admin user created successfully.', id: userId, username });
  } catch (err) {
    console.error('Error creating admin user:', err);
    res.status(500).json({ error: 'Internal server error creating user.' });
  }
});

// 11. Delete Admin User (Protected - Admin only)
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  // Protect default admin from deletion to prevent total lockout
  if (id === 'admin-id') {
    return res.status(400).json({ error: 'Cannot delete the primary administrator account.' });
  }

  try {
    const result = await db.run('DELETE FROM users WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ message: 'Admin user deleted successfully.' });
  } catch (err) {
    console.error('Error deleting admin user:', err);
    res.status(500).json({ error: 'Internal server error deleting user.' });
  }
});

// --- COMMENTS ROUTES ---

// 12. Get Comments for an Article (Public)
app.get('/api/articles/:id/comments', async (req, res) => {
  const { id } = req.params;
  try {
    const comments = await db.all('SELECT * FROM comments WHERE articleId = ? ORDER BY date ASC', [id]);
    res.json(comments);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Internal server error fetching comments.' });
  }
});

// 13. Post Comment (Protected - Readers/Admins)
app.post('/api/articles/:id/comments', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment text is required.' });
  }

  try {
    const commentId = uid();
    const date = new Date().toISOString();
    const userId = req.user.id;
    const username = req.user.username;

    await db.run(
      'INSERT INTO comments (id, articleId, userId, username, text, date) VALUES (?, ?, ?, ?, ?, ?)',
      [commentId, id, userId, username, text.trim(), date]
    );

    const newComment = await db.get('SELECT * FROM comments WHERE id = ?', [commentId]);
    res.status(201).json(newComment);
  } catch (err) {
    console.error('Error posting comment:', err);
    res.status(500).json({ error: 'Internal server error posting comment.' });
  }
});

// --- BOOKMARKS ROUTES ---

// 14. Get Bookmarked Articles (Protected - Readers/Admins)
app.get('/api/bookmarks', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const bookmarkedArticles = await db.all(
      `SELECT a.* FROM articles a 
       JOIN bookmarks b ON a.id = b.articleId 
       WHERE b.userId = ? 
       ORDER BY b.rowid DESC`,
      [userId]
    );
    res.json(bookmarkedArticles);
  } catch (err) {
    console.error('Error fetching bookmarks:', err);
    res.status(500).json({ error: 'Internal server error fetching bookmarks.' });
  }
});

// 15. Add Bookmark (Protected - Readers/Admins)
app.post('/api/bookmarks', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { articleId } = req.body;

  if (!articleId) {
    return res.status(400).json({ error: 'Article ID is required.' });
  }

  try {
    // Check if article exists
    const article = await db.get('SELECT id FROM articles WHERE id = ?', [articleId]);
    if (!article) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    // Check if already bookmarked
    const existing = await db.get('SELECT * FROM bookmarks WHERE userId = ? AND articleId = ?', [userId, articleId]);
    if (existing) {
      return res.json({ message: 'Article is already bookmarked.' });
    }

    await db.run('INSERT INTO bookmarks (userId, articleId) VALUES (?, ?)', [userId, articleId]);
    res.status(201).json({ message: 'Article bookmarked successfully.', articleId });
  } catch (err) {
    console.error('Error adding bookmark:', err);
    res.status(500).json({ error: 'Internal server error bookmarking article.' });
  }
});

// 16. Remove Bookmark (Protected - Readers/Admins)
app.delete('/api/bookmarks/:articleId', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { articleId } = req.params;

  try {
    const result = await db.run('DELETE FROM bookmarks WHERE userId = ? AND articleId = ?', [userId, articleId]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Bookmark not found.' });
    }
    res.json({ message: 'Bookmark removed successfully.' });
  } catch (err) {
    console.error('Error deleting bookmark:', err);
    res.status(500).json({ error: 'Internal server error removing bookmark.' });
  }
});

// --- STATIC ASSETS ---
// Serve frontend assets statically
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Fallback to index.html for frontend routing (if any path is direct-requested)
app.get('*', (req, res, next) => {
  // If request is for an API path, pass it through (avoid infinite HTML loops)
  if (req.url.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Public Bulletin running at http://localhost:${PORT}`);
  console.log(`⚙ Admin Username: admin`);
  console.log(`⚙ Admin Password: admin123 (Change in production)`);
  console.log(`=================================================`);
});
