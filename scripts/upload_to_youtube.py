#!/usr/bin/env python3
"""
upload_to_youtube.py
Uploads a generated vertical video to YouTube Shorts using the official YouTube Data API v3.

Setup:
1. Enable YouTube Data API v3 on Google Cloud Console.
2. Download OAuth 2.0 Client credentials as `client_secrets.json` in this directory (or set GOOGLE_APPLICATION_CREDENTIALS).
3. Run: .venv/bin/pip install google-api-python-client google-auth-oauthlib google-auth-httplib2
4. Run: .venv/bin/python scripts/upload_to_youtube.py --video dist/shorts/2026-11-20-longlegs.mp4
"""

import os
import sys
import argparse
import http.client
import httplib2
import random
import time

try:
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    from googleapiclient.http import MediaFileUpload
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    GOOGLE_LIBS_AVAILABLE = True
except ImportError:
    GOOGLE_LIBS_AVAILABLE = False

SCOPES = ['https://www.googleapis.com/auth/youtube.upload']
API_SERVICE_NAME = 'youtube'
API_VERSION = 'v3'

def get_authenticated_service(client_secrets_file):
    creds = None
    token_file = os.path.join(os.path.dirname(__file__), 'youtube_token.json')

    if os.path.exists(token_file):
        creds = Credentials.from_authorized_user_file(token_file, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(client_secrets_file):
                raise FileNotFoundError(
                    f"client_secrets.json not found at {client_secrets_file}.\n"
                    "Download it from Google Cloud Console (APIs & Services > Credentials > OAuth 2.0 Client IDs)."
                )
            flow = InstalledAppFlow.from_client_secrets_file(client_secrets_file, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_file, 'w') as token:
            token.write(creds.to_json())

    return build(API_SERVICE_NAME, API_VERSION, credentials=creds)

def upload_short(youtube, file_path, title, description, tags, privacy_status="public"):
    body = {
        'snippet': {
            'title': title,
            'description': description,
            'tags': tags,
            'categoryId': '24'  # Entertainment
        },
        'status': {
            'privacyStatus': privacy_status,
            'selfDeclaredMadeForKids': False,
        }
    }

    media = MediaFileUpload(file_path, chunksize=-1, resumable=True, mimetype='video/mp4')
    insert_request = youtube.videos().insert(
        part=','.join(body.keys()),
        body=body,
        media_body=media
    )

    print(f"🚀 Uploading {file_path} to YouTube Shorts ({privacy_status})...")
    response = None
    while response is None:
        status, response = insert_request.next_chunk()
        if status:
            print(f"Uploaded {int(status.progress() * 100)}%...")

    video_id = response.get('id')
    print(f"🎉 Success! Video uploaded: https://www.youtube.com/shorts/{video_id}")
    return video_id

def main():
    parser = argparse.ArgumentParser(description="Upload video to YouTube Shorts")
    parser.add_argument("--video", required=True, help="Path to MP4 video")
    parser.add_argument("--title", help="Short title (default: auto-generated)")
    parser.add_argument("--privacy", default="public", choices=["public", "private", "unlisted"])
    parser.add_argument("--client-secrets", default=os.path.join(os.path.dirname(__file__), "client_secrets.json"))
    args = parser.parse_args()

    if not GOOGLE_LIBS_AVAILABLE:
        print("❌ Missing Google API client libraries.")
        print("Please run:")
        print("  .venv/bin/pip install google-api-python-client google-auth-oauthlib google-auth-httplib2")
        sys.exit(1)

    if not os.path.exists(args.video):
        print(f"❌ Video file does not exist: {args.video}")
        sys.exit(1)

    title = args.title or "Can you guess this movie from Letterboxd reviews? 🍿 #Shorts"
    description = (
        "Can you guess the movie from these chaotic Letterboxd reviews?\n\n"
        "Play today's puzzle completely free at: https://guessthemovie.me/\n"
        "Over 300+ past games available in the archive!\n\n"
        "#Letterboxd #Movies #MovieTrivia #GuessTheMovie #Film #Cinema #Shorts"
    )
    tags = ["Letterboxd", "Guess The Movie", "Movie Trivia", "Film", "Cinema", "Shorts"]

    try:
        service = get_authenticated_service(args.client_secrets)
        upload_short(service, args.video, title, description, tags, args.privacy)
    except Exception as e:
        print(f"Error during upload: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
