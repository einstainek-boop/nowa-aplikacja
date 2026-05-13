import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  ExternalLink,
  Film,
  Link2,
  Loader2,
  MapPin,
  Moon,
  Plus,
  Radar,
  RefreshCcw,
  SearchCheck,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { creators, openKeywords, rejectKeywords } from "./data";
import { Badge, Button, Card, Field, Input, Textarea } from "./components/ui";
import { cn } from "./lib/utils";
import "./styles.css";

const STORAGE_KEY = "gastroSignalsV3";
const emptyForm = {
  creator: "",
  city: "",
  address: "",
  sourceUrl: "",
  caption: "",
};

function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [signals, setSignals] = useState(loadSignals);
  const [selectedSignalId, setSelectedSignalId] = useState(() => signals[0]?.id ?? null);
  const [form, setForm] = useState(emptyForm);
  const [batchText, setBatchText] = useState("");
  const [importState, setImportState] = useState({ status: "idle", message: "" });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(signals));
  }, [signals]);

  const visibleSignals = useMemo(() => {
    return [...signals]
      .filter((signal) => signal.status !== "rejected")
      .sort(
        (a, b) =>
          Number(b.verified) - Number(a.verified) || b.score - a.score || b.detectedAt.localeCompare(a.detectedAt),
      );
  }, [signals]);

  useEffect(() => {
    if (!visibleSignals.some((signal) => signal.id === selectedSignalId)) {
      setSelectedSignalId(visibleSignals[0]?.id ?? null);
    }
  }, [selectedSignalId, visibleSignals]);

  const selectedSignal = visibleSignals.find((signal) => signal.id === selectedSignalId);
  const reviewSignals = signals.filter((signal) => signal.status === "review");
  const verifiedSignals = signals.filter((signal) => signal.status !== "rejected" && signal.verified);
  const cityCount = new Set(signals.filter((signal) => signal.status !== "rejected").map((signal) => signal.city)).size;
  const regionCount = new Set(creators.map((creator) => creator.region.split("/")[0].trim())).size;
  const topCreators = [...creators].sort((a, b) => b.weight - a.weight).slice(0, 12);

  async function importTikTok() {
    setImportState({ status: "loading", message: "Pobieram metadane filmu..." });

    try {
      const metadata = await fetchTikTokMetadata(form.sourceUrl);
      const handle = extractHandle(metadata.authorUrl) || normalizeHandle(metadata.authorName);
      const inferredCity = inferCity(metadata.title);

      setForm((current) => ({
        ...current,
        sourceUrl: metadata.sourceUrl,
        caption: metadata.title || current.caption,
        creator: handle || current.creator,
        city: current.city || inferredCity,
      }));
      setImportState({ status: "success", message: "Pobrano autora i opis. Uzupełnij miasto/adres, jeśli brakuje." });
    } catch (error) {
      setImportState({ status: "error", message: error.message || "Nie udało się pobrać filmu TikTok." });
    }
  }

  async function importBatch() {
    const urls = extractTikTokUrls(batchText);

    if (!urls.length) {
      setImportState({ status: "error", message: "Wklej przynajmniej jeden konkretny link do filmu TikTok." });
      return;
    }

    setImportState({ status: "loading", message: `Przetwarzam ${urls.length} linków TikTok...` });

    const results = await Promise.allSettled(urls.map((url) => fetchTikTokMetadata(url)));
    const imported = [];
    let ignored = 0;
    let failed = 0;

    results.forEach((result) => {
      if (result.status !== "fulfilled") {
        failed += 1;
        return;
      }

      const signal = signalFromMetadata(result.value);

      if (signal.status === "rejected") {
        ignored += 1;
        return;
      }

      imported.push(signal);
    });

    if (imported.length) {
      setSignals((current) => mergeSignals(imported, current));
      setSelectedSignalId(imported[0].id);
      setBatchText("");
    }

    setImportState({
      status: imported.length ? "success" : "error",
      message: `Zaimportowano ${imported.length}. Pominięto ${ignored} jako niepodobne do nowych otwarć. Błędy: ${failed}.`,
    });
  }

  function submitSignal(event) {
    event.preventDefault();

    if (!isTikTokUrl(form.sourceUrl)) {
      setImportState({ status: "error", message: "Dodaj konkretny link do filmu TikTok przed zapisem." });
      return;
    }

    const signal = enrichSignal({
      id: crypto.randomUUID(),
      venue: inferVenue(form.caption),
      city: form.city.trim() || "Do ustalenia",
      district: "Do ustalenia",
      address: form.address.trim() || "Do sprawdzenia w Google Places",
      category: inferCategory(form.caption),
      creator: form.creator.replace("@", "") || "Ręczne źródło",
      handle: form.creator.startsWith("@") ? form.creator : `@${form.creator}`,
      caption: form.caption.trim(),
      sourceUrl: form.sourceUrl.trim(),
      detectedAt: new Date().toISOString().slice(0, 10),
    });

    if (signal.status === "rejected") {
      setImportState({
        status: "error",
        message: "Ten opis nie wygląda na nowe otwarcie. Dodaj frazę typu: nowy lokal, otwarcie, nowe miejsce.",
      });
      return;
    }

    setSignals((current) => mergeSignals([signal], current));
    setSelectedSignalId(signal.id);
    setForm(emptyForm);
    setImportState({ status: "success", message: "Dodano wykrycie z konkretnym filmem TikTok." });
  }

  function toggleVerified(id) {
    setSignals((current) => current.map((signal) => (signal.id === id ? { ...signal, verified: !signal.verified } : signal)));
  }

  function resetSignals() {
    setSignals([]);
    setSelectedSignalId(null);
    setImportState({ status: "idle", message: "" });
  }

  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-5 text-ink dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-5">
        <Header darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)} />

        <Hero />

        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3" aria-label="Podsumowanie">
          <Metric icon={SearchCheck} label="Znalezione" value={visibleSignals.length} tone="emerald" />
          <Metric icon={Clock3} label="Do sprawdzenia" value={reviewSignals.length} tone="amber" />
          <Metric icon={MapPin} label="Miasta" value={cityCount} tone="neutral" />
          <Metric icon={CheckCircle2} label="Sprawdzone" value={verifiedSignals.length} tone="ink" />
        </section>

        <SourceRadar creators={topCreators} total={creators.length} regions={regionCount} />

        <section className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,430px),1fr))] gap-5">
          <div className="grid min-w-0 gap-5">
            <SignalsPanel
              signals={visibleSignals}
              selectedSignalId={selectedSignalId}
              onSelect={setSelectedSignalId}
              onVerify={toggleVerified}
            />
          </div>

          <aside className="grid min-w-0 content-start gap-5">
            <DetailPanel signal={selectedSignal} />
            <ImportPanel
              form={form}
              batchText={batchText}
              importState={importState}
              onChange={setForm}
              onBatchChange={setBatchText}
              onImport={importTikTok}
              onBatchImport={importBatch}
              onSubmit={submitSignal}
              onReset={resetSignals}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function Header({ darkMode, onToggleTheme }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-ink text-lg font-black text-white shadow-2xl shadow-emerald-950/10 dark:bg-white dark:text-ink">
          N
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">Gastro radar</p>
          <h1 className="text-5xl font-black leading-none tracking-tight sm:text-6xl lg:text-7xl">Nowe lokale</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" className="rounded-2xl">
          <Users className="size-4" />
          Watchlista
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">
            {creators.length}
          </span>
        </Button>
        <Button variant="secondary" className="size-11 rounded-full px-0" onClick={onToggleTheme} aria-label="Zmień motyw">
          {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <Card className="relative overflow-hidden p-5 sm:p-6 lg:p-8">
      <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-400/10" />
      <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/10" />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
        <div>
          <Badge className="mb-4 border-emerald-500/20 bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">
            <Sparkles className="mr-1.5 size-3.5" />
            Import konkretnych filmów TikTok
          </Badge>
          <h2 className="max-w-3xl text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
            Wklej film, pobierz opis i zamień go w sygnał o nowym lokalu.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
            Aplikacja nie udaje automatycznego skanera. Działa na konkretnych URL-ach filmów TikTok, zachowuje źródło,
            pomaga wyciągnąć miasto, lokal i status weryfikacji.
          </p>
        </div>
        <div className="relative rounded-3xl border border-white/50 bg-white/60 p-4 shadow-inner backdrop-blur dark:border-white/10 dark:bg-white/10">
          <div className="overflow-hidden rounded-2xl bg-ink p-5 text-white dark:bg-white dark:text-ink">
            <div className="flex items-center justify-between">
              <Radar className="size-6 text-emerald-300 dark:text-emerald-700" />
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold dark:bg-black/10">LIVE READY</span>
            </div>
            <p className="mt-8 text-sm text-white/70 dark:text-black/60">Pipeline</p>
            <p className="mt-1 text-2xl font-black">TikTok URL → metadata → signal</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  const toneClass = {
    emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200",
    neutral: "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200",
    ink: "bg-ink text-white dark:bg-white dark:text-ink",
  }[tone];

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-3 text-4xl font-black tracking-tight">{value}</p>
        </div>
        <div className={cn("grid size-10 place-items-center rounded-2xl", toneClass)}>
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}

function SourceRadar({ creators: topCreators, total, regions }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-black">Radar źródeł</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{total} profili, {regions} regionów</p>
        </div>
        <ChevronRight className="size-5 text-zinc-400" />
      </div>
      <div className="flex min-w-0 gap-3 overflow-x-auto overflow-y-hidden pb-2 [scrollbar-width:thin]">
        {topCreators.map((creator, index) => (
          <motion.article
            key={creator.handle}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.025 }}
            className="group grid min-h-32 w-56 shrink-0 content-between rounded-2xl border border-black/10 bg-white/70 p-4 transition hover:-translate-y-1 hover:border-emerald-500/30 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/[0.14]"
          >
            <div>
              <p className="font-black">{creator.name}</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{creator.region}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <a
                className="inline-flex min-w-0 items-center gap-1 text-xs font-semibold text-zinc-500 transition hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-300"
                href={creatorUrl(creator)}
                target="_blank"
                rel="noreferrer"
              >
                <Link2 className="size-3 shrink-0" />
                <span className="truncate">{creator.platform}</span>
              </a>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">
                {creator.weight}
              </span>
            </div>
          </motion.article>
        ))}
      </div>
    </Card>
  );
}

