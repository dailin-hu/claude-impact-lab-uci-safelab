# Gap Closer: 45-second demo storyboard

Revised 2026-11-07. One cut, 45 seconds total, timed to the team's recorded voice-over. The first
14.5 seconds set up the problem: the time cost and the tool's promise, Santa Ana's gap, and the
paperwork. The remaining 30.5 seconds show the app working, then close on the end card.

> **Before recording, read the facts table at the bottom.** Every number on screen has a source.
> Keep the limits in the captions (for example, the Terner figure comes from California tax-credit
> rental projects, not ownership projects). A confident wrong number is the worst outcome.

## Voice-over

- **Source:** `prototype/video/audio.mp3`, the team's recording, 51.1 seconds. Kept unchanged.
- **Used in the video:** `prototype/video/audio-45s.m4a`, the same recording sped up 1.135× to
  45.0 seconds with pitch kept (Apple AVFoundation, spectral time-stretch). Listen to it once
  before building. If it sounds rushed, shortening the pauses between sentences saves only about
  4 seconds, so the video would land near 47 seconds instead.
- **Timings below** come from the pauses detected in `audio-45s.m4a`. The words in each line are
  the script the timings match (nine phrases, nine pauses); confirm them by listening, since the
  recording was not transcribed.

Script (about 110 words, roughly 147 words a minute after the speed-up):

> Funding one affordable housing project can take nearly two years. Our tool, Gap Closer, maps it
> out in seconds. In 2022, one Habitat for Humanity project in Santa Ana faced a $540,000 gap per
> home. Elsewhere, a single project took seventeen funding applications. Gap Closer starts with the
> site's location and calculates your funding gap. It finds every federal, state, county and city
> program that fits that place, plus past donors in your CRM who are most likely to give again.
> Then it builds a funding mix that covers the gap before your deadline. Finally, it turns the
> plan into an action list and drafts each email for you to review and send from your own Gmail,
> so your team spends less time on paperwork and more time serving families.

## Storyboard

Times are in the 45-second cut. "Line" is when that phrase is spoken in `audio-45s.m4a`. Each
scene cuts in the pause before its line, so the picture changes as the new sentence starts.

### Problem: 0:00–0:14.5

| # | Time | Line (spoken) | On screen | Caption / source |
|---|---|---|---|---|
| 1 | 0:00–0:07.2 | 0:00.1–0:03.7 "Funding one affordable housing project can take nearly two years." · 0:04.1–0:07.0 "Our tool, Gap Closer, maps it out in seconds." | **Impact card.** Dark background. "Nearly 2 years" counts up from 0 months and lands by 0:03.5. At 0:04.1 the Gap Closer name slides in over a coverage bar that fills to 100% by 0:06.8. | "California tax-credit projects with 3 to 5 public funding sources, first application to award. Terner Center, Apr 21, 2025" |
| 2 | 0:07.2–0:11.1 | 0:07.4–0:11.1 "In 2022, one Habitat for Humanity project in Santa Ana faced a $540,000 gap per home." | **Real photo:** a licensed photo of a Santa Ana street, darkened about 60%. Three numbers stack: **$715,000** cost per home (0:07.6), **$175,500** family can pay (0:08.6), **$540,000** gap (0:09.8, timed to "$540,000"). Label: "Santa Ana, 6 Habitat homes, 2022". Corner tag: "Illustrative photo". No Habitat logo or Habitat photos. | "City of Santa Ana gap analysis (Keyser Marston), Oct 27, 2022. Gap before fundraising and City funds" |
| 3 | 0:11.1–0:14.5 | 0:11.2–0:14.2 "Elsewhere, a single project took seventeen funding applications." | **Real photo:** a licensed photo of a desk with paperwork. Screenshots of public program pages stack over it. A counter ticks to **17** as "seventeen" is spoken. | "One Colorado project, reported by Colorado Politics, Nov 25, 2025" |

### The app: 0:14.5–0:41.0

