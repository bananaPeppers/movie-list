/* ===========================================================
   store.js — the DATA LAYER.

   This is the ONE file you swap when you move to MariaDB.
   Every method returns a Promise and the UI only ever calls
   these methods, so replacing the localStorage bodies with
   `fetch('/api/movies')` calls to a backend requires NO changes
   anywhere else. See README.md -> "Moving to MariaDB".

   Movie record shape (matches db/schema.sql columns):
     id          string   unique id
     name        string   title
     releaseDate string   "YYYY-MM-DD"  (-> release_date DATE)
     imdbRating  number   0–10 or null  (-> imdb_rating DECIMAL(3,1))
     genre       string   category      (-> genre)
     opinion     number   0–100 slider  (-> opinion; >=75 shows "Recommended")
     cast        string[] actor names   (-> movie_cast table)
     addedBy     string   username      (-> added_by)
     addedAt     number   epoch ms      (-> added_at DATETIME)
   =========================================================== */
(function () {
  'use strict';

  const KEY = 'movielog_movies_v1';

  function uid() {
    return 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* storage full / blocked */ }
  }

  // Sample library so the app isn't empty on first run.
  // addedAt is set relative to "now" the first time it seeds.
  const SEED = [
    { name: 'Inception',               releaseDate: '2010-07-16', imdbRating: 8.8, genre: 'Sci-Fi',    addedBy: 'samip', opinion: 92, cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page', 'Tom Hardy', 'Cillian Murphy', 'Michael Caine'] },
    { name: 'The Dark Knight',         releaseDate: '2008-07-18', imdbRating: 9.0, genre: 'Action',    addedBy: 'jason', opinion: 96, cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Michael Caine', 'Cillian Murphy'] },
    { name: 'Parasite',                releaseDate: '2019-05-30', imdbRating: 8.5, genre: 'Thriller',  addedBy: 'samip', opinion: 88, cast: ['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong'] },
    { name: 'Spirited Away',           releaseDate: '2001-07-20', imdbRating: 8.6, genre: 'Animation', addedBy: 'jason', opinion: 70, cast: ['Rumi Hiiragi', 'Miyu Irino'] },
    { name: 'The Grand Budapest Hotel',releaseDate: '2014-03-28', imdbRating: 8.1, genre: 'Comedy',    addedBy: 'samip', opinion: 62, cast: ['Ralph Fiennes', 'Tony Revolori', 'Saoirse Ronan'] },
    { name: 'Interstellar',            releaseDate: '2014-11-07', imdbRating: 8.7, genre: 'Sci-Fi',    addedBy: 'jason', opinion: 85, cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'] },
    { name: 'Whiplash',                releaseDate: '2014-10-10', imdbRating: 8.5, genre: 'Drama',     addedBy: 'samip', opinion: 90, cast: ['Miles Teller', 'J.K. Simmons'] },
    { name: 'Get Out',                 releaseDate: '2017-02-24', imdbRating: 7.7, genre: 'Horror',    addedBy: 'jason', opinion: 55, cast: ['Daniel Kaluuya', 'Allison Williams'] },
    { name: 'Knives Out',              releaseDate: '2019-11-27', imdbRating: 7.9, genre: 'Mystery',   addedBy: 'samip', opinion: 66, cast: ['Daniel Craig', 'Ana de Armas', 'Chris Evans'] }
  ];

  function ensureSeed() {
    let list = read();
    if (!Array.isArray(list)) {
      const now = Date.now();
      list = SEED.map((m, i) => Object.assign({}, m, {
        id: uid(),
        addedAt: now - i * 86400000 // stagger by a day so "recently added" has an order
      }));
      write(list);
    }
    return list;
  }

  const Store = {
    /** @returns {Promise<Array>} all movies */
    getMovies() {
      return Promise.resolve(ensureSeed().slice());
    },

    /** @returns {Promise<Object>} the saved record */
    addMovie(movie) {
      const list = ensureSeed();
      const record = Object.assign({ id: uid(), addedAt: Date.now() }, movie);
      list.push(record);
      write(list);
      return Promise.resolve(record);
    },

    /** @returns {Promise<boolean>} */
    deleteMovie(id) {
      const list = ensureSeed().filter(m => m.id !== id);
      write(list);
      return Promise.resolve(true);
    }
  };

  window.Store = Store;
})();
