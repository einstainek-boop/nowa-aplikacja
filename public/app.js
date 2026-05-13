const root = document.documentElement;
const themeToggle = document.querySelector("#theme-toggle");
const feedList = document.querySelector("#feed-list");
const triageList = document.querySelector("#triage-list");
const creatorList = document.querySelector("#creator-list");
const sourceStrip = document.querySelector("#source-strip");
const signalDetail = document.querySelector("#signal-detail");
const signalForm = document.querySelector("#signal-form");
const resetButton = document.querySelector("#reset-button");

const counters = {
  found: document.querySelector("#found-count"),
  review: document.querySelector("#review-count"),
  cities: document.querySelector("#city-count"),
  verified: document.querySelector("#verified-count"),
  source: document.querySelector("#source-count"),
  visible: document.querySelector("#visible-count"),
  triage: document.querySelector("#triage-count"),
  regions: document.querySelector("#region-count"),
};

const creators = [
  {
    name: "Książulo",
    handle: "@ksiazulo",
    region: "Polska",
    focus: "street food, lokale z dużym ruchem",
    weight: 96,
    platform: "YouTube / TikTok",
  },
  {
    name: "Aga Testuje",
    handle: "@wyzszy_instytut_smaku",
    region: "Polska",
    focus: "restauracje, kawiarnie, miejsca premium",
    weight: 91,
    platform: "TikTok / Instagram",
  },
  {
    name: "Maciej je",
    handle: "@maciejje",
    region: "Polska",
    focus: "rankingi i przewodniki po miastach",
    weight: 88,
    platform: "blog / social",
  },
  {
    name: "Big Bula Polish Street Food",
    handle: "@bigbulapolishstreetfood",
    region: "Polska",
    focus: "burgery, kebab, food trucki",
    weight: 83,
    platform: "TikTok",
  },
  {
    name: "Śląski YE",
    handle: "@slaskiye",
    region: "Śląsk",
    focus: "Katowice i region",
    weight: 79,
    platform: "social",
  },
  {
    name: "YOZO Mniam Mniam",
    handle: "@yozo.life",
    region: "Polska",
    focus: "bary, budki, szybkie jedzenie",
    weight: 74,
    platform: "TikTok / Instagram",
  },
  {
    name: "Restaurantica",
    handle: "@restaurantica",
    region: "Warszawa",
    focus: "restauracje, gastro newsy i przewodniki",
    weight: 82,
    platform: "Instagram / blog",
  },
  {
    name: "Food By Warsaw",
    handle: "@foodbywarsaw",
    region: "Warszawa",
    focus: "restauracje, kawiarnie i nowe miejsca w stolicy",
    weight: 80,
    platform: "Instagram",
  },
  {
    name: "Warsaw Food Guide",
    handle: "@warsawfoodguide",
    region: "Warszawa",
    focus: "krótkie rekomendacje lokali i food guide",
    weight: 77,
    platform: "Instagram",
  },
  {
    name: "Gdzie zjeść w Poznaniu i Warszawie",
    handle: "@gdziezjescwpoznaniu",
    region: "Poznań / Warszawa",
    focus: "restauracje, kawiarnie i lokalne odkrycia",
    weight: 76,
    platform: "Instagram",
  },
  {
    name: "Z Widelcem po Wrocławiu",
    handle: "@zwidelcempowroclawiu",
    region: "Wrocław",
    focus: "nowe restauracje i miejsca we Wrocławiu",
    weight: 76,
    platform: "Instagram / blog",
  },
  {
    name: "TasteAway",
    handle: "@blogtasteaway",
    region: "Polska",
    focus: "podróże kulinarne, restauracje i rodzinne miejsca",
    weight: 73,
    platform: "Instagram / blog",
  },
  {
    name: "Jedzenie Warszawa",
    handle: "@jedzeniewarszawa",
    region: "Warszawa",
    focus: "przewodnik po lokalach i recenzje restauracji",
    weight: 72,
    platform: "Instagram / www",
  },
  {
    name: "Food4Warsaw",
    handle: "@food4warsaw",
    region: "Warszawa",
    focus: "knajpki, kawiarnie i miejscówki w Warszawie",
    weight: 75,
    platform: "Instagram",
  },
  {
    name: "Taste of Warsaw",
    handle: "@tasteofwarsaw",
    region: "Warszawa",
    focus: "jedzenie i restauracje w Warszawie",
    weight: 78,
    platform: "Instagram",
  },
  {
    name: "Kraków Food Kati",
    handle: "@krakowfood.kati",
    region: "Kraków / Małopolska",
    focus: "sprawdza nowe restauracje w Krakowie",
    weight: 83,
    platform: "Instagram",
  },
  {
    name: "Ludzie Huby",
    handle: "@ludziehuby",
    region: "Kraków",
    focus: "recenzje i krakowski food",
    weight: 75,
    platform: "Instagram",
  },
  {
    name: "Gdzie Zjeść Kraków",
    handle: "@gdziezjesckrakow",
    region: "Kraków",
    focus: "rankingi, miejsca i lokalne aktualizacje",
    weight: 70,
    platform: "www / social",
  },
  {
    name: "Why Not Gdańsk",
    handle: "@whynotgdansk",
    region: "Trójmiasto",
    focus: "Gdańsk, Sopot, restauracje i miejsca",
    weight: 76,
    platform: "Instagram",
  },
  {
    name: "Foodie Trójmiasto",
    handle: "@foodietrojmiasto",
    region: "Trójmiasto",
    focus: "gdzie zjeść w Trójmieście",
    weight: 72,
    platform: "Instagram",
  },
  {
    name: "Wife With Knife",
    handle: "@wifewithknife_com",
    region: "Łódź",
    focus: "recenzje restauracji, podróże i smaki",
    weight: 68,
    platform: "Instagram / blog",
  },
  {
    name: "Jemy w Łodzi",
    handle: "@jemywlodzi",
    region: "Łódź",
    focus: "łódzkie restauracje, otwarcia i recenzje",
    weight: 72,
    platform: "www / social",
  },
  {
    name: "KUKBUK",
    handle: "@kukbuk",
    region: "Polska",
    focus: "przewodniki miejskie i trendy gastro",
    weight: 70,
    platform: "magazyn / social",
  },
];

