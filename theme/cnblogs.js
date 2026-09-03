/* CNB Notes theme v2. Load config.js before this file. */
(function () {
  'use strict';
  var cfg = window.CNB_THEME_CONFIG || {};
  var root = document.documentElement;
  var copyText = cfg.copyText || '复制';
  var copiedText = cfg.copiedText || '已复制';
  var scrollOffset = cfg.scrollOffset || 80;

  /* ---- Theme: first visit follows system, then localStorage ---- */
  var saved = localStorage.getItem('cn-theme');
  if (!saved) saved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-cn-theme', saved);

  if (cfg.wallpaper) root.style.setProperty('--cn-wallpaper', 'url("' + cfg.wallpaper.replace(/"/g, '\\"') + '")');

  /* ---- Logo mark: first char of blogName ---- */
  var logoMark = document.querySelector('.cn-theme-logo__mark');
  if (logoMark) {
    if (cfg.logoText) { logoMark.textContent = cfg.logoText; }
    else if (cfg.blogName) { logoMark.textContent = cfg.blogName.charAt(0).toUpperCase(); }
  }

  /* ---- Brand text + subtitle ---- */
  var brand = document.querySelector('.cn-theme-brand');
  if (brand) brand.textContent = cfg.blogName || document.title;
  var sub = document.querySelector('.cn-theme-subtitle');
  if (sub && cfg.subtitle) sub.textContent = cfg.subtitle;

  /* ---- Profile hero ---- */
  var heroName = document.querySelector('.cn-profile-hero__name');
  if (heroName) heroName.textContent = cfg.blogName || 'Blog';
  var heroDesc = document.querySelector('.cn-profile-hero__desc');
  if (heroDesc && cfg.subtitle) heroDesc.textContent = cfg.subtitle;
  var heroAvatar = document.querySelector('.cn-profile-hero__avatar');
  if (heroAvatar && cfg.avatar) {
    var img = document.createElement('img');
    img.src = cfg.avatar; img.alt = cfg.blogName || 'avatar';
    heroAvatar.appendChild(img);
  } else if (heroAvatar && cfg.blogName) {
    heroAvatar.textContent = cfg.blogName.charAt(0).toUpperCase();
  }
  var heroLinks = document.querySelector('.cn-profile-hero__links');
  if (heroLinks && cfg.social) {
    cfg.social.forEach(function (s) {
      if (!s.href || !s.icon) return;
      var a = document.createElement('a');
      a.href = s.href; a.title = s.title || ''; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = s.icon;
      heroLinks.appendChild(a);
    });
  }

  /* ---- Nav links ---- */
  var nav = document.querySelector('.cn-theme-nav');
  (cfg.links || []).forEach(function (item) {
    if (!nav || !item.href || !item.text) return;
    var a = document.createElement('a');
    a.href = item.href; a.textContent = item.text;
    if (item.active) a.classList.add('is-active');
    nav.appendChild(a);
  });

  /* ---- Theme toggle ---- */
  var toggle = document.getElementById('cn-theme-toggle');
  if (toggle) toggle.addEventListener('click', function () {
    var next = root.getAttribute('data-cn-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-cn-theme', next);
    localStorage.setItem('cn-theme', next);
    toggle.style.transform = 'rotate(180deg) scale(1.1)';
    setTimeout(function () { toggle.style.transform = ''; }, 300);
  });

  /* ---- Header scroll shadow ---- */
  var header = document.querySelector('.cn-theme-header');
  var progress = document.getElementById('cn-reading-progress');
  var top = document.getElementById('cn-back-to-top');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || 0;
    if (header) header.classList.toggle('is-scrolled', y > 10);
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

  /* ---- Code copy + language label ---- */
  if (cfg.codeCopy !== false && navigator.clipboard) {
    document.querySelectorAll('.postBody pre').forEach(function (pre) {
      var button = document.createElement('button');
      button.className = 'cn-copy-code'; button.type = 'button'; button.textContent = copyText;
      button.addEventListener('click', function () {
        var code = pre.querySelector('code');
        navigator.clipboard.writeText((code || pre).innerText).then(function () {
          button.textContent = copiedText;
          setTimeout(function () { button.textContent = copyText; }, 1200);
        });
      });
      pre.appendChild(button);

      /* language label */
      var codeEl = pre.querySelector('code');
      if (codeEl) {
        var cls = codeEl.className || '';
        var m = cls.match(/(?:brush:|language-)(\w+)/) || cls.match(/\b(\w+)\b/);
        if (m && m[1]) {
          var label = document.createElement('span');
          label.className = 'cn-code-lang'; label.textContent = m[1];
          pre.appendChild(label);
        }
      }
    });
  }

  /* ---- Image lightbox ---- */
  if (cfg.imagePreview !== false) {
    document.querySelectorAll('.postBody img').forEach(function (img) {
      img.addEventListener('click', function () {
        var mask = document.createElement('div');
        mask.className = 'cn-image-mask';
        var full = document.createElement('img');
        full.src = img.currentSrc || img.src; full.alt = img.alt || '';
        mask.appendChild(full);
        mask.addEventListener('click', function () { mask.remove(); });
        document.body.appendChild(mask);
      });
    });
  }

  /* ---- TOC ---- */
  var toc = document.getElementById('cn-post-toc');
  var maxLevel = cfg.tocMaxLevel || 3;
  var selectors = [];
  for (var l = 2; l <= maxLevel; l++) selectors.push('#post_detail .postBody h' + l);
  var headings = Array.prototype.slice.call(document.querySelectorAll(selectors.join(',')));

  if (toc && cfg.showToc !== false && headings.length) {
    toc.hidden = false;
    var title = document.createElement('p');
    title.className = 'cn-post-toc__title'; title.textContent = '目录';
    toc.appendChild(title);

    var links = headings.map(function (h, i) {
      if (!h.id) h.id = 'cn-heading-' + i;
      var a = document.createElement('a');
      a.href = '#' + h.id; a.textContent = h.textContent;
      a.style.paddingLeft = (h.tagName === 'H3' ? '16px' : h.tagName === 'H4' ? '28px' : '6px');
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

  /* ---- Cover image resolution ---- */
  var coverPool = window.CNB_COVER_POOL || [];
  var coverMap = window.CNB_COVER_MAP || {};
  var quotes = window.CNB_QUOTES || [];
  var gradients = [
    'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
    'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
    'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
    'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)',
    'linear-gradient(135deg,#fa709a 0%,#fee140 100%)',
    'linear-gradient(135deg,#30cfd0 0%,#330867 100%)',
    'linear-gradient(135deg,#a8edea 0%,#fed6e3 100%)',
    'linear-gradient(135deg,#5ee7df 0%,#b49093 100%)'
  ];
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return Math.abs(h);
  }
  function getCoverUrl(title, bodyHTML) {
    if (coverMap[title]) return coverMap[title];
    if (bodyHTML) {
      var m1 = bodyHTML.match(/<!--cover:\s*(.*?)\s*-->/i);
      if (m1) return m1[1];
      var m2 = bodyHTML.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (m2) return m2[1];
    }
    if (coverPool.length) return coverPool[hashStr(title) % coverPool.length];
    return null;
  }

  /* ---- Split posts from .day into cover cards ---- */
  var forFlow = document.querySelector('.forFlow');
  if (forFlow) {
    var days = Array.prototype.slice.call(forFlow.querySelectorAll('.day'));
    days.forEach(function (day) {
      var dateText = '';
      var dayTitle = day.querySelector('.dayTitle');
      if (dayTitle) { dateText = dayTitle.textContent.trim(); dayTitle.remove(); }
      var titles = Array.prototype.slice.call(day.querySelectorAll('.postTitle'));
      titles.forEach(function (el) {
        var con = el.nextElementSibling;
        while (con && !con.classList.contains('postCon') && !con.classList.contains('postTitle')) con = con.nextElementSibling;
        if (!con || !con.classList.contains('postCon')) return;
        var desc = con.nextElementSibling;
        while (desc && !desc.classList.contains('postDesc') && !desc.classList.contains('postTitle')) desc = desc.nextElementSibling;
        if (desc && !desc.classList.contains('postDesc')) desc = null;

        var titleText = el.textContent.trim();
        var bodyHTML = con.innerHTML;
        var coverUrl = getCoverUrl(titleText, bodyHTML);
        var card = document.createElement('article');
        card.className = 'cn-post-card cn-reveal';

        /* cover */
        var cover = document.createElement('div');
        cover.className = 'cn-post-card__cover';
        if (coverUrl) {
          cover.style.setProperty('--cn-card-cover', 'url("' + coverUrl.replace(/"/g, '\\"') + '")');
        } else {
          cover.style.setProperty('--cn-card-grad', gradients[hashStr(titleText) % gradients.length]);
        }
        if (dateText) {
          var dateEl = document.createElement('span');
          dateEl.className = 'cn-post-card__date';
          dateEl.textContent = dateText;
          cover.appendChild(dateEl);
        }
        var titleEl = document.createElement('h3');
        titleEl.className = 'cn-post-card__title';
        titleEl.innerHTML = el.innerHTML;
        cover.appendChild(titleEl);
        card.appendChild(cover);

        /* body */
        var body = document.createElement('div');
        body.className = 'cn-post-card__body';
        body.appendChild(con);
        if (desc) body.appendChild(desc);
        card.appendChild(body);

        forFlow.insertBefore(card, day);
      });
      day.remove();
    });
  }

  /* ---- Article detail page hero banner ---- */
  var postDetail = document.getElementById('post_detail');
  if (postDetail) {
    var detailTitle = postDetail.querySelector('.postTitle');
    var detailBody = postDetail.querySelector('.postBody');
    if (detailTitle) {
      var detailTitleText = detailTitle.textContent.trim();
      var detailBodyHTML = detailBody ? detailBody.innerHTML : '';
      var heroCover = getCoverUrl(detailTitleText, detailBodyHTML);

      var hero = document.createElement('div');
      hero.className = 'cn-article-hero';
      if (heroCover) {
        hero.style.setProperty('--cn-hero-cover', 'url("' + heroCover.replace(/"/g, '\\"') + '")');
      } else {
        hero.style.setProperty('--cn-hero-grad', gradients[hashStr(detailTitleText) % gradients.length]);
      }

      var heroTitle = document.createElement('h1');
      heroTitle.className = 'cn-article-hero__title';
      heroTitle.textContent = detailTitleText;
      hero.appendChild(heroTitle);

      if (quotes.length) {
        var heroQuote = document.createElement('p');
        heroQuote.className = 'cn-article-hero__quote';
        heroQuote.textContent = quotes[Math.floor(Math.random() * quotes.length)];
        hero.appendChild(heroQuote);
      }

      postDetail.insertBefore(hero, postDetail.firstChild);
      detailTitle.style.display = 'none';
    }
  }

  /* ---- Scroll reveal: post cards + sidebar ---- */
  if (cfg.scrollReveal !== false) {
    var revealEls = document.querySelectorAll('.cn-post-card, .cn-profile-hero, .sidebar-block, .newsItem, .catListComment, .catListView, .catListTag, .catListPostCategory');
    revealEls.forEach(function (el) { el.classList.add('cn-reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
    /* fallback: if IntersectionObserver not supported, show all */
    if (!('IntersectionObserver' in window)) revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---- Footer ---- */
  var footer = document.querySelector('.cn-theme-footer__year');
  if (footer) footer.textContent = new Date().getFullYear();

  /* ---- Search (Ctrl+K) ---- */
  var searchBtn = document.querySelector('.cn-theme-search');
  if (searchBtn) {
    searchBtn.addEventListener('click', function () {
      var q = prompt('搜索文章...');
      if (q && q.trim()) window.location.href = 'https://zzk.cnblogs.com/s?w=' + encodeURIComponent(q.trim());
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchBtn.click(); }
    });
  }
})();