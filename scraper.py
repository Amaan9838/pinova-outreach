"""
Compass Agent Scraper — v6
----------------------------
New vs v5:
  - Removed Google social fallback (triggers bot detection / CAPTCHA).
  - Raised minimum listing gate to >=1.
  - Splits output into TWO files:
      1. *_with_links.csv  — agents with website or social links on Compass
         (for fast manual review → Comet browser deep-dive on weak sites)
      2. *_no_links.csv    — agents with >=1 listing but no website/social on Compass
         (to be researched separately later)

Previous versions:
  v5: Team page deep-dive: when a profile page belongs to a team/group, the scraper
    navigates into the team member list, identifies the leader/principal/broker
    (by designation text first, then positional fallback), and scrapes *that*
    individual's profile instead of the team page itself.
  - Google social fallback: if no social links are found on the profile page,
    a Playwright Google search for "[Full Name] [Designation]" is run and the
    first-page result links are scanned for social-domain matches.  Nothing on
    page 1 → treat as no social signals.

USAGE:
    pip install playwright
    playwright install chromium
    python scraper_v5.py
    python scraper_v5.py --location "miami-fl/33101" --start-page 1 --end-page 5
    python scraper_v5.py --debug
"""

import os
import asyncio
import csv
import json
import re
import argparse
import logging
from dataclasses import dataclass, fields, asdict
from typing import Optional
from urllib.parse import quote_plus
from playwright.async_api import async_playwright, Page, TimeoutError as PWTimeout

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("compass")

# ── Config ────────────────────────────────────────────────────────────────────
BASE_URL        = "https://www.compass.com/agents/locations/{location}/page-{page}/"
PROFILE_TIMEOUT = 45_000
LIST_TIMEOUT    = 45_000
GOOGLE_TIMEOUT  = 20_000
MIN_LISTINGS    = 1        # gate: skip if listing count < this (i.e. need >=1)
HEADLESS        = True

# ── Social domains we care about ──────────────────────────────────────────────
SOCIAL_DOMAINS = [
    "instagram.com", "facebook.com", "linkedin.com",
    "tiktok.com", "twitter.com", "x.com", "youtube.com"
]

# Compass's own footer social accounts — always present, never the agent's
COMPASS_SOCIAL_ACCOUNTS = [
    "instagram.com/compass",
    "facebook.com/compass",
    "x.com/compass",
    "twitter.com/compass",
    "linkedin.com/company/compass",
    "youtube.com/compass",
]

# ── Domains/patterns to SKIP when looking for personal website ────────────────
SKIP_WEBSITE_PATTERNS = [
    "compass.com",
    "compass-",
    "compassdevelopment",
    "luxuryatcompass",
    "openacademy",
    "compassplus",
    "compassmilitary",
    "compassranch",
    "zillow.com",
    "realtor.com",
    "trulia.com",
    "redfin.com",
    "homes.com",
    "linktr.ee",
    "linktree.com",
    "itunes.apple.com",
    "play.google.com",
    "nmlsconsumer",
    "rocketmortgage",
    "trec.texas.gov",
    "dos.ny.gov",
    "investors.compass",
]

# ── Keywords that identify team-leader / principal roles ──────────────────────
LEADER_TITLES = [
    "team leader", "team lead", "team principal", "principal agent",
    "founding agent", "lead agent", "managing broker", "broker of record",
    "licensed associate broker", "associate broker",
]

# Keywords that indicate a page belongs to a team/group rather than one agent
TEAM_PAGE_SIGNALS = [
    "team leader", "team member", "meet the team", "our team",
    "team principal", "founding agent", "team overview",
]


# ── Data model ────────────────────────────────────────────────────────────────
@dataclass
class AgentLead:
    Name:                str = ""
    Email:               str = ""
    Phone:               str = ""
    Listing_Count:       int = 0
    Website_URL:         str = ""
    Social_Links:        str = ""
    Compass_Profile_URL: str = ""
    Designation:         str = ""   # new — captured for Google search & output
    City:                str = ""
    Page:                int = 0


# ── Helpers ───────────────────────────────────────────────────────────────────
def normalize_url(url: str) -> str:
    """
    Normalizes a URL by stripping protocol (http/https), www., query strings,
    and trailing slashes for robust matching across URL variations.
    """
    if not url:
        return ""
    u = url.strip().lower()
    u = re.sub(r"^https?://(www\.)?", "", u)
    u = u.split("?")[0].split("#")[0]
    return u.rstrip("/")

def normalize_email(email: str) -> str:
    """Normalizes an email address (lowercase and trimmed) for exact matching."""
    return email.strip().lower() if email else ""

def extract_slug(url: str) -> str:
    """
    Extracts the agent slug from a Compass profile URL (e.g., 'john-doe' from
    'https://www.compass.com/agents/john-doe/').
    """
    norm = normalize_url(url)
    if "compass.com/agents/" in norm:
        parts = norm.split("compass.com/agents/")[-1].split("/")
        if parts and parts[0] and parts[0] != "locations":
            return parts[0]
    return norm

