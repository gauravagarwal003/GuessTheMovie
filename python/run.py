import subprocess

#'': [':', ':', ':', ':', ':'],
movies = {
    'barbie': ['3:9', '1:8', '1:2', '3:3', '1:1'],
    'interstellar': ['1:3', '1:1', '2:3', '1:4', '3:4'],
    'la-la-land': ['1:1', '2:4', '2:10', '6:4', '3:2'],
    'oppenheimer-2023': ['1:5', '3:1', '1:7', '1:1', '2:9'],
    'whiplash-2014': ['1:5', '1:3', '4:6', '1:1', '2:2'],
    'dune-2021': ['1:2', '2:9', '1:9', '1:4', '2:3'],
    'spider-man-into-the-spider-verse': ['1:6', '8:4', '1:10', '1:4', '9:1'],
    'saltburn': ['1:10', '1:9', '1:8', '1:7', '3:1'],
    'lady-bird':  ['1:4', '1:7', '1:1', '2:3', '1:11']
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
