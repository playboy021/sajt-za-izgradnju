# ZONED Panonka — pilot: kompleks se gradi na skrol

**Šta je ovo:** pilot sajt za investitora (ZONED Group). Hero u kome korisnik skrolom
gradi kompleks od praznog placa do gotovog objekta. Motor: niz slika na skrol-scrub
(kao Meridian tura), NE 3D u browseru, NE video premotavanje. Jezik sajta: srpski.
Na sajtu OBAVEZNO stoji diskretna oznaka „DEMO · prototip".

**Podaci o projektu:** samo sa zonedpanonka.rs — 610 stanova, 14 spratova, 902 parking
mesta (2 podzemne etaže), 10.000 m² dvorišta, 21 poslovni prostor, vrtić, igralište,
teretana, 2 biciklističke staze, smart home, zidovi 33 cm. Futoška 80, +381 62 600 900,
birač stanova: app.zonedpanonka.rs. NE izmišljati cene, rokove, broj prodatih stanova.

## ZAKONI

1. **Pozadina se NE SME menjati — menja se samo plac.** Svaka faza se kompozituje
   kroz masku na JEDNU master ploču. Pozadina uvek dolazi iz master fajla, nikad iz
   generisanog frejma (AI regeneriše ceo kadar pa pozadina „šušti" — dokazano diff-om
   `assets-src/_diff-stil.png`).
2. **Ploča = RENDER kadar, ne prazan plac.** Prazni i render kadrovi iz njihovog videa
   nisu piksel-identični (dron se pomerio), pa je ploča kadar SA renderom — faza 6 je
   time doslovno njihova geometrija (nula AI rizika), a faza 1 (prazan plac) se
   AI-inpaintuje unutar maske po referenci pravog praznog kadra.
3. **Art pravac: „fikcija"** — stilizovan filmski look preko celog kadra (odobren
   pristup, referenca: IG reel sachin.with.ai sa kućom koja se gradi na skrol).
   Stilizacija ublažava kolaž problem jer ceo kadar deli isti likovni jezik, ali
   zakon 1 i dalje važi.
4. **Faza 6 = njihova geometrija.** Posle svakog AI prolaza uporedi broj spratova,
   ritam prozora, obris krova sa izvornim renderom. Ako se pomerilo — odbaci.
5. **Redosled proizvodnje:** prvo JEDAN prelaz, sastavi u skrol, pogledaj — pa tek
   onda ostali. Ne generisati svih 5 unapred.
6. **Provere po frejmu:** test treptaja (ploča ↔ kompozit), test žmirenja, test 3 s.
7. Telefon nema scroll-scrub → auto-video + „Skroluj dalje ↓". Poštuju se
   prefers-reduced-motion i saveData. Frejmovi u talasima (prvo svaki 8.).

## Šest faza (tekstovi odobreni kao predlog)

1. **Lokacija** — „Plac uz Dunavski park, u srcu Novog Sada. Danas raščišćen — spreman za gradnju."
2. **Temelji** — „Iskop ide dve etaže u dubinu. Ispod zemlje: 902 parking mesta."
3. **Konstrukcija** — „Skelet raste sprat po sprat — do četrnaestog. Zidovi između stanova: 33 cm."
4. **Fasada** — „Objekat se zatvara. Aluminijumska stolarija, fasade u bojama Panonke."
5. **Uređenje** — „10.000 m² zajedničkog dvorišta: igralište, vrtić, teretana na otvorenom, drvored."
6. **Panonka** — „610 stanova i 21 poslovni prostor. Kao nekad — gradi se sa pažnjom na kvalitet."

## Higgsfield (MCP)

- **Video prelazi: `flux_3_video` (72 kr, 8 s 1080p) — ZVANIČNI izbor po odluci korisnika
  (2026-08-31).** FLUX sam od sebe uradi „uron": kamera se u sredini klipa približi gradilištu
  pa se vrati na širok kadar, a prvi/poslednji frejm ostanu verni ulazima. Korisnik je to
  video i ODUŠEVIO se — stroga statika (zakon 1) je za PRELAZE ukinuta; i dalje važi da
  krajnje tačke (faze-slike) dele istu ploču. Prompt: „may slowly push in closer... then
  smoothly pull back out to the exact original wide framing before the end".
- `wan3_0_prime` (46,2 kr za 6 s) drži kameru savršeno statičnom („locked tripod" prompt +
  enable_thinking) — čuvamo ga kao rezervu ako neki FLUX prelaz odluta bez vraćanja.
  Odbačeni statični klip: assets-src/prelaz-1-2-wan.mp4.
