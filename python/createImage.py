from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
import os
import sys

# Get the arguments
movie = sys.argv[1]
pageNum = sys.argv[2]
script_dir = os.path.dirname(__file__)
root_dir = os.path.join(script_dir, '..')
target_folder = os.path.join(root_dir, 'pages')
target_folder = os.path.normpath(target_folder)

if not os.path.exists(f"{target_folder}/{movie}"):
    os.makedirs(f"{target_folder}/{movie}")
    
if os.path.exists(f"{target_folder}/{movie}/page{pageNum}.png"):
    exit()

# Configure Firefox WebDriver options
options = Options()
options.add_argument("--width=1920")
options.add_argument("--height=1080")
options.add_argument("--headless")  # Use headless mode for running in the background

# Initialize the Firefox WebDriver
driver = webdriver.Firefox(options=options)

# Navigate to the URL you want to capture
driver.get(f"https://letterboxd.com/film/{movie}/reviews/by/activity/page/{pageNum}/")

# Use JavaScript to get the full width and height of the webpage
width = driver.execute_script("return Math.max( document.body.scrollWidth, document.body.offsetWidth, document.documentElement.clientWidth, document.documentElement.scrollWidth, document.documentElement.offsetWidth );")
height = driver.execute_script("return Math.max( document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight );")

# Set the window size to match the entire webpage
driver.set_window_size(width, height)

# Find the full page element (usually 'body') and capture the screenshot
full_page = driver.find_element(By.TAG_NAME, "body")
full_page.screenshot(f"{target_folder}/{movie}/page{pageNum}.png")


# Close the browser window
driver.quit()