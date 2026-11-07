"""Gap Closer prototype server.

Serves the web app in ./public and a few small JSON endpoints:

  GET /api/locate?address=...        U.S. Census Geocoder, address to place
  GET /api/locate?lat=..&lon=..      U.S. Census Geocoder, map point to place
  GET /api/suggest?q=...             address suggestions while typing (Photon, OpenStreetMap)
  GET /api/funding?state=&county=&city=   funding sources for that place (placeholder data)
  GET /api/crm/donors?state=&county=&city= placeholder CRM connector (synthetic donors)
  GET /api/ai                        whether AI drafting is available
  POST /api/draft                    AI or template draft of an email or application (never sent)

Python 3.9+ standard library. Optional: the Anthropic SDK (pip3 install anthropic) and
ANTHROPIC_API_KEY for AI drafts; without them, drafts come from templates.
Run:  python3 prototype/server.py
PROTOTYPE ONLY. It reads public data and local files. It never sends anything to a city,
a donor or a CRM.
"""

import json
import os
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import drafting

ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(ROOT, "public")
DATA = os.path.join(ROOT, "data")
PORT = int(os.environ.get("PORT", "8765"))

CENSUS_BASE = "https://geocoding.geo.census.gov/geocoder/geographies/"
CENSUS_DOCS = "https://geocoding.geo.census.gov/geocoder/"
CENSUS_PARAMS = {
    "benchmark": "Public_AR_Current",
    "vintage": "Current_Current",
    "layers": "States,Counties,Incorporated Places,Census Tracts",
    "format": "json",
}

# Be polite to the Census API: cache every answer and send at most one request a second.
_cache = {}
_lock = threading.Lock()
_last_call = [0.0]


def census(kind, extra):
    query = dict(CENSUS_PARAMS, **extra)
    url = CENSUS_BASE + kind + "?" + urllib.parse.urlencode(query)
    with _lock:
        if url in _cache:
            return _cache[url]
        wait = 1.0 - (time.time() - _last_call[0])
        if wait > 0:
            time.sleep(wait)
        req = urllib.request.Request(url, headers={"User-Agent": "gap-closer-prototype/0.1 (hackathon prototype)"})
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.load(resp)
        finally:
            _last_call[0] = time.time()
        _cache[url] = data
        return data


def first(geos, layer):
    items = geos.get(layer) or []
    return items[0] if items else {}


def summarize(geos, lat, lon, matched=None):
    state = first(geos, "States")
    county = first(geos, "Counties")
    place = first(geos, "Incorporated Places")
    tract = first(geos, "Census Tracts")
    city = place.get("BASENAME") or None
    return {
        "matched_address": matched,
        "lat": lat,
        "lon": lon,
        "state": state.get("STUSAB"),
        "county": county.get("NAME"),
        "county_fips": county.get("GEOID"),
        "city": city,
        "place_name": place.get("NAME"),
        "place_geoid": place.get("GEOID"),
        "unincorporated": city is None,
        "tract": tract.get("NAME"),
        "tract_geoid": tract.get("GEOID"),
        "source": {
            "name": "U.S. Census Geocoder (Public_AR_Current, Current_Current)",
            "url": CENSUS_DOCS,
            "retrieved": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        },
    }


def locate(params):
    if params.get("address"):
        address = params["address"][:200]
        data = census("onelineaddress", {"address": address})
        matches = data.get("result", {}).get("addressMatches", [])
        if not matches:
            return 404, {"error": "No match for that address. Try adding the city and CA, or drop a pin on the map."}
        m = matches[0]
        return 200, summarize(m.get("geographies", {}), m["coordinates"]["y"], m["coordinates"]["x"], m.get("matchedAddress"))
    try:
        lat = float(params.get("lat", ""))
        lon = float(params.get("lon", ""))
    except ValueError:
        return 400, {"error": "Give an address, or lat and lon."}
    data = census("coordinates", {"x": f"{lon:.6f}", "y": f"{lat:.6f}"})
    geos = data.get("result", {}).get("geographies", {})
    if not geos.get("Counties"):
        return 404, {"error": "That point is outside the U.S. Census coverage. Pick a spot on land in the U.S."}
    return 200, summarize(geos, lat, lon)


PHOTON = "https://photon.komoot.io/api/"
_suggest_cache = {}
_suggest_last = [0.0]


