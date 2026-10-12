import asyncio
import logging
import os
import re
from urllib.parse import urlparse
from app.crawler import CrawlService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

def sanitize_filename(url: str) -> str:
    """
    Creates a safe filename from the given URL.
    Example: https://example.com/path -> example.com_path.md
    """
    parsed = urlparse(url)
    domain = parsed.netloc
    path = parsed.path.strip("/")
    
    # Combine domain and path
    base = f"{domain}_{path}" if path else domain
    
    # Remove any unsafe characters
    safe_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', base)
    
    # Ensure it ends with .md and not too long
    safe_name = safe_name[:200]
    return f"{safe_name}.md"

async def process_url(crawler_service: CrawlService, url: str, output_dir: str):
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    filename = sanitize_filename(url)
    output_path = os.path.join(output_dir, filename)

    if os.path.exists(output_path):
        logger.info(f"Đã tồn tại file (bỏ qua): {filename}")
        return

    try:
        logger.info(f"Đang crawl: {url}")
        markdown_content = await crawler_service.crawl(url)
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(markdown_content)
            
        logger.info(f"Thành công! Đã lưu: output/{filename}")
    except Exception as e:
        logger.error(f"Lỗi khi crawl {url}: {e}")

async def process_file(crawler_service: CrawlService, filepath: str, output_dir: str):
    logger.info(f"Đang đọc file: {filepath}")
    if not os.path.isfile(filepath):
        logger.error("File không tồn tại!")
        return
        
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    urls = []
    for line in lines:
        line = line.strip()
        # Bỏ qua dòng trống hoặc comment (bắt đầu bằng #)
        if not line or line.startswith("#"):
            continue
        # Bỏ qua comment nằm sau khoảng trắng
        if " #" in line:
            line = line.split(" #")[0].strip()
        urls.append(line)
        
    logger.info(f"Đã tìm thấy {len(urls)} URL hợp lệ.")
    
    for i, url in enumerate(urls, 1):
        logger.info(f"[{i}/{len(urls)}] Xử lý...")
        await process_url(crawler_service, url, output_dir)
        if i < len(urls):
            await asyncio.sleep(2)  # Nghỉ 2 giây để tránh bị chặn IP

import sys

async def main():
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "output")
    os.makedirs(output_dir, exist_ok=True)
    crawler_service = CrawlService()
    
    if len(sys.argv) > 1:
        user_input = sys.argv[1]
        if user_input.endswith(".txt"):
            await process_file(crawler_service, user_input, output_dir)
        else:
            await process_url(crawler_service, user_input, output_dir)
        return

    print("=== Python Web Crawler ===")
    print("Bạn có thể nhập URL hoặc đường dẫn file .txt chứa danh sách URL.")
    print("Nhập 'q' hoặc 'quit' để thoát.")
    
    while True:
        try:
            user_input = input("\nNhập URL hoặc file .txt: ").strip()
        except EOFError:
            break
            
        if user_input.lower() in ('q', 'quit', 'exit'):
            break
            
        if not user_input:
            continue
            
        if user_input.endswith(".txt"):
            await process_file(crawler_service, user_input, output_dir)
        else:
            await process_url(crawler_service, user_input, output_dir)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProcess interrupted by user.")
