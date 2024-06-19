import requests
import pandas as pd
from bs4 import BeautifulSoup, SoupStrainer
import ast
import json
import time

requestsSession = requests.Session()
filmsPerPageDiary = 50
OtherStarsToInt = {
    "½": '0_5',
    "★": '1',
    "★½": '1_5',
    "★★": '2',
    "★★½": '2_5',
    "★★★": '3',
    "★★★½": '3_5',
    "★★★★": '4',
    "★★★★½": '4_5',
    "★★★★★": '5',
}

starsToInt = { # Maps stars ('★★★½') to a string ('3_5')
    "half-★": '0_5',
    "★": '1',
    "★½": '1_5',
    "★★": '2',
    "★★½": '2_5',
    "★★★": '3',
    "★★★½": '3_5',
    "★★★★": '4',
    "★★★★½": '4_5',
    "★★★★★": '5',
}
getIndex = { # Maps a string ('3_5') to an index (7)    
    "0_5": 0,
    "1": 1,
    "1_5": 2,
    "2": 3,
    "2_5": 4,
    "3": 5,
    "3_5": 6,
    "4": 7,
    "4_5": 8,
    "5": 9,
}

FILMS_PER_PAGE_WATCHED = 72

# MISCELLANEOUS FUNCTIONS

#does ceiling division
def ceilDiv(a, b):
  return -(a // -b)

# returns the link for a given genre, director, actor, country, languauge etc.
def getLink(iD): 
    # input: '/actor/ryan-gosling/' or '/language/hindi/'
    #output: 'https://letterboxd.com/actor/ryan-gosling/' or 'https://letterboxd.com/films/language/hindi/' (can return None)
    genres = {'science fiction', 'music', 'thriller', 'horror', 'tv movie', 'action', 'mystery', 'animation', 'romance', 'comedy', 'adventure', 'war', 'history', 'family', 'documentary', 'crime', 'fantasy', 'drama', 'western'}
    link = None
    
    if iD.lower() in genres:
        link = f"https://letterboxd.com/films/genre/{iD.replace(" ", "-")}"
    
    elif iD.startswith("/theme/") or iD.startswith("/nanogenre/") or iD.startswith("/language/") or iD.startswith("/country/") or iD.startswith("/mini-theme/"):
        link = f"https://letterboxd.com/films{iD}"
        
    elif iD.startswith("/director/") or iD.startswith("/actor/") or iD.startswith("/producer/") or iD.startswith("/writer/") or iD.startswith("/cinematography/") or iD.startswith("/editor/") or iD.startswith("/studio/"):
        link =  f"https://letterboxd.com{iD}"
    
    if link:
        response = requestsSession.get(link)
        if response.status_code == 200:
            return link
        
    return None    
        
# returns the display name for a given genre, director, actor, country, languauge etc.
def getDisplayName(iD, FILE_NAME):
    # input: '/actor/ryan-gosling/' or '/language/hindi/'
    # output: 'Ryan Gosling' or 'Hindi' (can return None)
    df = pd.read_csv(FILE_NAME)
    def has(themes_list, target_string):
        return any(target_string.lower() in theme.lower() for theme in themes_list)

    def getDisplayNameThemeNanoGenre(name, columnLabel, iD, df):
        df[columnLabel] = df[columnLabel].apply(ast.literal_eval)
        movieID = None
        for index, row in df.iterrows():
            if has(row[columnLabel], iD):
                movieID = row['movieID']
        if movieID:
            if name == 'mini-theme':
                name = 'theme'
            response = requestsSession.get(f"https://letterboxd.com/film/{movieID}/{name}s/")
            if response.status_code != 200:
                return None
            soup = BeautifulSoup(response.text, 'lxml', parse_only=SoupStrainer("a"))
            title = soup.find(href=lambda href: href and href.startswith(f"/films{iD}"))   
            return title.find('span').get_text()
    

    if not isinstance(iD, str):
        return iD
    
    if iD.startswith("/theme/"):
        return getDisplayNameThemeNanoGenre('theme', 'themes', iD, df)
    
    if iD.startswith("/mini-theme/"):
        return getDisplayNameThemeNanoGenre('mini-theme', 'themes', iD, df)
    
    if iD.startswith("/nanogenre/"):
        return getDisplayNameThemeNanoGenre('nanogenre', 'nanoGenres', iD, df)
    
    if iD.startswith("/language/"):
        response = requestsSession.get(f"https://letterboxd.com/countries/")
        soup = BeautifulSoup(response.text, 'lxml')
        with open("result.txt", "w") as f:
            f.write(soup.prettify())
        aTag = soup.find('a', attrs={'href': f'/films{iD}'})
        if aTag:
            span = aTag.find('span')
            if span:
                return span.text
        return None
    
    elif iD.startswith("/country/"):
        response = requestsSession.get(f"https://letterboxd.com/countries/")
        soup = BeautifulSoup(response.text, 'lxml')
        with open("result.txt", "w") as f:
            f.write(soup.prettify())
        aTag = soup.find('a', attrs={'href': f'/films{iD}'})
        if aTag:
            span = aTag.find('span')
            if span:
                return span.text
        return ""  
    
    elif iD.startswith("/director/"):
        num = 17
    elif iD.startswith("/actor/"):
        num = 15
    elif iD.startswith("/producer/"):
        num = 18
    elif iD.startswith("/writer/"):
        num = 17
    elif iD.startswith("/cinematography/"):
        num = 14
    elif iD.startswith("/editor/"):
        num = 16
    elif iD.startswith("/studio/"):
        num = 18
    else:
        return ""
    
    response = requestsSession.get(f"https://letterboxd.com/{iD}/")
    if response.status_code != 200:
        return None
    soup = BeautifulSoup(response.text, 'lxml', parse_only=SoupStrainer('head'))
    meta = soup.find('meta', attrs={'name': 'description'})
    if meta:
        description_content = meta.get('content')
        if description_content:
            return description_content[num:]
    return ""
    
# checks if a movie is in the database
def isMovieInDatabase(movieID, FILE_NAME):
    # returns True or False
    df = pd.read_csv(FILE_NAME)
    try:
        if df.empty:
            return False
        else:
            return movieID in df['movieID'].values
    except pd.errors.EmptyDataError:
        return False

# returns the number of movies watched by a user
def getNumberMoviesWatched(username):
    response = requestsSession.get(f"https://letterboxd.com/{username}/films")
    if response.status_code != 200:
        return None
    soup = BeautifulSoup(response.text, "lxml")
    aTag = soup.find('a', href=f"/{username}/films/", class_="tooltip")
    if aTag:
        title = aTag.get('title')
        if title:
            try:
                return int(''.join(c for c in title if c.isdigit()))
            except Exception as e:
                return None


def getNumberMoviesInDiary(username):
    response = requestsSession.get(f"https://letterboxd.com/{username}/films")
    if response.status_code != 200:
        return None
    soup = BeautifulSoup(response.text, "lxml")
    aTag = soup.find('a', href=f"/{username}/films/diary/", class_="tooltip")
    if aTag:
        title = aTag.get('title')
        if title:
            try:
                return int(''.join(c for c in title if c.isdigit()))
            except Exception as e:
                return None

def getNumberReviews(username):
    response = requestsSession.get(f"https://letterboxd.com/{username}/films")
    if response.status_code != 200:
        return None
    soup = BeautifulSoup(response.text, "lxml")
    aTag = soup.find('a', href=f"/{username}/films/reviews/", class_="tooltip")
    if aTag:
        title = aTag.get('title')
        if title:
            try:
                return int(''.join(c for c in title if c.isdigit()))
            except Exception as e:
                return None


def checkIfUserExists(username):
  response = requestsSession.get(f"https://letterboxd.com/{username}/")
  if response.status_code == 200:
    return True
  else:
    return False


# checks if movie is on Letterboxd
def isValidMovie(filmID):
    # returns True or False
    response = requestsSession.get(f"https://letterboxd.com/film/{filmID}")
    if response.status_code == 200:
        return True
    else:
        return False


# checks if the given ID is a movie using the TMDB link 
# soup can be any tab from the movie page except nanogenres, themes, and similar
def isMovie(iD, soup = None, dfValues = None):
    # returns True or False
    if dfValues is not None:
        if iD in dfValues:
            return True
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com{iD}")
        soup = BeautifulSoup(response.text, 'lxml')
        
    tmdbLink = soup.find_all('a', attrs={'data-track-action': 'TMDb'})
    for link in tmdbLink:
        href = link.get('href')
        if href and "/movie/" in href:
            return True
            
    return False

# returns movies watched by user as a set of movieIDs
def getMoviesWatched(username): # gets the ratings for a user
    numMovies = getNumberMoviesWatched(username)
    numPages = ceilDiv(numMovies, FILMS_PER_PAGE_WATCHED)
    pageNum = 1
    baseURL = f"https://letterboxd.com/{username}/films/by/entry-rating/page"
    result = set()
    
    while pageNum <= numPages:
        response = requestsSession.get(f"{baseURL}/{pageNum}")
        if response.status_code == 200:
            poster_containers = BeautifulSoup(response.text, "html.parser", parse_only= SoupStrainer("li", class_="poster-container"))
            with open("result.txt", "w") as f:
                f.write(poster_containers.prettify())
            if poster_containers:
                for container in poster_containers:
                    filmID = container.find("div", class_="really-lazy-load").get("data-film-slug")
                    result.add(filmID)

                pageNum += 1
            else:
                break
        else:
            break
    return result


def checkIfUserExists(username):
  response = requestsSession.get(f"https://letterboxd.com/{username}/")
  if response.status_code == 200:
    return True
  else:
    return False


def getDiary(username, rating = False, date = False, spoiler = False, liked = False):
    numDiary = getNumberMoviesInDiary(username)
    numPages = ceilDiv(numDiary, filmsPerPageDiary)
    baseURL = f"https://letterboxd.com/{username}/films/diary/page"
    pageNumber = 1
    result = []
    while pageNumber <= numPages:
        response = requestsSession.get(f"{baseURL}/{pageNumber}")
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "lxml", parse_only=SoupStrainer('div', class_="site-body"))
            movies = soup.find_all('tr', class_="diary-entry-row")
            for movie in movies:
                entry = {}
                idTag = movie.find('td', class_="td-actions")
                entry['movieID'] = idTag.get('data-film-slug')
                
                liked = False
                tag = movie.find('span', class_="large-liked")
                if tag:
                    liked = True
                entry['liked'] = liked
                
                if date or spoiler:
                    tag = movie.find('a', class_="edit-review-button")
                    if date:
                        entry['date'] = tag.get('data-viewing-date')
                    if spoiler:
                        entry['spoiler'] = tag.get('data-contains-spoilers')
                    
                if rating:
                    ratingTag = movie.find('span', class_='rating')
                    entry['rating'] = ratingTag.text
                result.append(entry)
        pageNumber += 1

    return result
                    
