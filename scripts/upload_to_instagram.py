#!/usr/bin/env python3
"""
upload_to_instagram.py
Uploads or dispatches carousels or reels to Instagram using:
1. Instagram Graph API (Official Meta API for Carousels & Reels)
2. Buffer API (One-stop publisher for both Instagram & TikTok)
3. Webhook (Make.com / Zapier scenario)
4. Local macOS Helper (Copies caption, reveals images/video in Finder, opens Instagram)
"""

import os
import sys
import json
import time
import argparse
import subprocess
import requests

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def post_via_buffer(media_urls, caption, access_token, profile_ids):
    """
    Publishes simultaneously to Instagram (and/or TikTok) via Buffer's API.
    https://buffer.com/developers/api/updates#updatescreate
    """
    print(f"📡 Publishing via Buffer API to profiles: {profile_ids}...")
    url = "https://api.bufferapp.com/1/updates/create.json"
    
    # media_urls can be a single URL or list
    if isinstance(media_urls, str):
        media_urls = [media_urls]

    data = {
        "access_token": access_token,
        "text": caption,
        "now": "true",
    }
    for idx, pid in enumerate(profile_ids):
        data[f"profile_ids[{idx}]"] = pid
    
    if len(media_urls) == 1 and media_urls[0].endswith(".mp4"):
        data["media[video]"] = media_urls[0]
    else:
        for idx, m_url in enumerate(media_urls):
            data[f"media[photo][{idx}]"] = m_url

    resp = requests.post(url, data=data)
    if resp.status_code != 200:
        raise RuntimeError(f"Buffer API request failed: {resp.text}")

    result = resp.json()
    if not result.get("success"):
        raise RuntimeError(f"Buffer publish error: {result}")

    print("🎉 Successfully published via Buffer!")
    return result

def post_carousel_via_meta_graph(image_urls, caption, ig_user_id, access_token):
    """
    Publishes a multi-photo carousel to Instagram using Meta's Graph API.
    Requirements:
    - Instagram Business / Creator Account
    - Public HTTPS image URLs
    """
    print(f"📡 Creating Instagram Carousel containers for {len(image_urls)} slides...")
    base_url = f"https://graph.facebook.com/v21.0/{ig_user_id}"
    
    # 1. Create individual item containers
    item_container_ids = []
    for idx, img_url in enumerate(image_urls, 1):
        item_res = requests.post(
            f"{base_url}/media",
            data={
                "image_url": img_url,
                "is_carousel_item": "true",
                "access_token": access_token
            }
        )
        if item_res.status_code != 200:
            raise RuntimeError(f"Failed to create carousel item {idx}: {item_res.text}")
        c_id = item_res.json().get("id")
        item_container_ids.append(c_id)
        print(f"   ✓ Item {idx} container created: {c_id}")

    # 2. Create carousel parent container
    print("📡 Creating carousel parent container...")
    carousel_res = requests.post(
        f"{base_url}/media",
        data={
            "media_type": "CAROUSEL",
            "children": ",".join(item_container_ids),
            "caption": caption,
            "access_token": access_token
        }
    )
    if carousel_res.status_code != 200:
        raise RuntimeError(f"Failed to create carousel container: {carousel_res.text}")
    
    creation_id = carousel_res.json().get("id")
    print(f"   ✓ Carousel container ready: {creation_id}")

    # Wait a few seconds for Meta processing
    time.sleep(3)

    # 3. Publish carousel
    print("🚀 Publishing carousel to Instagram feed...")
    pub_res = requests.post(
        f"{base_url}/media_publish",
        data={
            "creation_id": creation_id,
            "access_token": access_token
        }
    )
    if pub_res.status_code != 200:
        raise RuntimeError(f"Failed to publish carousel: {pub_res.text}")

    post_id = pub_res.json().get("id")
    print(f"🎉 Success! Instagram Carousel published (ID: {post_id})")
    return post_id

def post_reel_via_meta_graph(video_url, caption, ig_user_id, access_token):
    """
    Publishes a Reel (9:16 vertical video) to Instagram using Meta's Graph API.
    """
    print("📡 Creating Instagram Reel container...")
    base_url = f"https://graph.facebook.com/v21.0/{ig_user_id}"
    
    res = requests.post(
        f"{base_url}/media",
        data={
            "media_type": "REELS",
            "video_url": video_url,
            "caption": caption,
            "access_token": access_token
        }
    )
    if res.status_code != 200:
        raise RuntimeError(f"Failed to create reel container: {res.text}")
    
    creation_id = res.json().get("id")
    print(f"   ✓ Reel container created: {creation_id}. Waiting for encoding...")

    # Poll status
    for _ in range(30):
        time.sleep(5)
        status_res = requests.get(
            f"https://graph.facebook.com/v21.0/{creation_id}",
            params={"fields": "status_code", "access_token": access_token}
        )
        status = status_res.json().get("status_code")
        if status == "FINISHED":
            break
        elif status == "ERROR":
            raise RuntimeError(f"Reel encoding error: {status_res.text}")
        print(f"   ... status: {status}")

    print("🚀 Publishing Reel...")
    pub_res = requests.post(
        f"{base_url}/media_publish",
        data={
            "creation_id": creation_id,
            "access_token": access_token
        }
    )
    if pub_res.status_code != 200:
        raise RuntimeError(f"Failed to publish reel: {pub_res.text}")

    reel_id = pub_res.json().get("id")
    print(f"🎉 Success! Instagram Reel published (ID: {reel_id})")
    return reel_id

