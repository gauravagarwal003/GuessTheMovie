"""Small Selenium scraper to fetch poster items from Letterboxd popular films page.

Usage:
  python3 updateMovies.py [--headless]

The script navigates to https://letterboxd.com/films/popular/, waits for elements with
class "posteritem" to appear, then prints the film title and link for each found item.

Requires: selenium, webdriver-manager
"""
from __future__ import annotations

import argparse
import csv
import datetime
import signal
import logging
import shutil
import os
import sys
import time
from typing import List, Dict, Set

from selenium import webdriver
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

try:
	# webdriver-manager helps auto-download the correct chromedriver
	from webdriver_manager.chrome import ChromeDriverManager
except Exception:  # pragma: no cover - optional dependency
	ChromeDriverManager = None


URL = "https://letterboxd.com/films/popular/"


def create_driver(headless: bool = True) -> webdriver.Chrome:
	opts = Options()
	if headless:
		opts.add_argument("--headless=new")
	# Use a common recent Chrome user-agent to reduce bot detection
	opts.add_argument(
		"--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)"
		" Chrome/120.0.0.0 Safari/537.36"
	)
	opts.add_argument("--no-sandbox")
	opts.add_argument("--disable-dev-shm-usage")
	opts.add_argument("--window-size=1200,800")

	if ChromeDriverManager:
		service = Service(ChromeDriverManager().install())
		driver = webdriver.Chrome(service=service, options=opts)
	else:
		# Fallback: rely on user having chromedriver in PATH
		driver = webdriver.Chrome(options=opts)
	return driver


def _safe_get_attribute(elem, name: str) -> str:
	try:
		return elem.get_attribute(name) or ""
	except Exception:
		return ""


def find_posteritems(driver: webdriver.Chrome, page: int = 1, timeout: int = 30) -> List[Dict[str, str]]:
	"""Return list of movies on the given popular page with fields: id, title, year, poster.

	page=1 -> https://letterboxd.com/films/popular/
	page>1 -> https://letterboxd.com/films/popular/page/{page}/
	"""
	page_url = URL if page == 1 else f"{URL}page/{page}/"
	driver.get(page_url)

	try:
		WebDriverWait(driver, timeout).until(
			EC.presence_of_all_elements_located((By.CLASS_NAME, "posteritem"))
		)
	except TimeoutException:
		print(f"Timed out waiting for posteritem elements on {URL}")
		return []

	time.sleep(0.5)
	elems = driver.find_elements(By.CLASS_NAME, "posteritem")
	results: List[Dict[str, str]] = []
	for e in elems:
		href = ""
		try:
			a = e.find_element(By.CSS_SELECTOR, "a")
			href = _safe_get_attribute(a, "href")
		except NoSuchElementException:
			pass

		# derive id from href, e.g. https://letterboxd.com/film/parasite-2019/ -> parasite-2019
		movie_id = ""
		if href:
			try:
				movie_id = href.rstrip("/").split("/")[-1]
			except Exception:
				movie_id = ""

		title = ""
		year = ""
		poster = ""

		try:
			img = e.find_element(By.TAG_NAME, "img")
			poster = _safe_get_attribute(img, "src") or _safe_get_attribute(img, "data-src") or ""
			title_alt = _safe_get_attribute(img, "alt") or ""
			# alt often is like 'Poster for Parasite (2019)'
			if title_alt:
				# remove leading 'Poster for '
				if title_alt.lower().startswith("poster for "):
					title_alt = title_alt[len("poster for "):]
				# try split year in parentheses
				if title_alt.endswith(")") and "(" in title_alt:
					# split last '('
					i = title_alt.rfind("(")
					maybe_title = title_alt[:i].strip()
					maybe_year = title_alt[i + 1 : -1].strip()
					title = maybe_title
					year = maybe_year
				else:
					title = title_alt.strip()
		except NoSuchElementException:
			pass

		# fallback to anchor aria-label
		if not title:
			try:
				a = e.find_element(By.CSS_SELECTOR, "a")
				aria = _safe_get_attribute(a, "aria-label") or ""
				if aria.lower().startswith("poster for "):
					aria = aria[len("poster for "):]
				if aria:
					if aria.endswith(")") and "(" in aria:
						i = aria.rfind("(")
						title = aria[:i].strip()
						year = aria[i + 1 : -1].strip()
					else:
						title = aria.strip()
			except NoSuchElementException:
				pass

		results.append({"id": movie_id, "title": title, "year": year, "poster": poster, "link": href})

	return results


