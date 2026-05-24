const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, PageBreak
} = require('docx');
const fs = require('fs');

// Color palette
const C = {
  navy: "1B2B4B",
  blue: "2563EB",
  lightBlue: "EFF6FF",
  lightGray: "F8F9FA",
  midGray: "E5E7EB",
  darkGray: "374151",
  mutedText: "6B7280",
  white: "FFFFFF",
  amber: "FEF3C7",
  amberBorder: "D97706",
  green: "ECFDF5",
  greenBorder: "059669",
};

const border = { style: BorderStyle.SINGLE, size: 1, color: C.midGray };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    children: [new TextRun({ text, font: "Arial", size: 32, bold: true, color: C.navy })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.midGray, space: 4 } },
    children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: C.navy })]
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, font: "Arial", size: 22, bold: true, color: C.darkGray })]
  });
}

function h4(text) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 20, bold: true, color: C.blue })]
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 100 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: C.darkGray, ...opts })]
  });
}

function italic(text) {
  return new Paragraph({
    spacing: { before: 60, after: 100 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: C.mutedText, italics: true })]
  });
}

function spacer(lines = 1) {
  return new Paragraph({ spacing: { before: 0, after: lines * 120 }, children: [new TextRun("")] });
}

function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.midGray, space: 1 } },
    children: [new TextRun("")]
  });
}

function callout(text, bgColor = C.lightBlue, borderColor = C.blue, labelText = "NOTE") {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [160, 9200],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorders,
            width: { size: 160, type: WidthType.DXA },
            shading: { fill: borderColor, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 100, right: 60 },
            children: [new Paragraph({
              children: [new TextRun({ text: "", font: "Arial", size: 16 })]
            })]
          }),
          new TableCell({
            borders: noBorders,
            width: { size: 9200, type: WidthType.DXA },
            shading: { fill: bgColor, type: ShadingType.CLEAR },
            margins: { top: 140, bottom: 140, left: 200, right: 200 },
            children: [new Paragraph({
              children: [new TextRun({ text, font: "Arial", size: 19, color: C.darkGray, italics: true })]
            })]
          })
        ]
      })
    ]
  });
}

function emailBlock(subject, body, dayLabel = "") {
  const rows = [];
  // Header row
  if (dayLabel) {
    rows.push(new TableRow({
      children: [
        new TableCell({
          borders: { top: border, bottom: noBorder, left: border, right: border },
          width: { size: 9360, type: WidthType.DXA },
          shading: { fill: C.navy, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 200, right: 200 },
          children: [new Paragraph({
            children: [new TextRun({ text: dayLabel, font: "Arial", size: 18, bold: true, color: C.white })]
          })]
        })
      ]
    }));
  }
  // Subject row
  rows.push(new TableRow({
    children: [
      new TableCell({
        borders: { top: dayLabel ? noBorder : border, bottom: noBorder, left: border, right: border },
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: C.lightBlue, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 200, right: 200 },
        children: [new Paragraph({
          children: [
            new TextRun({ text: "Subject: ", font: "Arial", size: 19, bold: true, color: C.blue }),
            new TextRun({ text: subject, font: "Arial", size: 19, bold: false, color: C.navy, italics: true })
          ]
        })]
      })
    ]
  }));
  // Body row - split by newlines
  const bodyLines = body.split('\n');
  const bodyChildren = [];
  bodyLines.forEach((line, i) => {
    bodyChildren.push(new TextRun({ text: line, font: "Arial", size: 19, color: C.darkGray }));
    if (i < bodyLines.length - 1) bodyChildren.push(new TextRun({ break: 1 }));
  });
  rows.push(new TableRow({
    children: [
      new TableCell({
        borders: { top: noBorder, bottom: border, left: border, right: border },
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: C.lightGray, type: ShadingType.CLEAR },
        margins: { top: 180, bottom: 180, left: 200, right: 200 },
        children: [new Paragraph({ children: bodyChildren })]
      })
    ]
  }));

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows
  });
}

function simpleTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    children: headers.map((h, i) => new TableCell({
      borders,
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: C.navy, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text: h, font: "Arial", size: 18, bold: true, color: C.white })]
      })]
    }))
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      borders,
      width: { size: colWidths[ci], type: WidthType.DXA },
      shading: { fill: ri % 2 === 0 ? C.white : C.lightGray, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text: cell, font: "Arial", size: 18, color: C.darkGray })]
      })]
    }))
  }));

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows]
  });
}

// ============================
// DOCUMENT BUILD
// ============================

const children = [];

