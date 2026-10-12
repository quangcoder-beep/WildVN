cd crawl4ai-project
python3 -m venv .venv
source .venv/bin/activate
# Cài đặt dependency và web browser (Chromium)
pip install -r requirements.txt
python -m playwright install chromium
# Chạy crawler
python -m app.main