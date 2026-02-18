// API Configuration
const API_BASE = '/api';
const API_URLS = `${API_BASE}/urls`;
const API_ANALYTICS = `${API_BASE}/analytics`;

// Local Storage for recent URLs
const RECENT_URLS_KEY = 'recent_urls';
const MAX_RECENT_URLS = 10;

// DOM Elements
const shortenForm = document.getElementById('shortenForm');
const originalUrlInput = document.getElementById('originalUrl');
const customAliasInput = document.getElementById('customAlias');
const expireDaysInput = document.getElementById('expireDays');
const loadingState = document.getElementById('loadingState');
const errorMessage = document.getElementById('errorMessage');
const resultSection = document.getElementById('resultSection');
const shortUrlInput = document.getElementById('shortUrlInput');
const copyBtn = document.getElementById('copyBtn');
const copyMessage = document.getElementById('copyMessage');
const originalUrlDisplay = document.getElementById('originalUrlDisplay');
const qrCode = document.getElementById('qrCode');
const downloadQrBtn = document.getElementById('downloadQrBtn');
const previewSection = document.getElementById('previewSection');
const viewAnalyticsBtn = document.getElementById('viewAnalyticsBtn');
const resetFormBtn = document.getElementById('resetFormBtn');
const analyticsModal = document.getElementById('analyticsModal');
const modalClose = document.querySelector('.modal-close');
const recentUrlsList = document.getElementById('recentUrlsList');

let currentShortCode = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadRecentUrls();
});

function setupEventListeners() {
    shortenForm.addEventListener('submit', handleCreateUrl);
    copyBtn.addEventListener('click', copyToClipboard);
    downloadQrBtn.addEventListener('click', downloadQR);
    viewAnalyticsBtn.addEventListener('click', showAnalytics);
    resetFormBtn.addEventListener('click', resetForm);
    modalClose.addEventListener('click', closeAnalytics);
    analyticsModal.addEventListener('click', (e) => {
        if (e.target === analyticsModal) closeAnalytics();
    });
}

