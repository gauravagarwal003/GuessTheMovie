import subprocess

#'': ['1:1', '2:3', '7:4', '1:5', '1:2'],
movies = {
    'john-wick': ['1:10', '2:10', '4:2', '9:1', '1:1'],
    '500-days-of-summer': ['4:7', '1:5', '3:7', '3:2', '5:5'],
}
for movie, pages in movies.items():
    count = 1
    for review in pages:
        lst = review.split(':')
        if len(lst) == 2 and isinstance(lst[0], str) and isinstance(lst[1], str) and lst[0].isdigit() and lst[1].isdigit():
            page = lst[0]
            reviewNum = lst[1]
            subprocess.run(["python3", "createImage.py", movie, page])
            subprocess.run(["python3", "getImage.py", movie, page, reviewNum, str(count)])
            print(f"review {count} for {movie} is done")
            count += 1
        else:
            print(f"INVALID REVIEW FOR {movie}")