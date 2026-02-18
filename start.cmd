@echo off
REM Windows startup script for Distributed URL Shortener

echo 🚀 Starting Distributed URL Shortener...
echo.

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker is not installed. Please install Docker first.
    exit /b 1
)

REM Check if Docker Compose is installed
where docker-compose >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

REM Build images
echo 📦 Building Docker images...
call npm run docker:build

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to build images
    exit /b 1
)

REM Start services
echo 🐳 Starting services...
call npm run docker:up

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to start services
    exit /b 1
)

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready (10 seconds)...
timeout /t 10

REM Run migrations
echo 📝 Running database migrations...
docker-compose exec -T app npm run migrate

if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Migrations failed, but service may still work
)

echo.
echo ✅ All services started successfully!
echo.
echo 📍 Service URLs:
echo   - API:      http://localhost:3000
echo   - Nginx:    http://localhost:80
echo   - Health:   http://localhost:3000/health
echo.
echo 📚 Useful commands:
echo   - View logs:     docker-compose logs -f
echo   - Stop:          npm run docker:down
echo.
pause
