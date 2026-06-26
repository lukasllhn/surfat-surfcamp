// Surf At — progressive enhancement. Page works fully without JS.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hdr = document.getElementById('hdr');
const nav = document.getElementById('nav');
const toggle = document.querySelector('.nav-toggle');

// header solid-on-scroll
const onHdr = () => hdr.classList.toggle('scrolled', scrollY > 60);
addEventListener('scroll', onHdr, { passive: true }); onHdr();

// mobile nav
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', open);
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false');
}));

// reveal-on-scroll (reliable IntersectionObserver)
const revs = document.querySelectorAll('.reveal:not(.in), .reveal-scale:not(.in)');
if (reduce || !('IntersectionObserver' in window)) {
  revs.forEach(e => e.classList.add('in'));
} else {
  const io = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  revs.forEach(e => io.observe(e));
}

// hero video: fade in once it can render a frame (no poster/blank flash)
const heroVid = document.querySelector('.hero__media video');
if (heroVid) {
  const showVid = () => heroVid.classList.add('ready');
  if (reduce || heroVid.readyState >= 2) showVid();
  else heroVid.addEventListener('loadeddata', showVid, { once: true });
}

// sticky "a week" — activate the step + matching image as it passes centre
const steps = [...document.querySelectorAll('.step')];
const wkImgs = [...document.querySelectorAll('.week__sticky .stage img')];
if (steps.length && 'IntersectionObserver' in window) {
  const sio = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) {
      const i = +e.target.dataset.step;
      steps.forEach(s => s.classList.toggle('active', s === e.target));
      wkImgs.forEach(im => im.classList.toggle('active', +im.dataset.img === i));
    }
  }), { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  steps.forEach(s => sio.observe(s));
}

// parallax (rAF, transform only)
if (!reduce) {
  const px = [...document.querySelectorAll('[data-parallax]')];
  const heroV = document.querySelector('[data-parallax-hero]');
  const oceanEl = document.querySelector('.ocean');
  let ticking = false;
  const update = () => {
    const vh = innerHeight;
    px.forEach(el => {
      const r = el.getBoundingClientRect();
      const off = (r.top + r.height / 2 - vh / 2) / vh;      // -1..1 through viewport
      el.style.transform = `translateY(${(-off * 26).toFixed(1)}px) scale(1.12)`;
    });
    if (heroV) heroV.style.transform = `translateY(${-Math.min(scrollY * 0.18, 120).toFixed(1)}px)`;
    if (oceanEl) oceanEl.style.transform = `translate3d(0,${(-scrollY * 0.1).toFixed(1)}px,0)`;
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update, { passive: true });
  update();
}

// count-up stats
const counts = document.querySelectorAll('[data-count]');
if (counts.length && 'IntersectionObserver' in window) {
  const cio = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); }
  }), { threshold: 0.6 });
  counts.forEach(c => cio.observe(c));
}
function countUp(el) {
  const raw = el.dataset.count, target = parseFloat(raw);
  const isYear = target > 1900, isFloat = raw.includes('.');
  if (reduce) { el.textContent = raw; return; }
  const dur = 1100, t0 = performance.now();
  const tick = (t) => {
    let p = Math.min((t - t0) / dur, 1); p = 1 - Math.pow(1 - p, 3);
    const v = target * p;
    el.textContent = isYear ? Math.round(v) : (isFloat ? v.toFixed(1) : Math.round(v));
    if (p < 1) requestAnimationFrame(tick); else el.textContent = raw;
  };
  requestAnimationFrame(tick);
}

// package "Select & request" → preselect form
document.querySelectorAll('[data-package]').forEach(b => b.addEventListener('click', () => {
  const s = document.getElementById('package'), w = b.dataset.package;
  if (s) [...s.options].forEach(o => { if (o.value === w || o.text === w) s.value = o.value; });
}));