// COVER
children.push(new Paragraph({
  spacing: { before: 1440, after: 200 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "PINOVA", font: "Arial", size: 48, bold: true, color: C.navy, allCaps: true })]
}));
children.push(new Paragraph({
  spacing: { before: 0, after: 120 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "Cold Email Playbook — Expanded", font: "Arial", size: 32, color: C.blue })]
}));
children.push(new Paragraph({
  spacing: { before: 0, after: 80 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "US Real Estate | Website Redesign | 2026", font: "Arial", size: 22, color: C.mutedText, italics: true })]
}));
children.push(divider());
children.push(spacer(2));

// PAGE BREAK
children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================
// PART 1: WHAT ACTUALLY WORKS
// ============================
children.push(h1("Part 1 — What Actually Works (and Why)"));

children.push(p("Before angles, before templates — here is the honest truth about what separates cold emails that get replies from the ones that get deleted without being read.", { bold: false }));
children.push(spacer());

children.push(h2("The One Insight That Changes Everything"));
children.push(p("The emails that convert in US real estate do one thing better than anything else: they make the agent feel seen. Not impressed. Not lectured to. Seen."));
children.push(p("The reason most cold email advice doesn't work is because it's written from the sender's perspective. \"Here's what I do. Here's what I've built. Here's why you should care.\" Real estate agents — especially top producers — get 20–40 cold emails a week. They delete that framing on instinct."));
children.push(p("What stops the delete: the moment a line reads like it came from someone who actually knows what their Tuesday looks like. A referral that ghosted. A listing that photographed beautifully but the website buried it. An agent with worse numbers who keeps showing up first on Google."));
children.push(spacer());

children.push(h2("The 3 Mechanics of a Converting Cold Email"));

children.push(h3("1. Lead with their world, not yours"));
children.push(p("Your name, your company, your credentials — none of that belongs in the first two lines. The first two lines belong to them. Their market. Their listing. Their situation. Enter their world before you introduce yours."));

children.push(h3("2. One emotion per email"));
children.push(p("Each email in a sequence should trigger exactly one emotional response. Curiosity. Recognition. Quiet discomfort. Hope. Not all of them at once — that's a pitch deck, not an email. Pick one and hit it cleanly."));

children.push(h3("3. The shortest possible ask"));
children.push(p("\"Want to see it?\" is three words. That is the ask. Not \"let's hop on a 30-minute call to discuss your digital marketing strategy.\" The lower the friction of the ask, the higher the reply rate. Always."));

children.push(spacer());
children.push(callout(
  "The goal of Email 1 is not to close. It is to get a reply. The goal of the reply is to get a call. The goal of the call is to get a yes. Compress none of these steps. Each one earns the next.",
  C.amber, C.amberBorder, "PRINCIPLE"
));
children.push(spacer());

children.push(h2("What the Prospect Needs to Know (vs. What You Need to Say)"));
children.push(p("There is a gap between these two things that most cold emailers never close."));
children.push(p("What you need to say: \"I built you a homepage. Here is why it matters. Here is what it looks like.\""));
children.push(p("What the prospect needs to know before they can care: \"This person understands my market, my situation, and my problem. They are not wasting my time.\""));
children.push(p("The trigger that unlocks their attention is always recognition — not information. They do not need to know your service before they trust you. They need to feel understood before they can listen."));

children.push(spacer());
children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================
// PART 2: THE PROSPECT DIAGNOSIS SYSTEM
// ============================
children.push(h1("Part 2 — The Prospect Diagnosis System"));
children.push(p("The angle that works is always determined by what you can observe about the prospect before you write. Here is a complete map: what you spot, which angle it triggers, and the emotional mechanism it opens."));
children.push(spacer());

children.push(simpleTable(
  ["What You Can Spot (Observable Signal)", "Angle to Use", "Emotion It Triggers"],
  [
    ["Website exists but looks outdated (pre-2021 design)", "The Credibility Gap — your reputation moved; your site didn't", "Pride + urgency"],
    ["No website at all — just Zillow/brokerage profile", "The Invisible Brand — your referrals are hitting dead air", "Quiet anxiety"],
    ["Great social media, bad or no website", "The Mismatch — their Instagram is beautiful; the site kills the handoff", "Cognitive dissonance"],
    ["Operating as a team inside Compass/Sotheby's/KW/eXp", "Building in Someone Else's House — brokerage owns your SEO equity", "Future fear + ownership"],
    ["Just won an award or got press (Inman, local news, etc.)", "The Moment — their offline reputation just jumped; their site didn't move", "Pride + urgency"],
    ["Luxury listings ($2M+) with a generic-looking site", "The Luxury Signal — the listing is premium; the presence isn't", "Status incongruence"],
    ["Visible dominant competitor in their market", "The Threat — someone specific is taking what should be theirs", "Competitive fear"],
    ["Team leader actively recruiting agents", "The Recruiting Problem — great recruits are deciding before the first call", "Strategic urgency"],
  ],
  [3800, 3200, 2360]
));

