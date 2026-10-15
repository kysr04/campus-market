/* ==========================================================
   校易集 · 公共脚本
   文件：js/app.js
   说明：全站共用一个脚本，通过 <body data-page="xxx"> 判断当前在哪一页，
        再执行对应的初始化函数。这样不用引一堆 JS 文件，逻辑也集中好讲。
   包含：主题切换、手机导航、本地存储、商品卡片渲染、收藏、
        搜索筛选、轮播图、表单校验、弹窗与轻提示。
   ========================================================== */
(function () {
  'use strict';

  /* ---------------- 1. 通用小工具 ---------------- */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  /* 价格格式化：25 → ¥25 */
  const yuan = n => '¥' + Number(n).toLocaleString('zh-CN');

  /* 根据分类 key 拿到分类信息 */
  const catOf = key => CATEGORIES.find(c => c.key === key) ||
    { key: key, name: '其他好物', emoji: '📦', cover: 'cov-default' };

  /* 把日期转成"3 天前"这种好读的说法 */
  function timeAgo(dateStr) {
    const d = new Date(String(dateStr) + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 30) return days + ' 天前';
    return Math.floor(days / 30) + ' 个月前';
  }

  /* 转义用户输入的文本，防止把 HTML 结构写坏（安全习惯） */
  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  /* ---------------- 2. 本地存储（收藏 / 我发布的） ---------------- */

  const KEY_FAV = 'xyj_favorites';
  const KEY_MINE = 'xyj_my_items';
  const memory = {};               // localStorage 不可用时的兜底，保证页面不会直接报错

  const store = {
    get(key, def) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : def;
      } catch (e) {
        return memory[key] !== undefined ? memory[key] : def;
      }
    },
    set(key, val) {
      memory[key] = val;
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 忽略：用内存兜底 */ }
    }
  };

  const getFav = () => store.get(KEY_FAV, []);
  const isFav = id => getFav().indexOf(Number(id)) > -1;

  function toggleFav(id) {
    id = Number(id);
    const list = getFav();
    const i = list.indexOf(id);
    if (i > -1) { list.splice(i, 1); } else { list.push(id); }
    store.set(KEY_FAV, list);
    return i === -1;               // true = 刚收藏，false = 刚取消
  }

  const getMine = () => store.get(KEY_MINE, []);
  const addMine = p => { const l = getMine(); l.unshift(p); store.set(KEY_MINE, l); };
  const removeMine = id => store.set(KEY_MINE, getMine().filter(p => p.id !== Number(id)));

  /* 全部商品 = 内置数据 + 我自己发布的 */
  const allProducts = () => getMine().concat(PRODUCTS);
  const findProduct = id => allProducts().find(p => p.id === Number(id));

  /* ---------------- 3. 主题（浅色 / 深色） ---------------- */

  const KEY_THEME = 'xyj_theme';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    $$('.js-theme').forEach(btn => {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.setAttribute('title', theme === 'dark' ? '切换到浅色模式' : '切换到深色模式');
    });
  }

  function initTheme() {
    const saved = store.get(KEY_THEME, '');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));
    $$('.js-theme').forEach(btn => btn.addEventListener('click', function () {
      const now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      store.set(KEY_THEME, now);
      applyTheme(now);
      toast(now === 'dark' ? '已切换到深色模式' : '已切换到浅色模式');
    }));
  }

  /* ---------------- 4. 头部导航 / 手机抽屉 ---------------- */

  function initHeader() {
    const toggle = $('.nav-toggle');
    const nav = $('.main-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        nav.classList.toggle('open');
        toggle.textContent = nav.classList.contains('open') ? '✕' : '☰';
      });
    }
    /* 高亮当前页 */
    const page = document.body.dataset.page;
    $$('.main-nav a').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (page && href.indexOf(page + '.html') > -1) a.classList.add('active');
    });
  }

  /* ---------------- 5. 轻提示 / 弹窗 / 返回顶部 ---------------- */

  let toastTimer = null;
  function toast(msg) {
    let el = $('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
  }

  function openModal(html) {
    let mask = $('.modal-mask');
    if (!mask) {
      mask = document.createElement('div');
      mask.className = 'modal-mask';
      mask.addEventListener('click', e => { if (e.target === mask) closeModal(); });
      document.body.appendChild(mask);
    }
    mask.innerHTML = '<div class="modal">' + html + '</div>';
    mask.classList.add('show');
  }

  function closeModal() {
    const mask = $('.modal-mask');
    if (mask) mask.classList.remove('show');
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  function initToTop() {
    const btn = document.createElement('button');
    btn.className = 'to-top';
    btn.title = '回到顶部';
    btn.innerHTML = '↑';
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);
    const onScroll = () => btn.classList.toggle('show', window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    onScroll();
  }

  /* ---------------- 6. 商品卡片渲染 ---------------- */

  function cardHTML(p, i) {
    const cat = catOf(p.cat);
    const fav = isFav(p.id);
    return '' +
      '<article class="p-card" style="--i:' + i + '">' +
        '<div class="p-cover ' + cat.cover + '">' +
          '<span class="cond">' + esc(p.cond) + '</span>' +
          '<button class="fav-btn' + (fav ? ' on' : '') + '" data-fav="' + p.id + '" ' +
                  'aria-label="收藏">' + (fav ? '♥' : '♡') + '</button>' +
          (p.img
            ? '<img src="' + esc(p.img) + '" alt="' + esc(p.title) + '">'
            : '<span class="emoji">' + (p.emoji || cat.emoji) + '</span>') +
        '</div>' +
        '<div class="p-body">' +
          '<h3 class="p-title">' + esc(p.title) + '</h3>' +
          '<div class="p-tags">' +
            '<span class="badge badge-brand">' + esc(cat.name) + '</span>' +
            '<span class="badge">' + esc(p.campus.split(' · ')[0]) + '</span>' +
          '</div>' +
          '<div class="p-foot">' +
            '<span class="price"><i>¥</i>' + esc(p.price) + '</span>' +
            '<span class="p-seller">👤 ' + esc(p.seller.name) + '</span>' +
          '</div>' +
        '</div>' +
        '<a class="card-link" href="detail.html?id=' + p.id + '" aria-label="查看 ' +
            esc(p.title) + ' 详情"></a>' +
      '</article>';
  }

  function renderGrid(el, list) {
    if (!el) return;
    if (!list.length) {
      el.innerHTML = '<div class="empty" style="grid-column:1/-1">' +
        '<span class="emoji">🔍</span><h3>没有找到符合条件的闲置</h3>' +
        '<p>换个关键词，或者把筛选条件放宽一点试试</p>' +
        '<button class="btn btn-ghost js-reset-filter">清空筛选条件</button></div>';
      return;
    }
    el.innerHTML = list.map(cardHTML).join('');
  }

  /* 收藏按钮：全站用事件委托统一处理 */
  document.addEventListener('click', function (e) {
    const btn = e.target.closest && e.target.closest('[data-fav]');
    if (!btn) return;
    e.preventDefault();
    const on = toggleFav(btn.dataset.fav);
    btn.classList.toggle('on', on);
    btn.textContent = on ? '♥' : '♡';
    toast(on ? '已加入收藏' : '已取消收藏');
    if (document.body.dataset.page === 'mine') renderMine();
  });

  /* 清空筛选 */
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.js-reset-filter')) {
      location.href = 'list.html';
    }
  });

  /* ---------------- 7. 首页 ---------------- */

  function initIndex() {
    const all = allProducts();

    /* 7.1 分类入口 + 数量 */
    const catBox = $('#catGrid');
    if (catBox) {
      catBox.innerHTML = CATEGORIES.map(c => {
        const n = all.filter(p => p.cat === c.key).length;
        return '<a class="cat-card" href="list.html?cat=' + c.key + '">' +
          '<span class="emoji">' + c.emoji + '</span>' +
          '<span class="name">' + c.name + '</span>' +
          '<span class="count">在架 ' + n + ' 件</span></a>';
      }).join('');
    }

    /* 7.2 热门 / 最新 两组商品 */
    const hot = all.filter(p => p.hot).sort((a, b) => b.views - a.views).slice(0, 4);
    const fresh = all.slice().sort((a, b) => b.time.localeCompare(a.time)).slice(0, 8);
    renderGrid($('#hotGrid'), hot);
    renderGrid($('#freshGrid'), fresh);

    /* 7.3 数字滚动动画（在架数量按实际数据来，不写死） */
    const totalEl = $('#statTotal');
    if (totalEl) totalEl.dataset.count = all.length;
    $$('.js-count').forEach(el => {
      const target = Number(el.dataset.count || 0);
      const dur = 900;
      const start = performance.now();
      (function step(now) {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);           // 先快后慢
        el.textContent = Math.round(target * eased).toLocaleString('zh-CN');
        if (t < 1) requestAnimationFrame(step);
      })(start);
    });

    /* 7.4 轮播图 */
    const carousel = $('#carousel');
    if (carousel) {
      const track = $('.slides', carousel);
      const total = $$('.slide', carousel).length;
      const dots = $$('.dots button', carousel);
      let current = 0;
      let timer = null;

      function go(i) {
        current = (i + total) % total;
        track.style.transform = 'translateX(-' + (current * 100) + '%)';
        dots.forEach((d, n) => d.classList.toggle('active', n === current));
      }
      function play() { stop(); timer = setInterval(() => go(current + 1), 4500); }
      function stop() { if (timer) clearInterval(timer); }

      dots.forEach((d, n) => d.addEventListener('click', () => { go(n); play(); }));
      $('.prev', carousel).addEventListener('click', () => { go(current - 1); play(); });
      $('.next', carousel).addEventListener('click', () => { go(current + 1); play(); });
      carousel.addEventListener('mouseenter', stop);
      carousel.addEventListener('mouseleave', play);
      go(0); play();
    }
  }

  /* ---------------- 8. 商品列表页 ---------------- */

  function initList() {
    const grid = $('#listGrid');
    if (!grid) return;

    const params = new URLSearchParams(location.search);
    const sortParam = params.get('sort');
    const state = {
      cat: params.get('cat') || 'all',
      kw: params.get('kw') || '',
      /* 只有四种排序是有效的，别的取值（比如 ?sort=hot）一律按综合排序处理 */
      sort: ['newest', 'priceAsc', 'priceDesc'].indexOf(sortParam) > -1 ? sortParam : 'default',
      goodOnly: false
    };

    /* 8.1 分类筛选按钮 */
    const chips = $('#chips');
    chips.innerHTML = '<button class="chip" data-cat="all">全部</button>' +
      CATEGORIES.map(c => '<button class="chip" data-cat="' + c.key + '">' +
        c.emoji + ' ' + c.name + '</button>').join('');

    chips.addEventListener('click', e => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      state.cat = btn.dataset.cat;
      update();
    });

    /* 8.2 搜索框（输入后延迟 200 毫秒再筛选，避免每敲一个字都重排） */
    const input = $('#searchInput');
    input.value = state.kw;
    let debounce = null;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { state.kw = input.value.trim(); update(); }, 200);
    });

    /* 8.3 排序 */
    $('#sortSelect').value = state.sort;
    $('#sortSelect').addEventListener('change', e => { state.sort = e.target.value; update(); });

    /* 8.4 只看九成新以上 */
    $('#goodOnly').addEventListener('change', e => { state.goodOnly = e.target.checked; update(); });

    /* 8.5 标题跟着分类变化 */
    function apply() {
      const kw = state.kw.toLowerCase();
      let list = allProducts();

      if (state.cat !== 'all') list = list.filter(p => p.cat === state.cat);
      if (state.goodOnly) list = list.filter(p => Number(p.level) >= 9);
      if (kw) {
        list = list.filter(p =>
          (p.title + ' ' + p.desc + ' ' + (p.tags || []).join(' ')).toLowerCase().indexOf(kw) > -1);
      }

      if (state.sort === 'priceAsc') list.sort((a, b) => a.price - b.price);
      else if (state.sort === 'priceDesc') list.sort((a, b) => b.price - a.price);
      else if (state.sort === 'newest') list.sort((a, b) => b.time.localeCompare(a.time));
      else list.sort((a, b) => (b.hot ? 1 : 0) - (a.hot ? 1 : 0) || b.views - a.views);

      return list;
    }

    function update() {
      $$('.chip', chips).forEach(c => c.classList.toggle('active', c.dataset.cat === state.cat));
      const list = apply();
      renderGrid(grid, list);
      $('#resultCount').textContent = list.length;
      $('#catName').textContent = state.cat === 'all' ? '全部闲置' : catOf(state.cat).name;
      $('#listTitle').textContent = state.cat === 'all'
        ? '全部闲置' : catOf(state.cat).emoji + ' ' + catOf(state.cat).name;
      $('#listSub').textContent = state.kw
        ? '搜索“' + state.kw + '”的结果' : '同校面交 · 免运费 · 支持当面验货';
      document.title = $('#listTitle').textContent + ' - 校易集';
    }

    update();
  }

  /* ---------------- 9. 商品详情页 ---------------- */

  function initDetail() {
    const box = $('#detailBox');
    if (!box) return;

    const id = new URLSearchParams(location.search).get('id');
    const p = findProduct(id);
    const cat = p ? catOf(p.cat) : null;

    /* 9.1 商品不存在时的兜底 */
    if (!p) {
      $('#detailWrap').innerHTML =
        '<div class="empty"><span class="emoji">📭</span>' +
        '<h3>这件闲置不见了</h3><p>可能已经被卖掉或者下架了，去看看别的吧</p>' +
        '<a class="btn btn-primary" href="list.html">返回闲置列表</a></div>';
      $('#crumb').innerHTML = '<a href="index.html">首页</a>' +
        '<span class="sep">/</span><span class="current">商品不存在</span>';
      $('#relatedSection').style.display = 'none';
      return;
    }

    document.title = p.title + ' - 校易集';
    $('#crumb').innerHTML = '<a href="index.html">首页</a><span class="sep">/</span>' +
      '<a href="list.html?cat=' + p.cat + '">' + cat.name + '</a><span class="sep">/</span>' +
      '<span class="current">' + esc(p.title) + '</span>';

    $('#detailWrap').innerHTML = '' +
      '<div class="detail">' +
        '<div class="detail-cover ' + cat.cover + '">' +
          (p.img ? '<img src="' + esc(p.img) + '" alt="' + esc(p.title) + '">'
                 : '<span class="emoji">' + (p.emoji || cat.emoji) + '</span>') +
        '</div>' +
        '<div>' +
          '<div class="p-tags" style="margin-bottom:10px">' +
            '<span class="badge badge-brand">' + cat.name + '</span>' +
            '<span class="badge">' + esc(p.cond) + '</span>' +
            (p.hot ? '<span class="badge badge-accent">🔥 热门</span>' : '') +
          '</div>' +
          '<h1 class="detail-title">' + esc(p.title) + '</h1>' +
          '<div class="price-box">' +
            '<span class="price"><i>¥</i>' + esc(p.price) + '</span>' +
            (p.origin ? '<span class="price-old">原价 ¥' + esc(p.origin) + '</span>' : '') +
            '<span class="badge badge-accent" style="margin-left:auto">省 ' +
              yuan(Math.max(0, (p.origin || p.price) - p.price)) + '</span>' +
          '</div>' +
          '<ul class="spec-list">' +
            '<li><span class="k">成色</span><span class="v">' + esc(p.cond) + '</span></li>' +
            '<li><span class="k">交易地点</span><span class="v">' + esc(p.campus) + '</span></li>' +
            '<li><span class="k">发布时间</span><span class="v">' + timeAgo(p.time) + '</span></li>' +
            '<li><span class="k">浏览</span><span class="v">' + esc(p.views) + ' 次</span></li>' +
          '</ul>' +
          '<div class="desc-box"><h3>卖家描述</h3><p>' + esc(p.desc) + '</p></div>' +
          '<div class="seller-card">' +
            '<div class="avatar">' + esc(p.seller.emoji) + '</div>' +
            '<div><div class="name">' + esc(p.seller.name) +
              ' <span class="badge badge-brand">本校认证</span></div>' +
              '<div class="meta">' + esc(p.seller.dept) + '</div></div>' +
          '</div>' +
          '<div class="detail-actions">' +
            '<button class="btn btn-primary btn-lg" id="btnContact">💬 联系卖家</button>' +
            '<button class="btn btn-ghost btn-lg" id="btnFav">' +
              (isFav(p.id) ? '♥ 已收藏' : '♡ 收藏') + '</button>' +
            '<a class="btn btn-ghost btn-lg" href="list.html' +
              (p.cat ? '?cat=' + p.cat : '') + '">← 返回列表</a>' +
          '</div>' +
        '</div>' +
      '</div>';

    /* 9.2 收藏按钮 */
    $('#btnFav').addEventListener('click', function () {
      const on = toggleFav(p.id);
      this.textContent = on ? '♥ 已收藏' : '♡ 收藏';
      toast(on ? '已加入收藏，可在"我的"里查看' : '已取消收藏');
    });

    /* 9.3 联系卖家弹窗 */
    $('#btnContact').addEventListener('click', function () {
      openModal('' +
        '<h3>联系 ' + esc(p.seller.name) + '</h3>' +
        '<p class="modal-sub">建议先说清楚是来买「' + esc(p.title) + '」的</p>' +
        '<div class="contact-line"><span>微信号</span>' +
          '<span class="val" id="wxVal">' + esc(p.seller.wechat) + '</span></div>' +
        '<p class="modal-sub">交易地点：' + esc(p.campus) + '</p>' +
        '<div class="modal-actions">' +
          '<button class="btn btn-ghost" id="btnCloseModal">关闭</button>' +
          '<button class="btn btn-primary" id="btnCopyWx">复制微信号</button>' +
        '</div>');

      $('#btnCloseModal').addEventListener('click', closeModal);
      $('#btnCopyWx').addEventListener('click', function () {
        const wx = p.seller.wechat;
        const done = () => toast('微信号已复制：' + wx);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(wx).then(done).catch(function () { fallbackCopy(wx, done); });
        } else {
          fallbackCopy(wx, done);
        }
      });
    });

    /* 9.4 相关推荐：同分类的其他商品 */
    const rel = allProducts().filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 4);
    if (rel.length) {
      $('#relatedSection').style.display = '';
      renderGrid($('#relatedGrid'), rel);
    }
  }

  /* 老浏览器 / file:// 下的复制兜底方案 */
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* 忽略 */ }
    document.body.removeChild(ta);
    done();
  }

  /* ---------------- 10. 发布闲置页 ---------------- */

  function initPublish() {
    const form = $('#publishForm');
    if (!form) return;

    /* 10.1 根据 CONDITIONS 生成成色单选项 */
    $('#condGroup').innerHTML = CONDITIONS.map((c, i) =>
      '<label><input type="radio" name="cond" value="' + c.key + '"' + (i === 1 ? ' checked' : '') +
      '> ' + c.name + '</label>').join('');

    /* 10.2 校验规则表：字段 → 判断函数 + 错误提示 */
    const rules = {
      title: v => (v.length >= 4 && v.length <= 30) || '标题请写 4—30 个字，让人一眼看懂是什么',
      price: v => (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0 && Number(v) <= 99999) ||
        '价格请填 0—99999 之间的数字',
      origin: v => v === '' || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0) || '原价要么不填，要么填个正数',
      campus: v => v.length >= 2 || '写一下大概的交易地点，方便同学找你',
      desc: v => v.length >= 10 || '描述至少写 10 个字，把瑕疵和使用情况讲清楚',
      wechat: v => /^[A-Za-z0-9_-]{6,20}$/.test(v) || '微信号请填 6—20 位字母、数字或下划线'
    };

    function fieldOf(name) {
      const el = form.elements[name];
      if (!el) return null;
      const inputs = el.length ? el : [el];
      return { inputs: inputs, row: inputs[0].closest('.form-row') };
    }

    function checkField(name, silent) {
      const f = fieldOf(name);
      if (!f || !rules[name]) return true;
      const v = String(form.elements[name].value == null ? '' : (form.elements[name].value || '')).trim();
      const res = rules[name](v);
      const ok = res === true;
      if (!silent) {
        f.row.classList.toggle('invalid', !ok);
        const msg = $('.error-msg', f.row);
        if (msg && !ok) msg.textContent = res;
      }
      return ok;
    }

    /* 10.3 输入时就实时消除红框，失焦时才校验 */
    Object.keys(rules).forEach(name => {
      const f = fieldOf(name);
      if (!f) return;
      f.inputs.forEach(inp => {
        inp.addEventListener('input', () => {
          const row = inp.closest('.form-row');
          if (row.classList.contains('invalid')) checkField(name);
        });
        inp.addEventListener('blur', () => checkField(name));
      });
    });

    /* 10.4 字数统计 */
    const descEl = form.elements.desc;
    const counter = $('#descCount');
    const countDesc = () => { counter.textContent = descEl.value.length + ' 字'; };
    descEl.addEventListener('input', countDesc);
    countDesc();

    /* 10.5 提交 */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const bad = Object.keys(rules).filter(name => !checkField(name));
      /* 分类是单选组，单独判断 */
      const catPicked = form.querySelector('input[name="cat"]:checked');
      $('#catRow').classList.toggle('invalid', !catPicked);

      if (bad.length || !catPicked) {
        const firstBad = bad.length ? fieldOf(bad[0]) : $('#catRow');
        (firstBad.row || firstBad).scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast('还有 ' + (bad.length + (catPicked ? 0 : 1)) + ' 处需要修改');
        return;
      }

      const condKey = form.querySelector('input[name="cond"]:checked').value;
      const cond = CONDITIONS.find(c => c.key === condKey);
      const cat = catOf(catPicked.value);

      /* 生成一条新商品：id 用时间戳，避免和内置数据撞号 */
      const item = {
        id: Date.now(),
        title: form.elements.title.value.trim(),
        cat: catPicked.value,
        price: Number(form.elements.price.value),
        origin: form.elements.origin.value ? Number(form.elements.origin.value) : '',
        cond: cond.name,
        level: cond.level,
        emoji: cat.emoji,
        tags: ['同学自发布'],
        seller: {
          name: '我',
          dept: form.elements.campus.value.trim(),
          emoji: '🙋',
          wechat: form.elements.wechat.value.trim()
        },
        campus: form.elements.campus.value.trim(),
        views: 0,
        hot: false,
        time: new Date().toISOString().slice(0, 10),
        desc: form.elements.desc.value.trim()
      };

      addMine(item);
      toast('发布成功！正在跳转到「我的闲置」…');
      setTimeout(() => { location.href = 'mine.html'; }, 1100);
    });
  }

  /* ---------------- 11. 我的（收藏 + 我发布的） ---------------- */

  let mineTab = 'fav';

  function renderMine() {
    const grid = $('#mineGrid');
    if (!grid) return;

    const isFavTab = mineTab === 'fav';
    const list = isFavTab ? allProducts().filter(p => isFav(p.id)) : getMine();
    $('#mineTip').textContent = (isFavTab ? '共收藏 ' : '共发布 ') + list.length + ' 件闲置';

    /* 空状态：收藏为空和发布为空，给的引导不一样 */
    if (!list.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1">' +
        '<span class="emoji">' + (isFavTab ? '💛' : '📦') + '</span>' +
        '<h3>' + (isFavTab ? '还没有收藏任何闲置' : '还没有发布过闲置') + '</h3>' +
        '<p>' + (isFavTab ? '在列表页点一下卡片右上角的心形，就会出现在这里'
                          : '宿舍里用不上的东西，写两句就能挂出来') + '</p>' +
        '<a class="btn btn-primary" href="' + (isFavTab ? 'list.html' : 'publish.html') + '">' +
        (isFavTab ? '去逛逛闲置' : '去发布一件') + '</a></div>';
      return;
    }

    renderGrid(grid, list);

    /* 在每张卡片下面补一个操作按钮：取消收藏 / 下架 */
    $$('.p-card', grid).forEach((card, i) => {
      const p = list[i];
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm p-action';
      btn.textContent = isFavTab ? '取消收藏' : '下架这件闲置';
      btn.addEventListener('click', () => {
        if (isFavTab) { toggleFav(p.id); toast('已取消收藏'); }
        else { removeMine(p.id); toast('已下架'); }
        renderMine();
      });
      card.appendChild(btn);
    });
  }

  function initMine() {
    if (!$('#mineGrid')) return;

    const tabs = $$('.chip[data-tab]');
    tabs.forEach(t => t.addEventListener('click', function () {
      mineTab = this.dataset.tab;
      tabs.forEach(x => x.classList.toggle('active', x === this));
      renderMine();
    }));
    tabs.forEach(x => x.classList.toggle('active', x.dataset.tab === mineTab));
    renderMine();
  }

  /* ---------------- 12. 启动 ---------------- */

  function init() {
    initTheme();
    initHeader();
    initToTop();
    $$('.js-year').forEach(el => { el.textContent = new Date().getFullYear(); });

    switch (document.body.dataset.page) {
      case 'index':   initIndex();   break;
      case 'list':    initList();    break;
      case 'detail':  initDetail();  break;
      case 'publish': initPublish(); break;
      case 'mine':    initMine();    break;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
