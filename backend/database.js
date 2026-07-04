import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'news.db');

export async function getDBConnection() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

const SEED_ARTICLES = [
  {
    id: "a1",
    title: "Parliament Debate Intensifies Over New Bill, Opposition Raises Objections",
    cat: "politics",
    breaking: 1,
    img: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=80&w=1200&auto=format&fit=crop",
    excerpt: "Both houses of Parliament saw extended discussion today over the new bill, with sharp exchanges between the ruling party and the opposition.",
    content: "Both houses of Parliament witnessed a lengthy debate today over the new bill. The ruling party described it as being in the national interest, while the opposition called it a hasty move.\n\nAccording to a parliamentary committee report, a vote could take place next week. Experts believe this bill will shape the direction of policy changes in the coming period.",
    author: "Desk Report",
    date: new Date(Date.now() - 3600e3 * 2).toISOString()
  },
  {
    id: "a2",
    title: "Stock Market Rallies as Sensex Hits New Record High",
    cat: "business",
    breaking: 1,
    img: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop",
    excerpt: "Domestic stock markets saw a sharp rally today, lifting investor sentiment across the board.",
    content: "Domestic equity markets surged today, with strong buying seen in banking and IT stocks that lifted the broader indices.\n\nAnalysts say the positive momentum could continue in the coming weeks, though they advise keeping an eye on global cues.",
    author: "Business Desk",
    date: new Date(Date.now() - 3600e3 * 5).toISOString()
  },
  {
    id: "a3",
    title: "Indian Cricket Team Clinches Thrilling Last-Over Victory",
    cat: "sports",
    breaking: 0,
    img: "https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?q=80&w=1200&auto=format&fit=crop",
    excerpt: "In a match that went down to the final ball, the Indian team delivered a standout performance to seal the win.",
    content: "In a nail-biting contest, the Indian team secured victory off the final delivery. Under the captain's leadership, the side held its nerve under pressure.\n\nFans praised the players' performance widely, while team management called it a crucial win for the series.",
    author: "Sports Desk",
    date: new Date(Date.now() - 3600e3 * 8).toISOString()
  },
  {
    id: "a4",
    title: "Indian Startup Launches New AI-Powered App for Farmers",
    cat: "technology",
    breaking: 0,
    img: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1200&auto=format&fit=crop",
    excerpt: "A Bengaluru-based startup has launched a new AI-driven app aimed at helping farmers make better decisions.",
    content: "A startup based in Bengaluru has launched an AI-powered app for the agriculture sector. The app will offer features like weather forecasting and crop advisory.\n\nThe company claims the technology will help boost income for small farmers across the country.",
    author: "Tech Desk",
    date: new Date(Date.now() - 3600e3 * 12).toISOString()
  },
  {
    id: "a5",
    title: "World Leaders Meet at UN to Discuss Climate Change",
    cat: "world",
    breaking: 0,
    img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
    excerpt: "Leaders from around the globe discussed a shared strategy to tackle the growing challenges of climate change.",
    content: "Heads of state from several countries gathered at the UN headquarters for a high-level meeting. Delegates agreed on new targets to cut carbon emissions.\n\nEnvironmental experts welcomed the initiative, though questions remain over how effectively it will be implemented.",
    author: "World Desk",
    date: new Date(Date.now() - 3600e3 * 20).toISOString()
  },
  {
    id: "a6",
    title: "First Poster of Highly Anticipated Bollywood Film Released",
    cat: "entertainment",
    breaking: 0,
    img: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop",
    excerpt: "The poster went viral on social media within hours of its release, with fans eagerly awaiting more updates.",
    content: "The first poster of a much-awaited film was released today, sparking a reaction on social media.\n\nProducers confirmed the trailer will drop next month. A fresh look at the cast has only added to the excitement among fans.",
    author: "Entertainment Desk",
    date: new Date(Date.now() - 3600e3 * 30).toISOString()
  },
  {
    id: "a7",
    title: "Rain Brings Relief From Heat Across Delhi-NCR",
    cat: "india",
    breaking: 0,
    img: "https://images.unsplash.com/photo-1428592953211-077101b2021b?q=80&w=1200&auto=format&fit=crop",
    excerpt: "Sudden rainfall in the capital gave residents a welcome break from the intense summer heat.",
    content: "Delhi-NCR saw a sudden burst of rain on Monday evening, causing temperatures to drop noticeably. The weather department has forecast light showers over the next few days as well.\n\nResidents welcomed the relief from the heat, though some areas also reported waterlogging.",
    author: "Desk Report",
    date: new Date(Date.now() - 3600e3 * 15).toISOString()
  }
];

export async function initDB() {
  const db = await getDBConnection();
  
  // Create articles table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      cat TEXT NOT NULL,
      img TEXT,
      excerpt TEXT,
      content TEXT,
      author TEXT,
      breaking INTEGER DEFAULT 0,
      date TEXT NOT NULL
    )
  `);

  // Try adding views column if it doesn't exist (Migration)
  try {
    await db.exec('ALTER TABLE articles ADD COLUMN views INTEGER DEFAULT 0');
  } catch (e) {
    // Column already exists, ignore
  }

  // Create users table for admin/user auth
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  // Try adding role column if it doesn't exist (Migration)
  try {
    await db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
  } catch (e) {
    // Ignore if column already exists
  }

  // Try adding phone column if it doesn't exist (Migration)
  try {
    await db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
  } catch (e) {
    // Ignore if column already exists
  }

  // Create comments table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      articleId TEXT NOT NULL,
      userId TEXT NOT NULL,
      username TEXT NOT NULL,
      text TEXT NOT NULL,
      date TEXT NOT NULL
    )
  `);

  // Create bookmarks table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      userId TEXT NOT NULL,
      articleId TEXT NOT NULL,
      PRIMARY KEY (userId, articleId)
    )
  `);

  // Check if articles table is empty and seed if so
  const articlesCount = await db.get('SELECT COUNT(*) as count FROM articles');
  if (articlesCount.count === 0) {
    console.log('Seeding initial articles database...');
    for (const article of SEED_ARTICLES) {
      await db.run(
        `INSERT INTO articles (id, title, cat, img, excerpt, content, author, breaking, date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [article.id, article.title, article.cat, article.img, article.excerpt, article.content, article.author, article.breaking, article.date]
      );
    }
  }

  // Check if admin user exists, if not seed default admin/admin123
  const usersCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (usersCount.count === 0) {
    console.log('Seeding default admin account (username: admin, password: admin123)...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.run(
      `INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)`,
      ['admin-id', 'admin', hashedPassword, 'admin']
    );
  } else {
    // Make sure existing admin account has role set to 'admin'
    await db.run("UPDATE users SET role = 'admin' WHERE username = 'admin'");
  }

  console.log('Database initialized successfully.');
  return db;
}
