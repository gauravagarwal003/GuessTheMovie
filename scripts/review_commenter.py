#!/usr/bin/env python3
"""
review_commenter.py
Generates personalized, friendly comments for each reviewer featured in
a GuessTheMovie puzzle, and provides an interactive workflow to copy to
clipboard and open each review URL directly in your browser.
"""

import os
import sys
import json
import csv
import re
import html
import subprocess
import argparse
import webbrowser
from datetime import datetime

def clean_text(html_content):
    if not html_content:
        return ""
    text = re.sub(r'<[^>]+>', ' ', html_content)
    text = html.unescape(text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def copy_to_clipboard(text):
    """Copies text to macOS clipboard using pbcopy."""
    try:
        process = subprocess.Popen('pbcopy', env={'LANG': 'en_US.UTF-8'}, stdin=subprocess.PIPE)
        process.communicate(text.encode('utf-8'))
        return True
    except Exception:
        return False

def load_movie_details(movie_id):
    csv_path = os.path.join(os.path.dirname(__file__), "..", "public", "movies.csv")
    if not os.path.exists(csv_path):
        return movie_id.replace("-", " ").title(), "Unknown"
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("movieID") == movie_id:
                return row.get("title", ""), row.get("year", "")
    return movie_id.replace("-", " ").title(), "Unknown"

def generate_comments_for_date(date_str):
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    movie_json_path = os.path.join(base_dir, "movies", f"{date_str}.json")
    
    if not os.path.exists(movie_json_path):
        raise FileNotFoundError(f"Movie file not found for date: {date_str} at {movie_json_path}")

    with open(movie_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    movie_id = data.get("movieID")
    reviews = data.get("reviews", [])
    title, year = load_movie_details(movie_id)

    results = []
    for idx, rev in enumerate(reviews, 1):
        username = rev.get("username", "").strip()
        link = rev.get("link", "").strip()
        raw_text = rev.get("text", "")
        text = clean_text(raw_text)
        likes = rev.get("numLikes", "0")
        rating = rev.get("rating", "")

        # Formulate comments
        templates = [
            f"Hey @{username}! Just wanted to let you know your review for {title} is featured as Clue #{idx} in today's daily puzzle at https://guessthemovie.me/ 🎬 Loved your take!",
            f"Your review for {title} made it into today's game on https://guessthemovie.me/! Thank you for the great review 🍿",
            f"Featured your review as one of the clues in today's Guess The Movie challenge (https://guessthemovie.me/)! Brilliant take on {title} 🙌",
        ]

        results.append({
            "clue_number": idx,
            "username": username,
            "link": link,
            "rating": rating,
            "likes": likes,
            "excerpt": (text[:90] + "...") if len(text) > 90 else text,
            "comments": templates,
            "default_comment": templates[0]
        })

    return title, year, results

def main():
    parser = argparse.ArgumentParser(description="Letterboxd Review Commenter & Outreacher for GuessTheMovie")
    parser.add_argument("--date", help="Date in YYYY-MM-DD format (default: latest date)")
    parser.add_argument("--interactive", action="store_true", help="Interactively copy comment and open each review in browser")
    parser.add_argument("--markdown", action="store_true", help="Output a clean markdown checklist")
    args = parser.parse_args()

    target_date = args.date
    if not target_date:
        dates_path = os.path.join(os.path.dirname(__file__), "..", "dates.json")
        if os.path.exists(dates_path):
            with open(dates_path, "r") as f:
                d = json.load(f)
                target_date = d.get("latestDate", "2026-11-20")
        else:
            target_date = datetime.now().strftime("%Y-%m-%d")

    title, year, reviews = generate_comments_for_date(target_date)

    print(f"\n=======================================================")
    print(f"🎬 Movie: {title} ({year}) | Date: {target_date}")
    print(f"=======================================================\n")

    if args.markdown:
        print(f"### Review Outreach for {title} ({year}) - {target_date}\n")
        for item in reviews:
            print(f"- [ ] **Clue #{item['clue_number']} (@{item['username']})**")
            print(f"  - Review: \"{item['excerpt']}\"")
            print(f"  - Link: {item['link']}")
            print(f"  - Comment:\n    > {item['default_comment']}\n")
        return

    if args.interactive:
        print("💡 Interactive Mode Enabled:")
        print("   For each review, the comment will be copied to your clipboard (Cmd+V),")
        print("   and the review page will open in your browser so you can paste and post!\n")

        for item in reviews:
            print("-" * 55)
            print(f"Clue #{item['clue_number']} by @{item['username']} ({item['likes']} likes)")
            print(f"Quote: \"{item['excerpt']}\"")
            print(f"URL: {item['link']}")
            print(f"Comment to paste:")
            print(f"👉 \"{item['default_comment']}\"")
            print("-" * 55)

            copy_to_clipboard(item["default_comment"])
            print("📋 [Copied comment to clipboard!]")

            choice = input("Press [Enter] to open review in browser (or 's' to skip, 'q' to quit): ").strip().lower()
            if choice == 'q':
                print("Exiting.")
                break
            elif choice != 's':
                if item["link"]:
                    webbrowser.open(item["link"])
                else:
                    print("No link available.")
            print()
        print("✨ All reviews finished!")
        return

    # Default: Print all clearly
    for item in reviews:
        print(f"📌 CLUE #{item['clue_number']} - @{item['username']}")
        print(f"   Review quote: \"{item['excerpt']}\"")
        print(f"   Review URL:   {item['link']}")
        print(f"   Comment:      {item['default_comment']}\n")

    print("Tip: Run with `--interactive` to automatically copy each comment to clipboard and open its tab in your browser!")

if __name__ == "__main__":
    main()
