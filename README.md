
# Guess the Movie Archive

This repo has code that extracts the relevant info from Letterboxd reviews and uploads them to Dropbox. 
There are five reviews for each day and the page number and review number on that page need to be specified (from the popular reviews page).


## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`DROPBOX_APP_KEY`

`DROPBOX_APP_SECRET`

`DROPBOX_REFRESH_TOKEN`

`DROPBOX_ACCESS_TOKEN`


## How to Use

```python3
  source venv/bin/activate
```

Go to the root directory and add your review info to the `toAdd` dictionary where the movie ID is the key and info (review numbers and date) are the value. Get the data.

```python3
  python3 run.py
```

Once data is saved locally, you can move the review info from the `toAdd` dictionary to the `movies` dictionary above it. Then, add the dates to the `local_folders` list in `uploadArchive.py` and upload it to Dropbox.

```python3
  python3 uploadArchive.py
```
