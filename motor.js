// Motor skrol-gradnje — portovan iz Meridian ture (sajt-za-nekretnine).
// Tri režima, uređaj sam bira:
//  - 'scrub'    jak uređaj: skrol premotava niz frejmova (gradnja u tvojoj ruci)
//  - 'film'     telefon: film se sam izvrti kad dođeš do njega, pa "Skroluj dalje ↓"
//  - 'staticno' reduced-motion / štednja podataka: jedna slika, bez trikova

// ---------- Konfiguracija niza ----------
// Faza „od" je procenat progresa na kom faza počinje (0..1).
const FAZE = [
  { od: 0.0, naslov: 'Lokacija', tekst: 'Plac uz Dunavski park, u srcu Novog Sada. Danas raščišćen — spreman za gradnju.' },
  { od: 0.08, naslov: 'Temelji', tekst: 'Iskop ide dve etaže u dubinu. Ispod zemlje: 902 parking mesta.' },
  { od: 0.41, naslov: 'Konstrukcija', tekst: 'Skelet raste sprat po sprat — do četrnaestog. Zidovi između stanova: 33 cm.' },
  { od: 0.74, naslov: 'Fasada', tekst: 'Objekat se zatvara. Aluminijumska stolarija, fasade u bojama Panonke.' },
];

// 3 prelaza × 64 frejma, kontinuirana numeracija (f001–f192)
const PRELAZA = 3;
const pad = (n) => String(n).padStart(3, '0');
const KONFIG = {
  hi: { count: PRELAZA * 64, src: (i) => `frejmovi/hi/f${pad(i + 1)}.jpg` },
  md: { count: PRELAZA * 64, src: (i) => `frejmovi/md/m${pad(i + 1)}.jpg` },
};

// ---------- Prepoznavanje uređaja (lib/device.js logika) ----------
const mm = (q) => window.matchMedia && window.matchMedia(q).matches;
const conn = navigator.connection || navigator.mozConnection || {};
const reducedMotion = mm('(prefers-reduced-motion: reduce)');
const dataSaver = !!conn.saveData || /(^|\b)(2g|3g)$/.test(conn.effectiveType || '');
const touch = mm('(pointer: coarse)') || window.innerWidth < 900;

let rezim, tier;
if (reducedMotion || dataSaver) rezim = 'staticno';
else if (touch) rezim = 'film';
else {
  rezim = 'scrub';
  const cores = navigator.hardwareConcurrency || 4;
  const ram = navigator.deviceMemory || 0;
  tier = cores >= 8 && (ram === 0 || ram >= 8) ? 'hi' : 'md';
}

// ---------- Loader ----------
const loader = document.getElementById('loader');
const loaderBroj = loader.querySelector('.broj');
const loaderCrta = loader.querySelector('.crta i');
function loaderProgres(p) {
  const n = Math.min(100, Math.round(p * 100));
  loaderBroj.textContent = String(n).padStart(3, '0');
  loaderCrta.style.width = n + '%';
}
function loaderGotov() { loaderProgres(1); setTimeout(() => loader.classList.add('gotov'), 250); }

// ---------- Faza natpisi ----------
const fazaEl = document.getElementById('faza');
const fazaNaslov = fazaEl.querySelector('.faza-naslov');
const fazaTekst = fazaEl.querySelector('.faza-tekst');
let fazaIdx = -1;
function prikaziFazu(p) {
  let idx = 0;
  for (let i = 0; i < FAZE.length; i++) if (p >= FAZE[i].od) idx = i;
  if (idx === fazaIdx) return;
  fazaIdx = idx;
  fazaEl.classList.remove('on');
  // kratak treptaj da se vidi da je NOVA faza
  setTimeout(() => {
    fazaNaslov.textContent = FAZE[idx].naslov;
    fazaTekst.textContent = FAZE[idx].tekst;
    fazaEl.classList.add('on');
  }, 160);
}

// ---------- Režimi ----------
if (rezim === 'staticno') {
  // Bez animacija: prvi frejm stoji, natpisi odmah vidljivi.
  prikaziFazu(0);
  loaderGotov();
}

