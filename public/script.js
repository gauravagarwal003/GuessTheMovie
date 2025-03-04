// Global variables and constants
let moviesData = [];
let correctMovieID = '';
let incorrectGuessCount = 0;
let reviewImages = [];
let reviewTexts = [];
let allImages = [];
let allText = [];
let collectedGuessesArray = [];
let currentImageIndex = 1;
let gameOver = false;
let correctMovieDate = '';

const maxMoviesToShow = 10;
const selectedColumns = ['title', 'year', 'movieID', 'posterLink']; // Columns to select from the CSV file
const maxIncorrectGuesses = 5;

const imageButtonsContainer = document.getElementById('imageButtons');
const multiButton = document.querySelector('button[id="multi-button"]');
const statsDisplay = document.getElementById('statsDisplay');


var globalGameStats = {
    "games": [
      {
        "correctMovieID": "men-2022",
        "won": false,
        "guessCount": 5,
        "guesses": [
          "the-vast-of-night",
          "fracture",
          "monte-carlo",
          "thelma-louise",
          "the-return-of-the-living-dead"
        ],
        "date": "2025-01-02",
        "title": "Men",
        "year": 2022,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/6/9/9/2/9/8/699298-men-0-230-0-345-crop.jpg?v=5065da5191"
      },
      {
        "correctMovieID": "harry-potter-and-the-deathly-hallows-part-2",
        "won": true,
        "guessCount": 4,
        "guesses": [
          "the-bad-guys-2022",
          "cars-3",
          "the-hangover-part-ii",
          "harry-potter-and-the-deathly-hallows-part-2"
        ],
        "date": "2022-05-13",
        "title": "Harry Potter and the Deathly Hallows: Part 2",
        "year": 2011,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/4/4/5/8/0/44580-harry-potter-and-the-deathly-hallows-part-2-0-230-0-345-crop.jpg?v=66f3769773"
      },
      {
        "correctMovieID": "frankenweenie-2012",
        "won": true,
        "guessCount": 3,
        "guesses": [
          "the-beekeeper-2024",
          "halloween-1978",
          "frankenweenie-2012"
        ],
        "date": "2022-05-22",
        "title": "Frankenweenie",
        "year": 2012,
        "posterLink": "https://a.ltrbxd.com/resized/sm/upload/w7/w9/ex/7w/zMFJ0Uy9y0Oy3KPbgtRic6IYzRk-0-230-0-345-crop.jpg?v=e838af3efa"
      },
      {
        "correctMovieID": "the-age-of-innocence",
        "won": true,
        "guessCount": 2,
        "guesses": [
          "the-princess-diaries-2-royal-engagement",
          "the-age-of-innocence"
        ],
        "date": "2024-07-22",
        "title": "The Age of Innocence",
        "year": 1993,
        "posterLink": "https://a.ltrbxd.com/resized/sm/upload/ya/m4/xj/mi/36euuWA31TtH5E8TRZJRvdZ9pP-0-230-0-345-crop.jpg?v=fad43e88d7"
      },
      {
        "correctMovieID": "ip-man",
        "won": true,
        "guessCount": 2,
        "guesses": [
          "resident-evil",
          "ip-man"
        ],
        "date": "2023-07-15",
        "title": "Ip Man",
        "year": 2008,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/4/2/8/4/1/42841-ip-man-0-230-0-345-crop.jpg?v=a2770708db"
      },
      {
        "correctMovieID": "like-stars-on-earth",
        "won": true,
        "guessCount": 2,
        "guesses": [
          "ida",
          "like-stars-on-earth"
        ],
        "date": "2023-11-18",
        "title": "Like Stars on Earth",
        "year": 2007,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/4/8/0/0/4/48004-taare-zameen-par-0-230-0-345-crop.jpg?v=21e4e3906b"
      },
      {
        "correctMovieID": "rush-2013",
        "won": true,
        "guessCount": 2,
        "guesses": [
          "overlord-2018",
          "rush-2013"
        ],
        "date": "2021-11-09",
        "title": "Rush",
        "year": 2013,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/7/9/7/8/7/79787-rush-0-230-0-345-crop.jpg?v=ca082886e5"
      },
      {
        "correctMovieID": "skyscraper-2018",
        "won": false,
        "guessCount": 4,
        "guesses": [
          "the-birds",
          "hero-2002",
          "anchorman-2-the-legend-continues",
          "wicked-2024"
        ],
        "date": "2023-07-03",
        "title": "Skyscraper",
        "year": 2018,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/3/7/9/5/6/5/379565-skyscraper-0-230-0-345-crop.jpg?v=beaa313187"
      },
      {
        "correctMovieID": "cruel-intentions",
        "won": false,
        "guessCount": 5,
        "guesses": [
          "a-walk-to-remember",
          "rush-hour-2",
          "hard-eight",
          "bad-santa",
          "salt-2010"
        ],
        "date": "2024-11-10",
        "title": "Cruel Intentions",
        "year": 1999,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/5/1/3/5/6/51356-cruel-intentions-0-230-0-345-crop.jpg?v=2f669d4209"
      },
      {
        "correctMovieID": "apostle-2018",
        "won": true,
        "guessCount": 3,
        "guesses": [
          "fighting-with-my-family",
          "let-the-right-one-in",
          "apostle-2018"
        ],
        "date": "2024-04-13",
        "title": "Apostle",
        "year": 2018,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/3/5/7/6/6/8/357668-apostle-0-230-0-345-crop.jpg?v=5de87356f8"
      },
      {
        "correctMovieID": "autumn-sonata",
        "won": true,
        "guessCount": 4,
        "guesses": [
          "crank-high-voltage",
          "the-color-purple-2023",
          "i-feel-pretty",
          "autumn-sonata"
        ],
        "date": "2024-02-04",
        "title": "Autumn Sonata",
        "year": 1978,
        "posterLink": "https://a.ltrbxd.com/resized/sm/upload/dr/d3/nw/gv/m4I32itPMlRWqWJamFAwFDbrBXp-0-230-0-345-crop.jpg?v=45433653ca"
      },
      {
        "correctMovieID": "palo-alto",
        "won": false,
        "guessCount": 2,
        "guesses": [
          "the-ides-of-march",
          "1917"
        ],
        "date": "2022-03-26",
        "title": "Palo Alto",
        "year": 2013,
        "posterLink": "https://a.ltrbxd.com/resized/sm/upload/7h/k3/fj/g0/sScjrGWtCw7OvsmoVUwjhEcGNWs-0-230-0-345-crop.jpg?v=6c5acbd4c8"
      },
      {
        "correctMovieID": "creature-from-the-black-lagoon",
        "won": true,
        "guessCount": 1,
        "guesses": [
          "creature-from-the-black-lagoon"
        ],
        "date": "2024-06-01",
        "title": "Creature from the Black Lagoon",
        "year": 1954,
        "posterLink": "https://a.ltrbxd.com/resized/sm/upload/dw/3f/dq/c6/hQ3k0gAh2Hv2uqrMff0gqxZDJKy-0-230-0-345-crop.jpg?v=4b95b672a1"
      },
      {
        "correctMovieID": "unfriended",
        "won": true,
        "guessCount": 5,
        "guesses": [
          "the-gentlemen",
          "chicken-little-2005",
          "freaks",
          "godzilla",
          "unfriended"
        ],
        "date": "2023-09-23",
        "title": "Unfriended",
        "year": 2014,
        "posterLink": "https://a.ltrbxd.com/resized/sm/upload/2s/t4/di/18/hfEBlhvVWFt61EWjNbjlKdDilBI-0-230-0-345-crop.jpg?v=592f643b3a"
      },
      {
        "correctMovieID": "the-usual-suspects",
        "won": true,
        "guessCount": 4,
        "guesses": [
          "mishima-a-life-in-four-chapters",
          "his-house",
          "annie",
          "the-usual-suspects"
        ],
        "date": "2021-03-01",
        "title": "The Usual Suspects",
        "year": 1995,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/5/1/4/9/5/51495-the-usual-suspects-0-230-0-345-crop.jpg?v=c02dce5b81"
      },
      {
        "correctMovieID": "2-guns",
        "won": true,
        "guessCount": 5,
        "guesses": [
          "nanny-mcphee",
          "the-prom-2020",
          "dream-scenario",
          "the-other-woman-2014",
          "2-guns"
        ],
        "date": "2021-03-08",
        "title": "2 Guns",
        "year": 2013,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/1/0/4/7/8/2/104782-2-guns-0-230-0-345-crop.jpg?v=b096cdac25"
      },
      {
        "correctMovieID": "a-beautiful-day-in-the-neighborhood",
        "won": false,
        "guessCount": 5,
        "guesses": [
          "the-karate-kid-part-ii",
          "death-note-2017",
          "the-social-network",
          "hocus-pocus-2",
          "power-rangers"
        ],
        "date": "2023-10-14",
        "title": "A Beautiful Day in the Neighborhood",
        "year": 2019,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/4/3/1/8/7/7/431877-a-beautiful-day-in-the-neighborhood-0-230-0-345-crop.jpg?v=80d455b968"
      },
      {
        "correctMovieID": "tootsie",
        "won": true,
        "guessCount": 3,
        "guesses": [
          "big",
          "countdown-2019",
          "tootsie"
        ],
        "date": "2023-05-04",
        "title": "Tootsie",
        "year": 1982,
        "posterLink": "https://a.ltrbxd.com/resized/sm/upload/gq/ho/hi/3v/ngyCzZwb9y5sMUCig5JQT4Y33Q-0-230-0-345-crop.jpg?v=950beaf70e"
      },
      {
        "correctMovieID": "meet-the-parents",
        "won": true,
        "guessCount": 4,
        "guesses": [
          "doctor-strange-in-the-multiverse-of-madness",
          "wallace-gromit-vengeance-most-fowl",
          "hercules-1997",
          "meet-the-parents"
        ],
        "date": "2021-11-18",
        "title": "Meet the Parents",
        "year": 2000,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/5/0/9/3/7/50937-meet-the-parents-0-230-0-345-crop.jpg?v=238ab9236a"
      },
      {
        "correctMovieID": "tully-2018",
        "won": true,
        "guessCount": 3,
        "guesses": [
          "the-prestige",
          "cruel-intentions",
          "tully-2018"
        ],
        "date": "2021-01-03",
        "title": "Tully",
        "year": 2018,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/3/3/5/3/2/2/335322-tully-0-230-0-345-crop.jpg?v=f899c17c7e"
      },
      {
        "correctMovieID": "columbus-2017",
        "won": true,
        "guessCount": 2,
        "guesses": [
          "a-haunting-in-venice",
          "columbus-2017"
        ],
        "date": "2022-01-09",
        "title": "Columbus",
        "year": 2017,
        "posterLink": "https://a.ltrbxd.com/resized/sm/upload/l1/zo/7p/wc/3ZE5Wl3CdfUH4BkWRmyMKPHkWHx-0-230-0-345-crop.jpg?v=800e4a6439"
      },
      {
        "correctMovieID": "a-star-is-born-2018",
        "won": true,
        "guessCount": 3,
        "guesses": [
          "moonfall",
          "on-the-waterfront",
          "a-star-is-born-2018"
        ],
        "date": "2023-03-28",
        "title": "A Star Is Born",
        "year": 2018,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/2/6/1/1/0/8/261108-a-star-is-born-0-230-0-345-crop.jpg?v=29d345083a"
      },
      {
        "correctMovieID": "what-lies-beneath",
        "won": true,
        "guessCount": 2,
        "guesses": [
          "one-cut-of-the-dead",
          "what-lies-beneath"
        ],
        "date": "2022-09-13",
        "title": "What Lies Beneath",
        "year": 2000,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/5/0/1/6/5/50165-what-lies-beneath-0-230-0-345-crop.jpg?v=38a13e010e"
      },
      {
        "correctMovieID": "holidate",
        "won": false,
        "guessCount": 4,
        "guesses": [
          "maid-in-manhattan",
          "anora",
          "jungle-cruise",
          "a-clockwork-orange"
        ],
        "date": "2021-09-20",
        "title": "Holidate",
        "year": 2020,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/5/4/2/4/6/4/542464-holidate-0-230-0-345-crop.jpg?v=77e889de60"
      },
      {
        "correctMovieID": "the-adventures-of-tintin",
        "won": true,
        "guessCount": 4,
        "guesses": [
          "the-witches-of-eastwick",
          "elephant-2003",
          "cats-2019",
          "the-adventures-of-tintin"
        ],
        "date": "2024-04-11",
        "title": "The Adventures of Tintin",
        "year": 2011,
        "posterLink": "https://a.ltrbxd.com/resized/sm/upload/tx/v5/nk/lz/rLsuszK65hQRl4KHmOtCNYV4kyD-0-230-0-345-crop.jpg?v=9bb0de40a2"
      },
      {
        "correctMovieID": "why-him",
        "won": false,
        "guessCount": 1,
        "guesses": [
          "the-death-of-stalin"
        ],
        "date": "2024-11-12",
        "title": "Why Him?",
        "year": 2016,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/2/8/7/5/0/9/287509-why-him--0-230-0-345-crop.jpg?v=92e9a917a2"
      },
      {
        "correctMovieID": "three-amigos",
        "won": true,
        "guessCount": 5,
        "guesses": [
          "stuart-little-2",
          "the-card-counter",
          "nerve-2016",
          "braindead-1992",
          "three-amigos"
        ],
        "date": "2022-05-22",
        "title": "\u00a1Three Amigos!",
        "year": 1986,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/4/7/7/5/9/47759-three-amigos--0-230-0-345-crop.jpg?v=2a2281ab0f"
      },
      {
        "correctMovieID": "grease",
        "won": false,
        "guessCount": 1,
        "guesses": [
          "austin-powers-in-goldmember"
        ],
        "date": "2022-07-13",
        "title": "Grease",
        "year": 1978,
        "posterLink": "https://a.ltrbxd.com/resized/sm/upload/uw/jl/ie/y3/grease-0-230-0-345-crop.jpg?v=1e90cafd49"
      },
      {
        "correctMovieID": "twilight-2008",
        "won": false,
        "guessCount": 2,
        "guesses": [
          "maxxxine",
          "miss-congeniality-2-armed-and-fabulous"
        ],
        "date": "2023-10-08",
        "title": "Twilight",
        "year": 2008,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/4/7/4/6/9/47469-twilight-0-230-0-345-crop.jpg?v=f347bd6a28"
      },
      {
        "correctMovieID": "dawn-of-the-planet-of-the-apes",
        "won": true,
        "guessCount": 3,
        "guesses": [
          "sherlock-holmes-a-game-of-shadows",
          "dune-2021",
          "dawn-of-the-planet-of-the-apes"
        ],
        "date": "2023-05-24",
        "title": "Dawn of the Planet of the Apes",
        "year": 2014,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/9/4/3/9/4/94394-dawn-of-the-planet-of-the-apes-0-230-0-345-crop.jpg?v=29a00ba752"
      },
      {
        "correctMovieID": "chungking-express",
        "won": true,
        "guessCount": 1,
        "guesses": [
          "chungking-express"
        ],
        "date": "2022-05-26",
        "title": "Chungking Express",
        "year": 1994,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/4/5/6/0/2/45602-chungking-express-0-230-0-345-crop.jpg?v=9475abb05b"
      },
      {
        "correctMovieID": "brave-2012",
        "won": true,
        "guessCount": 1,
        "guesses": [
          "brave-2012"
        ],
        "date": "2022-07-30",
        "title": "Brave",
        "year": 2012,
        "posterLink": "https://a.ltrbxd.com/resized/sm/upload/ct/de/cg/m1/tZhun7eLdyGv9nMJS9YTyOXeOCb-0-230-0-345-crop.jpg?v=31b29a5693"
      },
      {
        "correctMovieID": "iron-man-2008",
        "won": false,
        "guessCount": 3,
        "guesses": [
          "theater-camp-2023",
          "chappie",
          "my-neighbor-totoro"
        ],
        "date": "2024-05-01",
        "title": "Iron Man",
        "year": 2008,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/5/0/8/2/5/50825-iron-man-0-230-0-345-crop.jpg?v=f03c15122c"
      },
      {
        "correctMovieID": "five-feet-apart",
        "won": false,
        "guessCount": 2,
        "guesses": [
          "downfall",
          "the-iron-claw-2023"
        ],
        "date": "2024-08-26",
        "title": "Five Feet Apart",
        "year": 2019,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/4/5/6/8/9/5/456895-five-feet-apart-0-230-0-345-crop.jpg?v=4c06370676"
      },
      {
        "correctMovieID": "lion",
        "won": true,
        "guessCount": 3,
        "guesses": [
          "insidious-chapter-2",
          "night-at-the-museum",
          "lion"
        ],
        "date": "2022-12-10",
        "title": "Lion",
        "year": 2016,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/2/6/3/2/2/2/263222-lion-0-230-0-345-crop.jpg?v=1311804f8d"
      },
      {
        "correctMovieID": "deadpool",
        "won": false,
        "guessCount": 4,
        "guesses": [
          "honey-boy",
          "the-polar-express",
          "fallen-angels",
          "were-the-millers"
        ],
        "date": "2021-07-18",
        "title": "Deadpool",
        "year": 2016,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/2/2/0/5/7/5/220575-deadpool-0-230-0-345-crop.jpg?v=2f726ea9b3"
      },
      {
        "correctMovieID": "iron-man-2",
        "won": true,
        "guessCount": 3,
        "guesses": [
          "lol-2012",
          "annabelle-comes-home",
          "iron-man-2"
        ],
        "date": "2023-02-25",
        "title": "Iron Man 2",
        "year": 2010,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/4/6/5/1/1/46511-iron-man-2-0-230-0-345-crop.jpg?v=67e856ad63"
      },
      {
        "correctMovieID": "secret-window",
        "won": false,
        "guessCount": 5,
        "guesses": [
          "tooth-fairy-2010",
          "close-up",
          "watcher",
          "tinker-tailor-soldier-spy",
          "black-panther"
        ],
        "date": "2021-10-31",
        "title": "Secret Window",
        "year": 2004,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/5/0/9/4/8/50948-secret-window-0-230-0-345-crop.jpg?v=9897cd805f"
      },
      {
        "correctMovieID": "the-sandlot",
        "won": true,
        "guessCount": 1,
        "guesses": [
          "the-sandlot"
        ],
        "date": "2022-09-06",
        "title": "The Sandlot",
        "year": 1993,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/4/5/2/2/0/45220-the-sandlot-0-230-0-345-crop.jpg?v=ab0f1f010f"
      },
      {
        "correctMovieID": "steve-jobs",
        "won": false,
        "guessCount": 5,
        "guesses": [
          "shaolin-soccer",
          "ponyo",
          "an-education",
          "the-boogeyman",
          "the-cabin-in-the-woods"
        ],
        "date": "2023-08-18",
        "title": "Steve Jobs",
        "year": 2015,
        "posterLink": "https://a.ltrbxd.com/resized/sm/upload/ql/1g/sz/63/7SUaf2UgoY0ZRGbQtRlfDkLDBCb-0-230-0-345-crop.jpg?v=867f24dae3"
      },
      {
        "correctMovieID": "herbie-fully-loaded",
        "won": true,
        "guessCount": 2,
        "guesses": [
          "30-days-of-night",
          "herbie-fully-loaded"
        ],
        "date": "2024-08-01",
        "title": "Herbie Fully Loaded",
        "year": 2005,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/4/5/2/9/1/45291-herbie-fully-loaded-0-230-0-345-crop.jpg?v=5afd3c32f9"
      },
      {
        "correctMovieID": "the-book-thief",
        "won": true,
        "guessCount": 2,
        "guesses": [
          "chip-n-dale-rescue-rangers",
          "the-book-thief"
        ],
        "date": "2024-08-05",
        "title": "The Book Thief",
        "year": 2013,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/1/4/5/8/9/1/145891-the-book-thief-0-230-0-345-crop.jpg?v=0051588bae"
      },
      {
        "correctMovieID": "venom-let-there-be-carnage",
        "won": false,
        "guessCount": 5,
        "guesses": [
          "babylon-2022",
          "hot-fuzz",
          "guns-akimbo",
          "milk-2008",
          "allied"
        ],
        "date": "2021-11-17",
        "title": "Venom: Let There Be Carnage",
        "year": 2021,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/5/0/8/6/3/8/508638-venom-let-there-be-carnage-0-230-0-345-crop.jpg?v=553c604246"
      },
      {
        "correctMovieID": "transporter-2",
        "won": true,
        "guessCount": 1,
        "guesses": [
          "transporter-2"
        ],
        "date": "2024-01-18",
        "title": "Transporter 2",
        "year": 2005,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/4/7/2/5/9/47259-transporter-2-0-230-0-345-crop.jpg?v=09524b8073"
      },
      {
        "correctMovieID": "flubber",
        "won": true,
        "guessCount": 2,
        "guesses": [
          "beasts-of-no-nation",
          "flubber"
        ],
        "date": "2024-01-15",
        "title": "Flubber",
        "year": 1997,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/4/7/0/2/6/47026-flubber-0-230-0-345-crop.jpg?v=66fcbe71a8"
      },
      {
        "correctMovieID": "ghost-in-the-shell",
        "won": true,
        "guessCount": 5,
        "guesses": [
          "monster-2023",
          "back-to-black",
          "my-old-ass",
          "time-cut",
          "ghost-in-the-shell"
        ],
        "date": "2022-12-23",
        "title": "Ghost in the Shell",
        "year": 1995,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/4/7/2/7/0/47270-ghost-in-the-shell-0-230-0-345-crop.jpg?v=c837d80ee1"
      },
      {
        "correctMovieID": "can-you-ever-forgive-me",
        "won": true,
        "guessCount": 1,
        "guesses": [
          "can-you-ever-forgive-me"
        ],
        "date": "2022-09-26",
        "title": "Can You Ever Forgive Me?",
        "year": 2018,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/3/3/6/5/5/5/336555-can-you-ever-forgive-me--0-230-0-345-crop.jpg?v=f17a8927c9"
      },
      {
        "correctMovieID": "dances-with-wolves",
        "won": true,
        "guessCount": 5,
        "guesses": [
          "the-love-witch",
          "cloud-atlas",
          "v-h-s",
          "the-twilight-saga-eclipse",
          "dances-with-wolves"
        ],
        "date": "2024-08-10",
        "title": "Dances with Wolves",
        "year": 1990,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/5/1/5/3/9/51539-dances-with-wolves-0-230-0-345-crop.jpg?v=655e740f9b"
      },
      {
        "correctMovieID": "heathers",
        "won": true,
        "guessCount": 4,
        "guesses": [
          "safe-house-2012",
          "the-lorax-2012",
          "monsters-university",
          "heathers"
        ],
        "date": "2022-04-23",
        "title": "Heathers",
        "year": 1989,
        "posterLink": "https://a.ltrbxd.com/resized/film-poster/5/0/1/7/7/50177-heathers-0-230-0-345-crop.jpg?v=dbd1f7062c"
      }    ],
    "totalPlayed": 49,
    "totalWon": 34
  };
