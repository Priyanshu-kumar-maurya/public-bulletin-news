const CATS = {
  india: "India", world: "World", politics: "Politics", business: "Business",
  technology: "Technology", sports: "Sports", entertainment: "Entertainment"
};
const STORE_KEY = "pb-articles-en";
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? ''
  : 'https://public-bulletin-news.onrender.com';
let ARTICLES = [];
let BREAKING_ARTICLES = [];
let isAdminSession = localStorage.getItem('pb_role') === 'admin' && !!localStorage.getItem('pb_admin_token');
let activeAdminTab = 'articles';
let viewsChartInstance = null;
let categoryChartInstance = null;
let userBookmarks = [];
let isSignupMode = false;

document.getElementById('yr').textContent = new Date().getFullYear();
document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// Format date helper
function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Fetch articles from API
async function loadArticles(filters = {}) {
  try {
    let url = `${API_BASE}/api/articles`;
    const params = new URLSearchParams();
    if (filters.cat) params.append('cat', filters.cat);
    if (filters.q) params.append('q', filters.q);
    
    if (params.toString()) {
      url += '?' + params.toString();
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch articles');
    ARTICLES = await res.json();
  } catch (e) {
    console.error('Error loading articles:', e);
    showToast('Failed to load articles from server.');
  }
}

// Fetch breaking news for ticker
async function loadBreakingArticles() {
  try {
    const res = await fetch(`${API_BASE}/api/articles/breaking`);
    if (!res.ok) throw new Error('Failed to fetch breaking articles');
    BREAKING_ARTICLES = await res.json();
  } catch (e) {
    console.error('Error loading breaking articles:', e);
  }
}

function renderTicker() {
  const list = document.getElementById('tickerList');
  const items = BREAKING_ARTICLES.length ? BREAKING_ARTICLES : ARTICLES.slice(0, 5);
  if (!items.length) {
    list.innerHTML = '<li>No news available at the moment.</li>';
    return;
  }
  list.innerHTML = items.map(a => `<li><a href="#/article/${a.id}" style="color:#fff;">${a.title}</a></li>`).join('') + 
                   items.map(a => `<li><a href="#/article/${a.id}" style="color:#fff;">${a.title}</a></li>`).join('');
}

function articleCard(a) {
  const isBookmarked = userBookmarks.includes(a.id);
  return `<div class="card">
    <a href="#/article/${a.id}">
      <img src="${a.img}" alt="${a.title}" loading="lazy">
    </a>
    <div class="body">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span class="cat-pill ${a.breaking ? 'breaking' : ''}">${a.breaking ? 'Breaking' : CATS[a.cat]}</span>
        <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" onclick="toggleBookmark('${a.id}', event)" title="Bookmark Article">
          <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-star"></i>
        </button>
      </div>
      <a href="#/article/${a.id}">
        <h3>${a.title}</h3>
      </a>
      <p>${a.excerpt}</p>
      <div class="meta">${a.author} · ${fmtDate(a.date)}</div>
    </div>
  </div>`;
}

function sidebarHTML() {
  const trending = [...ARTICLES].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  return `
    <div class="sidebar-box">
      <h4>Trending Now</h4>
      ${trending.map((a, i) => `<a href="#/article/${a.id}" class="side-item"><span class="num">${String(i + 1).padStart(2, '0')}</span><span>${a.title}</span></a>`).join('')}
    </div>
    <div class="ad-slot">Advertisement Space (Insert Google AdSense code here)<br><span style="font-size:.7rem;">300×250</span></div>
    <div class="sidebar-box">
      <h4>Categories</h4>
      <div class="cat-tag-list">
        ${Object.entries(CATS).map(([k, v]) => `<a href="#/category/${k}">${v}</a>`).join('')}
      </div>
    </div>`;
}

function renderHome() {
  const sorted = [...ARTICLES].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!sorted.length) {
    return `<div class="empty-state">No articles have been published yet. Add one from the Admin Panel.</div>`;
  }
  const hero = sorted[0];
  const rest = sorted.slice(1, 7);
  const isHeroBookmarked = userBookmarks.includes(hero.id);
  
  return `
  <div class="layout">
    <div>
      <div class="hero-card" style="position:relative;">
        <a href="#/article/${hero.id}">
          <img src="${hero.img}" alt="${hero.title}">
        </a>
        <div class="body">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span class="cat-pill ${hero.breaking ? 'breaking' : ''}">${hero.breaking ? 'Breaking' : CATS[hero.cat]}</span>
            <button class="bookmark-btn ${isHeroBookmarked ? 'active' : ''}" onclick="toggleBookmark('${hero.id}', event)" title="Bookmark Article" style="font-size:1.50rem;">
              <i class="${isHeroBookmarked ? 'fa-solid' : 'fa-regular'} fa-star"></i>
            </button>
          </div>
          <a href="#/article/${hero.id}">
            <h2>${hero.title}</h2>
          </a>
          <p>${hero.excerpt}</p>
          <div class="meta">${hero.author} · ${fmtDate(hero.date)}</div>
        </div>
      </div>
      <div class="section-title"><span class="bar"></span> Latest News</div>
      <div class="grid-cards">${rest.map(articleCard).join('')}</div>
      <div class="ad-slot">Advertisement Space (Insert Google AdSense code here)<br><span style="font-size:.7rem;">728×90</span></div>
    </div>
    <div>${sidebarHTML()}</div>
  </div>`;
}

