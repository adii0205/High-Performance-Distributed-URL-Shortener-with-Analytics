#!/bin/bash

# Quick Reference Guide - API Testing Script

API_URL="http://localhost:3000"

echo "🧪 Running API Tests...\n"

echo "1️⃣  Testing Health Check"
curl -s "$API_URL/health" | jq .
echo "\n"

echo "2️⃣  Testing Deep Health Check"
curl -s "$API_URL/health/deep" | jq .
echo "\n"

echo "3️⃣ Creating a Short URL"
RESPONSE=$(curl -s -X POST "$API_URL/api/urls" \
  -H "Content-Type: application/json" \
  -d '{
    "originalUrl": "https://www.github.com/torvalds/linux",
    "title": "Linux Kernel",
    "description": "The Linux kernel source code"
  }')

echo "$RESPONSE" | jq .
SHORT_CODE=$(echo "$RESPONSE" | jq -r '.shortCode')

echo "\nGenerated short code: $SHORT_CODE\n"

echo "4️⃣ Creating URL with Custom Alias"
curl -s -X POST "$API_URL/api/urls" \
  -H "Content-Type: application/json" \
  -d '{
    "originalUrl": "https://www.example.com",
    "customAlias": "example",
    "title": "Example Site"
  }' | jq .

echo "\n"

echo "5️⃣ Getting URL Stats"
curl -s "$API_URL/api/urls/$SHORT_CODE/stats" | jq .
echo "\n"

echo "6️⃣ Testing Redirect (should redirect to original URL)"
echo "Request: GET $API_URL/$SHORT_CODE"
echo "Try in browser: $API_URL/$SHORT_CODE\n"

echo "7️⃣ Getting Analytics"
curl -s "$API_URL/api/analytics/$SHORT_CODE" | jq .
echo "\n"

echo "8️⃣ Testing Rate Limiting (create 3 URLs rapidly)"
for i in {1..3}; do
  curl -s -X POST "$API_URL/api/urls" \
    -H "Content-Type: application/json" \
    -d "{\"originalUrl\": \"https://example.com/$i\"}" | jq '.shortCode'
done

echo "\n✅ API Tests Complete!"