# GET DETAILS THAT DON"T CHANGE
#------------------------------------------------------------

# gets the title of a movie
# soup can be any tab from the movie page except nanogenres, themes, and similar 
def getTitle(filmID, soup = None, FILE_NAME = None):
    # input: 'barbie'
    # output: 'Barbie' (can return None)
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'title'].values[0]

    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}")
        soup = BeautifulSoup(response.text, 'lxml')
        
    try:
        title = soup.find('span', class_ = "name js-widont prettify").get_text()
        return title
    except Exception as e:
        return None

# gets the release year of a movie
# soup can be any tab from the movie page except nanogenres, themes, and similar 
def getReleaseYear(filmID, soup = None, FILE_NAME = None):
    # input: 'barbie'
    # output: 2023 (can return None)
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'year'].values[0]
    
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}")
        soup = BeautifulSoup(response.text, 'lxml')
    try:
        releaseYearDiv = soup.find("div", class_="releaseyear")
        if releaseYearDiv:
            aTag = releaseYearDiv.find("a")
            if aTag:
                return  int(aTag.text.strip())
    except Exception as e:
        return None
    

def getDirectors(filmID, jsonData = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'director'].values[0]
    if not jsonData:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}/details")
        soup = BeautifulSoup(response.text, 'lxml')
        scriptTag = soup.find('script', type='application/ld+json')
        if scriptTag:
            json_content = scriptTag.string
            start_index = json_content.find('/* <![CDATA[ */') + len('/* <![CDATA[ */')
            end_index = json_content.find('/* ]]> */')
            json_data = json_content[start_index:end_index].strip()
            jsonData = json.loads(json_data)
        else:
            return None
    result = []
    if "director" in jsonData:
        for director in jsonData['director']:
            result.append(director['sameAs'])
    return result
    

