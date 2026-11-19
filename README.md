# 🎬 Movie Log

A simple site to keep a list of movies you've watched. Light, glassy theme on a solid background (no gradients), hardcoded login for now, local storage now / MariaDB later.

## Run it

Just open **`index.html`** in your browser (double-click it).

> Tip: for the closest match to how it'll behave with a real backend, serve the
> folder instead of using `file://` — e.g. from this folder run
> `python -m http.server 8080` and visit `http://localhost:8080`.

## Browsing & logging in

The list is **open to everyone** — the portal loads without logging in. You only
need to log in (top-right **Log in** button) to **add** movies or remove your own.

Two hardcoded demo users (password = username):

| Username | Password |
|----------|----------|
| `samip`  | `samip`  |
| `jason`  | `jason`  |

## Features

- **Recently added** row on load, with brief details.
- Each movie records **title, release date, IMDb rating, category, and who added it** (set automatically to the signed-in user).
- Rate **what you thought** on a 👎–👍 slider when adding; movies you loved (slider ≥ 75) get a **👍 Recommended** tag.
- Add **cast** members one at a time (with **autocomplete** suggesting actors already in your collection); cast appears on each card, and you can **search by actor** or **click a name to browse** everything they're in.
- **Smart browsing:** live title search, category chips with live counts, and sort by *recently added / highest rated / newest release / A–Z*.
- Remove movies you added (hover a card).
- Comes seeded with a few movies so it isn't empty on first run.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Markup for the login screen, app, and add-movie modal. |
| `styles.css` | The glassy light theme (solid background). **No gradients** — solid colour + transparency + blur only. |
| `store.js`   | **Data layer.** The one file you swap for MariaDB. |
| `auth.js`    | Hardcoded login (swap for a real backend later). |
| `app.js`     | UI logic — talks only to `Store` and `Auth`. |
| `schema.sql` | MariaDB tables, ready for when you add a backend. |

## Moving to MariaDB later

Data is kept in the browser's `localStorage` for now, but the app is built so the
switch is clean:

1. Create the database with `mysql -u root -p < schema.sql`.
2. Build a tiny backend (e.g. Node + Express + `mysql2`) exposing:
   - `GET  /api/movies`
   - `POST /api/movies`
   - `DELETE /api/movies/:id`
   - `POST /api/login`
3. In **`store.js`**, replace the `localStorage` bodies with `fetch()` calls —
   the methods already return Promises, so **nothing in `app.js` changes**:

   ```js
   const Store = {
     getMovies() { return fetch('/api/movies').then(r => r.json()); },
     addMovie(m) { return fetch('/api/movies', {
       method: 'POST', headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(m)
     }).then(r => r.json()); },
     deleteMovie(id) { return fetch('/api/movies/' + id, { method: 'DELETE' }).then(() => true); }
   };
   ```

4. In **`auth.js`**, replace `login()` with a call to `POST /api/login` that checks
   a **hashed** password in the `users` table.

> ⚠️ The current login is client-side only and **not secure** — fine for local/demo
> use, but real authentication needs the backend step above.
