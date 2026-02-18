/**
 * URL Shortener v2.0 - Enhanced Frontend
 * Features: Authentication, Dashboard, Advanced Analytics, Charts
 */

// ============ State Management ============
const state = {
  token: localStorage.getItem('auth_token'),
  user: JSON.parse(localStorage.getItem('user_data') || 'null'),
  currentView: 'create',
  recentLinks: JSON.parse(localStorage.getItem('recent_links') || '[]'),
  charts: {}
};

const API_BASE = 'http://localhost:3000/api';

// ============ Initialize ============
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupEventListeners();
});

function initializeApp() {
  if (state.token) {
    showDashboard();
  } else {
    showCreateView();
  }
}

function setupEventListeners() {
  // Auth buttons
  document.getElementById('loginBtn').addEventListener('click', () => showLoginForm());
  document.getElementById('registerBtn').addEventListener('click', () => showRegisterForm());
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Form switches
  document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    showRegisterForm();
  });
  document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
  });

  // Auth forms
  document.getElementById('loginFormElement')?.addEventListener('submit', handleLogin);
  document.getElementById('registerFormElement')?.addEventListener('submit', handleRegister);

  // Create form
  document.getElementById('shortenForm')?.addEventListener('submit', handleCreateLink);

  // Result buttons
  document.getElementById('copyBtn')?.addEventListener('click', copyToClipboard);
  document.getElementById('createAnotherBtn')?.addEventListener('click', resetForm);
  document.getElementById('viewAnalyticsBtn')?.addEventListener('click', viewAnalytics);
  document.getElementById('downloadQrBtn')?.addEventListener('click', downloadQR);
  document.getElementById('backToDashboardBtn')?.addEventListener('click', showDashboard);
}

// ============ Authentication ============

function showLoginForm() {
  const modal = document.getElementById('authModal');
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('registerForm').style.display = 'none';
  modal.style.display = 'flex';
}

function showRegisterForm() {
  const modal = document.getElementById('authModal');
  document.getElementById('registerForm').style.display = 'block';
  document.getElementById('loginForm').style.display = 'none';
  modal.style.display = 'flex';
}

function closeAuthModal() {
  document.getElementById('authModal').style.display = 'none';
}