function renderCategory(cat) {
  return `
  <div class="layout">
    <div>
      <div class="section-title"><span class="bar"></span> ${CATS[cat] || cat}</div>
      ${ARTICLES.length ? `<div class="grid-cards">${ARTICLES.map(articleCard).join('')}</div>` : `<div class="empty-state">No articles available in this category yet.</div>`}
    </div>
    <div>${sidebarHTML()}</div>
  </div>`;
}

function renderSearch(q) {
  return `
  <div class="layout">
    <div>
      <div class="section-title"><span class="bar"></span> Search results for "${q}"</div>
      ${ARTICLES.length ? `<div class="grid-cards">${ARTICLES.map(articleCard).join('')}</div>` : `<div class="empty-state">No results found.</div>`}
    </div>
    <div>${sidebarHTML()}</div>
  </div>`;
}

async function renderArticle(id) {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="empty-state">Loading article...</div>';
  
  try {
    const res = await fetch(`${API_BASE}/api/articles/${id}`);
    if (!res.ok) {
      app.innerHTML = `<div class="empty-state">This article is not available.</div>`;
      return;
    }
    const a = await res.json();
    const url = location.href;
    const paras = a.content.split('\n\n').map(p => `<p>${p}</p>`).join('');
    const isBookmarked = userBookmarks.includes(a.id);
    
    app.innerHTML = `
    <div class="layout">
      <div class="article-detail">
        <span class="cat-pill ${a.breaking ? 'breaking' : ''}">${a.breaking ? 'Breaking' : CATS[a.cat]}</span>
        <div class="article-header-row">
          <h1>${a.title}</h1>
          <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" onclick="toggleBookmark('${a.id}', event)" title="Bookmark Article" style="font-size:1.6rem;">
            <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-star"></i>
          </button>
        </div>
        <div class="meta"><i class="fa-solid fa-pen-nib" style="margin-right:4px;"></i> ${a.author} · ${fmtDate(a.date)}</div>
        <img src="${a.img}" alt="${a.title}">
        <div class="content">${paras}</div>
        <div class="share-row">
          <button class="share-btn wa" onclick="window.open('https://wa.me/?text=' + encodeURIComponent('${a.title.replace(/'/g, "")} - ' + '${url}'))"><i class="fa-brands fa-whatsapp"></i> Share on WhatsApp</button>
          <button class="share-btn fb" onclick="window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('${url}'))"><i class="fa-brands fa-facebook-f"></i> Facebook</button>
          <button class="share-btn x" onclick="window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent('${a.title.replace(/'/g, "")}') + '&url=' + encodeURIComponent('${url}'))"><i class="fa-brands fa-x-twitter"></i> X (Twitter)</button>
          <button class="share-btn copy" onclick="navigator.clipboard.writeText('${url}');showToast('Link copied')"><i class="fa-solid fa-link"></i> Copy Link</button>
        </div>
        <div class="ad-slot">Advertisement Space (Insert Google AdSense code here)</div>
        
        <!-- Comments Section Container -->
        <div class="comments-section" id="articleComments"></div>
      </div>
      <div>${sidebarHTML()}</div>
    </div>`;

    // Load and render comments
    loadAndRenderComments(a.id);

  } catch (err) {
    console.error('Error rendering article page:', err);
    app.innerHTML = `<div class="empty-state">Failed to load the article from the server.</div>`;
  }
}

function renderStatic(page) {
  const pages = {
    about: {
      title: "About Us", body: `
      <p>Public Bulletin is an independent news portal built with one goal: to bring readers accurate, balanced and fast-moving news coverage.</p>
      <p>We publish fresh updates every day across categories including India, World, Politics, Business, Technology, Sports and Entertainment. Our team is committed to fact-checking every story before it goes live.</p>
      <p>Our mission is simple — to deliver fair, trustworthy journalism to every reader.</p>`
    },
    contact: {
      title: "Contact Us", body: `
      <p>You can reach us through the following channels:</p>
      <p>📧 Email: contact@publicbulletin.example<br>📞 Phone: +91-XXXXXXXXXX<br>📍 Address: New Delhi, India</p>
      <p>For story tips, press releases, or advertising inquiries, feel free to email us anytime.</p>`
    },
    privacy: {
      title: "Privacy Policy", body: `
      <p>Public Bulletin respects the privacy of its readers. No personal data collected from visitors to this website is shared with third parties without consent.</p>
      <p>Our website may use cookies and advertising services such as Google AdSense to improve user experience and show relevant ads. Users can manage cookie preferences through their browser settings.</p>
      <p>This policy may be updated from time to time. For any questions, please reach out via the Contact Us page.</p>`
    }
  };
  const p = pages[page];
  return `<div class="static-page"><h1>${p.title}</h1>${p.body}</div>`;
}