const seedSignals = [
  {
    id: crypto.randomUUID(),
    venue: "Mąka i Ogień Praga",
    city: "Warszawa",
    district: "Praga-Północ",
    address: "ul. Ząbkowska 18",
    category: "Pizza",
    creator: "Aga Testuje",
    handle: "@wyzszy_instytut_smaku",
    caption:
      "Nowy lokal z pizzą neapolitańską właśnie otworzył się na Pradze. Soft opening trwa do weekendu.",
    sourceUrl: "",
    detectedAt: "2026-05-13",
  },
  {
    id: crypto.randomUUID(),
    venue: "Bao Klub",
    city: "Kraków",
    district: "Kazimierz",
    address: "ul. Miodowa 9",
    category: "Azjatyckie",
    creator: "Maciej je",
    handle: "@maciejje",
    caption:
      "Nowe miejsce na mapie Kazimierza: bao, ramen i mała sala przy Miodowej. Otwarcie było w tym tygodniu.",
    sourceUrl: "",
    detectedAt: "2026-05-12",
  },
  {
    id: crypto.randomUUID(),
    venue: "Kebab Garaż",
    city: "Katowice",
    district: "Śródmieście",
    address: "ul. Mariacka 4",
    category: "Kebab",
    creator: "Śląski YE",
    handle: "@slaskiye",
    caption:
      "Dzisiaj startuje nowy kebab w centrum Katowic. Lokal działa od 12:00, kolejka już przed otwarciem.",
    sourceUrl: "",
    detectedAt: "2026-05-13",
  },
  {
    id: crypto.randomUUID(),
    venue: "Kawa Punkt",
    city: "Wrocław",
    district: "Nadodrze",
    address: "ul. Rydygiera 21",
    category: "Kawiarnia",
    creator: "YOZO Mniam Mniam",
    handle: "@yozo.life",
    caption:
      "Mała kawiarnia po remoncie, właściciele mówią że to pierwszy tydzień działania. Warto zweryfikować adres.",
    sourceUrl: "",
    detectedAt: "2026-05-11",
  },
  {
    id: crypto.randomUUID(),
    venue: "Burger Stacja",
    city: "Poznań",
    district: "Jeżyce",
    address: "ul. Szamarzewskiego 12",
    category: "Burgery",
    creator: "Big Bula Polish Street Food",
    handle: "@bigbulapolishstreetfood",
    caption:
      "Test starej burgerowni po zmianie menu. Nie jest to nowe otwarcie, ale lokal ma duży ruch.",
    sourceUrl: "",
    detectedAt: "2026-05-10",
  },
];

