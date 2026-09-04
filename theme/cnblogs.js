/* CNB Notes theme v2. Load config.js before this file. */
(function () {
  'use strict';
  var cfg = window.CNB_THEME_CONFIG || {};
  var root = document.documentElement;
  var copyText = cfg.copyText || '复制';
  var copiedText = cfg.copiedText || '已复制';
  var scrollOffset = cfg.scrollOffset || 80;

  /* 兼容尚未同步页首 HTML 的旧版本；新版本不再输出阻断式加载遮罩。 */
  var legacyPageLoader = document.getElementById('cn-page-loader');
  if (legacyPageLoader) legacyPageLoader.remove();

  /* Blog园 DOM 将 #sideBar 嵌套在 #main 内，提升为 #home 的网格列。 */
  var home = document.getElementById('home');
  var main = document.getElementById('main');
  var sideBar = document.getElementById('sideBar');
  if (home && main && sideBar && sideBar.parentElement === main) {
    home.insertBefore(sideBar, main);
  }

  /* 侧栏模块由博客园异步填充，延迟清理仍为空的占位块。 */
  function hideEmptySidebarBlocks() {
    document.querySelectorAll('#sideBar .sidebar-block').forEach(function (block) {
      if (!block.textContent.trim() && !block.querySelector('img, a, table, input, button, script')) {
        block.classList.add('cn-empty-sidebar-block');
      } else block.classList.remove('cn-empty-sidebar-block');
    });
  }
  function normalizeArchiveCard() {
    var archive = document.getElementById('sidebar_postarchive');
    if (!archive || !archive.children.length ||
        (archive.firstElementChild && archive.firstElementChild.classList.contains('catListView'))) return;
    var inner = document.createElement('div');
    inner.className = 'catListView';
    while (archive.firstChild) inner.appendChild(archive.firstChild);
    archive.appendChild(inner);
  }
  var sidebarOrderSwapped = false;
  function swapCalendarAndNews() {
    if (sidebarOrderSwapped) return;
    var sidebarColumn = document.getElementById('blog-sidecolumn');
    var calendar = document.getElementById('blog-calendar');
    var news = document.getElementById('sidebar_news');
    if (!sidebarColumn || !calendar || !news) return;

    function getTopLevelBlock(element) {
      while (element && element.parentElement !== sidebarColumn) element = element.parentElement;
      return element && element.parentElement === sidebarColumn ? element : null;
    }
    var calendarBlock = getTopLevelBlock(calendar);
    var newsBlock = getTopLevelBlock(news);
    if (!calendarBlock || !newsBlock || calendarBlock === newsBlock) return;

    var marker = document.createComment('swap-sidebar-blocks');
    sidebarColumn.insertBefore(marker, calendarBlock);
    sidebarColumn.insertBefore(calendarBlock, newsBlock);
    sidebarColumn.insertBefore(newsBlock, marker);
    marker.remove();
    sidebarOrderSwapped = true;
  }
  var topViewedMergePending = false;
  function mergeTopViewedPosts() {
    var list = document.querySelector('#sidebar_topviewedposts #TopViewPostsBlock ul');
    if (!list || list.dataset.cnTopViewedMerged === 'true' || topViewedMergePending) return;

    var nativeItems = Array.prototype.map.call(list.querySelectorAll('li'), function (item) {
      var link = item.querySelector('a[href]');
      var hrefMatch = link && link.href.match(/\/p\/(\d+)(?:\.html)?(?:[/?#]|$)/i);
      var textMatch = link && link.textContent.match(/^\s*\d+\.\s*(.*?)\s*\(([\d,]+)\)\s*$/);
      if (!hrefMatch || !textMatch) return null;
      return {
        id: Number(hrefMatch[1]),
        title: textMatch[1],
        href: link.href,
        viewCount: Number(textMatch[2].replace(/,/g, ''))
      };
    }).filter(function (item) { return item && Number.isFinite(item.viewCount); });
    if (!nativeItems.length) return;

    var blogApp = window.currentBlogApp || location.pathname.split('/').filter(Boolean)[0];
    if (!blogApp) return;
    var listLength = list.children.length;
    topViewedMergePending = true;
    fetch('/' + encodeURIComponent(blogApp) + '/sitemap.xml', { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('sitemap failed: ' + response.status);
        return response.text();
      }).then(function (xmlText) {
        var sitemap = new DOMParser().parseFromString(xmlText, 'application/xml');
        if (sitemap.querySelector('parsererror')) throw new Error('invalid sitemap');
        var seenArticleIds = {};
        var articleItems = Array.prototype.map.call(sitemap.getElementsByTagName('loc'), function (node) {
          var href = node.textContent.trim();
          var match = href.match(/\/articles\/(\d+)(?:\.html)?\/?$/i);
          if (!match || seenArticleIds[match[1]]) return null;
          seenArticleIds[match[1]] = true;
          return { id: Number(match[1]), title: '', href: href, viewCount: 0, isArticle: true };
        }).filter(Boolean);
        if (!articleItems.length) return null;

        return fetch('/' + encodeURIComponent(blogApp) + '/ajax/GetPostStat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=UTF-8' },
          credentials: 'same-origin',
          body: JSON.stringify(articleItems.map(function (article) { return article.id; }))
        }).then(function (response) {
          if (!response.ok) throw new Error('GetPostStat failed: ' + response.status);
          return response.json();
        }).then(function (stats) {
          if (!Array.isArray(stats)) throw new Error('invalid post statistics');
          return { articleItems: articleItems, stats: stats };
        });
      }).then(function (result) {
        if (!result) return null;
        var statsById = {};
        result.stats.forEach(function (stat) {
          var id = Number(stat.postId);
          var viewCount = Number(stat.viewCount);
          if (id > 0 && Number.isFinite(viewCount)) statsById[id] = viewCount;
        });

        var articleItems = result.articleItems.filter(function (article) {
          return Object.prototype.hasOwnProperty.call(statsById, article.id);
        }).map(function (article) {
          article.viewCount = statsById[article.id];
          return article;
        });
        if (!articleItems.length || !list.isConnected) return null;

        var itemsById = {};
        nativeItems.concat(articleItems).forEach(function (item) {
          if (!itemsById[item.id] || item.viewCount > itemsById[item.id].viewCount) itemsById[item.id] = item;
        });
        var rankedItems = Object.keys(itemsById).map(function (id) {
          return itemsById[id];
        }).sort(function (a, b) {
          return b.viewCount - a.viewCount;
        }).slice(0, listLength);

        return Promise.all(rankedItems.map(function (item) {
          if (!item.isArticle) return item;
          return fetch(item.href, { credentials: 'same-origin' }).then(function (response) {
            if (!response.ok) throw new Error('article title failed: ' + response.status);
            return response.text();
          }).then(function (html) {
            var articlePage = new DOMParser().parseFromString(html, 'text/html');
            var title = articlePage.querySelector('#cb_post_title_url');
            item.title = title ? title.textContent.trim() : '';
            if (!item.title) throw new Error('article title missing');
            return item;
          });
        }));
      }).then(function (rankedItems) {
        if (!rankedItems || !list.isConnected) return;

        var fragment = document.createDocumentFragment();
        rankedItems.forEach(function (item, index) {
          var row = document.createElement('li');
          var link = document.createElement('a');
          link.href = item.href;
          link.textContent = (index + 1) + '. ' + item.title + '(' + item.viewCount + ')';
          row.appendChild(link);
          fragment.appendChild(row);
        });
        list.dataset.cnTopViewedMerged = 'true';
        list.replaceChildren(fragment);
      }).catch(function () {
        /* Keep Blog园's native ranking when statistics cannot be loaded. */
      }).then(function () {
        topViewedMergePending = false;
      });
  }
  normalizeArchiveCard();
  swapCalendarAndNews();
  mergeTopViewedPosts();
  var sidebarColumn = document.getElementById('blog-sidecolumn');
  if (sidebarColumn && 'MutationObserver' in window) {
    var archiveObserver = new MutationObserver(function () {
      normalizeArchiveCard();
      swapCalendarAndNews();
      mergeTopViewedPosts();
    });
    archiveObserver.observe(sidebarColumn, { childList:true, subtree:true });
    setTimeout(function () { archiveObserver.disconnect(); }, 10000);
  } else setTimeout(function () {
    normalizeArchiveCard();
    swapCalendarAndNews();
    mergeTopViewedPosts();
  }, 1500);
  setTimeout(hideEmptySidebarBlocks, 1200);

  /* ---- Theme: first visit follows system, then localStorage ---- */
  var saved = localStorage.getItem('cn-theme');
  if (!saved) saved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-cn-theme', saved);

  if (cfg.wallpaper) root.style.setProperty('--cn-wallpaper', 'url("' + cfg.wallpaper.replace(/"/g, '\\"') + '")');

  /* ---- Logo mark: first char of blogName ---- */
  var logoMark = document.querySelector('.cn-theme-logo__mark');
  if (logoMark) {
    if (cfg.logoImage) {
      logoMark.textContent = '';
      var logoImage = document.createElement('img');
      logoImage.src = cfg.logoImage;
      logoImage.alt = (cfg.blogName || 'Logo') + ' logo';
      logoImage.decoding = 'async';
      logoMark.appendChild(logoImage);
    } else if (cfg.logoText) { logoMark.textContent = cfg.logoText; }
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
  // 惰性读取：侧边栏公告的 <script> 在 DOM 后部，初始化时可能尚未定义这些全局变量。
  function getPool() { return window.CNB_COVER_POOL || []; }
  function getMap() { return window.CNB_COVER_MAP || {}; }
  function getQuotes() { return window.CNB_QUOTES || []; }
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
  function normalizeTitle(title) {
    return String(title || '').replace(/\s+/g, ' ').trim();
  }
  function getPostKey(href, title) {
    var match = String(href || '').match(/\/p\/(\d+)(?:[/?#]|$)/i);
    return match ? 'post:' + match[1] : normalizeTitle(title);
  }
  function getMappedCover(title, postKey) {
    var map = getMap();
    var normalized = normalizeTitle(title);
    var postId = String(postKey || '').replace(/^post:/, '');
    return map[title] || map[normalized] || (postId && map[postId]) || null;
  }
  function getCoverUrl(title, postKey) {
    var mappedCover = getMappedCover(title, postKey);
    if (mappedCover) return mappedCover;
    var pool = getPool();
    if (pool.length) return pool[hashStr(postKey || normalizeTitle(title)) % pool.length];
    /* 列表页只有摘要，详情页却有完整正文；不能用正文首图作封面，否则同文会不一致。 */
    return null;
  }
  function appendHeroQuote(hero) {
    var quotes = getQuotes();
    if (!quotes.length) return false;
    var heroQuote = document.createElement('p');
    heroQuote.className = 'cn-article-hero__quote';
    heroQuote.textContent = quotes[Math.floor(Math.random() * quotes.length)];
    hero.appendChild(heroQuote);
    return true;
  }

  function createPostCard(titleEl, con, desc, dateText) {
    var titleText = titleEl.textContent.trim();
    var postLink = titleEl.querySelector('a[href]');
    var postKey = getPostKey(postLink && postLink.getAttribute('href'), titleText);
    var coverUrl = getCoverUrl(titleText, postKey);
    var card = document.createElement('article');
    card.className = 'cn-post-card cn-reveal';

    var cover = document.createElement('div');
    cover.className = 'cn-post-card__cover';
    if (coverUrl) {
      cover.style.setProperty('--cn-card-bg', 'url("' + coverUrl.replace(/"/g, '\\"') + '")');
    } else {
      cover.style.setProperty('--cn-card-bg', gradients[hashStr(postKey) % gradients.length]);
      pendingCovers.push({ el: cover, title: titleText, key: postKey });
    }
    if (dateText) {
      var dateEl = document.createElement('span');
      dateEl.className = 'cn-post-card__date';
      dateEl.textContent = dateText;
      cover.appendChild(dateEl);
    }
    var title = document.createElement('h3');
    title.className = 'cn-post-card__title';
    title.innerHTML = titleEl.innerHTML;
    cover.appendChild(title);
    card.appendChild(cover);

    var body = document.createElement('div');
    body.className = 'cn-post-card__body';
    if (con && (con.textContent.trim() || con.querySelector('img, a, table, input, button'))) {
      body.appendChild(con);
    }
    if (desc) body.appendChild(desc);
    card.appendChild(body);
    return card;
  }

  /* ---- Split posts from .day into cover cards ---- */
  var forFlow = document.querySelector('.forFlow');
  var pendingCovers = [];
  var pendingQuotes = [];
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

        var card = createPostCard(el, con, desc, dateText);
        forFlow.insertBefore(card, day);
      });
      day.remove();
    });

    /* 标签页使用 .PostList 结构，没有首页的 .day 容器。 */
    var tagPosts = Array.prototype.slice.call(forFlow.querySelectorAll('.PostList'));
    var postList = document.getElementById('myposts');
    var isPostListPage = postList && postList.parentNode === forFlow && tagPosts.length;
    if (isPostListPage) {
      /* 博客园把顶部分页放在 #myposts 外、尾分页放在其内部。先抽出最外层
         导航，再固定为“顶部分页 -> 文章网格 -> 尾分页”。 */
      var navigationSelector = '.pager, .topicListFooter';
      var listNavigation = Array.prototype.slice.call(forFlow.querySelectorAll(navigationSelector));
      listNavigation = listNavigation.filter(function (navigation) {
        var parent = navigation.parentElement;
        while (parent && parent !== forFlow) {
          if (parent.matches(navigationSelector)) return false;
          parent = parent.parentElement;
        }
        return true;
      });
      var topNavigation = listNavigation.shift();
      var bottomNavigation = listNavigation.pop();
      listNavigation.forEach(function (navigation) { navigation.remove(); });
      if (topNavigation) forFlow.insertBefore(topNavigation, postList);
      if (bottomNavigation) forFlow.insertBefore(bottomNavigation, postList.nextSibling);
      postList.classList.add('cn-post-columns');
    }
    tagPosts.forEach(function (post, index) {
      var title = post.querySelector('.postTitl2');
      if (!title) return;
      var summary = post.querySelector('.postText2');
      var meta = post.querySelector('.postDesc2');
      var card = createPostCard(title, summary, meta, '');
      var target = isPostListPage ? postList : post.parentNode;
      target.appendChild(card);
      post.remove();
    });
    if (isPostListPage) forFlow.classList.add('cn-post-list-flow');
  }

  /* ---- Article detail page hero banner ---- */
  var postDetail = document.getElementById('post_detail');
  if (postDetail) {
    document.body.classList.add('cn-article-page');
    var detailTitle = postDetail.querySelector('.postTitle');
    if (detailTitle) {
      var detailTitleText = detailTitle.textContent.trim();
      var detailLink = detailTitle.querySelector('a[href]');
      var detailKey = getPostKey(detailLink && detailLink.getAttribute('href'), detailTitleText);
      var heroCover = getCoverUrl(detailTitleText, detailKey);

      var hero = document.createElement('div');
      hero.className = 'cn-article-hero';
      if (heroCover) {
        hero.style.setProperty('--cn-hero-bg', 'url("' + heroCover.replace(/"/g, '\\"') + '")');
      } else {
        hero.style.setProperty('--cn-hero-bg', gradients[hashStr(detailKey) % gradients.length]);
        pendingCovers.push({ el: hero, title: detailTitleText, key: detailKey, isHero: true });
      }

      var heroTitle = document.createElement('h1');
      heroTitle.className = 'cn-article-hero__title';
      heroTitle.textContent = detailTitleText;
      hero.appendChild(heroTitle);

      if (!appendHeroQuote(hero)) pendingQuotes.push(hero);

      /* Hero 与正文卡片分离，放到 #mainContent 上方，避免横幅压住正文背景。 */
      var mainContent = document.getElementById('mainContent');
      if (main && mainContent && mainContent.parentElement === main) {
        main.insertBefore(hero, mainContent);
      } else {
        postDetail.insertBefore(hero, postDetail.firstChild);
      }
      detailTitle.style.display = 'none';
    }
  }

  /* ---- Scroll reveal: post cards + sidebar ---- */
  if (cfg.scrollReveal !== false) {
    var revealEls = document.querySelectorAll('.cn-post-card, .cn-profile-hero, .sidebar-block, .newsItem, .catListComment, .catListView, .catListTag, .catListPostCategory, #sidebar_postarchive, .catListPostArchive');
    revealEls.forEach(function (el) { el.classList.add('cn-reveal'); });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    }
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

  /* 封面兜底补设：侧边栏公告脚本（定义 CNB_COVER_POOL 等）由博客园异步注入，
     出现时机晚于 cnblogs.js 及其 setTimeout(0)。用轮询等待池就绪后再补设封面，
     避免一次性定时过早跑空。 */
  var applyPending = function () {
    var pool = getPool();
    var mp = getMap();
    var coversComplete = true;
    pendingCovers.forEach(function (pc) {
      var key = pc.key || getPostKey('', pc.title);
      var url = getMappedCover(pc.title, key) || mp[pc.title];
      if (!url && pool.length) url = pool[hashStr(key) % pool.length];
      var prop = pc.isHero ? '--cn-hero-bg' : '--cn-card-bg';
      var cur = pc.el.style.getPropertyValue(prop);
      if (cur.indexOf('url(') === 0) return;  /* 已是图片，完成 */
      if (url) {
        pc.el.style.setProperty(prop, 'url("' + url.replace(/"/g, '\\"') + '")');
      } else coversComplete = false;
    });
    var quotesComplete = true;
    pendingQuotes.forEach(function (hero) {
      if (!appendHeroQuote(hero)) quotesComplete = false;
    });
    if (quotesComplete) pendingQuotes = [];
    return coversComplete && quotesComplete;
  };
  var coverPolls = 0;
  var maxCoverPolls = 80;
  (function pollCover() {
    if (applyPending()) return;
    if (++coverPolls >= maxCoverPolls) return;
    setTimeout(pollCover, 150);
  })();
})();