def getGenres(filmID, jsonData = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'genres'].values[0]

    if not jsonData:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}/details")
        soup = BeautifulSoup(response.text, 'lxml')
        scriptTag = soup.find('script', type='application/ld+json')
        if scriptTag:
            json_content = scriptTag.string
            start_index = json_content.find('/* <![CDATA[ */') + len('/* <![CDATA[ */')
            end_index = json_content.find('/* ]]> */')
            json_data = json_content[start_index:end_index].strip()
            jsonData = json.loads(json_data)
        else:
            return None
    result = []
    if "genre" in jsonData:
        for genre in jsonData['genre']:
            result.append(genre)
    return result
    
    
def getThemes(filmID, soup = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'themes'].values[0]
    
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}/themes")
        soup = BeautifulSoup(response.text, 'lxml')
        
    result = []
    aTags = soup.find_all("a", href=lambda href: href and href.startswith("/films/theme/") or href and href.startswith("/films/mini-theme/"))
    for aTag in aTags:
        rawTheme = aTag.get("href")
        theme = rawTheme[6:-14]
        result.append(theme)
    return result


def getNanoGenres(filmID, soup = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'nanoGenres'].values[0]
    
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}/nanogenres")
        soup = BeautifulSoup(response.text, 'lxml')
    result = []
    aTags = soup.find_all("a", href=lambda href: href and href.startswith("/films/nanogenre/"))
    if aTags:
        for aTag in aTags:
            rawNanoGenre = aTag.get("href")
            nanoGenre = rawNanoGenre[6:-14]
            result.append(nanoGenre)
    return result
    
    