const openKeywords = [
  "nowy lokal",
  "nowe miejsce",
  "otworzył",
  "otworzyła",
  "otwarcie",
  "soft opening",
  "startuje",
  "pierwszy tydzień",
  "właśnie ruszył",
  "właśnie ruszyła",
  "od dziś",
  "od dzisiaj",
];

const rejectKeywords = ["starej", "kultowy", "ranking", "top 10", "po zmianie menu", "kolejny raz"];

const savedTheme = localStorage.getItem("theme");
let signals = loadSignals();
let selectedSignalId = signals.find((signal) => signal.status !== "rejected")?.id ?? null;

if (savedTheme === "dark") {
  root.classList.add("dark");
}

themeToggle.addEventListener("click", () => {
  root.classList.toggle("dark");
  localStorage.setItem("theme", root.classList.contains("dark") ? "dark" : "light");
});

resetButton.addEventListener("click", () => {
  localStorage.removeItem("gastroSignals");
  signals = seedSignals.map(enrichSignal);
  persistSignals();
  render();
});

signalForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const creator = document.querySelector("#creator-input").value.trim();
  const city = document.querySelector("#city-input").value.trim();
  const address = document.querySelector("#address-input").value.trim();
  const sourceUrl = document.querySelector("#source-input").value.trim();
  const caption = document.querySelector("#caption-input").value.trim();

  signals = [
    enrichSignal({
      id: crypto.randomUUID(),
      venue: inferVenue(caption),
      city,
      district: "Do ustalenia",
      address: address || "Do sprawdzenia w Google Places",
      category: inferCategory(caption),
      creator: creator.replace("@", "") || "Ręczne źródło",
      handle: creator.startsWith("@") ? creator : `@${creator}`,
      caption,
      sourceUrl,
      detectedAt: new Date().toISOString().slice(0, 10),
    }),
    ...signals,
  ];

  persistSignals();
  signalForm.reset();
  render();
});

feedList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-verify-id]");

  if (button) {
    signals = signals.map((signal) =>
      signal.id === button.dataset.verifyId ? { ...signal, verified: !signal.verified } : signal,
    );
    persistSignals();
    render();
    return;
  }

  const card = event.target.closest("[data-signal-id]");

  if (!card) {
    return;
  }

  selectedSignalId = card.dataset.signalId;
  render();
});

function loadSignals() {
  const stored = localStorage.getItem("gastroSignals");

  if (!stored) {
    return seedSignals.map(enrichSignal);
  }

  try {
    return JSON.parse(stored).map(enrichSignal);
  } catch {
    return seedSignals.map(enrichSignal);
  }
}

function persistSignals() {
  localStorage.setItem("gastroSignals", JSON.stringify(signals));
}

function enrichSignal(signal) {
  const score = scoreSignal(signal);

  return {
    ...signal,
    verified: Boolean(signal.verified),
    score,
    status: score >= 78 ? "confirmed" : score >= 48 ? "review" : "rejected",
  };
}

function scoreSignal(signal) {
  const text = `${signal.caption} ${signal.venue} ${signal.address}`.toLowerCase();
  const creatorWeight = creators.find((creator) => creator.handle === signal.handle)?.weight ?? 58;
  const openHits = openKeywords.filter((keyword) => text.includes(keyword)).length;
  const rejectHits = rejectKeywords.filter((keyword) => text.includes(keyword)).length;
  const hasAddress = !/do sprawdzenia|do ustalenia/i.test(`${signal.address} ${signal.district}`);
  const hasVenue = signal.venue && signal.venue !== "Nowy lokal";

  return clamp(creatorWeight * 0.45 + openHits * 18 + Number(hasAddress) * 12 + Number(hasVenue) * 8 - rejectHits * 26);
}

