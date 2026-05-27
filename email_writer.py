import csv

prospects = [
    {
        "firstname": "Cathy",
        "lastname": "Fassero",
        "email": "cathy.fassero@compass.com",
        "company": "Compass",
        "linkedin": "",
        "instagram": "https://www.instagram.com/cfassero/",
        "facebook": "",
        "website": "https://www.cathyfassero.com/ - basic green-logo template, doesn't match $10M+ luxury production",
        "phone": "",
        "zillow": "https://www.compass.com/agents/cathy-fassero/",
        "segment": "luxury_outdated",  # Segment 7 / Segment 1
        "notes": "Solo Scottsdale agent, Sports & Entertainment Division, sales up to $10.5M, multiple $2M-$6M deals. Personal site is a basic template. Active Instagram 505 posts 1319 followers, Linktree in bio. Market: Scottsdale."
    },
    {
        "firstname": "Jennifer",
        "lastname": "Felker",
        "email": "jennifer.felker@compass.com",
        "company": "Compass / The Felker Group",
        "linkedin": "",
        "instagram": "https://www.instagram.com/jenfelkerrealtor/",
        "facebook": "",
        "website": "https://www.jenfelker.com/ - Compass Launch-hosted template, not independently owned",
        "phone": "",
        "zillow": "https://www.compass.com/agents/jennifer-felker/",
        "segment": "team_brokerage_dependent",
        "notes": "Team leader, The Felker Group. Scottsdale/East Valley luxury, 20+ years, listings up to $5.5M. Site is a Compass Launch template - not owned. Instagram link dead. Market: Scottsdale."
    },
    {
        "firstname": "Daren",
        "lastname": "Freeman",
        "email": "daren.freeman@compass.com",
        "company": "Compass",
        "linkedin": "",
        "instagram": "https://www.instagram.com/darendoesrealestate/",
        "facebook": "https://www.facebook.com/daren.freeman/",
        "website": "No Website - only Compass profile and Linktree in bio",
        "phone": "",
        "zillow": "https://www.compass.com/agents/daren-freeman/",
        "segment": "no_website_mismatch",  # Segment 2 + 5
        "notes": "Solo Scottsdale/Colorado agent. 1010 Instagram posts, dual-market AZ & CO, listings up to $2.8M. Zero personal website - only Compass profile and Linktree. Market: Scottsdale."
    },
    {
        "firstname": "Heather",
        "lastname": "Lacour Gagne",
        "email": "heather.gagne@compass.com",
        "company": "Compass / Sports & Entertainment Division",
        "linkedin": "",
        "instagram": "https://www.instagram.com/hgagne7/",
        "facebook": "",
        "website": "No Website - Compass profile only, website field pointed to own Instagram",
        "phone": "",
        "zillow": "https://www.compass.com/agents/heather-gagne/",
        "segment": "no_website",
        "notes": "Business partner of Cathy Fassero, Sports & Entertainment Division. Transactions $2.2M to $10.5M. Instagram 339 posts 693 followers. Zero owned web presence. Market: Scottsdale."
    },
    {
        "firstname": "Lauren",
        "lastname": "Gallegos",
        "email": "Lauren.gallegos@compass.com",
        "company": "Compass",
        "linkedin": "",
        "instagram": "https://www.instagram.com/_laurengallegosazrealtor/",
        "facebook": "",
        "website": "No Website - Linktree IS her website (https://linktr.ee/_laurengallegosazrealtor)",
        "phone": "",
        "zillow": "https://www.compass.com/agents/lauren-gallegos/",
        "segment": "mismatch_strong_social",
        "notes": "Solo Scottsdale/East Valley agent. 9710 Instagram followers, 327 posts, $15M production milestone on Instagram. No standalone website - Linktree is her entire web destination. Market: Scottsdale."
    },
    {
        "firstname": "Neil",
        "lastname": "Gatten",
        "email": "neil.gatten@compass.com",
        "company": "Compass",
        "linkedin": "",
        "instagram": "",
        "facebook": "",
        "website": "https://www.neilsellsaz.com/ - Compass-hosted template, bikers-in-a-field stock photo, no luxury feel",
        "phone": "",
        "zillow": "https://www.compass.com/agents/neil-gatten/",
        "segment": "luxury_outdated",
        "notes": "Solo Paradise Valley/Scottsdale agent. Current listing $9.675M, past sales up to $9.1M. Site is a Compass template with outdoor stock photo - no luxury feel. No social media found. Market: Paradise Valley."
    },
    {
        "firstname": "Aimee",
        "lastname": "Groeschner",
        "email": "aimee.groeschner@compass.com",
        "company": "Compass / Professional Athlete Division",
        "linkedin": "",
        "instagram": "https://www.instagram.com/aimeeg_azrealtor/",
        "facebook": "https://www.facebook.com/p/Aimee-Groeschner-AZ-Realtor-100090628144625/",
        "website": "No Website - Instagram bio links to ALS fundraiser, not a professional site",
        "phone": "",
        "zillow": "https://www.compass.com/agents/aimee-groeschner/",
        "segment": "no_website",
        "notes": "Solo Phoenix/Scottsdale relocation specialist, Compass Professional Athlete Division, 25+ years AZ expertise. Instagram 2201 followers 406 posts. Bio link goes to ALS fundraiser. Market: Phoenix/Scottsdale."
    },
    {
        "firstname": "Shelley",
        "lastname": "Hubbard",
        "email": "shelley.hubbard@compass.com",
        "company": "Compass",
        "linkedin": "",
        "instagram": "https://www.instagram.com/centralphoenixluxurylifestyle/",
        "facebook": "",
        "website": "https://www.shelleyhubbardproperties.com/ - Compass template with stock photo, fails to show JD or commissioner background",
        "phone": "",
        "zillow": "https://www.compass.com/agents/shelley-hubbard/",
        "segment": "outdated_differentiated",  # Segment 1 with unique angle
        "notes": "Solo Central Phoenix agent. RRC Luxury Certified, former attorney 30 years (JD), Maricopa County Real Estate Special Commissioner. Same Compass template as everyone else. Instagram 98 posts 833 followers. Market: Central Phoenix."
    },
    {
        "firstname": "Michelle",
        "lastname": "Jernigan",
        "email": "michelle.jernigan@compass.com",
        "company": "North & Co.",
        "linkedin": "",
        "instagram": "https://www.instagram.com/sellbymichelle/",
        "facebook": "https://www.facebook.com/michellejernigan/",
        "website": "https://michellejernigan.com/ - 2018 blog-style site, handwritten fonts, silhouette stock photo, looks like a personal journal",
        "phone": "",
        "zillow": "https://www.compass.com/agents/michelle-jernigan/",
        "segment": "outdated_awards",  # Segment 1 + 6 hybrid
        "notes": "Solo Phoenix/Oregon agent. 2025 Phoenix Magazine Top Producing Agent, 4th Top Individual Producer at North & Co. Website looks like a lifestyle blog from 2018. Brand 'sellbymichelle' on Instagram 778 posts and Facebook. Market: Phoenix."
    },
    {
        "firstname": "Gretchen",
        "lastname": "Jewell",
        "email": "gretchen@jewellhomesaz.com",
        "company": "Compass / Jewell Homes AZ",
        "linkedin": "",
        "instagram": "https://www.instagram.com/jewellgretchen/",
        "facebook": "https://www.facebook.com/gretchen.jewell.7/",
        "website": "http://www.jewellhomesaz.com/ - BROKEN, redirects to unreachable azhomes.com, all social links go to dead error page",
        "phone": "",
        "zillow": "https://www.compass.com/agents/gretchen-jewell/",
        "segment": "broken_website",
        "notes": "Solo Phoenix agent, Jewell Homes AZ brand. Sales $755K-$2.55M. Website completely broken - redirects to dead server. 970 Instagram posts all pointing to broken URL. Market: Phoenix/Scottsdale."
    },
    {
        "firstname": "David",
        "lastname": "Karaffa",
        "email": "david.karaffa@compass.com",
        "company": "Compass",
        "linkedin": "",
        "instagram": "https://www.instagram.com/davidksellsaz/",
        "facebook": "https://www.facebook.com/davidksellsaz/",
        "website": "https://www.davidksellsaz.com/ - North&Co. brokerage template, hero section fails to load (blank dark screen on landing)",
        "phone": "",
        "zillow": "https://www.compass.com/agents/david-karaffa/",
        "segment": "outdated_media_credential",
        "notes": "Solo Phoenix metro agent (Scottsdale/Gilbert/Mesa). 'As seen on HGTV & Amazon Prime' credential. Website is a North&Co. template with broken hero - blank dark screen. 1452 Instagram posts, 617 followers. Market: Scottsdale."
    },
    {
        "firstname": "Michele",
        "lastname": "Keith",
        "email": "michelekeith@compass.com",
        "company": "Compass / The Keith Group",
        "linkedin": "",
        "instagram": "https://www.instagram.com/thekeithgroupazrealtor/",
        "facebook": "",
        "website": "https://www.thekeithgroup.com/ - dated IDX template, gold/yellow color scheme, looks like 2018",
        "phone": "",
        "zillow": "https://www.compass.com/agents/13679571/",
        "segment": "team_outdated",  # Segment 3
        "notes": "Team leader, The Keith Group, Mesa AZ. Compass Principal, 20+ years, Top 1% Multi-Million Producer, sales up to $2.3M. Site is 2018-era IDX template. Instagram well-organized 213 posts but only 328 followers. Market: Mesa/Chandler."
    },
]

