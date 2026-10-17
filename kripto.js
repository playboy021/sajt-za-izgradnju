// Panonka · Kripto odeljak (DEMO).
// Pravilo bezbednosti: sajt NIKAD ne šalje transakciju. Jedini pozivi ka novčaniku su
// eth_requestAccounts (čitanje adrese) i personal_sign (potpis poruke, bez gasa i bez novca).

const KURS_REZERVA = { BTC: 72528, ETH: 2158.61, USDT: 0.889 }; // snimljeno 2026-10-17; samo ako CoinGecko ne odgovori
const NAKNADA = 0.01; // primer modela: 0,5% menjač + 0,5% integracija
const TIPOVI = { garsonjera: 'Garsonjera', dvosoban: 'Dvosoban', trosoban: 'Trosoban', cetvorosoban: 'Četvorosoban' };
const TIPOVI_MN = { garsonjera: 'Garsonjere', dvosoban: 'Dvosobni', trosoban: 'Trosobni', cetvorosoban: 'Četvorosobni' };
const DECIMALE = { EUR: 0, BTC: 4, ETH: 2, USDT: 0 };
const KORACI = ['Iznos', 'Potpis', 'Konverzija', 'Ugovor', 'NFT'];

const S = {
  adresa: null, izvor: null,
  valuta: 'EUR', filter: 'svi',
  kurs: { ...KURS_REZERVA }, promena: {}, kursUzivo: false,
  stanovi: [], prodato: 0,
  izabran: null, korak: 0, fiokaValuta: 'BTC', potpis: null, konvertovano: false, nft: null,
};

const $ = (id) => document.getElementById(id);
const smanjenPokret = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- formatiranje ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (v, val) => new Intl.NumberFormat('sr-RS', { minimumFractionDigits: DECIMALE[val], maximumFractionDigits: DECIMALE[val] }).format(v);
const fmtEur = (v) => fmt(v, 'EUR') + ' €';
const uValuti = (eur, val) => (val === 'EUR' ? eur : eur / S.kurs[val]);
const kratko = (a, n = 4) => (a ? a.slice(0, 2 + n) + '…' + a.slice(-n) : '');
const randHex = (bajtova) => '0x' + [...crypto.getRandomValues(new Uint8Array(bajtova))].map((b) => b.toString(16).padStart(2, '0')).join('');

// avatar iz adrese: dve boje izvedene iz bajtova adrese, kao blockies ali bez biblioteke
function avatar(adr) {
  const h1 = parseInt(adr.slice(2, 6), 16) % 360;
  const h2 = (h1 + 40 + (parseInt(adr.slice(6, 8), 16) % 120)) % 360;
  return `conic-gradient(from ${parseInt(adr.slice(8, 10), 16)}deg, hsl(${h1} 85% 58%), hsl(${h2} 90% 55%), hsl(${h1} 85% 58%))`;
}

// ---------- podaci: zvanični cenovnik ----------
function cenaPoM2(cene, a) {
  const vip = a.sprat >= 9 && a.sprat <= 14 && ['garsonjera', 'trosoban', 'cetvorosoban'].includes(a.sobe);
  const kljuc = vip ? a.sobe + 'VIP' : a.sobe;
  // u njihovom prices.json piše "garsonjeraVIP:" (dvotačka viška), pa njihov birač za VIP garsonjere dobija 0 € — čitamo oba
  return { m2: cene[kljuc] ?? cene[kljuc + ':'] ?? cene[a.sobe] ?? 0, vip };
}

async function ucitajPodatke() {
  try {
    const [stanovi, cene] = await Promise.all([
      fetch('data/stanovi-izvor.json').then((r) => r.json()),
      fetch('data/cene-izvor.json').then((r) => r.json()),
    ]);
    S.prodato = stanovi.filter((a) => a.status === 'prodat').length;
    S.stanovi = stanovi
      .filter((a) => a.status === 'slobodan')
      .map((a) => {
        const { m2, vip } = cenaPoM2(cene, a);
        return { ...a, m2cena: m2, vip, cena: Math.round(m2 * a.kvadratura) };
      })
      .filter((a) => a.cena > 0);
  } catch (e) {
    $('mrezaStanova').innerHTML = '<p class="fusnota">Podaci o stanovima trenutno nisu dostupni.</p>';
    return;
  }
  $('statSlobodno').textContent = S.stanovi.length;
  $('statProdato').textContent = S.prodato;
  renderFilteri();
  renderMreza();
  renderTiker();
}