/* ================= AUTHENTICATION (LOGIN/REGISTER) ================= */
function renderLoginRegister() {
  const phoneFieldHtml = isSignupMode ? `
    <div class="field">
      <label>Phone Number (Optional)</label>
      <input id="authPhone" type="tel" placeholder="Enter mobile number...">
    </div>
  ` : '';

  return `<div class="admin-wrap"><div class="admin-card">
    <h2 style="color:var(--navy);margin-top:0;" id="authTitle">${isSignupMode ? 'Create Account' : 'Sign In'}</h2>
    <p style="font-size:.85rem;color:var(--ink-soft);" id="authDesc">
      ${isSignupMode ? 'Register as a reader to write comments and bookmark articles.' : 'Sign in to access commenting, bookmarks, and customization.'}
    </p>
    <div class="field"><label>Username</label><input id="authUsername" type="text" placeholder="Enter username..."></div>
    ${phoneFieldHtml}
    <div class="field"><label>Password</label><input id="authPassword" type="password" onkeydown="if(event.key==='Enter')submitAuthForm()" placeholder="Enter password..."></div>
    <button class="btn" onclick="submitAuthForm()" id="authSubmitBtn">${isSignupMode ? 'Register' : 'Sign In'}</button>
    <p style="font-size:0.88rem;margin-top:20px;text-align:center;">
      <span id="authSwitchText">${isSignupMode ? 'Already have an account?' : "Don't have an account?"}</span>
      <a href="javascript:void(0)" onclick="toggleAuthMode()" style="color:var(--saffron);font-weight:700;margin-left:4px;" id="authSwitchLink">
        ${isSignupMode ? 'Sign In' : 'Register Now'}
      </a>
    </p>
  </div></div>`;
}

function toggleAuthMode() {
  isSignupMode = !isSignupMode;
  document.getElementById('app').innerHTML = renderLoginRegister();
}

async function submitAuthForm() {
  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value;
  const phoneInput = document.getElementById('authPhone');
  const phone = phoneInput ? phoneInput.value.trim() : null;

  if (!username || !password) {
    showToast('Please fill in all fields.');
    return;
  }

  const endpoint = isSignupMode ? `${API_BASE}/api/register` : `${API_BASE}/api/login`;
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, phone })
    });
    
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Authentication failed.');
      return;
    }

    localStorage.setItem('pb_admin_token', data.token);
    localStorage.setItem('pb_username', data.username);
    localStorage.setItem('pb_role', data.role);
    localStorage.setItem('pb_phone', data.phone || '');
    
    isAdminSession = data.role === 'admin';
    showToast(isSignupMode ? 'Account registered and logged in!' : 'Logged in successfully!');
    
    // Refresh navbar & bookmarks
    updateNavbarAuth();
    await loadBookmarks();
    
    // Redirect
    if (isAdminSession) {
      location.hash = '#/admin';
    } else {
      location.hash = '#/';
    }
  } catch (err) {
    console.error('Auth submit error:', err);
    showToast('Network error during authentication.');
  }
}

function userLogout() {
  localStorage.removeItem('pb_admin_token');
  localStorage.removeItem('pb_username');
  localStorage.removeItem('pb_role');
  localStorage.removeItem('pb_phone');
  isAdminSession = false;
  userBookmarks = [];
  updateNavbarAuth();
  showToast('Logged out successfully.');
  location.hash = '#/';
}

function updateNavbarAuth() {
  const navAuth = document.getElementById('navAuthSection');
  if (!navAuth) return;

  const token = localStorage.getItem('pb_admin_token');
  const username = localStorage.getItem('pb_username');
  const role = localStorage.getItem('pb_role');

  if (token && username) {
    navAuth.innerHTML = `
      <div class="nav-user-menu">
        <button class="nav-user-btn"><i class="fa-solid fa-circle-user"></i> ${username} <i class="fa-solid fa-caret-down" style="font-size:0.75rem;"></i></button>
        <div class="nav-user-dropdown">
          ${role === 'admin' ? '<a href="#/admin"><i class="fa-solid fa-user-shield" style="margin-right:6px;"></i>Admin Panel</a>' : ''}
          <a href="#/bookmarks"><i class="fa-solid fa-star" style="margin-right:6px;"></i>Saved Bookmarks</a>
          <button class="logout-btn" onclick="userLogout()"><i class="fa-solid fa-right-from-bracket" style="margin-right:6px;"></i>Logout</button>
        </div>
      </div>
    `;
  } else {
    navAuth.innerHTML = `
      <a href="#/login" style="color:#e7ebf3;font-size:0.92rem;font-weight:600;padding:13px 14px;white-space:nowrap;">Sign In</a>
    `;
  }

  // Toggle admin link visibility in main navigation links based on role
  const adminNavLink = document.querySelector('[data-nav="admin"]');
  if (adminNavLink) {
    adminNavLink.style.display = (role === 'admin') ? 'block' : 'none';
  }
}

