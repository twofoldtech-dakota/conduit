# Launch Guide

How to ship Conduit and start generating revenue.

## Table of Contents

1. [Landing Page Setup](#landing-page-setup)
2. [Sales Deck / Demo Flow](#sales-deck)
3. [Pricing Implementation](#pricing-implementation)
4. [Distribution Channels](#distribution-channels)

---

## Landing Page Setup

### Recommended Stack

**Option A: Quick & Free**

- **Vercel + Next.js** or **Netlify + Astro**
- Single page, deploys in minutes
- Free tier handles plenty of traffic

**Option B: No-Code**

- **Carrd** ($19/year) - Single page, custom domain
- **Framer** - More design flexibility

### Domain Suggestions

- `conduit.dev`
- `getconduit.dev`
- `conduit-cms.com`
- `useconduit.com`

### Page Structure

```
┌─────────────────────────────────────────────────────────┐
│  HERO                                                    │
│  "One connection to every CMS"                          │
│  [Get Started] [View Demo]                              │
├─────────────────────────────────────────────────────────┤
│  PROBLEM                                                 │
│  "Tired of building CMS integrations for every client?" │
├─────────────────────────────────────────────────────────┤
│  SUPPORTED CMS (logos)                                  │
│  Contentful | Sanity | WordPress | Sitecore | Umbraco   │
├─────────────────────────────────────────────────────────┤
│  FEATURES                                               │
│  ✓ Unified API    ✓ Multi-CMS    ✓ AI-Ready            │
├─────────────────────────────────────────────────────────┤
│  X-RAY (Premium callout)                                │
│  "Audit your Sitecore instance in minutes"              │
│  Health Score | Knowledge Graph | 12 Algorithms         │
├─────────────────────────────────────────────────────────┤
│  PRICING                                                │
│  Free | Pro $99/mo | Enterprise $299/mo                 │
├─────────────────────────────────────────────────────────┤
│  CTA                                                    │
│  "Ready to simplify your CMS stack?"                    │
│  [Start Free] [Book Demo]                               │
└─────────────────────────────────────────────────────────┘
```

### Copy Suggestions

**Headline Options:**

- "One connection to every CMS"
- "The universal CMS adapter for AI"
- "Connect AI to any CMS in minutes"

**Subheadline:**

- "Stop building custom integrations. Conduit gives you unified access to Contentful, Sanity, WordPress, Sitecore, and more through a single MCP interface."

**Value Props:**

1. **Save Time** - "One integration instead of seven"
2. **Enterprise Ready** - "Built-in caching, rate limiting, audit logging"
3. **AI Native** - "Works with Claude, GPT, and any MCP client"

### Technical Setup

```bash
# Quick Astro landing page
npm create astro@latest conduit-landing
cd conduit-landing

# Add Tailwind
npx astro add tailwind

# Structure
src/
├── pages/
│   └── index.astro      # Main landing page
├── components/
│   ├── Hero.astro
│   ├── Features.astro
│   ├── Pricing.astro
│   └── CTA.astro
└── styles/
    └── global.css
```

### Analytics & Conversion

1. **Vercel Analytics** (free) or **Plausible** ($9/mo)
2. **Calendly** for demo booking
3. **Stripe** for payments (when ready)

---

## Sales Deck

### Demo Flow for Sitecore Clients

**The Pitch (5 minutes):**

1. **Hook** (30 sec)

   > "What if you could see every issue in your Sitecore instance in 60 seconds?"

2. **Problem** (1 min)

   > "Most Sitecore sites accumulate technical debt: orphaned items, broken links, unused templates. Finding these manually takes days."

3. **Demo** (2 min)
   - Run X-Ray scan on their instance (or demo instance)
   - Show health score: "Your site is a B - 78/100"
   - Show top issues: "You have 47 orphaned items, 12 broken links"
   - Show knowledge graph (visual wow factor)

4. **Value** (1 min)

   > "Fixing these issues will improve editor performance and reduce page load times."

5. **Close** (30 sec)
   > "I can run this monthly for you. First scan is free."

### Report Template

Generate this after running X-Ray:

```markdown
# Sitecore Health Report

**Client:** [Client Name]
**Date:** [Date]
**Instance:** [URL]

## Executive Summary

Your Sitecore instance scored **78/100 (B)**.

We found **67 issues** that should be addressed:

- 🔴 3 Critical (security, large files)
- 🟡 24 Warning (broken links, deep nesting)
- 🔵 40 Info (unused items, stale content)

## Top 5 Recommendations

### 1. Fix Security Vulnerabilities (Critical)

3 items have overly permissive security settings.
**Impact:** Prevents unauthorized access
**Effort:** Medium (2-4 hours)

### 2. Repair Broken Links (High)

12 broken references causing 404s.
**Impact:** Better SEO, user experience
**Effort:** Medium (3-6 hours)

### 3. Optimize Large Media (High)

8 files over 5MB slowing page loads.
**Impact:** Faster pages, better Core Web Vitals
**Effort:** Low (1-2 hours)

### 4. Clean Up Orphaned Items (Medium)

47 items with missing parents.
**Impact:** Cleaner content tree
**Effort:** Low (1-2 hours)

### 5. Review Stale Content (Medium)

156 items not updated in 12+ months.
**Impact:** More accurate content
**Effort:** Ongoing

## Next Steps

1. Schedule remediation sprint
2. Set up monthly X-Ray monitoring
3. Establish content governance process

---

_Report generated by Conduit X-Ray_
```

### Objection Handling

| Objection                  | Response                                                        |
| -------------------------- | --------------------------------------------------------------- |
| "We already do audits"     | "How long does it take? X-Ray does it in minutes, not days."    |
| "We don't have budget"     | "First scan is free. How about we run it and see what we find?" |
| "Our site is fine"         | "Great! Let's verify that. If the score is 90+, you're golden." |
| "We're moving to XM Cloud" | "X-Ray works with both. And you'll want a clean migration."     |

---

## Pricing Implementation

### Tier Structure

| Tier           | Price   | Features                                |
| -------------- | ------- | --------------------------------------- |
| **Free**       | $0      | Core adapters, community support        |
| **Pro**        | $99/mo  | + Enterprise adapters, priority support |
| **Enterprise** | $299/mo | + X-Ray, layout manipulation, SLA       |

### License Key System (Future)

```typescript
// Simple license validation
interface License {
  key: string;
  tier: "free" | "pro" | "enterprise";
  expiresAt: string;
  features: string[];
}

// Check on startup
async function validateLicense(key: string): Promise<License> {
  const res = await fetch("https://api.conduit.dev/license", {
    headers: { "X-License-Key": key },
  });
  return res.json();
}
```

### Payment Setup

1. **Stripe** - Create products for each tier
2. **License server** - Simple API that validates keys
3. **Webhook** - Stripe → License server on payment

For MVP: Manual license keys via email is fine.

---

## Distribution Channels

### Immediate (Do Now)

1. **Your Sitecore Clients**
   - You already have relationships
   - Offer free audit, convert to monthly
   - Target: 3-5 clients in first month

2. **npm**

   ```bash
   npm publish
   ```

   - Makes it discoverable
   - Easy for devs to try

3. **GitHub**
   - Star your own repo
   - Add topics: `sitecore`, `cms`, `mcp`, `ai`
   - Good README = organic discovery

### Short Term (1-2 months)

4. **Sitecore Community**
   - Sitecore Slack
   - Sitecore Stack Exchange
   - SUG (Sitecore User Groups) presentations

5. **Content**
   - Blog post: "Auditing Sitecore with AI"
   - LinkedIn posts (your network)
   - Dev.to / Hashnode articles

### Medium Term (3-6 months)

6. **MCP Ecosystem**
   - List on MCP server directories
   - Anthropic's MCP showcase (if they have one)

7. **Partnerships**
   - Sitecore agencies
   - Other CMS consultants

---

## Launch Checklist

### Week 1

- [ ] Run X-Ray on your own Sitecore instance
- [ ] Generate sample report
- [ ] Pitch to 2-3 existing clients
- [ ] npm publish

### Week 2

- [ ] Landing page live
- [ ] First paying customer
- [ ] Collect testimonial / case study

### Week 3-4

- [ ] Refine based on feedback
- [ ] Add Stripe payments
- [ ] Scale outreach

---

## Quick Commands

```bash
# Publish to npm
cd /Users/dakotasmith/Documents/conduit
npm login
npm publish

# Test locally before publish
npm pack
npm install ./conduit-mcp-1.0.0.tgz -g

# Run X-Ray demo
npx conduit-mcp  # with Sitecore config
# Then via MCP: xray_scan, xray_report
```