def load_existing_prospects() -> tuple[set[str], set[str]]:
    """
    Scans the prospects/ directory (and the workspace root) for ALL CSV files,
    parses them, and extracts normalized URLs, agent slugs, and Email addresses
    to build sets of pre-scraped agents so they are never fetched or duplicated again.
    """
    seen_urls = set()
    seen_emails = set()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    prospects_dir = os.path.join(script_dir, "prospects")
    
    dirs_to_check = [prospects_dir, script_dir]
    csv_files = []
    
    for d in dirs_to_check:
        if not os.path.isdir(d):
            continue
        for filename in os.listdir(d):
            if filename.endswith(".csv"):
                csv_files.append(os.path.join(d, filename))
                
    csv_files = list(set(csv_files))
    if not csv_files:
        log.info("No existing CSV files found to load pre-scraped agent data.")
        return seen_urls, seen_emails

    log.info(f"Scanning {len(csv_files)} existing CSV files for pre-scraped agents...")
    for filepath in csv_files:
        try:
            with open(filepath, "r", newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                if not reader.fieldnames:
                    continue
                
                url_cols = []
                email_cols = []
                for col in reader.fieldnames:
                    col_clean = col.strip().lower()
                    if col_clean in ["compass_profile_url", "profile_url", "compass profile url", "url", "compass", "compass_url"]:
                        url_cols.append(col)
                    elif col_clean in ["email", "email_address", "agent_email"]:
                        email_cols.append(col)
                
                url_count = 0
                email_count = 0
                for row in reader:
                    for u_col in url_cols:
                        url_val = row.get(u_col)
                        if url_val:
                            norm_u = normalize_url(url_val)
                            if norm_u:
                                seen_urls.add(norm_u)
                                slug = extract_slug(url_val)
                                if slug:
                                    seen_urls.add(slug)
                                url_count += 1
                    for e_col in email_cols:
                        email_val = row.get(e_col)
                        if email_val:
                            norm_e = normalize_email(email_val)
                            if norm_e:
                                seen_emails.add(norm_e)
                                email_count += 1
                                
                if url_count or email_count:
                    log.info(f"  Loaded data from {os.path.basename(filepath)} ({url_count} URLs, {email_count} emails)")
        except Exception as e:
            log.warning(f"  Failed to read {filepath}: {e}")

    log.info(f"Total unique pre-scraped URLs/slugs: {len(seen_urls)} | Emails: {len(seen_emails)}")
    return seen_urls, seen_emails

def deduplicate_leads(leads: list[AgentLead]) -> list[AgentLead]:
    """Ensures a list of AgentLead objects contains no duplicates by profile URL, slug, or email."""
    unique_leads = []
    seen_u = set()
    seen_e = set()
    
    for lead in leads:
        norm_u = normalize_url(lead.Compass_Profile_URL)
        slug = extract_slug(lead.Compass_Profile_URL)
        norm_e = normalize_email(lead.Email)
        
        if norm_u and norm_u in seen_u:
            continue
        if slug and slug in seen_u:
            continue
        if norm_e and norm_e in seen_e:
            continue
            
        if norm_u:
            seen_u.add(norm_u)
        if slug:
            seen_u.add(slug)
        if norm_e:
            seen_e.add(norm_e)
            
        unique_leads.append(lead)
        
    return unique_leads

async def block_unnecessary_resources(route):
    """Intercepts requests to block large/unneeded resources like images and fonts to save time."""
    if route.request.resource_type in ["image", "media", "font"]:
        await route.abort()
    else:
        await route.continue_()

def clean(t: Optional[str]) -> str:
    return t.strip() if t else ""

def extract_city(location: str) -> str:
    """Extract and format the city name from a location slug like 'dallas-tx/40435'."""
    if not location:
        return ""
    parts = location.split('/')[0].split('-')
    if len(parts) > 1:
        state = parts[-1].upper()
        if len(state) == 2:  # state abbreviation
            return f"{' '.join(parts[:-1]).title()}, {state}"
    return " ".join(parts).title()

def is_compass_social(url: str) -> bool:
    return any(cs in url for cs in COMPASS_SOCIAL_ACCOUNTS)

def is_personal_website(url: str) -> bool:
    if not url.startswith("http"):
        return False
    if url.startswith("mailto:") or url.startswith("tel:"):
        return False
    url_lower = url.lower()
    if any(pat in url_lower for pat in SKIP_WEBSITE_PATTERNS):
        return False
    if any(d in url_lower for d in SOCIAL_DOMAINS):
        return False
    return True

def individual_agent_links(all_links: list[str], exclude_url: str = "") -> list[str]:
    """Filter a link list down to individual Compass agent profile URLs."""
    out = []
    for h in all_links:
        if not re.search(r"compass\.com/agents/[^/]+/?$", h):
            continue
        if "locations" in h or "agents-compass" in h:
            continue
        if exclude_url and h.rstrip("/") == exclude_url.rstrip("/"):
            continue
        out.append(h)
    return list(dict.fromkeys(out))  # dedupe while preserving order

async def safe_goto(page: Page, url: str, timeout: int = 30_000, retries: int = 1) -> bool:
    for attempt in range(1 + retries):
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=timeout)
            return True
        except PWTimeout:
            if attempt < retries:
                log.warning(f"Timeout (attempt {attempt+1}), retrying: {url}")
                await asyncio.sleep(3)
            else:
                log.warning(f"Timeout (giving up after {attempt+1} attempts): {url}")
                return False
        except Exception as e:
            log.warning(f"Error {url}: {e}")
            return False
    return False

async def all_hrefs(page: Page) -> list[str]:
    """Return deduplicated list of all href values on the current page."""
    try:
        return await page.eval_on_selector_all(
            "a[href]", "els => [...new Set(els.map(e => e.href))]"
        )
    except Exception:
        return []


# ── Team-page detection ───────────────────────────────────────────────────────
async def is_team_page(page: Page, debug: bool = False) -> bool:
    """
    Returns True when the loaded page belongs to a team/group profile rather
    than a single agent.

    Signals checked (any one is enough):
      1. The body text contains known team-page phrases.
      2. There are 2+ distinct individual agent profile links on the page
         (team member cards always link to each member's own page).
    """
    try:
        body_lower = (await page.inner_text("body")).lower()
    except Exception:
        body_lower = ""

    has_team_text = any(sig in body_lower for sig in TEAM_PAGE_SIGNALS)

    all_links = await all_hrefs(page)
    agent_urls = individual_agent_links(all_links, exclude_url=page.url)
    has_many_agents = len(agent_urls) >= 2

    result = has_team_text or has_many_agents
    if debug:
        log.info(
            f"  is_team_page → {result}  "
            f"(team_text={has_team_text}, agent_links={len(agent_urls)})"
        )
    return result


# ── Team leader resolution ────────────────────────────────────────────────────
async def find_team_leader(page: Page, debug: bool = False) -> Optional[dict]:
    """
    On a team profile page, identify and return the leader's individual agent
    info dict, ready for enrich_profile().

    Strategy (stops at first hit):
      1. Scan the page HTML for agent-slug / leader-title co-occurrence.
      2. Scan visible card/section text for leader title keywords adjacent to a
         profile link.
      3. Positional fallback — first individual agent link listed (Compass almost
         always puts the leader first).
    """
    all_links = await all_hrefs(page)
    agent_urls = individual_agent_links(all_links, exclude_url=page.url)

    if not agent_urls:
        log.info("  find_team_leader: no individual agent links found on team page")
        return None

    if debug:
        log.info(f"  find_team_leader: {len(agent_urls)} candidate links:")
        for u in agent_urls[:6]:
            log.info(f"    {u}")

    leader_url: Optional[str] = None

    # ── Strategy 1: HTML pattern match (slug near a leader title) ─────────────
    try:
        html_lower = (await page.content()).lower()
        for url in agent_urls[:6]:
            slug = url.rstrip("/").split("/")[-1]          # e.g. "jane-doe-abc"
            slug_lower = slug.lower()
            # Find the slug in HTML then check the surrounding 400 chars for a title
            idx = html_lower.find(slug_lower)
            if idx == -1:
                continue
            window = html_lower[max(0, idx - 200): idx + 400]
            if any(title in window for title in LEADER_TITLES):
                leader_url = url
                log.info(
                    f"  Leader found via HTML pattern: "
                    f"{slug.replace('-', ' ').title()}"
                )
                break
    except Exception as e:
        log.warning(f"  Strategy 1 error: {e}")

    # ── Strategy 2: visible card text near a profile link ─────────────────────
    if not leader_url:
        try:
            selectors = [
                '[class*="agent-card"]', '[class*="agentCard"]',
                '[class*="member-card"]', '[class*="memberCard"]',
                '[class*="team-member"]', '[class*="teamMember"]',
                '[class*="agent-item"]',  '[class*="agentItem"]',
                "section", "article",
            ]
            for sel in selectors:
                cards = await page.query_selector_all(sel)
                if not cards:
                    continue
                for card in cards[:8]:
                    try:
                        card_text = (await card.inner_text()).lower()
                    except Exception:
                        continue
                    if not any(t in card_text for t in LEADER_TITLES):
                        continue
                    # This card has a leader title — find its profile link
                    link_el = await card.query_selector(
                        "a[href*='compass.com/agents/']"
                    )
                    if link_el:
                        href = await link_el.get_attribute("href")
                        if href and re.search(
                            r"compass\.com/agents/[^/]+/?$", href
                        ):
                            leader_url = href
                            slug = href.rstrip("/").split("/")[-1]
                            log.info(
                                f"  Leader found via card text ({sel}): "
                                f"{slug.replace('-', ' ').title()}"
                            )
                            break
                if leader_url:
                    break
        except Exception as e:
            log.warning(f"  Strategy 2 error: {e}")

    # ── Strategy 3: positional fallback ───────────────────────────────────────
    if not leader_url:
        leader_url = agent_urls[0]
        slug = leader_url.rstrip("/").split("/")[-1]
        log.info(
            f"  Leader fallback (first link): {slug.replace('-', ' ').title()}"
        )

    slug = leader_url.rstrip("/").split("/")[-1]
    return {
        "profile_url": leader_url,
        "name":  slug.replace("-", " ").title(),
        "email": "",
        "phone": "",
    }