/* ================= COMMENTS SECTION HANDLERS ================= */
async function loadAndRenderComments(articleId) {
  const container = document.getElementById('articleComments');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/api/articles/${articleId}/comments`);
    if (!res.ok) throw new Error('Failed to load comments');
    const comments = await res.json();

    const username = localStorage.getItem('pb_username');
    const token = localStorage.getItem('pb_admin_token');

    let formHtml = '';
    if (token && username) {
      formHtml = `
        <div class="comment-form">
          <div class="comment-input-wrap">
            <textarea id="commentText" placeholder="Write a comment... Be respectful and constructive."></textarea>
          </div>
          <button class="btn" onclick="postComment('${articleId}')">Post Comment</button>
        </div>
      `;
    } else {
      formHtml = `
        <div class="ad-slot" style="padding:15px;text-align:center;background:#fff;border:1px solid var(--line);color:var(--navy);font-weight:700;">
          <i class="fa-solid fa-circle-info" style="color:var(--saffron);margin-right:6px;"></i> Want to join the discussion? <a href="#/login" style="color:var(--saffron);text-decoration:underline;">Sign In or Register</a> to leave a comment.
        </div>
      `;
    }

    const commentsListHtml = comments.map(c => `
      <div class="comment-bubble">
        <div class="comment-header">
          <span class="comment-author"><i class="fa-solid fa-circle-user" style="color:var(--navy);margin-right:6px;"></i> ${c.username}</span>
          <span>${fmtDate(c.date)}</span>
        </div>
        <div class="comment-body">${c.text.replace(/\n/g, '<br>')}</div>
      </div>
    `).join('') || '<div class="empty-state" style="padding:20px 0;">No comments yet. Start the conversation!</div>';

    container.innerHTML = `
      <h3 class="comments-title">Comments (${comments.length})</h3>
      ${formHtml}
      <div class="comments-list">${commentsListHtml}</div>
    `;

  } catch (err) {
    console.error('Comments render error:', err);
    container.innerHTML = '<div class="empty-state">Failed to load reader comments.</div>';
  }
}

async function postComment(articleId) {
  const textarea = document.getElementById('commentText');
  const text = textarea.value.trim();
  if (!text) {
    showToast('Please type a comment before posting.');
    return;
  }

  const token = localStorage.getItem('pb_admin_token');
  if (!token) {
    showToast('Session expired. Please log in.');
    userLogout();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/articles/${articleId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ text })
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        showToast('Session expired. Please log in.');
        userLogout();
      } else {
        showToast('Failed to post comment.');
      }
      return;
    }

    textarea.value = '';
    showToast('Comment posted.');
    loadAndRenderComments(articleId);
  } catch (err) {
    console.error('Post comment error:', err);
    showToast('Network error posting comment.');
  }
}

/* ================= BOOKMARKS LOGIC ================= */
async function loadBookmarks() {
  const token = localStorage.getItem('pb_admin_token');
  if (!token) {
    userBookmarks = [];
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/bookmarks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const bookmarks = await res.json();
      userBookmarks = bookmarks.map(b => b.id);
    }
  } catch (err) {
    console.error('Error loading bookmarks:', err);
  }
}

async function toggleBookmark(articleId, event) {
  event.preventDefault();
  event.stopPropagation();

  const token = localStorage.getItem('pb_admin_token');
  if (!token) {
    showToast('Please sign in to bookmark articles.');
    location.hash = '#/login';
    return;
  }

  const isBookmarked = userBookmarks.includes(articleId);
  const method = isBookmarked ? 'DELETE' : 'POST';
  const url = isBookmarked ? `${API_BASE}/api/bookmarks/${articleId}` : `${API_BASE}/api/bookmarks`;
  const body = isBookmarked ? null : JSON.stringify({ articleId });

  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: body
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        showToast('Session expired. Please login.');
        userLogout();
      } else {
        showToast(data.error || 'Failed to toggle bookmark.');
      }
      return;
    }

    if (isBookmarked) {
      userBookmarks = userBookmarks.filter(id => id !== articleId);
      showToast('Article removed from bookmarks.');
    } else {
      userBookmarks.push(articleId);
      showToast('Article bookmarked!');
    }

    // Toggle active state in UI elements
    const btns = document.querySelectorAll(`button[onclick*="toggleBookmark('${articleId}'"]`);
    btns.forEach(btn => {
      const icon = btn.querySelector('i');
      if (icon) {
        if (userBookmarks.includes(articleId)) {
          btn.classList.add('active');
          icon.className = 'fa-solid fa-star';
        } else {
          btn.classList.remove('active');
          icon.className = 'fa-regular fa-star';
        }
      }
    });

    // Re-render bookmarks view if active
    if (location.hash === '#/bookmarks') {
      renderBookmarksView();
    }

  } catch (err) {
    console.error('Bookmark toggle error:', err);
    showToast('Network error toggling bookmark.');
  }
}

async function renderBookmarksView() {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="empty-state">Loading bookmarked articles...</div>';
  
  const token = localStorage.getItem('pb_admin_token');
  if (!token) {
    location.hash = '#/login';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/bookmarks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        userLogout();
      } else {
        app.innerHTML = '<div class="empty-state">Failed to load saved bookmarks.</div>';
      }
      return;
    }

    const bookmarks = await res.json();
    
    app.innerHTML = `
      <div class="layout">
        <div>
          <div class="section-title"><span class="bar"></span> <i class="fa-solid fa-star" style="color:var(--saffron);margin-right:6px;"></i> Saved Bookmarks (${bookmarks.length})</div>
          ${bookmarks.length 
            ? `<div class="grid-cards">${bookmarks.map(articleCard).join('')}</div>` 
            : `<div class="empty-state" style="padding: 60px 20px;">
                <i class="fa-solid fa-box-open" style="font-size:3rem;display:block;margin-bottom:16px;color:var(--ink-soft);"></i>
                You haven't bookmarked any articles yet.<br>
                Explore articles and click the bookmark star icon to save them here!
               </div>`
          }
        </div>
        <div>${sidebarHTML()}</div>
      </div>
    `;
  } catch (err) {
    console.error('Bookmarks render error:', err);
    app.innerHTML = '<div class="empty-state">Network error loading saved bookmarks.</div>';
  }
}

/* ================= ADMIN PANEL DASHBOARD ================= */
function renderAdminDashboard(editId) {
  const editing = editId ? ARTICLES.find(a => a.id === editId) : null;
  const list = [...ARTICLES].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (editing) activeAdminTab = 'articles';

  let tabContent = '';
  if (activeAdminTab === 'articles') {
    tabContent = `
      <div class="admin-card" style="margin-bottom:24px;">
        <h3 style="margin-top:0;color:var(--navy);">${editing ? 'Edit Article' : 'Publish New Article'}</h3>
        <div class="field"><label>Title</label><input id="f-title" value="${editing ? editing.title.replace(/"/g, '&quot;') : ''}"></div>
        <div class="field"><label>Category</label>
          <select id="f-cat">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${editing && editing.cat === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label>Image URL (Pasted Link)</label>
          <input id="f-img" value="${editing ? editing.img : ''}" placeholder="https://...">
        </div>
        <div class="field">
          <label>OR Upload Image File</label>
          <input id="f-file" type="file" accept="image/*" onchange="previewUploadImage(event)">
          <div id="f-preview-container" style="${editing && editing.img ? 'display:block;' : 'display:none;'}margin-top:10px;">
            <span style="font-size:0.75rem;color:var(--ink-soft);display:block;margin-bottom:4px;">Selected/Uploaded Image:</span>
            <img id="f-preview" src="${editing && editing.img ? editing.img : ''}" style="max-height:120px;border-radius:6px;border:1px solid var(--line);">
          </div>
        </div>
        <div class="field"><label>Excerpt (short summary)</label><textarea id="f-excerpt" style="min-height:70px;">${editing ? editing.excerpt : ''}</textarea></div>
        <div class="field"><label>Full Content — leave a blank line to start a new paragraph</label><textarea id="f-content">${editing ? editing.content : ''}</textarea></div>
        <div class="field"><label>Author</label><input id="f-author" value="${editing ? editing.author : 'Desk Report'}"></div>
        <div class="checkbox-row"><input type="checkbox" id="f-breaking" ${editing && editing.breaking ? 'checked' : ''}> <label style="margin:0;" for="f-breaking">Mark as Breaking News</label></div>
        <button class="btn" onclick="saveArticleForm('${editing ? editing.id : ''}')">${editing ? 'Save Changes' : 'Publish'}</button>
        ${editing ? `<button class="btn outline" style="margin-left:8px;" onclick="location.hash='#/admin'">Cancel</button>` : ''}
      </div>
      <h3 style="color:var(--navy);">All Published Articles (${list.length})</h3>
      ${list.map(a => `
        <div class="admin-list-item">
          <div>
            <div class="t">${a.breaking ? '<span class="pulse-dot" style="margin-right:6px;transform:translateY(-1px);"></span>' : ''}${a.title}</div>
            <div class="m">${CATS[a.cat]} · <i class="fa-regular fa-eye" style="margin-right:4px;"></i> ${a.views || 0} views · ${fmtDate(a.date)}</div>
          </div>
          <div class="row-actions">
            <button style="background:var(--navy);" onclick="location.hash='#/admin/edit/${a.id}'">Edit</button>
            <button style="background:var(--crimson);" onclick="deleteArticle('${a.id}')">Delete</button>
          </div>
        </div>`).join('') || `<div class="empty-state">No articles yet.</div>`}
    `;
  } else if (activeAdminTab === 'analytics') {
    tabContent = `
      <div class="stats-grid" id="statsGrid">
        <div class="stat-card"><div class="val" id="statViews">0</div><div class="lbl">Total Views</div></div>
        <div class="stat-card"><div class="val" id="statArticles">0</div><div class="lbl">Total Articles</div></div>
        <div class="stat-card"><div class="val" id="statAdmins">0</div><div class="lbl">Administrators</div></div>
      </div>
      <div class="charts-row">
        <div class="chart-container">
          <h4>Top Articles by Views</h4>
          <div style="position:relative;height:300px;"><canvas id="viewsChart"></canvas></div>
        </div>
        <div class="chart-container">
          <h4>Category Distribution</h4>
          <div style="position:relative;height:300px;"><canvas id="categoryChart"></canvas></div>
        </div>
      </div>
    `;
  } else if (activeAdminTab === 'users') {
    tabContent = `
      <div class="user-manager-box">
        <h4>Registered Administrators</h4>
        <div class="user-list" id="adminUserList">Loading administrators...</div>
        <div class="admin-card" style="border:1px solid var(--line);background:var(--paper);padding:20px;margin-top:20px;">
          <h4 style="margin-top:0;color:var(--navy);">Add New Administrator</h4>
          <div class="field"><label>Username</label><input id="newAdminUser" type="text" placeholder="Enter username..."></div>
          <div class="field"><label>Password</label><input id="newAdminPass" type="password" placeholder="Enter password..."></div>
          <button class="btn" onclick="addNewAdmin()">Create Account</button>
        </div>
      </div>
    `;
  }

  return `<div class="admin-wrap">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 style="color:var(--navy);margin:0;">Admin Panel</h2>
      <button class="btn outline" onclick="userLogout()">Log Out</button>
    </div>
    <div class="admin-tabs">
      <button class="admin-tab-btn ${activeAdminTab === 'articles' ? 'active' : ''}" onclick="switchAdminTab('articles')"><i class="fa-solid fa-newspaper" style="margin-right:6px;"></i>Articles</button>
      <button class="admin-tab-btn ${activeAdminTab === 'analytics' ? 'active' : ''}" onclick="switchAdminTab('analytics')"><i class="fa-solid fa-chart-line" style="margin-right:6px;"></i>Analytics & Charts</button>
      <button class="admin-tab-btn ${activeAdminTab === 'users' ? 'active' : ''}" onclick="switchAdminTab('users')"><i class="fa-solid fa-users-gear" style="margin-right:6px;"></i>User Management</button>
    </div>
    <div id="adminTabContent">${tabContent}</div>
  </div>`;
}

function switchAdminTab(tabName) {
  activeAdminTab = tabName;
  const app = document.getElementById('app');
  app.innerHTML = renderAdminDashboard(null);
  triggerAdminTabInit();
}

function triggerAdminTabInit() {
  if (activeAdminTab === 'analytics') {
    loadAndRenderAnalytics();
  } else if (activeAdminTab === 'users') {
    loadAndRenderUsers();
  }
}

async function loadAndRenderAnalytics() {
  const token = localStorage.getItem('pb_admin_token');
  if (!token) {
    showToast('Auth token missing. Please log in.');
    userLogout();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        showToast('Session expired. Please log in again.');
        userLogout();
      } else {
        showToast('Failed to fetch analytics.');
      }
      return;
    }

    const stats = await res.json();
    
    // Update stats summary cards
    document.getElementById('statViews').textContent = stats.totalViews.toLocaleString();
    document.getElementById('statArticles').textContent = stats.totalArticles;
    document.getElementById('statAdmins').textContent = stats.totalAdmins;

    // Render Views Bar Chart
    const viewsCtx = document.getElementById('viewsChart').getContext('2d');
    if (viewsChartInstance) viewsChartInstance.destroy();
    
    viewsChartInstance = new Chart(viewsCtx, {
      type: 'bar',
      data: {
        labels: stats.topArticles.map(a => a.title.length > 25 ? a.title.slice(0, 25) + '...' : a.title),
        datasets: [{
          label: 'Page Views',
          data: stats.topArticles.map(a => a.views),
          backgroundColor: 'rgba(232, 135, 30, 0.75)', // Saffron
          borderColor: 'rgb(232, 135, 30)',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });

    // Render Categories Doughnut Chart
    const catCtx = document.getElementById('categoryChart').getContext('2d');
    if (categoryChartInstance) categoryChartInstance.destroy();

    categoryChartInstance = new Chart(catCtx, {
      type: 'doughnut',
      data: {
        labels: stats.categoryStats.map(c => CATS[c.cat] || c.cat),
        datasets: [{
          label: 'Articles',
          data: stats.categoryStats.map(c => c.articles),
          backgroundColor: [
            '#0f1b2e', // Navy
            '#e8871e', // Saffron
            '#c41e3a', // Crimson
            '#16273f', // Navy Light
            '#5a616e', // Ink Soft
            '#e3e1da', // Line
            '#20242c'  // Ink
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 10 }
          }
        }
      }
    });
  } catch (err) {
    console.error('Analytics loading error:', err);
    showToast('Network error while fetching stats.');
  }
}

async function loadAndRenderUsers() {
  const token = localStorage.getItem('pb_admin_token');
  if (!token) {
    userLogout();
    return;
  }

  const listEl = document.getElementById('adminUserList');
  try {
    const res = await fetch(`${API_BASE}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        userLogout();
      } else {
        listEl.innerHTML = '<div class="empty-state">Failed to load administrator accounts.</div>';
      }
      return;
    }

    const users = await res.json();
    if (!users.length) {
      listEl.innerHTML = '<div class="empty-state">No administrators found.</div>';
      return;
    }

    listEl.innerHTML = users.map(u => `
      <div class="user-item">
        <span class="u-name"><i class="fa-solid fa-user-gear" style="margin-right:6px;color:var(--navy);"></i>${u.username}</span>
        ${u.id === 'admin-id' 
          ? '<span style="font-size:0.75rem;color:var(--ink-soft);font-weight:600;background:var(--line);padding:2px 8px;border-radius:4px;">Primary Admin</span>' 
          : `<button class="btn danger" style="padding:4px 10px;font-size:0.75rem;" onclick="deleteAdminUser('${u.id}')">Remove</button>`
        }
      </div>
    `).join('');
  } catch (err) {
    console.error('Error fetching admin list:', err);
    listEl.innerHTML = '<div class="empty-state">Network error loading accounts.</div>';
  }
}