// ---------- kurs uživo ----------
async function ucitajKurs() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=eur&include_24hr_change=true', { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    S.kurs = { BTC: d.bitcoin.eur, ETH: d.ethereum.eur, USDT: d.tether.eur };
    S.promena = { BTC: d.bitcoin.eur_24h_change, ETH: d.ethereum.eur_24h_change, USDT: d.tether.eur_24h_change };
    S.kursUzivo = true;
  } catch (e) {
    S.kursUzivo = false;
  }
  renderTiker();
  osveziCene(false);
  if (!$('fioka').hidden && S.korak === 0) renderKorak();
}

function renderTiker() {
  const p = (v) => (v == null ? '' : `<span class="${v >= 0 ? 'gore' : 'dole'}">${v >= 0 ? '▲' : '▼'} ${fmt(Math.abs(v), 'ETH')}%</span>`);
  const najjeftiniji = S.stanovi.reduce((m, a) => (!m || a.cena < m.cena ? a : m), null);
  const stavke = [
    `<span class="ziv">●</span> ${S.kursUzivo ? 'KURS UŽIVO · CoinGecko' : 'KURS · poslednji poznat'}`,
    `BTC <b>${fmt(S.kurs.BTC, 'EUR')} €</b> ${p(S.promena.BTC)}`,
    `ETH <b>${fmt(S.kurs.ETH, 'EUR')} €</b> ${p(S.promena.ETH)}`,
    `USDT <b>${fmt(S.kurs.USDT, 'ETH')} €</b> ${p(S.promena.USDT)}`,
    najjeftiniji ? `Stan od <b>${fmt(uValuti(najjeftiniji.cena, 'BTC'), 'BTC')} BTC</b>` : '',
    `Slobodno <b>${S.stanovi.length}</b> stanova`,
    `1 m² od <b>${fmt(uValuti(Math.min(...S.stanovi.map((a) => a.m2cena)), 'BTC'), 'BTC')} BTC</b>`,
  ].filter(Boolean);
  const html = stavke.map((s) => `<span class="tiker-stavka">${s}</span>`).join('');
  $('tikerTraka').innerHTML = html + html; // duplikat za bešavnu petlju
}

// ---------- mreža stanova ----------
function renderFilteri() {
  const broj = (k) => (k === 'svi' ? S.stanovi.length : S.stanovi.filter((a) => a.sobe === k).length);
  const kljucevi = ['svi', ...Object.keys(TIPOVI).filter((k) => broj(k) > 0)];
  $('filteri').innerHTML = kljucevi.map((k) =>
    `<button type="button" class="filter${S.filter === k ? ' akt' : ''}" data-filter="${k}">${k === 'svi' ? 'Svi' : TIPOVI_MN[k]}<span>${broj(k)}</span></button>`
  ).join('');
}

function sporednaCena(a) {
  if (S.valuta === 'EUR') return `≈ ${fmt(uValuti(a.cena, 'BTC'), 'BTC')} BTC · ${fmt(a.m2cena, 'EUR')} €/m²`;
  return `= ${fmtEur(a.cena)} · ${fmt(a.m2cena, 'EUR')} €/m²`;
}

function renderMreza() {
  const lista = S.stanovi
    .filter((a) => S.filter === 'svi' || a.sobe === S.filter)
    .sort((a, b) => a.cena - b.cena);
  $('mrezaStanova').innerHTML = lista.map((a, i) => `
    <article class="stan" style="--i:${i}" data-id="${esc(a.id)}">
      <div class="stan-glava">
        <div>
          <div class="stan-oznaka">${esc(a.oznaka)}</div>
          <div class="stan-tip">${TIPOVI[a.sobe] || esc(a.sobe)} · Lamela ${esc(a.lamela)}</div>
        </div>
        ${a.vip ? '<span class="vip">VIP SPRAT</span>' : ''}
      </div>
      <div class="stan-podaci">
        <div><b>${fmt(a.kvadratura, 'ETH')}</b><small>m²</small></div>
        <div><b>${a.sprat}.</b><small>sprat</small></div>
        <div><b>${esc(a.lamela)}</b><small>lamela</small></div>
      </div>
      <div class="stan-cena">
        <div class="stan-cena-glavna"><span class="broj" data-eur="${a.cena}">${fmt(uValuti(a.cena, S.valuta), S.valuta)}</span><span class="jed">${S.valuta === 'EUR' ? '€' : S.valuta}</span></div>
        <div class="stan-cena-sporedna">${sporednaCena(a)}</div>
      </div>
      <div class="stan-akcije">
        <button type="button" class="btn-novcanik" data-rezervisi="${esc(a.id)}">Rezerviši kriptom</button>
        ${a.link ? `<a class="btn-osnova" href="${esc(a.link)}" target="_blank" rel="noopener" title="Osnova stana (PDF)">Osnova ↗</a>` : ''}
      </div>
    </article>`).join('');
}

