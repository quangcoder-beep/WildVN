import logging
from crawl4ai import AsyncWebCrawler

logger = logging.getLogger(__name__)

class CrawlService:
    async def crawl(self, url: str) -> str:
        """
        Crawls a given URL using Crawl4AI's AsyncWebCrawler.
        Returns the markdown content if successful, otherwise raises an exception.
        """
        logger.info("Starting crawler for: %s", url)
        try:
            async with AsyncWebCrawler(verbose=False) as crawler:
                logger.info("Crawling: %s", url)
                result = await crawler.arun(url=url)
                
                if not result.success:
                    logger.error("Crawl failed: %s", result.error_message)
                    raise Exception(f"Failed to crawl {url}: {result.error_message}")
                
                markdown_content = result.markdown
                if not markdown_content:
                    logger.warning("Crawl returned empty markdown for: %s", url)
                    raise ValueError(f"No markdown content found for {url}")
                
                logger.info("Crawl completed successfully")
                return markdown_content
        except Exception as e:
            logger.error("Exception during crawling: %s", str(e))
            raise
