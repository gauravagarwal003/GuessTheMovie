#!/usr/bin/env python3
"""
upload_to_buffer.py
Publishes daily 7-slide carousels to Instagram & TikTok via Buffer GraphQL API
with 'schedulingType: notification' (Reminders).

Features:
- `--setup`: Queries Buffer API and prints your Organization ID & Channel IDs.
- `--carousel <dir>`: Uploads the 7 slides to your Instagram and TikTok Buffer queues as reminders.
"""

import os
import sys
import json
import argparse
import requests

BUFFER_GRAPHQL_URL = "https://api.buffer.com"
GITHUB_RAW_BASE = "https://raw.githubusercontent.com/gauravagarwal003/GuessTheMovie/main"

def query_graphql(api_key, query_str, variables=None):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {"query": query_str}
    if variables:
        payload["variables"] = variables
    
    resp = requests.post(BUFFER_GRAPHQL_URL, headers=headers, json=payload, timeout=15)
    if resp.status_code != 200:
        raise RuntimeError(f"Buffer GraphQL HTTP error ({resp.status_code}): {resp.text}")
    
    res_json = resp.json()
    if "errors" in res_json:
        raise RuntimeError(f"Buffer GraphQL error: {res_json['errors']}")
    return res_json.get("data", {})

def run_setup(api_key):
    """Fetches user organization and connected channel IDs."""
    print("\n🔍 Connecting to Buffer GraphQL API...")
    org_query = """
    query GetOrganizations {
        account {
            organizations {
                id
                name
            }
        }
    }
    """
    data = query_graphql(api_key, org_query)
    orgs = data.get("account", {}).get("organizations", [])
    if not orgs:
        print("❌ No organizations found for this Buffer account.")
        return

    org = orgs[0]
    org_id = org["id"]
    org_name = org.get("name", "Default")
    print(f"✅ Found Organization: {org_name} (ID: {org_id})\n")

    chan_query = """
    query GetChannels($input: ChannelsInput!) {
        channels(input: $input) {
            id
            name
            displayName
            service
        }
    }
    """
    chan_data = query_graphql(api_key, chan_query, {"input": {"organizationId": org_id}})
    channels = chan_data.get("channels", [])
    if not channels:
        print("⚠️ No social channels found. Please connect your Instagram and TikTok in Buffer dashboard first.")
        return

    print("📱 Connected Channels Found:")
    ig_ids = []
    tiktok_ids = []
    all_ids = []
    for c in channels:
        srv = c.get("service", "").lower()
        cid = c.get("id")
        name = c.get("displayName") or c.get("name")
        all_ids.append(cid)
        if "instagram" in srv:
            ig_ids.append(cid)
            print(f"   📷 Instagram: {name} | Channel ID: {cid}")
        elif "tiktok" in srv:
            tiktok_ids.append(cid)
            print(f"   🎵 TikTok: {name} | Channel ID: {cid}")
        else:
            print(f"   🌐 {srv.title()}: {name} | Channel ID: {cid}")

    print("\n-------------------------------------------------------")
    print("📋 Copy these variables into your .env or GitHub Secrets:")
    print(f'BUFFER_API_KEY="{api_key}"')
    print(f'BUFFER_CHANNEL_IDS="{",".join(all_ids)}"')
    print("-------------------------------------------------------\n")

