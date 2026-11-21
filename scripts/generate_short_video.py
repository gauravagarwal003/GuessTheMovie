#!/usr/bin/env python3
"""
generate_short_video.py
Turns any GuessTheMovie daily puzzle into a 1080x1920 (9:16) vertical video
that exactly matches the website's visual styling, colors, and branding,
with full native emoji, phonetic extension (superscripts), and unicode symbol support.
"""

import os
import sys
import json
import csv
import re
import html
import math
import tempfile
import subprocess
import argparse
import unicodedata
from datetime import datetime
from urllib.request import urlopen, Request
from PIL import Image, ImageDraw, ImageFont

# Canvas dimensions (9:16)
WIDTH = 1080
HEIGHT = 1920

# Exact CSS Colors from styles.css
COLOR_BODY_BG = (60, 60, 75)          # var(--currentBackground): rgb(60, 60, 75)
COLOR_CARD_BG = (20, 20, 25)          # var(--LBackground): rgb(20, 20, 25)
COLOR_HEADER_BG = (20, 20, 25)        # var(--LBackground)
COLOR_BONEWHITE = (249, 246, 238)     # var(--bonewhite): rgb(249, 246, 238)
COLOR_ORANGE = (239, 135, 51)         # var(--LOrange): #ef8733
COLOR_GREEN = (102, 221, 103)         # var(--LGreen): #66dd67
COLOR_BLUE = (102, 185, 239)          # var(--LBlue): #66b9ef
COLOR_PILL_BG = (30, 48, 65)          # rgba(102, 185, 239, 0.18) on dark
COLOR_MUTED = (165, 170, 185)         # clean muted text for slate bg
COLOR_MUTED_CARD = (150, 150, 150)    # rgb(150, 150, 150) inside dark card

# Countdown Colors: 3 -> Orange, 2 -> Green, 1 -> Blue
COUNTDOWN_COLORS = {
    3: COLOR_ORANGE,
    2: COLOR_GREEN,
    1: COLOR_BLUE
}

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FONT_PATH = os.path.join(BASE_DIR, "scripts", "fonts", "FamiljenGrotesk-Bold.ttf")
EMOJI_FONT_PATH = "/System/Library/Fonts/Apple Color Emoji.ttc"
SUPPORTED_EMOJI_SIZES = [20, 32, 40, 48, 64, 96, 160]

# Regex matching complete emoji grapheme clusters (including skin tones, variation selectors, ZWJ sequences)
EMOJI_PATTERN = re.compile(
    r'(?:'
    r'[\U0001F1E6-\U0001F1FF]{2}|'
    r'[\U0001F300-\U0001FAFF]'
    r'(?:[\U0001F3FB-\U0001F3FF])?'
    r'(?:[\uFE0E\uFE0F])?'
    r'(?:\u200D[\U0001F300-\U0001FAFF](?:[\U0001F3FB-\U0001F3FF])?(?:[\uFE0E\uFE0F])?)*|'
    r'[\u2600-\u27BF\u2B50\u2B55]'
    r'(?:[\uFE0E\uFE0F])?'
    r')'
)

_font_cache = {}

