import feedparser
import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime, timezone
from groq import Groq
import time

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

SOURCES = [
    {"name": "Economic Times", "url": "https://economictimes.indiatimes.com/rssfeedstopstories.cms", "category": "India Business"},
    {"name": "Business Standard", "url": "https://www.business-standard.com/rss/latest.rss", "category": "India Business"},
    {"name": "Mint", "url": "https://www.livemint.com/rss/news", "category": "India Business"},
    {"name": "Financial Express", "url": "https://www.financialexpress.com/feed/", "category": "India Business"},
    {"name": "The Hindu BusinessLine", "url": "https://www.thehindubusinessline.com/feeder/default.rss", "category": "India Business"},
    {"name": "NDTV Profit", "url": "https://feeds.feedburner.com/ndtvprofit-latest", "category": "India Business"},
    {"name": "MoneyControl", "url": "https://www.moneycontrol.com/rss/latestnews.xml", "category": "India Business"},
    {"name": "Inc42", "url": "https://inc42.com/feed/", "category": "Startups & VC"},
    {"name": "Entrackr", "url": "https://entrackr.com/feed/", "category": "Startups & VC"},
    {"name": "Outlook Business", "url": "https://www.outlookbusiness.com/rss", "category": "Startups & VC"},
    {"name": "PIB", "url": "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3", "category": "Government & Policy"},
    {"name": "RBI", "url": "https://www.rbi.org.in/scripts/rss.aspx", "category": "Government & Policy"},
    {"name": "Reuters Business", "url": "https://feeds.reuters.com/reuters/businessNews", "category": "Global Markets"},
    {"name": "BBC Business", "url": "http://feeds.bbci.co.uk/news/business/rss.xml", "category": "Global Markets"},
    {"name": "MarketWatch", "url": "https://feeds.marketwatch.com/marketwatch/topstories/", "category": "Global Markets"},
    {"name": "CNBC", "url": "https://www.cnbc.com/id/10001147/device/rss/rss.html", "category": "Global Markets"},
    {"name": "AP Business", "url": "https://rsshub.app/apnews/topics/business", "category": "US & Global Economy"},
    {"name": "Fortune", "url": "https://fortune.com/feed/", "category": "US & Global Economy"},
    {"name": "Quartz", "url": "https://qz.com/rss", "category": "US & Global Economy"},
    {"name": "The Guardian Business", "url": "https://www.theguardian.com/business/rss", "category": "US & Global Economy"},
    {"name": "Axios Business", "url": "https://api.axios.com/feed/", "category": "US & Global Economy"},
    {"name": "Business Insider", "url": "https://feeds.businessinsider.com/custom/all", "category": "US & Global Economy"},
    {"name": "IMF Blog", "url": "https://www.imf.org/en/Blogs/rss", "category": "Macro & Research"},
    {"name": "World Bank Blogs", "url": "https://blogs.worldbank.org/rss.xml", "category": "Macro & Research"},
    {"name": "Federal Reserve", "url": "https://www.federalreserve.gov/feeds/press_all.xml", "category": "Macro & Research"},
    {"name": "ECB", "url": "https://www.ecb.europa.eu/rss/press.html", "category": "Macro & Research"},
]

CATEGORIES = [
    "India Business",
    "Startups & VC",
    "Government & Policy",
    "Global Markets",
    "US & Global Economy",
    "Macro & Research",
]

def fetch_feed(source):
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; DailyBriefingBot/1.0)"}
        feed = feedparser.parse(source["url"], request_headers=headers)
        articles = []
        for entry in feed.entries[:5]:
            title = entry.get("title", "").strip()
            link = entry.get("link", "").strip()
            summary = entry.get("summary", entry.get("description", "")).strip()
            if summary:
                soup = BeautifulSoup(summary, "html.parser")
                summary = soup.get_text(separator=" ").strip()
            published = entry.get("published", entry.get("updated", ""))
            if title and link:
                articles.append({
                    "title": title,
                    "link": link,
                    "raw_summary": summary[:1000],
                    "published": published,
                    "source": source["name"],
                    "category": source["category"],
                })
        return articles
    except Exception as e:
        print(f"Error fetching {source['name']}: {e}")
        return []

def summarize_article(article):
    try:
        prompt = f"""You are a business news summarizer for a professional audience.

Article Title: {article['title']}
Source: {article['source']}
Raw Content: {article['raw_summary']}

Write a concise 2-3 sentence summary of this article. Be factual, professional, and specific. No fluff. Do not start with "The article" or "This article". Just write the summary directly."""

        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error summarizing {article['title']}: {e}")
        return article['raw_summary'][:300] if article['raw_summary'] else article['title']

def main():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    print(f"Starting scrape for {today}...")
    all_articles = []
    for source in SOURCES:
        print(f"Fetching {source['name']}...")
        articles = fetch_feed(source)
        all_articles.extend(articles)
        time.sleep(0.5)
    print(f"Fetched {len(all_articles)} articles. Now summarizing...")
    summarized = []
    for i, article in enumerate(all_articles):
        print(f"Summarizing {i+1}/{len(all_articles)}: {article['title'][:60]}...")
        article['summary'] = summarize_article(article)
        summarized.append(article)
        time.sleep(0.3)
    grouped = {cat: [] for cat in CATEGORIES}
    for article in summarized:
        cat = article.get("category", "India Business")
        if cat in grouped:
            grouped[cat].append({
                "title": article["title"],
                "summary": article["summary"],
                "source": article["source"],
                "link": article["link"],
                "published": article["published"],
            })
    output = {
        "date": today,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_articles": len(summarized),
        "categories": grouped,
    }
    os.makedirs("data", exist_ok=True)
    output_path = f"data/{today}.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"Done. Saved to {output_path}")

if __name__ == "__main__":
    main()