# ── Designation extractor ─────────────────────────────────────────────────────
async def get_designation(page: Page) -> str:
    """
    Try to pull the agent's professional designation/title from the profile page
    (e.g. 'REALTOR®', 'Licensed Real Estate Salesperson').
    Falls back to 'Real Estate Agent' if nothing found.
    """
    designation_patterns = [
        # Compass uses a few different selectors depending on the page version
        '[data-tn="agent-title"]',
        '[class*="agentTitle"]',
        '[class*="agent-title"]',
        '[class*="designation"]',
        '[class*="agentDesignation"]',
        'h2[class*="agent"]',
        'p[class*="title"]',
    ]
    for sel in designation_patterns:
        try:
            el = await page.query_selector(sel)
            if el:
                text = clean(await el.inner_text())
                if text and len(text) < 80:   # sanity-check length
                    return text
        except Exception:
            continue

    # Regex fallback: scan body for common title strings
    try:
        body = await page.inner_text("body")
        m = re.search(
            r"(Licensed\s+(?:Real\s+Estate\s+)?(?:Salesperson|Agent|Broker)"
            r"|REALTOR®?|Associate\s+Broker|Broker\s+of\s+Record"
            r"|Real\s+Estate\s+(?:Agent|Professional))",
            body, re.IGNORECASE,
        )
        if m:
            return m.group(0).strip()
    except Exception:
        pass

    return "Real Estate Agent"


# ── Google social fallback ────────────────────────────────────────────────────
async def google_search_socials(
    page: Page, name: str, designation: str, debug: bool = False
) -> list[str]:
    """
    Search Google for '[Full Name] [Designation]' and extract social-domain links
    from the *first page* of results.

    Only links whose URL contains at least one token from the agent's name are kept
    (rough de-duplication against unrelated profiles).

    Returns an empty list if Google is unreachable or no matches found.
    """
    query = f'"{name}" "{designation}"'
    search_url = f"https://www.google.com/search?q={quote_plus(query)}"

    log.info(f"  → Google fallback search: {query}")

    ok = await safe_goto(page, search_url, GOOGLE_TIMEOUT)
    if not ok:
        log.warning("  Google search unreachable — skipping social fallback")
        return []

    await asyncio.sleep(2.5)   # let JS render

    try:
        # Google's organic result links live under #search; pull all hrefs from there
        result_links: list[str] = await page.eval_on_selector_all(
            "#search a[href]",
            "els => [...new Set(els.map(e => e.href).filter(h => h.startsWith('http')))]",
        )
    except Exception:
        # Broader fallback if #search isn't present (CAPTCHA, etc.)
        result_links = await all_hrefs(page)

    if debug:
        log.info(f"  Google raw links: {len(result_links)}")
        for l in result_links[:10]:
            log.info(f"    {l}")

    # Name tokens used for URL matching (skip very short tokens)
    name_tokens = [t.lower() for t in name.split() if len(t) > 2]

    socials: list[str] = []
    for link in result_links:
        link_lower = link.lower()
        if not any(d in link_lower for d in SOCIAL_DOMAINS):
            continue
        if is_compass_social(link):
            continue
        # At least one name token must appear somewhere in the URL
        if not any(tok in link_lower for tok in name_tokens):
            continue
        # Skip bare domain roots like https://www.linkedin.com/
        path = link.split("://", 1)[-1].split("?")[0].rstrip("/")
        if path.count("/") < 1:
            continue
        socials.append(link)

    socials = list(dict.fromkeys(socials))  # dedupe, preserve order
    log.info(f"  Google social results: {len(socials)} link(s) found")
    return socials


# ── STEP A: Listing page → extract all agents ─────────────────────────────────
async def get_agents_from_listing_page(
    page: Page, listing_url: str, debug: bool = False
) -> list[dict]:
    ok = await safe_goto(page, listing_url, LIST_TIMEOUT)
    if not ok:
        return []

    agents = []

    # Primary: JSON-LD structured data
    try:
        blocks = await page.eval_on_selector_all(
            'script[type="application/ld+json"]',
            "els => els.map(e => e.textContent)"
        )
        for block in blocks:
            try:
                data  = json.loads(block)
                items = data.get("@graph", [data])
                for item in items:
                    if item.get("@type") == "RealEstateAgent":
                        url = (item.get("url") or item.get("@id") or "").rstrip("/") + "/"
                        if "compass.com/agents/" in url:
                            agents.append({
                                "profile_url": url,
                                "name":  clean(item.get("name", "")),
                                "email": clean(item.get("email", "")),
                                "phone": clean(str(item.get("telephone", ""))),
                            })
            except json.JSONDecodeError:
                continue
    except Exception as e:
        log.warning(f"JSON-LD error: {e}")

    # Fallback: pair profile links + mailto links
    if not agents:
        log.info("JSON-LD empty — using mailto fallback")
        all_links = await all_hrefs(page)
        profile_links = individual_agent_links(all_links)
        email_links = [h.replace("mailto:", "") for h in all_links if h.startswith("mailto:")]
        for i, pu in enumerate(profile_links):
            email = email_links[i] if i < len(email_links) else ""
            slug  = pu.rstrip("/").split("/")[-1]
            agents.append({
                "profile_url": pu,
                "name":  slug.replace("-", " ").title(),
                "email": email,
                "phone": "",
            })

    if debug:
        log.info(f"DEBUG — {len(agents)} agents from listing page")
        for a in agents[:5]:
            log.info(f"  {a}")

    log.info(f"Found {len(agents)} agents → {listing_url}")
    return agents