emails = {}

# ---- CATHY FASSERO: Segment 7 (Luxury Signal) - outdated site doesn't match $10M production
emails["Cathy"] = {
    "s1_sub": "Cathy, the Sports & Entertainment listing",
    "s1_body": """Cathy -

The $10.5M sale caught my eye when I was looking at Compass's Sports & Entertainment Division. That kind of transaction takes a different level of skill, discretion, and market knowledge to close.

Then I went to your website.

The green-logo template doesn't come close to telling that story. Buyers and sellers at this tier are evaluating you before they ever pick up the phone - and right now the first impression they get is a basic search widget that looks like every other agent site in Scottsdale.

I redesigned your homepage to match the level you're actually operating at.

Want to see it?

- Amaan.""",

    "s2_sub": "Cathy, the listing appointment you don't know you lost",
    "s2_body": """Cathy -

At the $5M-$10M level, sellers don't decide during the listing appointment. They decide before.

They've Googled you. They've seen your website. They've compared you to the two other agents their friend mentioned. By the time you walk through the door, an impression has already formed.

If that impression is a basic template with a search bar - no Sports & Entertainment story, no luxury positioning, nothing that signals you've closed $10M transactions - you're walking in already playing catch-up.

I designed a homepage that changes what they find before you arrive.

- Amaan.""",

    "s3_sub": "Cathy, something no one tells you",
    "s3_body": """Cathy -

There are agents in Scottsdale doing half your volume who are getting calls you should be getting - because they look better online. Not because they're better. Because they invested in how they show up when someone types their name into Google.

Your Sports & Entertainment niche is something almost no other Scottsdale agent has. A $10M transaction on a Compass profile and a basic personal site is like framing a museum piece in cardboard.

That's a fixable problem. I already fixed it for you - at least the homepage.

Want to take a look?

- Amaan.""",

    "s4_sub": "Cathy, this probably happened last month",
    "s4_body": """Cathy -

Picture this:

An athlete relocating to Scottsdale asks around for an agent who understands their world. Your name comes up - someone in the Sports & Entertainment space who actually gets it. Before they call, they Google you. Your website loads. Green logo, standard search widget, nothing that says Sports & Entertainment, nothing that signals $10M production.

They check the next name on the list.

You never knew you were being considered.

The homepage I designed leads with who you actually are - not just another Scottsdale agent.

Interested?

- Amaan.""",
}

