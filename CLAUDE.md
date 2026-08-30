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

- **Video prelazi: `wan3_0_prime` je POBEDNIK** (61,6 kr za 8 s; 46,2 kr za 6 s, 1080p 30fps).
  Sa `enable_thinking: true` i promptom „locked tripod, zero camera movement" drži kadar
  savršeno — menja se samo gradilište. **`flux_3_video` (72 kr) je PAO na istom zadatku:**
  krajevi verni, ali u sredini klipa sam režira zum ka placu i nazad → neupotrebljivo za scrub.
  Ne vraćati se na flux za ovo. `kling3_0_turbo` samo start frame — otpada.
- Prompt za prelaz koji radi: fiksna nadzorna kamera + timelapse SAMO unutar narandžaste
  ograde + „everything outside the fence remains perfectly still like a photograph".
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

## Izmereno (2026-08-31, prelaz 1→2)

- 64 frejma po prelazu, `fps=32/3` iz 6 s klipa: **hi 1280px q7 = 5,9 MB** (~92 KB/frejm),
  **md 854px q7 = 3,2 MB**, telefon film 1280px crf25 = **0,95 MB**.
- Projekcija za svih 5 prelaza (320 frejmova): hi ~30 MB — PREVIŠE. Pre finala smanjiti
  na ~40 frejmova po prelazu i/ili q8; talasno učitavanje ublažava ali ne opravdava.
- Krediti: slika (nano banana pro 2k) = 2; potrošeno do sada ~124 (3 slike + flux promašaj
  72 + wan 46,2); stanje ~712.

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
