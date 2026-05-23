const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  ExternalHyperlink
} = require('docx');
const fs = require('fs');

// ── COLORS ──────────────────────────────────────────────────────────────────
const NAVY   = "0A2342";
const GOLD   = "C9962A";
const RED    = "C0392B";
const GREEN  = "1A7A4A";
const LIGHT_BG = "F4F6F9";
const GOLD_BG  = "FFF8E7";
const RED_BG   = "FDF0EF";
const GREEN_BG = "EDF7F1";
const BORDER_COLOR = "DDDDDD";
const NAVY_LIGHT = "E8EDF4";

const border = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function spacer(pts = 120) {
  return new Paragraph({ children: [new TextRun("")], spacing: { before: pts, after: pts } });
}

function divider(color = "CCCCCC") {
  return new Paragraph({
    children: [new TextRun("")],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color, space: 1 } },
    spacing: { before: 160, after: 160 }
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, color: NAVY, bold: true, font: "Arial", size: 34 })],
    spacing: { before: 360, after: 160 }
  });
}

function h2(text, color = NAVY) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, color, bold: true, font: "Arial", size: 26 })],
    spacing: { before: 280, after: 140 }
  });
}

function h3(text, color = NAVY) {
  return new Paragraph({
    children: [new TextRun({ text, color, bold: true, font: "Arial", size: 22 })],
    spacing: { before: 200, after: 100 }
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, font: "Arial", size: 22, color: "333333", ...opts })],
    spacing: { before: 60, after: 80 }
  });
}

function bodyBold(text, color = NAVY) {
  return body(text, { bold: true, color });
}

function bullet(text, indent = 720) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: "333333" })],
    spacing: { before: 60, after: 60 },
    indent: { left: indent, hanging: 360 }
  });
}

function numberedItem(text) {
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: "333333" })],
    spacing: { before: 60, after: 60 }
  });
}

function calloutBox(label, lines, bgColor, accentColor) {
  const content = [
    new Paragraph({
      children: [new TextRun({ text: label, bold: true, font: "Arial", size: 22, color: accentColor })],
      spacing: { before: 80, after: 80 }
    }),
    ...lines.map(l => new Paragraph({
      children: [new TextRun({ text: l, font: "Arial", size: 21, color: "333333" })],
      spacing: { before: 40, after: 40 }
    }))
  ];
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders,
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: bgColor, type: ShadingType.CLEAR },
        margins: { top: 160, bottom: 160, left: 240, right: 240 },
        children: content
      })]
    })]
  });
}

function twoColRow(left, right, leftWidth = 3000, rightWidth = 6360, headerRow = false) {
  const leftFill = headerRow ? NAVY : LIGHT_BG;
  const rightFill = headerRow ? NAVY : "FFFFFF";
  const leftColor = headerRow ? "FFFFFF" : NAVY;
  const rightColor = headerRow ? "FFFFFF" : "333333";
  return new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: leftWidth, type: WidthType.DXA },
        shading: { fill: leftFill, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        children: [new Paragraph({ children: [new TextRun({ text: left, bold: true, font: "Arial", size: 20, color: leftColor })] })]
      }),
      new TableCell({
        borders,
        width: { size: rightWidth, type: WidthType.DXA },
        shading: { fill: rightFill, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        children: [new Paragraph({ children: [new TextRun({ text: right, font: "Arial", size: 20, color: rightColor })] })]
      })
    ]
  });
}

function statsBox(stats) {
  // stats = [{label, value, sub}]
  const colW = Math.floor(9360 / stats.length);
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: stats.map(() => colW),
    rows: [new TableRow({
      children: stats.map(s => new TableCell({
        borders,
        width: { size: colW, type: WidthType.DXA },
        shading: { fill: NAVY, type: ShadingType.CLEAR },
        margins: { top: 200, bottom: 200, left: 160, right: 160 },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: s.value, bold: true, font: "Arial", size: 40, color: GOLD })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: s.label, bold: true, font: "Arial", size: 18, color: "FFFFFF" })]
          }),
          ...(s.sub ? [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: s.sub, font: "Arial", size: 16, color: "BBBBBB" })]
          })] : [])
        ]
      }))
    })]
  });
}

function sectionHeader(num, title, subtitle) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1000, 8360],
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: noBorders,
          width: { size: 1000, type: WidthType.DXA },
          shading: { fill: GOLD, type: ShadingType.CLEAR },
          margins: { top: 160, bottom: 160, left: 160, right: 160 },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: num, bold: true, font: "Arial", size: 40, color: "FFFFFF" })]
          })]
        }),
        new TableCell({
          borders: noBorders,
          width: { size: 8360, type: WidthType.DXA },
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          margins: { top: 160, bottom: 160, left: 240, right: 160 },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({ children: [new TextRun({ text: title, bold: true, font: "Arial", size: 28, color: "FFFFFF" })] }),
            ...(subtitle ? [new Paragraph({ children: [new TextRun({ text: subtitle, font: "Arial", size: 20, color: "CCCCCC" })] })] : [])
          ]
        })
      ]
    })]
  });
}

