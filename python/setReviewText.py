from bs4 import BeautifulSoup
import requests
import os
import sys


movie = sys.argv[1]
pages = [sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6]]

script_dir = os.path.dirname(__file__)
root_dir = os.path.join(script_dir, '..')
target_folder = os.path.join(root_dir, 'text', movie)
target_folder = os.path.normpath(target_folder)

if not os.path.exists(target_folder):
    os.makedirs(target_folder)

for file in os.listdir(target_folder):
    file_path = os.path.join(target_folder, file)
    if os.path.isfile(file_path): 
        os.remove(file_path)

for i in pages:
    lst = i.split(':')
    if len(lst) != 2 or not isinstance(lst[0], str) or not isinstance(lst[1], str) or not lst[0].isdigit() or not lst[1].isdigit():
        print(f"INVALID REVIEW FOR {movie}")
        quit()

if not os.path.exists(target_folder):
    os.mkdir(target_folder)
    
dict = {}
for i in pages:
    lst = i.split(':')
    if lst[0] in dict:
        dict[lst[0]].append(lst[1])
    else:
        dict[lst[0]] = [lst[1]]

for pageNum, reviewNum in dict.items():
    url = f'https://letterboxd.com/film/{movie}/reviews/by/activity/page/{pageNum}/'
    headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    response = requests.get(url, headers=headers).text
    soup = BeautifulSoup(response, 'html.parser')
    film_details = soup.find_all('li', class_='film-detail')
    for i in reviewNum:
        target_file = os.path.join(target_folder,f'{pages.index(f"{pageNum}:{i}") + 1}_p{pageNum}_r{i}.txt')
        review = film_details[int(i) - 1].find('div', class_='body-text').find('p').text
        with open(target_file, 'w', encoding='utf-8') as file:
            file.write(review)
        print(f"Added review {i} for page {pageNum} of {movie}")