if (rezim === 'film') {
  document.body.classList.add('rezim-film');
  const v = document.getElementById('film');
  const next = document.getElementById('filmNext');
  loaderGotov(); // film se pufira sam; ne držimo korisnika na loaderu

  // rano puferovanje pre nego što film uđe u kadar
  const pre = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { try { v.load(); } catch (err) {} pre.disconnect(); }
  }, { rootMargin: '400px 0px' });
  pre.observe(v);

  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting && !v.ended) v.play().catch(() => {});
      else if (!e.isIntersecting) v.pause();
    });
  }, { threshold: 0.35 });
  io.observe(v);

  v.addEventListener('timeupdate', () => {
    if (v.duration) prikaziFazu(v.currentTime / v.duration);
  });
  v.addEventListener('ended', () => next.classList.add('on'));
  prikaziFazu(0);
}

if (rezim === 'scrub') {
  gsap.registerPlugin(ScrollTrigger);
  const cfg = KONFIG[tier];
  const N = cfg.count;
  const imgEl = document.getElementById('frejm');
  const imgs = new Array(N);
  let currentIdx = -1;
  const spreman = (im) => im && im.complete && im.naturalWidth > 0;

  // crtaj traženi frejm; ako još nije stigao, uzmi najbliži učitan (nema crnog bljeska)
  function draw(idx) {
    idx = Math.max(0, Math.min(N - 1, idx));
    if (idx === currentIdx) return;
    let use = idx;
    if (!spreman(imgs[idx])) {
      let f = -1;
      for (let d = 1; d < N; d++) {
        if (idx - d >= 0 && spreman(imgs[idx - d])) { f = idx - d; break; }
        if (idx + d < N && spreman(imgs[idx + d])) { f = idx + d; break; }
      }
      if (f < 0) return;
      use = f;
    }
    currentIdx = idx;
    imgEl.src = imgs[use].src;
  }

  function load(i, done) {
    if (imgs[i]) { if (done) done(); return; }
    const im = new Image();
    const fin = () => { if (currentIdx < 0) draw(0); if (done) done(); };
    im.onload = fin;
    im.onerror = fin; // jedan promašaj ne sme da zaglavi talas
    im.src = cfg.src(i);
    imgs[i] = im;
  }

  // Talas 1: svaki osmi frejm — tura upotrebljiva odmah; loader broji baš ovaj talas.
  // Talas 2: sve ostalo, tek kad talas 1 stigne (na sporoj vezi se ne otimaju).
  const wave1 = [];
  for (let i = 0; i < N; i += 8) wave1.push(i);
  let left = wave1.length;
  const ukupno = wave1.length;
  let krenuo2 = false;
  const startWave2 = () => {
    if (krenuo2) return;
    krenuo2 = true;
    loaderGotov();
    for (let i = 0; i < N; i++) load(i);
  };
  wave1.forEach((i) => load(i, () => {
    loaderProgres((ukupno - --left) / ukupno);
    if (left <= 0) startWave2();
  }));
  setTimeout(startWave2, 5000); // sigurnosna kočnica

  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: '+=' + (PRELAZA * 220) + '%',
    pin: true,
    scrub: true,
    onUpdate: (self) => {
      draw(Math.round(self.progress * (N - 1)));
      prikaziFazu(self.progress);
    },
  });
  prikaziFazu(0);

  // caption bledi kako gradnja odmiče, da ne stoji preko cele ture
  gsap.to('.hero-caption', {
    opacity: 0, y: -30, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=60%', scrub: true },
  });
  gsap.to('.scrollhint', {
    opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=25%', scrub: true },
  });
}

// ---------- Reveal sekcija (svi režimi osim staticno) ----------
if (rezim !== 'staticno' && window.gsap) {
  gsap.registerPlugin(ScrollTrigger);
  document.querySelectorAll('.sekcija, .finale-tekst, .strip').forEach((s) => {
    const mete = s.querySelectorAll('.kicker, h2, .lead, .kartica, .fact, .cta.velika, p');
    if (!mete.length) return;
    gsap.from(mete, {
      opacity: 0, y: 26, duration: 0.7, ease: 'power2.out', stagger: 0.07,
      scrollTrigger: { trigger: s, start: 'top 80%', toggleActions: 'play none none reverse' },
    });
  });
}
