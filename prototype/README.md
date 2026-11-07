# Gap Closer

> For a nonprofit finance lead: drop in where an affordable home will be built, see every federal,
> state, county, city, bond, lender and past-donor source that might apply there, and get a ranked
> plan for which to pursue first to cover the funding gap.

**Team:** [team name]
**Members:** [names]
**Lane:** 3 Fund it
**Built at:** Claude Impact Lab: UCI × SoCal Affordable Housing, November 7, 2026

## The real user

A finance lead or development director at a small housing nonprofit (scenario M01 in
`lanes/3-fund-it/scenarios.json`). Each home in Orange County runs about six figures short, and the
money that closes it sits in program PDFs, city pages that block bots, and the team's own CRM.

**Before:** they assemble the stack by hand for every project: search programs one by one, guess
which are open, and remember which donors care about which neighborhood.
**After:** they type an address or click the map, and get one page listing what applies at that
place, which donors already gave nearby, and a ranked plan with the next step for each source.

## What we built

A local web app in SafeLab's brand, with a small set of colors added to tell source types apart.
A Start screen, then three full-height steps that slide left and right (Back and Next buttons, the
step pills at the top, or the arrow keys):

1. **Location and gap.** Start typing an address and pick from the dropdown (suggestions from
   Photon, OpenStreetMap data), or click the color map to drop a pin. The server asks the U.S.
   Census Geocoder for the city, county, state and census tract (real, live data). On the same
   screen, for one home: the gap to close and how soon the money is needed.
2. **Build your funding plan.** One color-coded table of everything that may apply at that place:
   public programs (blue), bonds (ochre), lenders and banks (teal), donor organizations such as
   foundations, trusts, donor-advised funds, companies and congregations (purple), and individual
   donors (green). Each row shows why it fits (page checked, gave in this city, lived or grew up
   here, last gift), an editable amount, chance, an expected-value bar and months to money. Tick
   rows to add them to the plan; filter by type and sort by expected value, amount, chance or
   speed. Click a name for a detail drawer with the facts, a time-to-money bar, the scoring
   reasons, personal ties, giving history and the next step. Beside the table, a live meter shows
   the total if every source says yes and the risk-weighted total (stacked by type) against the
   goal line, with checks for late money, either-or programs, unconfirmed sources, individual
   donors and donors with local ties. Sources that can't be counted yet sit at the bottom with
   the reason.

3. **Take action.** The ticked sources become an action list, ordered by the date you need to
   start for the money to land before your deadline: people to contact from the CRM (individuals
   and organizations) and applications to prepare. Enter your organization and name once. For
   each person, **Draft email**; for each program, **Draft application** (a first-pass narrative
   with [TO CONFIRM] gaps) or **Email program staff**. **Draft all emails** drafts every ask in
   one go. Edit the draft in place, then **Open in Gmail**: Gmail's compose window opens in your
   own account with the recipient, subject and body filled in, and you press Send yourself.
   Application drafts can be copied or downloaded as text. Tick actions off as you go; **Copy
   action list** puts the checklist on the clipboard.

**Drafting:** with the Anthropic SDK installed and `ANTHROPIC_API_KEY` set, drafts come from
Claude Opus 5.5 (`claude-opus-5-5`), told to use only the facts it is given and to put anything
it doesn't know in [brackets]. Without them, the same buttons produce template drafts, labelled
as such. The page shows which mode is on.

**Time to money** for each source, counted from today = time to prepare that application or ask +
time from submission to money. Anything past your deadline counts half.

**How the recommendation works:** every source and donor gets expected value = amount × chance.
A donor's chance rises with past gifts in this city or county and with personal ties: the person,
or an organization's main contact, has lived, grown up, lives or is based here. The advisor ticks
the highest expected values until the gap is covered, then also ticks every warm local donor (gave
in this same city in the last three years), because they are cheap to ask and likely to say yes.

**Demo video:** [link]
**Live demo:** runs locally, see below.

## How Claude is used

- Built with Claude Code: data analysis of the Lane 3 sources, the server, the advisor and the UI.
- In the tool, Claude drafts donor emails, program inquiries and first-pass application
  narratives (`drafting.py`). The prompts forbid invented facts, figures or program rules and ask
  for [brackets] wherever a person must fill in or confirm something.
- The ranking is plain, readable JavaScript in `public/advisor.js`, not AI, so a person can check
  every rule.
- A person reviews every draft, checks every program's terms at the source, and sends any email
  from their own Gmail. The tool never sends, files or contacts anything.

## Try it

Needs Python 3.9 or newer. No packages or keys are needed for the demo; drafts then come from
templates.

```bash
python3 prototype/server.py
```

For AI drafts, install the Anthropic SDK (current releases need Python 3.10 or newer) and start the
server with your key in the environment. Never commit the key.

```bash
pip3 install anthropic
```

```bash
ANTHROPIC_API_KEY=your-key python3 prototype/server.py
```

Then open <http://localhost:8765>, click **Start**, and type an address and pick a suggestion, click
**Use a sample address** (Santa Ana City Hall, a public building), or click anywhere on the map. Set `PORT` to use another port.

## How it is built

