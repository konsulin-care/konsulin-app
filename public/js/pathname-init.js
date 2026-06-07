(function () {
  try {
    sessionStorage.setItem(
      'konsulin_initial_pathname',
      window.location.pathname
    );
    sessionStorage.removeItem('konsulin_reload_anonymous_done');
  } catch (e) {} // eslint-disable-line
})();
