# 🚀 Complete Installation Guide - All Phases Ready

## 📋 Executive Summary

**Good News:** All Phases 1-7 are fully implemented and ready! The code is complete. Now we just need to install the dependencies and running things.

Here's the installation timeline:

| Phase | Can Run Without Installation? | What's Needed |
|-------|-------------------------------|---------------|
| Phase 1-4 | ✅ Code ready (no install yet) | None |
| Phase 5 | ✅ Code ready (no install yet) | None |
| Phase 6 | ✅ Code ready (no install yet) | None |
| Phase 7 | ✅ Code ready (no install yet) | None |
| **EVERYTHING** | ❌ Cannot run without this | Node.js, npm, Docker |

---

## 📦 Installation Timeline

### Stage 1: Before You Run Anything (Install These Now)

These are required to run ANY phase:

#### 1.1 Node.js & npm

**What it is:** JavaScript runtime and package manager

**Download from:** https://nodejs.org/ (Download LTS version 18+)

**Windows Installation:**
1. Download Node.js LTS installer
2. Run installer
3. Accept defaults
4. Restart computer

**Verify installation:**
```powershell
node --version       # Should be v18.x or higher
npm --version        # Should be 8.x or higher
```

#### 1.2 Git (Optional but Recommended)

**What it is:** Version control

**Download from:** https://git-scm.com/download/win

**Or use GitHub Desktop:** https://desktop.github.com/

---

### Stage 2: When You Want to Test Locally (No Docker)

**When:** If you want to test without Docker containers

**Install:**

1. **PostgreSQL**
   - Download: https://www.postgresql.org/download/windows/
   - During install, remember the password you set
   - Port: 5432 (default)

2. **Redis**
   - Download: https://github.com/microsoftarchive/redis/releases
   - Or use: https://redis.io/download
   - Port: 6379 (default)

**Modify `.env`:**
```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=<password-you-set>
REDIS_HOST=localhost
```

**Run:**
```powershell
npm install
npm run dev          # Terminal 1
npm run worker       # Terminal 2
```

---

### Stage 3: When You Want Full Production Setup (With Docker)

**When:** You want to use containers (Recommended for testing)

**Install:**

1. **Docker Desktop**
   - Download: https://www.docker.com/products/docker-desktop
   - Windows requirements:
     - Windows 10/11 Pro or Enterprise
     - Hyper-V enabled
   - Install and run

2. **Verify Docker:**
```powershell
docker --version          # Should show docker version
docker-compose --version  # Should show compose version
```

**Run:**
```powershell
npm install
npm run docker:build
npm run docker:up
docker-compose exec app npm run migrate
```

---

## 🎯 Installation Checklist

### ✅ I Want to Run Everything Right Now

Follow this order:

- [ ] Download & install Node.js (5 min)
- [ ] `npm install` in project folder (3 min)
- [ ] Download & install Docker Desktop (10 min)
- [ ] `npm run docker:build` (5 min)
- [ ] `npm run docker:up` (2 min)
- [ ] `docker-compose exec app npm run migrate` (1 min)
- [ ] Open browser: http://localhost:3000/health
- ✅ **All done!** 26 minutes total

### ✅ I Want to Run Locally Without Docker

Follow this order:

- [ ] Download & install Node.js (5 min)
- [ ] Download & install PostgreSQL (10 min, remember password)
- [ ] Download & install Redis (5 min)
- [ ] Edit `.env` with DB credentials (2 min)
- [ ] `npm install` in project folder (3 min)
- [ ] Terminal 1: `npm run dev` (starts API)
- [ ] Terminal 2: `npm run worker` (starts analytics)
- [ ] Open browser: http://localhost:3000/health
- ✅ **All done!** 28 minutes total

### ✅ I Only Want to Review the Code

- [ ] No installation needed!
- [ ] All code is ready in `src/` folder
- [ ] All phases are implemented
- [ ] Read the `.md` files to understand each phase

---

## 📥 Installation Step-by-Step

### Step 1: Install Node.js

**On Windows:**
```powershell
# Download from https://nodejs.org/
# Run installer
# Accept all defaults
# Restart PowerShell

# Verify:
node --version
npm --version
```

**On Mac:**
```bash
# Using Homebrew
brew install node

# Verify
node --version
npm --version
```

**On Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Install npm Dependencies

```powershell
cd "C:\Users\jadit\Downloads\Distributed URL Shortener"
npm install
```

**This installs:**
- express (web framework)
- pg (PostgreSQL driver)
- redis (Redis client)
- bull (job queue)
- qrcode (QR code generation)
- node-cron (scheduled jobs)
- And 20+ other packages

**Time:** 2-3 minutes
**Space:** ~200MB

### Step 3: (OPTIONAL) Install Docker

**Only if you want containerized setup.**

```powershell
# 1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
# 2. Run installer
# 3. Follow setup wizard
# 4. Restart computer

# Verify installation:
docker --version
docker-compose --version
```

### Step 4: Run the Project

**Option A: Docker (Recommended)**
```powershell
npm run docker:build    # Build images (5 min)
npm run docker:up       # Start all services (2 min)

# In new terminal:
docker-compose exec app npm run migrate  # Setup database
```

