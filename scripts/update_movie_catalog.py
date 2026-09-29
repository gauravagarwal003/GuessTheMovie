#!/usr/bin/env python3
"""Append films from Letterboxd's monthly popular page to public/movies.csv."""

import csv
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "public" / "movies.csv"
POPULAR_URL = "https://letterboxd.com/films/popular/this/month/"
FILM_SLUG_RE = re.compile(r"/film/([^/?#]+)/?")


class PopularFilmsParser(HTMLParser):
    """Read the film-poster cards embedded in Letterboxd's HTML response."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.films = []
        self.current = None
        self.div_depth = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()

        if tag == "div" and self.current is None and "film-poster" in classes:
            self.current = {
                "slug": attrs.get("data-film-slug") or attrs.get("data-film-link") or "",
                "title": attrs.get("data-film-name") or "",
                "year": attrs.get("data-film-release-year") or "",
                "poster": "",
            }
            self.div_depth = 1
            return

        if self.current is None:
            return

        if tag == "div":
            self.div_depth += 1
        elif tag == "img" and not self.current["poster"]:
            poster = attrs.get("data-src") or attrs.get("data-original") or attrs.get("src") or ""
            if not poster and attrs.get("srcset"):
                poster = attrs["srcset"].split(",", 1)[0].strip().split()[0]
            self.current["poster"] = poster

    def handle_endtag(self, tag):
        if tag != "div" or self.current is None:
            return
        self.div_depth -= 1
        if self.div_depth == 0:
            self.films.append(self.current)
            self.current = None


def fetch_popular_films():
    request = Request(
        POPULAR_URL,
        headers={"User-Agent": "GuessTheMovieCatalog/1.0 (monthly public film catalog refresh)"},
    )
    try:
        with urlopen(request, timeout=30) as response:
            if response.status != 200:
                raise RuntimeError(f"Letterboxd returned HTTP {response.status}")
            html = response.read().decode("utf-8", errors="replace")
    except HTTPError as error:
        if error.code in (403, 429):
            raise RuntimeError(
                f"Letterboxd returned HTTP {error.code}; its anti-bot or rate limit blocked the request. "
                "No catalog changes were made."
            ) from error
        raise RuntimeError(f"Letterboxd returned HTTP {error.code}") from error
    except URLError as error:
        raise RuntimeError(f"Could not reach Letterboxd: {error.reason}") from error

    parser = PopularFilmsParser()
    parser.feed(html)
    parser.close()

    films = []
    for film in parser.films:
        slug_match = FILM_SLUG_RE.search(film["slug"])
        title = film["title"].strip()
        year = film["year"].strip()
        poster_source = film["poster"].strip()
        poster = urljoin(POPULAR_URL, poster_source)
        if not slug_match or not title or not year.isdigit() or not poster_source or not poster.startswith("https://"):
            continue
        films.append({
            "movieID": slug_match.group(1),
            "title": title,
            "year": year,
            "posterLink": poster,
        })

    if not films:
        raise RuntimeError(
            "No usable film cards were found in Letterboxd's response. "
            "The page may have changed or returned a bot challenge; no catalog changes were made."
        )
    return films


def append_missing_films(films):
    if not CSV_PATH.is_file():
        raise RuntimeError(f"Catalog CSV not found: {CSV_PATH}")

    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as catalog:
        reader = csv.DictReader(catalog)
        expected_columns = ["movieID", "title", "year", "posterLink"]
        if reader.fieldnames != expected_columns:
            raise RuntimeError(
                f"Unexpected CSV columns: {reader.fieldnames!r}; expected {expected_columns!r}"
            )
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
            writer = csv.DictWriter(catalog, fieldnames=["movieID", "title", "year", "posterLink"], lineterminator="\n")
            writer.writerows(added)
    return added


def main():
    try:
        films = fetch_popular_films()
        added = append_missing_films(films)
    except (OSError, RuntimeError, ValueError, csv.Error) as error:
        print(f"Catalog update failed: {error}", file=sys.stderr)
        return 1

    print(f"Read {len(films)} films from Letterboxd's monthly popular page.")
    if added:
        print(f"Added {len(added)} new films to {CSV_PATH.relative_to(ROOT)}:")
        for film in added:
            print(f"  {film['title']} ({film['year']}) — {film['movieID']}")
    else:
        print("No new films to add; the catalog is already up to date.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