async function addNewAdmin() {
  const userEl = document.getElementById('newAdminUser');
  const passEl = document.getElementById('newAdminPass');
  const username = userEl.value.trim();
  const password = passEl.value;

  if (!username || !password) {
    showToast('Please specify username and password.');
    return;
  }

  const token = localStorage.getItem('pb_admin_token');
  if (!token) {
    userLogout();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to create user.');
      return;
    }

    showToast('New administrator added successfully.');
    userEl.value = '';
    passEl.value = '';
    loadAndRenderUsers();
  } catch (err) {
    console.error('Add user error:', err);
    showToast('Network error while adding user.');
  }
}

async function deleteAdminUser(id) {
  if (!confirm('Are you sure you want to remove this administrator account?')) return;
  
  const token = localStorage.getItem('pb_admin_token');
  if (!token) {
    userLogout();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to delete user.');
      return;
    }

    showToast('Administrator account removed.');
    loadAndRenderUsers();
  } catch (err) {
    console.error('Delete user error:', err);
    showToast('Network error while deleting user.');
  }
}

async function saveArticleForm(id) {
  const title = document.getElementById('f-title').value.trim();
  const cat = document.getElementById('f-cat').value;
  const img = document.getElementById('f-img').value.trim();
  const excerpt = document.getElementById('f-excerpt').value.trim();
  const content = document.getElementById('f-content').value.trim();
  const author = document.getElementById('f-author').value.trim() || 'Desk Report';
  const breaking = document.getElementById('f-breaking').checked;
  
  if (!title || !excerpt || !content) {
    showToast('Please fill in all required fields');
    return;
  }

  const token = localStorage.getItem('pb_admin_token');
  if (!token) {
    showToast('You must be logged in to perform this action.');
    userLogout();
    return;
  }

  // Read local image file if selected
  const fileInput = document.getElementById('f-file');
  let imgUpload = null;
  if (fileInput && fileInput.files && fileInput.files.length > 0) {
    try {
      imgUpload = await fileToBase64(fileInput.files[0]);
    } catch (err) {
      console.error('Error reading file:', err);
      showToast('Failed to read selected image file.');
      return;
    }
  }

  const articleData = { title, cat, img, imgUpload, excerpt, content, author, breaking };
  
  try {
    let url = `${API_BASE}/api/articles`;
    let method = 'POST';
    if (id) {
      url = `${API_BASE}/api/articles/${id}`;
      method = 'PUT';
    }

    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(articleData)
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        showToast('Session expired. Please login again.');
        userLogout();
      } else {
        showToast(data.error || 'Failed to save article.');
      }
      return;
    }

    showToast(id ? 'Article updated' : 'Article published');
    location.hash = '#/admin';
  } catch (err) {
    console.error('Error saving article:', err);
    showToast('Network error while saving.');
  }
}