**Option B: Local (Without Docker)**
```powershell
# Terminal 1:
npm run dev             # Starts API on port 3000

# Terminal 2:
npm run worker          # Starts analytics worker

# In third terminal:
npm run migrate
```

---

## 🔍 Verify Installation

### Test 1: Health Check
```powershell
curl http://localhost:3000/health
# Should return: { "status": "ok", ... }
```

### Test 2: Create Short URL
```powershell
curl -X POST http://localhost:3000/api/urls `
  -H "Content-Type: application/json" `
  -d '{ "originalUrl": "https://example.com" }'
# Should return: { "shortCode": "a1b2c3", ... }
```

### Test 3: Access Analytics
```powershell
curl http://localhost:3000/api/debug/dashboard
# Should return performance data
```

If all 3 tests pass, ✅ **Installation complete!**

---

## 🛠️ Troubleshooting Installation

### "npm: command not found"
**Solution:** Node.js not installed. Download from nodejs.org

### "port 3000 already in use"
**Solution:** Change PORT in .env or kill process:
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill it (replace PID)
taskkill /PID <PID> /F
```

### "Cannot connect to PostgreSQL"
**If using local PostgreSQL:**
1. Ensure PostgreSQL is running (check Services)
2. Verify credentials in `.env`
3. Check if port 5432 is open

**If using Docker:**
```powershell
docker-compose ps postgres
# Should show "Up"

# If not, restart:
docker-compose restart postgres
```

### "Redis connection refused"
**Solution:**
- Ensure Redis is running: `redis-cli ping` should return "PONG"
- Or restart Docker: `docker-compose restart redis`

### "Docker not running"
**Solution:**
1. Open Docker Desktop application
2. Wait for it to fully start (shows "Running" in system tray)
3. Then run: `npm run docker:up`

---

## 📊 System Requirements

### Minimum (Phases 1-4 only)

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 4GB | 8GB+ |
| Disk | 500MB | 2GB |
| CPU | 2 cores | 4+ cores |
| OS | Windows 10 | Windows 11, Mac, Linux |

### Recommended (All Phases)

| Component | Recommended |
|-----------|------------|
| RAM | 8GB+ |
| Disk | 5GB |
| CPU | 4+ cores |
| OS | Windows 11, Mac with M1+, Linux |

---

## 🎓 What to Install When

### Phase 1-4 Development
```
Only need:
✅ Node.js
✅ npm (comes with Node.js)
✅ PostgreSQL or Docker
✅ Redis or Docker
```

No special libraries. All dependencies in package.json.

### Phase 5 Development (Database Optimization)
```
Same as Phase 1-4.
No new dependencies needed.
```

### Phase 6 Development (Load Balancing)
```
Same as Phase 1-4.
No new dependencies needed.
```

### Phase 7 Development (Advanced Features)
```
Includes in package.json:
✅ qrcode - QR code generation
✅ node-cron - Scheduled jobs

Already installed with: npm install
No additional installation needed.
```

---

## 🚀 Quick Start Commands

After installation, here are the essential commands:

```powershell
# Install dependencies (one time)
npm install

# Development mode
npm run dev

# Analytics worker
npm run worker

# Database migrations
npm run migrate

# Docker commands
npm run docker:build      # Build images
npm run docker:up         # Start all services
npm run docker:down       # Stop all services

# Testing
npm run test              # Run tests
npm run test:load         # Load test

# Load testing (if installed)
artillery quick --count 500 -n 50 http://localhost:3000
```

---

## 📚 Access Points After Installation

Once running, access:

| Component | URL | Purpose |
|-----------|-----|---------|
| API | http://localhost:3000 | Main API |
| Health Check | http://localhost:3000/health | Check if running |
| Debug Dashboard | http://localhost:3000/api/debug/dashboard | Performance metrics |
| Nginx (if Docker) | http://localhost:80 | Load balancer |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache |

---

## 📖 After Installation - What to Read

1. **First:** [README.md](README.md) - Project overview
2. **Then:** [QUICKREF.md](QUICKREF.md) - Quick API reference  
3. **Next:** [DEVELOPMENT.md](DEVELOPMENT.md) - Full dev guide
4. **Deep dive:** [PROJECT_STATUS.md](PROJECT_STATUS.md) - Architecture
5. **Advanced:** [PHASE_7_GUIDE.md](PHASE_7_GUIDE.md) - Advanced features

---

## ✅ Installation Complete!

Once you've installed Node.js and Docker (or local PostgreSQL/Redis), you're ready to:

- ✅ Run all Phases 1-7
- ✅ Test all APIs
- ✅ Load test the system
- ✅ Monitor performance
- ✅ Generate analytics
- ✅ Generate QR codes
- ✅ Fetch link previews
- ✅ Run cleanup jobs

**Estimated total installation time:** 20-30 minutes

---

## 🆘 Need Help?

If installation fails:

1. Check `.env` file has correct settings
2. Ensure ports 3000, 5432, 6379 are free
3. Check all services are running:
   - `docker-compose ps` (if using Docker)
   - `redis-cli ping` (for Redis)
   - PostgreSQL service is running

4. Check logs:
   ```powershell
   docker-compose logs -f
   ```

5. Restart everything:
   ```powershell
   npm run docker:down
   npm run docker:up
   ```

---

**Ready to install? Start with Node.js, then follow the checklist above! 🚀**