// var globalGameStats = JSON.parse(localStorage.getItem('gameStats')) || {
//     games: [],
//     totalPlayed: 0,
//     totalWon: 0
// };

function hasGameBeenPlayed(correctMovieID, stats) {
    if (!stats) return false;
    return stats.games.some(game => game.correctMovieID === correctMovieID);
}

function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return 'th'; // covers 11th-13th
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

function formatDate(isoDate) {
    const date = new Date(isoDate);
    const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
}

// Main function: generate HTML for a given game record
function generateGameHTML(game) {
    const formattedDate = formatDate(game.date);
    const resultText = game.won ? 'won' : 'lost';
    let guessText = `time`;

    // Create a copy of guesses to avoid modifying the original data
    let formattedGuesses = game.guesses.map(guessID => {
        console.log(guessID);
        const movie = moviesData.find(movie => movie.movieID === guessID);
        return movie ? `${movie.title} (${movie.year})` : guessID; // Fallback to ID if not found
    });

    if (formattedGuesses.length > 1) {
        guessText += `s`;
    }

    return `
        <p style="margin-bottom:-1em">On ${formattedDate}, the movie was ${game.title} (${game.year}).</p> 
        <p style="margin-bottom:7px">You ${resultText} and guessed ${game.guessCount} ${guessText}: ${formattedGuesses.join(', ')}.</p>
    `;
}