async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) throw new Error('Login failed');
    
    const data = await response.json();
    state.token = data.token;
    state.user = data.user;

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user_data', JSON.stringify(data.user));

    closeAuthModal();
    showDashboard();
  } catch (error) {
    alert('Login failed: ' + error.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  const username = document.getElementById('registerUsername').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    if (!response.ok) throw new Error('Registration failed');
    
    const data = await response.json();
    state.token = data.token;
    state.user = data.user;

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user_data', JSON.stringify(data.user));

    closeAuthModal();
    showDashboard();
  } catch (error) {
    alert('Registration failed: ' + error.message);
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
  
  document.getElementById('dashboardSection').style.display = 'none';
  document.getElementById('analyticsSection').style.display = 'none';
  document.getElementById('userInfo').style.display = 'none';
  document.getElementById('authButtons').style.display = 'flex';
  
  showCreateView();
}

// ============ View Management ============

function showDashboard() {
  state.currentView = 'dashboard';
  
  document.getElementById('createSection').style.display = 'block';
  document.getElementById('dashboardSection').style.display = 'block';
  document.getElementById('analyticsSection').style.display = 'none';
  document.getElementById('resultSection').style.display = 'none';
  document.getElementById('recentLinksList').style.display = 'block';

  document.getElementById('authButtons').style.display = 'none';
  document.getElementById('userInfo').style.display = 'block';
  document.getElementById('username').textContent = state.user?.username || 'User';

  loadUserDashboard();
}

function showCreateView() {
  state.currentView = 'create';
  
  document.getElementById('createSection').style.display = 'block';
  document.getElementById('dashboardSection').style.display = 'none';
  document.getElementById('analyticsSection').style.display = 'none';
  document.getElementById('resultSection').style.display = 'none';
  document.getElementById('recentLinksList').style.display = 'block';

  loadRecentLinks();
}

async function loadUserDashboard() {
  if (!state.token || !state.user) return;

  try {
    const response = await fetch(`${API_BASE}/analytics/dashboard/${state.user.userId}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    if (!response.ok) throw new Error('Failed to load dashboard');
    
    const data = await response.json();

    // Update stats
    document.getElementById('totalLinks').textContent = data.stats.totalLinks;
    document.getElementById('totalClicks').textContent = data.stats.totalClicks;
    document.getElementById('avgClicks').textContent = data.stats.avgClicksPerLink.toFixed(1);
    document.getElementById('topLinkClicks').textContent = 
      (data.topLinksRealtime[0]?.clicks || 0);

    // Load user's links
    const linksList = document.getElementById('userLinksList');
    linksList.innerHTML = data.links.map(link => `
      <div class="link-item">
        <div class="link-info">
          <p class="link-code">${link.short_code}</p>
          <p class="link-original">${link.original_url.substring(0, 50)}...</p>
          ${link.title ? `<p class="link-title">${link.title}</p>` : ''}
          <p class="link-meta">
            📊 ${link.click_count} clicks | 
            🔒 ${link.visibility} | 
            📅 ${new Date(link.created_at).toLocaleDateString()}
          </p>
        </div>
        <div class="link-actions">
          <button onclick="copyLinkCode('${link.short_code}')" class="btn btn-small">Copy</button>
          <button onclick="viewLinkAnalytics('${link.short_code}')" class="btn btn-small">Analytics</button>
          <button onclick="deleteLink('${link.short_code}')" class="btn btn-small btn-danger">Delete</button>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Dashboard error:', error);
  }
}

// ============ Link Management ============

async function handleCreateLink(e) {
  e.preventDefault();

  const originalUrl = document.getElementById('originalUrl').value;
  const title = document.getElementById('linkTitle').value;
  const visibility = document.getElementById('visibility').value;

  if (!originalUrl) {
    showError('Please enter a URL');
    return;
  }

  try {
    showLoading(true);

    const headers = {
      'Content-Type': 'application/json'
    };

    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    const response = await fetch(`${API_BASE}/urls`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        originalUrl,
        title: title || null,
        visibility: state.token ? visibility : 'public'
      })
    });

    if (!response.ok) throw new Error('Failed to create link');

    const data = await response.json();

    // Save to recent links
    addToRecentLinks({
      shortCode: data.shortCode,
      originalUrl,
      title,
      createdAt: new Date().toISOString()
    });

    showResult(data);
    showLoading(false);
  } catch (error) {
    showError(error.message);
    showLoading(false);
  }
}

function addToRecentLinks(link) {
  state.recentLinks.unshift(link);
  state.recentLinks = state.recentLinks.slice(0, 10);
  localStorage.setItem('recent_links', JSON.stringify(state.recentLinks));
}

function loadRecentLinks() {
  const list = document.getElementById('recentLinksList');
  
  if (state.recentLinks.length === 0) {
    list.innerHTML = '<p class="placeholder">No recent links yet</p>';
    return;
  }

  list.innerHTML = state.recentLinks.map(link => `
    <div class="link-card">
      <h3>${link.title || 'Untitled'}</h3>
      <p class="code">${link.shortCode}</p>
      <p class="original">${link.originalUrl.substring(0, 40)}...</p>
      <button onclick="copyLinkCode('${link.shortCode}')" class="btn btn-small">Copy</button>
    </div>
  `).join('');
}