async function deleteArticle(id) {
  if (!confirm('Are you sure you want to delete this article?')) return;
  
  const token = localStorage.getItem('pb_admin_token');
  if (!token) {
    showToast('You must be logged in.');
    userLogout();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/articles/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        showToast('Session expired. Please login again.');
        userLogout();
      } else {
        showToast(data.error || 'Failed to delete article.');
      }
      return;
    }

    showToast('Article deleted');
    await loadArticles();
    const app = document.getElementById('app');
    const hash = location.hash;
    const parts = hash.replace('#/', '').split('/').filter(Boolean);
    if (parts[1] === 'edit') {
      location.hash = '#/admin';
    } else {
      app.innerHTML = renderAdminDashboard(null);
    }
  } catch (err) {
    console.error('Error deleting article:', err);
    showToast('Network error while deleting.');
  }
}

/* ================= MOBILE NAV HELPERS & RENDERS ================= */
function goToProfileMobile() {
  const token = localStorage.getItem('pb_admin_token');
  const role = localStorage.getItem('pb_role');
  if (!token) {
    location.hash = '#/login';
  } else if (role === 'admin') {
    location.hash = '#/admin';
  } else {
    location.hash = '#/profile';
  }
}

function renderSearchDiscoverPage() {
  return `
    <div class="static-page" style="max-width: 600px; margin: 0 auto; padding: 20px 16px;">
      <h2 style="color:var(--navy); margin-top:0; margin-bottom: 16px; font-weight:700;">Search & Discover</h2>
      <div style="display:flex; gap:10px; margin-bottom: 24px;">
        <input id="mobileSearchInput" type="text" placeholder="Search news articles..." style="flex:1; padding:12px 16px; border:1px solid var(--line); border-radius:30px; font-size:1rem; outline:none;" onkeydown="if(event.key==='Enter')doMobileSearch()">
        <button class="btn" onclick="doMobileSearch()" style="border-radius:30px; padding:0 20px;">Search</button>
      </div>
      
      <h3 style="color:var(--navy); font-size:1.1rem; margin-bottom:12px; font-weight:700;">Browse Categories</h3>
      <div style="display:flex; flex-wrap:wrap; gap:10px;">
        ${Object.entries(CATS).map(([k, v]) => `
          <a href="#/category/${k}" style="background:#fff; border:1px solid var(--line); color:var(--navy); padding:10px 16px; border-radius:20px; text-decoration:none; font-weight:600; font-size:0.9rem; transition:all 0.15s ease;">${v}</a>
        `).join('')}
      </div>
    </div>
  `;
}

