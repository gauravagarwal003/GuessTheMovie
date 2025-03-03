from PIL import Image, ImageDraw
import os



movie = 'challengers'
pageNum = '2'
whichReview = '1'
reviewNum = '1'


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
for y in range(height):
    pixel = image.getpixel((175, y))
    if is_color_match(pixel, veryStart) and not veryStartFound:
        veryStartFound = True
    if veryStartFound:
        if is_color_match(pixel, start):
            print('start')
            firstY = y
            
        elif is_color_match(pixel, between_1) or is_color_match(pixel, between_2):
            betweenYs.add(y)
                    
        elif is_color_match(pixel, end):
            print('end')
            lastY = y
            break            
            
# List of y-coordinates
y_coords = list(betweenYs)
#y_coords.append(lastY)  # Add the last y-coordinate
#y_coords.append(firstY)  # Add the first y-coordinate   

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

draw = ImageDraw.Draw(image)
draw.line([(firstWidth, 0), (firstWidth, height - 1)], fill="red", width=1)
draw.line([(lastWidth, 0), (lastWidth, height - 1)], fill="red", width=1)

for y in y_coords:
    draw.line([(0, y), (width - 1, y)], fill="red", width=1)

image.save('red_lines.png')
image.show()