function setActiveButton(activeButtonID) {
    // Select all buttons inside the header
    const buttons = document.querySelectorAll("#header button");

    buttons.forEach(button => {
        if (button.id === activeButtonID) {
            button.classList.add("active-button");
        } else {
            button.classList.remove("active-button");
        }
    });
}


function displayHistory() {
    const modalContentDiv = document.getElementById('modalContent');

    modalContentDiv.innerHTML = `<h2>Your Game History</h2>`;
    if (globalGameStats.games.length == 0) {
        modalContentDiv.innerHTML += `<p>You have not played any games yet!</p>`;
    }
    else {
        for (const game of globalGameStats.games) {
            modalContentDiv.innerHTML += generateGameHTML(game);
        }
    }
    setActiveButton("displayHistoryButton");

    // Display the modal
    const modal = document.getElementById('Modal');
    modal.style.display = "block";

    document.getElementById('closeModal').onclick = function () {
        modal.style.display = "none";
        setActiveButton(null);
    };

    // Close the modal if user clicks anywhere outside the modal content
    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = "none";
            setActiveButton(null);
        }
    };

}


function displayStats() {
    makeButtonActive('displayHistoryButton');
    const modalContentDiv = document.getElementById('modalContent');
    modalContentDiv.innerHTML = `<h2>Your Stats</h2>`;

    if (globalGameStats.games.length === 0) {
        modalContentDiv.innerHTML += `<p>You have not played any games yet!</p>`;
    }
    else {
        const winPct = calculateWinPercentage(globalGameStats);
        const avgGuesses = calculateAverageGuessCount(globalGameStats);
        const currentStreak = calculateCurrentStreak(globalGameStats);
        const mostGuessed = getMostGuessedMovie(globalGameStats);


        modalContentDiv.innerHTML += `<p>You've played ${globalGameStats.totalPlayed} games and won ${globalGameStats.totalWon} of them which gives you a win percentage of ${Math.round(winPct)}%.</p>`;
        modalContentDiv.innerHTML += `<p>When you win, you get it on the ${avgGuesses.toFixed(2)}th guess on average.</p>`;
        modalContentDiv.innerHTML += `<p>You are on a  ${currentStreak.streak} ${currentStreak.type} streak.</p>`;
        if (mostGuessed){
            modalContentDiv.innerHTML += `<p>The movie you've guessed the most is ${mostGuessed}.</p>`;

        }
    }
    setActiveButton("displayStatsButton");

    // Display the modal
    const modal = document.getElementById('Modal');
    modal.style.display = "block";

    document.getElementById('closeModal').onclick = function () {
        modal.style.display = "none";
        setActiveButton(null);

    };

    // Close the modal if user clicks anywhere outside the modal content
    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = "none";
            setActiveButton(null);
        }
    };
}
// ---------------------------
// Starter functions (e.g., filtering, displaying, game logic)
// ---------------------------
function filterMovies() {
    const searchQuery = document.getElementById('search').value.toLowerCase();
    if (searchQuery === '') {
        clearSearchAndMovieList();
        return;
    }
    const filteredMovies = moviesData.filter(movie => {
        const regex = new RegExp(`\\b${searchQuery}`, 'i');
        return regex.test(movie.title.toLowerCase());
    });
    displayMovieList(filteredMovies);
}

