from PIL import Image
import os
import sys

# Get the arguments
movie = sys.argv[1]
pageNum = sys.argv[2]
reviews = sys.argv[3]
reviews = list(map(int, reviews.split(',')))


image = Image.open(f"/Users/gaurav/Downloads/LBGuessMovie/pages/{movie}/page{pageNum}.png")
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

# Sort the y-coordinates (just in case they are not sorted)
y_coords.sort()
directory = f"/Users/gaurav/Downloads/LBGuessMovie/images/{movie}/"
if not os.path.exists(directory):
    os.makedirs(directory)

# Crop and save sections between y-coordinates
for i in range(len(y_coords) - 1):
    top = y_coords[i] + 1  # Start just after the current y-coordinate
    bottom = y_coords[i + 1]  # End just before the next y-coordinate
    cropped_image = image.crop((450, top, image.width - 730, bottom))

    # Save the cropped image
    if i + 1 in reviews:
        if not os.path.exists(directory + f'page{pageNum}_{i + 1}.png'):
            cropped_image_path = os.path.join(directory, f'page{pageNum}_{i + 1}.png')
            cropped_image.save(cropped_image_path)