children.push(spacer());
children.push(callout(
  "How to research a prospect in under 4 minutes: (1) Google their name — note what shows up first. (2) Open their website — check the copyright year and mobile rendering. (3) Check their Instagram/LinkedIn — if it looks polished, note the contrast. (4) Search their market on Google — see which agents rank above them. (5) Check their brokerage — are they team-brokerage-dependent? That is your angle.",
  C.green, C.greenBorder, "RESEARCH"
));
children.push(spacer());

children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================
// PART 3: EXISTING SEGMENTS (SUMMARY)
// ============================
children.push(h1("Part 3 — Original Segments (Refined)"));
children.push(p("Your existing four segments are structurally correct. Below is a refined version of the key principles for each, plus the sharpest email from each sequence. The full 6-email sequences are in Part 4 (new angles) and the appendix."));
children.push(spacer());

children.push(h2("Segment 1 — Agents with an Outdated Website"));
children.push(callout("Core insight: The gap between how good their listings are and how generic their website looks is the pitch. You do not explain the gap — you just name it and let them feel it.", C.lightBlue, C.blue));
children.push(spacer());
children.push(p("Sharpest email from this sequence — Email 3 (The Quiet Truth):"));
children.push(spacer());
children.push(emailBlock(
  "something no one tells you",
  `{{FirstName}} —

Nobody's going to tell you this, so I will:

There are agents in {{Market}} doing half your volume who are getting calls you should be getting — because they look better online. Not because they're better. Because they invested in how they show up when someone types their name into Google.

That's a fixable problem. I already fixed it for you — at least the homepage.

Want to take a look?

— Amaan`,
  "Email 3 — Day 7 — The Quiet Truth"
));

children.push(spacer());
children.push(h2("Segment 2 — Agents with No Website"));
children.push(callout("Core insight: They think referrals don't require a website. The truth: every referral still gets Googled. What the prospect finds in that Google search is a conversation happening about their brand without them in the room.", C.lightBlue, C.blue));
children.push(spacer());
children.push(p("Sharpest email from this sequence — Email 3 (The Quiet Truth):"));
children.push(spacer());
children.push(emailBlock(
  "honest thought",
  `{{FirstName}} —

You probably think you don't need a website because your business comes from relationships. And you're right — it does.

But here's what I've noticed: every relationship still gets Googled. The referral. The friend-of-a-friend. The past client's colleague. They all search your name before they call.

Right now, that search turns up nothing that you control. That's a conversation someone else is having about your brand — without you in the room.

I designed what should show up. Let me know if you're curious.

— Amaan`,
  "Email 3 — Day 7 — The Quiet Truth"
));

children.push(spacer());
children.push(h2("Segment 3 — Team Leaders (with Website)"));
children.push(callout("Core insight: The team leader's website problem is a recruiting problem, not just a branding problem. Frame it there and you hit them where they feel strategic pressure every week.", C.lightBlue, C.blue));
children.push(spacer());
children.push(p("Sharpest email from this sequence — Email 4 (The Specific Scenario):"));
children.push(spacer());
children.push(emailBlock(
  "imagine this",
  `{{FirstName}} —

A top-producing agent in {{Market}} is quietly unhappy at their current brokerage. They start Googling teams. They find {{TeamName}}.

What happens in the next 8 seconds decides everything. Do they see a team that looks like where elite agents go to grow? Or do they see a site that makes them scroll past to the next option?

You're not losing recruits to better teams. You're losing them to better-looking teams.

I designed a homepage that ends that. Want to see it?

— Amaan`,
  "Email 4 — Day 11 — The Specific Scenario"
));

children.push(spacer());
children.push(h2("Segment 4 — Team Leaders (Brokerage-Dependent, No Standalone Site)"));
children.push(callout("Core insight: They are building brand equity inside someone else's house. The brokerage owns the SEO. If they ever switch — and most eventually do — they start from zero online. This is the angle nobody else is sending them.", C.lightBlue, C.blue));
children.push(spacer());
children.push(p("Sharpest email from this sequence — Email 3 (The Quiet Truth):"));
children.push(spacer());
children.push(emailBlock(
  "something to think about",
  `{{FirstName}} —

Honest question — and I ask this with respect:

If {{TeamName}} ever moves to a different brokerage — or if {{Brokerage}} changes their website format tomorrow — what happens to your online presence?

It disappears. Every page, every listing, every piece of SEO equity your team has built. Gone. Because you don't own any of it. {{Brokerage}} does.

Your own website means your brand exists no matter what. It's yours. Period.

I already designed one for {{TeamName}}. Let me know if you're curious.

— Amaan`,
  "Email 3 — Day 7 — The Quiet Truth"
));