function doMobileSearch() {
  const q = document.getElementById('mobileSearchInput').value.trim();
  if (q) location.hash = '#/search/' + encodeURIComponent(q);
}

function renderProfileView() {
  const username = localStorage.getItem('pb_username');
  const role = localStorage.getItem('pb_role');
  const phone = localStorage.getItem('pb_phone');
  if (!username) {
    location.hash = '#/login';
    return '';
  }

  return `
    <div class="admin-wrap" style="max-width: 500px; margin: 40px auto; padding: 20px;">
      <div class="admin-card" style="text-align: center; background: #fff; padding: 30px; border-radius: 12px; border: 1px solid var(--line);">
        <i class="fa-solid fa-circle-user" style="font-size: 4.5rem; display: block; margin-bottom: 16px; color: var(--navy);"></i>
        <h2 style="color:var(--navy); margin: 0 0 6px 0; font-weight: 700;">${username}</h2>
        <span style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:var(--ink-soft); letter-spacing:1px; background:var(--line); padding:3px 12px; border-radius:12px; display:inline-block; margin-bottom: 16px;">
          ${role === 'admin' ? 'Administrator' : 'Reader'}
        </span>
        
        <div style="margin: 20px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding: 20px 0; text-align: left;">
          ${phone ? `
          <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.95rem;">
            <span style="color:var(--ink-soft);"><i class="fa-solid fa-phone" style="margin-right:6px;"></i>Phone:</span>
            <strong style="color:var(--navy);">${phone}</strong>
          </div>
          ` : ''}
          <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.95rem;">
            <span style="color:var(--ink-soft);"><i class="fa-regular fa-star" style="margin-right:6px;"></i>Saved Articles:</span>
            <strong style="color:var(--navy);">${userBookmarks.length}</strong>
          </div>
          <a href="#/bookmarks" class="btn outline" style="display:block; text-align:center; padding:10px; margin-top:8px; font-size:0.88rem; text-decoration:none; font-weight:600;">View Bookmarks</a>
        </div>
        
        <button class="btn danger" style="width:100%; border-radius: 8px;" onclick="userLogout()">Log Out</button>
      </div>
    </div>
  `;
}

