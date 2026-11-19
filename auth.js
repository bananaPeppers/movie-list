/* ===========================================================
   auth.js — login for now.

   Credentials are HARDCODED for two users as requested:
     samip / samip   and   jason / jason

   ⚠️ This is client-side only and NOT secure — anyone can read
   these values in the browser. It's fine for local/demo use.
   When you move to MariaDB, replace USERS + login() with a call
   to a backend endpoint that checks a hashed password in the
   `users` table (see db/schema.sql) and returns a session.
   =========================================================== */
(function () {
  'use strict';

  const USERS = {
    samip: 'samip',
    jason: 'jason'
  };

  const SKEY = 'movielog_session_v1';

  const Auth = {
    /** @returns {string|null} the username on success, else null */
    login(username, password) {
      const u = String(username || '').trim().toLowerCase();
      const p = String(password || '');
      if (Object.prototype.hasOwnProperty.call(USERS, u) && USERS[u] === p) {
        try { localStorage.setItem(SKEY, u); } catch (e) { /* ignore */ }
        return u;
      }
      return null;
    },

    logout() {
      try { localStorage.removeItem(SKEY); } catch (e) { /* ignore */ }
    },

    /** @returns {string|null} currently signed-in username */
    current() {
      try { return localStorage.getItem(SKEY); } catch (e) { return null; }
    }
  };

  window.Auth = Auth;
})();
