// Burque Driveway Pros static site builder. No dependencies: `node build.js` writes the site to ./dist
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "dist");
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "data/site.json"), "utf8"));
const listings = JSON.parse(fs.readFileSync(path.join(ROOT, "data/listings.json"), "utf8"));

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const catBySlug = Object.fromEntries(site.categories.map((c) => [c.slug, c]));
const year = new Date().getFullYear();
const yes = (v) => (v ? "yes" : "no");

function layout({ title, description, canonical, body, jsonLd }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${site.url}${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${site.url}${canonical}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#14171a">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;900&family=Archivo+Narrow:wght@700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
</head>
<body>
<header class="top">
  <div class="wrap top-inner">
    <a class="logo" href="/"><span class="mark" aria-hidden="true">BDP</span><span>Burque <b>Driveway Pros</b></span></a>
    <nav class="nav">
      ${site.categories.map((c) => `<a href="/${c.slug}/">${esc(c.short)}</a>`).join("")}
      <a class="nav-cta" href="/list-your-business/">Get listed</a>
    </nav>
  </div>
</header>
<main>${body}</main>
<footer class="foot">
  <div class="wrap foot-inner">
    <div><a class="logo" href="/"><span class="mark" aria-hidden="true">BDP</span><span>Burque <b>Driveway Pros</b></span></a>
    <p>Albuquerque's guide to car services that come to you.</p></div>
    <div class="foot-links">
      ${site.categories.map((c) => `<a href="/${c.slug}/">${esc(c.name)}</a>`).join("")}
      <a href="/kirtland-military/">Kirtland &amp; military</a>
      <a href="/list-your-business/">List your business</a>
    </div>
  </div>
  <p class="wrap fine">© ${year} Burque Driveway Pros. Listings are compiled from public information — confirm prices and service areas with each business.</p>
</footer>
</body>
</html>`;
}

function card(l) {
  const cat = catBySlug[l.category];
  const facts = [
    l.area && `<li><span>Serves</span>${esc(l.area)}</li>`,
    l.price && `<li><span>Price</span>${esc(l.price)}</li>`,
  ].filter(Boolean).join("");
  const badges = [
    l.featured && `<span class="chip gold">Featured</span>`,
    l.open247 && `<span class="chip hot">24/7</span>`,
    l.sameDay && `<span class="chip">Same-day</span>`,
    l.military && `<span class="chip mil">★ Military discount</span>`,
    l.onBase && `<span class="chip mil">Works on base</span>`,
  ].filter(Boolean).join("");
  return `<article class="card${l.featured ? " featured" : ""}" data-area="${esc(l.area)}" data-open247="${yes(l.open247)}" data-military="${yes(l.military)}" data-sameday="${yes(l.sameDay)}" data-text="${esc((l.name + " " + (l.notes || "") + " " + (l.area || "") + " " + cat.name).toLowerCase())}">
  <div class="card-top"><span class="chip cat">${cat.emoji} ${esc(cat.short)}</span>${badges}</div>
  <h3>${esc(l.name)}</h3>
  ${l.notes ? `<p class="notes">${esc(l.notes)}</p>` : ""}
  ${facts ? `<ul class="facts">${facts}</ul>` : ""}
  <div class="card-actions">
    ${l.phone ? `<a class="btn" href="tel:${esc(l.phone.replace(/[^0-9+]/g, ""))}">Call ${esc(l.phone)}</a>` : ""}
    ${l.website ? `<a class="btn ghost" href="${esc(l.website)}" rel="nofollow noopener" target="_blank">Website</a>` : ""}
    ${!l.phone && !l.website ? `<a class="btn ghost" href="https://www.google.com/search?q=${encodeURIComponent(l.name + " Albuquerque")}" rel="nofollow noopener" target="_blank">Find contact</a>` : ""}
  </div>
</article>`;
}

const businessLd = (l) => ({ "@type": "LocalBusiness", name: l.name, areaServed: l.area || "Albuquerque, NM", ...(l.phone ? { telephone: l.phone } : {}), ...(l.website ? { url: l.website } : {}) });
const sortListings = (arr) => [...arr].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.phone ? 1 : 0) - (a.phone ? 1 : 0) || a.name.localeCompare(b.name));

function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

function filters({ areas, flags }) {
  return `<div class="filters" data-filters>
    <input type="search" placeholder="Search by name or service" data-q aria-label="Filter listings">
    ${areas ? `<select data-area aria-label="Filter by area"><option value="">All areas</option>${areas.map((a) => `<option>${esc(a)}</option>`).join("")}</select>` : ""}
    ${flags.map(([key, label]) => `<label class="check"><input type="checkbox" data-flag="${key}"> ${label}</label>`).join("")}
  </div>`;
}

// ---- build ----
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, "public"))) fs.copyFileSync(path.join(ROOT, "public", f), path.join(OUT, f));

const counts = Object.fromEntries(site.categories.map((c) => [c.slug, listings.filter((l) => l.category === c.slug).length]));

// Home
write("index.html", layout({
  title: "Burque Driveway Pros — Mobile Car Services in Albuquerque, NM",
  description: "Find mobile mechanics, mobile detailing, windshield repair, mobile tire service and car locksmiths that come to you in Albuquerque and Rio Rancho.",
  canonical: "/",
  jsonLd: { "@context": "https://schema.org", "@type": "WebSite", name: site.name, url: site.url },
  body: `
<section class="hero">
  <div class="wrap">
    <p class="eyebrow">Albuquerque · Rio Rancho · Westside · NE Heights · Kirtland</p>
    <h1>Car trouble?<br><span>The pros come to you.</span></h1>
    <p class="lede">Mechanics, detailers, glass, tires and locksmiths that work in your driveway, your work lot or the side of I-25.</p>
    <form class="search" action="/search/" method="get" role="search">
      <input name="q" type="search" placeholder="Try “brakes”, “ceramic”, “lockout”…" aria-label="Search services">
      <button class="btn">Search</button>
    </form>
  </div>
</section>
<section class="wrap cats">
  ${site.categories.map((c) => `<a class="cat" href="/${c.slug}/"><span class="cat-emoji">${c.emoji}</span><b>${esc(c.name)}</b><small>${counts[c.slug]} pros</small></a>`).join("")}
</section>
<section class="wrap band">
  <div>
    <h2>Stationed at Kirtland?</h2>
    <p>No car, no time, stuck in the dorms? We flag pros who offer military discounts and work on base.</p>
  </div>
  <a class="btn light" href="/kirtland-military/">Military-friendly pros</a>
</section>
<section class="wrap split">
  <div>
    <h2>Run a mobile car business?</h2>
    <p>Get in front of Albuquerque drivers right when they need you. Basic listings are free. Featured pros sit at the top of their category.</p>
  </div>
  <a class="btn" href="/list-your-business/">Get listed</a>
</section>`,
}));

// Category pages
for (const c of site.categories) {
  const items = sortListings(listings.filter((l) => l.category === c.slug));
  const areas = [...new Set(items.map((l) => l.area).filter(Boolean))].sort();
  const flags = [["open247", "Open 24/7"], ["military", "Military discount"]];
  if (c.slug === "mobile-windshield-repair") flags.splice(1, 0, ["sameday", "Same-day"]);
  write(`${c.slug}/index.html`, layout({
    title: `${c.name} in Albuquerque, NM (${year}) — We Come to You | Burque Driveway Pros`,
    description: `Compare ${items.length} ${c.name.toLowerCase()} pros in Albuquerque & Rio Rancho that come to your home, work or roadside. ${c.blurb}`,
    canonical: `/${c.slug}/`,
    jsonLd: { "@context": "https://schema.org", "@type": "ItemList", name: `${c.name} in Albuquerque`, itemListElement: items.map((l, i) => ({ "@type": "ListItem", position: i + 1, item: businessLd(l) })) },
    body: `
<section class="page-head">
  <div class="wrap">
    <p class="crumbs"><a href="/">Home</a> / ${esc(c.name)}</p>
    <h1>${c.emoji} ${esc(c.name)} in Albuquerque</h1>
    <p class="lede">${esc(c.blurb)}</p>
  </div>
</section>
<section class="wrap">
  ${filters({ areas: areas.length > 1 ? areas : null, flags })}
  <p class="count" data-count>${items.length} pros</p>
  <div class="grid" data-grid>${items.map(card).join("")}</div>
  <p class="empty" data-empty hidden>No matches. Try clearing a filter.</p>
  <aside class="note">Run one of these businesses? <a href="/list-your-business/">Claim or update your listing — it's free.</a></aside>
</section>
<script src="/filter.js" defer></script>`,
  }));
}

// Kirtland & military
const mil = sortListings(listings.filter((l) => l.military || l.onBase));
write("kirtland-military/index.html", layout({
  title: "Military Discounts on Mobile Car Services — Kirtland AFB | Burque Driveway Pros",
  description: "Mobile mechanics, detailers and more in Albuquerque that offer military discounts or work on Kirtland Air Force Base.",
  canonical: "/kirtland-military/",
  body: `
<section class="page-head"><div class="wrap">
  <p class="crumbs"><a href="/">Home</a> / Kirtland &amp; military</p>
  <h1>★ Kirtland &amp; military-friendly pros</h1>
  <p class="lede">For airmen, Guard members, veterans and military families. These pros have told us they offer a military discount or can work on base.</p>
</div></section>
<section class="wrap">
  ${mil.length ? `<div class="grid">${mil.map(card).join("")}</div>` : `<div class="note big"><h2>We're building this list now.</h2><p>We're contacting every pro in the directory to ask about military discounts and base access. Know one? <a href="mailto:${site.contactEmail}?subject=Military%20discount%20tip">Send us a tip</a>.</p></div>`}
</section>`,
}));

// List your business
write("list-your-business/index.html", layout({
  title: "List Your Mobile Car Business in Albuquerque — Burque Driveway Pros",
  description: "Add your mobile mechanic, detailing, glass, tire or locksmith business to Burque Driveway Pros for free, or get a featured spot.",
  canonical: "/list-your-business/",
  body: `
<section class="page-head"><div class="wrap">
  <p class="crumbs"><a href="/">Home</a> / Get listed</p>
  <h1>Get found by Albuquerque drivers</h1>
  <p class="lede">People land here when they need a car service to come to them — often the same day. Make sure they call you.</p>
</div></section>
<section class="wrap plans">
  <div class="plan">
    <h2>Basic</h2><p class="price">Free</p>
    <ul><li>Your business in its category</li><li>Phone, website and service area</li><li>24/7 and military-discount badges</li></ul>
    <a class="btn ghost" href="mailto:${site.contactEmail}?subject=Free%20listing%20request">Claim free listing</a>
  </div>
  <div class="plan pop">
    <h2>Featured</h2><p class="price">$49<small>/mo</small></p>
    <ul><li>Top spot on your category page</li><li>Highlighted card with tap-to-call button</li><li>Shown on the home page</li><li>Photos and a longer write-up</li></ul>
    <a class="btn" href="mailto:${site.contactEmail}?subject=Featured%20listing">Get featured</a>
  </div>
</section>
<section class="wrap"><p class="note">Founding offer: the first 10 featured pros lock in $49/mo for life.</p></section>`,
}));

// Search
write("search/index.html", layout({
  title: "Search — Burque Driveway Pros", description: "Search mobile car services in Albuquerque.", canonical: "/search/",
  body: `
<section class="page-head"><div class="wrap"><h1>Search</h1>
  ${filters({ areas: null, flags: [["open247", "Open 24/7"], ["military", "Military discount"]] })}
</div></section>
<section class="wrap">
  <p class="count" data-count></p>
  <div class="grid" data-grid>${sortListings(listings).map(card).join("")}</div>
  <p class="empty" data-empty hidden>No matches.</p>
</section>
<script src="/filter.js" defer></script>`,
}));

write("404.html", layout({
  title: "Page not found — Burque Driveway Pros", description: "Page not found.", canonical: "/404",
  body: `<section class="page-head"><div class="wrap"><h1>Wrong turn.</h1><p class="lede">That page doesn't exist. <a href="/">Head back home</a>.</p></div></section>`,
}));

const pages = ["/", ...site.categories.map((c) => `/${c.slug}/`), "/kirtland-military/", "/list-your-business/"];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${site.url}${p}</loc></url>`).join("\n")}\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);

console.log(`Built ${pages.length + 2} pages, ${listings.length} listings → dist/`);