| # | Time | Line (spoken) | On screen | Caption / source |
|---|---|---|---|---|
| 4 | 0:14.5–0:19.0 | 0:14.7–0:18.8 "Gap Closer starts with the site's location and calculates your funding gap." | **Step 1.** Click **Use a sample address**; the pin drops and city, county and tract fill in (by 0:16.5). Click **Calculate the gap**. **Step 2** slides in; the cursor rests on the goal number. | "Live: U.S. Census Geocoder and Freddie Mac rate · Cost lines are the app's example deal (Assumption)" |
| 5 | 0:19.0–0:22.7 | 0:19.2–0:22.5 "It finds every federal, state, county and city program that fits that place," | **Step 3.** Click the **Public programs** filter. Rows show federal, state, county and city programs, each with its level and a "Page checked" tag. | "Starter program list, checked 2026-11-06 · Amounts are placeholders" |
| 6 | 0:22.7–0:27.6 | 0:22.8–0:27.4 "plus past donors in your CRM who are most likely to give again." | Click the **Donors: organizations** filter. Hover a donor row's **Gave in Santa Ana** tag. Keep the **(synthetic)** labels in frame. | "CRM connector is a placeholder · Donor records are synthetic" |
| 7 | 0:27.6–0:31.2 | 0:27.8–0:30.9 "Then it builds a funding mix that covers the gap before your deadline." | Back to **All** (cut, off camera). Click **Use recommended**; the plan panel fills. Hold on the coverage bar and the "Slowest money… Deadline" line. | "Ranked mix · Amounts, chances and timing are placeholders" |
| 8 | 0:31.2–0:35.0 | 0:31.5–0:34.7 "Finally, it turns the plan into an action list" | **Step 4.** The action list: people to contact and applications to prepare, each with an ask and a "Start by" date. Slow scroll. | "Ordered by when you need to start" |
| 9 | 0:35.0–0:41.0 | 0:35.2–0:40.9 "and drafts each email for you to review and send from your own Gmail," | Click **Draft email** on one donor; the draft opens (by 0:36.5). Hover **Open in Gmail** but do not click it. | "Drafts only. Gmail opens a draft in your own account; you press Send" |

### Close: 0:41.0–0:45.0

| # | Time | Line (spoken) | On screen | Caption / source |
|---|---|---|---|---|
| 10 | 0:41.0–0:45.0 | 0:41.1–0:44.9 "so your team spends less time on paperwork and more time serving families." | **End card.** "Gap Closer", the $0 equation, the line "Less time on paperwork. More time serving families.", the repo URL, and the official **Claude mascot** with "Built with Claude · Claude Impact Lab, UCI, Nov 7, 2026". | "Prototype. Drafts only, nothing is sent. Donors are synthetic. Not financial advice." |

## What changed from the 30-second cut

- **45 seconds, timed to the team's own voice-over** instead of a synthetic voice.
- **Problem in 14.5 seconds, app in 26.5, close in 4.** The app gets six beats instead of four:
  site and gap, programs, donors, ranked mix, action list, draft email.
- **Programs and donors are now separate scenes** (5 and 6), so each half of that sentence has its
  own picture.
- **New Scene 8 for the action list**, matching "turns the plan into an action list".
- **The end card carries the closing line** ("less time on paperwork, more time serving families").
  It is a goal, not a measured result: no source measures staff hours saved, so no number goes
  with it.
- **Scene 2 now names Habitat for Humanity in the narration.** Still no Habitat logo or photos.

## Using real photos from the internet

Real photos make the opening scenes feel grounded. They also carry the most legal and privacy risk
in the video, so follow these rules.

**Where to get them**

- **Your own photos, taken today.** The safest choice. A shot of the team working, the venue, or a
  public street. You own them.
- **Free-license stock sites** such as Unsplash and Pexels. Read the license on each photo before
  using it.
- **Wikimedia Commons.** Licenses vary photo by photo. Many require a credit line (CC BY) and some
  require sharing alike (CC BY-SA). Copy the exact credit the page asks for.
- **U.S. federal government photos** (for example, HUD) are generally public domain. City, county
  and state photos are **not** automatically free to use. Skip them unless the page grants reuse.

**Do not use**

- Photos from Habitat for Humanity, news articles, or the City's press releases. They are someone
  else's copyright, and Habitat photos would suggest a partnership that does not exist.
- Listing photos from Zillow, Redfin or real estate sites, or Google Street View screenshots.
- Anything with a watermark, or any image found through a general image search without a clear
  license.