children.push(spacer());
children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================
// PART 4: NEW TRIGGER-BASED SEGMENTS
// ============================
children.push(h1("Part 4 — New Trigger-Based Segments (What Was Missing)"));
children.push(p("These four angles are not in the original playbook. Each one is triggered by a specific, observable signal. They work because the prospect has never received an email calibrated to this exact moment or situation."));
children.push(spacer());

// ---- SEGMENT 5: THE MISMATCH ----
children.push(h2("Segment 5 — The Mismatch (Great Social, Bad Website)"));
children.push(callout("Trigger: Their Instagram or LinkedIn is polished, beautiful, and active. Their website is generic, outdated, or absent. This mismatch is jarring — and they feel it even if they haven't said it out loud.\n\nWhy this works: You're not telling them their website is bad. You're observing that they already know how to build a brand — because their social media proves it. The website is just the one place that hasn't caught up. That's a much easier conversation to open.", C.lightBlue, C.blue));
children.push(spacer());

children.push(emailBlock(
  "your Instagram vs. your website",
  `{{FirstName}} —

Spent a few minutes on your Instagram before reaching out. It's good — really good. The production quality, the way you frame listings, the market content. It's exactly what a serious agent in {{Market}} should look like.

Then I went to your website.

The gap between the two is real. Your Instagram says premium. Your website says 2019.

I redesigned your homepage to close that gap. Want to see it?

— Amaan`,
  "Email 1 — Day 0 — The Notice"
));
children.push(spacer());

children.push(emailBlock(
  "the handoff problem",
  `{{FirstName}} —

Something I think about a lot with agents who have a strong social presence:

The content you put out on Instagram does real work. It builds trust. It shows your market knowledge. It makes people want to work with you before they've even spoken to you.

But then they click through to your website — and the experience drops. Suddenly it doesn't match. The trust you built in 60 seconds of scrolling gets quietly undermined.

The click-through is the handoff. Right now, the handoff is losing you business you already earned.

I designed a homepage that matches what your Instagram already promises.

— Amaan`,
  "Email 2 — Day 3 — The Daily Reality"
));
children.push(spacer());

children.push(emailBlock(
  "the thing your follower count can't fix",
  `{{FirstName}} —

Here's something nobody's going to say out loud:

Your social following is an audience. Your website is a closer.

An audience watches. A closer converts. Right now you're investing heavily in the audience and almost nothing in the closer.

Every serious buyer or seller who finds you on Instagram eventually goes to your website to decide. That's the moment that costs you deals — not the content.

I built the closer. Want to take a look?

— Amaan`,
  "Email 3 — Day 7 — The Quiet Truth"
));
children.push(spacer());

children.push(emailBlock(
  "this happens at the worst moment",
  `{{FirstName}} —

Picture this:

A potential luxury buyer is referred to you. Before calling, they do what everyone does — they look you up. They find your Instagram first. They're impressed. They click the link in your bio.

The website loads. It doesn't match. The energy drops. The confidence drops. They might still call — but they're now comparing you to two other agents they just found.

You won them on Instagram. You lost them on the website.

I designed a homepage that keeps the win. Want to see it?

— Amaan`,
  "Email 4 — Day 11 — The Specific Scenario"
));
children.push(spacer());

children.push(emailBlock(
  "reminded me of someone",
  `{{FirstName}} —

Worked with an agent last year in {{SimilarMarket}}. 12,000 Instagram followers. Posting consistently. Getting DMs from buyers all the time.

But their closing rate on those DMs was terrible. They couldn't figure out why.

When we looked at it together, the pattern was clear: people would DM, go check the website, and then go quiet. The website didn't match the brand they'd built on Instagram. It broke the trust at the wrong moment.

We rebuilt the website. DM conversion improved significantly within the first month.

I designed a homepage that ends that leak for you. Let me know.

— Amaan`,
  "Email 5 — Day 15 — The Story"
));
children.push(spacer());

children.push(emailBlock(
  "last note from me",
  `{{FirstName}} —

Last email. Genuinely.

I noticed your social presence before I reached out because it's actually good. The effort you've put into building a brand on Instagram deserves a website that matches it — not one that quietly undermines it.

I designed one. It's there whenever it matters to you.

Either way — keep doing what you're doing in {{Market}}.

— Amaan`,
  "Email 6 — Day 20 — The Genuine Exit"
));