# ---- JENNIFER FELKER: Segment 4 (Brokerage-Dependent Team Leader)
emails["Jennifer"] = {
    "s1_sub": "Jennifer, The Felker Group",
    "s1_body": """Jennifer -

Been looking at what The Felker Group is doing in Scottsdale - 20+ years, $5.5M listings, clear East Valley luxury positioning. What you've built is real.

One thing caught my attention though: The Felker Group doesn't have its own website. Everything lives inside Compass's infrastructure through Compass Launch. That means when someone Googles your team, they find Compass first and your brand second.

Your team is a page on someone else's website.

I designed a standalone homepage for The Felker Group - one that puts your team front and center, not the brokerage.

Want to see it?

- Amaan.""",

    "s2_sub": "Jennifer, the thing about brokerage pages",
    "s2_body": """Jennifer -

Here's something Compass won't tell you:

Your team page on their site looks exactly like every other team page on their site. Same layout. Same template. The only difference is the names and photos.

You've built 20 years of reputation in Scottsdale luxury and your online presence is structurally identical to a team that launched last quarter.

The Felker Group isn't a template. It shouldn't look like one.

I designed what The Felker Group should actually look like online - independently owned, independently ranked, yours regardless of what Compass does next.

Say the word.

- Amaan.""",

    "s3_sub": "Jennifer, something to think about",
    "s3_body": """Jennifer -

Honest question - and I ask this with genuine respect:

If The Felker Group ever moved to a different brokerage - or if Compass changed their Launch platform tomorrow - what happens to your online presence?

It disappears. Every page, every listing, every piece of brand equity your team has built inside that platform. Gone. Because you don't own any of it. Compass does.

20 years of work in Scottsdale luxury deserves a home online that you own outright, one that exists no matter what.

I already designed one for The Felker Group. Let me know if you're curious.

- Amaan.""",

    "s4_sub": "Jennifer, this is happening in Scottsdale right now",
    "s4_body": """Jennifer -

A luxury buyer relocating to Scottsdale is searching for a team to handle their $4M purchase. They Google "luxury real estate team Scottsdale."

Teams with their own websites show up. Teams with testimonials, market reports, their own branded story - they dominate that search. Teams living on a brokerage page are buried behind the brokerage's own listings.

Right now, someone searching for The Felker Group finds Compass first and your team second. You're not invisible - but you're not leading.

I designed a homepage that changes that. Interested?

- Amaan.""",
}

# ---- DAREN FREEMAN: Segment 5 (Mismatch - great social, no website)
emails["Daren"] = {
    "s1_sub": "Daren, your Instagram vs. your website",
    "s1_body": """Daren -

Spent a few minutes on your Instagram before reaching out. 1010 posts - Scottsdale listings, Colorado properties, dual-market content. That's a serious amount of work building an audience across two markets.

Then I tried to find your website.

There isn't one. Just a Compass profile and a Linktree. Every post you've ever published - all 1000 of them - sends people to a link tree instead of a place that tells your story and converts them.

You've built the audience. The destination is missing.

I designed a homepage for you - what buyers and sellers should land on when they follow the link in your bio.

Want to take a look?

- Amaan.""",

    "s2_sub": "Daren, the handoff problem",
    "s2_body": """Daren -

Something I think about a lot with agents who have a strong social presence:

The content you put out on Instagram does real work. 1010 posts across Scottsdale and Colorado - that's real trust-building. People get a sense of who you are before they ever speak to you.

But then they click through - and they land on a Linktree. Then a Compass profile you don't control. The trust you built in 60 seconds of scrolling lands nowhere.

The click-through is the handoff. Right now, the handoff is losing you business you already earned.

I designed a homepage that matches what your Instagram already promises.

- Amaan.""",

    "s3_sub": "Daren, the thing your follower count can't fix",
    "s3_body": """Daren -

Here's something nobody's going to say out loud:

Your social following is an audience. A website is a closer.

An audience watches. A closer converts. Right now you're investing seriously in the audience - 1010 posts is a real commitment - and almost nothing in the closer.

Every serious buyer or seller who finds you on Instagram eventually looks for your site to decide. Listings up to $2.8M, dual-market presence, real production - none of that story exists anywhere you own.

I built the closer. Want to take a look?

- Amaan.""",

    "s4_sub": "Daren, this happens at the worst moment",
    "s4_body": """Daren -

Picture this:

A buyer relocating from Colorado to Scottsdale finds you on Instagram - perfect, you know both markets. They're interested. They look for your website before they message you.

They find a Linktree and a Compass profile with no story. The energy drops. They check another agent who has a real site. That agent feels more established, more anchored. They go with that agent.

You never knew you had them.

The homepage I designed exists specifically for that moment - to take the trust your Instagram builds and give it somewhere to land.

Interested?

- Amaan.""",
}

