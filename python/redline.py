from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from PIL import Image, ImageDraw

movie = 'barbie'
pageNum = 1

# Configure Firefox WebDriver options
options = Options()
options.add_argument("--width=1920")
options.add_argument("--height=1080")
options.add_argument("--headless")  # Use headless mode for running in the background

# Initialize the Firefox WebDriver
driver = webdriver.Chrome(options=options)

# Navigate to the URL you want to capture
driver.get(f"https://letterboxd.com/film/{movie}/reviews/by/activity/page/{pageNum}/")

# Use JavaScript to get the full width and height of the webpage
width = driver.execute_script("return Math.max( document.body.scrollWidth, document.body.offsetWidth, document.documentElement.clientWidth, document.documentElement.scrollWidth, document.documentElement.offsetWidth );")
height = driver.execute_script("return Math.max( document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight );")

# Set the window size to match the entire webpage
driver.set_window_size(width, height)

# Find the full page element (usually 'body') and capture the screenshot
full_page = driver.find_element(By.TAG_NAME, "body")
full_page.screenshot(f"{movie}_page{pageNum}.png")

# Close the browser window
driver.quit()

image = Image.open(f"{movie}_page{pageNum}.png")
#image = image.crop((450, 0, image.width - 730, image.height - 200))

# Crop the image to remove any browser window frame
# Adjust the cropping coordinates as needed
image = image.convert('RGB')  # Ensure the image is in RGB mode

# Define the target color
between = (44, 52, 64)  # Replace with your target color's RGB values
start = (68, 85, 102)
end = (51, 68, 85)
# Get the image dimensions
width, height = image.size

# Create a list to store coordinates
betweenYs = set()
# Search for the color
for y in range(height):
    if image.getpixel((500, y)) == start:
        firstY = y
    elif image.getpixel((500, y)) == between:
        betweenYs.add(y)
                
    elif image.getpixel((500, y)) == end:
        lastY = y
        break
    

# List of y-coordinates
y_coords = list(betweenYs)
y_coords.append(lastY)  # Add the last y-coordinate
y_coords.append(firstY)  # Add the first y-coordinate   

draw = ImageDraw.Draw(image)

# Draw a horizontal line at each y-coordinate
for y in y_coords:
    draw.line([(0, y), (image.width - 1, y)], fill="red", width=1)

# Save or show the image
image.save('red_lines.png')
image.show()