/* ================= ROUTER ================= */
// Redirect path-based to hash-based router redirect (e.g. /admin -> /#/admin)
if (window.location.pathname !== '/' && !window.location.pathname.includes('.')) {
  window.location.replace('/#' + window.location.pathname);
}

function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (q) location.hash = '#/search/' + encodeURIComponent(q);
}

async function route() {
  const app = document.getElementById('app');
  const hash = location.hash || '#/';
  const parts = hash.replace('#/', '').split('/').filter(Boolean);

  document.querySelectorAll('.navlinks a').forEach(a => a.classList.remove('active'));

  // Update active state in bottom nav items
  document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
  if (parts[0] === 'search-page' || parts[0] === 'category' || parts[0] === 'search') {
    const activeBtn = document.querySelector('[data-bottom-nav="search"]');
    if (activeBtn) activeBtn.classList.add('active');
  } else if (parts[0] === 'bookmarks') {
    const activeBtn = document.querySelector('[data-bottom-nav="bookmarks"]');
    if (activeBtn) activeBtn.classList.add('active');
  } else if (parts[0] === 'profile' || parts[0] === 'login' || parts[0] === 'admin') {
    const activeBtn = document.querySelector('[data-bottom-nav="profile"]');
    if (activeBtn) activeBtn.classList.add('active');
  } else if (!parts[0]) {
    const activeBtn = document.querySelector('[data-bottom-nav="home"]');
    if (activeBtn) activeBtn.classList.add('active');
  }

  // Clear search input if not searching
  if (parts[0] !== 'search') {
    document.getElementById('searchInput').value = '';
  }

  // Update nav profile controls
  updateNavbarAuth();

  // Route: Login/Register
  if (parts[0] === 'login') {
    app.innerHTML = renderLoginRegister();
    window.scrollTo(0, 0);
    return;
  }

  // Route: Saved Bookmarks
  if (parts[0] === 'bookmarks') {
    await renderBookmarksView();
    window.scrollTo(0, 0);
    return;
  }

  // Route: Mobile Profile details
  if (parts[0] === 'profile') {
    app.innerHTML = renderProfileView();
    window.scrollTo(0, 0);
    return;
  }

  // Route: Mobile Search & Discover Page
  if (parts[0] === 'search-page') {
    app.innerHTML = renderSearchDiscoverPage();
    window.scrollTo(0, 0);
    return;
  }

  // Route: Admin Dashboard
  if (parts[0] === 'admin') {
    if (!isAdminSession) {
      location.hash = '#/login';
      return;
    }
    app.innerHTML = '<div class="empty-state">Loading dashboard...</div>';
    await loadArticles();
    
    if (parts[1] === 'edit' && parts[2]) {
      app.innerHTML = renderAdminDashboard(parts[2]);
    } else {
      app.innerHTML = renderAdminDashboard(null);
    }
    triggerAdminTabInit();
    const navA = document.querySelector('[data-nav="admin"]');
    if (navA) navA.classList.add('active');
    window.scrollTo(0, 0);
    return;
  }

  // Route: Category pages
  if (parts[0] === 'category' && parts[1]) {
    app.innerHTML = '<div class="empty-state">Loading category...</div>';
    await loadArticles({ cat: parts[1] });
    app.innerHTML = renderCategory(parts[1]);
    const navA = document.querySelector(`[data-nav="${parts[1]}"]`);
    if (navA) navA.classList.add('active');
  } 
  // Route: Single Article detail
  else if (parts[0] === 'article' && parts[1]) {
    await renderArticle(parts[1]);
  } 
  // Route: Search results page
  else if (parts[0] === 'search' && parts[1]) {
    app.innerHTML = '<div class="empty-state">Searching...</div>';
    const queryStr = decodeURIComponent(parts[1]);
    await loadArticles({ q: queryStr });
    app.innerHTML = renderSearch(queryStr);
  } 
  // Route: Static informational pages
  else if (['about', 'contact', 'privacy'].includes(parts[0])) {
    app.innerHTML = renderStatic(parts[0]);
  } 
  // Route: Home page
  else {
    app.innerHTML = '<div class="empty-state">Loading latest news...</div>';
    await loadArticles();
    app.innerHTML = renderHome();
    const navA = document.querySelector('[data-nav="home"]');
    if (navA) navA.classList.add('active');
  }
  window.scrollTo(0, 0);
  document.getElementById('navLinks').classList.remove('open');
}

document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('open');
});

window.addEventListener('hashchange', route);

// Initialize application on load
(async function init() {
  updateNavbarAuth();
  await loadBookmarks();
  await loadArticles();
  await loadBreakingArticles();
  renderTicker();
  route();
})();

// Image Upload Helpers
function previewUploadImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const previewImg = document.getElementById('f-preview');
    const container = document.getElementById('f-preview-container');
    previewImg.src = e.target.result;
    container.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}