function clamp(value) {
  return Math.max(0, Math.min(99, Math.round(value)));
}

function inferVenue(caption) {
  const quoted = caption.match(/[„"](.*?)[”"]/);

  if (quoted?.[1]) {
    return quoted[1].slice(0, 42);
  }

  const afterMarker = caption.match(/(?:lokal|miejsce|restauracja|kawiarnia)\s+([A-ZŁŚŻŹĆŃÓ][\wąćęłńóśźż -]{2,38})/);

  return afterMarker?.[1]?.trim() || "Nowy lokal";
}

function inferCategory(caption) {
  const text = caption.toLowerCase();

  if (text.includes("kebab")) return "Kebab";
  if (text.includes("pizza")) return "Pizza";
  if (text.includes("kawa") || text.includes("kawiarnia")) return "Kawiarnia";
  if (text.includes("burger")) return "Burgery";
  if (text.includes("ramen") || text.includes("bao") || text.includes("azja")) return "Azjatyckie";

  return "Restauracja";
}

function render() {
  renderCreators();
  renderSourceStrip();

  const visibleSignals = getVisibleSignals();
  const reviewSignals = signals.filter((signal) => signal.status === "review");
  const cityCount = new Set(signals.filter((signal) => signal.status !== "rejected").map((signal) => signal.city)).size;
  const verifiedSignals = signals.filter((signal) => signal.status !== "rejected" && signal.verified);

  counters.found.textContent = visibleSignals.length;
  counters.review.textContent = reviewSignals.length;
  counters.cities.textContent = cityCount;
  counters.verified.textContent = verifiedSignals.length;
  counters.visible.textContent = `${visibleSignals.length} wyników`;
  counters.triage.textContent = reviewSignals.length;
  counters.regions.textContent = `${getRegionCount()} regionów`;

  if (!visibleSignals.some((signal) => signal.id === selectedSignalId)) {
    selectedSignalId = visibleSignals[0]?.id ?? null;
  }

  renderFeed(visibleSignals);
  renderTriage(reviewSignals);
  renderSignalDetail(visibleSignals.find((signal) => signal.id === selectedSignalId));
}

function renderCreators() {
  counters.source.textContent = creators.length;
  creatorList.innerHTML = creators
    .map(
      (creator) => `
        <li>
          <div>
            <strong>${escapeHtml(creator.name)}</strong>
            <span>${escapeHtml(creator.handle)}</span>
            <em>${escapeHtml(creator.focus)}</em>
          </div>
          <small>${escapeHtml(creator.region)}</small>
        </li>
      `,
    )
    .join("");
}

function renderSourceStrip() {
  const topCreators = [...creators].sort((a, b) => b.weight - a.weight).slice(0, 10);

  sourceStrip.innerHTML = topCreators
    .map(
      (creator) => `
        <article class="source-card">
          <div>
            <strong>${escapeHtml(creator.name)}</strong>
            <span>${escapeHtml(creator.region)}</span>
          </div>
          <small>${escapeHtml(creator.platform)}</small>
        </article>
      `,
    )
    .join("");
}

function getRegionCount() {
  return new Set(creators.map((creator) => creator.region.split("/")[0].trim())).size;
}

function getVisibleSignals() {
  return signals
    .filter((signal) => signal.status !== "rejected")
    .sort(
      (a, b) =>
        Number(b.verified) - Number(a.verified) || b.score - a.score || b.detectedAt.localeCompare(a.detectedAt),
    );
}

function renderFeed(items) {
  if (!items.length) {
    feedList.innerHTML = `<p class="empty-state">Brak wyników dla wybranych filtrów.</p>`;
    return;
  }

  feedList.innerHTML = items.map(renderSignalCard).join("");
}