def suggest(params):
    """Address suggestions while the user types. Photon (komoot, OpenStreetMap data), biased to
    Orange County and limited to California. Cached, and at most two calls a second (fair use)."""
    q = (params.get("q") or "").strip()[:120]
    if len(q) < 3:
        return 200, {"suggestions": []}
    key = q.lower()
    with _lock:
        if key in _suggest_cache:
            return 200, _suggest_cache[key]
        wait = 0.5 - (time.time() - _suggest_last[0])
        if wait > 0:
            time.sleep(wait)
        url = PHOTON + "?" + urllib.parse.urlencode({
            "q": q, "limit": 6, "lang": "en", "lat": 33.70, "lon": -117.83,
            "bbox": "-124.5,32.5,-114.1,42.0",
        })
        req = urllib.request.Request(url, headers={"User-Agent": "gap-closer-prototype/0.1 (hackathon prototype)"})
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.load(resp)
        finally:
            _suggest_last[0] = time.time()
    out, seen = [], set()
    for f in data.get("features", []):
        p = f.get("properties", {})
        if p.get("state") != "California":
            continue
        street = " ".join(x for x in [p.get("housenumber"), p.get("street")] if x)
        name = p.get("name")
        line1 = street if not name else (f"{name}, {street}" if street and name != street else name)
        line2 = ", ".join(x for x in [p.get("city") or p.get("district"), "CA", p.get("postcode")] if x)
        label = ", ".join(x for x in [line1, line2] if x)
        if not line1 or label in seen:
            continue
        seen.add(label)
        lon, lat = f["geometry"]["coordinates"]
        out.append({"label": label, "line1": line1, "line2": line2, "lat": lat, "lon": lon})
    body = {"suggestions": out, "source": "Photon by komoot, OpenStreetMap data"}
    _suggest_cache[key] = body
    return 200, body


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)


def norm(s):
    return (s or "").strip().lower()


def funding(params):
    """Placeholder research step: filter the local source list to the place."""
    state, county, city = norm(params.get("state")), norm(params.get("county")), norm(params.get("city"))
    book = load("funding-sources.json")
    found, has_city_record = [], False
    for s in book["sources"]:
        w = s["where"]
        scope = w["scope"]
        ok = (
            scope == "national"
            or (scope == "state" and norm(w.get("state")) == state)
            or (scope == "county" and norm(w.get("county")) == county and norm(w.get("state")) == state)
            or (scope == "city" and norm(w.get("city")) == city and norm(w.get("county")) == county)
        )
        if ok:
            found.append(s)
            if scope == "city":
                has_city_record = True
    if city and not has_city_record:
        found.append({
            "id": "city-unknown",
            "name": f"{params.get('city')} housing programs",
            "level": "city",
            "agency": f"City of {params.get('city')}",
            "pays_for": "Unknown. This city is not in the prototype's source list yet.",
            "where": {"scope": "city", "city": params.get("city")},
            "url": None,
            "more_urls": [],
            "source_status": "UNVERIFIED",
            "facts": ["Not researched yet."],
            "funds_open": "unknown",
            "kind": "unknown",
            "placeholder": {"award_per_home": 0, "max_total": 0, "probability": 0, "months_to_funds": None, "counts_toward_gap": False},
            "next_step": "Call the city housing office and add what you learn to data/funding-sources.json with a source and date.",
        })
    if not city:
        found.append({
            "id": "unincorporated",
            "name": "Unincorporated area: county programs apply",
            "level": "city",
            "agency": "No city: the county is the local government here",
            "pays_for": "Unknown.",
            "where": {"scope": "city"},
            "url": None,
            "more_urls": [],
            "source_status": "UNVERIFIED",
            "facts": ["The Census Geocoder found no incorporated place at this point."],
            "funds_open": "unknown",
            "kind": "unknown",
            "placeholder": {"award_per_home": 0, "max_total": 0, "probability": 0, "months_to_funds": None, "counts_toward_gap": False},
            "next_step": "Ask the county housing office which programs cover unincorporated areas.",
        })
    county_found = any(s["where"]["scope"] == "county" for s in found)
    if county and not county_found:
        found.append({
            "id": "county-unknown",
            "name": f"{params.get('county')} housing programs",
            "level": "county",
            "agency": params.get("county"),
            "pays_for": "Unknown. This county is not in the prototype's source list yet.",
            "where": {"scope": "county", "county": params.get("county")},
            "url": None,
            "more_urls": [],
            "source_status": "UNVERIFIED",
            "facts": ["Not researched yet."],
            "funds_open": "unknown",
            "kind": "unknown",
            "placeholder": {"award_per_home": 0, "max_total": 0, "probability": 0, "months_to_funds": None, "counts_toward_gap": False},
            "next_step": "Find the county housing department or housing trust and add it with a source and date.",
        })
    notes = []
    if state != "ca":
        notes.append("This prototype only has California and Orange County sources. State and local results outside California are unknown.")
    return 200, {"as_of": book["as_of"], "placeholder_note": book["placeholder_note"], "notes": notes, "sources": found}