# ---- HEATHER LACOUR GAGNE: Segment 2 (No Website)
emails["Heather"] = {
    "s1_sub": "Heather, looked you up",
    "s1_body": """Heather -

Looked you up before reaching out. You're working alongside Cathy Fassero in the Sports & Entertainment Division - transactions from $2.2M to $10.5M. That's not a small operation.

But when I Googled your name, there's no website. Just a Compass profile and a small Instagram. For someone working at this volume in this niche, that felt off.

So I designed a homepage for you - what someone should find when they search your name and want to know who you are before they call.

It's ready. Want to take a look?

- Amaan.""",

    "s2_sub": "Heather, the part nobody sees",
    "s2_body": """Heather -

Here's the thing about not having a website that nobody talks about:

It's not that you're losing deals because of it. It's that every new client has to take someone else's word for it. Every referral has to just trust. There's no place where your track record - $10M+ transactions, Sports & Entertainment expertise - speaks for itself before you even pick up the phone.

You're doing serious work with no home base.

I built one for you. Say the word and I'll walk you through it.

- Amaan.""",

    "s3_sub": "Heather, honest thought",
    "s3_body": """Heather -

You probably think you don't need a website because your business comes from relationships and the team structure around Cathy's network. And you're right - it does.

But here's what I've noticed: every relationship still gets Googled. The athlete's business manager. The referral's spouse. The friend-of-a-friend who heard your name. They all search before they call.

Right now, that search turns up nothing that you control. That's a conversation happening about your brand - without you in the room.

The $10M transactions you've been part of deserve to show up somewhere you own.

I designed what should show up. Let me know if you're curious.

- Amaan.""",

    "s4_sub": "Heather, this happens more than you think",
    "s4_body": """Heather -

A client refers you to a friend - maybe another athlete, maybe a business manager in the entertainment world. The friend is interested. They pull out their phone and Google you.

What comes up? A Compass profile you don't control. An Instagram with 693 followers. No website. No story. No brand that belongs to you.

The enthusiasm from the referral drops. Now they're on the fence. Maybe they'll call, maybe they won't.

You didn't lose the referral - you just made it harder for the referral to become a client.

I built the fix. It's a homepage that does the convincing for you.

Want to see it?

- Amaan.""",
}

# ---- LAUREN GALLEGOS: Segment 5 (Mismatch - nearly 10K followers, Linktree IS her website)
emails["Lauren"] = {
    "s1_sub": "Lauren, your Instagram vs. your website",
    "s1_body": """Lauren -

Spent a few minutes on your Instagram before reaching out. Nearly 10,000 followers, a $15M production milestone callout, consistent content - you've built real social traction in Scottsdale.

Then I tried to find your website.

Your Linktree is your website. There's no destination that actually converts that audience - no place that tells the full story, no page a serious buyer or seller lands on and thinks "this is the agent I'm calling."

Nearly 10K followers with no professional home to send them to.

I designed that homepage for you. Want to see it?

- Amaan.""",

    "s2_sub": "Lauren, the handoff problem",
    "s2_body": """Lauren -

Something I think about a lot with agents who have a strong social presence:

The content you put out does real work. 327 posts, 10K followers - that audience trusts you before they've spoken to you. They've seen your market knowledge, your personality, your production milestone. You've already earned them.

But then they click through - and they land on a Linktree. It's not a destination. It's a list.

The trust you built in 60 seconds of scrolling lands on a page that feels unfinished. That gap costs you clients you already won.

I designed a homepage that turns that click into a conversion.

- Amaan.""",

    "s3_sub": "Lauren, the thing your follower count can't fix",
    "s3_body": """Lauren -

Here's something nobody's going to say out loud:

9,700 followers is an audience. A website is a closer.

An audience watches. A closer converts. Right now you're investing seriously in the audience and the Linktree is doing the job of the closer - badly.

The $15M milestone you posted is impressive. But a buyer or seller landing on a Linktree after seeing that doesn't feel the same weight. There's no place where that achievement lives in context, where your story is told properly, where someone decides to call you.

I built the closer. Want to take a look?

- Amaan.""",

    "s4_sub": "Lauren, this happens at the worst moment",
    "s4_body": """Lauren -

Picture this:

A luxury buyer in Scottsdale finds you on Instagram. 10K followers, production milestone post, consistent market content - they're impressed. They click the link in your bio to learn more before reaching out.

They land on a Linktree.

The impression drops. It doesn't match what they just saw on your feed. They check another agent who has a real site - clean, current, professional. That agent gets the call.

You won them on Instagram. The Linktree gave them a reason to hesitate.

I designed a homepage that keeps that win. Interested?

- Amaan.""",
}

