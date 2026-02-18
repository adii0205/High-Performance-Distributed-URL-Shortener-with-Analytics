# URL Shortener v2.0 - Quick Start Guide

## 🚀 Getting Started with v2.0

### Prerequisites
- Node.js 18+
- PostgreSQL 15
- Redis 7
- Git

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
# Copy example file
cp .env.example .env

# Edit .env and update:
DATABASE_URL=postgresql://postgres:password@localhost:5432/url_shortener
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key-here
```

### 3. Initialize Database
```bash
npm run migrate
```

This will:
- Create users table (with UUID + password hashing)
- Create urls table (with visibility control)
- Create analytics tables
- Add new indexes for performance

### 4. Start Development Server
```bash
npm run dev
```

Server starts at `http://localhost:3000`

### 5. Explore v2.0 Features

#### 🔐 Register & Login
1. Visit `http://localhost:3000` (will show old v1.0 interface)
2. For new v2.0 interface, visit `http://localhost:3000/index-v2.html`
3. Click "Sign Up" to create an account
4. Login with your credentials

#### 📚 API Documentation
- **Swagger UI**: `http://localhost:3000/api/docs`
  - Try API endpoints directly
  - See request/response examples
  - Auto-generated from code comments

- **GraphQL Playground**: `http://localhost:3000/graphql`
  - Explore schema with introspection
  - Write GraphQL queries
  - Test mutations

#### 📊 Try Features

**Create Short Link**
```bash
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{
    "originalUrl": "https://example.com/very/long/url",
    "title": "My Link",
    "visibility": "public"
  }'
```

**Register User**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure123",
    "username": "myusername"
  }'
```

**Login & Get Token**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure123"
  }'
# Returns: { token: "eyJhbGc...", user: {...} }
```

**Get User Dashboard** (requires token from login)
```bash
curl -X GET http://localhost:3000/api/analytics/dashboard/{userId} \
  -H "Authorization: Bearer {token}"
```

**Get Analytics with Heatmap**
```bash
curl http://localhost:3000/api/analytics/{shortCode}
curl http://localhost:3000/api/analytics/heatmap/{shortCode}
```

#### 🧪 Run Tests
```bash
npm test              # All tests with coverage
npm run test:unit    # Unit tests only
npm run test:integration  # Integration tests
npm run test:watch   # Watch mode (auto-rerun on changes)
```

#### 🐳 Using Docker
```bash
# Build images
npm run docker:build

# Start all services (PostgreSQL, Redis, App, etc.)
npm run docker:up

# Stop services
npm run docker:down

# Check logs
docker-compose logs -f
```

## 📚 Project Structure

```
├── src/
│   ├── index.js                 # Main app (v2.0 updated)
│   ├── middleware/
│   │   ├── auth.js             # JWT authentication (v2.0)
│   │   ├── cachingHeaders.js    # Caching & compression (v2.0)
│   │   └── ...
│   ├── controllers/
│   │   └── userController.js    # User management (v2.0)
│   ├── routes/
│   │   ├── auth.js             # Auth endpoints (v2.0)
│   │   ├── analyticsAdvanced.js # Heatmap & dashboard (v2.0)
│   │   └── ...
│   ├── services/
│   │   ├── realtimeAnalytics.js # Real-time counters (v2.0)
│   │   └── ...
│   ├── config/
│   │   ├── swagger.js          # API docs (v2.0)
│   │   └── graphql.js          # GraphQL schema (v2.0)
│   └── db/
│       └── migrations.js        # Schema (updated v2.0)
├── public/
│   ├── index.html              # v1.0 frontend (still works)
│   ├── index-v2.html           # v2.0 frontend with auth (new)
│   ├── app.js                  # v1.0 logic
│   ├── app-v2.js               # v2.0 logic (new)
│   ├── style.css               # v1.0 styles
│   └── style-v2.css            # v2.0 styles (new)
├── __tests__/                  # Jest tests (v2.0)
│   ├── unit/
│   └── integration/
├── .github/workflows/
│   └── ci-cd.yml               # GitHub Actions (v2.0)
├── .eslintrc.json              # Code linting (v2.0)
├── .prettierrc.json            # Code formatting (v2.0)
├── jest.config.js              # Test config (v2.0)
└── package.json                # v2.0.0
```

## 🔑 Key v2.0 Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get JWT token
- `GET /api/auth/profile` - Get user info (requires token)
- `PUT /api/auth/profile` - Update profile
- `DELETE /api/auth/account` - Delete account

### URLs (v1.0 still works)
- `POST /api/urls` - Create short link
- `GET /api/urls/:shortCode` - Get link details
- `DELETE /api/urls/:shortCode` - Delete link (requires token)