children.push(spacer());
children.push(divider());

// ---- SEGMENT 6: THE AWARD MOMENT ----
children.push(h2("Segment 6 — The Award / Press Moment"));
children.push(callout("Trigger: They just won a recognition (Top Producer, Five Star Agent, RealTrends ranking, local business award) or got a press mention (Inman, local paper, city magazine). Their offline reputation just moved. Their website didn't.\n\nWhy this works: You're entering at a moment of peak pride. They are more motivated right now to look good than at any other time of the year. The timing is everything — this email lands in the first 2 weeks after the recognition is announced.", C.lightBlue, C.blue));
children.push(spacer());

children.push(emailBlock(
  "the {{Award}} listing",
  `{{FirstName}} —

Saw the {{Award}} recognition — congratulations. That's a legitimate milestone and it's well-earned based on what you've put up in {{Market}}.

One thing I noticed though: your website doesn't reflect it. No mention of the award, no updated positioning, no design that signals you're operating at the level you actually are.

An award like that is a 48-hour window where people are paying attention and searching your name. Right now, what they find doesn't match what you just achieved.

I redesigned your homepage to close that gap. Want to see it?

— Amaan`,
  "Email 1 — Day 0 — The Notice"
));
children.push(spacer());

children.push(emailBlock(
  "what recognition actually does",
  `{{FirstName}} —

Here's the thing about an award like {{Award}} that most agents don't fully use:

It's not just a credential. It's a search event. Every client who heard about it, every agent who saw the announcement, every potential referral partner — they all Google your name in the next week.

What they find when they do that search is either going to reinforce the recognition or quietly undermine it.

I designed a homepage that makes the Google search land right.

— Amaan`,
  "Email 2 — Day 3 — The Daily Reality"
));
children.push(spacer());

children.push(emailBlock(
  "the quiet irony",
  `{{FirstName}} —

Here's something worth sitting with:

You earned {{Award}} because of the work you put in — the calls, the showings, the negotiations, the market knowledge. That's real.

But when someone who doesn't know you yet tries to understand who you are, they go to your website. And right now, your website doesn't tell that story. There's a version of you that exists in your market and a version that exists online — and they don't match.

That's a fixable problem. I already fixed the homepage. Let me know if you want to see it.

— Amaan`,
  "Email 3 — Day 7 — The Quiet Truth"
));
children.push(spacer());

children.push(emailBlock(
  "what a referral sees right now",
  `{{FirstName}} —

Someone hears about your {{Award}} at a dinner party. They pull out their phone and Google you on the spot.

What comes up? Does your website feel like it belongs to the agent who just won {{Award}}? Or does it feel like it was built a few years ago and hasn't been touched since?

That dinner party moment happens more than you think. And right now, the website is either reinforcing the impression or quietly deflating it.

I designed a version that reinforces it. Interested?

— Amaan`,
  "Email 4 — Day 11 — The Specific Scenario"
));
children.push(spacer());

children.push(emailBlock(
  "what one agent did with their ranking",
  `{{FirstName}} —

Worked with an agent last year who made a top producer list in their market. Great achievement — but their website still looked like they were a mid-level agent grinding to break through.

They updated the homepage within two weeks of the announcement. They said the calls they got from it — people citing the ranking, asking to work with them specifically — were different in quality from anything they'd seen before.

Recognition creates a window. The website either opens it wider or keeps it half-closed.

I built the homepage for that window. Let me know.

— Amaan`,
  "Email 5 — Day 15 — The Story"
));
children.push(spacer());

children.push(emailBlock(
  "wrapping up",
  `{{FirstName}} —

Last one from me.

I reached out because the timing felt right — recognition like {{Award}} is a moment worth showing up well for online. I designed a homepage that does that.

If it ever matters, this thread is here.

Congrats again on the recognition. It's clear you've earned it in {{Market}}.

— Amaan`,
  "Email 6 — Day 20 — The Genuine Exit"
));

children.push(spacer());
children.push(divider());

// ---- SEGMENT 7: THE LUXURY SIGNAL ----
children.push(h2("Segment 7 — The Luxury Signal ($2M+ Listings, Generic Presence)"));
children.push(callout("Trigger: They are consistently listing and selling properties at $2M+, but their website looks like every other agent in the market. No premium feel, no photography-forward design, no brand that matches the price points they work at.\n\nWhy this works: You are pointing at a status incongruence they feel but haven't addressed. At this price point, presentation is a professional signal — sellers decide before they meet you. The site is part of the pitch.", C.lightBlue, C.blue));
children.push(spacer());

