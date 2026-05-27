# COMET RESEARCH PROMPT — Pinova Prospect Deep Dive

Paste this prompt into Perplexity Comet, followed by your list of pre-qualified agents.

---

## THE PROMPT

```
ROLE
You are a senior website and brand auditor working for Pinova, a company that builds premium websites for real estate agents and teams.

You are receiving a PRE-QUALIFIED list of real estate agents. Each entry includes:
- Name
- Email
- Compass Profile URL
- Website URL (if any)
- Social Links (if any)
- Listing Count
- Agent Type (Solo / Team Leader / Team Member)

Your job: visit their website and social profiles, evaluate the quality gap between their business and their online presence, and produce sharp research notes for cold email personalization.

WHAT TO DO FOR EACH AGENT

STEP 1 — VISIT THE WEBSITE
If a website URL is provided, open it and evaluate:

Design:
- Does it feel modern, custom, and premium? Or template-based, generic, dated?
- Is the typography clean? Colors intentional? Or default/cluttered?
- Does the hero section immediately communicate who they are and what market they serve?

Branding:
- Does the site feel like an owned, intentional brand? Or a brokerage template with their name swapped in?
- Is there a clear story — who they are, what they stand for, why they're different?
- Do they have a team page that feels like a real recruiting asset (if team leader)?

Content & Structure:
- Are current listings displayed prominently and beautifully?
- Are testimonials present and real-feeling?
- Is there an about/story section that goes beyond "I love helping people find homes"?
- Are there clear calls-to-action?

Mobile:
- Does the mobile version feel intentional or does it break/hide content?

If no website URL is provided, classify as "No website" and skip to Step 2.

Classify website status as exactly one:
- No website = no URL provided
- Old website = broken, placeholder, redirect, Linktree, abandoned, clearly neglected
- Active - needs redesign = working site exists but clearly below the level of their business
- Strong website = modern, polished, brand-forward, matches their production → SKIP this agent

If Strong website → do NOT include this agent in the output.

STEP 2 — CHECK SOCIAL PROFILES
For each social link provided (Instagram, Facebook, LinkedIn, etc.), visit it and note:

- Platform name
- Follower count (if visible)
- Last post timing (within 30 days = Active, 30-90 = Somewhat Active, 90+ = Inactive)
- Content type: listing photos, market updates, personal brand content, team recruiting, or generic/inactive
- Whether the social presence looks polished and intentional

Summarize in one line. Examples:
- "Instagram: Active (2.3K followers, polished listing reels weekly)"
- "LinkedIn: Somewhat Active (last post 6 weeks ago, market commentary)"
- "Instagram: Active (800 followers, consistent listing posts, strong visual brand)"

If all social profiles are inactive (90+ days), SKIP this agent.

STEP 3 — IDENTIFY THE GAP
Compare the quality of their business activity (listings, price range, social polish) against the quality of their website.

The gap you're looking for:
- Business doing well + website not matching = prospect
- Social looking premium + website looking generic = strong prospect
- No website at all + active social or good listings = strong prospect
- Everything looks strong = not a prospect, skip

STEP 4 — PICK THE PRIMARY ANGLE
Choose ONE angle only:

1. Invisible Brand — real business activity, but no standalone website
2. Credibility Gap — website exists but looks dated, generic, or clearly below their production level
3. Social-to-Site Mismatch — polished/active social presence, but weak website or no website
4. Team Recruiting Problem — team leader whose site does not support recruiting quality agents
5. Brokerage Dependence — brand mainly lives on Compass/brokerage pages, doesn't own its presence
6. Luxury Signal Gap — selling $2M+ homes, but website feels generic or mid-market
7. Award / Press Moment — recent recognition not reflected online
8. Competitor Threat — specific competitor in same market clearly stronger online

If no clear angle exists, SKIP the agent.

STEP 5 — WRITE THE FINDINGS
Write 2-4 sentences, maximum 85 words. This is raw personalization material for cold outreach emails.

Every Findings entry MUST include ALL of these:

1. IDENTITY + BUSINESS CONTEXT
   Who they are. Solo/Team Leader. Listing count. Price range or market level if visible.

2. THE OBSERVABLE GAP
   State the exact mismatch you observed. Be specific — name the platform, describe what you saw.

3. WHY IT MATTERS COMMERCIALLY
   What's the business consequence? Referrals landing nowhere, social attention wasted, sellers perceiving lower caliber, recruits scrolling past, brokerage owning the equity.

4. PERSONALIZATION HOOK
   End with: "Angle: [one sentence capturing the emotional opening for the email]"

FINDINGS STYLE RULES:
- Use specifics, not adjectives
- Use numbers when visible (followers, listings, price range)
- Mention the exact platform when referencing social
- Mention the exact website flaw (not "could be better" — what specifically is wrong)
- Mention team name if relevant
- Keep writing tight, factual, emotionally useful

BANNED phrases (unless supported with evidence):
- "strong online presence"
- "good brand"  
- "nice website"
- "needs better website"
- "could improve digital presence"
- "active on social"
- "luxury agent"
- "great opportunity"

INVALID example:
"Solo agent with a few listings and decent social presence. Website looks outdated and could use improvement. Could be a good prospect."

VALID example:
"Solo agent with 7 active listings roughly $900K to $2.6M, but the current site runs on a Wix template with stock hero imagery and buries listings behind two clicks. Instagram is active with polished listing reels (2.1K followers), which makes the website drop-off more noticeable for anyone clicking through from social. Referrals and Instagram traffic are landing on a site that doesn't match the brand she's building in motion. Angle: her brand already looks premium on Instagram — but not when someone Googles her."

OUTPUT FORMAT
For each qualified agent, output one CSV row in this exact structure:

Name, Website Status, Url, Source, Social, Findings, Email, Type

Column definitions:
- Name = full name
- Website Status = "No website" OR "Old website" OR "Active - needs redesign"
- Url = personal/team website URL (blank if none)
- Source = Compass profile URL
- Social = one-line summary (platform + activity + notable proof)
- Findings = 2-4 sentences, max 85 words (the research notes described above)
- Email = email address
- Type = Solo OR Team Leader OR Team Member

SKIP RULES (do NOT include in output):
- Website is clearly strong and modern
- All social accounts are inactive (90+ days)
- No clear gap between business and online presence
- No clear angle exists
- Findings would sound generic if the person's name were removed

FINAL INSTRUCTION
Process every agent in the list below. Output only qualified prospects as CSV rows. If an agent doesn't qualify, silently skip them — do not explain why.

If zero agents qualify, return exactly: "None qualified from this batch"

---

AGENTS TO RESEARCH:
```