- Higgsfield ume da ubaci preset_recommendation notice — ponoviti poziv sa
  `declined_preset_id` iz notice-a.
- **Slike:** `nano_banana_pro`, 2k, 16:9 = **2 kredita po slici**. Radi odlično
  instrukcijske edite uz očuvanje kompozicije. Povremeno lažni NSFW flag (reč
  „toy-like"?) ili failed — samo ponovi/preformuliši.
- Upload: `media_upload` → curl PUT → `media_confirm`. Reference se prosleđuju kao
  `image_references` (media_id ili job_id prethodne generacije).
- Stanje kredita pratiti sa `balance` — početno ~834.

## Ključni asseti (assets-src/)

- `ploca-render.png` — izvorni render kadar iz njihovog videa (osnova svega)
- `ploca-prazno.png` — pravi prazan plac, ista pozicija kamere (referenca za fazu 1)
- `stil-1-painterly.png` — **MASTER PLOČA** u odobrenom stilu (2752×1536, job 564ff154)
- `faza-1-prazno-stil1.png` — faza 1 u istom stilu (job 2f3098c1)
- `_diff*.png` — kontrolni diff-ovi

## KOREOGRAFIJA KAMERE — zakon korisnika (2026-08-31, FINALNO)

1. **V1 (postojeći flux prelaz-1-2): DOBAR, ali se SECHE na vrhuncu urona** — frejm n=115.
   Kamera krene široko, uroni, i TU STAJE. Frejmovi posle n=115 se ne koriste.
2. **Dok traje gradnja kamera MIRUJE** na tom krupnom kadru (sidro K2 = frejm n=115).
   V2 (temelji→skelet) i V3 (skelet→fasada) su statični klipovi između krupnih sidara.
3. **Tek kad je gradnja gotova kamera se udalji** — V4: krupno → široki hiper-real finale,
   uređenje dvorišta se dešava tokom izlaska (štedi poseban prelaz za fazu 5).
4. **Geometrija:** master render je SKICA — zgrade moraju od temelja rasti u svojim
   konačnim oblicima (bela kula na uglu SAMA; desno spojene bela+cigla manje; iza ostale;
   zakrivljena cigla zgrada uz desnu ulicu). Ništa se ne izmišlja.
5. **Finale NIJE njihov 3D look nego hiper-realizam** (finale-hiperreal.png).
6. **Jedan pokušaj po generaciji.** Bez varijanti, bez dupliranja. Promašaj → stop + javiti.

## Sidra (assets-src/, jobovi na Higgsfieldu)

- `k2-temelji-krupno.png` — frejm n=115 iz flux V1 (media 21ab9307), BESPLATAN
- `k3-skelet-krupno.png` — job 75f62a02 · `k4-fasada-krupno.png` — job 06080bb4
- `finale-hiperreal.png` — job 58ca9cab (široki hiper-real kraj)

## KRAJ PRIČE (2026-09-01) — tri klipa posle V3

Korisnikov zahtev: kraj mora izgledati KAO PRAVI SNIMAK („brutalnije od njihovog 3D-a").
- **V4-zavrsni-radovi** (statika): K4 → K5 (fasade 100%, kranovi/ograda odlaze, dvorište niče)
- **V5-ulazak-u-dvoriste**: K5 → K6, kamera JEDNIM potezom uranja u dvorište; K6 je
  FOTOREALNO dvorište (geometrija = njihov render kadar dvorišta, ref screenshot 566)
- **V6-finalno-udaljavanje**: K6 → finale-hiperreal (široki kadar), kamera se diže i izlazi
- Stara V4 (K4→finale u jednom klipu) je HALUCINIRALA nepostojeće zgrade — zato je kraj
  isečen na tri mala klipa sa čvrstim sidrima; u promptu OBAVEZNO: „scene is exactly the
  two provided frames, do not invent/add/move buildings".
- Nova sidra: `k5-gotovo-krupno.png` (job 0ee4c5e4) · **`k6b-dvoriste-nase.png` (job 1b6f4996)**.
- **ZAMKA (2026-09-02):** prvo K6 je rađeno po NJIHOVOM renderu dvorišta (bele/cigla zgrade) —
  Veo je onda usred V5 „pretopio" naše mint zgrade u njihove → „sve se izmeni u jednom momentu".
  Pravilo: **svako sidro se izvodi iz PRETHODNOG sidra istog niza** (K6 iz K5), nikad iz
  tuđe slike; tuđi render služi samo za raspored, ne kao referenca u promptu za sidro.
- Montaža na sajtu (167 frejmova): V1 uron f001–f039 → V2 f040–f103 → V3 f104–f167.
  Kad stignu V4/V5/V6 iz Flow-a: nastaviti numeraciju i produžiti pin.

## Google Flow (Veo) — drugi izvor klipova (korisnikovi krediti tamo)

- Paketi za ručno generisanje: `D:\projekti\panonka\flow-paketi\V2..V4\` (start.png +
  end.png + prompt.txt). Režim u Flow: **Frames to Video** (prvi I poslednji kadar),
  16:9, 1080p. Korisnik spušta gotov mp4 u assets-src kao `v2.mp4`/`v3.mp4`/`v4.mp4`.
- Mešanje modela je bezbedno jer su svi klipovi omeđeni istim slikama-sidrima.
- Fallback ako Veo promaši: wan3_0_prime (statika) / flux (pokret kamere) na Higgsfieldu.

## Izmereno (2026-08-31, tri prelaza 1→2→3→4 u produkciji — ZASTARELO, čeka novu montažu)

- Korisnik tražio KVALITET iznad težine za prototip: **hi = 1600px q6** (64 frejma/prelaz,
  fps=8 iz 8 s klipa). Ukupno 192 frejma: **hi 34 MB · md 1024px 18 MB · film 1280p crf28
  5,6 MB.** Za finalnu doradu: smanjiti frejmove/q (korisnik svestan, „kasnije doradjujemo").
- Faze-slike: nano banana pro 2k = 2 kr. Prelazi: flux 8 s = 72 kr.
- Potrošeno ukupno ~342 kr (4 faze-slike + 3× flux prelaza + 1 flux promašaj koji je postao
  zvanični stil + wan proba); stanje ~490.
- Sajt je ŽIV na Vercelu: sajt-za-izgradnju.vercel.app (auto-deploy na push u main).

## Zamke okruženja (nasleđene iz megaz — VAŽE I OVDE)

- **Skriveni Browser panel = crni screenshotovi + zamrznut rAF.** Sajt radi, ali
  ScrollTrigger ne dobija tick pa JS probe pokazuju „zaglavljen" frejm. Verifikuj kroz
  DOM/canvas pixel test, ili traži od korisnika da panel drži otvoren. `tabs_context`
  kaže da li je panel prikazan.
- Browser panel uzak (<900 px) → motor legitimno bira režim „film"; za desktop test
  obavezno `resize_window` na 1440×900 pa reload.
- `npx serve` u launch.json umire tiho — koristiti `python -m http.server`.

## Motor (prepisuje se, ne piše iznova)

- `D:\projekti\megaz`: lib/device.js (tieri), spring, scrollLock, remScale,
  SmoothScroll (Lenis), Loader (000→100), Reveal. Obavezno pročitati megaz CLAUDE.md
  (zamka: skriveni Browser panel i raf: 0).
- `C:\Users\Stefan\Documents\GitHub\sajt za nekretnine`:
  pages/demo/the-meridian.js — scroll-scrub logika (talasi, draw() fallback, pin+scrub).

## Struktura sajta

Loader → HERO (gradnja na skrol) → Šta je Panonka (brojevi) → Sadržaji → Lokacija →
Kontakt (Futoška 80 + link na njihov birač). Bez sopstvenog birača i cenovnika.
Nov GitHub repo + nov Vercel projekat, javno.

## STANJE 2026-09-02 — kompletan niz V1–V6 na sajtu

- Deonice: V1 uron (flux, sečen n=115) → V2/V3/V4 (Veo, statika) → V5 (Veo, ulazak u
  dvorište) → V6 (wan3_0, 33 kr, izlazak na široki kadar). GRANICE = [39,87,135,183,247,295].
- **Frejmovi: 1920×1080 WebP q66** (hi, 66 MB) / 1280 (md, 39 MB) / film 1024p 5,5 MB.
  Statične deonice 6 fps, deonice sa pokretom kamere 8 fps. Korisnik izričito traži
  oštrinu iznad težine („brutalna rezolucija") — ne spuštati ispod 1920 za hi.
- Mutnoća na sajtu je dolazila od: 1600→1920 upscale + JPEG q6 + TEŽAK tamni veo preko
  slike. Veo je sada lagan (samo gore/dole), tekst drži text-shadow.
- Sekcija „Kad se završi" sa velikom slikom je UKLONJENA (korisnik: posle gradnje odmah
  detalji). Dodat fiksni indikator faza desno (6 tačaka).
- Poznata mana: V6 ima ~1 s „duplog" pretapanja oko 4. sekunde (wan morfuje krupno→široko).
  Ako zasmeta: flux 8 s (72 kr) sa istim sidrima.
- Krediti Higgsfield: ~445.