children.push(emailBlock(
  "the {{HighEndListing}} listing",
  `{{FirstName}} —

The {{HighEndListing}} listing caught my attention — beautiful property, and the way it's positioned in {{Market}} makes sense.

Then I went to your website.

At the price points you're operating at, buyers and sellers are evaluating you before they ever call. They are running a premium test on every agent they consider. Your website right now would not pass that test.

I redesigned your homepage to match the tier you're actually operating at.

Want to see it?

— Amaan`,
  "Email 1 — Day 0 — The Notice"
));
children.push(spacer());

children.push(emailBlock(
  "the listing appointment you don't know you lost",
  `{{FirstName}} —

At the $2M+ level, the listing appointment is not when sellers decide. It's before.

They've Googled you. They've looked at your website. They've compared you to the two other agents they're considering. By the time you walk through the door, they've already formed an impression.

If your website doesn't feel premium — if it doesn't feel like someone who handles assets at this level — you're walking into a conversation where you're already playing catch-up.

I designed a homepage that puts you ahead before you even show up.

— Amaan`,
  "Email 2 — Day 3 — The Daily Reality"
));
children.push(spacer());

children.push(emailBlock(
  "what luxury sellers actually look for",
  `{{FirstName}} —

Here's what I've learned from watching how luxury sellers choose their agent:

They do not lead with price. They lead with trust. And trust, at this level, is built before the first meeting — through referrals, reputation, and online presence.

Your reputation in {{Market}} is real. Your referrals are real. But your online presence is running 2-3 levels below where your business actually operates.

That gap costs you listing appointments you never knew you were being considered for.

I built the fix. Want to see it?

— Amaan`,
  "Email 3 — Day 7 — The Quiet Truth"
));
children.push(spacer());

children.push(emailBlock(
  "a seller running a comparison right now",
  `{{FirstName}} —

A seller in {{Market}} has a $3.5M property they're about to list. They've been referred to three agents. Before they call any of them, they open all three websites.

One looks institutional — heavy, corporate, hard to navigate. One looks like a template from 2020. One is clean, photographic, premium — the design signals that this agent handles properties like theirs every day.

They call the third agent first. The third agent gets the listing.

I designed your homepage to be that third agent's site.

— Amaan`,
  "Email 4 — Day 11 — The Specific Scenario"
));
children.push(spacer());

children.push(emailBlock(
  "what changed for them",
  `{{FirstName}} —

An agent I worked with in {{SimilarMarket}} was doing $15M+ annually. Consistently. But their website looked like a solid mid-market agent — fine, but not luxury.

They started losing listing appointments to an agent who was actually doing less volume but had a website that felt premium. The sellers assumed the other agent was the luxury specialist based on online presence alone.

We rebuilt the site. The agent told me their listing pitch started landing differently within 60 days — not because they changed the pitch, but because sellers were already sold before they walked in.

That's what I built for you. Let me know.

— Amaan`,
  "Email 5 — Day 15 — The Story"
));
children.push(spacer());

children.push(emailBlock(
  "genuine note",
  `{{FirstName}} —

Last email. And I mean it.

I designed a homepage for your brand because the properties you're representing in {{Market}} deserve a presence that matches them. Right now there's a gap. I built something that closes it.

If it's ever the right time, just reply to this thread.

Keep doing what you're doing.

— Amaan`,
  "Email 6 — Day 20 — The Genuine Exit"
));

children.push(spacer());
children.push(divider());

// ---- SEGMENT 8: THE COMPETITOR THREAT ----
children.push(h2("Segment 8 — The Competitor Threat"));
children.push(callout("Trigger: You can see a specific competing agent or team in their market who has a visibly better online presence — modern website, ranking on Google for relevant searches, stronger visual brand. This is the most dangerous angle to use: it works powerfully when done with precision and respect. Done wrong, it reads as a cheap shot. Done right, it reads like someone who did their homework.\n\nRule: Never name the competitor condescendingly. State facts. Let the comparison land on its own.", C.amber, C.amberBorder, "USE WITH CARE"));
children.push(spacer());

children.push(emailBlock(
  "something I noticed in {{Market}}",
  `{{FirstName}} —

Before reaching out, I spent time looking at the agent landscape in {{Market}}.

Your track record stands out. But online, there's a gap between how you show up and how {{CompetitorFirstName}} at {{CompetitorBrokerage}} shows up. Not in terms of real results — in terms of what a buyer or seller sees when they Google agents in your market.

They're getting the first impression you should be getting.

I redesigned your homepage to change that. Want to see it?

— Amaan`,
  "Email 1 — Day 0 — The Notice"
));
children.push(spacer());