def post_via_webhook(media_path, caption, webhook_url):
    """
    Dispatches media (folder of carousel slides or MP4) to a Make.com / Zapier webhook.
    """
    print(f"📡 Sending media to social scheduler webhook: {webhook_url}")
    if os.path.isdir(media_path):
        # Carousel folder
        files = []
        file_handles = []
        try:
            sorted_files = sorted([f for f in os.listdir(media_path) if f.endswith('.png')])
            for sf in sorted_files:
                fh = open(os.path.join(media_path, sf), "rb")
                file_handles.append(fh)
                files.append(("files", (sf, fh, "image/png")))
            
            resp = requests.post(webhook_url, data={"caption": caption}, files=files)
        finally:
            for fh in file_handles:
                fh.close()
    else:
        # Video file
        with open(media_path, "rb") as f:
            resp = requests.post(webhook_url, data={"caption": caption}, files={"file": f})

    if resp.status_code in [200, 201, 202]:
        print("🎉 Successfully dispatched to scheduler webhook!")
        return True
    else:
        print(f"Webhook response error ({resp.status_code}): {resp.text}")
        return False

def local_macos_helper(media_path, caption):
    """
    Opens Instagram in browser and reveals media files in Finder.
    Copies the caption to clipboard.
    """
    print("\n💡 macOS Local Helper (Instagram):")
    print("   1. Opening Instagram in your default browser...")
    print("   2. Revealing media files in Finder...")
    print("   3. Copied caption to your clipboard (Cmd+V)!")

    # Copy caption to clipboard
    try:
        p = subprocess.Popen('pbcopy', env={'LANG': 'en_US.UTF-8'}, stdin=subprocess.PIPE)
        p.communicate(caption.encode('utf-8'))
    except Exception:
        pass

    # Reveal in Finder
    if os.path.exists(media_path):
        subprocess.run(["open", media_path])

    # Open Instagram
    import webbrowser
    webbrowser.open("https://www.instagram.com/")

def main():
    parser = argparse.ArgumentParser(description="Upload or dispatch media to Instagram")
    parser.add_argument("--media", required=True, help="Path to MP4 file or carousel folder")
    parser.add_argument("--caption", help="Post caption")
    parser.add_argument("--meta-token", help="Meta Graph API access token")
    parser.add_argument("--ig-user-id", help="Instagram Business User ID")
    parser.add_argument("--buffer-token", help="Buffer API access token")
    parser.add_argument("--buffer-profiles", help="Comma-separated Buffer profile IDs")
    parser.add_argument("--webhook", help="Webhook URL (Make.com / Zapier)")
    args = parser.parse_args()

    if not os.path.exists(args.media):
        print(f"❌ Media path not found: {args.media}")
        sys.exit(1)

    caption = args.caption or (
        "Can you guess today's movie from 5 real Letterboxd reviews? 🍿\n"
        "Drop your guess in the comments!\n\n"
        "Play free daily at guessthemovie.me\n\n"
        "#Letterboxd #Movies #MovieTrivia #GuessTheMovie #Film #Cinema #Cinephile"
    )

    buffer_token = args.buffer_token or os.environ.get("BUFFER_ACCESS_TOKEN")
    buffer_profiles = (args.buffer_profiles or os.environ.get("BUFFER_PROFILE_IDS", "")).split(",")
    buffer_profiles = [p.strip() for p in buffer_profiles if p.strip()]

    meta_token = args.meta_token or os.environ.get("INSTAGRAM_ACCESS_TOKEN")
    ig_user_id = args.ig_user_id or os.environ.get("INSTAGRAM_USER_ID")

    webhook = args.webhook or os.environ.get("INSTAGRAM_WEBHOOK_URL") or os.environ.get("SOCIAL_WEBHOOK_URL")

    if buffer_token and buffer_profiles:
        post_via_buffer(args.media, caption, buffer_token, buffer_profiles)
    elif meta_token and ig_user_id:
        # Note: Meta Graph API requires public URLs
        print("ℹ️ Note: Direct Meta Graph API requires public image/video URLs.")
        local_macos_helper(args.media, caption)
    elif webhook:
        post_via_webhook(args.media, caption, webhook)
    else:
        local_macos_helper(args.media, caption)

if __name__ == "__main__":
    main()