def getRuntime(filmID, soup = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'runtime'].values[0]
    
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}")
        soup = BeautifulSoup(response.text, 'lxml')
    
    result = None
    pTag = soup.find('p', class_='text-link text-footer')
    if pTag:
        try:
            runtimeRaw = pTag.get_text()
            result = int(runtimeRaw.split()[0])
        except:
            return result
    return result


def getPrimaryLanguage(filmID, soup = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'primaryLanguage'].values[0]
    
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}/details")
        soup = BeautifulSoup(response.text, 'lxml')
    
    aTags = soup.find_all("a", href=lambda href: href and href.startswith("/films/language/"))
    if aTags:
        return aTags[0].get("href")[6:]
    
    return None


def getSpokenLanguages(filmID, soup = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'spokenLanguages'].values[0]
    
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}/details")
        soup = BeautifulSoup(response.text, 'lxml')
    
    result = []
    aTags = soup.find_all("a", href=lambda href: href and href.startswith("/films/language/"))
    if aTags:
        for aTag in aTags[1:]:
            language = aTag.get("href")[6:]
            result.append(language)
    
    return result

    
def getCountries(filmID, soup = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'countries'].values[0]
    
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}/details")
        soup = BeautifulSoup(response.text, 'lxml')
    
    result = []
    aTags = soup.find_all("a", href=lambda href: href and href.startswith("/films/country/"))
    if aTags:
        for aTag in aTags:
            country = aTag.get("href")[6:]
            result.append(country)
    
    return result


