const root = document.documentElement;
const themeToggle = document.querySelector("#theme-toggle");
const cityFilter = document.querySelector("#city-filter");
const statusFilter = document.querySelector("#status-filter");
const searchInput = document.querySelector("#search-input");
const feedList = document.querySelector("#feed-list");
const triageList = document.querySelector("#triage-list");
const creatorList = document.querySelector("#creator-list");
const signalForm = document.querySelector("#signal-form");
const resetButton = document.querySelector("#reset-button");

const counters = {
  confirmed: document.querySelector("#confirmed-count"),
  review: document.querySelector("#review-count"),
  cities: document.querySelector("#city-count"),
  confidence: document.querySelector("#confidence-average"),
  source: document.querySelector("#source-count"),
  visible: document.querySelector("#visible-count"),
  triage: document.querySelector("#triage-count"),
};

const creators = [
  {
    name: "Książulo",
    handle: "@ksiazulo",
    region: "Polska",
    focus: "street food, lokale z dużym ruchem",
    weight: 96,
  },
  {
    name: "Aga Testuje",
    handle: "@wyzszy_instytut_smaku",
    region: "Polska",
    focus: "restauracje, kawiarnie, miejsca premium",
    weight: 91,
  },
  {
    name: "Maciej je",
    handle: "@maciejje",
    region: "Polska",
    focus: "rankingi i przewodniki po miastach",
    weight: 88,
  },
  {
    name: "Big Bula Polish Street Food",
    handle: "@bigbulapolishstreetfood",
    region: "Polska",
    focus: "burgery, kebab, food trucki",
    weight: 83,
  },
  {
    name: "Śląski YE",
    handle: "@slaskiye",
    region: "Śląsk",
    focus: "Katowice i region",
    weight: 79,
  },
  {
    name: "YOZO Mniam Mniam",
    handle: "@yozo.life",
    region: "Polska",
    focus: "bary, budki, szybkie jedzenie",
    weight: 74,
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

if (savedTheme === "dark") {
  root.classList.add("dark");
}

themeToggle.addEventListener("click", () => {
  root.classList.toggle("dark");
  localStorage.setItem("theme", root.classList.contains("dark") ? "dark" : "light");
});

cityFilter.addEventListener("change", render);
statusFilter.addEventListener("change", render);
searchInput.addEventListener("input", render);

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
  renderCityOptions();

  const filtered = getFilteredSignals();
  const visibleSignals = filtered.filter((signal) => signal.status !== "rejected");
  const reviewSignals = signals.filter((signal) => signal.status === "review");
  const confirmedSignals = signals.filter((signal) => signal.status === "confirmed");
  const cityCount = new Set(signals.filter((signal) => signal.status !== "rejected").map((signal) => signal.city)).size;
  const average = visibleSignals.length
    ? Math.round(visibleSignals.reduce((total, signal) => total + signal.score, 0) / visibleSignals.length)
    : 0;

  counters.confirmed.textContent = confirmedSignals.length;
  counters.review.textContent = reviewSignals.length;
  counters.cities.textContent = cityCount;
  counters.confidence.textContent = `${average}%`;
  counters.visible.textContent = `${visibleSignals.length} wyników`;
  counters.triage.textContent = reviewSignals.length;

  renderFeed(visibleSignals);
  renderTriage(reviewSignals);
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

function renderCityOptions() {
  const current = cityFilter.value || "all";
  const cities = [...new Set(signals.map((signal) => signal.city))].sort((a, b) => a.localeCompare(b, "pl"));

  cityFilter.innerHTML = [
    `<option value="all">Wszystkie miasta</option>`,
    ...cities.map((city) => `<option value="${city}">${city}</option>`),
  ].join("");

  cityFilter.value = cities.includes(current) ? current : "all";
}

function getFilteredSignals() {
  const city = cityFilter.value;
  const status = statusFilter.value;
  const search = searchInput.value.trim().toLowerCase();

  return signals
    .filter((signal) => signal.status !== "rejected")
    .filter((signal) => city === "all" || signal.city === city)
    .filter((signal) => status === "all" || signal.status === status)
    .filter((signal) => {
      if (!search) return true;

      return [
        signal.venue,
        signal.city,
        signal.district,
        signal.address,
        signal.category,
        signal.creator,
        signal.handle,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    })
    .sort((a, b) => b.score - a.score || b.detectedAt.localeCompare(a.detectedAt));
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

  return `
    <article class="signal-card">
      <div class="signal-main">
        <div class="status-row">
          <span class="status-pill ${signal.status}">${signal.status === "confirmed" ? "potwierdzone" : "do sprawdzenia"}</span>
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
            ? `<a href="${escapeAttribute(signal.sourceUrl)}" target="_blank" rel="noreferrer">Źródło</a>`
            : `<span class="muted-link">Brak źródła</span>`
        }
        ${
          hasMapLink
            ? `<a href="${escapeAttribute(googleMapsUrl)}" target="_blank" rel="noreferrer">Adres w Google Maps</a>`
            : `<span class="muted-link">Adres do weryfikacji</span>`
        }
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
