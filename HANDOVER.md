# Handover — Ditt. BD Marktintelligentie Dashboard

Gebouwd door: Daniel Mesterom (stagiair BD, 2025–2026)
Overgedragen aan: [naam invullen]
Datum: [datum invullen]

---

## Wat is dit?

Intern dashboard voor Business Development bij Ditt. Officemakers. Toont marktdata, warme contacten, trends, aflopende huurcontracten en prospecting-informatie per stad en gebied. Alle data is bewerkbaar en wordt real-time gesynchroniseerd tussen gebruikers.

---

## Links

| Dienst | URL / info |
|---|---|
| Dashboard (live) | https://ditt-bd-prototype.vercel.app |
| GitHub repo | https://github.com/danielmesterom3-beep/ditt-bd-prototype |
| Vercel (deploy) | vercel.com — project: ditt-bd-prototype |
| Supabase (database) | supabase.com — project: [projectnaam invullen] |
| Make.com (nieuws) | make.com — scenario: Gmail → Supabase nieuws |

---

## Bewerkingsmodus

Klik rechtsboven op "Vergrendeld" → voer PIN in → "Bewerken aan".

**PIN: [PIN invullen]**

In bewerkingsmodus kun je:
- Alle tekst aanpassen door erop te klikken
- Trends, warme contacten, panden, opdrachtgevers, aflopende contracten toevoegen via + knoppen
- Items verwijderen via het × icoontje
- Aanpassingen opslaan via de oranje knop rechtsonder
- Laatste tekstwijziging terugdraaien via "Ongedaan" in de header

---

## Steden beheren

Via de knop "Beheer" rechtsboven:
- Nieuwe stad aanmaken (start leeg, 4 gebieden)
- Stad verwijderen uit de lijst "Aangemaakte steden"

Gebiedsnamen zijn aanpasbaar via bewerkingsmodus (klikken op de naam).

Eindhoven en Rotterdam zijn vaste steden en kunnen niet verwijderd worden.

---

## Nieuws automatisch toevoegen

Make.com stuurt automatisch nieuwsberichten door naar het dashboard.
Scenario: e-mail doorsturen naar het Make.com-adres → verschijnt in Nieuws-tab.

Als Make.com stopt met werken: inloggen op make.com en scenario heractiveren.
API-sleutel zit in het scenario (Supabase sb_secret_ sleutel).

---

## Data opgeslagen in

- **Supabase** — tabel `edits`: alle tekstwijzigingen, toegevoegde items, gebiedsstatus, custom steden
- **Supabase** — tabel `nieuws_items`: nieuwsberichten via Make.com
- Statische brondata (Eindhoven/Rotterdam) zit in `src/data/` in de code

---

## Code aanpassen (optioneel)

Vereist: Node.js, Git, Claude Code (claude.ai/code), eigen GitHub-account.

```bash
git clone https://github.com/danielmesterom3-beep/ditt-bd-prototype
cd ditt-bd-prototype
npm install
npm run dev        # lokaal testen op localhost:5173
npm run build      # controleren of build slaagt
git add .
git commit -m "omschrijving"
git push           # Vercel deployt automatisch
```

Bij code vragen: open Claude Code in de projectmap en beschrijf wat je wilt aanpassen.

---

## Tech stack

- React + TypeScript + Vite + Tailwind CSS
- Supabase (PostgreSQL + Realtime)
- Vercel (hosting, auto-deploy via GitHub)
- Make.com (nieuws-automatisering)

---

## Belangrijk om te weten

- Alle bewerkingen synchen live naar alle geopende browsers (geen refresh nodig)
- Supabase free tier: 500 MB opslag, voldoende voor dit gebruik
- Vercel free tier: voldoende voor intern gebruik
- Build altijd testen (`npm run build`) voordat je pusht — anders gaat Vercel stuk