def get_font_cascade(size):
    """
    Returns a list of fonts covering:
    1. Familjen Grotesk Bold (main brand font)
    2. Arial.ttf (supports superscripts, phonetic extensions like ᶜᵃⁿ ᴵ ᵍᵉᵗ ᵘʰʰʰʰ, Latin-ext, IPA, Cyrillic)
    3. Arial Unicode.ttf (supports CJK, Asian scripts, symbols like ･ﾟ✧)
    4. Times New Roman.ttf & Helvetica.ttc (additional math & Latin symbols)
    """
    key = ("cascade", size)
    if key not in _font_cache:
        paths = [
            FONT_PATH,
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
            "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
        cascade = []
        notdefs = []
        for p in paths:
            if os.path.exists(p):
                try:
                    f = ImageFont.truetype(p, size)
                    cascade.append(f)
                    notdefs.append(f.getmask('\uFFFF').size)
                except Exception:
                    continue
        if not cascade:
            f = ImageFont.load_default()
            cascade.append(f)
            notdefs.append(f.getmask('\uFFFF').size)
        _font_cache[key] = (cascade, notdefs)
    return _font_cache[key]

def get_font(size):
    cascade, _ = get_font_cascade(size)
    return cascade[0]

def get_emoji_img(emoji_str, target_size):
    if not os.path.exists(EMOJI_FONT_PATH):
        return None
    cache_key = ("emoji_img", emoji_str, target_size)
    if cache_key in _font_cache:
        return _font_cache[cache_key]

    try:
        nearest_size = min(SUPPORTED_EMOJI_SIZES, key=lambda x: abs(x - target_size))
        f = ImageFont.truetype(EMOJI_FONT_PATH, nearest_size)
        bbox = f.getbbox(emoji_str)
        if not bbox or (bbox[2] - bbox[0] == 0) or (bbox[3] - bbox[1] == 0):
            _font_cache[cache_key] = None
            return None
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        pad = 2
        surf = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
        d = ImageDraw.Draw(surf)
        d.text((pad - bbox[0], pad - bbox[1]), emoji_str, font=f, embedded_color=True)
        scale = target_size / max(surf.width, surf.height)
        new_w = max(1, int(surf.width * scale))
        new_h = max(1, int(surf.height * scale))
        res = surf.resize((new_w, new_h), Image.Resampling.LANCZOS)
        _font_cache[cache_key] = res
        return res
    except Exception:
        _font_cache[cache_key] = None
        return None

def find_font_for_char(ch, cascade, notdefs):
    """
    Finds the first font in the cascade that has a glyph for `ch`.
    Falls back to Unicode NFKC normalization if mathematical/fancy script.
    """
    for f, nd in zip(cascade, notdefs):
        if f.getmask(ch).size != nd:
            return f, ch

    # Try Unicode NFKC normalization (handles mathematical bold/fraktur/script e.g. 𝐣 -> j)
    norm = unicodedata.normalize('NFKC', ch)
    if norm != ch:
        for f, nd in zip(cascade, notdefs):
            if all(f.getmask(c).size != nd for c in norm):
                return f, norm

    # Fallback to second font in cascade (usually Arial.ttf)
    fallback = cascade[1] if len(cascade) > 1 else cascade[0]
    return fallback, ch

def get_rich_text_width(text, font_size):
    cascade, notdefs = get_font_cascade(font_size)
    tokens = EMOJI_PATTERN.split(text)
    emojis = EMOJI_PATTERN.findall(text)
    total_w = 0

    for i in range(len(tokens)):
        chunk = tokens[i]
        if chunk:
            for ch in chunk:
                f, resolved_ch = find_font_for_char(ch, cascade, notdefs)
                total_w += f.getlength(resolved_ch)
        if i < len(emojis):
            total_w += int(font_size * 1.1)
    return total_w

def draw_rich_text(img, draw, x, y, text, font_size, color=COLOR_BONEWHITE):
    """
    Renders text with full native color emoji support, phonetic extensions
    (superscripts/subscripts), and Unicode symbols without missing glyph boxes.
    """
    cascade, notdefs = get_font_cascade(font_size)
    tokens = EMOJI_PATTERN.split(text)
    emojis = EMOJI_PATTERN.findall(text)
    curr_x = x

    for i in range(len(tokens)):
        chunk = tokens[i]
        if chunk:
            for ch in chunk:
                f, resolved_ch = find_font_for_char(ch, cascade, notdefs)
                draw.text((curr_x, y), resolved_ch, font=f, fill=color)
                curr_x += f.getlength(resolved_ch)
        if i < len(emojis):
            emoji_str = emojis[i]
            e_img = get_emoji_img(emoji_str, font_size)
            if e_img:
                img.paste(e_img, (int(curr_x), int(y - 2)), mask=e_img)
                curr_x += e_img.width + 4
            else:
                f, resolved_ch = find_font_for_char(emoji_str[0], cascade, notdefs)
                draw.text((curr_x, y), emoji_str, font=f, fill=color)
                curr_x += f.getlength(emoji_str)
    return curr_x

def clean_text(html_content):
    if not html_content:
        return ""
    text = re.sub(r'<[^>]+>', ' ', html_content)
    text = html.unescape(text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def calculate_review_duration(review_text):
    """
    Calculates display time based on reading length.
    Short reviews (~5-10 words): ~3.0s - 3.5s
    Medium reviews (~20-30 words): ~4.5s - 5.5s
    Long reviews (~50+ words): ~6.0s - 7.0s
    """
    clean = clean_text(review_text)
    words = len(clean.split())
    duration = 2.5 + (words * 0.10)
    return max(3.0, min(7.0, round(duration, 1)))

def wrap_rich_text(text, font_size, max_width):
    words = text.split()
    lines = []
    current_line = []
    for word in words:
        test_line = " ".join(current_line + [word])
        w = get_rich_text_width(test_line, font_size)
        if w <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(" ".join(current_line))
                current_line = [word]
            else:
                lines.append(word)
                current_line = []
    if current_line:
        lines.append(" ".join(current_line))
    return lines

def download_image(url, target_size=None):
    if not url:
        return None
    try:
        fetch_url = url
        if "230-0-345" in url:
            fetch_url = url.replace("230-0-345", "1000-0-1500")

        req = Request(fetch_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urlopen(req, timeout=5) as response:
            img = Image.open(response).convert("RGBA")
            if target_size:
                img = img.resize(target_size, Image.Resampling.LANCZOS)
            return img
    except Exception:
        try:
            req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urlopen(req, timeout=4) as response:
                img = Image.open(response).convert("RGBA")
                if target_size:
                    img = img.resize(target_size, Image.Resampling.LANCZOS)
                return img
        except Exception:
            return None

def make_circular_avatar(img, diameter):
    if not img:
        return None
    img = img.resize((diameter, diameter), Image.Resampling.LANCZOS)
    mask = Image.new('L', (diameter, diameter), 0)
    draw_mask = ImageDraw.Draw(mask)
    draw_mask.ellipse((0, 0, diameter, diameter), fill=255)
    output = Image.new('RGBA', (diameter, diameter), (0, 0, 0, 0))
    output.paste(img, (0, 0), mask=mask)
    return output

# --- Vector Drawing Helpers ---

def draw_star(draw, cx, cy, r_outer, fill):
    r_inner = r_outer * 0.44
    points = []
    for i in range(10):
        r = r_outer if i % 2 == 0 else r_inner
        angle = i * math.pi / 5 - math.pi / 2
        points.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    draw.polygon(points, fill=fill)

def draw_heart(draw, cx, cy, size, fill):
    w = size
    h = size
    r = w / 4
    draw.ellipse([cx - w/2, cy - h/2, cx, cy], fill=fill)
    draw.ellipse([cx, cy - h/2, cx + w/2, cy], fill=fill)
    draw.polygon([(cx - w/2, cy - r/2), (cx + w/2, cy - r/2), (cx, cy + h/2)], fill=fill)

def draw_comment_icon(draw, cx, cy, size, fill):
    w = size
    h = int(size * 0.75)
    x1 = cx - w // 2
    y1 = cy - h // 2
    draw.rounded_rectangle([(x1, y1), (x1 + w, y1 + h)], radius=6, fill=fill)
    draw.polygon([(x1 + 4, y1 + h - 2), (x1 + 14, y1 + h - 2), (x1 + 4, y1 + h + 8)], fill=fill)

def draw_film_icon(draw, cx, cy, size, fill):
    w = size
    h = int(size * 0.78)
    x1 = cx - w // 2
    y1 = cy - h // 2
    draw.rounded_rectangle([(x1, y1), (x1 + w, y1 + h)], radius=4, outline=fill, width=3)
    for hx in [x1 + 4, x1 + w - 8]:
        for hy in [y1 + 4, y1 + h - 8]:
            draw.rectangle([(hx, hy), (hx + 4, hy + 4)], fill=fill)

# --- Site Header & Status Bar ---

def draw_site_header(img, draw):
    header_h = 160
    draw.rectangle([(0, 0), (WIDTH, header_h)], fill=COLOR_HEADER_BG)

    logo_path = os.path.join(BASE_DIR, "public", "images", "logo_and_text.png")
    if os.path.exists(logo_path):
        logo_img = Image.open(logo_path).convert("RGBA")
        target_h = 95
        aspect = logo_img.width / logo_img.height
        target_w = int(target_h * aspect)
        logo_resized = logo_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        logo_x = (WIDTH - target_w) // 2
        logo_y = 32
        img.paste(logo_resized, (logo_x, logo_y), mask=logo_resized)
    else:
        font_logo = get_font(48)
        text = "GUESS THE MOVIE"
        bbox = draw.textbbox((0, 0), text, font=font_logo)
        w = bbox[2] - bbox[0]
        draw.text(((WIDTH - w) // 2, 45), text, font=font_logo, fill=COLOR_BONEWHITE)

def draw_status_bar(draw, y_top, date_str, right_pill_text, movie_num_str):
    status_w = 940
    status_x = (WIDTH - status_w) // 2
    bar_h = 50
    center_y = y_top + bar_h // 2

    font_status = get_font(32)
    font_pill = get_font(26)

    # 1. Left: Film icon + Movie #X (perfect vertical alignment)
    icon_size = 28
    icon_cx = status_x + icon_size // 2 + 10
    draw_film_icon(draw, icon_cx, center_y, icon_size, COLOR_ORANGE)

    text_x = icon_cx + icon_size // 2 + 14
    bbox_m = draw.textbbox((0, 0), movie_num_str, font=font_status)
    text_y = center_y - (bbox_m[3] + bbox_m[1]) / 2
    draw.text((text_x, text_y), movie_num_str, font=font_status, fill=COLOR_ORANGE)

    # 2. Center: Formatted Date
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        formatted_date = dt.strftime("%B %d, %Y")
    except Exception:
        formatted_date = date_str

    bbox_date = draw.textbbox((0, 0), formatted_date, font=font_status)
    w_date = bbox_date[2] - bbox_date[0]
    date_y = center_y - (bbox_date[3] + bbox_date[1]) / 2
    draw.text(((WIDTH - w_date) // 2, date_y), formatted_date, font=font_status, fill=COLOR_BONEWHITE)

    # 3. Right: Pill text
    if right_pill_text:
        bbox_pill = draw.textbbox((0, 0), right_pill_text, font=font_pill)
        pw = (bbox_pill[2] - bbox_pill[0]) + 30
        ph = 42
        px = status_x + status_w - pw
        py = center_y - ph // 2
        draw.rounded_rectangle([(px, py), (px + pw, py + ph)], radius=8, fill=COLOR_PILL_BG)

        pill_text_y = center_y - (bbox_pill[3] + bbox_pill[1]) / 2
        draw.text((px + 15, pill_text_y), right_pill_text, font=font_pill, fill=COLOR_BLUE)

# --- Slides ---

def create_intro_frame(date_str, movie_num_str, countdown_val):
    """Intro frame on light gray background with countdown in Orange, Green, Blue."""
    img = Image.new("RGB", (WIDTH, HEIGHT), color=COLOR_BODY_BG)
    draw = ImageDraw.Draw(img)
    draw_site_header(img, draw)
    draw_status_bar(draw, 190, date_str, "5 Reviews", movie_num_str)

    font_sub = get_font(42)
    font_huge = get_font(74)
    font_desc = get_font(40)
    font_cnt_label = get_font(36)
    font_number = get_font(180)

    # Subtitle
    t1 = "DAILY FILM CHALLENGE"
    bbox1 = draw.textbbox((0, 0), t1, font=font_sub)
    draw.text(((WIDTH - (bbox1[2] - bbox1[0])) // 2, 420), t1, font=font_sub, fill=COLOR_ORANGE)

    # Main Heading
    t2 = "Can you guess"
    t3 = "today's movie?"
    bbox2 = draw.textbbox((0, 0), t2, font=font_huge)
    draw.text(((WIDTH - (bbox2[2] - bbox2[0])) // 2, 510), t2, font=font_huge, fill=COLOR_BONEWHITE)
    bbox3 = draw.textbbox((0, 0), t3, font=font_huge)
    draw.text(((WIDTH - (bbox3[2] - bbox3[0])) // 2, 610), t3, font=font_huge, fill=COLOR_BONEWHITE)

    # Description
    desc = "5 Real Letterboxd Reviews"
    bbox_d = draw.textbbox((0, 0), desc, font=font_desc)
    draw.text(((WIDTH - (bbox_d[2] - bbox_d[0])) // 2, 750), desc, font=font_desc, fill=COLOR_MUTED)

    # Animated Countdown section: 3 -> Orange, 2 -> Green, 1 -> Blue
    c_label = "CLUE #1 STARTS IN"
    bbox_cl = draw.textbbox((0, 0), c_label, font=font_cnt_label)
    draw.text(((WIDTH - (bbox_cl[2] - bbox_cl[0])) // 2, 1000), c_label, font=font_cnt_label, fill=COLOR_MUTED)

    num_color = COUNTDOWN_COLORS.get(countdown_val, COLOR_ORANGE)
    num_str = str(countdown_val)
    bbox_n = draw.textbbox((0, 0), num_str, font=font_number)
    num_x = (WIDTH - (bbox_n[2] - bbox_n[0])) // 2
    draw.text((num_x, 1080), num_str, font=font_number, fill=num_color)

    return img

def create_review_slide(date_str, movie_num_str, review_index, review_data, total_reviews=5):
    """Review card slide matching styles.css with full rich emoji & phonetic/superscript support."""
    img = Image.new("RGB", (WIDTH, HEIGHT), color=COLOR_BODY_BG)
    draw = ImageDraw.Draw(img)
    draw_site_header(img, draw)

    pill_text = f"Review {review_index} of {total_reviews}"
    draw_status_bar(draw, 190, date_str, pill_text, movie_num_str)

    card_w = 940
    card_h = 1380
    card_x = (WIDTH - card_w) // 2
    card_y = 280

    draw.rounded_rectangle([(card_x, card_y), (card_x + card_w, card_y + card_h)], radius=24, fill=COLOR_CARD_BG)

    # Header inside Review Card
    header_pad = 44
    header_y = card_y + header_pad
    avatar_size = 90

    # Profile Avatar
    avatar_raw = download_image(review_data.get("profilePhotoLink"), target_size=(avatar_size, avatar_size))
    avatar = make_circular_avatar(avatar_raw, avatar_size)
    if avatar:
        img.paste(avatar, (card_x + header_pad, header_y), mask=avatar)
    else:
        draw.ellipse([(card_x + header_pad, header_y), (card_x + header_pad + avatar_size, header_y + avatar_size)], fill=(50, 50, 65))
        init_font = get_font(42)
        initial = (review_data.get("username", "U")[:1]).upper()
        draw.text((card_x + header_pad + 30, header_y + 18), initial, font=init_font, fill=COLOR_BONEWHITE)

    font_date = get_font(26)
    uname = review_data.get("username", "Letterboxd User")
    date_reviewed = review_data.get("date", "")

    # Draw username with rich emoji & unicode cascade!
    draw_rich_text(img, draw, card_x + header_pad + avatar_size + 24, header_y + 4, uname, 38, COLOR_BONEWHITE)
    draw.text((card_x + header_pad + avatar_size + 24, header_y + 50), date_reviewed, font=font_date, fill=COLOR_MUTED_CARD)

    # Rating & Liked Heart
    rating_val = 0.0
    try:
        rating_str = str(review_data.get("rating", "")).strip()
        if rating_str:
            rating_val = float(rating_str)
    except Exception:
        rating_val = 0.0

    star_x_end = card_x + card_w - header_pad
    star_y = header_y + 22
    star_radius = 16
    star_spacing = 38

    if rating_val > 0:
        full_stars = int(rating_val)
        has_half = (rating_val % 1) >= 0.5
        total_drawn = full_stars + (1 if has_half else 0)

        for s_idx in range(total_drawn):
            curr_x = star_x_end - (total_drawn - 1 - s_idx) * star_spacing
            draw_star(draw, curr_x, star_y, star_radius, COLOR_GREEN)

    if review_data.get("liked", False):
        heart_y = star_y + 42
        draw_heart(draw, star_x_end - 6, heart_y, 24, COLOR_ORANGE)

    # Separator Line
    draw.line([(card_x + header_pad, card_y + 160), (card_x + card_w - header_pad, card_y + 160)], fill=(38, 38, 48), width=2)

    # Review Text
    raw_review = review_data.get("text", "")
    review_text = clean_text(raw_review)

    if len(review_text) > 350:
        f_size = 40
        l_height = 58
    elif len(review_text) > 200:
        f_size = 46
        l_height = 66
    elif len(review_text) > 100:
        f_size = 52
        l_height = 76
    else:
        f_size = 58
        l_height = 86

    wrapped_lines = wrap_rich_text(review_text, f_size, card_w - (header_pad * 2) - 20)

    text_area_h = card_h - 180 - 130
    total_lines_h = len(wrapped_lines) * l_height
    start_text_y = card_y + 180 + max(30, (text_area_h - total_lines_h) // 2)

    for line in wrapped_lines[:12]:
        draw_rich_text(img, draw, card_x + header_pad + 10, start_text_y, line, f_size, COLOR_BONEWHITE)
        start_text_y += l_height

    # Footer inside Card (Strictly aligned icons and numbers)
    footer_sep_y = card_y + card_h - 100
    draw.line([(card_x + header_pad, footer_sep_y), (card_x + card_w - header_pad, footer_sep_y)], fill=(38, 38, 48), width=2)

    footer_center_y = footer_sep_y + 50
    likes_num = str(review_data.get("numLikes", "0"))
    comments_num = str(review_data.get("num_comments", "0"))

    font_meta = get_font(30)

    heart_size = 24
    heart_cx = card_x + header_pad + heart_size // 2 + 6
    draw_heart(draw, heart_cx, footer_center_y, heart_size, COLOR_MUTED_CARD)

    likes_x = heart_cx + heart_size // 2 + 14
    bbox_l = draw.textbbox((0, 0), likes_num, font=font_meta)
    likes_y = footer_center_y - (bbox_l[3] + bbox_l[1]) / 2
    draw.text((likes_x, likes_y), likes_num, font=font_meta, fill=COLOR_MUTED_CARD)

    comm_x_start = likes_x + (bbox_l[2] - bbox_l[0]) + 50
    comm_size = 24
    comm_cx = comm_x_start + comm_size // 2
    draw_comment_icon(draw, comm_cx, footer_center_y, comm_size, COLOR_MUTED_CARD)

    comm_text_x = comm_cx + comm_size // 2 + 14
    bbox_c = draw.textbbox((0, 0), comments_num, font=font_meta)
    comm_text_y = footer_center_y - (bbox_c[3] + bbox_c[1]) / 2
    draw.text((comm_text_x, comm_text_y), comments_num, font=font_meta, fill=COLOR_MUTED_CARD)

    return img

def create_countdown_frame(date_str, movie_num_str, countdown_val):
    """Countdown frame in Orange, Green, Blue on clean slate background."""
    img = Image.new("RGB", (WIDTH, HEIGHT), color=COLOR_BODY_BG)
    draw = ImageDraw.Draw(img)
    draw_site_header(img, draw)
    draw_status_bar(draw, 190, date_str, "Guess Now", movie_num_str)

    font_title = get_font(52)
    font_desc = get_font(42)
    font_number = get_font(220)

    t1 = "Lock in your guess in the comments!"
    bbox1 = draw.textbbox((0, 0), t1, font=font_title)
    draw.text(((WIDTH - (bbox1[2] - bbox1[0])) // 2, 540), t1, font=font_title, fill=COLOR_BONEWHITE)

    revealing = "REVEALING IN"
    bbox_rev = draw.textbbox((0, 0), revealing, font=font_desc)
    draw.text(((WIDTH - (bbox_rev[2] - bbox_rev[0])) // 2, 680), revealing, font=font_desc, fill=COLOR_MUTED)

    num_color = COUNTDOWN_COLORS.get(countdown_val, COLOR_ORANGE)
    num_str = str(countdown_val)
    bbox_n = draw.textbbox((0, 0), num_str, font=font_number)
    num_x = (WIDTH - (bbox_n[2] - bbox_n[0])) // 2
    draw.text((num_x, 800), num_str, font=font_number, fill=num_color)

    return img

def create_reveal_slide(title, year, poster_url, date_str, movie_num_str):
    """
    Reveal slide with the movie poster filling the space properly at 640x960,
    no dark card background, and a prominent website link.
    """
    img = Image.new("RGB", (WIDTH, HEIGHT), color=COLOR_BODY_BG)
    draw = ImageDraw.Draw(img)
    draw_site_header(img, draw)
    draw_status_bar(draw, 190, date_str, "Movie Revealed", movie_num_str)

    poster_w, poster_h = 640, 960
    poster_x = (WIDTH - poster_w) // 2
    poster_y = 260

    poster_img = download_image(poster_url, target_size=(poster_w, poster_h))
    if poster_img:
        mask = Image.new('L', (poster_w, poster_h), 0)
        draw_mask = ImageDraw.Draw(mask)
        draw_mask.rounded_rectangle([(0, 0), (poster_w, poster_h)], radius=20, fill=255)
        img.paste(poster_img, (poster_x, poster_y), mask=mask)
    else:
        draw.rounded_rectangle([(poster_x, poster_y), (poster_x + poster_w, poster_y + poster_h)], radius=20, fill=(35, 35, 45))

    font_movie = get_font(60)
    font_year = get_font(44)

    title_text = f"{title}"
    bbox_t = draw.textbbox((0, 0), title_text, font=font_movie)
    draw.text(((WIDTH - (bbox_t[2] - bbox_t[0])) // 2, 1250), title_text, font=font_movie, fill=COLOR_BONEWHITE)

    year_text = f"({year})"
    bbox_y = draw.textbbox((0, 0), year_text, font=font_year)
    draw.text(((WIDTH - (bbox_y[2] - bbox_y[0])) // 2, 1325), year_text, font=font_year, fill=COLOR_ORANGE)

    cta_w = 960
    cta_h = 220
    cta_x = (WIDTH - cta_w) // 2
    cta_y = 1420

    draw.rounded_rectangle([(cta_x, cta_y), (cta_x + cta_w, cta_y + cta_h)], radius=24, fill=COLOR_CARD_BG, outline=COLOR_GREEN, width=4)

    font_sub_cta = get_font(32)
    font_url = get_font(64)
    font_archive = get_font(30)

    l1 = "PLAY TODAY'S MOVIE FREE AT"
    bbox_l1 = draw.textbbox((0, 0), l1, font=font_sub_cta)
    draw.text(((WIDTH - (bbox_l1[2] - bbox_l1[0])) // 2, cta_y + 25), l1, font=font_sub_cta, fill=COLOR_MUTED)

    url_str = "guessthemovie.me"
    bbox_url = draw.textbbox((0, 0), url_str, font=font_url)
    draw.text(((WIDTH - (bbox_url[2] - bbox_url[0])) // 2, cta_y + 78), url_str, font=font_url, fill=COLOR_BONEWHITE)

    l3 = "300+ Archive Games Available!"
    bbox_l3 = draw.textbbox((0, 0), l3, font=font_archive)
    draw.text(((WIDTH - (bbox_l3[2] - bbox_l3[0])) // 2, cta_y + 160), l3, font=font_archive, fill=COLOR_GREEN)

    return img

def get_movie_number_str(date_str):
    dates_path = os.path.join(BASE_DIR, "dates.json")
    if os.path.exists(dates_path):
        try:
            with open(dates_path, "r", encoding="utf-8") as f:
                d = json.load(f)
                dates = d.get("dates", [])
                if date_str in dates:
                    return f"Movie #{dates.index(date_str) + 1}"
        except Exception:
            pass
    return "Movie"

def load_movie_details(movie_id):
    csv_path = os.path.join(BASE_DIR, "public", "movies.csv")
    if not os.path.exists(csv_path):
        return movie_id.replace("-", " ").title(), "Unknown", ""
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("movieID") == movie_id:
                return row.get("title", ""), row.get("year", ""), row.get("posterLink", "")
    return movie_id.replace("-", " ").title(), "Unknown", ""

def generate_video_for_date(date_str, output_path=None):
    movie_json_path = os.path.join(BASE_DIR, "movies", f"{date_str}.json")
    if not os.path.exists(movie_json_path):
        raise FileNotFoundError(f"Movie file not found for date: {date_str} at {movie_json_path}")

    with open(movie_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    movie_id = data.get("movieID")
    reviews = data.get("reviews", [])
    title, year, poster = load_movie_details(movie_id)
    movie_num_str = get_movie_number_str(date_str)

    print(f"🎬 Generating Short Video for: {title} ({year})")
    print(f"   {movie_num_str} | Date: {date_str} | Reviews: {len(reviews[:5])}")

    if not output_path:
        out_dir = os.path.join(BASE_DIR, "dist", "shorts")
        os.makedirs(out_dir, exist_ok=True)
        output_path = os.path.join(out_dir, f"{date_str}-{movie_id}.mp4")

    with tempfile.TemporaryDirectory() as tmpdir:
        slides = []

        # 1. Intro Countdown (3 -> 2 -> 1, 1.0s each: Orange -> Green -> Blue)
        for cnt in [3, 2, 1]:
            f_img = create_intro_frame(date_str, movie_num_str, cnt)
            p = os.path.join(tmpdir, f"intro_{cnt}.png")
            f_img.save(p)
            slides.append((p, 1.0))

        # 2. All 5 Reviews with Dynamic Durations based on length
        print("   Review Pacing:")
        for idx, rev in enumerate(reviews[:5], 1):
            clue_img = create_review_slide(date_str, movie_num_str, idx, rev, total_reviews=5)
            p = os.path.join(tmpdir, f"slide_{idx}.png")
            clue_img.save(p)
            dur = calculate_review_duration(rev.get("text", ""))
            print(f"   - Review {idx} ({len(clean_text(rev.get('text', '')).split())} words): {dur}s")
            slides.append((p, dur))

        # 3. Reveal Countdown (3 -> 2 -> 1, 1.0s each: Orange -> Green -> Blue)
        for cnt in [3, 2, 1]:
            cnt_img = create_countdown_frame(date_str, movie_num_str, cnt)
            p = os.path.join(tmpdir, f"countdown_{cnt}.png")
            cnt_img.save(p)
            slides.append((p, 1.0))

        # 4. Reveal Screen (5.0s)
        rev_img = create_reveal_slide(title, year, poster, date_str, movie_num_str)
        p_rev = os.path.join(tmpdir, "slide_reveal.png")
        rev_img.save(p_rev)
        slides.append((p_rev, 5.0))

        total_duration = sum(dur for _, dur in slides)

        # Build ffmpeg concat file
        concat_txt_path = os.path.join(tmpdir, "concat.txt")
        with open(concat_txt_path, "w") as f:
            for path, dur in slides:
                f.write(f"file '{path}'\n")
                f.write(f"duration {dur}\n")
            f.write(f"file '{slides[-1][0]}'\n")

        cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_txt_path,
            "-vf", "format=yuv420p",
            "-c:v", "libx264",
            "-r", "30",
            "-pix_fmt", "yuv420p",
            output_path
        ]

        print("⚡ Rendering video with FFmpeg...")
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            print("FFmpeg error:", res.stderr)
            raise RuntimeError("FFmpeg rendering failed")

    print(f"✅ Video created successfully: {output_path}")
    print(f"   Duration: ~{total_duration:.1f}s | 1080x1920 (9:16)")
    return output_path

def main():
    parser = argparse.ArgumentParser(description="Generate 1080x1920 short video matching GuessTheMovie site design")
    parser.add_argument("--date", help="Date in YYYY-MM-DD format (default: latest date)")
    parser.add_argument("--output", help="Output MP4 file path")
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

    video_path = generate_video_for_date(target_date, args.output)
    print(f"\n🎉 Video is ready for TikTok / YouTube Shorts!")
    print(f"File location: {video_path}")

if __name__ == "__main__":
    main()
