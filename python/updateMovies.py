import pandas as pd
import os
import requests
import json
from bs4 import BeautifulSoup
import time
from functions import *

CSV_FILE_NAME = "movies.csv"
script_dir = os.path.dirname(__file__)
root_dir = os.path.join(script_dir, '..')
CSV_FILE_NAME = os.path.join(root_dir, 'public', CSV_FILE_NAME)
CSV_FILE_NAME = os.path.normpath(CSV_FILE_NAME)

minViews = 100000
with open(CSV_FILE_NAME, 'w') as file:
    file.write("movieID,title,year,posterLink\n")
requestsSession = requests.Session()
numPages = 35
    
def addMovieToDatabase(movieID):
    response = requestsSession.get(f"https://letterboxd.com/film/{movieID}/details")
    responseLikes = requestsSession.get(f"https://letterboxd.com/film/{movieID}/likes")
        
    soup = BeautifulSoup(response.text, 'lxml')
    soupLikes = BeautifulSoup(responseLikes.text, 'lxml')

    # check if movie satisfies minimum views
    if getnumViews(True, movieID, soup = soupLikes) < minViews:
        return False
        
    # check if movie is a TV show or miniseries (according to TMDB link)
    if not isMovie(movieID, soup = soup):
        return False
    
    data = {}
    
    # add movie id
    data['movieID'] = {movieID}
    
    # add title
    data['title'] = getTitle(movieID, soup = soup)
        
    # add year
    data['year'] = getReleaseYear(movieID, soup = soup)

    scriptTag = soup.find('script', type='application/ld+json')
    if scriptTag:
        json_content = scriptTag.string
        start_index = json_content.find('/* <![CDATA[ */') + len('/* <![CDATA[ */')
        end_index = json_content.find('/* ]]> */')
        json_data = json_content[start_index:end_index].strip()
        jsonData = json.loads(json_data)
             
    # add link to image of poster
    data['posterLink'] = ""  
    if scriptTag:
        data['posterLink'] = getPosterLink(movieID, jsonData = jsonData)    

    # commit changes
    df = pd.DataFrame([data])
    df.to_csv(CSV_FILE_NAME, mode='a', header=not os.path.exists(CSV_FILE_NAME), index=False)
    return True

def populateDatabase(base_url):
    page_number = 1
    while page_number < numPages:
        startPage = time.time()
        url = f"{base_url}/page/{page_number}/"
        response = requestsSession.get(url)
        soup = BeautifulSoup(response.text, 'lxml')
        movie_divs = soup.find_all('div', class_='really-lazy-load')
        if not movie_divs:
            break
        for div in movie_divs:
            try:
                addMovieToDatabase(div['data-film-slug'])
            except Exception as e:
                print(f"An error occurred while trying to add movie {div['data-film-slug']}: {e}" + "\n")
    
        print(f"Page {page_number} took {time.time() - startPage} seconds")
        page_number += 1  

url = f"https://letterboxd.com/hershwin/list/all-the-movies/by/popular"
populateDatabase(url)