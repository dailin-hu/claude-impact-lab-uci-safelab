"""Draft outreach emails and application first drafts for Gap Closer.

Uses Claude through the official Anthropic SDK when it is installed and a credential is set
(ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN). Otherwise it returns a clearly labelled template
draft so the demo still works offline.

PROTOTYPE ONLY. This module writes drafts. It never sends an email, files an application or
contacts anyone. A person reviews every draft and sends it from their own account.
"""

import os
import re

MODEL = os.environ.get("GAP_CLOSER_MODEL", "claude-opus-5-5")

RULES = """Rules you must follow:
- Use only the facts given below. Never invent statistics, program names, program rules, dollar
  figures, deadlines, addresses, family details or past events.
- Anything the sender must supply or confirm goes in [square brackets], for example
  [one sentence about the family] or [TO CONFIRM: eligible costs].
- Plain, warm, specific language. No em dashes. No hype.
- Do not describe the dollar amounts as final: they are planning estimates."""

EMAIL_SYSTEM = f"""You draft short fundraising emails for a small nonprofit that builds affordable
ownership homes in Southern California. The email asks one donor to help close the funding gap
on one home. Keep it under 170 words.

{RULES}

Output format, exactly: the first line is "Subject: <subject>", then a blank line, then the email
body, ending with the sender's name and organization."""

INQUIRY_SYSTEM = f"""You draft short, professional inquiry emails from a small affordable-housing
nonprofit to a public funding program's staff, asking whether a project fits and when the next
funding round opens. Keep it under 150 words.

{RULES}

Output format, exactly: the first line is "Subject: <subject>", then a blank line, then the email
body, ending with the sender's name and organization."""

APPLICATION_SYSTEM = f"""You write first drafts of funding application narratives for a small
nonprofit that builds affordable ownership homes in Southern California. The draft is a starting
point for staff, who will check it against the program's current notice. Keep it under 450 words.

{RULES}
- You do not know the program's application questions. Use these section headings: Project
  summary, Location, Funding request, Timeline, Organization capacity, Documents to gather.
  Under Documents to gather, list only [TO CONFIRM against the current notice] items.

Output format, exactly: the first line is "Title: <title>", then a blank line, then the draft."""


def money(n):
    return "${:,.0f}".format(n)


def clean_name(name):
    return re.sub(r"\s*\(synthetic[^)]*\)", "", name or "").strip()


def tie_phrase(t):
    k = t.get("kind", "lived")
    verb = {"lived": "lived in", "lives": "lives in", "grew up": "grew up in", "based in": "is based in"}
    if k.startswith("contact "):
        return f"main contact {verb.get(k[8:], k[8:])} {t['city']}"
    return f"{verb.get(k, k)} {t['city']}"


def donor_facts(d, ctx):
    gifts = sorted(d.get("gifts", []), key=lambda g: -g["year"])
    lines = [
        f"Donor: {clean_name(d['display_name'])} ({'individual' if d.get('is_individual') else d.get('type')})",
        f"Greeting name: {clean_name(d['display_name']) if d.get('is_individual') else d.get('contact', '[Contact name]')}",
        f"Interests on record: {', '.join(d.get('interests', [])) or 'none recorded'}",
        "Past gifts: " + "; ".join(f"{g['year']}, {money(g['amount'])} in {g['city']} ({g['purpose']})" for g in gifts),
    ]
    ties = d.get("region", {}).get("ties_here") or []
    if ties:
        lines.append("Personal ties to this area: " + "; ".join(f"{tie_phrase(t)} ({t['years']})" for t in ties))
    return lines + context_lines(ctx)


def program_facts(s, ctx):
    lines = [
        f"Program: {s['name']}",
        f"Run by: {s.get('agency')}",
        f"What the program pays for, as our source list describes it: {s.get('pays_for')}",
    ]
    for f in s.get("facts", []):
        lines.append(f"Source note: {f}")
    if s.get("url"):
        lines.append(f"Program page: {s['url']}")
    return lines + context_lines(ctx)


def context_lines(ctx):
    place = ", ".join(x for x in [ctx.get("city") or "an unincorporated area", ctx.get("county"), ctx.get("state")] if x)
    return [
        f"Project: one affordable ownership home in {place}",
        f"Funding gap for this home (planning estimate): {money(ctx['gap'])}",
        f"Money needed within: {ctx['deadline']} months",
        f"Amount to ask for (planning estimate): {money(ctx['amount'])}",
        f"Sender: {ctx['sender']}, {ctx['org']}",
        f"Sender contact for the signature: {ctx.get('contact') or '[Your phone number]'}",
    ]


# ---------- templates (no AI) ----------

def template_email(d, ctx):
    greet = clean_name(d["display_name"]) if d.get("is_individual") else d.get("contact", "[Contact name]")
    city = ctx.get("city") or "[city]"
    local = [g for g in d.get("gifts", []) if g["city"] == ctx.get("city")]
    in_county = [g for g in d.get("gifts", []) if g.get("county") == ctx.get("county")]
    city_ties = [t for t in d.get("region", {}).get("ties_here") or [] if t["city"] == ctx.get("city")]
    if local:
        opener = f"Thank you for your past support of housing in {city}."
    elif city_ties:
        opener = f"I know {city} means a lot to you."
    elif in_county:
        opener = f"Thank you for your past support of housing in {ctx.get('county')}."
    else:
        opener = "Thank you for your past support of our work."
    body = f"""Dear {greet},

{opener} We are working to create one affordable ownership home in {city}, and we are about {money(ctx['gap'])} short of what it costs to build it.

[One or two sentences about the home, the site or the family it will serve.]

Would you consider a gift of {money(ctx['amount'])} toward this home? We need to close the gap within {ctx['deadline']} months, and a gift now helps us secure the public funds that follow.

I would be glad to talk or show you the site. {ctx.get('contact') or '[Your phone number]'}

With thanks,
{ctx['sender']}
{ctx['org']}"""
    return {"subject": f"One home in {city}, and a way you could help", "body": body}