// cene „vrte" od nule do nove vrednosti — mali slot-mašina efekat pri promeni valute
function osveziCene(animiraj = true) {
  const elementi = [...document.querySelectorAll('.stan-cena-glavna .broj')];
  document.querySelectorAll('.stan-cena-glavna .jed').forEach((el) => { el.textContent = S.valuta === 'EUR' ? '€' : S.valuta; });
  document.querySelectorAll('.stan').forEach((kartica) => {
    const a = S.stanovi.find((x) => x.id === kartica.dataset.id);
    if (a) kartica.querySelector('.stan-cena-sporedna').textContent = sporednaCena(a);
  });
  const ciljevi = elementi.map((el) => uValuti(Number(el.dataset.eur), S.valuta));
  if (!animiraj || smanjenPokret) {
    elementi.forEach((el, i) => { el.textContent = fmt(ciljevi[i], S.valuta); });
    return;
  }
  const t0 = performance.now(); const trajanje = 750; const val = S.valuta;
  (function korak(t) {
    const p = Math.min(1, (t - t0) / trajanje);
    const e = 1 - Math.pow(2, -10 * p);
    elementi.forEach((el, i) => { el.textContent = fmt(ciljevi[i] * e, val); });
    if (p < 1) requestAnimationFrame(korak);
  })(t0);
}