children.push(emailBlock(
  "the search that isn't going your way",
  `{{FirstName}} —

Here's something worth knowing:

When a buyer relocating to {{Market}} searches "luxury real estate agent {{Market}}" right now, who shows up?

It's not always the best agent. It's the agent with the best online presence. And right now, {{CompetitorFirstName}}'s site is doing things yours isn't — from the design to the way it's structured for search.

You're not losing to a better agent. You're losing to a better-looking website.

I built the fix. Let me know if you want to see it.

— Amaan`,
  "Email 2 — Day 3 — The Daily Reality"
));
children.push(spacer());

children.push(emailBlock(
  "what the numbers don't show",
  `{{FirstName}} —

Your production numbers in {{Market}} are real. What they don't show up in — at least not yet — is Google.

{{CompetitorFirstName}} isn't outselling you. But they're out-showing you online. And for the buyer or seller who doesn't have a referral, who's starting their search cold, that's the only comparison that matters.

The agents who win those cold inquiries aren't always the most qualified. They're the ones who look the part online first.

I designed a site that lets your actual results do the talking. Interested?

— Amaan`,
  "Email 3 — Day 7 — The Quiet Truth"
));
children.push(spacer());

children.push(emailBlock(
  "the call that went somewhere else",
  `{{FirstName}} —

A relocation buyer is moving to {{Market}} for work. They know no one. They search. They find three agents. They click all three websites.

Two are fine. One — {{CompetitorFirstName}} — has a site that feels like it was built for someone exactly like them. Clean. Current. Confident. They call that agent first. That agent picks up. That agent gets the buyer.

You were one of the three they found. You had the better track record. But the site didn't reflect it.

I designed one that does. Want to see it?

— Amaan`,
  "Email 4 — Day 11 — The Specific Scenario"
));
children.push(spacer());

children.push(emailBlock(
  "a market that shifted",
  `{{FirstName}} —

Talked to an agent in a market similar to {{Market}} last year. Dominant producer. Didn't think much about their website because their referral pipeline was strong.

Then a newer agent in their market launched a premium site and started showing up in every local search. Within a year, the newer agent was capturing the cold inbound that the dominant producer never even knew they were losing.

The dominant producer told me: "I wasn't losing my clients. I was just not getting new ones I didn't know existed."

I built the site that captures those. Let me know.

— Amaan`,
  "Email 5 — Day 15 — The Story"
));
children.push(spacer());

children.push(emailBlock(
  "last email",
  `{{FirstName}} —

Last one from me. No pressure.

I reached out because I saw a gap between what you've built in {{Market}} and how you're showing up online — and I thought I could close it. The homepage I designed is still there if you ever want to see it.

Either way — you're clearly doing real work in that market.

— Amaan`,
  "Email 6 — Day 20 — The Genuine Exit"
));

children.push(spacer());
children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================
// PART 5: SYSTEM & OPERATIONS
// ============================
children.push(h1("Part 5 — System & Operations"));

children.push(h2("The Master Cadence"));
children.push(simpleTable(
  ["Email", "Day", "Angle", "Best Send Time", "Trigger"],
  [
    ["1", "0", "The Notice", "Tue/Wed 7:15 AM (their time)", "First contact"],
    ["2", "3", "The Daily Reality", "8:00 AM (their time)", "No reply"],
    ["3", "7", "The Quiet Truth", "7:30 AM (their time)", "No reply"],
    ["4", "11", "The Specific Scenario", "8:15 AM (their time)", "No reply"],
    ["5", "15", "The Story", "7:00 AM (their time)", "No reply"],
    ["6", "20", "The Genuine Exit", "9:00 AM (their time)", "No reply"],
  ],
  [1000, 800, 2200, 2560, 2800]
));

children.push(spacer());
children.push(callout(
  "Odd send times (7:15, 8:15) look natural. Round times look scheduled. Small detail — meaningful difference in open rates.",
  C.amber, C.amberBorder, "TIP"
));

children.push(spacer());
children.push(h2("How to Match Prospect to Angle"));

children.push(simpleTable(
  ["You Observe This", "Use This Segment"],
  [
    ["Outdated website (pre-2022 design, copyright year)", "Segment 1 — Credibility Gap"],
    ["No website at all", "Segment 2 — Invisible Brand"],
    ["Team leader, has standalone website", "Segment 3 — Team Leader"],
    ["Team living on brokerage page (compass.com/team/...)", "Segment 4 — Building in Someone Else's House"],
    ["Strong Instagram/LinkedIn, weak or no website", "Segment 5 — The Mismatch"],
    ["Recent award, ranking, or press in last 30 days", "Segment 6 — The Award Moment"],
    ["$2M+ listings, generic or dated online presence", "Segment 7 — The Luxury Signal"],
    ["Specific visible competitor outranking them online", "Segment 8 — The Competitor Threat"],
  ],
  [4680, 4680]
));