def getCast(filmID, soup = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'cast'].values[0]
    
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}")
        soup = BeautifulSoup(response.text, 'lxml')
    
    notAllowed = ['(uncredited)', '(archive footage)', '(voice / uncredited)', '(voice/uncredited)', '(unconfirmed)', '(uncredited voice)', '(voice, uncredited)']
    result = []
    castList = soup.find('div', class_ = 'cast-list')
    if castList:
        actors = castList.find_all('a', class_ = 'text-slug tooltip')
        for actor in actors:
            if actor.get('title'):
                add = True
                for rule in notAllowed:
                    if rule in actor.get('title'):
                        add = False
                if add:
                    result.append(actor.get('href'))
    return result


def getProducers(filmID, soup = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'producers'].values[0]
    
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}/crew")
        soup = BeautifulSoup(response.text, 'lxml')
    
    result = []
    aTags = soup.find_all("a", href=lambda href: href and href.startswith("/producer/"))
    if aTags:
        for aTag in aTags:
            producer = aTag.get("href")
            result.append(producer)
    
    return result


def getWriters(filmID, soup = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'writers'].values[0]
    
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}/crew")
        soup = BeautifulSoup(response.text, 'lxml')
    
    result = []
    aTags = soup.find_all("a", href=lambda href: href and href.startswith("/writer/"))
    if aTags:
        for aTag in aTags:
            writer = aTag.get("href")
            result.append(writer)
    
    return result


def getCinematography(filmID, soup = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'cinematography'].values[0]
    
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}/crew")
        soup = BeautifulSoup(response.text, 'lxml')
    
    result = []
    aTags = soup.find_all("a", href=lambda href: href and href.startswith("/cinematography/"))
    if aTags:
        for aTag in aTags:
            cin = aTag.get("href")
            result.append(cin)
    
    return result


def getEditors(filmID, soup = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'editors'].values[0]
    
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}/crew")
        soup = BeautifulSoup(response.text, 'lxml')
    
    result = []
    aTags = soup.find_all("a", href=lambda href: href and href.startswith("/editor/"))
    if aTags:
        for aTag in aTags:
            editor = aTag.get("href")
            result.append(editor)
    
    return result


def getStudios(filmID, jsonData = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'studios'].values[0]
    
    if not jsonData:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}/details")
        soup = BeautifulSoup(response.text, 'lxml')
        scriptTag = soup.find('script', type='application/ld+json')
        if scriptTag:
            json_content = scriptTag.string
            start_index = json_content.find('/* <![CDATA[ */') + len('/* <![CDATA[ */')
            end_index = json_content.find('/* ]]> */')
            json_data = json_content[start_index:end_index].strip()
            jsonData = json.loads(json_data)
        else:
            return None
    result = []
    if "productionCompany" in jsonData:
        for studio in jsonData['productionCompany']:
            result.append(studio['sameAs'])
    return result

    
def getPosterLink(filmID, jsonData = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'posterLink'].values[0]
    
    if not jsonData:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}/details")
        soup = BeautifulSoup(response.text, 'lxml')
        scriptTag = soup.find('script', type='application/ld+json')
        if scriptTag:
            json_content = scriptTag.string
            start_index = json_content.find('/* <![CDATA[ */') + len('/* <![CDATA[ */')
            end_index = json_content.find('/* ]]> */')
            json_data = json_content[start_index:end_index].strip()
            jsonData = json.loads(json_data)
        else:
            return None
        
    result = ""
    if "image" in jsonData:
        result = jsonData['image']  
    return result


def getIMDBLink(filmID, soup = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'imdbLink'].values[0]
    
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}")
        soup = BeautifulSoup(response.text, 'lxml')
    
    result = ""
    IMDbTag = soup.find('a', {'data-track-action': 'IMDb'})
    if IMDbTag:
        result = IMDbTag['href']   
    return result 
    

def getBackdropLink(filmID, soup = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'backdropLink'].values[0]
    
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}")
        soup = BeautifulSoup(response.text, 'lxml')
    
    result = ""
    metaTag = soup.find('meta', attrs={'name': 'twitter:image'})
    if metaTag:
        backdropURL = metaTag.get('content')
        if backdropURL != getIMDBLink(filmID, soup): # makes sure backdrop is not the same as poster
            result = backdropURL
    return result


