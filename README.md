# 📰 Public Bulletin — Full-Stack News Portal

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
</p>

---

A modern, fast, and fully responsive **full-stack news portal** built with Node.js, Express, SQLite, and vanilla frontend technologies. Features role-based auth, live comment engines, article bookmarking, dynamic analytics dashboards, and real-time Google News search feeds.

---

## ✨ Features

### 👤 User & Reader Authentication
* **Role-Based Security:** Separate permissions for `admin` (dashboard access, editor tools) and standard `user` (commenting and bookmarking).
* **Profile Views:** Show user details, total bookmarks count, and registered phone number.

### ✍️ Content & Engagement
* **Interactive Comments:** Logged-in readers can leave comments with live timestamps and author attributes.
* **Bookmarking Engine:** Save and star articles to view them later in a personalized saved articles grid.
* **Direct Local Image Uploads:** Administrators can drag-and-drop or select local image files during article editing.

### 📱 Responsive UI & Icons
* **Mobile bottom navigation bar:** Sticky app-like footer (Home, Discover, Saved, Profile) for screens `<= 768px`.
* **Font Awesome integration:** Standardized vector icons throughout the interface.

### 🔍 Live Search
* **Real-time News Search:** Matches search queries with local SQLite articles, and falls back to fetching matching live global headlines from Google News RSS.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla ES6) | Core layout, UI components, and state management |
| **Icons & Charts** | Font Awesome v6, Chart.js | Visual vectors and dashboard analytics graphs |
| **Backend Server** | Node.js, Express | API routing, server logic, and file serving |
| **Database** | SQLite3 | Local serverless relational data storage |
| **Security** | BcryptJS, JSON Web Tokens (JWT) | Password hashing and session auth tokens |

---

## 🚀 Getting Started

### 📋 Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### 🔧 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Priyanshu-kumar-maurya/public-bulletin-news.git
   cd public-bulletin-news
   ```

2. **Install all dependencies:**
   ```bash
   npm install && npm --prefix backend install
   ```

3. **Start the local server:**
   ```bash
   npm start
   ```
   *Your site will be live at `http://localhost:3000`.*

---

## 🔐 Default Credentials
* **Admin Username:** `****`
* **Admin Password:** `*****`