# ---- NEIL GATTEN: Segment 7 (Luxury Signal - $9.675M listing on a biker-stock-photo template)
emails["Neil"] = {
    "s1_sub": "Neil, the $9.675M listing",
    "s1_body": """Neil -

The $9.675M listing in Paradise Valley caught my eye. A property at that level takes a different kind of market expertise and seller trust to secure.

Then I went to your website.

Bikers in a field. Standard search widget. A Compass template that looks like it was built for a suburban Phoenix agent doing $500K sales.

At this price point, buyers and sellers are running a premium test on every agent they consider before they make contact. Right now, your website would not pass that test.

I redesigned your homepage to match the tier you're actually operating at.

Want to see it?

- Amaan.""",

    "s2_sub": "Neil, the listing appointment you don't know you lost",
    "s2_body": """Neil -

At the $9M level in Paradise Valley, sellers don't decide during the listing appointment. They decide before.

They've Googled you. They've opened your website. They've formed an impression before you've said a word. If what they find is a stock photo of bikers and a basic search bar - no luxury positioning, no premium feel, nothing that signals you handle $9M assets - you're walking into a room where the decision is already leaning away from you.

I designed a homepage that puts you ahead before you even show up.

- Amaan.""",

    "s3_sub": "Neil, something no one tells you",
    "s3_body": """Neil -

There are agents in Scottsdale and Paradise Valley doing half your volume who are getting calls you should be getting - because they look better online. Not because they're better. Because they invested in how they show up when someone types their name into Google.

You're listing $9M properties on a website with a bike trail photo. That gap is real and it's costing you listing appointments you don't even know you were being considered for.

That's a fixable problem. I already fixed it for you - at least the homepage.

Want to take a look?

- Amaan.""",

    "s4_sub": "Neil, a seller running a comparison right now",
    "s4_body": """Neil -

A seller in Paradise Valley has a $7M estate they're about to list. They've been given three agent names. Before they call any of them, they open all three websites.

One looks institutional and hard to navigate. One is a clean brokerage template - fine, forgettable. One is photographic, premium, quiet confidence - the design signals that this agent handles properties like theirs every day.

They call the third agent first. That agent gets the listing conversation.

You have the track record and the market expertise. The website I designed gives you the first impression to match.

Interested?

- Amaan.""",
}

# ---- AIMEE GROESCHNER: Segment 2 (No Website - niche athlete relocation, bio points to charity)
emails["Aimee"] = {
    "s1_sub": "Aimee, looked you up",
    "s1_body": """Aimee -

Looked you up before reaching out. Compass Professional Athlete Division, Phoenix relocation specialist, 25+ years of Arizona market knowledge - that's a specific, valuable niche that very few agents can legitimately claim.

But when I Googled your name, there's no website. Your Instagram bio points to an ALS fundraiser. The niche you've built has no professional digital home.

For someone at your level with a niche this distinct, that felt like a miss. So I designed a homepage for you - what an athlete, a business manager, or a relocation client should find when they search your name.

It's ready. Want to take a look?

- Amaan.""",

    "s2_sub": "Aimee, the part nobody sees",
    "s2_body": """Aimee -

Here's the thing about not having a website that nobody talks about:

It's not that you're losing deals you know about. It's that the niche you've spent 25 years building - athlete relocation, insider Phoenix market knowledge - has no place online where it lives and speaks for itself.

Every athlete's agent, every sports team relocation coordinator, every business manager searching for someone to handle their client's move to Phoenix - they're landing on a Compass profile and a charity link.

You're doing specialized work with no home base.

I built one for you. Say the word.

- Amaan.""",

    "s3_sub": "Aimee, honest thought",
    "s3_body": """Aimee -

You probably think you don't need a website because your athlete relocation business runs on relationships and referrals within that world. And you're right - it does.

But here's what I've noticed: every referral still gets Googled. The agent who refers you to their athlete client. The sports team's relocation coordinator. The manager's assistant doing the vetting. They all search your name before they recommend you.

Right now, that search turns up nothing that you control. For a niche this specific and this valuable, that's a conversation happening about your expertise - without you in the room.

I designed what should show up. Let me know if you're curious.

- Amaan.""",

    "s4_sub": "Aimee, this happens more than you think",
    "s4_body": """Aimee -

An athlete signs with an Arizona franchise. Their agent starts looking for a relocation specialist. Your name comes up - Compass Athlete Division, 25 years in Phoenix, knows the market at every level.

Before they make the call, they Google you. What comes up? A Compass profile. An Instagram with an ALS fundraiser in the bio. Nothing that confirms: yes, this is the person we want handling this.

They keep searching. They find another agent with a clean site that says exactly what they're looking for. They call that agent.

You didn't lose the referral because you weren't qualified. You lost it because there was nowhere for your qualifications to show up.

I built that place. Want to see it?

- Amaan.""",
}

# ---- SHELLEY HUBBARD: Segment 1 (Outdated site, but her unique angle is the JD/Commissioner differentiation being wasted)
emails["Shelley"] = {
    "s1_sub": "Shelley, your listings",
    "s1_body": """Shelley -

Spent some time looking at your background before reaching out. A JD. 30 years as an attorney. Maricopa County Real Estate Special Commissioner. RRC Luxury Certified.

Then I went to your website.

It's the same Compass template I've seen on a dozen other agents in Phoenix. Same stock outdoor photo. Same search widget. There's nothing on that page that communicates a single thing that makes you different from any other agent who set up a site last year.

The credentials you have are genuinely rare. A real website could lead with them. Yours doesn't mention them at all.

I redesigned your homepage to open with who you actually are.

Want to see it?

- Amaan.""",

    "s2_sub": "Shelley, something I've been thinking about",
    "s2_body": """Shelley -

Here's something I think about when I look at agents with backgrounds like yours:

You spent 30 years practicing law. You became a Maricopa County Real Estate Special Commissioner. You built a level of expertise in real estate transactions that most agents will never have.

And then someone Googles you - and the first impression they get is a website that shares a design template with agents who got their license six months ago.

Every luxury buyer or seller who goes online first to vet their agent sees nothing that tells that story.

The credentials are rare. The website should be too.

I already built what it should look like. Just say the word.

- Amaan.""",

    "s3_sub": "Shelley, something no one tells you",
    "s3_body": """Shelley -

Nobody's going to tell you this, so I will:

There are agents in Central Phoenix doing half your volume who are getting calls you should be getting - because they look better online. Not because they're better. Because they invested in their digital presence.

But here's the sharper version of that truth: there's probably no other agent in Phoenix who has a JD and 30 years of legal practice behind their real estate work. That's a legitimate differentiator for anyone navigating a complex transaction.

It exists nowhere on your current website.

That's a fixable problem. I already fixed it for you - at least the homepage.

Want to take a look?

- Amaan.""",

    "s4_sub": "Shelley, this probably happened last month",
    "s4_body": """Shelley -

Picture this:

A buyer is navigating a complex purchase situation - maybe an estate sale, a contentious negotiation, something where having an agent with a legal background would be genuinely valuable. Their attorney friend tells them to find someone sharp.

They Google Scottsdale luxury agents. They look at a few websites. They don't find the JD. They don't find the Commissioner title. Those credentials aren't showing up anywhere in their search because your website doesn't lead with them.

They call an agent with a cleaner site. You were the right person. They never knew it.

I designed a homepage that makes sure they know it.

Interested?

- Amaan.""",
}

