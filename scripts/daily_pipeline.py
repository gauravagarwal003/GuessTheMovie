#!/usr/bin/env python3
"""
daily_pipeline.py
The single master orchestrator that:
1. Detects today's movie
2. Renders the 1080x1920 video (with synchronized audio for YouTube Shorts)
3. Renders the 7-slide photo carousel (for TikTok Photo Mode & Instagram)
4. Posts to YouTube Shorts (automated via YouTube Data API v3)
5. Posts to TikTok (API / Webhook / Buffer / macOS Helper)
6. Posts to Instagram (Buffer / Webhook / Meta Graph API / macOS Helper)
7. Generates Letterboxd reviewer outreach links
"""

import os
import sys
import json
import argparse
import subprocess
from datetime import datetime, timedelta, timezone

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

from generate_short_video import generate_video_for_date, load_movie_details, get_movie_number_str
from generate_carousel import generate_carousel_for_date
from review_commenter import generate_comments_for_date

def run_pipeline(date_str=None, make_carousel=True, make_video=True, 
                 upload_youtube=False, upload_tiktok=False, upload_instagram=False):
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
    print(f"🎬 Daily Media Pipeline: {title} ({year})")
    print(f"   Date: {date_str} | {movie_num}")
    print(f"=======================================================\n")

    # 2. Render Video (with synchronized audio for YouTube Shorts / Reels)
    video_path = None
    if make_video:
        print("▶️ Step 1: Rendering YouTube Shorts Video with AAC Audio (MP4)...")
        video_path = generate_video_for_date(date_str)

    # 3. Render Photo Carousel (for TikTok Photo Mode & Instagram Carousels)
    carousel_dir = None
    if make_carousel:
        print("\n▶️ Step 2: Rendering 7-Slide Photo Carousel (TikTok / Instagram)...")
        carousel_dir, _ = generate_carousel_for_date(date_str)

    # Shared Captions
    yt_title = f"Can you guess {movie_num} from Letterboxd reviews? 🍿 #Shorts"
    yt_desc = (
        f"Can you guess {title} ({year}) from 5 real Letterboxd reviews?\n\n"
        f"Play the daily game completely free at: https://guessthemovie.me/\n"
        f"Over 300+ past games available in the archive!\n\n"
        f"#Letterboxd #Movies #MovieTrivia #GuessTheMovie #Film #Cinema #Shorts"
    )
    social_caption = (
        f"Can you guess {movie_num} from 5 real Letterboxd reviews? 🍿 "
        f"Swipe for clues and drop your guess in the comments! "
        f"Play daily free at guessthemovie.me\n\n"
        f"#Letterboxd #MovieTrivia #GuessTheMovie #Film #Movies #Cinema #Cinephile"
    )

    # 4. Post to YouTube Shorts
    if upload_youtube and video_path:
        print("\n▶️ Step 3: Uploading to YouTube Shorts...")
        try:
            import upload_to_youtube
            client_secrets = os.path.join(os.path.dirname(__file__), "client_secrets.json")
            service = upload_to_youtube.get_authenticated_service(client_secrets)
            tags = ["Letterboxd", "Guess The Movie", "Movie Trivia", "Film", "Cinema", "Shorts"]
            upload_to_youtube.upload_short(service, video_path, yt_title, yt_desc, tags, privacy_status="public")
        except Exception as e:
            print(f"⚠️ YouTube upload error: {e}")

    # Check for Buffer integration (handles both Instagram & TikTok in one go)
    buffer_api_key = os.environ.get("BUFFER_API_KEY") or os.environ.get("BUFFER_ACCESS_TOKEN")
    buffer_channels = [p.strip() for p in os.environ.get("BUFFER_CHANNEL_IDS", "").split(",") if p.strip()]

    if (upload_tiktok or upload_instagram) and buffer_api_key and buffer_channels and carousel_dir:
        print("\n▶️ Step 4 & 5: Dispatching 7-Slide Carousel to Buffer (Instagram & TikTok)...")
        try:
            if os.environ.get("GITHUB_ACTIONS") == "true":
                subprocess.run(["git", "config", "user.name", "github-actions[bot]"], check=True)
                subprocess.run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], check=True)
                subprocess.run(["git", "add", carousel_dir], check=True)
                commit = subprocess.run(
                    ["git", "commit", "-m", f"Add {date_str} social carousel [skip ci]"],
                    capture_output=True,
                    text=True,
                )
                if commit.returncode not in (0, 1):
                    raise RuntimeError(commit.stderr.strip())
                if commit.returncode == 0:
                    subprocess.run(["git", "push"], check=True)

            import upload_to_buffer
            if os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch":
                due_at = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(timespec="seconds").replace("+00:00", "Z")
            else:
                due_at = datetime.strptime(date_str, "%Y-%m-%d").replace(hour=18, minute=0, second=0, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
            upload_to_buffer.post_carousel_to_buffer(
                carousel_dir,
                social_caption,
                buffer_api_key,
                buffer_channels,
                due_at=due_at,
            )
            upload_tiktok = False
            upload_instagram = False
        except Exception as e:
            print(f"⚠️ Buffer dispatch error: {e}. Falling back to individual channels...")

    # 5. Post to TikTok
    if upload_tiktok:
        print("\n▶️ Step 4: Dispatching to TikTok...")
        try:
            import upload_to_tiktok
            target_to_post = carousel_dir if carousel_dir else video_path
            token = os.environ.get("TIKTOK_ACCESS_TOKEN")
            webhook = os.environ.get("TIKTOK_WEBHOOK_URL") or os.environ.get("SOCIAL_WEBHOOK_URL")

            if token and video_path:
                upload_to_tiktok.post_via_tiktok_api(video_path, social_caption, token)
            elif webhook:
                upload_to_tiktok.post_via_webhook(target_to_post, social_caption, webhook)
            else:
                upload_to_tiktok.local_macos_helper(target_to_post, social_caption)
        except Exception as e:
            print(f"⚠️ TikTok dispatch error: {e}")

    # 6. Post to Instagram
    if upload_instagram:
        print("\n▶️ Step 5: Dispatching to Instagram...")
        try:
            import upload_to_instagram
            target_to_post = carousel_dir if carousel_dir else video_path
            webhook = os.environ.get("INSTAGRAM_WEBHOOK_URL") or os.environ.get("SOCIAL_WEBHOOK_URL")

            if webhook:
                upload_to_instagram.post_via_webhook(target_to_post, social_caption, webhook)
            else:
                upload_to_instagram.local_macos_helper(target_to_post, social_caption)
        except Exception as e:
            print(f"⚠️ Instagram dispatch error: {e}")

    # 7. Reviewer Outreach Summary
    print("\n▶️ Step 6: Letterboxd Reviewer Outreach Links:")
    _, _, reviews = generate_comments_for_date(date_str)
    for r in reviews:
        print(f"   - Clue #{r['clue_number']} (@{r['username']}): {r['link']}")

    print(f"\n🎉 Pipeline complete for {date_str}!")
    if video_path:
        print(f"📹 Video: {video_path}")
    if carousel_dir:
        print(f"📸 Carousel: {carousel_dir}\n")
    return True

def main():
    parser = argparse.ArgumentParser(description="Automate daily rendering and posting to YouTube Shorts, TikTok, and Instagram")
    parser.add_argument("--date", help="Date in YYYY-MM-DD format (default: today/latest)")
    parser.add_argument("--video-only", action="store_true", help="Generate only MP4 video")
    parser.add_argument("--carousel-only", action="store_true", help="Generate only Photo Carousel")
    parser.add_argument("--youtube", action="store_true", help="Upload to YouTube Shorts")
    parser.add_argument("--tiktok", action="store_true", help="Dispatch/upload to TikTok")
    parser.add_argument("--instagram", action="store_true", help="Dispatch/upload to Instagram")
    parser.add_argument("--all", action="store_true", help="Render video + carousel and dispatch to YouTube, TikTok, and Instagram")
    args = parser.parse_args()

    make_vid = not args.carousel_only
    make_car = not args.video_only
    upload_yt = args.youtube or args.all
    upload_tt = args.tiktok or args.all
    upload_ig = args.instagram or args.all

    run_pipeline(
        date_str=args.date,
        make_carousel=make_car,
        make_video=make_vid,
        upload_youtube=upload_yt,
        upload_tiktok=upload_tt,
        upload_instagram=upload_ig
    )

if __name__ == "__main__":
    main()
