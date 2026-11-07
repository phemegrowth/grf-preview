/* Global Rubber Factory · motion layer (GSAP 3.13 + ScrollTrigger + SplitText + Lenis) */
(() => {
  const RTL = document.documentElement.dir === 'rtl';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const GRF = (window.GRF = { hero: 0, test: 0, world: 0, ready: false, mouse: { x: 0, y: 0 } });

  // shared phases for the pressure test (scenes.js reads the same)
  GRF.phase = p => {
    const insert = clamp(p / 0.28);
    const inflate = clamp((p - 0.3) / 0.33);
    const seal = clamp((p - 0.63) / 0.3);
    return { insert, inflate, seal, pressure: (1 - Math.pow(1 - seal, 3)) * 2.5 };
  };

  // forms + modal work with or without motion
  function forms() {
    $$('form.quote, form.modal-card').forEach(f => f.addEventListener('submit', ev => {
      ev.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); return; }
      $('.q-ok', f).hidden = false;
      $('button[type=submit]', f).disabled = true;
    }));
    const modal = $('.modal');
    $$('[data-open-modal]').forEach(b => b.addEventListener('click', () => { modal.hidden = false; GRF.lenis && GRF.lenis.stop(); }));
    $$('[data-close]', modal).forEach(b => b.addEventListener('click', () => { modal.hidden = true; GRF.lenis && GRF.lenis.start(); }));
    $$('[data-quote]').forEach(a => a.addEventListener('click', () => { $('select[name=product]').value = a.dataset.quote; }));
    const burger = $('.hdr-burger');
    burger.addEventListener('click', () => document.body.classList.toggle('menu-open'));
    $$('.menu a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));
  }
  forms();

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger || !window.Lenis) {
    document.documentElement.classList.add('no-motion');
    document.body.classList.remove('is-loading');
    $('.loader').remove();
    GRF.ready = true; GRF.static = true;
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);
  const lenis = (GRF.lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1 }));
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
  window.scrollTo(0, 0);

  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = $(id);
    if (!t) return;
    e.preventDefault();
    lenis.scrollTo(t, { duration: 1.6, offset: id === '#contact' ? 0 : 0 });
  }));

  /* ---------- cursor ---------- */
  const cur = $('.cursor');
  gsap.set('.cursor-dot, .cursor-ring', { left: 0, top: 0 });
  const dx = gsap.quickTo('.cursor-dot', 'x', { duration: 0.08 }), dy = gsap.quickTo('.cursor-dot', 'y', { duration: 0.08 });
  const rx = gsap.quickTo('.cursor-ring', 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo('.cursor-ring', 'y', { duration: 0.45, ease: 'power3' });
  window.addEventListener('pointermove', e => {
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    GRF.mouse.x = (e.clientX / innerWidth) * 2 - 1; GRF.mouse.y = (e.clientY / innerHeight) * 2 - 1;
  });
  document.addEventListener('pointerover', e => {
    const card = e.target.closest('.pcard:not(.pcard-end)');
    const link = e.target.closest('a,button,select,label');
    cur.classList.toggle('is-view', !!card);
    cur.classList.toggle('is-link', !card && !!link);
    $('.cursor-ring em').textContent = card ? (RTL ? 'عرض' : 'Quote') : '';
  });

  /* ---------- magnetic ---------- */
  if (matchMedia('(pointer:fine)').matches) $$('.magnetic').forEach(el => {
    const xT = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1,.4)' }), yT = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1,.4)' });
    el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); xT((e.clientX - r.left - r.width / 2) * 0.3); yT((e.clientY - r.top - r.height / 2) * 0.4); });
    el.addEventListener('pointerleave', () => { xT(0); yT(0); });
  });

  /* ---------- header ---------- */
  const hdr = $('.hdr');
  let lastY = 0;
  lenis.on('scroll', ({ scroll }) => {
    hdr.classList.toggle('is-scrolled', scroll > 40);
    hdr.classList.toggle('is-hidden', scroll > lastY && scroll > innerHeight * 0.8 && !document.body.classList.contains('menu-open'));
    lastY = scroll;
  });

  /* ---------- loader -> hero intro ---------- */
  function intro() {
    const n = { v: 0 };
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('.loader-logo', { opacity: 1, filter: 'blur(0px)', duration: 1 })
      .to('.loader-bar span', { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, 0)
      .to(n, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => ($('.loader-num').textContent = String(Math.round(n.v)).padStart(3, '0')) }, 0)
      .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '+=.15')
      .add(() => { document.body.classList.remove('is-loading'); $('.loader').remove(); lenis.start(); GRF.ready = true; window.dispatchEvent(new Event('grf:ready')); }, '-=.5')
      .from('.hl > span', { yPercent: 110, duration: 1.3, stagger: 0.09, ease: 'expo.out' }, '-=.6')
      .from('.hero .eyebrow, .hero-sub, .hero-ctas, .hero-badge, .hero-scroll, .hdr', { opacity: 0, y: 24, duration: 1, stagger: 0.06 }, '-=1');
  }

  document.fonts.ready.then(() => {
    intro();
    build();
  });

  function build() {
    /* hero scroll: copy lifts away, camera flies through the gasket (scenes.js reads GRF.hero) */
    ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: s => (GRF.hero = s.progress) });
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: 0.6 } })
      .to('.hero-copy', { yPercent: -30, opacity: 0, ease: 'none', duration: 0.3 }, 0.02)
      .to('.hero-badge, .hero-scroll', { opacity: 0, duration: 0.15 }, 0)
      .to('.hero-bg', { scale: 1.3, opacity: 0.4, duration: 1, ease: 'none' }, 0)
      .to('.hero-flash', { opacity: 1, duration: 0.12, ease: 'none' }, 0.88);

    /* headings: masked line reveal */
    $$('.split').forEach(el => {
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
        onSplit: self => gsap.from(self.lines, { yPercent: 105, duration: 1.2, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } })
      });
    });

    /* manifesto: words light up with scroll */
    const ms = SplitText.create('.manifesto-text', { type: 'words', wordsClass: 'word' });
    gsap.to(ms.words, { color: '#eceef4', stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.manifesto', start: 'top 70%', end: 'bottom 60%', scrub: true } });

    /* fade-ups */
    $$('.lead, .eyebrow, .route, .quote, .regions, .products-hint').forEach(el => {
      if (el.closest('.hero') || el.closest('.factory-copy')) return;
      gsap.from(el, { opacity: 0, y: 30, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
    });

    /* pressure test */
    const steps = $$('.test-steps li'), hud = $('.hud'), stat = $('.hud-s'), fill = $('.g-fill');
    ScrollTrigger.create({
      trigger: '.test', start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: s => {
        const p = (GRF.test = s.progress), ph = GRF.phase(p);
        steps.forEach((li, i) => li.classList.toggle('is-on', i === (p < 0.3 ? 0 : p < 0.63 ? 1 : 2)));
        const bar = ph.pressure.toFixed(2);
        $('.hud-p').textContent = bar; $('.hud-p2').textContent = bar;
        $('.hud-g').textContent = Math.round(ph.inflate * 100) + '%';
        fill.style.strokeDashoffset = 314.16 * (1 - ph.pressure / 2.5);
        const st = ph.seal > 0.6 ? 'sealed' : ph.inflate > 0.02 ? 'sealing' : 'open';
        stat.textContent = stat.dataset[st];
        hud.classList.toggle('is-sealed', st === 'sealed');
        $('.test-progress span').style.transform = `scaleX(${p})`;
      }
    });
    gsap.from('.hud', { opacity: 0, x: RTL ? -40 : 40, duration: 1, scrollTrigger: { trigger: '.test', start: 'top 40%' } });

    const mm = gsap.matchMedia();
    mm.add('(min-width: 821px)', () => {
      /* products: horizontal pinned track */
      const track = $('.products-track');
      const dist = () => track.scrollWidth - innerWidth;
      const cards = $$('.pcard');
      const skew = gsap.quickTo(cards, 'skewX', { duration: 0.5, ease: 'power3' });
      gsap.to(track, {
        x: () => (RTL ? dist() : -dist()), ease: 'none',
        scrollTrigger: {
          trigger: '.products-pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: s => { $('.products-bar span').style.transform = `scaleX(${s.progress})`; skew(clamp(s.getVelocity() / -400, -6, 6) * (RTL ? -1 : 1)); },
          onLeave: () => skew(0), onLeaveBack: () => skew(0)
        }
      });
      gsap.to('.products-head', { opacity: 0, x: RTL ? 60 : -60, ease: 'none', scrollTrigger: { trigger: '.products-pin', start: 'top top', end: () => '+=' + innerWidth * 0.45, scrub: true } });

      /* product card 3D tilt */
      cards.forEach(c => {
        const rX = gsap.quickTo(c, 'rotationX', { duration: 0.6 }), rY = gsap.quickTo(c, 'rotationY', { duration: 0.6 });
        c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); rY(((e.clientX - r.left) / r.width - 0.5) * 12); rX(-((e.clientY - r.top) / r.height - 0.5) * 12); });
        c.addEventListener('pointerleave', () => { rX(0); rY(0); });
        gsap.set(c, { transformPerspective: 900 });
      });

      /* process: previous card sinks as the next one arrives */
      const cs = $$('.card');
      cs.forEach((c, i) => {
        if (i === cs.length - 1) return;
        gsap.to($('.card-in', c), { scale: 0.9, filter: 'brightness(0.4) blur(1px)', ease: 'none', scrollTrigger: { trigger: cs[i + 1], start: 'top 65%', end: 'top 15%', scrub: true } });
      });
    });

    /* factory: video window opens to full bleed */
    gsap.timeline({ scrollTrigger: { trigger: '.factory-stage', start: 'top top', end: '+=140%', pin: true, scrub: 0.8, anticipatePin: 1 } })
      .to('.factory-media', { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut', duration: 1 }, 0)
      .to('.factory-media video', { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
      .from('.factory-copy > *', { opacity: 0, y: 60, duration: 0.35, stagger: 0.08 }, 0.55);

    /* stats count up */
    $$('.stat b').forEach(b => {
      const o = { v: 0 }, to = +b.dataset.count;
      gsap.to(o, { v: to, duration: 2.2, ease: 'power3.out', scrollTrigger: { trigger: b, start: 'top 88%' }, onUpdate: () => (b.textContent = Math.round(o.v).toLocaleString('en-US')) });
    });
    gsap.from('.stat', { opacity: 0, y: 40, stagger: 0.07, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.stats', start: 'top 85%' } });

    /* footprint: city list drives the image stack */
    const imgs = $$('.foot-media img'), coord = $('.foot-coord');
    $$('.city').forEach((li, i) => ScrollTrigger.create({
      trigger: li, start: 'top 62%', end: 'bottom 62%',
      onToggle: st => {
        if (!st.isActive) return;
        $$('.city').forEach(c => c.classList.toggle('is-on', c === li));
        imgs.forEach((im, j) => { im.classList.toggle('was-on', im.classList.contains('is-on') && j !== i); im.classList.toggle('is-on', j === i); });
        gsap.fromTo(coord, { opacity: 0 }, { opacity: 1, duration: 0.6 }); coord.textContent = li.dataset.coord;
      }
    }));

    /* world */
    const chips = $$('.regions li');
    ScrollTrigger.create({
      trigger: '.world', start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: s => { GRF.world = s.progress; chips.forEach((c, i) => c.classList.toggle('is-on', s.progress > 0.12 + i * 0.15)); }
    });
    ScrollTrigger.create({ trigger: '.world', start: 'top bottom', end: 'bottom top', onToggle: s => (GRF.worldOn = s.isActive) });

    /* industries: floating image follows the cursor */
    const fl = $('.ind-float'), fimgs = $$('img', fl);
    const fx = gsap.quickTo(fl, 'x', { duration: 0.6, ease: 'power3' }), fy = gsap.quickTo(fl, 'y', { duration: 0.6, ease: 'power3' });
    const fr = gsap.quickTo(fl, 'rotation', { duration: 0.8, ease: 'power3' });
    let px = 0;
    $('.ind-list').addEventListener('pointermove', e => { fx(e.clientX); fy(e.clientY); fr(clamp((e.clientX - px) * 0.4, -12, 12)); px = e.clientX; });
    $$('.ind').forEach((li, i) => {
      li.addEventListener('pointerenter', () => { fimgs.forEach((im, j) => im.classList.toggle('is-on', j === i)); gsap.to(fl, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' }); });
    });
    $('.ind-list').addEventListener('pointerleave', () => gsap.to(fl, { opacity: 0, scale: 0.6, duration: 0.4 }));
    gsap.from('.ind', { opacity: 0, y: 40, stagger: 0.08, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.ind-list', start: 'top 85%' } });

    /* footer word rises */
    gsap.from('.ftr-word', { yPercent: 40, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.ftr', start: 'top bottom', end: 'bottom bottom', scrub: true } });

    /* nav state: created last so pinned sections are measured first */
    $$('.hdr-nav a').forEach(a => {
      const s = $(a.getAttribute('href'));
      if (s) ScrollTrigger.create({ trigger: s, start: 'top 50%', end: 'bottom 50%', onToggle: st => a.classList.toggle('is-on', st.isActive) });
    });
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  }
})();