# ── STEP B: Profile page → enrich (with team deep-dive + Google social) ───────
async def enrich_profile(
    page: Page, agent: dict, city: str = "", page_num: int = 0, seen_urls: set[str] = None, seen_emails: set[str] = None, debug: bool = False
) -> Optional[AgentLead]:
    """
    Load the agent's Compass profile page and extract all lead data.

    If the page turns out to be a team page:
      - find the team leader's individual profile URL
      - reload with that URL and continue as normal
    """
    # Intercept requests and block unneeded resources (images/fonts)
    await page.route("**/*", block_unnecessary_resources)

    url = agent["profile_url"]
    norm_url = normalize_url(url)
    slug = extract_slug(url)
    norm_email = normalize_email(agent.get("email", ""))

    ok  = await safe_goto(page, url, PROFILE_TIMEOUT)
    if not ok:
        return None

    await asyncio.sleep(1.5)

    # ── Team page check ────────────────────────────────────────────────────────
    if await is_team_page(page, debug=debug):
        log.info(f"  Team page detected: {url}")
        leader = await find_team_leader(page, debug=debug)
        if not leader:
            log.info("  Could not identify team leader — skipping")
            return None

        # Check if the team leader's URL, slug, or email is already seen
        leader_norm = normalize_url(leader['profile_url'])
        leader_slug = extract_slug(leader['profile_url'])
        leader_email = normalize_email(leader.get('email', ''))

        if seen_urls is not None and (leader_norm in seen_urls or leader_slug in seen_urls):
            log.info(f"  Leader already processed/skipped: {leader['name']} ({leader['profile_url']}) — skipping")
            return None
        if seen_emails is not None and leader_email and leader_email in seen_emails:
            log.info(f"  Leader email already processed: {leader['name']} ({leader_email}) — skipping")
            return None

        # Reload with the leader's individual page
        log.info(f"  Resolved leader → {leader['profile_url']}")
        ok = await safe_goto(page, leader["profile_url"], PROFILE_TIMEOUT)
        if not ok:
            return None
        await asyncio.sleep(1.5)

        # Merge: prefer pre-known data from the listing page for top-level fields
        agent = {
            "profile_url": leader["profile_url"],
            "name":  leader["name"]  or agent["name"],
            "email": leader["email"] or agent["email"],
            "phone": leader["phone"] or agent["phone"],
        }

    # ── Build lead object ──────────────────────────────────────────────────────
    lead                     = AgentLead()
    lead.Name                = agent["name"]
    lead.Email               = agent["email"]
    lead.Phone               = agent["phone"]
    lead.Compass_Profile_URL = agent["profile_url"]
    lead.City                = city
    lead.Page                = page_num

    # Designation (needed for Google search + output)
    lead.Designation = await get_designation(page)

    # Email fallback from profile body
    if not lead.Email:
        try:
            body = await page.inner_text("body")
            m    = re.search(
                r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", body
            )
            lead.Email = m.group(0) if m else ""
        except Exception:
            pass

    if not lead.Email:
        log.info(f"  SKIP (no email): {lead.Name}")
        return None

    # ── All links on profile page ──────────────────────────────────────────────
    all_links = await all_hrefs(page)

    # ── Listing count ──────────────────────────────────────────────────────────
    try:
        active_links = await page.eval_on_selector_all(
            '[data-tn="active-listings-section"] a[href*="homedetails"]',
            "els => [...new Set(els.map(e => e.href))]"
        )
    except Exception:
        active_links = []

    listing_count      = len(active_links)
    lead.Listing_Count = listing_count

    if debug:
        log.info(f"  DEBUG {lead.Name}: {listing_count} homedetails links found")

    if listing_count < MIN_LISTINGS:
        log.info(f"  SKIP (listings={listing_count}): {lead.Name}")
        return None

    # ── Social links: agent's own accounts (on-page) ──────────────────────────
    socials = [
        h for h in all_links
        if any(d in h for d in SOCIAL_DOMAINS)
        and not is_compass_social(h)
    ]
    socials = list(dict.fromkeys(socials))

    # ── Google social fallback REMOVED (v6) ─────────────────────────────────────
    # Google blocks automated searches.  We now just keep whatever is on the
    # Compass profile page and let the user/Comet handle deeper research.

    lead.Social_Links = " | ".join(socials)

    # ── Personal website ───────────────────────────────────────────────────────
    # Re-read all_links after potential navigation
    all_links = await all_hrefs(page)
    personal_sites = [h for h in all_links if is_personal_website(h)]
    lead.Website_URL = personal_sites[0] if personal_sites else ""

    log.info(
        f"  ✓ {lead.Name} | listings={listing_count} | "
        f"desig={lead.Designation!r} | "
        f"website={'yes' if lead.Website_URL else 'no'} | "
        f"socials={len(socials)}"
    )
    return lead


# ── CSV ───────────────────────────────────────────────────────────────────
def save_csv(leads: list[AgentLead], filename: str):
    if not leads:
        log.warning(f"No leads for {filename} — CSV not written.")
        return
    dirname = os.path.dirname(filename)
    if dirname:
        os.makedirs(dirname, exist_ok=True)
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[fld.name for fld in fields(AgentLead)])
        writer.writeheader()
        for lead in leads:
            writer.writerow(asdict(lead))
    log.info(f"Saved {len(leads)} leads → {filename}")


def has_links(lead: AgentLead) -> bool:
    """True if the lead has at least one website URL or social link."""
    return bool(lead.Website_URL.strip() or lead.Social_Links.strip())


def save_split_csvs(leads: list[AgentLead], base_name: str):
    """Split leads into two files: those with links and those without, ensuring zero duplicates."""
    clean_leads   = deduplicate_leads(leads)
    with_links    = [l for l in clean_leads if has_links(l)]
    without_links = [l for l in clean_leads if not has_links(l)]

    stem = base_name.rsplit(".", 1)[0] if "." in base_name else base_name

    file_a = f"{stem}_with_links.csv"
    file_b = f"{stem}_no_links.csv"

    save_csv(with_links,    file_a)
    save_csv(without_links, file_b)

    log.info(
        f"\n  Category A (with links):   {len(with_links)} leads → {file_a}"
        f"\n  Category B (no links):     {len(without_links)} leads → {file_b}"
    )