### Analytics (v2.0 Enhanced)
- `GET /api/analytics/:shortCode` - Link analytics
- `GET /api/analytics/dashboard/:userId` - User dashboard
- `GET /api/analytics/heatmap/:shortCode` - Geographic data
- `POST /api/analytics/track` - Track click event

### Documentation
- `GET /api/docs` - Swagger/OpenAPI UI
- `POST /graphql` - GraphQL endpoint

## 🎯 Common Tasks

### Create Your First Short Link
1. Visit `http://localhost:3000/index-v2.html`
2. Sign up for account
3. Paste a long URL
4. Choose visibility (public/private/analytics-only)
5. Click "Create Short Link"
6. View analytics and download QR code

### Switch Between v1.0 and v2.0 UIs
- **v1.0**: `http://localhost:3000` or `/index.html`
- **v2.0**: `/index-v2.html`

Both work side-by-side with same backend!

### View Your Dashboard
1. Login on v2.0 interface
2. See all your links with stats
3. Click "Analytics" on any link
4. View charts, heatmaps, device breakdown

### Use GraphQL API
1. Visit `http://localhost:3000/graphql`
2. Try example query:
```graphql
query {
  topLinks(limit: 5) {
    shortCode
    originalUrl
    clickCount
  }
}
```

### Check Code Quality
```bash
npm run lint      # See linting issues
npm run format    # Auto-format code
npm test          # Run tests + coverage
```

## 🔒 Authentication Flow

1. **Register**: User creates account
   - Email + password + username
   - Password hashed with bcryptjs
   - JWT token returned

2. **Login**: User logs in
   - Email + password
   - Password verified
   - JWT token returned (expires in 7 days)

3. **Protected Requests**:
   - Include `Authorization: Bearer {token}` header
   - Token validated on server
   - User data available in request

4. **Dashboard**: Show user's links
   - Only visible to logged-in user
   - Real-time click stats
   - Privacy settings per link

## 📊 v2.0 Database Schema

### Users (New)
```
id: UUID (primary key)
email: unique email
username: unique username
password_hash: bcrypt hash
is_active: boolean
created_at, updated_at: timestamps
```

### URLs (Updated)
```
id: UUID
user_id: FK to users (nullable for public)
short_code: unique
original_url
visibility: public | analytics-only | private
click_count: integer
... (v1.0 fields preserved)
```

### Indexes Added
- `idx_urls_user_id` - Fast user lookups
- `idx_urls_user_created` - User's links by date
- `idx_analytics_shortcode_timestamp` - Analytics queries
- `idx_analytics_country_short` - Geographic breakdown
- ... 6+ more for performance

## ⚙️ Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/url_shortener
DB_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379

# JWT (v2.0)
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=7d

# Features
ENABLE_REALTIME_ANALYTICS=true
ENABLE_ADVANCED_ANALYTICS=true
ENABLE_GRAPHQL=true
```

## 🧪 Testing Walkthrough

```bash
# 1. Run all tests
npm test

# 2. Run specific test suite
npm run test:unit
npm run test:integration

# 3. Watch tests (auto-rerun)
npm run test:watch

# 4. Check coverage
npm test -- --coverage
```

Coverage report appears in `./coverage/` directory.

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

### Database Connection Error
```bash
# Check PostgreSQL is running
psql -U postgres

# Check REDIS is running
redis-cli ping
```

### Token Expired
- Login again to get new token
- Token expires in 7 days (configurable)
- Set longer expiry in `.env` if needed

### Migration Issues
```bash
# Re-run migrations
npm run migrate

# Check database directly
psql url_shortener
\dt  # List tables
```

## 📖 More Information

- `UPGRADE_V2.md` - Detailed v2.0 features
- `VERSION_2_RELEASE.md` - Complete release notes
- Swagger UI - Interactive API docs at `/api/docs`
- GraphQL Playground - At `/graphql`
- Tests - See `__tests__/` folder for examples

## 🎓 Learning Resources

- [JWT.io](https://jwt.io) - JWT tokens explained
- [GraphQL](https://graphql.org) - GraphQL documentation
- [Redis](https://redis.io) - Redis docs
- [Jest](https://jestjs.io) - Testing framework
- [Swagger](https://swagger.io) - API documentation

## 🚀 Next Steps

1. ✅ Start server: `npm run dev`
2. ✅ Try v2.0 UI: `/index-v2.html`
3. ✅ Create account
4. ✅ Create short links
5. ✅ View analytics dashboard
6. ✅ Check API docs: `/api/docs`
7. ✅ Try GraphQL: `/graphql`
8. ✅ Run tests: `npm test`

Enjoy your upgraded URL Shortener with enterprise features! 🎉