def main(argv: List[str] | None = None) -> int:
	argv = argv or sys.argv[1:]
	parser = argparse.ArgumentParser(description="Scrape Letterboxd popular films (multi-page)")
	parser.add_argument("--no-headless", action="store_true", help="Run browser with visible UI")
	parser.add_argument("--pages", type=int, default=100, help="Number of pages to scan (default: 100)")
	parser.add_argument("--movies-csv", default="public/movies.csv", help="Existing movies CSV to dedupe against and update")
	# --out is deprecated for multi-page mode; we will append directly to --movies-csv
	parser.add_argument("--out", default=None, help="(Deprecated) Temporary output CSV path")
	parser.add_argument("--delay", type=float, default=1.0, help="Delay between page requests in seconds")
	parser.add_argument("--logdir", default="logs", help="Directory to write timestamped logs")
	parser.add_argument("--dry-run", action="store_true", help="Don't modify CSV; just show what would be added")
	args = parser.parse_args(argv)

	headless = not args.no_headless
	pages = args.pages
	movies_csv = args.movies_csv
	out_path = args.out
	delay = float(args.delay)
	logdir = args.logdir
	dry_run = bool(args.dry_run)

	os.makedirs(logdir, exist_ok=True)
	ts = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
	log_path = os.path.join(logdir, f"updateMovies_{ts}.log")
	added_txt = os.path.join(logdir, f"added_movies_{ts}.txt")
	logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", handlers=[logging.FileHandler(log_path), logging.StreamHandler()])

	# read existing movie IDs
	existing_ids: Set[str] = set()
	if os.path.exists(movies_csv):
		try:
			with open(movies_csv, newline="", encoding="utf-8") as fh:
				rdr = csv.DictReader(fh)
				for r in rdr:
					mid = (r.get("movieID") or r.get("id") or "")
					mid = mid.strip().lower()
					if mid:
						existing_ids.add(mid)
			logging.info(f"Loaded %d existing movie IDs from %s", len(existing_ids), movies_csv)
		except Exception as exc:
			logging.warning("Could not read existing movies csv: %s", exc)

	# backup existing movies_csv up-front so we don't lose data if interrupted
	if os.path.exists(movies_csv) and not dry_run:
		bak_path = f"{movies_csv}.{ts}.bak"
		try:
			shutil.copy2(movies_csv, bak_path)
			logging.info("Backed up %s -> %s", movies_csv, bak_path)
		except Exception as exc:
			logging.warning("Failed to create backup %s: %s", bak_path, exc)

	# prepare logs
	# (we do not create a temporary CSV file; we append directly to movies_csv)


	driver = None
	total_added = 0
	try:
		driver = create_driver(headless=headless)
		# open movies_csv for appending incrementally (unless dry-run)
		write_header = not os.path.exists(movies_csv)
		fh = None
		writer = None
		if not dry_run:
			fh = open(movies_csv, "a", newline="", encoding="utf-8")
			writer = csv.writer(fh)
			if write_header:
				writer.writerow(["movieID", "title", "year", "posterLink"])

		# open added-movies txt for recording page where each new movie was found
		added_fh = open(added_txt, "w", encoding="utf-8")
		added_fh.write("page,movieID,title,year\n")

		for p in range(1, pages + 1):
				logging.info("Scraping page %d/%d", p, pages)
				try:
					items = find_posteritems(driver, page=p)
				except WebDriverException as exc:
					logging.warning("WebDriver exception on page %d: %s. Restarting driver.", p, exc)
					try:
						driver.quit()
					except Exception:
						pass
					driver = create_driver(headless=headless)
					# retry once
					try:
						items = find_posteritems(driver, page=p)
					except Exception as exc2:
						logging.error("Failed to load page %d after restart: %s", p, exc2)
						continue

				logging.info("Found %d items on page %d", len(items), p)
				added_this_page = 0
				for it in items:
					movie_id = (it.get("id", "") or "").strip().lower()
					if not movie_id:
						continue
					if movie_id in existing_ids:
						logging.debug("Skipping existing movie %s", movie_id)
						continue
					title = it.get("title", "")
					year = it.get("year", "")
					poster = it.get("poster", "")
					if poster and "-0-70-0-105-" in poster:
						poster_link = poster.replace("-0-70-0-105-", "-0-230-0-345-")
					else:
						poster_link = poster
					if dry_run:
						logging.info("Would add movie %s (%s)", movie_id, title)
						added_this_page += 1
					else:
						writer.writerow([movie_id, title, year, poster_link])
						fh.flush()
						os.fsync(fh.fileno())
						existing_ids.add(movie_id)
						total_added += 1
						added_this_page += 1
						logging.info("Appended new movie %s (%s)", movie_id, title)
						# write an entry to added_movies txt with page info
						added_fh.write(f"{p},{movie_id},{title},{year}\n")
						added_fh.flush()

				logging.info("Page %d done, added %d new movies", p, added_this_page)
				logging.info("Sleeping %.2f seconds before next page", delay)
				time.sleep(delay)

		logging.info("Finished scraping: total new movies added = %d", total_added)
		if dry_run:
			logging.info("Dry-run mode: no files were modified.")
		if fh:
			fh.close()
		if added_fh:
			added_fh.close()

	except Exception as exc:  # pragma: no cover - surface errors to user
		logging.exception("Error running multi-page scraper: %s", exc)
		return 2
	finally:
		if driver:
			try:
				driver.quit()
			except Exception:
				pass

	logging.info("Done. Log written to %s", log_path)
	return 0


if __name__ == "__main__":
	raise SystemExit(main())