def post_carousel_to_buffer(carousel_dir, caption, api_key, channel_ids, due_at=None):
    """
    Creates a scheduled Reminder post in Buffer for each channel with the 7 slides.
    """
    # 1. Gather sorted slide files
    slide_files = sorted([f for f in os.listdir(carousel_dir) if f.startswith("slide_") and f.endswith(".png")])
    if not slide_files:
        raise FileNotFoundError(f"No slides found in {carousel_dir}")

    folder_name = os.path.basename(os.path.normpath(carousel_dir))
    
    # 2. Build public HTTPS URLs
    assets = []
    for sf in slide_files:
        raw_url = f"{GITHUB_RAW_BASE}/dist/carousels/{folder_name}/{sf}"
        assets.append({"image": {"url": raw_url}})

    print(f"📡 Dispatching 7-Slide Carousel to Buffer ({len(channel_ids)} channels)...")
    for idx, a in enumerate(assets, 1):
        print(f"   Slide {idx}: {a['image']['url']}")

    mutation = """
    mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) {
            ... on PostActionSuccess {
                post {
                    id
                    status
                }
            }
            ... on MutationError {
                message
            }
        }
    }
    """

    successes = 0
    for ch_id in channel_ids:
        variables = {
            "input": {
                "text": caption,
                "channelId": ch_id,
                "schedulingType": "automatic",
                "mode": "customScheduled" if due_at else "addToQueue",
                "assets": assets
            }
        }
        if due_at:
            variables["input"]["dueAt"] = due_at
        try:
            res = query_graphql(api_key, mutation, variables)
            create_res = res.get("createPost", {})
            if "post" in create_res:
                pid = create_res["post"]["id"]
                print(f"   ✅ Scheduled Reminder for channel {ch_id} (Post ID: {pid})")
                successes += 1
            else:
                msg = create_res.get("message", "Unknown error")
                print(f"   ⚠️ Buffer error for channel {ch_id}: {msg}")
                if "personal profile" in msg.lower() or "notification scheduling" in msg.lower():
                    variables["input"]["schedulingType"] = "notification"
                    variables["input"]["mode"] = "addToQueue"
                    variables["input"].pop("dueAt", None)
                    retry = query_graphql(api_key, mutation, variables)
                    retry_res = retry.get("createPost", {})
                    if "post" in retry_res:
                        print(f"   ✅ Instagram notification/reminder created for channel {ch_id} (Post ID: {retry_res['post']['id']})")
                        successes += 1
                    else:
                        print(f"   ⚠️ Buffer notification retry failed for channel {ch_id}: {retry_res.get('message', 'Unknown error')}")
                elif "future" in msg.lower():
                    variables["input"]["mode"] = "addToQueue"
                    variables["input"].pop("dueAt", None)
                    retry = query_graphql(api_key, mutation, variables)
                    retry_res = retry.get("createPost", {})
                    if "post" in retry_res:
                        print(f"   ✅ Added TikTok post to Buffer queue for channel {ch_id} (Post ID: {retry_res['post']['id']})")
                        successes += 1
                    else:
                        print(f"   ⚠️ Buffer queue retry failed for channel {ch_id}: {retry_res.get('message', 'Unknown error')}")
        except Exception as e:
            print(f"   ❌ Failed to schedule for channel {ch_id}: {e}")

    return successes > 0

def main():
    parser = argparse.ArgumentParser(description="Buffer Carousel & Reminder Publisher")
    parser.add_argument("--setup", action="store_true", help="Query Buffer account and show Channel IDs")
    parser.add_argument("--carousel", help="Path to carousel folder with 7 slides")
    parser.add_argument("--caption", help="Post caption")
    parser.add_argument("--api-key", help="Buffer API Developer Key")
    parser.add_argument("--channels", help="Comma-separated channel IDs")
    args = parser.parse_args()

    api_key = args.api_key or os.environ.get("BUFFER_API_KEY") or os.environ.get("BUFFER_ACCESS_TOKEN")
    if not api_key:
        print("❌ Error: Buffer API key required. Pass --api-key or set BUFFER_API_KEY environment variable.")
        sys.exit(1)

    if args.setup:
        run_setup(api_key)
        return

    if not args.carousel or not os.path.exists(args.carousel):
        print("❌ Error: Valid --carousel path required.")
        sys.exit(1)

    channel_ids = (args.channels or os.environ.get("BUFFER_CHANNEL_IDS", "")).split(",")
    channel_ids = [c.strip() for c in channel_ids if c.strip()]
    if not channel_ids:
        print("❌ Error: No channel IDs provided. Run --setup first to see your channel IDs.")
        sys.exit(1)

    caption = args.caption or (
        "Can you guess today's movie from 5 real Letterboxd reviews? 🍿\n"
        "Swipe for clues and drop your guess in the comments!\n\n"
        "Play daily free at guessthemovie.me\n\n"
        "#Letterboxd #MovieTrivia #GuessTheMovie #Film #Cinema #Movies"
    )

    post_carousel_to_buffer(args.carousel, caption, api_key, channel_ids)

if __name__ == "__main__":
    main()
