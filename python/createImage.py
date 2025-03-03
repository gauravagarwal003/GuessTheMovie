from PIL import Image
import os
import sys

# Get the arguments
movie = sys.argv[1]
pageNum = sys.argv[2]
whichReview = sys.argv[3]
reviewNum = sys.argv[4]

script_dir = os.path.dirname(__file__)
root_dir = os.path.join(script_dir, '..')
target_folder_pages = os.path.join(root_dir, 'pages', movie)
target_folder_pages = os.path.normpath(target_folder_pages)
target_folder_images = os.path.join(root_dir, 'images', movie)
target_folder_images = os.path.normpath(target_folder_images)

image = Image.open(f"{target_folder_pages}/page{pageNum}.png")
image = image.convert('RGB')  # Ensure the image is in RGB mode

def is_color_match(pixel, target):
    return all(abs(pixel[i] - target[i]) <= 2 for i in range(3))

veryStart = (53,60,70)
start = (51, 58, 67)
between_1 = (44, 52, 64) 
between_2 = (34, 38, 44) 
end = (39, 46, 54)
veryStartFound = False

# Get the image dimensions
width, height = image.size

# Create a list to store coordinates
betweenYs = set()

# Search for the color
y = 0
while y < height:
    pixel = image.getpixel((175, y))
    if is_color_match(pixel, veryStart) and not veryStartFound:
        veryStartFound = True
    if veryStartFound:
        if is_color_match(pixel, start):
            firstY = y
            y += 4
            
        elif is_color_match(pixel, between_1) or is_color_match(pixel, between_2):
            betweenYs.add(y)
            y += 4
                    
        elif is_color_match(pixel, end):
            lastY = y
            break   
    y += 1
                    
# List of y-coordinates
y_coords = list(betweenYs)
y_coords.append(lastY)  # Add the last y-coordinate
y_coords.append(firstY)  # Add the first y-coordinate   

# Sort the y-coordinates (just in case they are not sorted)

firstFound = False
for x in range(width):
    pixel = image.getpixel((x, y_coords[0]))
    if is_color_match(pixel, between_1) or is_color_match(pixel, between_2):
        if not firstFound:
            firstWidth = x - 25
            firstFound = True
    else:
        if firstFound:
            lastWidth = x + 25
            break

y_coords.sort()
# Crop and save sections between y-coordinates
count = 0
for i in range(len(y_coords) - 1):
    count += 1
    top = y_coords[i] + 1  # Start just after the current y-coordinate
    bottom = y_coords[i + 1]  # End just before the next y-coordinate
    cropped_image = image.crop((firstWidth, top, lastWidth, bottom))
    file_name = f'review_{reviewNum}_p{pageNum}_r{i + 1}.png'

    # Save the cropped image
    if i + 1 == int(whichReview):
        if cropped_image.mode not in ["RGB", "RGBA"]:
            cropped_image = cropped_image.convert("RGB")

        cropped_image_path = os.path.join(target_folder_images, file_name)
        cropped_image.save(cropped_image_path)
        exit()