**Privacy (from the event's ground rules)**

- No identifiable people from a real housing project, and no families, buyers or residents.
- No readable house numbers, street signs next to a home, or license plates. Blur or crop them.
- Do not show the Washington Avenue homes themselves. Families live there now. Use a general
  Santa Ana street or a public building such as City Hall.
- If a photo is not of the actual project, label it "Illustrative photo" on screen.

**Every photo gets a row in the asset credits table at the bottom**, with its source URL and
license, before the video is exported. Put the credits in the repo README too.

## Adding the Claude mascot

Gap Closer was built with Claude at a Claude Impact Lab event, so the end card credits Claude.

- **Use only an official file.** Ask the organizers for the event's approved Claude mascot or logo
  file first. If they do not have one, download the logo from the media assets in Anthropic's
  newsroom. Do not redraw it, trace it, generate it with AI, or pull it from a random logo site.
- **Do not change it.** Keep its colors and proportions. No stretching, recoloring, outlines,
  shadows or animation effects. Scale it evenly and give it clear space.
- **Pair it with factual wording.** "Built with Claude · Claude Impact Lab, UCI, Nov 7, 2026" is
  accurate. Avoid wording like "Powered by Anthropic" or "Anthropic presents", which suggests
  Anthropic endorses or made the project.
- **Placement.** The end card (Scene 10) is the main spot. If you also want it during the app scenes
  (4 to 9), keep it small in one corner and away from the app's controls.
- The Claude name and logo are Anthropic trademarks. If the organizers give usage rules, those
  win over this list.

## Recording notes

- **Re-record the app.** It changed after the 30-second cut (commit 072a322 lowered the placeholder
  amounts and added a source popup and a Settings page), so the coverage percentages will differ
  from the old video. That is expected; use whatever the current app shows.
- Restart the app server first so it serves the current code and the mortgage-rate file, then run
  `python3 prototype/server.py` and open <http://localhost:8765>. Use **Use a sample address**
  (Santa Ana City Hall, a public building), not a home address.
- Browser at 125% zoom, bookmarks bar hidden, 1920x1080, move the cursor slowly.
- The address lookup calls the Census service live. Record it once ahead of time as a backup clip.
- **The narration says "$540,000 gap per home" (Scene 2), but the app shows its example deal
  (Scene 4).** The app's gap comes from a cost table, and typing Habitat's numbers into it would
  mean inventing a cost breakdown. Keep the example deal and its Assumption caption. If a judge
  asks, Scene 2 is a separate real case.
- In Scene 9, hover **Open in Gmail** but do not click it. Clicking opens a real Gmail draft.
- Do not show any page with real people's names or addresses. The City's Washington Avenue report
  contains a notice mailing list, so keep the PDF itself out of the video. Show the numbers on a
  title card instead.
- Burn in captions: the spoken line plus the source caption. Judges may watch without sound.
- Before exporting, check every photo against the rules above and fill in the asset credits table.

## Staff time: what the evidence does and does not show

No source we found measures the **staff hours** an affordable housing team spends tracking funding.
What exists:

1. **Elapsed time** (Terner Center): nearly two years from first funding application to award for
   projects with 3 to 5 public sources. This is calendar time, which includes waiting, not hours
   worked.
2. **Workload** (Colorado Politics): one developer filed 17 applications for one project. This is
   one example from Colorado, not an average.
3. **Research time** (GrantStation, all sectors): grant research took three days or fewer for 64%
   of respondents, so it took longer for the other 36%. Not housing-specific.

Use this wording in the live talk if a judge asks: "Nobody publishes staff hours for this. The best
data shows nearly two years of calendar time and up to 17 applications per project."

## Facts used, and their sources

Checked 2026-11-07.

| Claim | Status | Source |
|---|---|---|
| Projects with 3 to 5 public funding sources take nearly two years, on average, from first funding application to tax-credit award | VERIFIED, with limits: California LIHTC **rental** new construction, 699 applications, 2020 to 2023; calendar time, not staff hours | Terner Center, Reid and Tran, "Reducing the Complexity in California's Affordable Housing Finance System", Apr 21, 2025: https://ternercenter.berkeley.edu/blog/reducing-the-complexity-in-californias-affordable-housing-finance-system/ |
| Each additional public funding source is associated with about 4 more months and about $20,460 more per unit | VERIFIED, same limits; an association, not proof of cause. Not used in this cut | Same source |
| $715,000 per home | VERIFIED. Total development cost of $4,290,000 for 6 homes, divided by 6. This is the cost to build including land, not a market price | Keyser Marston memo to the City of Santa Ana, Oct 27, 2022, City public documents portal: https://cc-publicdocs.santa-ana.org/WebLink/1/doc/137920/Page15.aspx (read through the portal's search excerpt; the page needs JavaScript) |
| $175,500 the family can pay | VERIFIED as the consultant's estimate of the Low Income affordable sales price for a 3-bedroom (7.22% rate, 5% down). Habitat estimated $185,000. Final prices are set at sale. The 7.22% rate appears in the Oct 2022 memo, so the year is 2022 | Same memo: https://cc-publicdocs.santa-ana.org/WebLink/1/doc/134758/Page432.aspx |
| $540,000 gap per home | VERIFIED by arithmetic: $715,000 minus $175,500 = $539,500, rounded. This is before Habitat's fundraising and City funds | Derived from the two rows above |
| Habitat pledged about $1 million in fundraising | VERIFIED. "Habitat Financial Assistance $1,001,000". Not used in this cut | Same memo, doc 137920 Page 15 |
| Six Habitat homes at 1921 W. Washington Ave; up to 80% of OC median income | VERIFIED | New Santa Ana, Dec 27, 2022: https://newsantaana.com/santa-ana-approves-2-2m-in-new-funding-to-build-more-affordable-homes |
| Santa Ana City Council approved $2.2M on Nov 15, 2022 | VERIFIED (news report). Not used in this cut | Same article |
| One developer filed 17 applications to fund one affordable housing project | VERIFIED as reported: a single Colorado example, attributed to a speaker named Bryan whose title we did not confirm | Colorado Politics, Nov 25, 2025: https://www.coloradopolitics.com/2025/11/25/will-pilot-program-ease-colorado-developers-funding-application-pain/ |
| Grant research took three days or fewer for 64% of respondents | VERIFIED, cross-sector nonprofit survey. Backup for the live talk only | GrantStation, Key Findings, 2024 State of Grantseeking Report: https://grantstation.com/sites/default/files/imageLibrary/SoG/Key%20Findings%20The%202024%20State%20of%20Grantseeking%20Report.pdf |
| 2,833 U.S. homebuyer assistance programs; 75% active and funded | VERIFIED. Backup only, cut from narration | Down Payment Resource, Q3 2026 index, as of Oct 1, 2026: https://downpaymentresource.com/professional-resource/down-payment-programs-reach-record-levels-in-q3-2026-as-grants-grow-and-program-flexibility-increases/ |
| "Months of staff and consultant work" on the Habitat project | **REMOVED.** No source found | n/a |

## Asset credits

Fill in before exporting. One row per photo or logo that appears in the video.

| Scene | Asset | Source URL | License / permission | Credit line shown |
|---|---|---|---|---|
| 1 | House frame under construction (taken in Clyde North, Australia; illustrative) | https://unsplash.com/photos/new-house-frame-under-construction-with-fencing-6hZgHlHi890 (file `prototype/video/assets/house-frame.jpg`) | Unsplash License, checked 2026-11-07 | "Illustrative photo · Photo: Troy Mortier / Unsplash" |
| 2 | Palm-lined residential street (page tagged Florida, not Santa Ana; illustrative) | https://unsplash.com/photos/suburban-street-with-houses-and-palms-4T4AcGJvARQ (file `prototype/video/assets/street.jpg`) | Unsplash License, checked 2026-11-07 | "Illustrative photo · Photo: FilterGrade / Unsplash" |
| 3 | Desk with paperwork photo | Not used: Scene 3 stays on a dark background | n/a | n/a |
| 3 | Screenshots of public program pages | | Screenshots of public government pages, shown briefly | n/a |
| All | Voice-over | `prototype/video/audio.mp3`, recorded by the team | Team's own recording | n/a |
| 1–10 | Clawd pixel sprite (`prototype/video/assets/clawd-sprite-12x8.png`) | Sampled from the image the team supplied; pixels unchanged, scaled evenly, moved (hops and slides) but not redrawn or recoloured | Team-supplied. Animating it goes beyond the "no animation effects" logo rule above; confirm with the organizers | n/a |
| 10 | Claude mascot / logo | Organizers' file or Anthropic newsroom media assets | Official asset, unmodified | "Built with Claude" |
