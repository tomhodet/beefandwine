(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => matchMedia('(max-width: 899px)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  /* ---------------- ambiance (thème) */
  function setTheme(t) {
    root.dataset.theme = t;
    try { localStorage.setItem('bw-site-theme', t); } catch (e) {}
    $$('[data-t]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === t)));
    const m = $('meta[name="theme-color"]');
    if (m) m.content = t === 'charbon' ? '#15110E' : '#1E0B11';
  }
  $$('[data-t]').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.t)));
  setTheme(root.dataset.theme === 'charbon' ? 'charbon' : 'bordeaux');

  /* ---------------- séquence d'ouverture */
  const go = () => requestAnimationFrame(() => root.classList.add('loaded'));
  if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]).then(go);
  else go();

  /* ---------------- menu mobile */
  const drawer = $('.drawer'), burger = $('.burger');
  function openDrawer(o) {
    drawer.classList.toggle('open', o);
    burger.setAttribute('aria-expanded', String(o));
    drawer.setAttribute('aria-hidden', String(!o));
    document.body.style.overflow = o ? 'hidden' : '';
    if (o) $('.drawer-x').focus(); else burger.focus({ preventScroll: true });
  }
  burger.addEventListener('click', () => openDrawer(true));
  $('.drawer-x').addEventListener('click', () => openDrawer(false));
  $$('.drawer nav a').forEach(a => a.addEventListener('click', () => openDrawer(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.classList.contains('open')) openDrawer(false); });

  /* ---------------- vidéo d'accueil */
  const vid = $('.hero-video'), arch = $('.arch');
  if (vid) {
    if (RM) { vid.removeAttribute('autoplay'); vid.pause(); }
    else {
      const p = vid.play();
      if (p && p.catch) p.catch(() => arch.classList.add('blocked'));
    }
    vid.addEventListener('playing', () => arch.classList.remove('blocked'));
    const replay = () => { vid.currentTime = 0; vid.play().catch(() => {}); };
    $('.arch-play') && $('.arch-play').addEventListener('click', replay);
    arch.addEventListener('click', e => { if (vid.ended) replay(); });
  }

  /* ---------------- inclinaison 3D */
  function tilt(el, area, max, bx = 0, by = 0) {
    if (!el || !area || RM) return;
    area.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const r = area.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.setProperty('--ry', (bx + x * max).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (by - y * max).toFixed(2) + 'deg');
    });
    area.addEventListener('pointerleave', () => { el.style.removeProperty('--ry'); el.style.removeProperty('--rx'); });
  }
  tilt(arch, $('.hero'), 12);
  tilt($('.phone'), $('.app'), 18, -14, 6);

  /* ---------------- fumée et braises */
  class Smoke {
    constructor(cv, o) {
      this.cv = cv; this.cx = cv.getContext('2d');
      this.o = Object.assign({ puffs: 20, embers: 30, base: .5 }, o);
      this.sprite = this.mkPuff(); this.spark = this.mkSpark();
      this.P = []; this.E = []; this.vis = false; this.raf = 0; this.last = 0;
      this.resize();
      addEventListener('resize', () => this.resize());
      new IntersectionObserver(es => { this.vis = es[0].isIntersecting; this.toggle(); }, { rootMargin: '80px' }).observe(cv);
      document.addEventListener('visibilitychange', () => this.toggle());
    }
    mkPuff() {
      const s = document.createElement('canvas'); s.width = s.height = 256;
      const g = s.getContext('2d');
      for (let i = 0; i < 18; i++) {
        const x = 128 + (Math.random() - .5) * 120, y = 128 + (Math.random() - .5) * 110, r = 30 + Math.random() * 70;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(238,228,216,.2)'); gr.addColorStop(.55, 'rgba(238,228,216,.07)'); gr.addColorStop(1, 'rgba(238,228,216,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      }
      return s;
    }
    mkSpark() {
      const s = document.createElement('canvas'); s.width = s.height = 32;
      const g = s.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, 'rgba(255,236,190,1)'); gr.addColorStop(.25, 'rgba(255,170,80,.9)'); gr.addColorStop(1, 'rgba(255,90,20,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return s;
    }
    resize() {
      const r = this.cv.getBoundingClientRect();
      this.w = r.width; this.h = r.height;
      const d = Math.min(devicePixelRatio || 1, 1.5);
      this.cv.width = Math.max(1, Math.round(this.w * d)); this.cv.height = Math.max(1, Math.round(this.h * d));
      this.cx.setTransform(d, 0, 0, d, 0, 0);
      const k = isMobile() ? .6 : 1;
      this.np = Math.round(this.o.puffs * k); this.ne = Math.round(this.o.embers * k);
    }
    puff(init) {
      const m = Math.max(this.w, this.h);
      return { x: Math.random() * this.w, y: init ? this.h * (.25 + Math.random() * .85) : this.h * (.95 + Math.random() * .2),
        vx: (Math.random() - .5) * .25, vy: -(.22 + Math.random() * .4), s: (.35 + Math.random() * .6) * m * .45,
        r: Math.random() * 6.28, vr: (Math.random() - .5) * .003, life: init ? Math.random() * 500 : 0, max: 520 + Math.random() * 600, sd: Math.random() * 100 };
    }
    ember(init) {
      return { x: Math.random() * this.w, y: init ? this.h * (.4 + Math.random() * .6) : this.h * (.85 + Math.random() * .2),
        vx: (Math.random() - .5) * .6, vy: -(.7 + Math.random() * 1.5), r: 3 + Math.random() * 7, life: init ? Math.random() * 120 : 0,
        max: 140 + Math.random() * 260, f: Math.random() * 6.28 };
    }
    toggle() {
      const on = this.vis && !document.hidden && !RM;
      if (on && !this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(t => this.tick(t)); }
      else if (!on && this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    }
    tick(t) {
      const dt = Math.min(3, (t - this.last) / 16.67); this.last = t;
      const c = this.cx, w = this.w, h = this.h;
      while (this.P.length < this.np) this.P.push(this.puff(this.P.length < this.np && t < 2000));
      while (this.E.length < this.ne) this.E.push(this.ember(t < 2000));
      c.clearRect(0, 0, w, h);
      c.globalCompositeOperation = 'source-over';
      for (let i = 0; i < this.P.length; i++) {
        const p = this.P[i];
        p.life += dt; if (p.life > p.max || p.y < -p.s) { this.P[i] = this.puff(false); continue; }
        const k = p.life / p.max;
        p.x += (p.vx + Math.sin((p.life + p.sd) * .012) * .18) * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        const s = p.s * (1 + k * .9);
        c.globalAlpha = Math.sin(Math.PI * k) * this.o.base;
        c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.drawImage(this.sprite, -s / 2, -s / 2, s, s); c.restore();
      }
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.E.length; i++) {
        const e = this.E[i];
        e.life += dt; if (e.life > e.max || e.y < -10) { this.E[i] = this.ember(false); continue; }
        const k = e.life / e.max;
        e.x += (e.vx + Math.sin((e.life + e.f * 40) * .05) * .35) * dt; e.y += e.vy * dt;
        c.globalAlpha = (1 - k) * (.55 + .45 * Math.sin(e.life * .25 + e.f)) * (k < .1 ? k * 10 : 1);
        const r = e.r * (1 - k * .5);
        c.drawImage(this.spark, e.x - r, e.y - r, r * 2, r * 2);
      }
      c.globalAlpha = 1;
      this.raf = requestAnimationFrame(tt => this.tick(tt));
    }
  }
  $$('canvas.smoke').forEach(cv => new Smoke(cv, cv.dataset.smoke === 'final' ? { puffs: 16, embers: 46, base: .42 } : { puffs: 18, embers: 26, base: .36 }));

  /* ---------------- la découpe (pilotée par le défilement) */
  const cut = $('.cut'), stick = $('.cut-stick'), knife = $('.knife'), cline = $('.cut-line');
  const qa = $('.cut-qa'), qb = $('.cut-qb');
  let Y1 = 64, Y2 = 36;
  function cutGeo() {
    const cs = getComputedStyle(stick);
    Y1 = parseFloat(cs.getPropertyValue('--y1')) || 64; Y2 = parseFloat(cs.getPropertyValue('--y2')) || 36;
    const w = stick.clientWidth, h = stick.clientHeight, dy = h * (Y2 - Y1) / 100;
    cline.style.width = Math.hypot(w, dy).toFixed(1) + 'px';
    cline.style.transform = `translate(0,${(h * Y1 / 100).toFixed(1)}px) rotate(${Math.atan2(dy, w)}rad)`;
  }
  function cutUpdate() {
    if (!cut) return;
    if (RM) { stick.style.setProperty('--sep', '10px'); cline.style.setProperty('--d', 1); return; }
    const r = cut.getBoundingClientRect();
    const total = r.height - innerHeight;
    if (r.top > innerHeight || r.bottom < 0) return;
    const p = clamp(-r.top / Math.max(1, total), 0, 1);
    const w = stick.clientWidth, h = stick.clientHeight;
    const k = ease((p - .06) / .5);
    const saw = Math.sin(k * Math.PI * 7) * .012 * (1 - k);
    const u = -.18 + (k + saw) * 1.5;
    const px = u * w, py = h * (Y1 + (Y2 - Y1) * u) / 100;
    const th = Math.atan2(h * (Y2 - Y1) / 100, w);
    const kw = knife.clientWidth, kh = knife.clientHeight;
    knife.style.transform = `translate(${(px - kw * .85).toFixed(1)}px,${(py - kh * .72).toFixed(1)}px) rotate(${th}rad)`;
    const s = ease((p - .5) / .26);
    cline.style.setProperty('--d', clamp(u, 0, 1).toFixed(4));
    cline.style.setProperty('--g', s.toFixed(3));
    stick.style.setProperty('--sep', (s * (isMobile() ? 9 : 14)).toFixed(2) + 'px');
    const ea = ease((p - .12) / .25), eb = ease((p - .48) / .25);
    qa.style.opacity = ea.toFixed(3); qa.style.transform = `translateY(${((1 - ea) * 24).toFixed(1)}px)`;
    qb.style.opacity = eb.toFixed(3); qb.style.transform = `translateY(${((1 - eb) * 24).toFixed(1)}px)`;
  }
  if (cut) { cutGeo(); addEventListener('resize', () => { cutGeo(); cutUpdate(); }); }

  /* ---------------- parallaxe de la cave */
  const cave = $('.cave'), caveBg = $('.cave-bg');
  function caveUpdate() {
    if (!cave || RM) return;
    const r = cave.getBoundingClientRect();
    if (r.top > innerHeight || r.bottom < 0) return;
    const p = (innerHeight - r.top) / (innerHeight + r.height);
    caveBg.style.transform = `translate3d(0,${((p - .5) * -80).toFixed(1)}px,0)`;
  }

  /* ---------------- défilement : en-tête, progression */
  const hdr = $('.hdr'), prog = $('.progress');
  let tick = false;
  function onScroll() {
    if (tick) return; tick = true;
    requestAnimationFrame(() => {
      tick = false;
      const y = scrollY;
      hdr.classList.toggle('solid', y > 30);
      const H = root.scrollHeight - innerHeight;
      prog.style.transform = `scaleX(${H > 0 ? (y / H).toFixed(4) : 0})`;
      cutUpdate(); caveUpdate();
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------- viandes : panneaux */
  const meats = $$('.meat');
  function meatOn(m) { meats.forEach(x => x.classList.toggle('on', x === m)); }
  meats.forEach(m => {
    m.addEventListener('mouseenter', () => { if (!isMobile()) meatOn(m); });
    m.addEventListener('focusin', () => meatOn(m));
    m.addEventListener('click', () => meatOn(m));
  });

  /* ---------------- la carte : onglets et aperçu */
  const tabs = $$('.tabs [role="tab"]'), panels = $$('.panel');
  const pv = $('.preview'), pvImgs = pv ? $$('img', pv) : [], pvCap = pv ? $('figcaption', pv) : null;
  let pvCur = 0, pvSrc = pvImgs[0] ? pvImgs[0].getAttribute('src') : '';
  function setPreview(src, cap) {
    if (!pv || !src) return;
    if (cap && pvCap) pvCap.textContent = cap;
    if (src === pvSrc) return;
    pvSrc = src;
    const nxt = pvImgs[1 - pvCur], cur = pvImgs[pvCur];
    const show = () => { nxt.classList.remove('out'); cur.classList.add('out'); pvCur = 1 - pvCur; };
    nxt.onload = show; nxt.src = src; if (nxt.complete && nxt.naturalWidth) show();
  }
  function showTab(i, focus) {
    tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(j === i)); t.tabIndex = j === i ? 0 : -1; });
    panels.forEach((p, j) => p.classList.toggle('on', j === i));
    setPreview(tabs[i].dataset.img, tabs[i].dataset.cap);
    if (focus) { tabs[i].focus(); tabs[i].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => showTab(i));
    t.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); showTab((i + 1) % tabs.length, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); showTab((i - 1 + tabs.length) % tabs.length, true); }
    });
  });
  if (tabs.length) showTab(0);
  $$('.it[data-img]').forEach(it => {
    it.addEventListener('mouseenter', () => {
      if (isMobile()) return;
      $$('.it.hot').forEach(x => x.classList.remove('hot')); it.classList.add('hot');
      setPreview(it.dataset.img, it.querySelector('.it-n').textContent);
    });
    it.addEventListener('mouseleave', () => it.classList.remove('hot'));
  });

  /* ---------------- la cave : étiquettes en coverflow */
  const lab = $('.labels');
  if (lab) {
    const dot = $('.tl-track i');
    const cover = () => {
      const r = lab.getBoundingClientRect(), c = r.left + r.width / 2;
      const mx = lab.scrollWidth - lab.clientWidth;
      if (dot) dot.style.left = (mx > 0 ? clamp(lab.scrollLeft / mx, 0, 1) * 100 : 0).toFixed(2) + '%';
      for (const el of lab.children) {
        const b = el.getBoundingClientRect();
        const d = (b.left + b.width / 2 - c) / Math.max(320, r.width * .55);
        el.style.setProperty('--ry', (clamp(d, -1, 1) * -32).toFixed(2) + 'deg');
        el.style.setProperty('--s', (1 - Math.min(.14, Math.abs(d) * .16)).toFixed(3));
        el.style.setProperty('--sh', (130 - (clamp(d, -1, 1) + 1) * 60).toFixed(1) + '%');
      }
    };
    let lt = false;
    lab.addEventListener('scroll', () => { if (!lt) { lt = true; requestAnimationFrame(() => { lt = false; cover(); }); } }, { passive: true });
    addEventListener('resize', cover);
    lab.scrollLeft = 0; cover(); addEventListener('load', cover);
    // glisser à la souris
    let down = false, sx = 0, sl = 0, moved = false;
    lab.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = lab.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; lab.classList.add('drag'); } lab.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { if (!down) return; down = false; lab.classList.remove('drag'); });
  }

  /* ---------------- accords mets et vins */
  const pairData = $('#pair-data') ? JSON.parse($('#pair-data').textContent) : [];
  const pbtn = $$('.pair-pick button'), ptxt = $('.pair-txt'), pglass = $('.pair-glass');
  function pour() { if (!pglass) return; pglass.classList.remove('pour'); void pglass.getBoundingClientRect(); requestAnimationFrame(() => pglass.classList.add('pour')); }
  function pick(i) {
    const d = pairData[i]; if (!d) return;
    pbtn.forEach((b, j) => b.setAttribute('aria-checked', String(j === i)));
    ptxt.classList.add('swap');
    setTimeout(() => {
      $('.pair-w', ptxt).textContent = d.w;
      $('.pair-a', ptxt).textContent = d.wa + ', ' + d.wp;
      $('.pair-r', ptxt).textContent = d.r;
      $('.pair-v', ptxt).textContent = d.v;
      $('.pair-alt', ptxt).innerHTML = d.alt.map(a => `<div><dt>${a[0]}</dt><dd>${a[1]}, ${a[2]}</dd></div>`).join('');
      ptxt.classList.remove('swap');
    }, 260);
    pour();
  }
  pbtn.forEach((b, i) => {
    b.addEventListener('click', () => pick(i));
    b.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); const n = (i + 1) % pbtn.length; pick(n); pbtn[n].focus(); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); const n = (i - 1 + pbtn.length) % pbtn.length; pick(n); pbtn[n].focus(); }
    });
  });
  if (pglass) new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { pour(); ob.disconnect(); } }, { threshold: .5 }).observe(pglass);

  /* ---------------- ouvert ou fermé (heure de Paris) */
  const HOURS = { 2: [[720, 840], [1140, 1320]], 3: [[720, 840], [1140, 1320]], 4: [[720, 840], [1140, 1320]], 5: [[720, 840], [1140, 1350]], 6: [[1140, 1350]] };
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  function paris() {
    const o = {};
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(p => { o[p.type] = p.value; });
    return { d: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday), m: (+o.hour % 24) * 60 + (+o.minute) };
  }
  const hm = m => Math.floor(m / 60) + 'h' + (m % 60 ? String(m % 60).padStart(2, '0') : '');
  function status() {
    const { d, m } = paris(), today = HOURS[d] || [];
    for (const [a, b] of today) if (m >= a && m < b) return { open: true, t: `Ouvert maintenant, jusqu'à ${hm(b)}` };
    for (const [a] of today) if (m < a) return { open: false, t: `Fermé pour le moment, ouverture à ${hm(a)}` };
    for (let k = 1; k <= 7; k++) { const dd = (d + k) % 7; if (HOURS[dd]) return { open: false, t: `Fermé, ouverture ${k === 1 ? 'demain' : DAYS[dd]} à ${hm(HOURS[dd][0][0])}` }; }
    return { open: false, t: '' };
  }
  function refreshStatus() {
    try {
      const s = status(), d = paris().d;
      $$('[data-status]').forEach(el => { el.classList.toggle('open', s.open); $('span', el).textContent = s.t; });
      $$('.hours tr[data-d]').forEach(tr => tr.classList.toggle('today', +tr.dataset.d === d));
    } catch (e) {}
  }
  refreshStatus(); setInterval(refreshStatus, 60000);

  /* ---------------- plan Google chargé à la demande */
  const mapBtn = $('[data-map-load]');
  if (mapBtn) mapBtn.addEventListener('click', () => {
    const m = $('.map');
    m.innerHTML = `<iframe src="${m.dataset.src}" title="Plan d'accès au restaurant Beef and Wine, 125 rue Louis Brindeau, Le Havre" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
  });
})();