function displayMovieList(movies) {
    const movieListElement = document.getElementById('movieList');
    movieListElement.innerHTML = '';
    movies.slice(0, maxMoviesToShow).forEach(movie => {
        const listItem = document.createElement('li');
        listItem.textContent = `${movie.title} (${movie.year})`;
        listItem.onclick = () => selectMovie(movie.movieID);
        movieListElement.appendChild(listItem);
    });
}

function selectMovie(guessedMovieID) {
    collectedGuessesArray.push(guessedMovieID);
    const guessedMovie = moviesData.find(movie => movie.movieID === guessedMovieID);
    const correctMovie = moviesData.find(movie => movie.movieID === correctMovieID);
    const isCorrectMovie = guessedMovieID === correctMovieID;

    const textDisplay = document.getElementById('textDisplay');
    if (isCorrectMovie) {
        textDisplay.innerHTML = `<a href="https://letterboxd.com/film/${guessedMovieID}" style="text-decoration:none; color:white;" target="_blank">
            You got it! ${guessedMovie.title} (${guessedMovie.year}) is the correct movie.
        </a>`;
        finishGame();
    } else {
        incorrectGuessCount++;
        let guessString = (maxIncorrectGuesses - incorrectGuessCount === 1) ? "1 guess" : `${maxIncorrectGuesses - incorrectGuessCount} guesses`;
        textDisplay.innerHTML = `<a href="https://letterboxd.com/film/${guessedMovieID}" style="text-decoration:none; color:white;" target="_blank">
            Wrong! ${guessedMovie.title} (${guessedMovie.year}) is not the correct movie. You have ${guessString} left. Switch between reviews to get more info!
        </a>`;
        clearSearchAndMovieList();
        if (incorrectGuessCount < maxIncorrectGuesses) {
            reviewImages = allImages.slice(0, incorrectGuessCount + 1);
            reviewTexts = allText.slice(0, incorrectGuessCount + 1);
            updateImageButtons();
            displayCurrentImage(incorrectGuessCount + 1);
        } else {
            textDisplay.innerHTML = `<a href="https://letterboxd.com/film/${correctMovieID}" style="text-decoration:none; color:white;" target="_blank">
                You lost! The correct movie is ${correctMovie.title} (${correctMovie.year}).
            </a>`;
            finishGame();
        }
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);
    }
}

