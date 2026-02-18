#!/bin/bash

echo "🚀 Starting Distributed URL Shortener..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Build images
echo "📦 Building Docker images..."
npm run docker:build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build images"
    exit 1
fi

# Start services
echo "🐳 Starting services..."
npm run docker:up

if [ $? -ne 0 ]; then
    echo "❌ Failed to start services"
    exit 1
fi

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run migrations
echo "📝 Running database migrations..."
docker-compose exec -T app npm run migrate

if [ $? -ne 0 ]; then
    echo "⚠️  Migrations failed, but service may still work"
fi

echo ""
echo "✅ All services started successfully!"
echo ""
echo "📍 Service URLs:"
echo "  - API:      http://localhost:3000"
echo "  - Nginx:    http://localhost:80"
echo "  - Health:   http://localhost:3000/health"
echo ""
echo "📚 Useful commands:"
echo "  - View logs:     docker-compose logs -f"
echo "  - Stop:          npm run docker:down"
echo "  - Create URL:    curl -X POST http://localhost:3000/api/urls -H 'Content-Type: application/json' -d '{\"originalUrl\":\"https://example.com\"}'"
echo ""