# ---- MICHELLE JERNIGAN: Segment 1 + Award angle (2025 Top Producer, blog-style site)
emails["Michelle"] = {
    "s1_sub": "Michelle, your listings",
    "s1_body": """Michelle -

Spent some time looking at your work in Phoenix before reaching out. 2025 Phoenix Magazine Top Producing Agent. 4th Top Individual Producer at North & Co. Those are real, current credentials.

Then I went to your website.

Handwritten fonts. A silhouette stock photo. A layout that looks like a personal lifestyle blog from 2018. It doesn't look like the site of a 2025 award-winning agent - it looks like a site that hasn't been thought about since the year it was built.

There's a significant gap between the work you're doing and how you show up when someone types your name into Google.

I redesigned your homepage. Want to see it?

- Amaan.""",

    "s2_sub": "Michelle, something I've been thinking about",
    "s2_body": """Michelle -

Here's the thing about an award like Phoenix Magazine Top Producing Agent that most people don't fully use:

It's not just a credential. It's a search event. Everyone who saw the announcement, every potential client who heard about it, every referral partner who noticed - they Google your name.

What they find right now is a site with handwritten fonts and a silhouette photo that doesn't match the agent who just won that recognition.

The award creates a window. The website right now is closing it.

I designed a homepage that makes that Google search land right.

- Amaan.""",

    "s3_sub": "Michelle, something no one tells you",
    "s3_body": """Michelle -

Nobody's going to tell you this, so I will:

There are agents in Phoenix doing half your volume who are getting calls you should be getting - because they look better online. Not because they're better.

But your situation is sharper than that. You're a 2025 award winner with an active brand on Instagram and Facebook - "sellbymichelle" across 778 posts - and all of that content points back to a website that looks like it belongs to a different person entirely.

The brand you've built on social doesn't match the site people land on. That disconnect is costing you clients you've already half-convinced.

I already fixed the homepage. Want to take a look?

- Amaan.""",

    "s4_sub": "Michelle, this probably happened last month",
    "s4_body": """Michelle -

Someone sees the Phoenix Magazine Top Producer feature. They're impressed - that's a real recognition. They pull up your Instagram, see the "sellbymichelle" brand, like the content. They click through to your website.

Handwritten fonts. A silhouette. 2018 energy.

The enthusiasm from the magazine piece drops by half. They start wondering if the award was recent or old. They check another agent.

You earned that lead with the recognition and the content. The website gave it back.

I designed a homepage that keeps the work you've already done. Interested?

- Amaan.""",
}

# ---- GRETCHEN JEWELL: Broken website - urgent angle
emails["Gretchen"] = {
    "s1_sub": "Gretchen, looked you up",
    "s1_body": """Gretchen -

Looked you up before reaching out. The Jewell Homes AZ brand is real - solid Phoenix production, consistent social presence, 970 Instagram posts all pointing to your site.

There's just one problem: the site is broken. The website link on your profile redirects to an unreachable page that doesn't load. Anyone who clicks your link - from any of those 970 posts, from any referral, from any Google search - hits a dead error page.

Every piece of content you've ever published is sending people to a dead end right now.

I designed a homepage for Jewell Homes AZ that actually works. Want to see it?

- Amaan.""",

    "s2_sub": "Gretchen, something I've been thinking about",
    "s2_body": """Gretchen -

Here's something worth sitting with:

You've put real effort into building Jewell Homes AZ as a brand. The Instagram presence, the consistent posting, the name recognition you've built in Phoenix. That work is real.

And right now, every single point where someone tries to go deeper - every "link in bio" click, every Google search, every referral who looks you up - they hit a broken page.

It's not that your business is bad. It's that the door you've built to bring people in doesn't open.

I designed a replacement that works. Say the word.

- Amaan.""",

    "s3_sub": "Gretchen, honest thought",
    "s3_body": """Gretchen -

I'll just say it plainly:

Your website link doesn't work. It redirects to a server that times out. Every link you've ever posted - across 970 Instagram posts - sends people to an error page.

I don't know if you're aware of it or if it's been on the list and keeps getting pushed. Either way, it's happening right now, today, to anyone who tries to find your site.

I designed a new homepage for Jewell Homes AZ - one you'd actually own and control, not a redirect that can break again.

Want to see it?

- Amaan.""",

    "s4_sub": "Gretchen, this is happening right now",
    "s4_body": """Gretchen -

A past client refers you to a friend who just got a job offer in Phoenix. The friend is excited - the referral spoke highly of you. They Google "Gretchen Jewell realtor" on their lunch break.

They find your Instagram. They click the link in your bio. The site loads, redirects, and times out. Dead page.

They assume the site is just behind on maintenance. They try one more time later. Same result.

They message a different agent instead.

You didn't lose that lead because you weren't the right person. You lost it to a broken redirect.

The homepage I designed for Jewell Homes AZ doesn't have that problem.

Interested?

- Amaan.""",
}

