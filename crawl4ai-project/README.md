# Crawl4AI Web Crawler

A Python project that uses [Crawl4AI](https://github.com/unclecode/crawl4ai) to asynchronously crawl websites, extract main content, and export clean Markdown.

## Features
- **Async Execution**: Uses `asyncio` for high performance.
- **Robust Scraping**: Powered by `Crawl4AI` (which internally uses Playwright) to handle modern web pages.
- **Clean Markdown Export**: Automatically filters out noise and saves results directly to Markdown files in `output/`.
- **Error Handling**: Graceful error handling and comprehensive logging.

## Requirements
- Python 3.11+
- Git (optional, for cloning)

## Setup Instructions

### 1. Create a Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Install Playwright Browsers
Crawl4AI relies on Playwright. You need to install the necessary browsers:
```bash
python -m playwright install chromium
# Or if needed: python -m patchright install chromium
```

### 4. Run the Crawler
Execute the program from the root directory:
```bash
python -m app.main
```

## Example Usage
```text
$ python -m app.main
Enter URL: https://example.com

Crawling...

Crawl completed successfully.
Saved to: output/example.com.md
```

## Future Extensibility
This project is structured for easy integration into Retrieval-Augmented Generation (RAG) workflows. The architecture can be extended as follows:
```text
URL → Crawl4AI → Markdown → Chunking → Embedding → Vector Database → RAG → LLM
```
In `app/crawler.py`, the `CrawlService` can be extended to yield content chunks or interact with vector databases.
