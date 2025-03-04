import random
import json
import pandas as pd

# Set parameters
numGames = 50
numWins = 0

# Load movie data from CSV
file_path = "public/movies.csv"
movies_df = pd.read_csv(file_path)
required_columns = {"movieID", "title", "year", "posterLink"}
movies_df = movies_df.dropna(subset=required_columns)  # Remove rows with missing values
movies = movies_df.to_dict(orient="records")

# Ensure there are enough movies to pick from
if len(movies) < 2:
    raise ValueError("Not enough movies in dataset to simulate game.")

games = []

# Generate random games
for _ in range(numGames):
    correct_movie = random.choice(movies)  # Select a random movie as the correct answer
    guesses_count = random.randint(1, 5)
    guesses = []
    if guesses_count == 1:
        result = "win"
        numWins += 1
        guesses = [correct_movie["movieID"]]
    else:
        result = random.choice(["win", "lose"])
        if result == "win":
            num_incorrect_guesses = random.choice([1, 2, 3, 4])
            while len(guesses) < num_incorrect_guesses:
                random_movie = random.choice(movies)
                if random_movie["movieID"] != correct_movie["movieID"] and random_movie["movieID"] not in guesses:
                    guesses.append(random_movie["movieID"])
            guesses.append(correct_movie["movieID"])
            numWins += 1
        else:
            num_incorrect_guesses = random.choice([1, 2, 3, 4, 5])
            while len(guesses) < num_incorrect_guesses:
                random_movie = random.choice(movies)
                if random_movie["movieID"] != correct_movie["movieID"] and random_movie["movieID"] not in guesses:
                    guesses.append(random_movie["movieID"])

    # Create game entry
    current_game = {
        "correctMovieID": correct_movie["movieID"],
        "won": result == "win",
        "guessCount": len(guesses),
        "guesses": guesses,
        "date": random.choice(pd.date_range(start="2021-01-01", end="2025-03-03")).strftime("%Y-%m-%d"),
        "title": correct_movie["title"],
        "year": correct_movie["year"],
        "posterLink": correct_movie["posterLink"]
    }

    games.append(current_game)

# Generate game stats
game_stats = {
    "games": games,
    "totalPlayed": numGames,
    "totalWon": numWins
}

# Print the JSON in a format that can be directly copied into JavaScript
js_snippet = f"var globalGameStats = {json.dumps(game_stats, indent=2)};"
print(js_snippet)