async function deleteLink(shortCode) {
  if (!state.token) return;
  
  if (!confirm('Delete this link?')) return;

  try {
    const response = await fetch(`${API_BASE}/urls/${shortCode}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    if (response.ok) {
      loadUserDashboard();
    }
  } catch (error) {
    console.error('Delete error:', error);
  }
}

// ============ Analytics ============

async function viewLinkAnalytics(shortCode) {
  state.currentView = 'analytics';
  
  document.getElementById('createSection').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'none';
  document.getElementById('analyticsSection').style.display = 'block';
  document.getElementById('resultSection').style.display = 'none';

  document.getElementById('analyticsCode').textContent = shortCode;

  try {
    const response = await fetch(`${API_BASE}/analytics/${shortCode}`);
    if (!response.ok) throw new Error('Failed to load analytics');
    
    const data = await response.json();
    renderAnalytics(data);

    // Also load heatmap
    const heatmapResponse = await fetch(`${API_BASE}/analytics/heatmap/${shortCode}`);
    if (heatmapResponse.ok) {
      const heatmapData = await heatmapResponse.json();
      renderHeatmap(heatmapData);
    }
  } catch (error) {
    console.error('Analytics error:', error);
  }
}

function renderAnalytics(data) {
  // Device chart
  const deviceCtx = document.getElementById('deviceChart').getContext('2d');
  new Chart(deviceCtx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(data.devices),
      datasets: [{
        data: Object.values(data.devices),
        backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1']
      }]
    }
  });

  // Browser chart
  const browserCtx = document.getElementById('browserChart').getContext('2d');
  new Chart(browserCtx, {
    type: 'bar',
    data: {
      labels: Object.keys(data.browsers).slice(0, 5),
      datasets: [{
        label: 'Clicks',
        data: Object.values(data.browsers).slice(0, 5),
        backgroundColor: '#45B7D1'
      }]
    }
  });

  // Time chart
  const timeCtx = document.getElementById('timeChart').getContext('2d');
  new Chart(timeCtx, {
    type: 'line',
    data: {
      labels: data.hourlyData.map(h => new Date(h.hour).toLocaleTimeString()),
      datasets: [{
        label: 'Clicks',
        data: data.hourlyData.map(h => h.clicks),
        borderColor: '#FF6B6B',
        tension: 0.1
      }]
    }
  });
}

function renderHeatmap(data) {
  const container = document.getElementById('heatmapContainer');
  const countries = data.heatmapData.slice(0, 10);
  
  container.innerHTML = countries.map(country => `
    <div class="heatmap-item">
      <p>${country.country}: ${country.clicks} clicks</p>
      <div class="heatmap-bar" style="width: ${(country.clicks / countries[0].clicks) * 100}%"></div>
    </div>
  `).join('');
}

function viewAnalytics() {
  const shortCode = document.getElementById('shortUrlInput').value.split('/').pop();
  viewLinkAnalytics(shortCode);
}

// ============ Utility Functions ============

function showResult(data) {
  const shortUrl = `${window.location.origin}/${data.shortCode}`;
  
  document.getElementById('shortUrlInput').value = shortUrl;
  document.getElementById('resultSection').style.display = 'block';
  document.getElementById('createSection').style.display = 'none';
  
  // Generate and display QR code
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shortUrl)}`;
  document.getElementById('qrCodeContainer').innerHTML = 
    `<img src="${qrCodeUrl}" alt="QR Code" style="max-width: 300px;">`;
}

function copyToClipboard() {
  const input = document.getElementById('shortUrlInput');
  input.select();
  document.execCommand('copy');
  
  const msg = document.getElementById('copyMessage');
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 2000);
}

function copyLinkCode(code) {
  const text = `${window.location.origin}/${code}`;
  navigator.clipboard.writeText(text);
  alert('Copied: ' + text);
}

function downloadQR() {
  const qrImg = document.querySelector('#qrCodeContainer img');
  if (!qrImg) return;
  
  const link = document.createElement('a');
  link.href = qrImg.src;
  link.download = 'qr-code.png';
  link.click();
}

function resetForm() {
  document.getElementById('shortenForm').reset();
  showCreateView();
}

function showLoading(show) {
  document.getElementById('loadingState').style.display = show ? 'block' : 'none';
}

function showError(msg) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = msg;
  errorDiv.style.display = 'block';
  setTimeout(() => errorDiv.style.display = 'none', 5000);
}