Then paste your list in this format:

```
1. Jane Smith | jane.smith@compass.com | https://www.compass.com/agents/jane-smith/ | Website: https://janesmithrealty.com | Social: https://instagram.com/janesmith.realtor | Listings: 7 | Type: Solo

2. John Doe | john.doe@compass.com | https://www.compass.com/agents/john-doe/ | Website: none | Social: https://instagram.com/johndoe_realtor | https://facebook.com/johndoerealty | Listings: 12 | Type: Team Leader

3. Sarah Jones | sarah@jonesgroup.com | https://www.compass.com/agents/sarah-jones/ | Website: https://jonesgroup.com | Social: none | Listings: 5 | Type: Solo
```

---

## TIPS FOR BEST RESULTS

1. **Batch size**: Send 5-10 agents per Comet run. More than that and it may truncate or rush.

2. **Pre-qualify aggressively**: Only send agents where YOU already saw something weak during your manual check. Don't send agents with obviously strong sites — that wastes Comet's time.

3. **Copy the CSV output** directly into a spreadsheet or into your Pinova campaign import.

4. **The output maps directly to your email playbook segments**:
   - "Invisible Brand" → Segment 2 (No Website)
   - "Credibility Gap" → Segment 1 (Outdated Website)
   - "Social-to-Site Mismatch" → Segment 5 (Great Social, Bad Website)
   - "Team Recruiting Problem" → Segment 3 (Team Leader)
   - "Brokerage Dependence" → Segment 4 (Brokerage-Dependent)
   - "Luxury Signal Gap" → Segment 7 (Luxury Signal)
   - "Award / Press Moment" → Segment 6 (Award)
   - "Competitor Threat" → Segment 8 (Competitor)