def getDateCreated(filmID, jsonData = None, FILE_NAME = None):
    if FILE_NAME:
        df = pd.read_csv(FILE_NAME) 
        if filmID in df['movieID'].values:
            return df.loc[df['movieID'] == filmID, 'dateCreated'].values[0]
    
    if not jsonData:
        response = requestsSession.get(f"https://letterboxd.com/film/{filmID}/details")
        soup = BeautifulSoup(response.text, 'lxml')
        scriptTag = soup.find('script', type='application/ld+json')
        if scriptTag:
            json_content = scriptTag.string
            start_index = json_content.find('/* <![CDATA[ */') + len('/* <![CDATA[ */')
            end_index = json_content.find('/* ]]> */')
            json_data = json_content[start_index:end_index].strip()
            jsonData = json.loads(json_data)
        else:
            return None
        
    result = ""
    if "dateCreated" in jsonData:
        result = jsonData["dateCreated"]    
    return result


# GET DETAILS THAT CHANGE
# current is False if you want to get info from database and True if you want the current info
#------------------------------------------------------------

# checks if the movie has more views than the given number
# soup is can be likes, reviews, or lists tab
def getnumViews(current, movieID, soup = None, FILE_NAME = None):
    if not current:
        if FILE_NAME:
            df = pd.read_csv(FILE_NAME) 
            if movieID in df['movieID'].values:
                return df.loc[df['movieID'] == movieID, 'numViews'].values[0]        
        
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{movieID}/likes")
        soup = BeautifulSoup(response.text, 'lxml')
    
    
    aTag = soup.find("a", href=f"/film/{movieID}/members/")
    if aTag and aTag.has_attr("title"):
        return int(''.join(filter(str.isdigit, aTag["title"])))    
    return 0
 
# gets the average rating for a film
def getAverageRating(current, filmID, FILE_NAME = None):
    # input: 'barbie'
    # output: 3.87 (can return None)
    if not current:
        if FILE_NAME:
            df = pd.read_csv(FILE_NAME) 
            if filmID in df['movieID'].values:
                return df.loc[df['movieID'] == filmID, 'avgRating'].values[0]
            
    response = requestsSession.get(f"https://letterboxd.com/csi/film/{filmID}/rating-histogram/")
    if response.status_code != 200:
        return None
    soup = BeautifulSoup(response.text, 'lxml')

    try: # try extracting the average ratings and total ratings
        ratingsText = soup.find('a', {'class': 'tooltip', 'title': True}).get('title')
        return float(ratingsText.split()[3])
    except Exception as e:
        return None
 
 
def getNumReviews(current, movieID, jsonData = None, FILE_NAME = None):
    if not current:
        if FILE_NAME:
            df = pd.read_csv(FILE_NAME) 
            if movieID in df['movieID'].values:
                return df.loc[df['movieID'] == movieID, 'numTotalRatings'].values[0]
        
    if not jsonData:
        response = requestsSession.get(f"https://letterboxd.com/film/{movieID}/details")
        soup = BeautifulSoup(response.text, 'lxml')
        scriptTag = soup.find('script', type='application/ld+json')
        if scriptTag:
            json_content = scriptTag.string
            start_index = json_content.find('/* <![CDATA[ */') + len('/* <![CDATA[ */')
            end_index = json_content.find('/* ]]> */')
            json_data = json_content[start_index:end_index].strip()
            jsonData = json.loads(json_data)
        else:
            return 0
    
    if "aggregateRating" in jsonData:
        if "reviewCount" in jsonData['aggregateRating']:
            return jsonData['aggregateRating']['reviewCount'] 
    return 0
   
    
def getNumRatings(current, movieID, jsonData = None, FILE_NAME = None):
    if not current:
        if FILE_NAME:
            df = pd.read_csv(FILE_NAME) 
            if movieID in df['movieID'].values:
                return df.loc[df['movieID'] == movieID, 'numTotalRatings'].values[0]
        
    if not jsonData:
        response = requestsSession.get(f"https://letterboxd.com/film/{movieID}/details")
        soup = BeautifulSoup(response.text, 'lxml')
        scriptTag = soup.find('script', type='application/ld+json')
        if scriptTag:
            json_content = scriptTag.string
            start_index = json_content.find('/* <![CDATA[ */') + len('/* <![CDATA[ */')
            end_index = json_content.find('/* ]]> */')
            json_data = json_content[start_index:end_index].strip()
            jsonData = json.loads(json_data)
        else:
            return 0
            
    if "aggregateRating" in jsonData:
        if "ratingCount" in jsonData['aggregateRating']:
            return jsonData['aggregateRating']['ratingCount']
    return 0