def crm_donors(params):
    """PLACEHOLDER CRM connector. Swap this function for a read-only call to the real CRM.

    It returns every donor with the gifts they made in this city and this county, so the
    advisor can see who already has a history with the region.
    """
    county, city = norm(params.get("county")), norm(params.get("city"))
    book = load("crm-donors.synthetic.json")
    out = []
    for d in book["donors"]:
        gifts = d["gifts"]
        in_city = [g for g in gifts if city and norm(g["city"]) == city]
        in_county = [g for g in gifts if county and norm(g["county"]) == county]
        ties = d.get("ties", [])
        tie_city = [t for t in ties if city and norm(t["city"]) == city]
        tie_county = [t for t in ties if county and norm(t["county"]) == county]
        out.append(dict(d, region={
            "match": "city" if in_city else ("county" if in_county else "none"),
            "gifts_in_city": len(in_city),
            "gifts_in_county": len(in_county),
            "total_in_county": sum(g["amount"] for g in in_county),
            "tie_match": "city" if tie_city else ("county" if tie_county else "none"),
            "ties_here": tie_city or tie_county,
        }))
    return 200, {
        "connector": {"name": "CRM (placeholder)", "status": "placeholder", "records": "SYNTHETIC", "read_only": True, "as_of": book["as_of"]},
        "SYNTHETIC": book["SYNTHETIC"],
        "donors": out,
    }


ROUTES = {"/api/locate": locate, "/api/suggest": suggest, "/api/funding": funding, "/api/crm/donors": crm_donors,
          "/api/ai": lambda params: (200, drafting.ai_status())}


def _num(v, lo, hi, default):
    try:
        return max(lo, min(hi, float(v)))
    except (TypeError, ValueError):
        return default


def _txt(v, default, limit=120):
    v = str(v or "").strip()[:limit]
    return v or default


def make_draft(payload):
    """POST /api/draft: draft one email or application. Drafts only; nothing is sent."""
    kind = payload.get("kind")
    if kind not in ("email", "inquiry", "application"):
        return 400, {"error": "kind must be email, inquiry or application."}
    place = payload.get("place") or {}
    params = {"state": _txt(place.get("state"), "", 40), "county": _txt(place.get("county"), "", 80), "city": _txt(place.get("city"), "", 80)}
    rid = str(payload.get("id") or "")
    if kind == "email":
        record = next((d for d in crm_donors(params)[1]["donors"] if d["id"] == rid), None)
        if record and record.get("do_not_solicit"):
            return 400, {"error": "This donor is marked do not solicit in the CRM."}
    else:
        record = next((s for s in load("funding-sources.json")["sources"] if s["id"] == rid), None)
    if not record:
        return 404, {"error": "No such source or donor."}
    ctx = dict(params,
               gap=_num(payload.get("gap"), 0, 10_000_000, 95000),
               deadline=int(_num(payload.get("deadline"), 1, 120, 18)),
               amount=_num(payload.get("amount"), 0, 10_000_000, 0),
               org=_txt(payload.get("org"), "[Your organization]"),
               sender=_txt(payload.get("sender"), "[Your name]"))
    return 200, drafting.draft(kind, record, ctx)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        route = ROUTES.get(parsed.path)
        if not route:
            return super().do_GET()
        params = {k: v[0] for k, v in urllib.parse.parse_qs(parsed.query).items()}
        try:
            status, body = route(params)
        except urllib.error.URLError as e:
            status, body = 502, {"error": f"The Census Geocoder did not answer ({getattr(e, 'reason', e)}). Try again, or drop a pin."}
        except Exception as e:  # keep the demo running
            status, body = 500, {"error": f"Server error: {e}"}
        self._json(status, body)

    def do_POST(self):
        if urllib.parse.urlparse(self.path).path != "/api/draft":
            return self._json(404, {"error": "Not found."})
        try:
            length = int(self.headers.get("Content-Length") or 0)
            if length > 20_000:
                return self._json(413, {"error": "Request too large."})
            payload = json.loads(self.rfile.read(length) or b"{}")
            status, body = make_draft(payload)
        except json.JSONDecodeError:
            status, body = 400, {"error": "Send JSON."}
        except Exception as e:  # keep the demo running
            status, body = 500, {"error": f"Server error: {e}"}
        self._json(status, body)

    def _json(self, status, body):
        raw = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, fmt, *args):
        sys.stderr.write("[gap-closer] " + (fmt % args) + "\n")


if __name__ == "__main__":
    print(f"Gap Closer prototype on http://localhost:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