| File | What it does |
|---|---|
| `server.py` | Serves the app. `/api/suggest` proxies Photon address suggestions (cached, at most two calls a second, California only). `/api/locate` proxies the Census Geocoder (cached, at most one call a second). `/api/funding` filters the source list to the place. `/api/crm/donors` is the placeholder CRM connector: it marks each donor's gifts and personal ties in this city and county. `POST /api/draft` drafts one email or application; `/api/ai` says whether AI drafting is on. |
| `drafting.py` | Claude prompts and calls (Anthropic SDK, server-side fallback on refusals) and the template drafts used without a key. |
| `data/funding-sources.json` | Programs, URLs and facts from the Lane 3 source list, plus PLACEHOLDER amounts. |
| `data/crm-donors.synthetic.json` | 24 made-up donor records (10 individuals, plus donor-advised funds, trusts, family foundations, companies, a congregation, a giving circle and a community fund) with giving history and personal ties (lived, grew up, lives, based in) by city. |
| `public/advisor.js` | The ranking rules. Every weight is labelled ASSUMPTION. |
| `public/app.js`, `index.html`, `styles.css` | The page. Map by Leaflet and OpenStreetMap. |

To connect a real CRM, replace `crm_donors()` in `server.py` with a read-only query that returns the
same fields (`gifts` with `year`, `city`, `county`, `amount`, `purpose`; `ties` with `kind`, `city`,
`county`, `years`; plus `do_not_solicit`).

## Sources and assumptions

| Item | Source or assumption | Date checked |
|---|---|---|
| City, county, tract for a location | U.S. Census Geocoder, https://geocoding.geo.census.gov/geocoder/ | 2026-11-07 |
| Map tiles | © OpenStreetMap contributors | 2026-11-07 |
| Address suggestions | Photon by komoot (OpenStreetMap data), https://photon.komoot.io, public API, fair use | 2026-11-07 |
| Program names, URLs, facts | `lanes/3-fund-it/data/DATA-SOURCES.md` (VERIFIED and UNVERIFIED as marked there) | 2026-11-06 |
| CalHFA MyHome up to 3.5% (FHA) or 3% (conventional) | CalHFA homebuyer programs page, via DATA-SOURCES.md | 2026-11-06 |
| Dream For All up to 20%, cap $150,000, drawing; funds not confirmed | calhfa.ca.gov/dream, via DATA-SOURCES.md | 2026-11-06 |
| One home per plan | ASSUMPTION: the team's scope for the prototype | n/a |
| $95,000 default gap | ASSUMPTION: the repo's synthetic example deal | n/a |
| 18-month default deadline | ASSUMPTION, editable | n/a |
| Award per home, chance, prep months and months to funds for every program | ASSUMPTION: PLACEHOLDER values invented for the prototype | n/a |
| Donor records | SYNTHETIC, invented | n/a |
| Donor chance: 0.6 × (gifts in same city 1.0, same county 0.4, none 0.1; plus personal tie to the city 0.3 or county 0.1; max 1.3), capped at 85%; ×0.6 if no gift in 3 years; ×0.5 without housing interest | ASSUMPTION in `advisor.js` | n/a |
| Donor prep time by type (individual 0.5 months up to corporate 2 months), money 1 month after a yes | ASSUMPTION in `advisor.js` | n/a |
| Unconfirmed source counts half; money after the deadline counts half | ASSUMPTION in `advisor.js` | n/a |
| Down-payment help to the buyer narrows the gap | ASSUMPTION: it raises what the family can pay at closing | n/a |
| Loans (LIIF) do not count toward the gap | ASSUMPTION: a loan is repaid | n/a |
| Two CalHFA buyer programs are either-or | ASSUMPTION | n/a |
| Warm local donors (gave in this city in the last 3 years) are always recommended | ASSUMPTION in `advisor.js` | n/a |

## What is real and what is mocked

| Part | Status |
|---|---|
| Address dropdown, search and map pin to city, county, tract | Working, live Photon and Census data |
| Which programs apply at a place | Partly working: real names and links for California and Orange County; other places show "unknown" |
| Program amounts, chances, timing | Mocked (PLACEHOLDER) |
| CRM connector | Mocked: a local file of synthetic donors behind the same API a real connector would use |
| Ranking and plan | Working on the placeholder numbers |
| Action list, start-by dates, template drafts, Open in Gmail | Working |
| AI drafts with Claude | Built and wired; the SDK call was checked to reach the API, but no real draft has been generated yet (no key on the build machine) |

## Where it gets things wrong

- The amounts and chances are invented, so the ranking is a demonstration of the method, not advice.
- It does not check income limits, household size, or round dates. A program can rank high and be
  closed this month.
- Only Santa Ana and Garden Grove have city programs on file. Anaheim, Costa Mesa and Fullerton
  are listed as unknown because their sites could not be read.
- It treats all down-payment help as narrowing the gap, which depends on the deal structure.

## Next steps

- Replace placeholders with current NOFA terms and round dates, each with a source and date.
- Pull income limits from the dated HCD and HUD tables and check the buyer's eligibility.
- Connect a real CRM read-only.
- Gmail API drafts (`drafts.create`) instead of compose links, so drafts land in Gmail's Drafts
  folder in bulk. Needs a Google Cloud OAuth client and the user's consent; still never sends.
- Add rate sensitivity: show how the gap moves with the Freddie Mac 30-year rate.

## Data and privacy

This project uses only public or provided data. Donor records, including where donors lived, are
synthetic. It contains no personal information about real tenants, buyers, residents or donors.
With a real CRM, use only personal ties a donor chose to share with the organization, and follow
the organization's privacy policy. Sending CRM records to the Claude API
for drafting needs the organization's approval first. It does not file applications or contact any
city, donor or person: drafts open in the user's own Gmail and the user decides whether to send.
Donor email addresses are placeholders on the reserved example.org domain. Prototype only: not financial, lending or legal
advice.

## License

MIT, see the LICENSE file in this repo.