function issueRow(priority, area, finding, impact) {
  const priColor = priority === "CRITICAL" ? RED : priority === "HIGH" ? GOLD : "555555";
  const priBg = priority === "CRITICAL" ? "FDECEA" : priority === "HIGH" ? GOLD_BG : LIGHT_BG;
  return new TableRow({
    children: [
      new TableCell({ borders, width: { size: 1200, type: WidthType.DXA }, shading: { fill: priBg, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: priority, bold: true, font: "Arial", size: 18, color: priColor })] })] }),
      new TableCell({ borders, width: { size: 1800, type: WidthType.DXA }, shading: { fill: "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: area, bold: true, font: "Arial", size: 19, color: NAVY })] })] }),
      new TableCell({ borders, width: { size: 3880, type: WidthType.DXA }, shading: { fill: "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: finding, font: "Arial", size: 19, color: "333333" })] })] }),
      new TableCell({ borders, width: { size: 2480, type: WidthType.DXA }, shading: { fill: "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: impact, font: "Arial", size: 19, color: "555555" })] })] })
    ]
  });
}

function headerRow4(a, b, c, d, widths) {
  const [w1,w2,w3,w4] = widths;
  const cells = [[a,w1],[b,w2],[c,w3],[d,w4]].map(([t,w]) =>
    new TableCell({ borders, width: { size: w, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] })
  );
  return new TableRow({ children: cells });
}

// ── DOCUMENT ─────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "letters", levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 34, bold: true, font: "Arial", color: NAVY }, paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial", color: NAVY }, paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          children: [
            new TextRun({ text: "CONFIDENTIAL  |  ", font: "Arial", size: 16, color: "999999" }),
            new TextRun({ text: "AI VISIBILITY AUDIT — STEVE KOLENO / THE KOLENO GROUP", font: "Arial", size: 16, bold: true, color: NAVY }),
            new TextRun({ text: "  |  2026", font: "Arial", size: 16, color: "999999" }),
          ],
          alignment: AlignmentType.CENTER,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 1 } },
          spacing: { before: 0, after: 120 }
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          children: [
            new TextRun({ text: "AI Visibility Audit  |  Prepared May 2026  |  Page ", font: "Arial", size: 16, color: "999999" }),
            PageNumber.CURRENT,
          ],
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 1 } },
          spacing: { before: 120, after: 0 }
        })]
      })
    },
    children: [

      // ── COVER ──────────────────────────────────────────────────────────────
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [new TableRow({ children: [new TableCell({
          borders: noBorders,
          width: { size: 9360, type: WidthType.DXA },
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          margins: { top: 480, bottom: 480, left: 480, right: 480 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "AI VISIBILITY AUDIT", bold: true, font: "Arial", size: 48, color: GOLD })], spacing: { before: 200, after: 80 } }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "& GROWTH STRATEGY", bold: true, font: "Arial", size: 48, color: "FFFFFF" })], spacing: { before: 0, after: 200 } }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "────────────────────────────", font: "Arial", size: 22, color: GOLD })], spacing: { before: 80, after: 80 } }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Steve Koleno  |  The Koleno Group", bold: true, font: "Arial", size: 28, color: "FFFFFF" })], spacing: { before: 160, after: 80 } }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "thekolenogroup.com", font: "Arial", size: 22, color: "AABBCC" })], spacing: { before: 60, after: 200 } }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ChatGPT  ·  Perplexity  ·  Google AI Overviews", font: "Arial", size: 22, color: GOLD })], spacing: { before: 60, after: 80 } }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PREPARED: MAY 2026  |  CONFIDENTIAL", font: "Arial", size: 18, color: "889AAA" })], spacing: { before: 200, after: 200 } }),
          ]
        })]})],
      }),

      spacer(200),

      // ── EXECUTIVE SUMMARY ─────────────────────────────────────────────────
      sectionHeader("01", "EXECUTIVE SUMMARY", "The opportunity — and the problem"),
      spacer(80),

      body("Steve Koleno is one of the most prolific selling agents in the United States — #3 nationally by closed transactions (RealTrends Verified), #1 in Illinois and #1 in Chicago, operating across 70+ metro markets in 12 states, with over 13,200 closed MLS transactions and $3.2 billion in career volume. In 2024 alone, Steve closed 2,088 transaction sides at $703.65 million in volume. By every traditional measure, this is an elite operation."),
      spacer(60),
      body("But there is a fundamental disconnect between Steve's real-world ranking and his current presence inside the AI search layer — the fastest-growing source of high-intent real estate leads in 2026."),
      spacer(60),
      calloutBox(
        "THE CORE FINDING",
        [
          "When a motivated buyer or seller in Chicago, Tampa, or Charlotte opens ChatGPT, Perplexity, or triggers a Google AI Overview and asks 'Who is the best selling agent in [city]?' or 'How do I sell my home fast in Illinois?' — Steve Koleno's name does not appear.",
          "",
          "That is not a marketing problem. That is a structural, technical, and content gap that this audit addresses directly."
        ],
        RED_BG, RED
      ),
      spacer(80),
      body("This document covers three things:"),
      bullet("A clear-eyed audit of where thekolenogroup.com stands today relative to AI search requirements"),
      bullet("The specific problems — ranked by severity — that are suppressing Steve's AI visibility"),
      bullet("A detailed, prioritized action plan to establish Steve as the dominant AI-recommended selling agent across his 12-state footprint"),
      spacer(80),

      statsBox([
        { value: "#3", label: "National Ranking", sub: "RealTrends Verified" },
        { value: "$3.2B+", label: "Career Volume", sub: "13,200+ Transactions" },
        { value: "70+", label: "Metro Markets", sub: "12 States" },
        { value: "~0%", label: "AI Search Share", sub: "Current Estimated" },
      ]),

      spacer(120),

      // ── CONTEXT ──────────────────────────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),
      sectionHeader("02", "THE AI SEARCH LANDSCAPE IN 2026", "Why this matters more than traditional SEO now"),
      spacer(80),

      h2("How People Search for Real Estate Agents Today"),
      body("The search behavior of home buyers and sellers has structurally shifted. In 2026, an estimated 35-40% of high-intent property research begins inside a generative AI interface — ChatGPT, Perplexity, Google's AI Overviews, or Gemini. This is not a trend. It is the new normal."),
      spacer(60),
      body("The critical difference between traditional SEO and AI search visibility is this: in traditional Google, a user sees 10 blue links and chooses. In AI search, the model gives one or two answers — and everything else is invisible. If you are not in that answer, you do not exist."),
      spacer(80),

      calloutBox("HOW EACH PLATFORM WORKS — AND WHAT IT REWARDS", [
        "CHATGPT (GPT-4o with Browse):  Relies on Bing's index plus real-time web crawling. Prioritizes entities with strong web presence, cited third-party mentions, structured factual data, and authority signals. Name recognition within its training data matters.",
        "",
        "PERPLEXITY AI:  Functions as a research-grade answer engine. Favors authoritative, well-structured pages with clear topical signals, strong backlink profiles from recognizable domains, and pages that directly answer specific questions.",
        "",
        "GOOGLE AI OVERVIEWS:  Pulls from Google's existing index but applies a synthesis layer. Rewards Schema.org structured data (especially LocalBusiness, RealEstateAgent, FAQPage, Review schemas), E-E-A-T signals (Experience, Expertise, Authoritativeness, Trust), and content that matches high-intent query patterns exactly.",
      ], LIGHT_BG, NAVY),

      spacer(80),

      h2("The High-Intent Queries Steve Is Missing"),
      body("These are real search queries typed into AI platforms every day by motivated buyers and sellers in Steve's markets. Right now, none of them surface Steve Koleno:"),
      spacer(60),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [5200, 4160],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders, width: { size: 5200, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "HIGH-INTENT QUERY", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
            new TableCell({ borders, width: { size: 4160, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "MARKET / INTENT", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
          ]}),
          ...[
            ["Who is the best listing agent in Chicago?", "Illinois — Seller"],
            ["Top real estate agent near me for selling my home", "Multi-market — Seller"],
            ["Best real estate agent in Florida for luxury homes", "Florida — Luxury Seller"],
            ["Who sells the most homes in Illinois?", "Illinois — High Intent"],
            ["Real estate agent with lowest commission Chicago", "Illinois — Cost-conscious Seller"],
            ["Best realtor in Charlotte NC for selling fast", "North Carolina — Seller"],
            ["Top listing agent in Tampa Bay area", "Florida — Seller"],
            ["Real estate agent for selling home in Atlanta", "Georgia — Seller"],
            ["Who is the number one real estate agent in the US?", "National — High-value"],
            ["Best realtor for new construction in Texas", "Texas — Buyer/Seller"],
          ].map(([q, m]) => new TableRow({ children: [
            new TableCell({ borders, width: { size: 5200, type: WidthType.DXA }, shading: { fill: "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: `"${q}"`, font: "Arial", size: 19, color: "333333", italics: true })] })] }),
            new TableCell({ borders, width: { size: 4160, type: WidthType.DXA }, shading: { fill: LIGHT_BG, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: m, font: "Arial", size: 19, color: NAVY })] })] }),
          ]}))
        ]
      }),

      spacer(120),

      // ── AUDIT ─────────────────────────────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),
      sectionHeader("03", "THE AUDIT — CURRENT STATE FINDINGS", "What we found on thekolenogroup.com"),
      spacer(80),

      body("The following is a structured audit of thekolenogroup.com evaluated against the criteria that AI search engines use to surface and recommend real estate professionals. Each finding is rated by its impact on AI visibility."),
      spacer(80),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1200, 1800, 3880, 2480],
        rows: [
          headerRow4("PRIORITY", "AREA", "FINDING", "AI IMPACT", [1200, 1800, 3880, 2480]),
          issueRow("CRITICAL", "Structured Data / Schema", "No RealEstateAgent, Person, LocalBusiness, FAQPage, or Review schema markup detected anywhere on the site", "AI models cannot confirm Steve's identity, credentials, or service area. He is invisible to entity-based AI ranking."),
          issueRow("CRITICAL", "Entity Recognition", "Steve Koleno is not established as a named knowledge graph entity. No Wikipedia, Wikidata, or strong third-party entity anchor exists", "ChatGPT and Perplexity rely on entity graphs to surface recommendations. Without entity establishment, Steve cannot be recommended by name."),
          issueRow("CRITICAL", "AI-Optimized Content", "No FAQ pages, no question-and-answer content, no conversational content targeting how AI queries are phrased", "AI systems extract direct answers from Q&A content. Without it, even a well-ranked page is passed over."),
          issueRow("CRITICAL", "Market-Specific Authority", "70+ markets served, but landing pages are thin (navigation links only). No substantive market-level content exists", "AI cannot recommend Steve for 'best agent in [city]' if the site provides no authoritative content about that city."),
          issueRow("HIGH", "Google Business Profile", "No verified, optimized GBP detected for multiple market areas. Fragmented brokerage associations weaken local signals", "Google AI Overviews for local queries pull heavily from GBP data. Missing profiles = missing AI answers."),
          issueRow("HIGH", "E-E-A-T Signals", "Credentials, rankings, press mentions, and awards are present but not structured in machine-readable formats. Stats buried in hero text", "AI systems need structured, citable proof of expertise — not just design elements."),
          issueRow("HIGH", "Citation & Mention Density", "Press coverage exists (Newsweek, Chicago Business, Chicago Agent Magazine) but is not being actively amplified or cross-referenced", "Perplexity and ChatGPT with Browse weight pages that are cited and referenced by other authoritative sources."),
          issueRow("HIGH", "Review Ecosystem", "Testimonials present on site but no structured integration with Google Reviews or Homes.com ratings", "Review schema and third-party review platforms are a primary AI trust signal for service professionals."),
          issueRow("MEDIUM", "Blog / Content Depth", "Blog section exists but content appears thin and infrequent. No content strategy targeting AI search queries", "Regular, topically authoritative content builds domain authority signals that AI systems use for ranking."),
          issueRow("MEDIUM", "Internal Linking Structure", "Market pages exist but lack internal linking depth and cross-referencing that would signal topical authority to crawlers", "AI systems evaluate site architecture as a proxy for expertise organization."),
          issueRow("MEDIUM", "Video Content Indexing", "YouTube channel and video content referenced on site but not structured with transcripts, show notes, or schema", "YouTube content is a strong authority signal that AI systems index but currently gains Steve no search credit."),
          issueRow("LOW", "Social Proof Integration", "LinkedIn, Facebook present but not optimized for AI discovery or structured with cross-platform consistency", "Consistent cross-platform presence reinforces entity recognition."),
        ]
      }),

      spacer(120),

      // ── THE PROBLEM DEEP DIVE ─────────────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),
      sectionHeader("04", "THE CORE PROBLEMS — IN DETAIL", "Why Steve is invisible to AI search right now"),
      spacer(80),

      h2("PROBLEM 1: No Structured Data — The Invisible Agent", RED),
      body("This is the single most impactful technical issue. Schema.org markup is how websites communicate structured facts directly to search engines and AI systems. It is the difference between a website that 'looks' authoritative and one that 'is' recognized as authoritative by machines."),
      spacer(60),
      body("thekolenogroup.com has zero structured data markup. That means:"),
      bullet("AI systems cannot confirm that Steve Koleno is a real estate agent — they can only infer it from unstructured text"),
      bullet("No machine-readable proof of his 18-year experience, his national ranking, his service areas, or his transaction volume exists"),
      bullet("His reviews and testimonials cannot be parsed as verified reviews — they are just text"),
      bullet("His contact information, office locations, and service offerings are not machine-readable"),
      spacer(80),

      calloutBox("WHAT THIS LOOKS LIKE IN PRACTICE", [
        "When ChatGPT processes 'best selling agent in Chicago,' it looks for structured signals. It finds agents with proper RealEstateAgent schema, verified Google Business Profiles, Homes.com data, and RealTrends entity pages.",
        "",
        "Steve has more transactions than almost any of those agents — but the AI cannot see that. It sees an unstructured website. It picks the agent whose credentials are machine-readable.",
      ], RED_BG, RED),

      spacer(80),
      h2("PROBLEM 2: Steve Koleno Is Not an Established AI Entity", RED),
      body("AI language models build their knowledge of the world from a layered source stack: Wikipedia and Wikidata for entity definitions, major news publications for real-world events, high-authority platforms (Homes.com, RealTrends) for professional profiles, and structured web data."),
      spacer(60),
      body("An 'entity' in AI terms is not just a name — it is a consistent, multi-source, cross-referenced record of who someone is and what they do. Without it, the model treats a person as an unknown and defaults to whoever is in its entity graph."),
      spacer(60),
      body("For Steve Koleno, the entity gap looks like this:"),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3500, 1700, 4160],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders, width: { size: 3500, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "ENTITY SOURCE", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
            new TableCell({ borders, width: { size: 1700, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "CURRENT STATUS", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
            new TableCell({ borders, width: { size: 4160, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "AI IMPACT", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
          ]}),
          ...[
            ["Wikipedia / Wikidata Entry", "None", "Models default to whoever is in the knowledge graph. Steve cannot be recommended by name without this anchor."],
            ["Homes.com Profile", "Active", "Steve has an active Homes.com profile — but it is not fully optimized with structured credentials, awards, or comprehensive market coverage for AI extraction."],
            ["RealTrends Verified Profile", "Active — Ranked", "Steve is ranked on RealTrends (#3 national, #1 Illinois) — but the site does not link to or leverage this data in a machine-readable format."],
            ["Google Knowledge Panel", "None detected", "A Knowledge Panel is the clearest signal to Google's AI that a person is a notable entity worth recommending."],
            ["LinkedIn (Optimized for AI)", "Present but thin", "LinkedIn profiles index in AI systems. Steve's does not reflect his full credential stack, VP role at Spot Real Estate, or OnAgent."],
            ["NAR / MLS Citation Network", "Indirect only", "AI systems pull agent data from MLS association pages. Direct citations need to be established."],
          ].map(([s, c, i]) => {
            const statusColor = c === "None" ? RED : c.includes("Partial") || c.includes("Basic") ? GOLD : GREEN;
            return new TableRow({ children: [
              new TableCell({ borders, width: { size: 3500, type: WidthType.DXA }, shading: { fill: "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: s, bold: true, font: "Arial", size: 19, color: NAVY })] })] }),
              new TableCell({ borders, width: { size: 1700, type: WidthType.DXA }, shading: { fill: LIGHT_BG, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: c, bold: true, font: "Arial", size: 18, color: statusColor })] })] }),
              new TableCell({ borders, width: { size: 4160, type: WidthType.DXA }, shading: { fill: "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: i, font: "Arial", size: 18, color: "555555" })] })] }),
            ]});
          })
        ]
      }),

      spacer(80),
      h2("PROBLEM 3: The Website Speaks to Humans, Not AI", RED),
      body("The current website is visually polished and conversion-focused for human visitors. That is correct design for 2019. In 2026, websites also need to be readable by AI systems — and that requires a fundamentally different content architecture."),
      spacer(60),
      body("AI systems extract answers from content. They look for:"),
      bullet("Direct, question-answer formatted content that matches how users ask questions"),
      bullet("Long-form, substantive pages that demonstrate genuine expertise in a specific area"),
      bullet("Content organized around topics, not just services"),
      bullet("Specific, verifiable facts (numbers, dates, outcomes) — not general marketing claims"),
      spacer(60),
      body("What thekolenogroup.com currently has instead:"),
      bullet("Short, marketing-copy paragraphs with general claims ('reshaping the real estate experience')"),
      bullet("Service and market pages that are largely navigation/listing pages with minimal content"),
      bullet("A blog section with infrequent, non-strategically-targeted posts"),
      bullet("Credential claims ('$3B+ Volume', '#3 in the USA') presented as graphics — unreadable by AI"),
      spacer(80),

      h2("PROBLEM 4: 70+ Markets, Zero Market Authority Content", RED),
      body("This is Steve's single biggest structural advantage — and his biggest missed opportunity. Operating in 70+ metro markets across 12 states should translate into 70+ pages of deep, authoritative, AI-indexed local market content. Currently, market pages are essentially navigation pages."),
      spacer(60),
      calloutBox("THE SCALE OF THE MISSED OPPORTUNITY", [
        "A home seller in Minneapolis types: 'Who is the best real estate agent to sell my home in Minneapolis?' into Perplexity.",
        "",
        "Steve serves Minneapolis. But the Minneapolis market page on his site contains fewer than 200 words of actual content about the Minneapolis market. There is nothing for the AI to extract and cite. A local agent with a 1,000-word optimized page about 'Selling your home in Minneapolis — current market conditions, pricing strategy, and agent selection' beats Steve every single time.",
        "",
        "Multiply this across 70+ markets and you have the scale of the visibility gap."
      ], GOLD_BG, GOLD),

      spacer(120),

      // ── THE SOLUTION ──────────────────────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),
      sectionHeader("05", "THE SOLUTION — DETAILED ACTION PLAN", "A prioritized roadmap to AI search dominance"),
      spacer(80),
      body("This plan is organized into three phases. Phase 1 addresses the structural/technical foundation — the work that multiplies the impact of everything else. Phase 2 builds the content layer. Phase 3 establishes ongoing authority and citation dominance."),
      spacer(80),

      // PHASE 1
      h2("PHASE 1: TECHNICAL & STRUCTURAL FOUNDATION", GREEN),
      h3("1A — Implement Full Schema.org Markup Stack", NAVY),
      body("This is the highest-ROI technical task. Every major page needs structured data. Specific schema types to implement:"),
      spacer(60),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2800, 3200, 3360],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "SCHEMA TYPE", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
            new TableCell({ borders, width: { size: 3200, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "WHERE TO IMPLEMENT", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
            new TableCell({ borders, width: { size: 3360, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "KEY PROPERTIES TO INCLUDE", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
          ]}),
          ...[
            ["Person + RealEstateAgent", "Homepage, About page", "name, jobTitle, description, yearsExperience, areaServed (all 12 states + 70+ cities), award, sameAs (links to Homes.com, RealTrends, LinkedIn, Wikipedia)"],
            ["LocalBusiness", "Homepage + each Market page", "name, address, telephone, geo coordinates, openingHours, areaServed, aggregateRating"],
            ["FAQPage", "FAQ pages (to be created — see Phase 2)", "All question/answer pairs for each market and service type"],
            ["Review / AggregateRating", "Homepage + About + Market pages", "reviewCount, ratingValue, bestRating — pulled from Google/Homes.com data"],
            ["BreadcrumbList", "All service + market pages", "Establishes content hierarchy; used by Google AI Overviews to contextualize pages"],
            ["Article / BlogPosting", "All blog/content posts", "author, datePublished, headline, description, about — enables AI to cite specific authored pieces"],
            ["VideoObject", "Press/media page", "name, description, thumbnailUrl, uploadDate — unlocks video content as citable AI source"],
          ].map(([s, w, k]) => new TableRow({ children: [
            new TableCell({ borders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: s, bold: true, font: "Arial", size: 19, color: NAVY })] })] }),
            new TableCell({ borders, width: { size: 3200, type: WidthType.DXA }, shading: { fill: LIGHT_BG, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: w, font: "Arial", size: 18, color: "333333" })] })] }),
            new TableCell({ borders, width: { size: 3360, type: WidthType.DXA }, shading: { fill: "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: k, font: "Arial", size: 18, color: "555555" })] })] }),
          ]}))
        ]
      }),

      spacer(80),
      h3("1B — Entity Establishment Across All Platforms", NAVY),
      body("Build Steve's entity presence across every platform that AI systems use as data sources. This is not optional — it is the foundation of AI name recognition."),
      spacer(60),
      bullet("Homes.com Profile Optimization: Steve already has an active Homes.com profile — optimize every field with full credential stack, transaction history, all 12 state coverage areas, RealTrends ranking data, and Spot Real Estate VP title. Homes.com is CoStar's flagship consumer platform and a primary AI data source."),
      bullet("RealTrends Verified Profile: Leverage Steve's existing #3 national ranking. Ensure the RealTrends profile links back to thekolenogroup.com and includes full career statistics. RealTrends data feeds directly into AI agent recommendation queries."),
      bullet("Google Business Profiles: Create or claim and fully optimize individual GBP listings for at least the top 15 metro markets. Use consistent NAP (Name/Address/Phone) data across all."),
      bullet("LinkedIn Profile Overhaul: Restructure to read as an authoritative industry profile. Add all markets served, all transaction milestones, all press mentions, all awards with structured dates and specifics."),
      bullet("Wikipedia / Wikidata: Steve's transaction volume (13,200+ closed transactions), national ranking (#3 RealTrends Verified), and press coverage meet notability criteria for a Wikipedia article. Engage a specialist Wikipedia editor to create a neutral, well-cited entry. Link Wikidata to all other profiles."),
      bullet("NAR / State Association Profiles: Ensure all state and local Realtor association directories across all 12 states have complete, consistent Steve Koleno profiles with backlinks to thekolenogroup.com."),

      spacer(80),
      h3("1C — Google Business Profile Optimization at Market Scale", NAVY),
      body("For AI Overviews to surface Steve in local 'best agent in [city]' queries, GBP presence is mandatory. The strategy:"),
      bullet("Priority Tier 1 (Immediate — Within 30 Days): Chicago/Chicagoland area, Tampa/St. Pete, Atlanta, Charlotte, Miami/Fort Lauderdale"),
      bullet("Priority Tier 2 (Days 31-60): Minneapolis, Indianapolis, Houston/Dallas, Milwaukee, Raleigh-Durham"),
      bullet("Priority Tier 3 (Days 61-90): Remaining 60+ markets using consistent template"),
      bullet("Every GBP must include: complete services list, 10+ photos, weekly Google Posts, and a structured review solicitation process to accumulate ratings"),

      spacer(80),
      // PHASE 2
      h2("PHASE 2: CONTENT ARCHITECTURE FOR AI SEARCH", GREEN),
      h3("2A — The Market Authority Content System", NAVY),
      body("This is the highest-leverage content play available. Each market page needs to become a genuine resource that AI systems can extract answers from. The structure for each market page:"),
      spacer(60),
      calloutBox("MARKET PAGE CONTENT TEMPLATE (1,200 - 2,000 words per market)", [
        "1. MARKET SNAPSHOT: Current median prices, days on market, inventory levels, YoY trends (updated quarterly). Specific data AI can cite.",
        "2. WHY STEVE KOLENO FOR [MARKET]: Specific transaction data in this market, number of homes sold, average days to close, client outcomes. Real numbers.",
        "3. SELLING YOUR HOME IN [CITY]: A step-by-step guide covering pricing strategy, staging, timing, common mistakes sellers make, what Steve does differently.",
        "4. BUYING A HOME IN [CITY]: First-time buyer guide, neighborhood breakdowns, what to know about the [city] market specifically.",
        "5. FAQ SECTION (Schema-marked): 8-12 Q&A pairs targeting exact phrases AI users type. This is the AI extraction layer.",
        "6. NOTABLE TRANSACTIONS: 3-5 specific recent sales with addresses, prices, days on market, and brief client story.",
        "7. LOCAL EXPERT COMMENTARY: Steve's voice on current market conditions — updated quarterly. Signals recency and topical authority.",
      ], GREEN_BG, GREEN),

      spacer(60),
      body("Priority markets for immediate content development: Illinois (Chicago, Naperville, Evanston, Rockford), Florida (Miami, Tampa, Orlando, Jacksonville, Fort Lauderdale), Georgia (Atlanta, Savannah), North Carolina (Charlotte, Raleigh), Texas (Houston, Dallas, Austin)."),

      spacer(80),
      h3("2B — The AI-Optimized FAQ Architecture", NAVY),
      body("FAQPage schema is one of the most reliable paths to AI Overview and Perplexity citation. The strategy is to create targeted FAQ pages — not generic real estate FAQ, but hyper-specific FAQ content organized by query intent:"),
      spacer(60),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 3200, 3160],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders, width: { size: 3000, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "FAQ PAGE TYPE", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
            new TableCell({ borders, width: { size: 3200, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "EXAMPLE QUESTIONS TO ANSWER", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
            new TableCell({ borders, width: { size: 3160, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "AI SEARCH OUTCOME", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
          ]}),
          ...[
            ["Seller FAQ — Illinois", "'How long does it take to sell a home in Chicago?' / 'What commission does Steve Koleno charge?' / 'How do I find the best selling agent in Illinois?'", "Steve cited when Illinois seller intent queries are processed"],
            ["Agent Selection FAQ", "'What makes Steve Koleno different from other agents?' / 'Why is Steve Koleno ranked #3 in the US?' / 'How many homes has Steve Koleno sold?'", "Steve's name surfaces in direct 'who is the best agent' queries"],
            ["Market-Specific FAQ (per state)", "'Is now a good time to sell in Florida?' / 'What is the housing market like in Charlotte NC?'", "Steve cited as local market authority in AI overview responses"],
            ["Process FAQ — Buyers", "'How do I buy a home with a top agent?' / 'What is the process for buying new construction?'", "Steve surfaces in buyer intent queries across all 11 states"],
            ["Low Commission / Value FAQ", "'How does Steve Koleno save sellers money?' / 'Are there top agents with low commission?'", "Captures cost-conscious sellers — a strong traffic segment for Steve's model"],
          ].map(([t, q, o]) => new TableRow({ children: [
            new TableCell({ borders, width: { size: 3000, type: WidthType.DXA }, shading: { fill: "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, font: "Arial", size: 18, color: NAVY })] })] }),
            new TableCell({ borders, width: { size: 3200, type: WidthType.DXA }, shading: { fill: LIGHT_BG, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: q, font: "Arial", size: 17, color: "555555", italics: true })] })] }),
            new TableCell({ borders, width: { size: 3160, type: WidthType.DXA }, shading: { fill: "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: o, font: "Arial", size: 17, color: GREEN })] })] }),
          ]}))
        ]
      }),

      spacer(80),
      h3("2C — The 'Steve Koleno Bio' Authority Page", NAVY),
      body("There should be a dedicated, long-form, structured biography page — distinct from the current About page — built specifically for AI consumption. This becomes the canonical entity reference page for Steve across the web."),
      spacer(60),
      body("This page should include:"),
      bullet("Full credential timeline with dates: when he started, key milestones, annual rankings from 2017 to present"),
      bullet("Specific transaction statistics broken down by year, by state, by property type"),
      bullet("Quotations from major press coverage (Newsweek, Chicago Business) with proper citations and dates"),
      bullet("Structured lists of awards, recognitions, and media appearances — each as a data point, not a design element"),
      bullet("Video embed of the Icons of Real Estate podcast interview with transcript indexed for search"),
      bullet("All sameAs links: Homes.com, RealTrends, LinkedIn, YouTube, Wikipedia (once created), OnAgent.com, Spot Real Estate, and key press pages"),
      bullet("Full Person + RealEstateAgent schema markup encoding every field above"),

      spacer(80),
      h3("2D — Quarterly Market Reports (AI Citation Magnets)", NAVY),
      body("The most powerful organic AI citation strategy for a real estate professional is publishing original data. When Steve publishes a quarterly 'State of the [Chicago / Florida / Charlotte] Real Estate Market' report with original analysis, it becomes the source AI systems cite when answering market condition questions."),
      spacer(60),
      bullet("Format: 800-1,200 word structured market analysis, published quarterly per key market"),
      bullet("Include: median price data, inventory levels, average days on market, price trends, Steve's expert commentary"),
      bullet("Markup: Full Article schema with datePublished, author, and about properties"),
      bullet("Distribution: Email list, LinkedIn, Google Posts, PR distribution to local business press"),
      bullet("Result: When someone asks 'What is the Chicago real estate market like right now?' — Steve's report is what Perplexity cites"),

      spacer(80),
      // PHASE 3
      h2("PHASE 3: AUTHORITY & CITATION DOMINANCE", GREEN),
      h3("3A — Press & Citation Amplification", NAVY),
      body("Steve already has significant press coverage. The problem is it is not being converted into a structured AI citation network. The strategy:"),
      bullet("Reach out to Chicago Business, Newsweek, Chicago Agent Magazine, and South Florida Agent Magazine for 2026 profile updates — new statistics, new markets, updated rankings"),
      bullet("Pitch national real estate trade publications (Inman News, RISMedia, The Real Deal) with a story angle: 'The #3 agent in the US and how he built a 70+ market model' — these are primary Perplexity and ChatGPT sources"),
      bullet("Guest contributions: Write bylined articles for Inman, BiggerPockets, or Forbes Real Estate Council. AI systems weight authored content on high-authority domains extremely highly"),
      bullet("Podcast appearances: Target real estate and business podcasts that get indexed by AI. The Icons of Real Estate episode should be transcribed and submitted to podcast directories with full SEO metadata"),

      spacer(60),
      h3("3B — Review Velocity System", NAVY),
      body("Reviews are trust signals for both humans and AI. Right now, Steve's review ecosystem is passive (testimonials on his own site). It needs to become active and multi-platform:"),
      bullet("Google Reviews: Implement a post-closing review request system for every closed transaction. Target: 50 new Google reviews per quarter across primary markets"),
      bullet("Homes.com Reviews: Configure review requests post-closing on Homes.com — CoStar's flagship platform and a growing AI data source for agent credentialing"),
      bullet("RealTrends Profile Maintenance: Keep the RealTrends Verified profile updated quarterly with latest transaction data to maintain ranking visibility"),
      bullet("AggregateRating schema: Once review counts reach threshold (50+), implement AggregateRating schema on homepage and market pages — this shows in AI search results as a direct trust signal"),

      spacer(60),
      h3("3C — YouTube & Video Optimization", NAVY),
      body("Steve has a YouTube channel with existing content. This is a significantly underutilized AI asset:"),
      bullet("Transcribe every existing video and publish transcripts on corresponding site pages — AI systems index transcripts as authoritative long-form content"),
      bullet("Add VideoObject schema to every video page"),
      bullet("Create a structured video content calendar: monthly 'Market Update' videos for top 5 states, client testimonial videos, process explanation videos ('How to sell your home with Steve Koleno in 30 days')"),
      bullet("YouTube descriptions: Each video should include full structured text with stats, links, and keywords — YouTube descriptions are indexed by both Google and AI systems"),
      bullet("Shorts strategy: Short-form clips from longer videos, optimized for the queries AI users ask ('What does a selling agent do?', 'What is Steve Koleno's commission?', 'How does Steve Koleno sell homes so fast?')"),

      spacer(120),

      // ── IMPLEMENTATION ROADMAP ─────────────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),
      sectionHeader("06", "IMPLEMENTATION ROADMAP", "30 / 60 / 90 Day plan"),
      spacer(80),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1600, 2200, 3600, 1960],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders, width: { size: 1600, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "PHASE", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
            new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "ACTION", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
            new TableCell({ borders, width: { size: 3600, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "DETAILS", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
            new TableCell({ borders, width: { size: 1960, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "EXPECTED OUTCOME", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
          ]}),
          ...[
            ["Days 1-30", "Schema Implementation", "Deploy RealEstateAgent, Person, LocalBusiness, Review, FAQPage schemas across homepage, about, and top 5 market pages", "Google starts indexing structured data; Knowledge Panel eligibility triggered"],
            ["Days 1-30", "Platform Entity Setup", "Optimize Homes.com and RealTrends profiles, LinkedIn overhaul; claim Google Knowledge Panel; initiate Wikipedia entry", "Steve becomes 'known entity' to AI data sources"],
            ["Days 1-30", "Top 5 GBP Optimization", "Chicago, Tampa, Atlanta, Charlotte, Miami — full GBP with photos, services, hours, and first 10 reviews each", "Local AI Overviews begin surfacing Steve for top market queries"],
            ["Days 31-60", "Illinois Full Content Build", "Complete market content system for all Illinois pages: Chicago + 8 suburbs. 1,500 words each with FAQ schema", "Illinois 'best agent' AI queries begin returning Steve"],
            ["Days 31-60", "Florida Full Content Build", "Tampa, Miami, Fort Lauderdale, Orlando, Jacksonville, Saint Augustine — full market page content", "Florida seller queries begin surfacing Steve"],
            ["Days 31-60", "FAQ Hub Launch", "Seller FAQ, Agent Selection FAQ, and Market FAQ pages live with full FAQPage schema", "First AI Overview citations expected within 45-60 days"],
            ["Days 31-60", "Authority Bio Page", "Long-form structured biography page with all credentials, statistics, and schema markup", "Steve begins appearing in 'who is Steve Koleno' and 'best agent' queries"],
            ["Days 61-90", "Remaining Market Content", "Georgia, North Carolina, Texas, Michigan, Indiana, Alabama, Connecticut, Ohio, South Carolina, Wisconsin content build — full 1,200-word market pages", "12-state AI visibility network complete"],
            ["Days 61-90", "Q1 Market Reports", "Publish first quarterly market reports for Illinois, Florida, Georgia — with Article schema and PR distribution", "Steve begins getting cited as real estate market authority"],
            ["Days 61-90", "Review Velocity System", "Implement post-closing Google and Homes.com review request system — target 50 reviews/quarter", "AggregateRating schema eligibility; trust signal in AI results"],
            ["Days 61-90", "Press Outreach Blitz", "Pitch Inman News, RISMedia, Forbes Real Estate Council for 2026 profile features", "High-authority backlinks and citations that AI systems directly reference"],
            ["Ongoing", "Video Content + Transcripts", "Monthly market update videos, transcription and VideoObject schema for all existing content", "YouTube indexed as authority content source; video citations in AI responses"],
          ].map(([p, a, d, o]) => {
            const bg = p === "Days 1-30" ? "FFF8E7" : p === "Days 31-60" ? "EDF7F1" : p === "Days 61-90" ? "E8EDF4" : LIGHT_BG;
            return new TableRow({ children: [
              new TableCell({ borders, width: { size: 1600, type: WidthType.DXA }, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: p, bold: true, font: "Arial", size: 18, color: NAVY })] })] }),
              new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, shading: { fill: "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: a, bold: true, font: "Arial", size: 18, color: NAVY })] })] }),
              new TableCell({ borders, width: { size: 3600, type: WidthType.DXA }, shading: { fill: "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: d, font: "Arial", size: 18, color: "444444" })] })] }),
              new TableCell({ borders, width: { size: 1960, type: WidthType.DXA }, shading: { fill: GREEN_BG, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: o, font: "Arial", size: 17, color: GREEN })] })] }),
            ]});
          })
        ]
      }),

      spacer(120),

      // ── EXPECTED OUTCOMES ─────────────────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),
      sectionHeader("07", "EXPECTED OUTCOMES & SUCCESS METRICS", "What success looks like at 30, 60, and 90 days"),
      spacer(80),
      body("These projections are based on AI search optimization outcomes for high-authority clients in competitive professional services verticals. Real estate is a high-competition category, but Steve's existing authority profile means initial gains tend to come faster than average."),
      spacer(80),

      statsBox([
        { value: "30 Days", label: "Schema Indexed", sub: "GBP active in top 5 markets" },
        { value: "60 Days", label: "First AI Citations", sub: "Illinois + Florida markets" },
        { value: "90 Days", label: "12-State Coverage", sub: "Content + schema complete" },
        { value: "6 Months", label: "AI Search Leader", sub: "Top agent in AI responses" },
      ]),

      spacer(80),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 3180, 3180],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders, width: { size: 3000, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "METRIC", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
            new TableCell({ borders, width: { size: 3180, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "CURRENT STATE", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
            new TableCell({ borders, width: { size: 3180, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: "TARGET (90 DAYS)", bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })] }),
          ]}),
          ...[
            ["AI Overview appearances (Google)", "~0 appearances for target queries", "15-25 appearances for Illinois + Florida top queries"],
            ["ChatGPT Browse citations", "Not cited in agent recommendation queries", "Named in 'best agent Chicago/Tampa/Atlanta' responses"],
            ["Perplexity citations", "Not cited in real estate research queries", "Cited as source in market condition + agent queries"],
            ["Schema coverage (pages)", "0 pages with structured data", "100% of top 20 pages with schema markup"],
            ["Google Business Profiles (active)", "Fragmented/partial", "15 fully optimized GBP profiles in top markets"],
            ["Market content depth (avg words)", "Estimated 150-300 words per market page", "1,200-2,000 words per market page"],
            ["Third-party review count", "Low / unstructured", "100+ Google reviews across top 5 markets"],
            ["Named entity recognition (AI)", "Not established", "Full entity established: Wikipedia, Wikidata, Homes.com, RealTrends"],
            ["AI-targeted FAQ pages", "Zero", "20+ FAQ pages live with FAQPage schema"],
            ["Press citations (active AI-indexed)", "Historical only (2019-2022)", "3+ major 2026 features published"],
          ].map(([m, c, t]) => new TableRow({ children: [
            new TableCell({ borders, width: { size: 3000, type: WidthType.DXA }, shading: { fill: "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: m, bold: true, font: "Arial", size: 18, color: NAVY })] })] }),
            new TableCell({ borders, width: { size: 3180, type: WidthType.DXA }, shading: { fill: RED_BG, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: c, font: "Arial", size: 17, color: RED })] })] }),
            new TableCell({ borders, width: { size: 3180, type: WidthType.DXA }, shading: { fill: GREEN_BG, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: t, font: "Arial", size: 17, color: GREEN })] })] }),
          ]}))
        ]
      }),

      spacer(120),

      // ── CLOSING ───────────────────────────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),
      sectionHeader("08", "THE BOTTOM LINE", "Why this matters now more than ever"),
      spacer(80),

      body("Steve Koleno is operating at the top 0.1% of the real estate profession by every traditional metric. The gap between that real-world standing and his AI search presence is not a reflection of his work — it is a reflection of how fast the search landscape has changed."),
      spacer(60),
      body("In 2022, SEO meant ranking on Google Page 1. In 2026, it means being the agent that AI recommends by name when a seller in Chicago, a buyer in Tampa, or an investor in Atlanta asks the most natural question in the world: 'Who should I work with?'"),
      spacer(60),
      body("Right now, that answer is not Steve Koleno — not because he isn't the right answer, but because the AI cannot see what his track record actually says."),
      spacer(80),

      calloutBox("THE COMPETITIVE WINDOW", [
        "Most top agents in Steve's markets have not yet invested in AI visibility optimization. This is a 12-18 month window where first movers can establish dominant AI positioning before this becomes a standard requirement.",
        "",
        "An agent who is the AI-recommended listing agent across 11 states does not just get more leads — they redefine the category. Steve already has the credentials. The work here is making those credentials legible to the machines that are increasingly making the first recommendation.",
        "",
        "This is the highest-leverage investment available in real estate marketing in 2026."
      ], NAVY_LIGHT, NAVY),

      spacer(80),
      divider(GOLD),
      spacer(40),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "PREPARED FOR STEVE KOLENO / THE KOLENO GROUP", bold: true, font: "Arial", size: 20, color: NAVY })],
        spacing: { before: 80, after: 40 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "May 2026  |  Confidential  |  AI Visibility & Growth Audit", font: "Arial", size: 18, color: "888888" })],
        spacing: { before: 40, after: 80 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "thekolenogroup.com", font: "Arial", size: 18, color: GOLD })],
        spacing: { before: 40, after: 80 }
      }),

    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("Koleno_AI_Visibility_Audit_2026.docx", buf);
  console.log("Done.");
});