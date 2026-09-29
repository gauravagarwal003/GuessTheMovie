#!/usr/bin/env python3
"""Append films from Letterboxd's monthly popular page to public/movies.csv."""

import csv
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

import requests
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "public" / "movies.csv"
POPULAR_URL = "https://letterboxd.com/films/popular/this/month/"
FILM_SLUG_RE = re.compile(r"/film/([^/?#]+)/?")
MAX_FILMS = 200
POPULAR_PAGES_TO_FETCH = 3

SESSION_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def paced_get(session, url, referer, delay, ajax=False):
    if delay:
        print(f"Sleeping {delay:g} seconds before request...")
        time.sleep(delay)
    headers = {
        "Referer": referer,
        "Accept-Encoding": "gzip, deflate",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
    }
    if ajax:
        headers.update({
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "text/html, */*; q=0.01",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
        })
    response = session.get(url, headers=headers, timeout=15)
    print(f"GET {url} -> {response.status_code}")
    if response.status_code == 403:
        raise RuntimeError(
            "Letterboxd returned HTTP 403. The session headers and pacing used by "
            "review_selector_app.py were applied, but this request is still blocked."
        )
    response.raise_for_status()
    if "window._cf_chl_opt" in response.text or "Just a moment" in response.text:
        raise RuntimeError(
            "Letterboxd returned a Cloudflare challenge page instead of film data. "
            "The request session, browser headers, and pacing were applied, but the challenge was not passed."
        )
    return response.text


def card_poster(card):
    image = card.find("img")
    if not image:
        return ""
    poster = image.get("data-src") or image.get("data-original") or image.get("src") or ""
    if not poster:
        srcset = image.get("data-srcset") or image.get("srcset") or ""
        if srcset:
            poster = srcset.split(",", 1)[0].strip().split()[0]
    return poster.strip()


def film_cards(html):
    soup = BeautifulSoup(html, "html.parser")
    cards = []
    seen = set()

    # Current Letterboxd browse results use LazyPoster components inside li.posteritem.
    for container in soup.select("li.posteritem"):
        component = container.select_one("[data-item-slug]")
        if not component:
            continue
        movie_id = component.get("data-item-slug", "").strip("/").split("/")[-1]
        if not movie_id or movie_id in seen:
            continue
        seen.add(movie_id)
        cards.append({
            "movieID": movie_id,
            "title": "",
            "year": "",
            "posterLink": "",
            "detailsEndpoint": component.get("data-details-endpoint") or f"/film/{movie_id}/json/",
        })
        if len(cards) >= MAX_FILMS:
            return cards

    if cards:
        return cards

    # Retain support for Letterboxd's older poster-container markup.
    for container in soup.select("li.poster-container"):
        film_div = container.select_one("div.really-lazy-load[data-film-slug]")
        if not film_div:
            film_div = container.select_one("div.film-poster[data-film-slug]")
        if not film_div:
            film_div = container.select_one("[data-film-slug]")
        if not film_div:
            continue

        match = FILM_SLUG_RE.search(film_div.get("data-film-slug", ""))
        if not match:
            continue
        movie_id = match.group(1)
        if movie_id in seen:
            continue
        seen.add(movie_id)
        poster = card_poster(container)

        cards.append({
            "movieID": movie_id,
            "title": (film_div.get("data-film-name") or "").strip(),
            "year": (film_div.get("data-film-release-year") or "").strip(),
            "posterLink": urljoin(POPULAR_URL, poster) if poster else "",
            "detailsEndpoint": f"/film/{movie_id}/json/",
        })
        if len(cards) >= MAX_FILMS:
            break
    return cards


def read_catalog_ids():
    if not CSV_PATH.is_file():
        raise RuntimeError(f"Catalog CSV not found: {CSV_PATH}")
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as catalog:
        reader = csv.DictReader(catalog)
        columns = ["movieID", "title", "year", "posterLink"]
        if reader.fieldnames != columns:
            raise RuntimeError(f"Unexpected CSV columns: {reader.fieldnames!r}; expected {columns!r}")
        return {
            row["movieID"].strip().lower()
            for row in reader
            if row.get("movieID")
        }


