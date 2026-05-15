(function() {
  var btn = document.getElementById('theme-toggle');
  var iconEl = document.getElementById('theme-icon');

  function isDark() {
    return document.documentElement.classList.contains('theme-dark');
  }

  function apply(dark) {
    document.documentElement.className = dark ? 'theme-dark' : 'theme-light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    if (iconEl) iconEl.textContent = dark ? '☀' : '☾';
  }

  if (!btn || !iconEl) return;

  iconEl.textContent = isDark() ? '☀' : '☾';
  btn.addEventListener('click', function() {
    apply(!isDark());
  });
})();
