#!/usr/bin/env python3
"""
upload_to_tiktok.py
Uploads or dispatches a video to TikTok using either:
1. TikTok Official Content Posting API (Direct Post)
2. Social Scheduler API (Buffer / Ayrshare / Zapier Webhook)
3. Local macOS Helper (Reveals file in Finder and opens TikTok Creator Center)
"""

import os
import sys
import json
import argparse
import subprocess
import requests

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def post_via_tiktok_api(video_path, caption, access_token):
    """
    Official TikTok Content Posting API v2.
    https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
    """
    print("📡 Initializing TikTok direct post upload...")
    video_size = os.path.getsize(video_path)
    
    init_url = "https://open.tiktokapis.com/v2/post/publish/video/init/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8"
    }
    
    payload = {
        "post_info": {
            "title": caption[:150],
            "privacy_level": "PUBLIC_TO_EVERYONE",
            "disable_duet": False,
            "disable_stitch": False,
            "disable_comment": False,
            "video_cover_timestamp_ms": 1000
        },
        "source_info": {
            "source": "FILE_UPLOAD",
            "video_size": video_size,
            "chunk_size": video_size,
            "total_chunk_count": 1
        }
    }

    resp = requests.post(init_url, headers=headers, json=payload)
    if resp.status_code != 200:
        raise RuntimeError(f"TikTok init failed: {resp.text}")

    data = resp.json().get("data", {})
    upload_url = data.get("upload_url")
    publish_id = data.get("publish_id")

    if not upload_url:
        raise RuntimeError(f"No upload URL returned by TikTok: {resp.text}")

    print("📤 Uploading video binary to TikTok...")
    with open(video_path, "rb") as f:
        video_bytes = f.read()

    upload_headers = {
        "Content-Type": "video/mp4",
        "Content-Range": f"bytes 0-{video_size - 1}/{video_size}"
    }
    upload_resp = requests.put(upload_url, headers=upload_headers, data=video_bytes)
    if upload_resp.status_code not in [200, 201, 206]:
        raise RuntimeError(f"TikTok upload failed: {upload_resp.text}")

    print(f"🎉 Success! Video posted to TikTok (Publish ID: {publish_id})")
    return publish_id

def post_via_webhook(video_path, caption, webhook_url):
    """
    Sends notification or video payload to a Make.com, Zapier, or Buffer webhook.
    """
    print(f"📡 Sending video to social scheduler webhook: {webhook_url}")
    with open(video_path, "rb") as f:
        files = {"file": f}
        data = {"caption": caption}
        resp = requests.post(webhook_url, data=data, files=files)
    if resp.status_code in [200, 201, 202]:
        print("🎉 Successfully dispatched to scheduler webhook!")
        return True
    else:
        print(f"Webhook response error ({resp.status_code}): {resp.text}")
        return False

def local_macos_helper(video_path, caption):
    """
    Opens TikTok Creator Center in browser and reveals video in Finder.
    Copies the caption to clipboard.
    """
    print("\n💡 macOS Local Helper:")
    print("   1. Opening TikTok Creator Center in your browser...")
    print("   2. Revealing video file in Finder...")
    print("   3. Copied caption to your clipboard (Cmd+V)!")

    # Copy caption to clipboard
    try:
        p = subprocess.Popen('pbcopy', env={'LANG': 'en_US.UTF-8'}, stdin=subprocess.PIPE)
        p.communicate(caption.encode('utf-8'))
    except Exception:
        pass

    # Reveal in Finder
    subprocess.run(["open", "-R", video_path])

    # Open TikTok Creator Center
    import webbrowser
    webbrowser.open("https://www.tiktok.com/creator-center/upload")

def main():
    parser = argparse.ArgumentParser(description="Upload or dispatch video to TikTok")
    parser.add_argument("--video", required=True, help="Path to MP4 file")
    parser.add_argument("--caption", help="TikTok caption/title")
    parser.add_argument("--access-token", help="TikTok API access token")
    parser.add_argument("--webhook", help="Webhook URL for social scheduler (Buffer/Zapier/Make)")
    args = parser.parse_args()

    if not os.path.exists(args.video):
        print(f"❌ Video file not found: {args.video}")
        sys.exit(1)

    caption = args.caption or (
        "Can you guess today's movie from real Letterboxd reviews? 🍿 "
        "Play free at guessthemovie.me #Letterboxd #MovieTrivia #GuessTheMovie #Cinema #Movies #Film"
    )

    token = args.access_token or os.environ.get("TIKTOK_ACCESS_TOKEN")
    webhook = args.webhook or os.environ.get("TIKTOK_WEBHOOK_URL")

    if token:
        try:
            post_via_tiktok_api(args.video, caption, token)
        except Exception as e:
            print(f"API upload failed: {e}")
            local_macos_helper(args.video, caption)
    elif webhook:
        post_via_webhook(args.video, caption, webhook)
    else:
        local_macos_helper(args.video, caption)

if __name__ == "__main__":
    main()