function calculateWinPercentage(stats) {
    const total = stats.games.length;
    if (total === 0) return 0;
    let wins = 0;
    for (const game of stats.games) {
        if (game.won) wins++;
    }
    return (wins / total) * 100;
}

function calculateAverageGuessCount(stats) {
    let totalGuesses = 0;
    let winCount = 0;
    for (const game of stats.games) {
        if (game.won) {
            winCount++;
            totalGuesses += game.guessCount;
        }
    }
    return winCount === 0 ? 0 : totalGuesses / winCount;
}
function calculateCurrentStreak(stats) {
    if (stats.games.length === 0) return { streak: 0, type: "none" };

    let streak = 0;
    // Determine the result (win or loss) of the most recent game.
    const mostRecentResult = stats.games[stats.games.length - 1].won;
    const streakType = mostRecentResult ? "win" : "loss";

    // Traverse the games array backwards.
    for (let i = stats.games.length - 1; i >= 0; i--) {
        if (stats.games[i].won === mostRecentResult) {
            streak++;
        } else {
            break;
        }
    }

    return { streak, type: streakType };
}

function getMostGuessedMovie(stats) {
    const frequency = {};
    let mostGuessed = null;
    let maxCount = 0;

    for (const game of stats.games) {
        for (const guess of game.guesses) {
            frequency[guess] = (frequency[guess] || 0) + 1;
            if (frequency[guess] > maxCount) {
                maxCount = frequency[guess];
                mostGuessed = guess;
            }
        }
    }
    const mostGuessedMovie = moviesData.find(movie => movie.movieID === mostGuessed);
    if (maxCount === 1 || !mostGuessedMovie) return null;
    return `${mostGuessedMovie.title} (${mostGuessedMovie.year})`;
}

