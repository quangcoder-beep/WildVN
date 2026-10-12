#!/bin/bash

API_BASE_URL="${API_BASE_URL:-http://localhost:8081}"

echo "==========================================="
echo " SPRING BOOT API - SMOKE TEST (DỄ & TRUNG BÌNH)"
echo "==========================================="

echo -e "\n1. Checking Actuator Health..."
curl -s "$API_BASE_URL/actuator/health" | jq .

echo -e "\n2. POST /api/species (Create new species)..."
CREATE_RES=$(curl -s -X POST "$API_BASE_URL/api/species" \
  -H "Content-Type: application/json" \
  -d '{"name":"Cá lóc","status":"LC","scientificName":"Channa striata","category":"Cá"}')
echo $CREATE_RES | jq .

# Assuming ID is returned in response
SPECIES_ID=$(echo $CREATE_RES | jq -r '.data.id')

if [ "$SPECIES_ID" != "null" ] && [ -n "$SPECIES_ID" ]; then
  echo -e "\n3. GET /api/species/{id} (Fetch created species)..."
  curl -s "$API_BASE_URL/api/species/$SPECIES_ID" | jq .
fi

echo -e "\n4. Checking Actuator Metrics (http.server.requests)..."
curl -s "$API_BASE_URL/actuator/metrics/http.server.requests" | jq .

echo -e "\n==========================================="
echo " ELASTICSEARCH - SMOKE TEST"
echo "==========================================="
echo -e "\n1. Cluster Health:"
curl -s http://localhost:9200/_cluster/health | jq .

echo -e "\n2. Indices Stats:"
curl -s http://localhost:9200/_cat/indices?v

echo -e "\n==========================================="
echo " KAFKA - SMOKE TEST"
echo "==========================================="
echo "Use the following command if Kafka is in Docker:"
echo "docker exec -it <kafka-container> kafka-topics.sh --list --bootstrap-server localhost:9092"
