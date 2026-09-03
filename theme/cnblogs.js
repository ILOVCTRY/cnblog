/* CNB Notes theme. Load config.js before this file. */
(function () {
  'use strict';
  var cfg = window.CNB_THEME_CONFIG || {};
  var root = document.documentElement;
  var copyText = cfg.copyText || '复制';
  var copiedText = cfg.copiedText || '已复制';
  var scrollOffset = cfg.scrollOffset || 80;

  /* Theme: first visit follows system, then localStorage */
  var saved = localStorage.getItem('cn-theme');
  if (!saved) saved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-cn-theme', saved);

  if (cfg.wallpaper) root.style.setProperty('--cn-wallpaper', 'url("' + cfg.wallpaper.replace(/"/g, '\\"') + '")');

  /* Brand text */
  var brand = document.querySelector('.cn-theme-brand');
  if (brand) brand.textContent = cfg.blogName || document.title;

  /* Nav links */
  var nav = document.querySelector('.cn-theme-nav');
  (cfg.links || []).forEach(function (item) {
    if (!nav || !item.href || !item.text) return;
    var a = document.createElement('a');
    a.href = item.href;
    a.textContent = item.text;
    nav.appendChild(a);
  });

  /* Theme toggle */
  var toggle = document.getElementById('cn-theme-toggle');
  if (toggle) toggle.addEventListener('click', function () {
    var next = root.getAttribute('data-cn-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-cn-theme', next);
    localStorage.setItem('cn-theme', next);
  });

  /* Back to top + reading progress (debounced) */
  var top = document.getElementById('cn-back-to-top');
  var progress = document.getElementById('cn-reading-progress');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || 0;
    if (top) top.classList.toggle('is-visible', y > 360);
    if (progress && cfg.showReadingProgress !== false) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? Math.min(100, y / h * 100) : 0) + '%';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();
  if (top) top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* Code copy */
  if (cfg.codeCopy !== false && navigator.clipboard) {
    document.querySelectorAll('.postBody pre').forEach(function (pre) {
      var button = document.createElement('button');
      button.className = 'cn-copy-code';
      button.type = 'button';
      button.textContent = copyText;
      button.addEventListener('click', function () {
        var code = pre.querySelector('code');
        navigator.clipboard.writeText((code || pre).innerText).then(function () {
          button.textContent = copiedText;
          setTimeout(function () { button.textContent = copyText; }, 1200);
        });
      });
      pre.appendChild(button);
    });
  }

  /* Image lightbox */
  if (cfg.imagePreview !== false) {
    document.querySelectorAll('.postBody img').forEach(function (img) {
      img.addEventListener('click', function () {
        var mask = document.createElement('div');
        mask.className = 'cn-image-mask';
        var full = document.createElement('img');
        full.src = img.currentSrc || img.src;
        full.alt = img.alt || '';
        mask.appendChild(full);
        mask.addEventListener('click', function () { mask.remove(); });
        document.body.appendChild(mask);
      });
    });
  }

  /* TOC */
  var toc = document.getElementById('cn-post-toc');
  var maxLevel = cfg.tocMaxLevel || 3;
  var selectors = [];
  for (var l = 2; l <= maxLevel; l++) selectors.push('#post_detail .postBody h' + l);
  var headings = Array.prototype.slice.call(document.querySelectorAll(selectors.join(',')));

  if (toc && cfg.showToc !== false && headings.length) {
    toc.hidden = false;
    var title = document.createElement('p');
    title.className = 'cn-post-toc__title';
    title.textContent = '目录';
    toc.appendChild(title);

    var links = headings.map(function (h, i) {
      if (!h.id) h.id = 'cn-heading-' + i;
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      a.style.paddingLeft = (h.tagName === 'H3' ? '12px' : h.tagName === 'H4' ? '24px' : '0');
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var target = h.getBoundingClientRect().top + window.scrollY - scrollOffset;
        window.scrollTo({ top: target, behavior: 'smooth' });
        history.replaceState(null, '', '#' + h.id);
      });
      toc.appendChild(a);
      return { h: h, a: a };
    });

    function updateToc() {
      var active = links[0];
      links.forEach(function (x) { if (x.h.getBoundingClientRect().top < 120) active = x; });
      links.forEach(function (x) { x.a.classList.toggle('is-active', x === active); });
    }
    var tocTicking = false;
    window.addEventListener('scroll', function () {
      if (!tocTicking) { window.requestAnimationFrame(updateToc); tocTicking = true; }
    }, { passive: true });
    updateToc();
  }
})();
