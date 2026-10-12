#!/bin/bash

cd /home/laivinhquang/Workspace/project/wildVN/crawl4ai-project
source .venv/bin/activate

echo "==========================================="
echo "1. Đang chạy Crawler để lấy HTML -> Markdown"
echo "==========================================="
python3 -m app.main vietnam_animals_urls.txt

echo "==========================================="
echo "2. Đang chạy AI Parser để trích xuất JSON"
echo "==========================================="
python3 -m app.parse_to_json

echo "==========================================="
echo "3. Đang Seed dữ liệu vào PostgreSQL"
echo "==========================================="
cd /home/laivinhquang/Workspace/project/wildVN/wildvn-client
npx tsx seed_test.ts

echo "==========================================="
echo "Hoàn tất toàn bộ Pipeline!"
echo "==========================================="
