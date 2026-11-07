# Gap Closer: demo video storyboard

Draft written with Claude on 2026-11-07. Two cuts: a **30-second cut** for the submission form (the
organizers say 30 seconds is ideal) and a **75-second cut** for the live finalist talk or a longer
upload (the limit is 2 minutes).

Order (from the NIU guide on organizing a talk): hook, then problem, then solution shown working,
then a close that restates the purpose and ends on one line people remember.

> **Before recording: check the facts table at the bottom.** Lines marked **[UNVERIFIED]** use
> numbers we could not find in any source. Either find the source and add it to the table, or use
> the fallback line. A confident wrong number on screen is the worst outcome for this project.

---

## 75-second cut

About 150 words a minute. Narration is about 175 words.

| # | Time | On screen | Narration | On-screen caption / source |
|---|---|---|---|---|
| 1 | 0:00–0:12 | Title card on a dark background. Three numbers appear one by one: **$715,000** cost per home, **$175,500** what the family can pay, **$540,000** gap. | "In Santa Ana, Habitat for Humanity is building six homes. Each one costs about seven hundred fifteen thousand dollars. The family buying it can afford one seventy-five." **[UNVERIFIED: see fallback 1A]** | Source line under each number. No Habitat logo: this is a public case, not a partner. |
| 2 | 0:12–0:18 | The gap number stays. Three labels appear under it: "City subsidy", "$1M fundraising pledge", "Months of staff and consultant time". | "Closing that gap took a city subsidy, a million-dollar fundraising pledge, and months of staff work." **[UNVERIFIED: see fallback 1B]** | "Santa Ana City Council approved $2.2M, Nov 15, 2022" (verified) |
| 3 | 0:18–0:30 | Quick cuts of many browser tabs: program PDFs, a city housing page, a calendar with a short window circled. Use public program pages only. | "Every nonprofit runs this search by hand. The money sits in scattered PDFs, city sites, and programs that open for a few weeks a year. Of 2,833 homebuyer assistance programs in the U.S., one in four is not open and funded." | "Down Payment Resource, Q3 2026 index, as of Oct 1, 2026" |
| 4 | 0:30–0:38 | Plain text card. | "Berkeley's Terner Center found that in California's tax-credit housing, each extra public funding source is linked to about four more months and twenty thousand dollars more per home. The search itself makes the gap bigger." | "Terner Center, Apr 21, 2025. California LIHTC rental projects, 2020–2023" |
| 5 | 0:38–0:48 | **App, Step 1.** Click **Use a sample address**. The pin drops; city, county and tract fill in. Type the gap. | "Gap Closer starts with the place. Type an address or drop a pin, and enter your gap." | "Live: U.S. Census Geocoder" |
| 6 | 0:48–1:00 | **App, Step 2.** Scroll the sources by level: federal, state, county, city, bonds, then past donors. Hover a donor row showing past gifts in Santa Ana. Click **Use recommended**; the coverage bar fills. | "It lists every program that applies at that location, plus past donors who already gave in that city. Then it ranks a mix that covers the gap." | Keep the **Placeholder** and **synthetic** chips in frame. |
| 7 | 1:00–1:08 | **App, Step 3.** Click **Draft email** on one donor. The draft opens. | "And it drafts the ask. You review it and send it yourself." | "Drafts only. Nothing is sent." |
| 8 | 1:08–1:15 | End card: the equation, then the repo URL. | "What the family can pay, plus subsidies, plus fundraising, minus the cost: Gap Closer gets that to zero, faster." | "Prototype. Amounts are placeholders, donors are synthetic. Not financial advice." + repo URL |

### Fallback lines if the Habitat numbers stay unverified

- **1A:** "In Santa Ana, Habitat for Humanity is building six homes for families earning up to 80
  percent of the area median income." On screen: the six homes, no dollar figures. (Verified: New
  Santa Ana, Dec 27, 2022.)
- **1B:** "The city put in two point two million dollars, and it still took months of work to close
  the gap." Use "months of work" only if a source supports it; otherwise end at "two point two
  million dollars."

---

## 30-second cut

About 75 words. Same shots, trimmed.