function renderSignalCard(signal) {
  const googleMapsUrl = buildGoogleMapsUrl(signal);
  const hasMapLink = Boolean(googleMapsUrl);
  const hasSourceLink = isUsefulSourceUrl(signal.sourceUrl);
  const verifiedLabel = signal.verified ? "Sprawdzone" : "Oznacz jako sprawdzone";
  const isSelected = signal.id === selectedSignalId;

  return `
    <article class="signal-card ${isSelected ? "selected" : ""}" data-signal-id="${escapeAttribute(signal.id)}">
      <div class="signal-main">
        <div class="status-row">
          <span class="status-pill ${signal.status}">${signal.status === "confirmed" ? "wykryte" : "do sprawdzenia"}</span>
          ${signal.verified ? `<span class="verified-pill">sprawdzone</span>` : ""}
          <span>${signal.score}%</span>
        </div>
        <h3>${escapeHtml(signal.venue)}</h3>
        <p>${escapeHtml(signal.address)}, ${escapeHtml(signal.city)}</p>
        <div class="tag-row">
          <span>${escapeHtml(signal.category)}</span>
          <span>${escapeHtml(signal.district)}</span>
          <span>${escapeHtml(signal.detectedAt)}</span>
        </div>
      </div>
      <div class="signal-source">
        <strong>${escapeHtml(signal.creator)}</strong>
        <span>${escapeHtml(signal.handle)}</span>
        ${
          hasSourceLink
            ? `<a href="${escapeAttribute(signal.sourceUrl)}" target="_blank" rel="noreferrer">Film TikTok</a>`
            : `<span class="muted-link">Brak konkretnego filmu</span>`
        }
        ${
          hasMapLink
            ? `<a href="${escapeAttribute(googleMapsUrl)}" target="_blank" rel="noreferrer">Adres w Google Maps</a>`
            : `<span class="muted-link">Adres do weryfikacji</span>`
        }
        <button
          class="verify-button ${signal.verified ? "active" : ""}"
          type="button"
          data-verify-id="${escapeAttribute(signal.id)}"
        >
          ${verifiedLabel}
        </button>
      </div>
    </article>
  `;
}

function renderSignalDetail(signal) {
  if (!signal) {
    signalDetail.innerHTML = `<p class="empty-state">Wybierz lokal z listy.</p>`;
    return;
  }

  const googleMapsUrl = buildGoogleMapsUrl(signal);
  const sourceLink = isUsefulSourceUrl(signal.sourceUrl)
    ? `<a href="${escapeAttribute(signal.sourceUrl)}" target="_blank" rel="noreferrer">Otwórz film TikTok</a>`
    : `<span>Brak konkretnego filmu TikTok</span>`;
  const mapLink = googleMapsUrl
    ? `<a href="${escapeAttribute(googleMapsUrl)}" target="_blank" rel="noreferrer">Otwórz adres w Google Maps</a>`
    : `<span>Adres wymaga weryfikacji</span>`;

  signalDetail.innerHTML = `
    <article class="detail-card">
      <div class="detail-score">${signal.score}%</div>
      <h3>${escapeHtml(signal.venue)}</h3>
      <p>${escapeHtml(signal.caption)}</p>
      <dl>
        <div><dt>Miasto</dt><dd>${escapeHtml(signal.city)}</dd></div>
        <div><dt>Adres</dt><dd>${escapeHtml(signal.address)}</dd></div>
        <div><dt>Źródło</dt><dd>${escapeHtml(signal.creator)}</dd></div>
      </dl>
      <div class="detail-actions">
        ${sourceLink}
        ${mapLink}
      </div>
    </article>
  `;
}

function buildGoogleMapsUrl(signal) {
  if (!hasVerifiedAddress(signal.address)) {
    return "";
  }

  const query = [signal.address, signal.city, "Polska"].filter(Boolean).join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function hasVerifiedAddress(address) {
  return Boolean(address) && !/do sprawdzenia|do ustalenia/i.test(address);
}

function isUsefulSourceUrl(url) {
  if (!url || url === "https://www.tiktok.com/") {
    return false;
  }

  try {
    const parsed = new URL(url);

    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function renderTriage(items) {
  if (!items.length) {
    triageList.innerHTML = `<li class="empty-state">Brak wpisów do weryfikacji.</li>`;
    return;
  }

  triageList.innerHTML = items
    .map(
      (signal) => `
        <li>
          <strong>${escapeHtml(signal.venue)}</strong>
          <span>${escapeHtml(signal.city)} · ${signal.score}% · ${escapeHtml(signal.creator)}</span>
        </li>
      `,
    )
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

render();