# ---- DAVID KARAFFA: Outdated/broken + media credential not being used
emails["David"] = {
    "s1_sub": "David, your listings",
    "s1_body": """David -

The HGTV and Amazon Prime credential stopped me when I was looking at your Instagram. That's a legitimate media presence that almost no other agent in Scottsdale can claim.

Then I went to your website.

The hero section doesn't load. First thing a visitor sees is a blank dark screen. Below the fold it's a standard North & Co. template - and the HGTV credit isn't anywhere on the page.

You've got a hook that could open doors most agents can't open, and it's buried in an Instagram bio above a site that breaks on arrival.

I redesigned your homepage to lead with that credential the way it deserves.

Want to see it?

- Amaan.""",

    "s2_sub": "David, something I've been thinking about",
    "s2_body": """David -

Here's something I think about when I see an agent with a media credential like HGTV or Amazon Prime:

It's not just a talking point. It's a trust signal that bypasses the skepticism most agents face cold. Clients who watch HGTV already want to work with someone from that world - it's a shortcut to credibility that takes most agents years to build.

And right now, when someone lands on your website to verify that credential, they see a blank dark screen. Then a brokerage template. The HGTV mention isn't there.

You're sitting on one of the strongest hooks in the Scottsdale market and it's not showing up anywhere you own.

I designed a homepage that changes that. Just say the word.

- Amaan.""",

    "s3_sub": "David, something no one tells you",
    "s3_body": """David -

Nobody's going to tell you this, so I will:

1452 Instagram posts is a serious commitment. That's years of showing up, producing content, building visibility in a noisy market. Most agents quit at 50.

But right now all of that effort points back to a site with a broken hero section and no mention of the HGTV credential that makes you genuinely different.

You've built the audience. The destination is broken and it's not even telling your best story when it does load.

That's two fixable problems. I already fixed both of them - at least on the homepage.

Want to take a look?

- Amaan.""",

    "s4_sub": "David, this probably happened last month",
    "s4_body": """David -

A buyer relocating to Scottsdale is scrolling Instagram. They find your profile. 1452 posts, active market presence, and - wait - "as seen on HGTV and Amazon Prime." They're intrigued.

They click through to your website to learn more before they reach out.

Blank dark screen. They wait. Refresh. Still broken above the fold. They scroll down - brokerage template, no HGTV story, nothing that matches what they just read in your bio.

They close the tab.

You had them. The website gave them back.

I designed a homepage that keeps that moment intact.

Interested?

- Amaan.""",
}

# ---- MICHELE KEITH: Segment 3 (Team Leader with outdated website)
emails["Michele"] = {
    "s1_sub": "Michele, The Keith Group",
    "s1_body": """Michele -

Been looking at what The Keith Group is doing in Mesa and Chandler. 20+ years, Top 1% production, Compass Principal designation - what you've built is a real brand in the East Valley.

But the website doesn't tell that story. Your team website is a gold-yellow IDX template with generic action boxes - Search Properties, Free CMA, Hot New Listings. It looks like it was set up in 2018 and hasn't been touched since.

An agent thinking about joining your team, or a seller choosing between you and another established East Valley team - what they see online right now doesn't match the team you've actually built over 20 years.

I designed a new homepage for The Keith Group. It tells the real story.

Want to see it?

- Amaan.""",

    "s2_sub": "Michele, the recruiting thing",
    "s2_body": """Michele -

Something team leaders don't talk about enough:

The hardest part of growing a team isn't finding agents. It's convincing good agents to leave where they are. And the first thing every agent does before they take your call? They Google your team.

If what they find is a 2018-era IDX template with a gold color scheme and generic search boxes - nothing that says "this is where serious agents in the East Valley build their business" - you've already lost some of them before the conversation starts.

I designed what they should find when they Google The Keith Group. Let me know if that's worth a look.

- Amaan.""",

    "s3_sub": "Michele, something I noticed about teams in Mesa",
    "s3_body": """Michele -

Looked at several established teams in the East Valley this week.

Here's the pattern: the teams that are attracting new agents and growing faster all look like a company online. Professional site, clear value proposition, a story about why agents join and what happens after they do.

The teams that are plateauing - even the ones with better numbers - look like a collection of individuals with a shared name and a shared template.

The Keith Group has the 20-year track record. The homepage I designed gives it the packaging that matches.

Interested?

- Amaan.""",

    "s4_sub": "Michele, imagine this",
    "s4_body": """Michele -

A solid producer in Mesa is quietly looking to make a move. They've been at their current brokerage for a few years and they're ready for something different. They start Googling teams in the East Valley.

They find The Keith Group. They open the site. Gold-yellow template. "Search Properties." "Free CMA." Nothing that tells them why this is the place to grow, nothing that shows the culture or the track record, nothing that feels like a destination.

They scroll past to the next result.

You have 20 years of proof that The Keith Group is worth joining. The website isn't showing any of it.

I designed a homepage that ends that. Want to see it?

- Amaan.""",
}