function updateGameStats(currentGame) {
    let stats = localStorage.getItem('gameStats');
    stats = stats ? JSON.parse(stats) : {
        games: [],
        totalPlayed: 0,
        totalWon: 0
    };

    stats.games.push(currentGame);
    stats.totalPlayed += 1;
    if (currentGame.won) {
        stats.totalWon += 1;
    }
    localStorage.setItem('gameStats', JSON.stringify(stats));
    globalGameStats = stats;
}

function finishGame() {
    clearSearchAndMovieList();
    if (incorrectGuessCount < maxIncorrectGuesses) {
        reviewImages = allImages.slice(0, maxIncorrectGuesses);
        reviewTexts = allText.slice(0, maxIncorrectGuesses);
        updateImageButtons();
    }
    gameOver = true;
    multiButton.remove();
    imageButtonsContainer.style.marginRight = "0px";
    document.getElementById('search').remove();

    const img = document.createElement('img');
    const correctMovie = moviesData.find(movie => movie.movieID === correctMovieID);
    img.src = correctMovie.posterLink;
    img.alt = `${correctMovie.title} (${correctMovie.year}) movie poster`;
    const existingDiv = document.getElementById('movie_poster');
    if (existingDiv) {
        existingDiv.innerHTML = '';
        existingDiv.appendChild(img);
    } else {
        console.error('Div with specified ID not found.');
    }
    existingDiv.setAttribute("href", "https://letterboxd.com/film/" + correctMovieID);
    existingDiv.setAttribute("target", "_blank");
    const parent = document.getElementById('content-wrap');
    const div1 = document.getElementById('movie_container');
    parent.appendChild(div1);
    document.getElementById('search-row').style.margin = "0px";

    if (!hasGameBeenPlayed(correctMovieID, globalGameStats)) {
        const currentGame = {
            correctMovieID: correctMovieID,
            won: (incorrectGuessCount < maxIncorrectGuesses),
            guessCount: collectedGuessesArray.length,
            guesses: collectedGuessesArray,
            date: new Date().toISOString().split('T')[0],
            title: correctMovie.title,
            year: correctMovie.year,
            posterLink: correctMovie.posterLink
        };
        updateGameStats(currentGame);
    }
}