function SignalsPanel({ signals, selectedSignalId, onSelect, onVerify }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-black">Znalezione lokale</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{signals.length} wyników z konkretnych filmów</p>
        </div>
        <Badge>{signals.length ? "gotowe do weryfikacji" : "pusto"}</Badge>
      </div>

      <div className="grid gap-3">
        <AnimatePresence initial={false}>
          {signals.length ? (
            signals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                selected={signal.id === selectedSignalId}
                onSelect={() => onSelect(signal.id)}
                onVerify={() => onVerify(signal.id)}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-dashed border-black/15 bg-white/45 p-8 text-center dark:border-white/15 dark:bg-white/[0.04]"
            >
              <CircleDashed className="mx-auto size-10 text-zinc-400" />
              <h3 className="mt-4 text-lg font-black">Brak wykryć</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                Wklej konkretny film TikTok w formularzu, pobierz metadane i zapisz sygnał. Wtedy pojawi się tutaj
                z prawdziwym odnośnikiem do źródła.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

function SignalCard({ signal, selected, onSelect, onVerify }) {
  const googleMapsUrl = buildGoogleMapsUrl(signal);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onSelect}
      className={cn(
        "grid cursor-pointer gap-4 rounded-3xl border p-4 transition sm:grid-cols-[minmax(0,1fr)_210px]",
        selected
          ? "border-emerald-500/50 bg-emerald-50/70 shadow-[0_18px_40px_rgba(15,118,101,0.12)] dark:bg-emerald-400/10"
          : "border-black/10 bg-white/55 hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={signal.status === "review" ? "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200"}>
            {signal.status === "review" ? "do sprawdzenia" : "wykryte"}
          </Badge>
          {signal.verified && <Badge className="bg-ink text-white dark:bg-white dark:text-ink"><Check className="mr-1 size-3" />sprawdzone</Badge>}
          <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{signal.score}%</span>
        </div>
        <h3 className="mt-3 text-xl font-black tracking-tight">{signal.venue}</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{signal.address}, {signal.city}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>{signal.category}</Badge>
          <Badge>{signal.detectedAt}</Badge>
        </div>
      </div>

      <div className="grid content-center gap-2 border-black/10 sm:border-l sm:pl-4 dark:border-white/10">
        <p className="font-black">{signal.creator}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{signal.handle}</p>
        <a className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-300" href={signal.sourceUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
          Film TikTok <ExternalLink className="size-3.5" />
        </a>
        {googleMapsUrl && (
          <a className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-300" href={googleMapsUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
            Google Maps <ArrowUpRight className="size-3.5" />
          </a>
        )}
        <Button
          type="button"
          variant={signal.verified ? "primary" : "secondary"}
          className="mt-1"
          onClick={(event) => {
            event.stopPropagation();
            onVerify();
          }}
        >
          {signal.verified ? "Sprawdzone" : "Oznacz sprawdzone"}
        </Button>
      </div>
    </motion.article>
  );
}

function DetailPanel({ signal }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-black">Podgląd</h2>
        <Badge>aktywny lokal</Badge>
      </div>
      {signal ? (
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <span className="rounded-2xl bg-ink px-3 py-2 text-sm font-black text-white dark:bg-white dark:text-ink">{signal.score}%</span>
            {signal.verified && <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">sprawdzone</Badge>}
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight">{signal.venue}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{signal.caption}</p>
          </div>
          <dl className="grid gap-2 text-sm">
            <InfoRow label="Miasto" value={signal.city} />
            <InfoRow label="Adres" value={signal.address} />
            <InfoRow label="Źródło" value={signal.creator} />
          </dl>
          <div className="grid gap-2 border-t border-black/10 pt-4 dark:border-white/10">
            <a className="inline-flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300" href={signal.sourceUrl} target="_blank" rel="noreferrer">
              Otwórz film TikTok <ExternalLink className="size-4" />
            </a>
            {buildGoogleMapsUrl(signal) && (
              <a className="inline-flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300" href={buildGoogleMapsUrl(signal)} target="_blank" rel="noreferrer">
                Otwórz Google Maps <MapPin className="size-4" />
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-black/15 p-5 text-sm text-zinc-500 dark:border-white/15 dark:text-zinc-400">
          Wybierz lokal z listy albo zaimportuj pierwszy film TikTok.
        </div>
      )}
    </Card>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-3">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function ImportPanel({ form, batchText, importState, onChange, onBatchChange, onImport, onBatchImport, onSubmit, onReset }) {
  const loading = importState.status === "loading";

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-black">Importer filmu</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Wklej URL TikToka i pobierz opis.</p>
        </div>
        <Button variant="ghost" onClick={onReset} type="button" className="rounded-xl">
          <RefreshCcw className="size-4" />
        </Button>
      </div>

      <form className="grid gap-4" onSubmit={onSubmit}>
        <Field label="Konkretny film TikTok">
          <Input
            required
            type="url"
            value={form.sourceUrl}
            onChange={(event) => onChange((current) => ({ ...current, sourceUrl: event.target.value }))}
            placeholder="https://www.tiktok.com/@profil/video/..."
          />
        </Field>
        <Button type="button" variant="secondary" onClick={onImport} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Film className="size-4" />}
          {loading ? "Pobieram..." : "Pobierz z TikToka"}
        </Button>
        <Field label="Import seryjny">
          <Textarea
            value={batchText}
            onChange={(event) => onBatchChange(event.target.value)}
            placeholder="Wklej kilka linków TikTok, każdy w osobnej linii albo po spacji."
          />
        </Field>
        <Button type="button" variant="secondary" onClick={onBatchImport} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />}
          Przetwórz serię linków
        </Button>
        {importState.message && (
          <p
            className={cn(
              "rounded-2xl px-3 py-2 text-sm",
              importState.status === "error"
                ? "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-200"
                : "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200",
            )}
            role="status"
          >
            {importState.message}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Field label="Twórca">
            <Input value={form.creator} onChange={(event) => onChange((current) => ({ ...current, creator: event.target.value }))} placeholder="@profil" />
          </Field>
          <Field label="Miasto">
            <Input value={form.city} onChange={(event) => onChange((current) => ({ ...current, city: event.target.value }))} placeholder="Warszawa" />
          </Field>
        </div>
        <Field label="Adres">
          <Input value={form.address} onChange={(event) => onChange((current) => ({ ...current, address: event.target.value }))} placeholder="ul. Przykładowa 1" />
        </Field>
        <Field label="Opis filmu lub posta">
          <Textarea
            required
            value={form.caption}
            onChange={(event) => onChange((current) => ({ ...current, caption: event.target.value }))}
            placeholder="Opis pobierze się z TikToka albo wpisz go ręcznie."
          />
        </Field>
        <Button type="submit">
          <Plus className="size-4" />
          Zapisz wykrycie
        </Button>
      </form>
    </Card>
  );
}

async function fetchTikTokMetadata(sourceUrl) {
  if (!sourceUrl) throw new Error("Najpierw wklej link do filmu TikTok.");
  if (!isTikTokUrl(sourceUrl)) throw new Error("Importer obsługuje tylko linki TikTok.");

  const response = await fetch(`/api/tiktok-oembed?url=${encodeURIComponent(sourceUrl)}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(data.error || "TikTok nie zwrócił metadanych dla tego linku.");
  return data;
}

function signalFromMetadata(metadata) {
  const handle = extractHandle(metadata.authorUrl) || normalizeHandle(metadata.authorName);
  const caption = metadata.title || "";
  const city = inferCity(caption) || "Do ustalenia";

  return enrichSignal({
    id: crypto.randomUUID(),
    venue: inferVenue(caption),
    city,
    district: "Do ustalenia",
    address: "Do sprawdzenia w Google Places",
    category: inferCategory(caption),
    creator: (metadata.authorName || handle || "TikTok").replace("@", ""),
    handle: handle || "@tiktok",
    caption,
    sourceUrl: metadata.sourceUrl,
    detectedAt: new Date().toISOString().slice(0, 10),
  });
}

function mergeSignals(incoming, current) {
  const existingUrls = new Set(current.map((signal) => normalizeUrl(signal.sourceUrl)));
  const fresh = incoming.filter((signal) => !existingUrls.has(normalizeUrl(signal.sourceUrl)));

  return [...fresh, ...current];
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";

    return parsed.toString();
  } catch {
    return url;
  }
}

function extractTikTokUrls(text) {
  return [
    ...new Set(
      text
        .split(/\s+/)
        .map((item) => item.trim().replace(/[),.;]+$/, ""))
        .filter(isTikTokUrl),
    ),
  ];
}

function loadSignals() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").map(enrichSignal);
  } catch {
    return [];
  }
}

function enrichSignal(signal) {
  const score = scoreSignal(signal);
  return { ...signal, verified: Boolean(signal.verified), score, status: score >= 78 ? "confirmed" : score >= 42 ? "review" : "rejected" };
}

function scoreSignal(signal) {
  const text = `${signal.caption} ${signal.venue} ${signal.address}`.toLowerCase();
  const creatorWeight = creators.find((creator) => creator.handle === signal.handle)?.weight ?? 58;
  const openHits = openKeywords.filter((keyword) => text.includes(keyword)).length;
  const rejectHits = rejectKeywords.filter((keyword) => text.includes(keyword)).length;
  const hasAddress = !/do sprawdzenia|do ustalenia/i.test(`${signal.address} ${signal.district}`);
  const hasVenue = signal.venue && signal.venue !== "Nowy lokal";
  return Math.max(0, Math.min(99, Math.round(creatorWeight * 0.45 + openHits * 18 + Number(hasAddress) * 12 + Number(hasVenue) * 8 - rejectHits * 26)));
}

function inferVenue(caption) {
  const quoted = caption.match(/[„"](.*?)[”"]/);
  if (quoted?.[1]) return quoted[1].slice(0, 42);
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

function inferCity(text) {
  const cities = ["Warszawa", "Kraków", "Krakow", "Wrocław", "Wroclaw", "Poznań", "Poznan", "Katowice", "Gdańsk", "Gdansk", "Sopot", "Gdynia", "Łódź", "Lodz", "Rzeszów", "Rzeszow", "Lublin", "Szczecin", "Bydgoszcz", "Toruń", "Torun"];
  const match = cities.find((city) => text.toLowerCase().includes(city.toLowerCase()));
  const aliases = { Krakow: "Kraków", Wroclaw: "Wrocław", Poznan: "Poznań", Gdansk: "Gdańsk", Lodz: "Łódź", Rzeszow: "Rzeszów", Torun: "Toruń" };
  return match ? aliases[match] || match : "";
}

function extractHandle(authorUrl) {
  try {
    return new URL(authorUrl).pathname.split("/").find((segment) => segment.startsWith("@")) || "";
  } catch {
    return "";
  }
}

function normalizeHandle(authorName) {
  return authorName ? (authorName.startsWith("@") ? authorName : `@${authorName.replace(/\s+/g, "").toLowerCase()}`) : "";
}

function buildGoogleMapsUrl(signal) {
  if (!signal.address || /do sprawdzenia|do ustalenia/i.test(signal.address)) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([signal.address, signal.city, "Polska"].filter(Boolean).join(", "))}`;
}

function isTikTokUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "tiktok.com" || parsed.hostname.endsWith(".tiktok.com");
  } catch {
    return false;
  }
}

function creatorUrl(creator) {
  const username = creator.handle.replace("@", "");

  if (creator.platform.toLowerCase().includes("tiktok")) {
    return `https://www.tiktok.com/@${username}`;
  }

  if (creator.platform.toLowerCase().includes("instagram")) {
    return `https://www.instagram.com/${username}/`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(`${creator.name} ${creator.region} restauracje`)}`;
}

createRoot(document.getElementById("root")).render(<App />);