// ---------- čestice ----------
const platno = $('cestice');
const ctx = platno.getContext('2d');
let cestice = [];
let petljaAktivna = false;
function velicinaPlatna() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  platno.width = innerWidth * dpr; platno.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function pucaj(x, y, n) {
  if (smanjenPokret) return;
  const boje = ['#f26a2a', '#ff9a3d', '#ffd166', '#ffffff', '#ff3d6e'];
  for (let i = 0; i < n; i++) {
    const ugao = Math.random() * Math.PI * 2;
    const brzina = 4 + Math.random() * 11;
    cestice.push({
      x, y, vx: Math.cos(ugao) * brzina, vy: Math.sin(ugao) * brzina - 3,
      vel: 4 + Math.random() * 7, rot: Math.random() * 6, vrot: (Math.random() - 0.5) * 0.4,
      boja: boje[(Math.random() * boje.length) | 0], zivot: 1, krug: Math.random() < 0.35,
    });
  }
  if (!petljaAktivna) { petljaAktivna = true; poslednjiFrejm = performance.now(); requestAnimationFrame(petlja); }
}
// fizika po stvarnom vremenu (dt), ne po frejmu — na sporom telefonu konfete ne smeju da vise duže od ~2 s
let poslednjiFrejm = 0;
function petlja(sada) {
  const dt = Math.min(4, (sada - poslednjiFrejm) / 16.67 || 1);
  poslednjiFrejm = sada;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  cestice = cestice.filter((c) => c.zivot > 0 && c.y < innerHeight + 40);
  for (const c of cestice) {
    c.vy += 0.22 * dt; c.vx *= Math.pow(0.985, dt); c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vrot * dt; c.zivot -= 0.0085 * dt;
    ctx.save(); ctx.globalAlpha = Math.max(0, c.zivot); ctx.fillStyle = c.boja;
    ctx.translate(c.x, c.y); ctx.rotate(c.rot);
    if (c.krug) { ctx.beginPath(); ctx.arc(0, 0, c.vel / 2, 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(-c.vel / 2, -c.vel / 4, c.vel, c.vel / 2);
    ctx.restore();
  }
  if (cestice.length) requestAnimationFrame(petlja);
  else { petljaAktivna = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
}

function brojac(el, od, doVrednosti, ms) {
  if (smanjenPokret) { el.textContent = doVrednosti; return; }
  const t0 = performance.now();
  (function k(t) {
    const p = Math.min(1, (t - t0) / ms);
    el.textContent = Math.round(od + (doVrednosti - od) * (1 - Math.pow(2, -10 * p)));
    if (p < 1) requestAnimationFrame(k);
  })(t0);
}

// ---------- novčanik ----------
let fokusPreModala = null;
function otvoriModal() {
  fokusPreModala = document.activeElement;
  $('modalStatus').textContent = ''; $('modalStatus').className = 'modal-status';
  $('mmStatus').textContent = window.ethereum ? 'detektovan u ovom pregledaču' : 'nije instaliran — koristi Demo';
  $('modalNovcanik').hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('modalNovcanik').querySelector('.opcija.istaknuta').focus(), 50);
}
function zatvoriModal() {
  $('modalNovcanik').hidden = true;
  if ($('fioka').hidden) document.body.style.overflow = '';
  if (fokusPreModala) fokusPreModala.focus?.();
}
function statusModala(html, greska = false) {
  $('modalStatus').innerHTML = html;
  $('modalStatus').className = 'modal-status' + (greska ? ' greska' : '');
}

async function poveziMetaMask() {
  if (!window.ethereum) {
    statusModala('MetaMask nije pronađen u ovom pregledaču. Za prezentaciju izaberi Demo novčanik.', true);
    return;
  }
  statusModala('<span class="spiner"></span>Potvrdi povezivanje u MetaMask prozoru…');
  try {
    const nalozi = await window.ethereum.request({ method: 'eth_requestAccounts' });
    povezan(nalozi[0], 'metamask');
  } catch (e) {
    statusModala(e && e.code === 4001 ? 'Povezivanje je odbijeno u novčaniku.' : 'Povezivanje nije uspelo. Pokušaj ponovo.', true);
  }
}
function poveziDemo() {
  statusModala('<span class="spiner"></span>Povezujem demo novčanik…');
  setTimeout(() => povezan(randHex(20), 'demo'), 850);
}

function povezan(adresa, izvor) {
  S.adresa = adresa.toLowerCase(); S.izvor = izvor;
  zatvoriModal();
  $('btnPoveziTop').hidden = true;
  $('cipNovcanik').hidden = false;
  $('cipAdresa').textContent = kratko(S.adresa, innerWidth < 560 ? 3 : 4);
  $('cipAvatar').style.background = avatar(S.adresa);
  dopamin();
}

// dopaminski trenutak: udarni talas + čestice + brojač, pa otključavanje ponude
function dopamin() {
  const ov = $('povezano');
  $('povezanoAdresa').textContent = kratko(S.adresa, 6) + (S.izvor === 'demo' ? '  ·  demo' : '');
  ov.classList.remove('izlazi');
  ov.hidden = false;
  navigator.vibrate?.([25, 40, 70]);
  pucaj(innerWidth / 2, innerHeight / 2, 150);
  setTimeout(() => pucaj(innerWidth / 2, innerHeight / 2 - 60, 90), 420);
  brojac($('brojOtkljucano'), 0, S.stanovi.length, 1300);
  setTimeout(() => {
    ov.classList.add('izlazi');
    document.body.classList.add('otkljucano');
    renderMreza();
    $('stanovi').scrollIntoView({ behavior: smanjenPokret ? 'auto' : 'smooth' });
    setTimeout(() => { ov.hidden = true; }, 480);
  }, smanjenPokret ? 600 : 2300);
}

// ---------- fioka: rezervacija ----------
function otvoriFioku(id) {
  if (!S.adresa) { otvoriModal(); return; }
  const a = S.stanovi.find((x) => x.id === id);
  if (!a) return;
  Object.assign(S, { izabran: a, korak: 0, potpis: null, konvertovano: false, nft: null, fiokaValuta: S.valuta === 'EUR' ? 'BTC' : S.valuta });
  $('fiokaNaslov').textContent = `${a.oznaka} · ${TIPOVI[a.sobe] || a.sobe}`;
  $('fioka').hidden = false; $('fiokaPozadina').hidden = false;
  document.body.style.overflow = 'hidden';
  renderKorak();
  setTimeout(() => $('fiokaZatvori').focus(), 60);
}
function zatvoriFioku() {
  $('fioka').hidden = true; $('fiokaPozadina').hidden = true;
  document.body.style.overflow = '';
}

function iznosi() {
  const a = S.izabran; const v = S.fiokaValuta;
  const naknadaEur = a.cena * NAKNADA;
  return { a, v, naknadaEur, ukupnoKripto: uValuti(a.cena + naknadaEur, v), cenaKripto: uValuti(a.cena, v) };
}

function porukaPotpisa() {
  const { a, v, ukupnoKripto } = iznosi();
  const sada = new Date();
  const vreme = `${sada.getFullYear()}-${String(sada.getMonth() + 1).padStart(2, '0')}-${String(sada.getDate()).padStart(2, '0')} ${String(sada.getHours()).padStart(2, '0')}:${String(sada.getMinutes()).padStart(2, '0')}`;
  return [
    'PANONKA · KRIPTO REZERVACIJA (DEMO)',
    `Stan: ${a.oznaka} · Lamela ${a.lamela} · ${a.sprat}. sprat · ${fmt(a.kvadratura, 'ETH')} m²`,
    `Cena: ${fmtEur(a.cena)} (≈ ${fmt(ukupnoKripto, v)} ${v} sa naknadom)`,
    `Novčanik: ${S.adresa}`,
    `Vreme: ${vreme}`,
    'Ova poruka ne prenosi sredstva i ne košta ništa.',
  ].join('\n');
}

function renderStepper() {
  $('stepper').innerHTML = KORACI.map((k, i) =>
    `<span class="${i < S.korak ? 'gotov' : i === S.korak ? 'akt' : ''}" title="${k}"></span>`).join('');
}

function renderKorak() {
  renderStepper();
  const telo = $('fiokaTelo');
  const { a, v, naknadaEur, ukupnoKripto } = iznosi();
  const oznakaKoraka = `<div class="korak-oznaka">KORAK ${Math.min(S.korak + 1, 5)} / 5 · ${KORACI[Math.min(S.korak, 4)].toUpperCase()}</div>`;
  let html = '';

  if (S.korak === 0) {
    html = `${oznakaKoraka}
      <h4>Koliko košta u tvom novcu</h4>
      <p>Cena stana je u evrima, po zvaničnom cenovniku. Izaberi kriptovalutu kojom plaćaš — iznos se računa po kursu uživo.</p>
      <div class="iznos">
        <div class="iznos-glavni"><span class="broj">${fmt(ukupnoKripto, v)}</span><span class="jed">${v}</span></div>
        <div class="iznos-sporedni">šalješ menjaču · uključena naknada</div>
        <div class="mini-valute"><div class="valute">${['BTC', 'ETH', 'USDT'].map((x) =>
          `<button type="button" data-mval="${x}" class="${x === v ? 'akt' : ''}">${x}</button>`).join('')}</div></div>
      </div>
      <div class="razlaganje">
        <div><span>Cena stana</span><span>${fmtEur(a.cena)}</span></div>
        <div><span>Kvadratura × cena po m²${a.vip ? ' (VIP)' : ''}</span><span>${fmt(a.kvadratura, 'ETH')} m² × ${fmt(a.m2cena, 'EUR')} €</span></div>
        <div><span>Naknada konverzije (primer)</span><span>${Math.round(NAKNADA * 100)}% · ${fmtEur(naknadaEur)}</span></div>
        <div class="ukupno"><span>Šalješ menjaču</span><span>${fmt(ukupnoKripto, v)} ${v}</span></div>
      </div>
      <div class="kurs-info">1 ${v} = ${fmt(S.kurs[v], v === 'USDT' ? 'ETH' : 'EUR')} € · CoinGecko · ${S.kursUzivo ? 'uživo' : 'poslednji poznat kurs'}</div>
      <div class="fioka-akcije"><button type="button" class="btn-novcanik" data-akcija="dalje">Dalje: potpiši rezervaciju →</button></div>`;
  }

  if (S.korak === 1) {
    html = `${oznakaKoraka}
      <h4>Potpiši rezervaciju</h4>
      <p>Potpis poruke dokazuje da je novčanik tvoj. Ne šalje novac i ne košta ništa — nema gas naknade.</p>
      <div class="poruka">${esc(porukaPotpisa())}</div>
      <div id="potpisRez">${S.potpis ? `<div class="potpis-rez"><b>✓ Potpisano</b>${S.izvor === 'demo' ? ' · demo potpis' : ' · MetaMask'}<span class="mono">${esc(S.potpis.slice(0, 66))}…</span></div>` : ''}</div>
      <div class="fioka-akcije">
        <button type="button" class="btn-nazad" data-akcija="nazad">←</button>
        ${S.potpis
          ? '<button type="button" class="btn-novcanik" data-akcija="dalje">Dalje: konverzija →</button>'
          : `<button type="button" class="btn-novcanik" data-akcija="potpisi">Potpiši ${S.izvor === 'demo' ? 'demo novčanikom' : 'u MetaMask-u'}</button>`}
      </div>`;
  }

  if (S.korak === 2) {
    const st = S.konvertovano ? ['poslato ✓', 'konvertovano ✓', 'primljeno ✓'] : ['čeka', 'čeka', 'čeka'];
    const kl = S.konvertovano ? ' gotov' : '';
    html = `${oznakaKoraka}
      <h4>Konverzija preko licenciranog menjača</h4>
      <p>Kripto šalješ menjaču sa dozvolom NBS — ne ZONED-u. Menjač ga odmah menja u dinare po kursu u trenutku uplate i ZONED-u uplaćuje kupoprodajnu cenu.</p>
      <div class="tok-mini" id="tokMini">
        <div class="tok-mini-cvor${kl}" data-cvor="0"><span class="ik">◈</span><div><b>Tvoj novčanik</b><small>${fmt(ukupnoKripto, v)} ${v}</small></div><span class="st">${st[0]}</span></div>
        <div class="tok-mini-veza"></div>
        <div class="tok-mini-cvor${kl}" data-cvor="1"><span class="ik">⇄</span><div><b>Licencirani menjač</b><small>dozvola NBS · ${v} → RSD</small></div><span class="st">${st[1]}</span></div>
        <div class="tok-mini-veza"></div>
        <div class="tok-mini-cvor${kl}" data-cvor="2"><span class="ik">⌂</span><div><b>ZONED</b><small>${fmtEur(a.cena)} u dinarskoj protivvrednosti</small></div><span class="st">${st[2]}</span></div>
      </div>
      <div class="kurs-info">U demo verziji ništa se ne šalje — ovo je prikaz toka.</div>
      <div class="fioka-akcije">
        <button type="button" class="btn-nazad" data-akcija="nazad">←</button>
        ${S.konvertovano
          ? '<button type="button" class="btn-novcanik" data-akcija="dalje">Dalje: ugovor →</button>'
          : '<button type="button" class="btn-novcanik" data-akcija="konvertuj">Simuliraj konverziju</button>'}
      </div>`;
  }

  if (S.korak === 3) {
    html = `${oznakaKoraka}
      <h4>Ugovor kod javnog beležnika</h4>
      <p>Od ovog koraka sve je isto kao kod svake kupovine stana. Kripto je završio svoj posao.</p>
      <ul class="lista-provera">
        <li><span class="ik">1</span><div><b>Kupoprodajni ugovor sa ZONED-om</b><small>Standardni ugovor, cena u dinarskoj protivvrednosti.</small></div></li>
        <li><span class="ik">2</span><div><b>Overa kod javnog beležnika</b><small>Lično ili preko punomoćnika.</small></div></li>
        <li><span class="ik">3</span><div><b>Upis u katastar</b><small>Jedini zakonski dokaz vlasništva.</small></div></li>
        <li><span class="ik">4</span><div><b>Otisak ugovora</b><small>Iz overenog ugovora računa se hash koji ide u tvoj NFT — sam ugovor ostaje šifrovan, van lanca.</small></div></li>
      </ul>
      <div class="fioka-akcije">
        <button type="button" class="btn-nazad" data-akcija="nazad">←</button>
        <button type="button" class="btn-novcanik" data-akcija="dalje">Dalje: NFT sertifikat →</button>
      </div>`;
  }

  if (S.korak === 4) {
    html = `${oznakaKoraka}
      <h4>Tvoj NFT sertifikat</h4>
      <p>Posle overe ZONED kuje NFT u tvoj novčanik: javni podaci stana, otisak ugovora i šifrovani trezor dokumenata.</p>
      <div class="kovanje" id="kovanje">${S.nft ? nftKartaHtml() : '<button type="button" class="btn-novcanik veliko" data-akcija="kuj">◈ Iskuj NFT (simulacija)</button>'}</div>
      <div class="fioka-akcije">
        <button type="button" class="btn-nazad" data-akcija="nazad">←</button>
        <button type="button" class="btn-novcanik" data-akcija="zavrsi" ${S.nft ? '' : 'disabled'}>Završi rezervaciju</button>
      </div>`;
  }

  if (S.korak === 5) {
    html = `<div class="kraj">
        <div class="kraj-ikona">✓</div>
        <h4>Rezervacija simulirana</h4>
        <p>Stan <b>${esc(a.oznaka)}</b> je u ovom demou rezervisan za novčanik <span class="mono">${kratko(S.adresa)}</span>.
          U pravoj verziji prodajni tim ZONED-a te kontaktira radi ugovora, a menjač šalje instrukcije za uplatu.</p>
        <p>U ovom demou ništa nije poslato niti naplaćeno.</p>
      </div>
      <div class="fioka-akcije"><button type="button" class="btn-novcanik" data-akcija="zatvori">Zatvori</button></div>`;
  }

  telo.innerHTML = `<div class="korak-panel">${html}</div>`;
  telo.scrollTop = 0;
}

function nftKartaHtml() {
  const a = S.izabran;
  return `<div class="nft-karta mini-karta">
      <div class="nft-slika" style="background-image:url('media/nft-panonka.webp')"></div>
      <div class="nft-holo"></div>
      <div class="nft-gore"><span>PANONKA · SERTIFIKAT</span><span class="mono">#${S.nft.broj}</span></div>
      <div class="nft-dole">
        <div class="nft-oznaka">${esc(a.oznaka)}</div>
        <div class="nft-detalji">Lamela ${esc(a.lamela)} · ${a.sprat}. sprat · ${fmt(a.kvadratura, 'ETH')} m²</div>
        <div class="nft-hash mono">ugovor ⟶ ${kratko(S.nft.hash, 4)}</div>
        <div class="nft-hash mono" style="color:var(--mut)">vlasnik ⟶ ${kratko(S.adresa, 4)}</div>
        <div class="nft-cipovi"><span>ERC-721</span><span>🔒 trezor</span></div>
      </div>
    </div>`;
}

async function potpisi() {
  const dugme = $('fiokaTelo').querySelector('[data-akcija="potpisi"]');
  dugme.disabled = true;
  dugme.innerHTML = '<span class="spiner"></span>Čekam potpis…';
  try {
    if (S.izvor === 'metamask' && window.ethereum) {
      const poruka = porukaPotpisa();
      const hex = '0x' + [...new TextEncoder().encode(poruka)].map((b) => b.toString(16).padStart(2, '0')).join('');
      S.potpis = await window.ethereum.request({ method: 'personal_sign', params: [hex, S.adresa] });
    } else {
      await new Promise((r) => setTimeout(r, 1100));
      S.potpis = randHex(65);
    }
    pucaj(innerWidth - 270, innerHeight / 2, 50);
    renderKorak();
  } catch (e) {
    dugme.disabled = false;
    dugme.textContent = 'Potpiši ponovo';
    $('potpisRez').innerHTML = `<div class="potpis-rez" style="border-color:rgba(255,61,110,.45);background:rgba(255,61,110,.07)">${e && e.code === 4001 ? 'Potpis je odbijen u novčaniku.' : 'Potpis nije uspeo.'}</div>`;
  }
}

function konvertuj() {
  const dugme = $('fiokaTelo').querySelector('[data-akcija="konvertuj"]');
  dugme.disabled = true; dugme.innerHTML = '<span class="spiner"></span>Konverzija u toku…';
  const cvorovi = [...document.querySelectorAll('#tokMini .tok-mini-cvor')];
  const veze = [...document.querySelectorAll('#tokMini .tok-mini-veza')];
  const tekst = [['šaljem…', 'poslato ✓'], ['menjam…', 'konvertovano ✓'], ['prima…', 'primljeno ✓']];
  const korak = smanjenPokret ? 150 : 950;
  cvorovi.forEach((c, i) => {
    setTimeout(() => {
      c.classList.add('aktivan'); c.querySelector('.st').textContent = tekst[i][0];
      if (veze[i - 1]) veze[i - 1].classList.remove('tece');
    }, i * korak);
    setTimeout(() => {
      c.classList.remove('aktivan'); c.classList.add('gotov'); c.querySelector('.st').textContent = tekst[i][1];
      if (veze[i]) veze[i].classList.add('tece');
    }, i * korak + korak * 0.8);
  });
  setTimeout(() => { S.konvertovano = true; pucaj(innerWidth - 270, innerHeight / 2, 40); renderKorak(); }, cvorovi.length * korak + 200);
}

function kuj() {
  $('kovanje').innerHTML = `<div class="kovanje-spin"><span class="spiner"></span>Kujem sertifikat…<br>blok #${(48000000 + Math.floor(Math.random() * 999999)).toLocaleString('sr-RS')}</div>`;
  setTimeout(() => {
    S.nft = { broj: String(1 + Math.floor(Math.random() * 610)).padStart(4, '0'), hash: randHex(32) };
    pucaj(innerWidth - 270, innerHeight * 0.45, 120);
    navigator.vibrate?.([20, 30, 50]);
    renderKorak();
  }, smanjenPokret ? 200 : 1700);
}

// ---------- NFT karta: 3D nagib + holografski sjaj ----------
function nagib(scena, karta) {
  if (smanjenPokret) return;
  scena.addEventListener('pointermove', (e) => {
    const r = karta.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width; const y = (e.clientY - r.top) / r.height;
    karta.style.setProperty('--ry', `${(x - 0.5) * 22}deg`);
    karta.style.setProperty('--rx', `${(0.5 - y) * 18}deg`);
    karta.style.setProperty('--hx', `${x * 100}%`);
    karta.style.setProperty('--hy', `${y * 100}%`);
  });
  scena.addEventListener('pointerleave', () => {
    ['--rx', '--ry'].forEach((p) => karta.style.setProperty(p, '0deg'));
  });
}

// ---------- događaji ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('button, [data-zatvori]');
  if (!t) return;
  if (t.matches('#btnPoveziTop, #btnPoveziHero, #btnPoveziBrava')) return otvoriModal();
  if (t.matches('[data-zatvori]')) return zatvoriModal();
  if (t.dataset.novcanik === 'metamask') return poveziMetaMask();
  if (t.dataset.novcanik === 'demo') return poveziDemo();
  if (t.dataset.valuta) {
    S.valuta = t.dataset.valuta;
    document.querySelectorAll('#valute button').forEach((b) => {
      b.classList.toggle('akt', b === t); b.setAttribute('aria-selected', b === t ? 'true' : 'false');
    });
    return osveziCene(true);
  }
  if (t.dataset.filter) { S.filter = t.dataset.filter; renderFilteri(); renderMreza(); return; }
  if (t.dataset.rezervisi) return otvoriFioku(t.dataset.rezervisi);
  if (t.id === 'fiokaZatvori') return zatvoriFioku();
  if (t.dataset.mval) { S.fiokaValuta = t.dataset.mval; return renderKorak(); }
  switch (t.dataset.akcija) {
    case 'dalje': S.korak = Math.min(5, S.korak + 1); return renderKorak();
    case 'nazad': S.korak = Math.max(0, S.korak - 1); return renderKorak();
    case 'potpisi': return potpisi();
    case 'konvertuj': return konvertuj();
    case 'kuj': return kuj();
    case 'zavrsi': S.korak = 5; renderKorak(); pucaj(innerWidth - 270, innerHeight * 0.3, 160); return;
    case 'zatvori': return zatvoriFioku();
  }
});
$('fiokaPozadina').addEventListener('click', zatvoriFioku);
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('modalNovcanik').hidden) zatvoriModal();
  else if (!$('fioka').hidden) zatvoriFioku();
});
// reflektor na kartici prati miš
$('mrezaStanova').addEventListener('pointermove', (e) => {
  const k = e.target.closest('.stan'); if (!k) return;
  const r = k.getBoundingClientRect();
  k.style.setProperty('--mx', `${e.clientX - r.left}px`);
  k.style.setProperty('--my', `${e.clientY - r.top}px`);
});
window.ethereum?.on?.('accountsChanged', (nalozi) => {
  if (!S.adresa || S.izvor !== 'metamask' || !nalozi[0]) return;
  S.adresa = nalozi[0].toLowerCase();
  $('cipAdresa').textContent = kratko(S.adresa, innerWidth < 560 ? 3 : 4);
  $('cipAvatar').style.background = avatar(S.adresa);
});
window.addEventListener('resize', velicinaPlatna);

// ---------- start ----------
velicinaPlatna();
nagib(document.querySelector('.nft-scena'), $('nftKarta'));
ucitajPodatke().then(ucitajKurs);
setInterval(ucitajKurs, 60000);
