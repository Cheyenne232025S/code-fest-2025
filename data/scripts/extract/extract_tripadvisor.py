# data/scripts/extract/extract_tripadvisor.py
import requests
import json
import time
import random
from bs4 import BeautifulSoup
from datetime import datetime
from fake_useragent import UserAgent




def extract_tripadvisor(city="New York", category="Restaurants", pages=3):
    ua = UserAgent()
    base_url = f"https://www.tripadvisor.com/{category}-g60763-{city.replace(' ', '_')}_New_York.html"
    results = []

    for page in range(pages):
        time.sleep(random.uniform(3, 6))
        offset = page * 30  # each page has 30 results
        url = base_url.replace(".html", f"-oa{offset}.html") if page > 0 else base_url
        headers = {'User-Agent': ua.random}
        #proxy = {"http": random.choice(PROXIES), "https": random.choice(PROXIES)}
        # res = requests.get(url, headers=headers, proxies=proxy, timeout=10)
        res = requests.get(url, headers=headers, timeout=10)
        
        if res.status_code != 200:
            print(f"⚠️  Skipping page {page}, status {res.status_code}")
            continue

        soup = BeautifulSoup(res.text, "html.parser")
        cards = soup.select("div.Lwqic")  # restaurant cards

        for card in cards:
            try:
                name = card.select_one(".BMQDV").get_text(strip=True)
                rating_el = card.select_one("svg[aria-label]")
                rating = rating_el['aria-label'].split()[0] if rating_el else None
                price = None
                price_span = card.find("span", string=lambda s: s and "$" in s)
                if price_span:
                    price = price_span.get_text(strip=True)
                link_el = card.select_one("a[href]")
                link = f"https://www.tripadvisor.com{link_el['href']}" if link_el else None

                results.append({
                    "name": name,
                    "rating": rating,
                    "price": price,
                    "url": link,
                    "city": city,
                    "source": "TripAdvisor",
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as e:
                print(f"⚠️ Skipped a card: {e}")

        time.sleep(random.uniform(2.5, 5.0))  # polite delay

    out_path = f"data/raw/tripadvisor_{city.lower().replace(' ', '_')}.json"
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"✅ Extracted {len(results)} results from TripAdvisor for {city}")

    return results


if __name__ == "__main__":
    extract_tripadvisor("New York", "Restaurants", pages=3)