# Now build the CSV
output_rows = []

prospect_email_map = {
    "Cathy": ("Cathy", "Fassero", "cathy.fassero@compass.com", "Compass", "", "https://www.instagram.com/cfassero/", "", "https://www.cathyfassero.com/ - basic green-logo template, doesn't match $10M+ luxury production", "", "https://www.compass.com/agents/cathy-fassero/"),
    "Jennifer": ("Jennifer", "Felker", "jennifer.felker@compass.com", "Compass / The Felker Group", "", "https://www.instagram.com/jenfelkerrealtor/", "", "https://www.jenfelker.com/ - Compass Launch-hosted template, not independently owned", "", "https://www.compass.com/agents/jennifer-felker/"),
    "Daren": ("Daren", "Freeman", "daren.freeman@compass.com", "Compass", "", "https://www.instagram.com/darendoesrealestate/", "https://www.facebook.com/daren.freeman/", "No Website - only Compass profile and Linktree in bio", "", "https://www.compass.com/agents/daren-freeman/"),
    "Heather": ("Heather", "Lacour Gagne", "heather.gagne@compass.com", "Compass / Sports & Entertainment Division", "", "https://www.instagram.com/hgagne7/", "", "No Website - Compass profile only, website field pointed to own Instagram", "", "https://www.compass.com/agents/heather-gagne/"),
    "Lauren": ("Lauren", "Gallegos", "Lauren.gallegos@compass.com", "Compass", "", "https://www.instagram.com/_laurengallegosazrealtor/", "", "No Website - Linktree IS her website (https://linktr.ee/_laurengallegosazrealtor)", "", "https://www.compass.com/agents/lauren-gallegos/"),
    "Neil": ("Neil", "Gatten", "neil.gatten@compass.com", "Compass", "", "", "", "https://www.neilsellsaz.com/ - Compass-hosted template, bikers-in-a-field stock photo, no luxury feel", "", "https://www.compass.com/agents/neil-gatten/"),
    "Aimee": ("Aimee", "Groeschner", "aimee.groeschner@compass.com", "Compass / Professional Athlete Division", "", "https://www.instagram.com/aimeeg_azrealtor/", "https://www.facebook.com/p/Aimee-Groeschner-AZ-Realtor-100090628144625/", "No Website - Instagram bio links to ALS fundraiser, not a professional site", "", "https://www.compass.com/agents/aimee-groeschner/"),
    "Shelley": ("Shelley", "Hubbard", "shelley.hubbard@compass.com", "Compass", "", "https://www.instagram.com/centralphoenixluxurylifestyle/", "", "https://www.shelleyhubbardproperties.com/ - Compass template with stock photo, fails to show JD or commissioner background", "", "https://www.compass.com/agents/shelley-hubbard/"),
    "Michelle": ("Michelle", "Jernigan", "michelle.jernigan@compass.com", "North & Co.", "", "https://www.instagram.com/sellbymichelle/", "https://www.facebook.com/michellejernigan/", "https://michellejernigan.com/ - 2018 blog-style site, handwritten fonts, silhouette stock photo", "", "https://www.compass.com/agents/michelle-jernigan/"),
    "Gretchen": ("Gretchen", "Jewell", "gretchen@jewellhomesaz.com", "Compass / Jewell Homes AZ", "", "https://www.instagram.com/jewellgretchen/", "https://www.facebook.com/gretchen.jewell.7/", "http://www.jewellhomesaz.com/ - BROKEN, redirects to unreachable azhomes.com", "", "https://www.compass.com/agents/gretchen-jewell/"),
    "David": ("David", "Karaffa", "david.karaffa@compass.com", "Compass", "", "https://www.instagram.com/davidksellsaz/", "https://www.facebook.com/davidksellsaz/", "https://www.davidksellsaz.com/ - North&Co. template, hero section fails to load (blank dark screen)", "", "https://www.compass.com/agents/david-karaffa/"),
    "Michele": ("Michele", "Keith", "michelekeith@compass.com", "Compass / The Keith Group", "", "https://www.instagram.com/thekeithgroupazrealtor/", "", "https://www.thekeithgroup.com/ - dated IDX template, gold/yellow color scheme, 2018-era", "", "https://www.compass.com/agents/13679571/"),
}

import csv
import io

fieldnames = [
    "firstname","lastname","email","company","linkedin","instagram","facebook",
    "website","phone","zillow",
    "step1_subject","step1_body",
    "step2_subject","step2_body",
    "step3_subject","step3_body",
    "step4_subject","step4_body",
]

output = io.StringIO()
writer = csv.DictWriter(output, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
writer.writeheader()

for first_name, data in emails.items():
    info = prospect_email_map[first_name]
    row = {
        "firstname": info[0],
        "lastname": info[1],
        "email": info[2],
        "company": info[3],
        "linkedin": info[4],
        "instagram": info[5],
        "facebook": info[6],
        "website": info[7],
        "phone": info[8],
        "zillow": info[9],
        "step1_subject": data["s1_sub"],
        "step1_body": data["s1_body"],
        "step2_subject": data["s2_sub"],
        "step2_body": data["s2_body"],
        "step3_subject": data["s3_sub"],
        "step3_body": data["s3_body"],
        "step4_subject": data["s4_sub"],
        "step4_body": data["s4_body"],
    }
    writer.writerow(row)

csv_content = output.getvalue()
with open("pinova_emails_l5.csv", "w") as f:
    f.write(csv_content)

print("Done. Rows written:", csv_content.count("\n") - 1)