def template_inquiry(s, ctx):
    city = ctx.get("city") or "[city]"
    body = f"""Hello,

{ctx['org']} is planning one affordable ownership home in {city}, {ctx.get('county') or '[county]'}. We have a funding gap of about {money(ctx['gap'])} and are exploring whether {s['name']} could help.

Could you tell us:
1. Whether a project like ours is eligible [TO CONFIRM: eligible costs and buyer income limits]
2. When the next funding round or application window opens
3. Who we should speak with about the application

Thank you,
{ctx['sender']}
{ctx['org']}
{ctx.get('contact') or '[Your phone number]'}"""
    return {"subject": f"Question about {s['name']} for one home in {city}", "body": body}


def template_application(s, ctx):
    city = ctx.get("city") or "[city]"
    body = f"""Project summary
{ctx['org']} will create one affordable ownership home in {city}. [Describe the site, the home and the buyer it will serve.]

Location
{city}, {ctx.get('county') or '[county]'}, {ctx.get('state') or ''}. [Census tract and site details.]

Funding request
We request {money(ctx['amount'])} from {s['name']} toward a total gap of about {money(ctx['gap'])} (planning estimates). [TO CONFIRM: eligible costs under the current notice.]

Timeline
Funds are needed within {ctx['deadline']} months. [Key milestones: site control, approvals, construction, sale.]

Organization capacity
[Homes completed, staff, partners, financial statements.]

Documents to gather
- [TO CONFIRM against the current notice]
- [TO CONFIRM against the current notice]"""
    return {"subject": f"{s['name']} application draft: one home in {city}", "body": body}


# ---------- Claude ----------

def ai_status():
    """Whether AI drafting is available, for the page to show. Does not call the API."""
    try:
        import anthropic  # noqa: F401
    except ImportError:
        return {"available": False, "model": None, "reason": "Anthropic SDK not installed (pip3 install anthropic)."}
    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        return {"available": False, "model": None, "reason": "ANTHROPIC_API_KEY is not set."}
    return {"available": True, "model": MODEL, "reason": None}


def call_claude(system, facts, effort):
    """Returns (text, model, note). text is None when Claude is not available or declined."""
    try:
        import anthropic
    except ImportError:
        return None, None, "Template draft. Install the Anthropic SDK (pip3 install anthropic) and set ANTHROPIC_API_KEY for AI drafts."
    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        return None, None, "Template draft. Set ANTHROPIC_API_KEY before starting the server for AI drafts."
    client = anthropic.Anthropic()
    prompt = "Facts:\n" + "\n".join(f"- {x}" for x in facts) + "\n\nWrite the draft now."
    try:
        # Claude Opus 5.5 always thinks; effort sets how hard. Server-side fallback reroutes
        # a refused request to another model inside the same call.
        resp = client.beta.messages.create(
            model=MODEL,
            max_tokens=16000,
            system=system,
            messages=[{"role": "user", "content": prompt}],
            betas=["server-side-fallback-2026-07-01"],
            extra_body={"output_config": {"effort": effort}, "fallbacks": "default"},
        )
    except anthropic.AuthenticationError:
        return None, None, "Template draft. The Claude API key was rejected."
    except anthropic.RateLimitError:
        return None, None, "Template draft. The Claude API is rate limiting; try again in a minute."
    except anthropic.APIStatusError as e:
        return None, None, f"Template draft. The Claude API returned an error ({e.status_code})."
    except anthropic.APIConnectionError:
        return None, None, "Template draft. Could not reach the Claude API."
    if resp.stop_reason == "refusal":
        return None, None, "Template draft. Claude declined to draft this one."
    text = "".join(b.text for b in resp.content if b.type == "text").strip()
    return (text or None), resp.model, None


def split_draft(text, label):
    lines = text.splitlines()
    if lines and lines[0].lower().startswith(label.lower() + ":"):
        return lines[0].split(":", 1)[1].strip(), "\n".join(lines[1:]).strip()
    return "", text.strip()


def draft(kind, record, ctx):
    """kind: 'email' (donor), 'inquiry' (program staff) or 'application' (program)."""
    if kind == "email":
        system, facts, effort, label, template = EMAIL_SYSTEM, donor_facts(record, ctx), "low", "Subject", template_email
    elif kind == "inquiry":
        system, facts, effort, label, template = INQUIRY_SYSTEM, program_facts(record, ctx), "low", "Subject", template_inquiry
    else:
        system, facts, effort, label, template = APPLICATION_SYSTEM, program_facts(record, ctx), "medium", "Title", template_application
    text, model, note = call_claude(system, facts, effort)
    if text:
        subject, body = split_draft(text, label)
        fallback = template(record, ctx)
        return {"subject": subject or fallback["subject"], "body": body, "source": "claude", "model": model, "note": None}
    out = template(record, ctx)
    out.update({"source": "template", "model": None, "note": note})
    return out
