#!/usr/bin/env python3
"""
generate_carousel.py
Generates a 7-slide photo carousel (1080x1920) optimized for TikTok Photo Mode
and Instagram Carousels.

Slide Structure:
- Slide 1: Review 1 of 5 (Immediate Hook on feed cover: "Can you guess this movie?")
- Slide 2: Review 2 of 5
- Slide 3: Review 3 of 5
- Slide 4: Review 4 of 5
- Slide 5: Review 5 of 5
- Slide 6: The Cliffhanger ("Lock in your guess in the comments! Swipe to reveal 👉")
- Slide 7: The Reveal (High-res poster, Title, Year, guessthemovie.me CTA)
"""

import os
import sys
import json
import argparse
from datetime import datetime
from PIL import Image, ImageDraw

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

from generate_short_video import (
    WIDTH, HEIGHT,
    COLOR_BODY_BG, COLOR_CARD_BG, COLOR_BONEWHITE, COLOR_ORANGE, COLOR_GREEN, COLOR_BLUE, COLOR_MUTED,
    get_font, draw_site_header, draw_status_bar, draw_rich_text, get_rich_text_width,
    create_review_slide, create_reveal_slide,
    load_movie_details, get_movie_number_str
)

def create_cliffhanger_slide(date_str, movie_num_str):
    """Slide 6: Asks user to commit their guess in comments before swiping to answer."""
    img = Image.new("RGB", (WIDTH, HEIGHT), color=COLOR_BODY_BG)
    draw = ImageDraw.Draw(img)
    draw_site_header(img, draw)
    draw_status_bar(draw, 190, date_str, "Final Guess", movie_num_str)

    font_sub = get_font(42)
    font_huge = get_font(72)
    font_call = get_font(48)
    font_swipe = get_font(56)

    # Subtitle
    t1 = "ALL 5 CLUES UNLOCKED"
    bbox1 = draw.textbbox((0, 0), t1, font=font_sub)
    draw.text(((WIDTH - (bbox1[2] - bbox1[0])) // 2, 460), t1, font=font_sub, fill=COLOR_ORANGE)

    # Main question
    t2 = "What's your final guess?"
    bbox2 = draw.textbbox((0, 0), t2, font=font_huge)
    draw.text(((WIDTH - (bbox2[2] - bbox2[0])) // 2, 560), t2, font=font_huge, fill=COLOR_BONEWHITE)

    # Prompt card
    card_w = 940
    card_h = 320
    card_x = (WIDTH - card_w) // 2
    card_y = 740
    draw.rounded_rectangle([(card_x, card_y), (card_x + card_w, card_y + card_h)], radius=24, fill=COLOR_CARD_BG, outline=COLOR_BLUE, width=3)

    c1 = "💬 Drop your guess in the comments"
    c2 = "before you swipe to the reveal!"
    w_c1 = get_rich_text_width(c1, 48)
    draw_rich_text(img, draw, (WIDTH - int(w_c1)) // 2, card_y + 80, c1, 48, COLOR_BONEWHITE)
    bbox_c2 = draw.textbbox((0, 0), c2, font=font_call)
    draw.text(((WIDTH - (bbox_c2[2] - bbox_c2[0])) // 2, card_y + 160), c2, font=font_call, fill=COLOR_MUTED)

    # Swipe CTA
    swipe_text = "Swipe to reveal the answer 👉"
    w_sw = get_rich_text_width(swipe_text, 56)
    draw_rich_text(img, draw, (WIDTH - int(w_sw)) // 2, 1260, swipe_text, 56, COLOR_GREEN)

    return img

def generate_carousel_for_date(date_str, output_dir=None):
    movie_json_path = os.path.join(BASE_DIR, "movies", f"{date_str}.json")
    if not os.path.exists(movie_json_path):
        raise FileNotFoundError(f"Movie file not found for date: {date_str} at {movie_json_path}")

    with open(movie_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    movie_id = data.get("movieID")
    reviews = data.get("reviews", [])
    title, year, poster = load_movie_details(movie_id)
    movie_num_str = get_movie_number_str(date_str)

    if not output_dir:
        output_dir = os.path.join(BASE_DIR, "dist", "carousels", f"{date_str}-{movie_id}")
    os.makedirs(output_dir, exist_ok=True)

    print(f"\n📸 Generating 7-Slide Photo Carousel:")
    print(f"   Film: {title} ({year}) | Date: {date_str} | {movie_num_str}")
    print(f"   Output folder: {output_dir}")

    generated_files = []

    # Slides 1 to 5: REVIEWS 1 TO 5 (Slide 1 is Review 1!)
    for idx, rev in enumerate(reviews[:5], 1):
        slide_img = create_review_slide(
            date_str,
            movie_num_str,
            idx,
            rev,
            total_reviews=5,
            show_intro=(idx == 1),
        )
        filename = f"slide_{idx}_review{idx}.png"
        filepath = os.path.join(output_dir, filename)
        slide_img.save(filepath, "PNG")
        generated_files.append(filepath)
        print(f"   ✓ Slide {idx}: Review {idx} of 5")

    # Slide 6: Cliffhanger / Guess prompt
    slide_6 = create_cliffhanger_slide(date_str, movie_num_str)
    path_6 = os.path.join(output_dir, "slide_6_guess.png")
    slide_6.save(path_6, "PNG")
    generated_files.append(path_6)
    print(f"   ✓ Slide 6: Cliffhanger ('Swipe to reveal 👉')")

    # Slide 7: Reveal
    slide_7 = create_reveal_slide(title, year, poster, date_str, movie_num_str)
    path_7 = os.path.join(output_dir, "slide_7_reveal.png")
    slide_7.save(path_7, "PNG")
    generated_files.append(path_7)
    print(f"   ✓ Slide 7: The Reveal (Poster + guessthemovie.me)")

    print(f"\n🎉 7-slide carousel ready in: {output_dir}")
    return output_dir, generated_files

def main():
    parser = argparse.ArgumentParser(description="Generate 7-slide photo carousel for TikTok and Instagram")
    parser.add_argument("--date", help="Date in YYYY-MM-DD format (default: latest date)")
    parser.add_argument("--output", help="Output directory")
    args = parser.parse_args()

    target_date = args.date
    if not target_date:
        dates_path = os.path.join(BASE_DIR, "dates.json")
        if os.path.exists(dates_path):
            with open(dates_path, "r") as f:
                d = json.load(f)
                target_date = d.get("latestDate", "2026-11-20")
        else:
            target_date = datetime.now().strftime("%Y-%m-%d")

    generate_carousel_for_date(target_date, args.output)

if __name__ == "__main__":
    main()