function pressButton() {
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    if (gameOver) {
        location.reload();
    } else {
        incorrectGuessCount++;
        clearSearchAndMovieList();
        if (incorrectGuessCount < maxIncorrectGuesses) {
            reviewImages = allImages.slice(0, incorrectGuessCount + 1);
            reviewTexts = allText.slice(0, incorrectGuessCount + 1);
            updateImageButtons();
            displayCurrentImage(incorrectGuessCount + 1);
            let guessString = (maxIncorrectGuesses - incorrectGuessCount === 1) ? "1 guess" : `${maxIncorrectGuesses - incorrectGuessCount} guesses`;
            document.getElementById('textDisplay').innerHTML = `<a style="text-decoration:none; color:white;" target="_blank">
                You skipped! You have ${guessString} left. Switch between reviews to get more info!
            </a>`;
        } else {
            const correctMovie = moviesData.find(movie => movie.movieID === correctMovieID);
            document.getElementById('textDisplay').innerHTML = `<a href="https://letterboxd.com/film/${correctMovieID}" style="text-decoration:none; color:white;" target="_blank">
                You lost! The correct movie is ${correctMovie.title} (${correctMovie.year}).
            </a>`;
            finishGame();
        }
    }
}

function clearSearchAndMovieList() {
    document.getElementById('search').value = '';
    document.getElementById('movieList').innerHTML = '';
}