# ── HTML Lead Card Dashboard ──────────────────────────────────────────────────
HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pinova Outreach - Compass Leads Explorer</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            --bg-main: #f8fafc;
            --bg-card: #ffffff;
            --border-color: #e2e8f0;
            --border-hover: #cbd5e1;
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --text-muted: #94a3b8;
            --primary: #4f46e5;
            --primary-hover: #4338ca;
            --primary-light: #e0e7ff;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.08);
            --radius-sm: 8px;
            --radius-md: 12px;
            --radius-lg: 16px;
            --radius-full: 9999px;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--font-family);
            background-color: var(--bg-main);
            color: var(--text-primary);
            line-height: 1.5;
            padding: 2rem 1.5rem;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .logo-container {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .logo-icon {
            width: 2.5rem;
            height: 2.5rem;
            background: linear-gradient(135deg, var(--primary) 0%, #6366f1 100%);
            border-radius: var(--radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 800;
            font-size: 1.25rem;
            box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
        }

        .logo-text h1 {
            font-size: 1.5rem;
            font-weight: 800;
            color: var(--text-primary);
            letter-spacing: -0.025em;
        }

        .logo-text p {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 1.25rem;
            margin-bottom: 2.5rem;
        }

        .stat-card {
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: var(--shadow-sm);
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }

        .stat-icon {
            width: 3rem;
            height: 3rem;
            border-radius: var(--radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }

        .stat-icon.total { background-color: #eff6ff; color: #3b82f6; }
        .stat-icon.with-links { background-color: #f0fdf4; color: #22c55e; }
        .stat-icon.no-links { background-color: #fffbeb; color: #f59e0b; }

        .stat-info {
            display: flex;
            flex-direction: column;
        }

        .stat-value {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--text-primary);
            line-height: 1;
            margin-bottom: 0.25rem;
        }

        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .controls-bar {
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 1rem 1.25rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            gap: 1rem;
            flex-wrap: wrap;
            box-shadow: var(--shadow-sm);
        }

        .search-box {
            position: relative;
            flex: 1;
            min-width: 280px;
            max-width: 480px;
        }

        .search-icon {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            pointer-events: none;
            width: 1.25rem;
            height: 1.25rem;
        }

        .search-input {
            width: 100%;
            padding: 0.75rem 1rem 0.75rem 2.75rem;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            font-family: var(--font-family);
            font-size: 0.875rem;
            color: var(--text-primary);
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
            background-color: #fcfcfd;
        }

        .search-input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
            background-color: #fff;
        }

        .tabs {
            display: flex;
            gap: 0.5rem;
            background-color: #f1f5f9;
            padding: 0.25rem;
            border-radius: var(--radius-sm);
        }

        .tab-btn {
            border: none;
            background: transparent;
            padding: 0.5rem 1rem;
            font-family: var(--font-family);
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-secondary);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .tab-btn:hover {
            color: var(--text-primary);
        }

        .tab-btn.active {
            background-color: white;
            color: var(--primary);
            box-shadow: var(--shadow-sm);
        }

        .tab-count {
            background-color: #e2e8f0;
            color: var(--text-secondary);
            padding: 0.125rem 0.375rem;
            border-radius: var(--radius-full);
            font-size: 0.75rem;
            font-weight: 700;
        }

        .tab-btn.active .tab-count {
            background-color: var(--primary-light);
            color: var(--primary);
        }

        .agent-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .agent-card {
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 1.5rem;
            box-shadow: var(--shadow-sm);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s, border-color 0.25s;
            position: relative;
            overflow: hidden;
        }

        .agent-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
            border-color: var(--border-hover);
        }

        .card-header {
            display: flex;
            gap: 1rem;
            align-items: flex-start;
            margin-bottom: 1.25rem;
        }

        .avatar {
            width: 3.5rem;
            height: 3.5rem;
            border-radius: var(--radius-full);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 1.25rem;
            flex-shrink: 0;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .agent-meta {
            flex: 1;
            min-width: 0;
        }

        .agent-name {
            font-size: 1.125rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 0.125rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .agent-designation {
            font-size: 0.8125rem;
            color: var(--text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 0.5rem;
        }

        .badges-container {
            display: flex;
            flex-wrap: wrap;
            gap: 0.375rem;
        }

        .badge {
            font-size: 0.75rem;
            font-weight: 700;
            padding: 0.25rem 0.625rem;
            border-radius: var(--radius-full);
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
        }

        .badge-listings {
            background-color: #f0fdf4;
            color: #15803d;
            border: 1px solid #dcfce7;
        }



        .badge-city {
            background-color: #f0f9ff;
            color: #0369a1;
            border: 1px solid #e0f2fe;
        }

        .badge-page {
            background-color: #faf5ff;
            color: #7e22ce;
            border: 1px solid #f3e8ff;
        }

        .card-body {
            padding: 0.75rem 0;
            border-top: 1px solid #f1f5f9;
            border-bottom: 1px solid #f1f5f9;
            margin-bottom: 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .contact-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: var(--text-secondary);
            text-decoration: none;
            transition: color 0.15s;
        }

        .contact-row:hover {
            color: var(--primary);
        }

        .contact-icon {
            width: 1rem;
            height: 1rem;
            color: var(--text-muted);
            flex-shrink: 0;
        }

        .card-footer {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .actions-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.375rem;
            padding: 0.625rem;
            font-family: var(--font-family);
            font-size: 0.8125rem;
            font-weight: 600;
            border-radius: var(--radius-sm);
            cursor: pointer;
            text-decoration: none;
            transition: all 0.15s;
            border: 1px solid transparent;
        }

        .btn-primary {
            background-color: var(--primary);
            color: white;
        }

        .btn-primary:hover {
            background-color: var(--primary-hover);
        }

        .btn-primary.disabled {
            background-color: #f1f5f9;
            color: var(--text-muted);
            border-color: #e2e8f0;
            cursor: not-allowed;
            pointer-events: none;
        }

        .btn-secondary {
            background-color: white;
            border-color: var(--border-color);
            color: var(--text-secondary);
        }

        .btn-secondary:hover {
            border-color: var(--border-hover);
            color: var(--text-primary);
            background-color: #f8fafc;
        }

        .socials-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-wrap: wrap;
            min-height: 2rem;
        }

        .social-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-muted);
            margin-right: 0.25rem;
        }

        .social-link {
            width: 2rem;
            height: 2rem;
            border-radius: var(--radius-full);
            background-color: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
            transition: all 0.2s;
            text-decoration: none;
            border: 1px solid #e2e8f0;
        }

        .social-link:hover {
            transform: scale(1.1);
            color: white;
        }

        .social-link.instagram:hover { background-color: #e1306c; border-color: #e1306c; }
        .social-link.linkedin:hover { background-color: #0077b5; border-color: #0077b5; }
        .social-link.facebook:hover { background-color: #1877f2; border-color: #1877f2; }
        .social-link.twitter:hover { background-color: #000000; border-color: #000000; }
        .social-link.youtube:hover { background-color: #ff0000; border-color: #ff0000; }
        .social-link.tiktok:hover { background-color: #010101; border-color: #010101; }
        .social-link.default:hover { background-color: var(--primary); border-color: var(--primary); }

        .copy-btn {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            width: 1.75rem;
            height: 1.75rem;
            background-color: white;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--text-muted);
            transition: all 0.15s;
            opacity: 0;
            z-index: 10;
        }

        .agent-card:hover .copy-btn {
            opacity: 1;
        }

        .copy-btn:hover {
            color: var(--primary);
            border-color: var(--primary-light);
            background-color: var(--primary-light);
        }

        .no-results {
            grid-column: 1 / -1;
            background-color: var(--bg-card);
            border: 1px dashed var(--border-color);
            border-radius: var(--radius-lg);
            padding: 4rem 2rem;
            text-align: center;
            color: var(--text-secondary);
        }

        .no-results-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            display: block;
        }

        .toast {
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background-color: var(--text-primary);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: var(--radius-full);
            font-size: 0.875rem;
            font-weight: 600;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            z-index: 1000;
        }

        .toast.show {
            transform: translateX(-50%) translateY(0);
        }

        /* Pagination Styles */
        .pagination-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border-color);
            flex-wrap: wrap;
            gap: 1rem;
        }

        .pagination-info {
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .pagination-controls {
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        .page-btn {
            border: 1px solid var(--border-color);
            background-color: white;
            color: var(--text-secondary);
            padding: 0.5rem 0.875rem;
            font-family: var(--font-family);
            font-size: 0.875rem;
            font-weight: 600;
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .page-btn:hover:not(:disabled) {
            border-color: var(--border-hover);
            color: var(--text-primary);
            background-color: #f8fafc;
        }

        .page-btn.active {
            background-color: var(--primary);
            color: white;
            border-color: var(--primary);
            box-shadow: var(--shadow-sm);
        }

        .page-btn:disabled {
            color: var(--text-muted);
            background-color: #f1f5f9;
            border-color: #e2e8f0;
            cursor: not-allowed;
        }

        .page-dots {
            padding: 0 0.5rem;
            color: var(--text-muted);
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-container">
                <div class="logo-icon">P</div>
                <div class="logo-text">
                    <h1>Pinova Outreach</h1>
                    <p>Compass Agent Directory Explorer</p>
                </div>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon total">🏡</div>
                <div class="stat-info">
                    <span id="stat-total-val" class="stat-value">0</span>
                    <span class="stat-label">Total Prospects</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon with-links">🔗</div>
                <div class="stat-info">
                    <span id="stat-with-links-val" class="stat-value">0</span>
                    <span class="stat-label">Has Website/Socials (Cat A)</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon no-links">❓</div>
                <div class="stat-info">
                    <span id="stat-no-links-val" class="stat-value">0</span>
                    <span class="stat-label">No Links (Cat B)</span>
                </div>
            </div>
        </div>
        
        <div class="controls-bar">
            <div class="tabs">
                <button class="tab-btn active" onclick="switchTab('all')">
                    All Leads <span id="count-all" class="tab-count">0</span>
                </button>
                <button class="tab-btn" onclick="switchTab('with-links')">
                    Category A: Has Links <span id="count-with-links" class="tab-count">0</span>
                </button>
                <button class="tab-btn" onclick="switchTab('no-links')">
                    Category B: No Links <span id="count-no-links" class="tab-count">0</span>
                </button>
            </div>
            
            <div class="search-box">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" id="searchInput" class="search-input" placeholder="Search by name, designation, email..." oninput="handleSearch(this.value)">
            </div>
        </div>
        
        <div id="agentGrid" class="agent-grid"></div>

        <!-- Pagination Controls -->
        <div id="paginationContainer" class="pagination-container" style="display: none;">
            <div id="paginationInfo" class="pagination-info">Showing 0-0 of 0 prospects</div>
            <div id="paginationControls" class="pagination-controls"></div>
        </div>
    </div>
    
    <div id="toast" class="toast">Agent details copied to clipboard!</div>

    <script>
        const leadsData = __LEADS_JSON__;
        
        const gradients = [
            'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)',
            'linear-gradient(135deg, #F6D365 0%, #FDA085 100%)',
            'linear-gradient(135deg, #A1C4FD 0%, #C2E9FB 100%)',
            'linear-gradient(135deg, #76B2FE 0%, #B2D8FF 100%)',
            'linear-gradient(135deg, #E0C3FC 0%, #8EC5FC 100%)',
            'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)',
            'linear-gradient(135deg, #5EEAD4 0%, #14B8A6 100%)',
            'linear-gradient(135deg, #FDBA74 0%, #F97316 100%)',
            'linear-gradient(135deg, #C084FC 0%, #A855F7 100%)',
            'linear-gradient(135deg, #93C5FD 0%, #3B82F6 100%)'
        ];

        function getGradient(name) {
            let hash = 0;
            for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
            }
            const idx = Math.abs(hash) % gradients.length;
            return gradients[idx];
        }

        function getInitials(name) {
            if (!name) return 'A';
            const parts = name.trim().split(/\s+/);
            if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            return name[0].toUpperCase();
        }

        function getPlatformName(url) {
            const urlLower = url.toLowerCase();
            if (urlLower.includes('instagram.com')) return 'instagram';
            if (urlLower.includes('linkedin.com')) return 'linkedin';
            if (urlLower.includes('facebook.com')) return 'facebook';
            if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
            if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
            if (urlLower.includes('tiktok.com')) return 'tiktok';
            return 'default';
        }



        function getSocialIconSvg(platform) {
            const svgs = {
                instagram: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>',
                linkedin: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>',
                facebook: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>',
                twitter: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z M4 20l6.768 -6.768 M20 4l-6.768 6.768"></path></svg>',
                youtube: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>',
                tiktok: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>',
                default: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>'
            };
            return svgs[platform] || svgs.default;
        }

        let activeTab = 'all';
        let searchQuery = '';
        let currentPage = 1;
        const itemsPerPage = 10;

        function renderLeads() {
            const grid = document.getElementById('agentGrid');
            grid.innerHTML = '';
            
            let filtered = leadsData.filter(lead => {
                if (activeTab === 'with-links' && !lead.has_links) return false;
                if (activeTab === 'no-links' && lead.has_links) return false;
                
                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    const nameMatch = lead.name.toLowerCase().includes(q);
                    const desigMatch = (lead.designation || '').toLowerCase().includes(q);
                    const emailMatch = (lead.email || '').toLowerCase().includes(q);
                    const cityMatch = (lead.city || '').toLowerCase().includes(q);
                    const pageMatch = String(lead.page || '').includes(q);
                    return nameMatch || desigMatch || emailMatch || cityMatch || pageMatch;
                }
                return true;
            });
            
            const allCount = leadsData.length;
            const withLinksCount = leadsData.filter(l => l.has_links).length;
            const noLinksCount = allCount - withLinksCount;
            
            document.getElementById('count-all').innerText = allCount;
            document.getElementById('count-with-links').innerText = withLinksCount;
            document.getElementById('count-no-links').innerText = noLinksCount;
            
            document.getElementById('stat-total-val').innerText = allCount;
            document.getElementById('stat-with-links-val').innerText = withLinksCount;
            document.getElementById('stat-no-links-val').innerText = noLinksCount;
            
            const totalItems = filtered.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            
            if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
            
            const startIdx = (currentPage - 1) * itemsPerPage;
            const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
            
            if (totalItems === 0) {
                grid.innerHTML = `
                    <div class="no-results">
                        <span class="no-results-icon">🔍</span>
                        <h3>No prospects found</h3>
                        <p>Try adjusting your filters or search keywords.</p>
                    </div>
                `;
                document.getElementById('paginationContainer').style.display = 'none';
                return;
            } else {
                document.getElementById('paginationContainer').style.display = 'flex';
                document.getElementById('paginationInfo').innerText = `Showing ${startIdx + 1}-${endIdx} of ${totalItems} prospects`;
            }
            
            const pageData = filtered.slice(startIdx, endIdx);
            
            pageData.forEach(lead => {
                const initials = getInitials(lead.name);
                const gradient = getGradient(lead.name);
                
                let webButtonHtml = '';
                if (lead.website) {
                    webButtonHtml = `<a href="${lead.website}" target="_blank" class="btn btn-primary">Website</a>`;
                } else {
                    webButtonHtml = `<button class="btn btn-primary disabled" disabled>No Website</button>`;
                }
                
                let socialsHtml = '';
                if (lead.socials && lead.socials.length > 0) {
                    socialsHtml += `<span class="social-label">Socials:</span>`;
                    lead.socials.forEach(url => {
                        const platform = getPlatformName(url);
                        const iconSvg = getSocialIconSvg(platform);
                        socialsHtml += `
                            <a href="${url}" target="_blank" class="social-link ${platform}" title="${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${url}">
                                ${iconSvg}
                            </a>
                        `;
                    });
                } else {
                    socialsHtml = `<span class="social-label" style="color: #94a3b8;">No socials on Compass</span>`;
                }
                
                const card = document.createElement('div');
                card.className = 'agent-card';
                card.style.cursor = 'pointer';
                card.onclick = (e) => {
                    if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.copy-btn')) {
                        return;
                    }
                    window.open(lead.compass, '_blank');
                };
                
                card.innerHTML = `
                    <button class="copy-btn" onclick="copyAgentInfo(${lead.id}, event)" title="Copy agent info">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    <div class="card-header">
                        <div class="avatar" style="background: ${gradient}">${initials}</div>
                        <div class="agent-meta">
                            <div class="agent-name" title="${lead.name}">${lead.name}</div>
                            <div class="agent-designation" title="${lead.designation || 'Real Estate Agent'}">${lead.designation || 'Real Estate Agent'}</div>
                            <div class="badges-container">
                                <span class="badge badge-listings">🏡 ${lead.listings} Listings</span>
                                ${lead.city ? `<span class="badge badge-city">📍 ${lead.city}</span>` : ''}
                                ${lead.page ? `<span class="badge badge-page">📄 Page ${lead.page}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        ${lead.email ? `
                        <a href="mailto:${lead.email}" class="contact-row">
                            <svg class="contact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            <span>${lead.email}</span>
                        </a>` : ''}
                        ${lead.phone ? `
                        <a href="tel:${lead.phone}" class="contact-row">
                            <svg class="contact-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            <span>${lead.phone}</span>
                        </a>` : ''}
                    </div>
                    <div class="card-footer">
                        <div class="actions-row">
                            <a href="${lead.compass}" target="_blank" class="btn btn-secondary">Compass Profile</a>
                            ${webButtonHtml}
                        </div>
                        <div class="socials-row">
                            ${socialsHtml}
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
            
            renderPaginationControls(totalPages);
        }

        function switchTab(tabName) {
            activeTab = tabName;
            const buttons = document.querySelectorAll('.tab-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            
            const activeBtn = Array.from(buttons).find(btn => btn.getAttribute('onclick').includes(tabName));
            if (activeBtn) activeBtn.classList.add('active');
            
            currentPage = 1;
            renderLeads();
        }

        function handleSearch(val) {
            searchQuery = val;
            currentPage = 1;
            renderLeads();
        }

        function renderPaginationControls(totalPages) {
            const controls = document.getElementById('paginationControls');
            controls.innerHTML = '';
            
            if (totalPages <= 1) {
                document.getElementById('paginationContainer').style.display = 'none';
                return;
            } else {
                document.getElementById('paginationContainer').style.display = 'flex';
            }
            
            // Prev Button
            const prevBtn = document.createElement('button');
            prevBtn.className = 'page-btn';
            prevBtn.innerHTML = '&larr; Prev';
            prevBtn.disabled = currentPage === 1;
            prevBtn.onclick = () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderLeads();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            };
            controls.appendChild(prevBtn);
            
            // Smart visible buttons logic
            const maxVisible = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
            let endPage = Math.min(totalPages, startPage + maxVisible - 1);
            
            if (endPage - startPage + 1 < maxVisible) {
                startPage = Math.max(1, endPage - maxVisible + 1);
            }
            
            if (startPage > 1) {
                const firstBtn = document.createElement('button');
                firstBtn.className = 'page-btn';
                firstBtn.innerText = '1';
                firstBtn.onclick = () => { currentPage = 1; renderLeads(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
                controls.appendChild(firstBtn);
                
                if (startPage > 2) {
                    const dots = document.createElement('span');
                    dots.className = 'page-dots';
                    dots.innerText = '...';
                    controls.appendChild(dots);
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const btn = document.createElement('button');
                btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
                btn.innerText = i;
                btn.onclick = () => {
                    currentPage = i;
                    renderLeads();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                };
                controls.appendChild(btn);
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    const dots = document.createElement('span');
                    dots.className = 'page-dots';
                    dots.innerText = '...';
                    controls.appendChild(dots);
                }
                
                const lastBtn = document.createElement('button');
                lastBtn.className = 'page-btn';
                lastBtn.innerText = totalPages;
                lastBtn.onclick = () => { currentPage = totalPages; renderLeads(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
                controls.appendChild(lastBtn);
            }
            
            // Next Button
            const nextBtn = document.createElement('button');
            nextBtn.className = 'page-btn';
            nextBtn.innerHTML = 'Next &rarr;';
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.onclick = () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderLeads();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            };
            controls.appendChild(nextBtn);
        }

        function copyAgentInfo(id, event) {
            const lead = leadsData.find(l => l.id === id);
            if (!lead) return;
            
            const text = lead.name + '\n' + 
                         (lead.designation || 'Real Estate Agent') + '\n' +
                         'Email: ' + (lead.email || 'None') + '\n' +
                         'Phone: ' + (lead.phone || 'None') + '\n' +
                         'Website: ' + (lead.website || 'None') + '\n' +
                         'Compass: ' + lead.compass;
                         
            const btn = event.currentTarget;
            
            navigator.clipboard.writeText(text).then(() => {
                showToast('Agent details copied to clipboard!');
                const originalSvg = btn.innerHTML;
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                setTimeout(() => { btn.innerHTML = originalSvg; }, 2000);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        }

        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.innerText = message;
            toast.classList.add('show');
            setTimeout(() => { toast.classList.remove('show'); }, 3000);
        }

        window.addEventListener('DOMContentLoaded', () => {
            renderLeads();
        });
    </script>
</body>
</html>
"""


def save_html(leads: list[AgentLead], filename: str):
    import json
    
    leads_json = []
    for idx, lead in enumerate(leads):
        has_site = bool(lead.Website_URL.strip())
        socials_list = [s.strip() for s in lead.Social_Links.split("|") if s.strip()]
        has_any_links = has_site or len(socials_list) > 0
        
        leads_json.append({
            "id": idx,
            "name": lead.Name,
            "email": lead.Email,
            "phone": lead.Phone,
            "listings": lead.Listing_Count,
            "website": lead.Website_URL,
            "compass": lead.Compass_Profile_URL,
            "designation": lead.Designation,
            "city": lead.City,
            "page": lead.Page,
            "socials": socials_list,
            "has_links": has_any_links
        })
        
    json_data_str = json.dumps(leads_json, indent=2)
    html_content = HTML_TEMPLATE.replace("__LEADS_JSON__", json_data_str)
    
    dirname = os.path.dirname(filename)
    if dirname:
        os.makedirs(dirname, exist_ok=True)
    with open(filename, "w", encoding="utf-8") as f:
        f.write(html_content)
    log.info(f"Saved {len(leads)} leads to HTML dashboard → {filename}")


async def process_agent_task(
    agent: dict,
    context,
    city: str,
    page_num: int,
    debug: bool,
    sem: asyncio.Semaphore,
    save_lock: asyncio.Lock,
    disk_seen_urls: set[str],
    disk_seen_emails: set[str],
    leads: list[AgentLead],
    output: str,
):
    async with sem:
        page = await context.new_page()
        try:
            # Only pass disk_seen sets to enrich_profile — these are used for
            # team-leader duplicate checks against previously saved files.
            # We do NOT pass in_flight sets here because the agent's own
            # URL/email was pre-registered there by main() and would cause
            # self-rejection.
            lead = await enrich_profile(
                page, agent, city=city, page_num=page_num,
                seen_urls=disk_seen_urls, seen_emails=disk_seen_emails, debug=debug
            )
            
            if lead:
                resolved_norm = normalize_url(lead.Compass_Profile_URL)
                resolved_slug = extract_slug(lead.Compass_Profile_URL)
                resolved_email = normalize_email(lead.Email)
                
                async with save_lock:
                    # Check against disk (previously saved files)
                    is_dup = (resolved_norm in disk_seen_urls or
                              resolved_slug in disk_seen_urls or
                              (resolved_email and resolved_email in disk_seen_emails))
                    
                    # Check against leads already collected in THIS run
                    if not is_dup:
                        for existing in leads:
                            ex_norm = normalize_url(existing.Compass_Profile_URL)
                            ex_slug = extract_slug(existing.Compass_Profile_URL)
                            ex_email = normalize_email(existing.Email)
                            if ex_norm == resolved_norm or ex_slug == resolved_slug:
                                is_dup = True
                                break
                            if resolved_email and ex_email == resolved_email:
                                is_dup = True
                                break
                    
                    if is_dup:
                        log.info(f"  DUPLICATE PREVENTED: {lead.Name} ({lead.Email} / {lead.Compass_Profile_URL})")
                    else:
                        leads.append(lead)
                        if len(leads) % 10 == 0:
                            save_csv(leads, output)
        except Exception as e:
            log.error(f"Error processing agent {agent.get('name', 'Unknown')}: {e}")
        finally:
            await page.close()


# ── Main ──────────────────────────────────────────────────────────────────────
async def main(location: str, start_page: int, end_page: int, output: str, concurrency: int, debug: bool):
    leads: list[AgentLead] = []
    page_num = start_page
    city = extract_city(location)

    # 1. Load already-scraped agents from ALL CSV files on disk
    disk_seen_urls, disk_seen_emails = load_existing_prospects()

    # Track which agents have been queued in THIS run to prevent
    # the same agent from being queued again on a later page.
    # This is separate from disk_seen and is NOT passed to enrich_profile.
    queued_urls = set()

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=HEADLESS)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
        )
        list_page = await context.new_page()
        await list_page.route("**/*", block_unnecessary_resources)

        save_lock = asyncio.Lock()
        sem = asyncio.Semaphore(concurrency)

        while True:
            listing_url = BASE_URL.format(location=location, page=page_num)
            log.info(f"\n══ PAGE {page_num} ══  {listing_url}")

            agents = await get_agents_from_listing_page(list_page, listing_url, debug=debug)
            if not agents:
                log.info("No agents — done.")
                break

            # Filter out already-scraped and already-queued agents
            unseen_agents = []
            for agent in agents:
                norm_url = normalize_url(agent["profile_url"])
                slug = extract_slug(agent["profile_url"])
                norm_email = normalize_email(agent.get("email", ""))

                if norm_url in disk_seen_urls or slug in disk_seen_urls or (norm_email and norm_email in disk_seen_emails):
                    log.info(f"  Skipping pre-scraped agent (from disk): {agent['name']} ({agent['profile_url']})")
                elif norm_url in queued_urls or slug in queued_urls:
                    log.info(f"  Skipping duplicate agent in current run: {agent['name']} ({agent['profile_url']})")
                else:
                    unseen_agents.append(agent)
                    # Mark as queued so the same agent on a later page won't be re-queued
                    queued_urls.add(norm_url)
                    if slug:
                        queued_urls.add(slug)

            if unseen_agents:
                log.info(f"Scraping {len(unseen_agents)} unseen agents concurrently...")
                tasks = [
                    process_agent_task(
                        agent, context, city, page_num, debug, sem, save_lock,
                        disk_seen_urls, disk_seen_emails,
                        leads, output
                    )
                    for agent in unseen_agents
                ]
                await asyncio.gather(*tasks)
            else:
                log.info("All agents on this page were already processed.")

            page_num += 1
            if end_page and page_num > end_page:
                log.info(f"Reached page limit ({end_page}).")
                break
            await asyncio.sleep(2)

        await browser.close()

    # Deduplicate leads array before final export
    leads = deduplicate_leads(leads)

    # ── Final save: split into two category files and HTML dashboard ──────────
    save_split_csvs(leads, output)
    
    html_output = output.rsplit(".", 1)[0] + ".html" if "." in output else output + ".html"
    save_html(leads, html_output)
    
    log.info(f"\nDone. {len(leads)} total qualified leads.")


# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compass Agent Scraper v6")
    parser.add_argument("--location",   default="laguna-beach-ca/12980")
    parser.add_argument("--start-page", type=int, default=1)
    parser.add_argument("--end-page",   type=int, default=6)
    parser.add_argument("--output",     default="prospects/compass_leads_laguna-beach-ca_batch_01.csv",
                        help="Base filename. Produces <name>_with_links.csv, <name>_no_links.csv, and <name>.html")
    parser.add_argument("--concurrency", type=int, default=5,
                        help="Number of concurrent profile pages to load at once.")
    parser.add_argument("--debug",      action="store_true")
    args = parser.parse_args()

    asyncio.run(main(
        location    = args.location,
        start_page  = args.start_page,
        end_page    = args.end_page,
        output      = args.output,
        concurrency = args.concurrency,
        debug       = args.debug,
    ))