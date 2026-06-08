(function () {
  try {
    sessionStorage.setItem(
      'konsulin_initial_pathname',
      globalThis.location.pathname
    );
    sessionStorage.removeItem('konsulin_reload_anonymous_done');
  } catch {
    /* empty - sessionStorage may be unavailable */
  }
})();
