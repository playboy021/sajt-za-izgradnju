// Motor skrol-gradnje — portovan iz Meridian ture (sajt-za-nekretnine).
// Tri režima, uređaj sam bira:
//  - 'scrub'    jak uređaj: skrol premotava niz frejmova (gradnja u tvojoj ruci)
//  - 'film'     telefon: film se sam izvrti kad dođeš do njega, pa "Skroluj dalje ↓"
//  - 'staticno' reduced-motion / štednja podataka: jedna slika, bez trikova

// ---------- Niz frejmova ----------
// Šest deonica, kontinuirana numeracija. GRANICE = poslednji frejm svake deonice.
//  1 uron (V1, sečen na vrhuncu) · 2 temelji→skelet · 3 skelet→fasada
//  4 završni radovi · 5 ulazak u dvorište · 6 izlazak na široki kadar
const GRANICE = [39, 87, 135, 183, 247, 295];
const UKUPNO = GRANICE[GRANICE.length - 1];

// Natpis faze se pali kad njena deonica krene (plus mali pomak da se gradnja „vidi").
const FAZE = [
  { naslov: 'Lokacija', tekst: 'Plac uz Dunavski park, u srcu Novog Sada. Danas raščišćen — spreman za gradnju.' },
  { naslov: 'Temelji', tekst: 'Iskop ide dve etaže u dubinu. Ispod zemlje: 902 parking mesta.' },
  { naslov: 'Konstrukcija', tekst: 'Skelet raste sprat po sprat — do četrnaestog. Zidovi između stanova: 33 cm.' },
  { naslov: 'Fasada', tekst: 'Objekat se zatvara. Aluminijumska stolarija, fasade u bojama Panonke.' },
  { naslov: 'Uređenje', tekst: '10.000 m² zajedničkog dvorišta: igralište, vrtić, teretana na otvorenom, drvored.' },
  { naslov: 'Panonka', tekst: '610 stanova i 21 poslovni prostor. Kao nekad — gradi se sa pažnjom na kvalitet.' },
];
// faza i počinje na početku deonice i (faza 0 = Lokacija je pre urona, faza 1 = tokom urona)
const FAZA_OD = [0, 0.05, GRANICE[0] / UKUPNO + 0.02, GRANICE[1] / UKUPNO + 0.02, GRANICE[2] / UKUPNO + 0.02, GRANICE[4] / UKUPNO];

const pad = (n) => String(n).padStart(3, '0');
const KONFIG = {
  hi: { count: UKUPNO, src: (i) => `frejmovi/hi/f${pad(i + 1)}.webp` },
  md: { count: UKUPNO, src: (i) => `frejmovi/md/m${pad(i + 1)}.webp` },
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

// ---------- Faza natpisi + indikator ----------
const fazaEl = document.getElementById('faza');
const fazaNaslov = fazaEl.querySelector('.faza-naslov');
const fazaTekst = fazaEl.querySelector('.faza-tekst');
const indikator = document.getElementById('fazeIndikator');
FAZE.forEach((f, i) => {
  const d = document.createElement('div');
  d.className = 'fi';
  d.innerHTML = `<span class="tacka"></span><span class="lbl">${f.naslov}</span>`;
  indikator.appendChild(d);
});
const fiEls = indikator.querySelectorAll('.fi');
let fazaIdx = -1;
function prikaziFazu(p) {
  let idx = 0;
  for (let i = 0; i < FAZE.length; i++) if (p >= FAZA_OD[i]) idx = i;
  if (idx === fazaIdx) return;
  fazaIdx = idx;
  fiEls.forEach((el, i) => { el.classList.toggle('act', i === idx); el.classList.toggle('done', i < idx); });
  fazaEl.classList.remove('on');
  // kratak treptaj da se vidi da je NOVA faza
  setTimeout(() => {
    fazaNaslov.textContent = FAZE[idx].naslov;
    fazaTekst.textContent = FAZE[idx].tekst;
    fazaEl.classList.add('on');
  }, 160);
}
function indikatorVidljiv(on) { indikator.classList.toggle('on', on); }

// ---------- Režimi ----------
if (rezim === 'staticno') {
  prikaziFazu(0);
  loaderGotov();
}

if (rezim === 'film') {
  document.body.classList.add('rezim-film');
  const v = document.getElementById('film');
  const next = document.getElementById('filmNext');
  loaderGotov(); // film se pufira sam; ne držimo korisnika na loaderu

  const pre = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { try { v.load(); } catch (err) {} pre.disconnect(); }
  }, { rootMargin: '400px 0px' });
  pre.observe(v);

  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      indikatorVidljiv(e.isIntersecting);
      if (e.isIntersecting && !v.ended) v.play().catch(() => {});
      else if (!e.isIntersecting) v.pause();
    });
  }, { threshold: 0.35 });
  io.observe(v);

  v.addEventListener('timeupdate', () => { if (v.duration) prikaziFazu(v.currentTime / v.duration); });
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
  setTimeout(startWave2, 6000); // sigurnosna kočnica

  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: '+=' + Math.round(UKUPNO * 3.4) + '%', // ~3.4% skrola po frejmu → miran, čitljiv tempo
    pin: true,
    scrub: true,
    onToggle: (self) => indikatorVidljiv(self.isActive),
    onUpdate: (self) => {
      draw(Math.round(self.progress * (N - 1)));
      prikaziFazu(self.progress);
    },
  });
  prikaziFazu(0);

  // veliki naslov bledi čim gradnja krene, da ne stoji preko slike
  gsap.to('.hero-caption', {
    opacity: 0, y: -30, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=45%', scrub: true },
  });
  gsap.to('.scrollhint', {
    opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=20%', scrub: true },
  });
}

// ---------- Reveal sekcija (svi režimi osim staticno) ----------
if (rezim !== 'staticno' && window.gsap) {
  gsap.registerPlugin(ScrollTrigger);
  document.querySelectorAll('.sekcija, .strip').forEach((s) => {
    const mete = s.querySelectorAll('.kicker, h2, .lead, .kartica, .fact, .cta.velika');
    if (!mete.length) return;
    gsap.from(mete, {
      opacity: 0, y: 26, duration: 0.7, ease: 'power2.out', stagger: 0.07,
      scrollTrigger: { trigger: s, start: 'top 80%', toggleActions: 'play none none reverse' },
    });
  });
}
