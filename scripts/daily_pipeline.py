#!/usr/bin/env python3
"""
daily_pipeline.py
The single master orchestrator that:
1. Detects today's movie
2. Renders the 1080x1920 video
3. Posts to YouTube Shorts (automated via YouTube Data API)
4. Posts to TikTok (API / Webhook / 1-click helper)
5. Generates the Letterboxd reviewer outreach links
"""

import os
import sys
import json
import argparse
from datetime import datetime

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Import our helper modules
from generate_short_video import generate_video_for_date, load_movie_details, get_movie_number_str
from review_commenter import generate_comments_for_date

def run_pipeline(date_str=None, upload_youtube=False, upload_tiktok=False):
    # 1. Resolve target date
    if not date_str:
        dates_path = os.path.join(BASE_DIR, "dates.json")
        if os.path.exists(dates_path):
            with open(dates_path, "r", encoding="utf-8") as f:
                d = json.load(f)
                date_str = d.get("latestDate", datetime.now().strftime("%Y-%m-%d"))
        else:
            date_str = datetime.now().strftime("%Y-%m-%d")

    movie_json_path = os.path.join(BASE_DIR, "movies", f"{date_str}.json")
    if not os.path.exists(movie_json_path):
        print(f"❌ Error: Movie data file for {date_str} does not exist at {movie_json_path}")
        return False

    with open(movie_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    movie_id = data.get("movieID")
    title, year, _ = load_movie_details(movie_id)
    movie_num = get_movie_number_str(date_str)

    print(f"\n=======================================================")
    print(f"🎬 Daily Video Pipeline: {title} ({year})")
    print(f"   Date: {date_str} | {movie_num}")
    print(f"=======================================================\n")

    # 2. Render Video
    print("▶️ Step 1: Rendering video...")
    video_path = generate_video_for_date(date_str)

    # 3. Post to YouTube Shorts
    if upload_youtube:
        print("\n▶️ Step 2: Uploading to YouTube Shorts...")
        try:
            import upload_to_youtube
            client_secrets = os.path.join(os.path.dirname(__file__), "client_secrets.json")
            service = upload_to_youtube.get_authenticated_service(client_secrets)
            
            yt_title = f"Can you guess {movie_num} from Letterboxd reviews? 🍿 #Shorts"
            yt_desc = (
                f"Can you guess {title} ({year}) from 5 real Letterboxd reviews?\n\n"
                f"Play the daily game completely free at: https://guessthemovie.me/\n"
                f"Over 300+ past games available in the archive!\n\n"
                f"#Letterboxd #Movies #MovieTrivia #GuessTheMovie #Film #Cinema #Shorts"
            )
            tags = ["Letterboxd", "Guess The Movie", "Movie Trivia", "Film", "Cinema", "Shorts"]
            upload_to_youtube.upload_short(service, video_path, yt_title, yt_desc, tags, privacy_status="public")
        except Exception as e:
            print(f"⚠️ YouTube upload error: {e}")

    # 4. Post to TikTok
    if upload_tiktok:
        print("\n▶️ Step 3: Dispatching to TikTok...")
        try:
            import upload_to_tiktok
            caption = (
                f"Can you guess {movie_num} from 5 real Letterboxd reviews? 🍿 "
                f"Play daily free at guessthemovie.me #Letterboxd #MovieTrivia #GuessTheMovie #Film #Movies"
            )
            token = os.environ.get("TIKTOK_ACCESS_TOKEN")
            webhook = os.environ.get("TIKTOK_WEBHOOK_URL")
            if token:
                upload_to_tiktok.post_via_tiktok_api(video_path, caption, token)
            elif webhook:
                upload_to_tiktok.post_via_webhook(video_path, caption, webhook)
            else:
                upload_to_tiktok.local_macos_helper(video_path, caption)
        except Exception as e:
            print(f"⚠️ TikTok dispatch error: {e}")

    # 5. Reviewer Outreach Summary
    print("\n▶️ Step 4: Letterboxd Reviewer Outreach Links:")
    _, _, reviews = generate_comments_for_date(date_str)
    for r in reviews:
        print(f"   - Clue #{r['clue_number']} (@{r['username']}): {r['link']}")

    print(f"\n🎉 Pipeline complete for {date_str}!")
    print(f"Video file: {video_path}\n")
    return True

def main():
    parser = argparse.ArgumentParser(description="Automate daily rendering and posting to YouTube Shorts and TikTok")
    parser.add_argument("--date", help="Date in YYYY-MM-DD format (default: today/latest)")
    parser.add_argument("--youtube", action="store_true", help="Automatically upload to YouTube Shorts")
    parser.add_argument("--tiktok", action="store_true", help="Dispatch/upload to TikTok")
    parser.add_argument("--all", action="store_true", help="Run rendering and upload to all platforms")
    args = parser.parse_args()

    upload_yt = args.youtube or args.all
    upload_tt = args.tiktok or args.all

    run_pipeline(args.date, upload_youtube=upload_yt, upload_tiktok=upload_tt)

if __name__ == "__main__":
    main()