| # | Time | On screen | Narration |
|---|---|---|---|
| 1 | 0:00–0:06 | Scene 1 title card (or fallback 1A) | "In Santa Ana, a Habitat home costs seven hundred fifteen thousand. The family can pay one seventy-five." **[UNVERIFIED]** |
| 2 | 0:06–0:12 | Scene 3 tabs montage | "Nonprofits close that gap by hand, and in California each extra funding source is linked to about four more months." |
| 3 | 0:12–0:24 | App Steps 1 and 2, sped up 1.5× | "Gap Closer: drop a pin, see every program and past donor that fits that place, and get a ranked plan." |
| 4 | 0:24–0:30 | Step 3 draft, then end card | "It drafts the asks. You send them. Prototype, with placeholders labelled." |

---

## Recording notes

- Run `python3 prototype/server.py` and open <http://localhost:8765>. Use **Use a sample address**
  (Santa Ana City Hall, a public building), not a home address.
- Browser at 125% zoom, bookmarks bar hidden, 1920×1080, move the cursor slowly.
- The address lookup calls the Census service live. Record it once ahead of time as a backup clip.
- Do not show any page that lists real people's names or addresses. The city's Washington Avenue
  report PDF contains a notice mailing list, so keep it out of the video.
- If you type $540,000 as the gap in Step 1, only do it after the Habitat numbers are verified.
  Otherwise leave the $95,000 default, which the app already labels an **Assumption**.
- Burn in captions. Judges may watch without sound.

---

## Facts used, and their sources

Checked 2026-11-07.

| Claim | Status | Source |
|---|---|---|
| Six Habitat OC ownership homes at 1921 W. Washington Ave, Santa Ana; up to 80% of OC median income; 3 bed, about 1,430 sq ft | VERIFIED | New Santa Ana, Dec 27, 2022, https://newsantaana.com/santa-ana-approves-2-2m-in-new-funding-to-build-more-affordable-homes |
| Santa Ana City Council approved $2.2M for the project on Nov 15, 2022 | VERIFIED (news report; the city's own page refused our request) | Same article. City page: https://santa-ana.org/santa-ana-approves-2-2-million-in-funding-to-build-new-affordable-homes-for-santa-ana-residents |
| $715,000 per home | **UNVERIFIED.** Not found. We also need to know what it measures: cost to build, or market price. | Team to supply |
| $175,500 the family can afford | **UNVERIFIED.** A search snippet points to a Santa Ana affordable sales price table: $175,500 for a 3-bedroom at a 7.22% rate with 5% down. We could not open the page. A 7.22% rate suggests 2023 rather than 2022, so check the year. | Santa Ana public documents portal (cc-publicdocs.santa-ana.org), page not read |
| $540,000 gap | Follows from the two numbers above, so it is unverified until they are | — |
| $1 million fundraising pledge; months of consultant and staff work | **UNVERIFIED.** Not found. | Team to supply |
| 2,833 U.S. homebuyer assistance programs; 75% active and funded, so 1 in 4 is not (inactive 12%, suspended 7%, waitlisted 5%) | VERIFIED | Down Payment Resource, Q3 2026 index, as of Oct 1, 2026, published Oct 22, 2026: https://downpaymentresource.com/professional-resource/down-payment-programs-reach-record-levels-in-q3-2026-as-grants-grow-and-program-flexibility-increases/ |
| Older figure: 2,746 programs, 77% active and funded | VERIFIED but **superseded** by Q3 | Down Payment Resource, Q2 2026 index, as of Jul 1, 2026: https://downpaymentresource.com/professional-resource/down-payment-assistance-continues-to-expand-in-q2-2026-reaching-2746-programs-nationwide/ |
| Each additional public funding source is associated with about $20,460 more per unit and about 4 more months | VERIFIED, with limits: it covers California LIHTC **rental** new construction (699 applications, 2020–2023); the 4 months runs from the first funding application to the tax-credit award, not to the start of construction; it shows an association, not proof of cause | Terner Center, Reid and Tran, "Reducing the Complexity in California's Affordable Housing Finance System", Apr 21, 2025: https://ternercenter.berkeley.edu/?p=5312 |