def fetch_popular_films():
    session = requests.Session()
    session.headers.update(SESSION_HEADERS)
    films = []
    seen_ids = set()

    page_html = paced_get(session, POPULAR_URL, "https://letterboxd.com/", delay=0.5)
    page = BeautifulSoup(page_html, "html.parser")
    browser_list = page.select_one(".productions-browser-list .js-csi[data-src]")
    if not browser_list:
        raise RuntimeError("Letterboxd's browse page did not expose its film-list endpoint.")

    endpoint = urlsplit(urljoin(POPULAR_URL, browser_list["data-src"]))
    for page_number in range(1, POPULAR_PAGES_TO_FETCH + 1):
        page_path = endpoint.path
        if page_number > 1:
            page_path = f"{page_path.rstrip('/')}/page/{page_number}/"
        list_url = urlunsplit((endpoint.scheme, endpoint.netloc, page_path, endpoint.query, endpoint.fragment))
        page_referer = POPULAR_URL if page_number == 1 else urljoin(POPULAR_URL, f"page/{page_number}/")
        cards_html = paced_get(
            session,
            list_url,
            page_referer,
            delay=2,
            ajax=True,
        )
        page_films = film_cards(cards_html)
        for film in page_films:
            if film["movieID"] not in seen_ids:
                films.append(film)
                seen_ids.add(film["movieID"])
        print(f"Page {page_number}: found {len(page_films)} films.")

    if not films:
        raise RuntimeError(
            "No film cards found on Letterboxd's monthly popular page. "
            "The page markup may have changed or returned a bot challenge."
        )

    existing_ids = read_catalog_ids()
    new_films = []
    for film in films:
        if film["movieID"].lower() in existing_ids:
            continue

        if not film["title"] or not film["year"].isdigit() or not film["posterLink"]:
            detail_url = urljoin(POPULAR_URL, film["detailsEndpoint"])
            detail_text = paced_get(session, detail_url, POPULAR_URL, delay=2, ajax=True)
            try:
                details = json.loads(detail_text)
            except json.JSONDecodeError as error:
                raise RuntimeError(f"Letterboxd returned invalid film metadata for {film['movieID']}.") from error
            film["title"] = film["title"] or str(details.get("name") or "").strip()
            film["year"] = film["year"] or str(details.get("releaseYear") or "").strip()
            poster = details.get("image230") or details.get("image150") or ""
            film["posterLink"] = film["posterLink"] or (urljoin(detail_url, poster) if poster else "")

        if film["title"] and film["year"].isdigit() and film["posterLink"].startswith("https://"):
            new_films.append({key: film[key] for key in ("movieID", "title", "year", "posterLink")})
        else:
            print(f"Skipping {film['movieID']}: incomplete film metadata.")
    return new_films, len(films)


def append_missing_films(films):
    if not CSV_PATH.is_file():
        raise RuntimeError(f"Catalog CSV not found: {CSV_PATH}")

    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as catalog:
        reader = csv.DictReader(catalog)
        columns = ["movieID", "title", "year", "posterLink"]
        if reader.fieldnames != columns:
            raise RuntimeError(f"Unexpected CSV columns: {reader.fieldnames!r}; expected {columns!r}")
        existing_ids = {
            row["movieID"].strip().lower()
            for row in reader
            if row.get("movieID")
        }

    added = []
    seen_ids = set(existing_ids)
    for film in films:
        key = film["movieID"].lower()
        if key not in seen_ids:
            added.append(film)
            seen_ids.add(key)

    if added:
        if CSV_PATH.stat().st_size and not CSV_PATH.read_bytes().endswith((b"\n", b"\r")):
            with CSV_PATH.open("ab") as catalog:
                catalog.write(b"\n")
        with CSV_PATH.open("a", encoding="utf-8", newline="") as catalog:
            writer = csv.DictWriter(
                catalog,
                fieldnames=["movieID", "title", "year", "posterLink"],
                lineterminator="\n",
            )
            writer.writerows(added)
    return added


def main():
    try:
        films, page_film_count = fetch_popular_films()
        added = append_missing_films(films)
    except (OSError, requests.RequestException, RuntimeError, ValueError, csv.Error) as error:
        print(f"Catalog update failed: {error}", file=sys.stderr)
        return 1

    print(
        f"Letterboxd's monthly popular page listed {page_film_count} films; "
        f"{len(films)} were missing from the catalog."
    )
    if added:
        print(f"Added {len(added)} new films to {CSV_PATH.relative_to(ROOT)}:")
        for film in added:
            print(f"  {film['title']} ({film['year']}) — {film['movieID']}")
    else:
        print("No new films to add; the catalog is already up to date.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
