from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import random
import os
import sys

# Read command-line arguments
movie = sys.argv[1]
pages = sys.argv[2:7]  # Automatically extract 5 elements

# Validate input pages
for i in pages:
    lst = i.split(':')
    if len(lst) != 2 or not lst[0].isdigit() or not lst[1].isdigit():
        print(f"INVALID REVIEW FOR {movie}")
        quit()

# Setup directories
script_dir = os.path.dirname(__file__)
root_dir = os.path.join(script_dir, '..')
target_folder = os.path.join(root_dir, 'pages', movie)
target_folder_images = os.path.join(root_dir, 'images', movie)
target_folder_images = os.path.normpath(target_folder_images)

os.makedirs(target_folder_images, exist_ok=True)

for file in os.listdir(target_folder_images):
    file_path = os.path.join(target_folder_images, file)
    if os.path.isfile(file_path): 
        os.remove(file_path)

os.makedirs(target_folder, exist_ok=True)

for file in os.listdir(target_folder):
    file_path = os.path.join(target_folder, file)
    if os.path.isfile(file_path): 
        os.remove(file_path)
        
options = Options()
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36")
options.add_argument("--width=1920")
options.add_argument("--height=1080")
options.add_argument("--headless")
driver = webdriver.Chrome(options=options)

try: 
    for pageNum in set([item.split(":")[0] for item in pages]):
        print(f"Getting page {pageNum} for {movie}")    
        driver.get(f"https://letterboxd.com/film/{movie}/reviews/by/activity/page/{pageNum}/")
        print(f"Got page {pageNum} for {movie}")
        width = driver.execute_script("return Math.max( document.body.scrollWidth, document.body.offsetWidth, document.documentElement.clientWidth, document.documentElement.scrollWidth, document.documentElement.offsetWidth );")
        height = driver.execute_script("return Math.max( document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight );")
        driver.set_window_size(width, height)
        full_page = driver.find_element(By.TAG_NAME, "body")
        full_page.screenshot(f"{target_folder}/page{pageNum}.png")

finally:
    driver.quit()