async function fetchImages(movieID, date, index) {
    try {
        const response1 = await fetch(`/images?date=${date}&name=${movieID}&index=${index}`);
        const response2 = await fetch(`/text?date=${date}&name=${movieID}&index=${index}`);
        if (response1.status === 404 || response2.status === 404) return;
        const blob1 = await response1.blob();
        const blob2 = await response2.text();
        const imageUrl = URL.createObjectURL(blob1);
        allImages.push(imageUrl);
        allText.push(blob2);
        if (index === 0) {
            reviewImages.push(imageUrl);
            reviewTexts.push(blob2);
        }
        updateImageButtons();
        displayCurrentImage();
    } catch (error) {
        console.error('Error fetching image/text:', error);
    }
}

async function fetchAllImagesSequentially(movieID, date) {
    for (let i = 0; i < maxIncorrectGuesses; i++) {
        await fetchImages(movieID, date, i);
    }
}

function displayCurrentImage(index = 1) {
    const reviewContainer = document.getElementById('reviewContainer');
    reviewContainer.innerHTML = '';
    if (reviewImages.length > 0) {
        const img = document.createElement('img');
        const correctMovie = moviesData.find(movie => movie.movieID === correctMovieID);
        img.alt = `Review: ${reviewTexts[index - 1]}`;
        img.id = 'reviewImage';
        img.src = reviewImages[index - 1];
        reviewContainer.appendChild(img);
    }
}

function makeButtonActive(index) {
    const buttons = document.querySelectorAll('#imageButtons button');
    buttons.forEach(button => {
        button.classList.toggle('active', button.textContent == index);
    });
}

function updateImageButtons() {
    imageButtonsContainer.innerHTML = '';
    reviewImages.forEach((image, index) => {
        const button = document.createElement('button');
        button.textContent = index + 1;
        button.onclick = () => {
            displayCurrentImage(button.textContent);
            makeButtonActive(button.textContent);
        };
        imageButtonsContainer.appendChild(button);
    });
    makeButtonActive(incorrectGuessCount + 1);
}

// ---------------------------
// Initialize the game (all starter logic here)
// ---------------------------
document.addEventListener('DOMContentLoaded', async function initializeGame() {
    try {
        // Load CSV file and parse movie data
        const csvResponse = await fetch('movies.csv');
        const csvText = await csvResponse.text();
        Papa.parse(csvText, {
            header: true,
            complete: results => {
                moviesData = results.data
                    .map(row => {
                        let selectedRow = {};
                        selectedColumns.forEach(col => {
                            selectedRow[col] = row[col];
                        });
                        return selectedRow;
                    })
                    .filter(row =>
                        Object.values(row).every(value => value !== undefined && value !== null && value !== "")
                    );
            }
        });

        // Fetch movie info
        const response = await fetch('/get-movie');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        correctMovieID = data.movie;
        correctMovieDate = data.date;

        // Fetch all images and text for the movie
        await fetchAllImagesSequentially(correctMovieID, correctMovieDate);

        // Check if this game has already been played.
        if (hasGameBeenPlayed(correctMovieID, globalGameStats)) {
            finishGame();
        } else {
            const textDisplay = document.getElementById('textDisplay');
            textDisplay.innerHTML = `<a style="color:white;">You have ${maxIncorrectGuesses} tries to guess the movie. For every incorrect guess, you'll get a new review. You can switch between reviews. Search and click on a movie to submit it. Good luck!</a>`;
        }
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});
