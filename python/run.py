import subprocess

#'': {'1': [], '2': [], '3': [], '4': [], '5': [], '6': [], '7': [], '8': [], '9': [], '10': [], '11': [], '12': [], '13': []},
movies = {
    'legally-blonde': {'1': [4,7], '2': [11,5,6], '3': [11,6,9], '4': [2,7,12], '5': [5,8], '6': [10], '7': [10,12,7], '8': [11], '9': [1,3], '10': [8], '11': [6,11], '12': [1,4,7], '13': [11,8]},
    'mad-max-fury-road': {'1': [3,12,11,7,5], '2': [11,10,8], '3': [10], '5': [5,8], '6': [3], '7': [4,7], '8': [8,7], '9': [8,7,3], '11': [2,7], '12': [7,5], '14': [7], '15': [4]},
}
for movie, pages in movies.items():
    for page, reviews in pages.items():
        subprocess.run(["python3", "createImage.py", movie, page])
        subprocess.run(["python3", "splitImage.py", movie, page, ','.join(map(str, reviews))])
        print(f"Finished {movie} page {page}")
