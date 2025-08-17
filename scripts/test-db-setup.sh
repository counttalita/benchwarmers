#!/bin/bash

# Test Database Setup Script
set -e

echo "🚀 Setting up test database environment..."

# Start test containers
echo "📦 Starting PostgreSQL and Redis test containers..."
docker-compose -f docker-compose.test.yml up -d

# Wait for containers to be healthy
echo "⏳ Waiting for containers to be ready..."
docker-compose -f docker-compose.test.yml exec -T postgres-test pg_isready -U test -d benchwarmers_test
docker-compose -f docker-compose.test.yml exec -T redis-test redis-cli ping

# Set test environment variables
export TEST_DATABASE_URL="postgresql://test:test@localhost:5433/benchwarmers_test"
export TEST_REDIS_URL="redis://localhost:6380"

# Run database migrations for test environment
echo "🔄 Running database migrations..."
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy

# Generate Prisma client for test environment
echo "🔧 Generating Prisma client..."
DATABASE_URL=$TEST_DATABASE_URL npx prisma generate

# Seed test database with sample data
echo "🌱 Seeding test database..."
DATABASE_URL=$TEST_DATABASE_URL npm run db:seed:test

echo "✅ Test database setup complete!"
echo "📊 Test Database URL: $TEST_DATABASE_URL"
echo "🔴 Test Redis URL: $TEST_REDIS_URL"
echo ""
echo "To run integration tests:"
echo "npm run test:integration"
echo ""
echo "To stop test containers:"
echo "docker-compose -f docker-compose.test.yml down"