def getNumLikes(current, movieID, soup = None, FILE_NAME = None):
    if not current:
        if FILE_NAME:
            df = pd.read_csv(FILE_NAME) 
            if movieID in df['movieID'].values:
                return df.loc[df['movieID'] == movieID, 'numLikes'].values[0]        
        
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{movieID}/likes")
        soup = BeautifulSoup(response.text, 'lxml')
    
    result = 0
    aTag = soup.find("a", href=f"/film/{movieID}/likes/")
    if aTag and aTag.has_attr("title"):
        result = int(''.join(filter(str.isdigit, aTag["title"])))
    return result


def getNumFans(current, movieID, soup = None, FILE_NAME = None):
    if not current:
        if FILE_NAME:
            df = pd.read_csv(FILE_NAME) 
            if movieID in df['movieID'].values:
                return df.loc[df['movieID'] == movieID, 'numFans'].values[0]        
            
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{movieID}/likes")
        soup = BeautifulSoup(response.text, 'lxml')
    
    result = 0
    aTag = soup.find("a", href=f"/film/{movieID}/fans/")
    if aTag and aTag.has_attr("title"):
        result = int(''.join(filter(str.isdigit, aTag["title"])))
    return result


def getNumListAppearances(current, movieID, soup = None, FILE_NAME = None):
    if not current:
        if FILE_NAME:
            df = pd.read_csv(FILE_NAME) 
            if movieID in df['movieID'].values:
                return df.loc[df['movieID'] == movieID, 'numListAppearances'].values[0]        
        
    if not soup:
        response = requestsSession.get(f"https://letterboxd.com/film/{movieID}/likes")
        soup = BeautifulSoup(response.text, 'lxml')
    
    result = 0
    aTag = soup.find("a", href=f"/film/{movieID}/lists/")
    if aTag and aTag.has_attr("title"):
        result = int(''.join(filter(str.isdigit, aTag["title"])))
    return result
    

def getHistogram(current, movieID, FILE_NAME = None):
    if not current:
        if FILE_NAME:
            df = pd.read_csv(FILE_NAME) 
            if movieID in df['movieID'].values:
                return [df.loc[df['movieID'] == movieID, 'num0_5StarRatings'].values[0], df.loc[df['movieID'] == movieID, 'num1StarRatings'].values[0], df.loc[df['movieID'] == movieID, 'num1_5StarRatings'].values[0], df.loc[df['movieID'] == movieID, 'num2StarRatings'].values[0], df.loc[df['movieID'] == movieID, 'num2_5StarRatings'].values[0], df.loc[df['movieID'] == movieID, 'num3StarRatings'].values[0], df.loc[df['movieID'] == movieID, 'num3_5StarRatings'].values[0], df.loc[df['movieID'] == movieID, 'num4StarRatings'].values[0], df.loc[df['movieID'] == movieID, 'num4_5StarRatings'].values[0], df.loc[df['movieID'] == movieID, 'num5StarRatings'].values[0]]
        
    responseHistogram = requestsSession.get(f"https://letterboxd.com/csi/film/{movieID}/rating-histogram/")
    histogram = BeautifulSoup(responseHistogram.text, "lxml", parse_only=  SoupStrainer("li", class_="rating-histogram-bar"))
    
    result = [0] * 10
    tooltip_elements = histogram.find_all('a', class_ = 'ir tooltip')
    for element in tooltip_elements: 
        num = int(''.join(c for c in element.text.split()[0] if c.isdigit()))
        index = getIndex[starsToInt[element.text.split()[1]]]
        result[index] = num
    return result

