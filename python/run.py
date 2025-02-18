import subprocess

#'': [':', ':', ':', ':', ':'],
movies = {
    'interstellar': ['1:3', '1:1', '2:3', '1:4', '3:4'],
    'la-la-land': ['1:1', '2:4', '2:10', '6:4', '3:2'],
    'oppenheimer-2023': ['1:5', '1:8', '3:1', '1:7', '2:9'],
    'whiplash-2014': ['1:5', '1:3', '4:6', '1:1', '2:2'],
    'dune-2021': ['1:2', '2:9', '1:9', '1:4', '2:3'],
    'spider-man-into-the-spider-verse': ['1:6', '8:4', '1:10', '1:4', '9:1'],
    'saltburn': ['1:10', '1:9', '1:8', '1:7', '3:1'],
    'lady-bird':  ['1:4', '1:7', '1:1', '2:3', '1:11'],
    'the-substance': ['1:12', '1:6', '4:2', '4:3', '1:1'],
    'knives-out-2019': ['1:10', '2:2', '1:1', '1:5', '4:1'],
    'once-upon-a-time-in-hollywood': ['1:2', '1:12', '1:1', '3:3', '6:6'],
    'get-out-2017': ['1:5', '3:5', '2:3', '1:8', '2:4'],
    'inglourious-basterds': ['12:6', '1:12', '1:1', '1:6', '4:9'],
    'baby-driver': ['1:8', '2:2', '1:1', '3:3', '4:3'],
    'barbie': ['2:12', '5:2', '1:8', '3:3', '1:1'],
    'challengers': ['1:3', '1:5', '2:3' '1:10', '2:6'],
    'mean-girls': ['1:7', '4:8', '3:5', '6:6', '1:11'],
    'wicked-2024': ['1:5', '2:6', '3:4' , '1:6', '1:8'],
}

toAdd = {
    'se7en': ['2:10', '1:10', '1:4', '3:2', '1:6']
}

for movie, pages in toAdd.items():
    count = 1
    subprocess.run(["python3", "setReviewText.py", movie] + pages)
    subprocess.run(["python3", "getScreenShot.py", movie] + pages)
    for review in pages:
        lst = review.split(':')
        if len(lst) == 2 and isinstance(lst[0], str) and isinstance(lst[1], str) and lst[0].isdigit() and lst[1].isdigit():
            page = lst[0]
            reviewNum = lst[1]
            subprocess.run(["python3", "createImage.py", movie, page, reviewNum, str(count)])
            print(f"Added image for review {reviewNum} for page {page} of {movie}")
            count += 1
        else:
            print(f"INVALID REVIEW FOR {movie}")