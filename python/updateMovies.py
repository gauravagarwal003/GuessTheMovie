import requests
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
import time

sleep_time = 2
requestsSession = requests.Session()

for pageNum in range(1, 2):
    link = f"https://letterboxd.com/films/popular/page/{pageNum}/"
    
    # Generate a random User-Agent
    ua = UserAgent()
    headers = {
        "User-Agent": ua.random,
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://letterboxd.com/",
        "DNT": "1",  # Do Not Track header
        "Connection": "keep-alive",
    }

    try:
        response = requestsSession.get(link, headers=headers, timeout=10)
        
        if response.status_code != 200:
            print(f"Failed to retrieve page {pageNum}. Status code: {response.status_code}")
            continue

        # Save HTML for debugging
        with open("movies.html", "w", encoding="utf-8") as f:
            f.write(response.text)

        # Parse the HTML
        soup = BeautifulSoup(response.text, 'html.parser')

        for li in soup.find_all("li", class_="listitem poster-container"):
            react_component = li.find("div", class_="react-component")
            if react_component:
                movie = react_component.get("data-film-slug")
                posterNum = react_component.get("data-film-id")

                # Construct the poster URL
                posterPath = "/".join(list(posterNum))  # e.g., "4/2/6/4/0/6" for 426406
                posterLink = f"https://a.ltrbxd.com/resized/film-poster/{posterPath}/{posterNum}-{movie}-0-230-0-345-crop.jpg"

                # Extract frame-title
                frame_title_tag = li.find("span", class_="frame-title")
                frame_title = frame_title_tag.text if frame_title_tag else "Unknown Title"

                print(movie, posterLink, frame_title)
                quit()
        
        time.sleep(sleep_time)  # Prevent getting blocked

    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
