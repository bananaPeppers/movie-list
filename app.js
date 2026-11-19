/* ===========================================================
   app.js — all UI logic. Talks only to window.Store and
   window.Auth, so swapping the data/auth layers never touches
   this file.
   =========================================================== */
(function () {
  'use strict';

  const GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
    'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'Other'];
  const CUSTOM_VALUE = '__custom__';
  const RECOMMEND_AT = 75; // slider value (0–100) at/above which a movie gets the "Recommended" tag

  let allMovies = [];
  let draftCast = [];               // cast members being entered in the Add-movie form
  const state = { search: '', genre: 'All', sort: 'recent', cast: null };

  const el = (id) => document.getElementById(id);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- small helpers ----------
  function yearOf(dateStr) {
    if (!dateStr) return '';
    const m = /^(\d{4})/.exec(dateStr);
    return m ? m[1] : dateStr;
  }
  function ratingBadge(r) {
    if (r == null || r === '' || isNaN(r)) return '<span class="rating-badge unrated">Not rated</span>';
    return '<span class="rating-badge"><span class="star">★</span>' + Number(r).toFixed(1) + '</span>';
  }

  // Maps the 0–100 opinion slider to an emoji + words (and whether it's a recommendation).
  function opinionMeta(v) {
    v = Number(v);
    if (isNaN(v)) return { emoji: '🙂', text: 'It was okay', recommend: false };
    if (v < 25) return { emoji: '👎', text: "Didn't like it", recommend: false };
    if (v < 50) return { emoji: '😕', text: 'It was okay', recommend: false };
    if (v < RECOMMEND_AT) return { emoji: '🙂', text: 'Pretty good', recommend: false };
    return { emoji: '👍', text: 'Loved it — recommend!', recommend: true };
  }

  // ---------- auth UI ----------
  // The portal is always visible; this just toggles the top-bar controls.
  function updateAuthUI() {
    const user = Auth.current();
    const loggedIn = !!user;
    el('user-chip').hidden = !loggedIn;
    el('add-movie-btn').hidden = !loggedIn;
    el('logout-btn').hidden = !loggedIn;
    el('login-btn').hidden = loggedIn;
    if (loggedIn) el('current-user').textContent = user;
  }

  function openLogin() {
    el('login-form').reset();
    el('login-error').hidden = true;
    el('login-modal').hidden = false;
    setTimeout(() => el('login-username').focus(), 50);
  }
  function closeLogin() { el('login-modal').hidden = true; }

  async function refresh() {
    allMovies = await Store.getMovies();
    renderRecent();
    renderChips();
    renderActiveCast();
    renderGrid();
  }

  // ---------- card builder ----------
  function createCard(m, currentUser) {
    const card = document.createElement('article');
    card.className = 'glass card';

    const year = yearOf(m.releaseDate);
    const rec = m.opinion != null && Number(m.opinion) >= RECOMMEND_AT;
    const cast = Array.isArray(m.cast) ? m.cast.filter(Boolean) : [];

    card.innerHTML =
      '<div class="card-top">' +
        '<h3 class="title">' + esc(m.name) + '</h3>' +
        ratingBadge(m.imdbRating) +
      '</div>' +
      '<div class="meta">' +
        (year ? '<span class="year">' + esc(year) + '</span>' : '') +
        (m.genre ? '<span class="genre-tag">' + esc(m.genre) + '</span>' : '') +
        (rec ? '<span class="rec-tag">👍 Recommended</span>' : '') +
      '</div>' +
      (cast.length ? '<div class="cast-row"></div>' : '') +
      '<div class="card-foot">' +
        '<span class="added-by">Added by ' + esc(m.addedBy || 'unknown') + '</span>' +
      '</div>';

    // Cast pills — click one to browse everything that actor is in.
    if (cast.length) {
      const row = card.querySelector('.cast-row');
      cast.slice(0, 3).forEach((name) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cast-pill';
        b.textContent = name;
        b.title = 'Browse movies with ' + name;
        b.addEventListener('click', () => filterByCast(name));
        row.appendChild(b);
      });
      if (cast.length > 3) {
        const more = document.createElement('span');
        more.className = 'cast-more';
        more.textContent = '+' + (cast.length - 3);
        row.appendChild(more);
      }
    }

    // You can remove movies you added.
    if (m.addedBy === currentUser) {
      const del = document.createElement('button');
      del.className = 'card-del';
      del.textContent = 'Remove';
      del.setAttribute('aria-label', 'Remove ' + m.name);
      del.addEventListener('click', async () => {
        if (confirm('Remove "' + m.name + '" from your list?')) {
          await Store.deleteMovie(m.id);
          await refresh();
        }
      });
      card.querySelector('.card-foot').appendChild(del);
    }
    return card;
  }

  // ---------- renderers ----------
  function renderRecent() {
    const grid = el('recent-grid');
    const user = Auth.current();
    const recent = allMovies.slice().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, 6);
    grid.innerHTML = '';
    if (!recent.length) {
      grid.innerHTML = '<p class="muted">No movies yet — add your first one!</p>';
      return;
    }
    recent.forEach((m) => grid.appendChild(createCard(m, user)));
  }

  function renderChips() {
    const wrap = el('category-chips');
    const counts = {};
    allMovies.forEach((m) => { const g = m.genre || 'Other'; counts[g] = (counts[g] || 0) + 1; });
    const cats = ['All'].concat(Object.keys(counts).sort());

    wrap.innerHTML = '';
    cats.forEach((cat) => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (state.genre === cat ? ' active' : '');
      const count = cat === 'All' ? allMovies.length : counts[cat];
      chip.innerHTML = esc(cat) + ' <span class="count">' + count + '</span>';
      chip.addEventListener('click', () => { state.genre = cat; renderChips(); renderGrid(); });
      wrap.appendChild(chip);
    });
  }

  function filterByCast(name) {
    state.cast = name;
    state.genre = 'All';          // show this actor across every category
    renderChips();
    renderActiveCast();
    renderGrid();
    const browse = el('browse');
    if (browse) browse.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderActiveCast() {
    const box = el('active-cast');
    box.innerHTML = '';
    if (!state.cast) { box.hidden = true; return; }
    box.hidden = false;

    const pill = document.createElement('span');
    pill.className = 'cast-filter';
    pill.innerHTML = 'Cast: <b>' + esc(state.cast) + '</b>';

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'cast-clear';
    clear.textContent = '×';
    clear.setAttribute('aria-label', 'Clear cast filter');
    clear.addEventListener('click', () => { state.cast = null; renderActiveCast(); renderGrid(); });

    pill.appendChild(clear);
    box.appendChild(pill);
  }

  function renderGrid() {
    const grid = el('movie-grid');
    const user = Auth.current();

    let list = allMovies.slice();
    if (state.genre !== 'All') list = list.filter((m) => (m.genre || 'Other') === state.genre);
    if (state.cast) {
      const c = state.cast.toLowerCase();
      list = list.filter((m) => Array.isArray(m.cast) && m.cast.some((x) => String(x).toLowerCase() === c));
    }
    if (state.search) {
      const q = state.search.toLowerCase();
      list = list.filter((m) =>
        String(m.name).toLowerCase().includes(q) ||
        (Array.isArray(m.cast) && m.cast.some((x) => String(x).toLowerCase().includes(q)))
      );
    }
    list.sort((a, b) => {
      switch (state.sort) {
        case 'rating': return (Number(b.imdbRating) || 0) - (Number(a.imdbRating) || 0);
        case 'release': return String(b.releaseDate || '').localeCompare(String(a.releaseDate || ''));
        case 'name': return String(a.name).localeCompare(String(b.name));
        default: return (b.addedAt || 0) - (a.addedAt || 0);
      }
    });

    grid.innerHTML = '';
    list.forEach((m) => grid.appendChild(createCard(m, user)));
    el('empty-state').hidden = list.length > 0;
  }

  // ---------- modal ----------
  function populateGenreSelect() {
    const sel = el('m-genre');
    // Built-in genres plus any categories already in use (including custom ones).
    const all = GENRES.slice();
    allMovies.map((m) => m.genre).filter(Boolean).forEach((g) => {
      if (all.indexOf(g) === -1) all.push(g);
    });
    all.sort((a, b) => a.localeCompare(b));

    sel.innerHTML = '';
    all.forEach((g) => {
      const o = document.createElement('option');
      o.value = g; o.textContent = g;
      sel.appendChild(o);
    });
    const custom = document.createElement('option');
    custom.value = CUSTOM_VALUE;
    custom.textContent = '➕ Add a new category…';
    sel.appendChild(custom);
  }

  function updateOpinionLabel() {
    const meta = opinionMeta(el('m-opinion').value);
    el('opinion-label').textContent = meta.emoji + '  ' + meta.text;
  }

  // ---------- cast entry (Add-movie form) ----------
  let castActive = -1; // highlighted suggestion (-1 = none)

  // Distinct cast names in the collection (the local "db" for now; later a
  // SELECT DISTINCT actor from movie_cast), minus the ones already added here.
  function castPool() {
    const taken = draftCast.map((c) => c.toLowerCase());
    const set = new Set();
    allMovies.forEach((m) => {
      if (Array.isArray(m.cast)) m.cast.forEach((c) => {
        if (c && taken.indexOf(String(c).toLowerCase()) === -1) set.add(String(c));
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function hideCastSuggest() {
    castActive = -1;
    const box = el('cast-suggest');
    box.hidden = true;
    box.innerHTML = '';
  }

  // Suggestions appear ONLY after typing something that matches.
  function renderCastSuggest() {
    const box = el('cast-suggest');
    const q = el('m-cast-input').value.trim().toLowerCase();
    if (!q) { hideCastSuggest(); return; }

    const matches = castPool().filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
    if (!matches.length) { hideCastSuggest(); return; }

    castActive = -1;
    box.innerHTML = '';
    matches.forEach((name) => {
      const li = document.createElement('li');
      li.textContent = name;
      // mousedown fires before the input's blur, so the pick still registers
      li.addEventListener('mousedown', (e) => { e.preventDefault(); addCastMember(name); });
      box.appendChild(li);
    });
    box.hidden = false;
  }

  function moveCastActive(delta) {
    const items = el('cast-suggest').querySelectorAll('li');
    if (!items.length) return;
    castActive = (castActive + delta + items.length) % items.length;
    items.forEach((li, i) => li.classList.toggle('active', i === castActive));
  }

  function renderCastChips() {
    const box = el('cast-chips');
    box.innerHTML = '';
    box.hidden = draftCast.length === 0;
    draftCast.forEach((name, i) => {
      const chip = document.createElement('span');
      chip.className = 'cast-chip';
      chip.appendChild(document.createTextNode(name));
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'x';
      x.textContent = '×';
      x.setAttribute('aria-label', 'Remove ' + name);
      x.addEventListener('click', () => { draftCast.splice(i, 1); renderCastChips(); });
      chip.appendChild(x);
      box.appendChild(chip);
    });
  }

  function addCastMember(raw) {
    const name = String(raw || '').trim();
    el('m-cast-input').value = '';
    hideCastSuggest();
    if (!name) return;
    if (!draftCast.some((c) => c.toLowerCase() === name.toLowerCase())) draftCast.push(name);
    renderCastChips();
    el('m-cast-input').focus();
  }

  function openModal() {
    el('movie-form').reset();
    populateGenreSelect();
    el('custom-genre-wrap').hidden = true;
    draftCast = [];
    renderCastChips();
    hideCastSuggest();
    updateOpinionLabel();
    el('modal').hidden = false;
    setTimeout(() => el('m-name').focus(), 50);
  }
  function closeModal() { el('modal').hidden = true; }

  async function onAddMovie(e) {
    e.preventDefault();
    const name = el('m-name').value.trim();
    if (!name) { el('m-name').focus(); return; }

    let rating = el('m-rating').value;
    rating = rating === '' ? null : Math.max(0, Math.min(10, parseFloat(rating)));

    let genre = el('m-genre').value;
    if (genre === CUSTOM_VALUE) genre = el('m-genre-custom').value.trim() || 'Other';

    // Capture a cast name typed but not yet added.
    if (el('m-cast-input').value.trim()) addCastMember(el('m-cast-input').value);

    await Store.addMovie({
      name: name,
      releaseDate: el('m-date').value || '',
      imdbRating: rating,
      genre: genre,
      opinion: Number(el('m-opinion').value),
      cast: draftCast.slice(),
      addedBy: Auth.current()
    });

    closeModal();
    // Reset filters so the new movie is visible, then refresh.
    state.search = ''; el('search').value = '';
    state.genre = 'All';
    state.cast = null;
    el('sort').value = 'recent'; state.sort = 'recent';
    await refresh();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- boot ----------
  document.addEventListener('DOMContentLoaded', () => {
    // Reveal the free-text box when "Add a new category…" is chosen.
    el('m-genre').addEventListener('change', (e) => {
      const custom = e.target.value === CUSTOM_VALUE;
      el('custom-genre-wrap').hidden = !custom;
      if (custom) setTimeout(() => el('m-genre-custom').focus(), 30);
    });

    // Live label for the opinion slider.
    el('m-opinion').addEventListener('input', updateOpinionLabel);

    // Cast entry: Add button, type-to-filter suggestions, keyboard navigation.
    el('m-cast-add').addEventListener('click', () => addCastMember(el('m-cast-input').value));
    el('m-cast-input').addEventListener('input', renderCastSuggest);
    el('m-cast-input').addEventListener('focus', renderCastSuggest);
    el('m-cast-input').addEventListener('blur', () => setTimeout(hideCastSuggest, 120));
    el('m-cast-input').addEventListener('keydown', (e) => {
      const open = !el('cast-suggest').hidden;
      if (e.key === 'ArrowDown' && open) { e.preventDefault(); moveCastActive(1); }
      else if (e.key === 'ArrowUp' && open) { e.preventDefault(); moveCastActive(-1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const items = el('cast-suggest').querySelectorAll('li');
        if (open && castActive >= 0 && items[castActive]) addCastMember(items[castActive].textContent);
        else addCastMember(el('m-cast-input').value);
      } else if (e.key === 'Escape' && open) {
        e.stopPropagation(); hideCastSuggest(); // close the list, keep the modal open
      }
    });

    // Login modal
    el('login-btn').addEventListener('click', openLogin);
    el('login-cancel').addEventListener('click', closeLogin);
    el('login-modal').addEventListener('click', (e) => { if (e.target === el('login-modal')) closeLogin(); });
    el('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const user = Auth.login(el('login-username').value, el('login-password').value);
      if (user) {
        closeLogin();
        updateAuthUI();
        refresh(); // re-render so the user's own movies get a Remove button
      } else {
        el('login-error').textContent = 'Wrong username or password.';
        el('login-error').hidden = false;
      }
    });

    // Logout
    el('logout-btn').addEventListener('click', () => { Auth.logout(); updateAuthUI(); refresh(); });

    // Add-movie modal (login required)
    el('add-movie-btn').addEventListener('click', () => {
      if (!Auth.current()) { openLogin(); return; }
      openModal();
    });
    el('cancel-btn').addEventListener('click', closeModal);
    el('modal').addEventListener('click', (e) => { if (e.target === el('modal')) closeModal(); });
    el('movie-form').addEventListener('submit', onAddMovie);

    // Esc closes whichever modal is open
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!el('modal').hidden) closeModal();
      else if (!el('login-modal').hidden) closeLogin();
    });

    // Browse controls
    el('search').addEventListener('input', (e) => { state.search = e.target.value.trim(); renderGrid(); });
    el('sort').addEventListener('change', (e) => { state.sort = e.target.value; renderGrid(); });

    // The portal is open to everyone; login only gates adding/removing.
    updateAuthUI();
    refresh();
  });
})();