children.push(spacer());
children.push(h2("Deliverability — Non-Negotiable"));

const delivRules = [
  "No links in Emails 1–5. Email 6 optional. Links trigger spam filters.",
  "Plain text only — no HTML, no images, no logo signatures.",
  "Send from a separate cold domain — never from pinova.in.",
  "Warm up the sending domain for 2–3 weeks before using it for cold outreach.",
  "Cap at 20–25 sends per day per mailbox.",
  "Never copy-paste identical emails to multiple people — always personalize the market, the listing, the specific signal.",
  "Sign as 'Amaan' — not 'Amaan Sheikh, CEO, Pinova.' Person first. Company never.",
];

delivRules.forEach(rule => {
  children.push(new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text: rule, font: "Arial", size: 19, color: C.darkGray })]
  }));
});

children.push(spacer());
children.push(h2("When They Reply — The Call Playbook"));

children.push(h3(`"Sure, let's see it" / "Send it over"`));
children.push(callout(`Reply: "Really glad you're open to it. Honestly, a screenshot won't do it justice — there are interactions, scroll effects, and a mobile version I want to show you. Would [Day] at [Time] or [Time] work for a quick screen share? 10 minutes max. You tell me what you'd change."`, C.lightBlue, C.blue));

children.push(spacer());
children.push(h3(`"How much does this cost?"`));
children.push(callout(`Reply: "Great question — but honestly, I'd rather show you the design first. If it doesn't feel right for your brand, pricing doesn't matter. And if it does, we'll figure out something that works. Got 10 minutes for a screen share this week?"`, C.lightBlue, C.blue));

children.push(spacer());
children.push(h3(`"Not interested right now"`));
children.push(callout(`Reply: "Totally get it. Timing is everything in this business. The design I built for you isn't going anywhere. If anything changes — even 6 months from now — just reply to this thread. Respect your call. Keep killing it in {{Market}}."`, C.lightBlue, C.blue));

children.push(spacer());
children.push(h3("No reply after all 6 emails"));
children.push(callout("Move on. Do not send a 7th. You planted a seed. Some grow in 3 months when they see a competitor with a new site. When that happens, your name is the one they'll remember — if you were the only one who felt like a person, not a pitch.", C.green, C.greenBorder, "RULE"));

children.push(spacer());
children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================
// PART 6: THE PHILOSOPHY IN ONE PAGE
// ============================
children.push(h1("Part 6 — The Philosophy in One Page"));

children.push(simpleTable(
  ["What Most Cold Emails Do", "What These Emails Do"],
  [
    ["Open with 'Hi, I'm X, I do Y'", "Open with their world — their listing, their market, their moment"],
    ["Generic pain point ('need more leads?')", "Specific daily reality they have actually lived"],
    ["Advice they didn't ask for", "Recognition of what they already know but haven't fixed"],
    ["Clever copywriting tactics", "Language that sounds like a real person wrote it at 11 PM"],
    ["Same angle repeated across follow-ups", "6 completely different emotional contexts — each opens a new door"],
    ["'Just following up'", "Each follow-up gives them a new reason to reply"],
    ["Tries to sound impressive", "Tries to sound like someone who actually gives a damn"],
    ["One-size-fits-all template", "Angle determined by what you can observe before you write"],
  ],
  [4680, 4680]
));

children.push(spacer());
children.push(callout(
  "The LinkedIn lesson: posts that got 30,000 impressions with no engagement were about agents. Posts that got 4,000 impressions with hundreds of comments were for agents. They talked about the small, real, daily things nobody else says out loud.\n\nYour emails are the same. Don't write about them. Write for them. When someone reads your email and thinks 'how does this person know what my week looks like?' — that is when they reply.",
  C.amber, C.amberBorder, "THE WHOLE GAME"
));

children.push(spacer(3));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "— End of Playbook —", font: "Arial", size: 20, color: C.mutedText, italics: true })]
}));

// ============================
// BUILD DOCUMENT
// ============================

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  styles: {
    default: {
      document: { run: { font: "Arial", size: 20 } }
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: C.navy },
        paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: C.navy },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 1 }
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("Pinova_Cold_Email_Playbook_Expanded.docx", buffer);
  console.log("Done.");
});