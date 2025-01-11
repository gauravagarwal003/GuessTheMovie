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
target_folde_pages = os.path.join(root_dir, 'pages')
target_folder_pages = os.path.normpath(target_folde_pages)
target_folder_images = os.path.join(root_dir, 'images')
target_folder_images = os.path.normpath(target_folder_images)


image = Image.open(f"{target_folder_pages}/{movie}/page{pageNum}.png")
image = image.convert('RGB')  # Ensure the image is in RGB mode

# Define the target color
between = (44, 52, 64)  
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
directory = f"{target_folder_images}/{movie}/"
if not os.path.exists(directory):
    os.makedirs(directory)

# Crop and save sections between y-coordinates
for i in range(len(y_coords) - 1):
    top = y_coords[i] + 1  # Start just after the current y-coordinate
    bottom = y_coords[i + 1]  # End just before the next y-coordinate
    cropped_image = image.crop((450, top, image.width - 730, bottom))
    file_name = f'review_{reviewNum}_p{pageNum}_r{i + 1}.png'

    # Save the cropped image
    if i + 1 == int(whichReview):
        if not os.path.exists(directory + file_name):
            cropped_image_path = os.path.join(directory, file_name)
            cropped_image.save(cropped_image_path)
            exit()