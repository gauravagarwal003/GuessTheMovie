import subprocess

#'': [':', ':', ':', ':', ':'],
movies = {
    'john-wick': ['1:10', '2:10', '4:2', '9:1', '1:1'],
    '500-days-of-summer': ['4:7', '1:5', '3:7', '3:2', '5:5'],
    'anatomy-of-a-fall': ['1:10', '2:1', '1:7', '4:7', '1:4'],
    'the-terminator': ['1:1', '2:10', '1:9', '3:6', '3:5'],
    'deadpool-2': ['1:11', '5:1', '1:12', '2:10', '1:9'],
    'the-florida-project' : ['1:5', '1:1', '2:1', '3:4', '2:4'],
    'moneyball': ['4:7', '2:1', '1:12', '9:11', '2:6'],
    'zombieland': ['2:3', '1:7', '5:4', '3:12', '2:12'],
    'the-devil-wears-prada': ['1:5', '1:11', '1:3', '1:6', '1:1'],
    'x2': ['3:12', '1:3','3:8', '2:8', '1:4'],
    'dallas-buyers-club': ['1:1', '1:11', '1:10', '6:2', '2:5'],
    'due-date': ['1:6', '1:7', '1:1', '3:5', '3:6'],
    'wicked-2024': ['1:5', '1:7', '3:4', '2:10', '2:6']
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