// Create Short URL
async function handleCreateUrl(e) {
    e.preventDefault();
    
    const originalUrl = originalUrlInput.value.trim();
    const customAlias = customAliasInput.value.trim();
    const expireDays = parseInt(expireDaysInput.value) || 90;
    
    if (!originalUrl) {
        showError('Please enter a URL');
        return;
    }
    
    try {
        showLoading(true);
        errorMessage.style.display = 'none';
        
        const payload = {
            originalUrl: originalUrl,
            customAlias: customAlias || undefined,
            expiresIn: expireDays * 24 * 60 * 60 // Convert days to seconds
        };
        
        const response = await fetch(API_URLS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details?.[0]?.message || error.error || 'Failed to create short URL');
        }
        
        const data = await response.json();
        
        currentShortCode = data.shortCode;
        displayResult(data, expireDays);
        saveRecentUrl(data);
        loadRecentUrls();
        
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Display Result
function displayResult(data, expireDays) {
    const shortUrl = `${window.location.origin}/${data.shortCode}`;
    shortUrlInput.value = shortUrl;
    originalUrlDisplay.textContent = data.originalUrl;
    originalUrlDisplay.href = data.originalUrl;
    
    // QR Code
    if (data.qrCode) {
        qrCode.src = data.qrCode;
    }
    
    // Preview
    if (data.preview && (data.preview.title || data.preview.description || data.preview.image)) {
        previewSection.style.display = 'block';
        document.getElementById('previewTitle').textContent = data.preview.title || 'No title';
        document.getElementById('previewDesc').textContent = data.preview.description || 'No description';
        
        if (data.preview.image) {
            document.getElementById('previewImage').style.display = 'block';
            document.getElementById('previewImg').src = data.preview.image;
            document.getElementById('previewImg').onerror = () => {
                document.getElementById('previewImage').style.display = 'none';
            };
        }
    } else {
        previewSection.style.display = 'none';
    }
    
    // Stats
    document.querySelector('.stat:nth-child(2) .stat-value').textContent = new Date().toLocaleDateString();
    document.querySelector('.stat:nth-child(3) .stat-value').textContent = `${expireDays} days`;
    
    // Show result section
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Copy to Clipboard
function copyToClipboard() {
    const url = shortUrlInput.value;
    navigator.clipboard.writeText(url).then(() => {
        copyMessage.style.display = 'block';
        setTimeout(() => {
            copyMessage.style.display = 'none';
        }, 2000);
    });
}

// Download QR Code
function downloadQR() {
    const link = document.createElement('a');
    link.href = qrCode.src;
    link.download = `qr-${currentShortCode}.png`;
    link.click();
}

// Show Analytics
async function showAnalytics() {
    if (!currentShortCode) return;
    
    try {
        const response = await fetch(`${API_ANALYTICS}/${currentShortCode}`);
        if (!response.ok) throw new Error('Failed to fetch analytics');
        
        const analytics = await response.json();
        
        // Update analytics modal
        document.getElementById('totalClicks').textContent = analytics.totalClicks || 0;
        document.getElementById('uniqueVisitors').textContent = analytics.uniqueVisitors || 0;
        document.getElementById('lastClick').textContent = analytics.lastClick ? new Date(analytics.lastClick).toLocaleDateString() : 'Never';
        
        // By Country
        const countryStats = document.getElementById('countryStats');
        countryStats.innerHTML = '';
        if (analytics.byCountry && Object.keys(analytics.byCountry).length > 0) {
            Object.entries(analytics.byCountry)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .forEach(([country, count]) => {
                    countryStats.innerHTML += createStatItem(country || 'Unknown', count);
                });
        } else {
            countryStats.innerHTML = '<p style="color: #999; text-align: center;">No data yet</p>';
        }
        
        // By Device
        const deviceStats = document.getElementById('deviceStats');
        deviceStats.innerHTML = '';
        if (analytics.byDevice && Object.keys(analytics.byDevice).length > 0) {
            Object.entries(analytics.byDevice)
                .sort((a, b) => b[1] - a[1])
                .forEach(([device, count]) => {
                    deviceStats.innerHTML += createStatItem(device || 'Unknown', count);
                });
        } else {
            deviceStats.innerHTML = '<p style="color: #999; text-align: center;">No data yet</p>';
        }
        
        // By Browser
        const browserStats = document.getElementById('browserStats');
        browserStats.innerHTML = '';
        if (analytics.byBrowser && Object.keys(analytics.byBrowser).length > 0) {
            Object.entries(analytics.byBrowser)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .forEach(([browser, count]) => {
                    browserStats.innerHTML += createStatItem(browser || 'Unknown', count);
                });
        } else {
            browserStats.innerHTML = '<p style="color: #999; text-align: center;">No data yet</p>';
        }
        
        analyticsModal.style.display = 'flex';
    } catch (error) {
        showError('Failed to load analytics');
    }
}

function createStatItem(name, value) {
    return `<div class="stat-item">
        <span class="stat-item-name">${escapeHtml(name)}</span>
        <span class="stat-item-value">${value}</span>
    </div>`;
}

function closeAnalytics() {
    analyticsModal.style.display = 'none';
}

// Reset Form
function resetForm() {
    shortenForm.reset();
    resultSection.style.display = 'none';
    errorMessage.style.display = 'none';
    currentShortCode = null;
    originalUrlInput.focus();
}

// Error Handling
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showLoading(isLoading) {
    loadingState.style.display = isLoading ? 'flex' : 'none';
}

// Recent URLs - Local Storage
function saveRecentUrl(urlData) {
    let recent = JSON.parse(localStorage.getItem(RECENT_URLS_KEY) || '[]');
    const item = {
        shortCode: urlData.shortCode,
        originalUrl: urlData.originalUrl,
        shortUrl: `${window.location.origin}/${urlData.shortCode}`,
        createdAt: new Date().toISOString(),
        clicks: 0
    };
    recent.unshift(item);
    recent = recent.slice(0, MAX_RECENT_URLS);
    localStorage.setItem(RECENT_URLS_KEY, JSON.stringify(recent));
}

function loadRecentUrls() {
    const recent = JSON.parse(localStorage.getItem(RECENT_URLS_KEY) || '[]');
    
    if (recent.length === 0) {
        recentUrlsList.innerHTML = '<p class="empty-state">No links created yet. Create one above!</p>';
        return;
    }
    
    recentUrlsList.innerHTML = recent.map((url, index) => `
        <div class="url-card" data-index="${index}">
            <div class="url-card-header">
                <div class="url-card-title">${escapeHtml(url.shortCode)}</div>
                <div class="url-card-time">${formatDate(url.createdAt)}</div>
            </div>
            <div class="url-card-stats">
                <div class="url-card-stat">
                    <div class="url-card-stat-value">${url.clicks || 0}</div>
                    <div class="url-card-stat-label">Clicks</div>
                </div>
                <div class="url-card-stat">
                    <div class="url-card-stat-value" title="${url.originalUrl}">${truncateUrl(url.originalUrl)}</div>
                    <div class="url-card-stat-label">Link</div>
                </div>
            </div>
            <div class="url-card-actions">
                <button class="btn btn-copy copy-recent" data-url="${url.shortUrl}">📋</button>
                <button class="btn btn-secondary open-url" data-url="${url.shortcuts}">🔗</button>
                <button class="btn btn-secondary view-analytics-btn" data-code="${url.shortCode}">📊</button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.copy-recent').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = btn.dataset.url;
            navigator.clipboard.writeText(url);
            btn.textContent = '✓';
            setTimeout(() => btn.textContent = '📋', 1500);
        });
    });
    
    document.querySelectorAll('.open-url').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = btn.dataset.url;
            window.open(url, '_blank');
        });
    });
    
    document.querySelectorAll('.view-analytics-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentShortCode = btn.dataset.code;
            showAnalytics();
        });
    });
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const diff = today - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

function truncateUrl(url) {
    try {
        const domain = new URL(url).hostname;
        return domain.replace('www.', '');
    } catch {
        return url.substring(0, 20) + '...';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
