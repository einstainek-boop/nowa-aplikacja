import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  ExternalLink,
  FileSearch,
  Film,
  Link2,
  Loader2,
  MapPin,
  Moon,
  Plus,
  RefreshCcw,
  SearchCheck,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { creators, curatedSignals, openKeywords, rejectKeywords } from "./data";
import { Badge, Button, Card, Field, Input, Textarea } from "./components/ui";
import { cn } from "./lib/utils";
import "./styles.css";

const STORAGE_KEY = "gastroSignalsV4";
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
  const [lastRefresh, setLastRefresh] = useState(() => localStorage.getItem("lastRefresh") || "");

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
  const topCreators = [...creators].sort((a, b) => b.weight - a.weight);

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
    const items = extractSourceItems(batchText);

    if (!items.length) {
      setImportState({ status: "error", message: "Wklej przynajmniej jeden konkretny link do posta, filmu albo artykułu." });
      return;
    }

    setImportState({ status: "loading", message: `Przetwarzam ${items.length} linków źródłowych...` });

    const results = await Promise.allSettled(items.map((item) => sourceItemToSignal(item)));
    const imported = [];
    let ignored = 0;
    let failed = 0;

    results.forEach((result) => {
      if (result.status !== "fulfilled") {
        failed += 1;
        return;
      }

      const signal = result.value;

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

    if (!isValidUrl(form.sourceUrl)) {
      setImportState({ status: "error", message: "Dodaj konkretny link do filmu, posta albo artykułu przed zapisem." });
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
      verification: "maps_pending",
    });

    if (signal.status === "rejected") {
      setImportState({
        status: "error",
        message: `Ten opis nie wygląda na nowe otwarcie. ${signal.rejectionReason || "Dodaj frazę typu: nowy lokal, otwarcie, nowe miejsce."}`,
      });
      return;
    }

    setSignals((current) => mergeSignals([signal], current));
    setSelectedSignalId(signal.id);
    setForm(emptyForm);
    setImportState({ status: "success", message: "Dodano kandydata z konkretnym źródłem i scoringiem nowego otwarcia." });
  }

  function toggleVerified(id) {
    setSignals((current) =>
      current.map((signal) =>
        signal.id === id
          ? {
              ...signal,
              verified: !signal.verified,
              verification: signal.verified ? "maps_pending" : "maps_confirmed",
            }
          : signal,
      ),
    );
  }

  function resetSignals() {
    const seededSignals = initialCuratedSignals();
    setSignals(seededSignals);
    setSelectedSignalId(seededSignals[0]?.id ?? null);
    setImportState({ status: "idle", message: "" });
  }

  function refreshPlaces() {
    const seededSignals = initialCuratedSignals();
    let freshSignals = [];

    setSignals((current) => {
      freshSignals = getFreshSignals(seededSignals, current);
      return [...freshSignals, ...current];
    });

    if (freshSignals[0]) {
      setSelectedSignalId(freshSignals[0].id);
    }

    const refreshedAt = new Date().toISOString();
    setLastRefresh(refreshedAt);
    localStorage.setItem("lastRefresh", refreshedAt);
    setImportState({
      status: "success",
      message: freshSignals.length
        ? `Odświeżono listę. Dodano ${freshSignals.length} nowych miejsc z zapisanych źródeł.`
        : "Odświeżono listę. Nie ma nowych miejsc w zapisanych źródłach aplikacji.",
    });
  }

  return (
    <main className="min-h-screen overflow-x-hidden px-4 py-5 text-ink dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-5">
        <Header
          darkMode={darkMode}
          lastRefresh={lastRefresh}
          onRefresh={refreshPlaces}
          onToggleTheme={() => setDarkMode((value) => !value)}
        />

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

function Header({ darkMode, lastRefresh, onRefresh, onToggleTheme }) {
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
        <Button variant="secondary" className="rounded-2xl" onClick={onRefresh} title={lastRefresh ? `Ostatnio: ${formatRefreshTime(lastRefresh)}` : "Jeszcze nie odświeżano"}>
          <RefreshCcw className="size-4" />
          Odśwież miejsca
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
      <div className="relative">
        <Badge className="mb-4 border-emerald-500/20 bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">
          <Sparkles className="mr-1.5 size-3.5" />
          Konkretne źródła, nie losowy skan
        </Badge>
        <h2 className="max-w-4xl text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
          Wklej post, film albo artykuł i przepuść go przez scoring nowego otwarcia.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
          Aplikacja działa na watchliście twórców i konkretnych URL-ach. Kandydat musi mieć sygnał nowości,
          lokalizację do sprawdzenia i link do źródła, zanim trafi na listę.
        </p>
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
    <Card className="overflow-hidden p-3 sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0 border-r border-black/10 pr-3 dark:border-white/10">
          <h2 className="text-sm font-black">Radar źródeł</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{total} profili / {regions} regionów</p>
        </div>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:thin]">
        {topCreators.map((creator, index) => (
          <motion.a
            key={creator.handle}
            href={creatorUrl(creator)}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.025 }}
            className="group inline-flex h-11 min-w-48 shrink-0 items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/70 px-3 text-left transition hover:-translate-y-0.5 hover:border-emerald-500/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/[0.14]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{creator.name}</p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{creator.region}</p>
            </div>
            <Link2 className="size-3.5 shrink-0 text-zinc-400 transition group-hover:text-emerald-700 dark:group-hover:text-emerald-300" />
          </motion.a>
        ))}
        </div>
        <ChevronRight className="hidden size-5 shrink-0 text-zinc-400 sm:block" />
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
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{signals.length} wyników z konkretnych źródeł</p>
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
            {signal.status === "review" ? "kandydat" : "mocny sygnał"}
          </Badge>
          <Badge className="bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">{verificationLabel(signal)}</Badge>
          {signal.verified && <Badge className="bg-ink text-white dark:bg-white dark:text-ink"><Check className="mr-1 size-3" />sprawdzone</Badge>}
          <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{signal.score}%</span>
        </div>
        <h3 className="mt-3 text-xl font-black tracking-tight">{signal.venue}</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{signal.address}, {signal.city}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>{signal.category}</Badge>
          <Badge>{signal.detectedAt}</Badge>
          {signal.reasons?.slice(0, 2).map((reason) => <Badge key={reason}>{reason}</Badge>)}
        </div>
      </div>

      <div className="grid content-center gap-2 border-black/10 sm:border-l sm:pl-4 dark:border-white/10">
        <p className="font-black">{signal.creator}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{signal.handle}</p>
        <a className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-300" href={signal.sourceUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
          {sourceLabel(signal.sourceUrl)} <ExternalLink className="size-3.5" />
        </a>
        {googleMapsUrl && (
          <a className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-300" href={googleMapsUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
            Sprawdź w Maps <ArrowUpRight className="size-3.5" />
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
        <Badge>{signal ? statusLabel(signal.status) : "brak wyboru"}</Badge>
      </div>
      {signal ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-2xl bg-ink px-3 py-2 text-sm font-black text-white dark:bg-white dark:text-ink">{signal.score}%</span>
            <Badge className="bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">{verificationLabel(signal)}</Badge>
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
          <div className="rounded-2xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-black">Dlaczego to przeszło?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(signal.reasons?.length ? signal.reasons : ["Brak mocnych powodów - wymaga ręcznej weryfikacji"]).map((reason) => (
                <Badge key={reason}>{reason}</Badge>
              ))}
            </div>
            {signal.warnings?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {signal.warnings.map((warning) => (
                  <Badge key={warning} className="bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">{warning}</Badge>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-2 border-t border-black/10 pt-4 dark:border-white/10">
            <a className="inline-flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300" href={signal.sourceUrl} target="_blank" rel="noreferrer">
              {openSourceLabel(signal.sourceUrl)} <ExternalLink className="size-4" />
            </a>
            {buildGoogleMapsUrl(signal) && (
              <a className="inline-flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300" href={buildGoogleMapsUrl(signal)} target="_blank" rel="noreferrer">
                Sprawdź lokal w Google Maps <MapPin className="size-4" />
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
  const canFetchTikTok = isTikTokUrl(form.sourceUrl);
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-black">Importer źródła</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Wklej konkretny link i opis posta, filmu albo artykułu.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onReset} type="button" className="rounded-xl" aria-label="Resetuj wykrycia">
            <RefreshCcw className="size-4" />
          </Button>
          <Button
            variant="secondary"
            onClick={() => setExpanded((value) => !value)}
            type="button"
            className="rounded-xl"
            aria-expanded={expanded}
          >
            <ChevronRight className={cn("size-4 transition", expanded && "rotate-90")} />
            {expanded ? "Zwiń" : "Rozwiń"}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="mt-4 grid overflow-hidden"
            onSubmit={onSubmit}
          >
            <div className="grid gap-4">
              <Field label="Konkretny link źródłowy">
                <Input
                  required
                  type="url"
                  value={form.sourceUrl}
                  onChange={(event) => onChange((current) => ({ ...current, sourceUrl: event.target.value }))}
                  placeholder="TikTok, Instagram, Facebook albo artykuł"
                />
              </Field>
              <Button type="button" variant="secondary" onClick={onImport} disabled={loading || !canFetchTikTok}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Film className="size-4" />}
                {loading ? "Pobieram..." : canFetchTikTok ? "Pobierz opis z TikToka" : "Autouzupełnianie tylko dla TikToka"}
              </Button>
              <Field label="Import seryjny">
                <Textarea
                  value={batchText}
                  onChange={(event) => onBatchChange(event.target.value)}
                  placeholder="Wklej linki lub linie typu: URL + opis posta. TikTok pobierze opis automatycznie, Instagram/Facebook wymagają tekstu w tej samej linii."
                />
              </Field>
              <Button type="button" variant="secondary" onClick={onBatchImport} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <FileSearch className="size-4" />}
                Przetwórz kandydatów
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
                  placeholder="Szukamy fraz: nowe miejsce, nowy lokal, otwarcie, soft opening, właśnie ruszył..."
                />
              </Field>
              <Button type="submit">
                <Plus className="size-4" />
                Oceń i zapisz kandydata
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
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
    verification: "maps_pending",
  });
}

async function sourceItemToSignal(item) {
  if (isTikTokUrl(item.url)) {
    return signalFromMetadata(await fetchTikTokMetadata(item.url));
  }

  const caption = item.caption || "";
  const creator = inferCreatorFromUrl(item.url);

  return enrichSignal({
    id: crypto.randomUUID(),
    venue: inferVenue(caption),
    city: inferCity(caption) || "Do ustalenia",
    district: "Do ustalenia",
    address: inferAddress(caption) || "Do sprawdzenia w Google Places",
    category: inferCategory(caption),
    creator,
    handle: normalizeHandle(creator),
    caption,
    sourceUrl: item.url,
    detectedAt: new Date().toISOString().slice(0, 10),
    verification: "maps_pending",
  });
}

function mergeSignals(incoming, current) {
  const fresh = getFreshSignals(incoming, current);

  return [...fresh, ...current];
}

function getFreshSignals(incoming, current) {
  const existingKeys = new Set(current.map(signalKey));
  const fresh = [];

  incoming.forEach((signal) => {
    const key = signalKey(signal);
    if (existingKeys.has(key)) return;
    existingKeys.add(key);
    fresh.push(signal);
  });

  return fresh;
}

function signalKey(signal) {
  return `${normalizeUrl(signal.sourceUrl)}::${(signal.venue || "").trim().toLowerCase()}`;
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

function extractSourceItems(text) {
  const seen = new Set();

  return text
    .split(/\n+/)
    .flatMap((line) => {
      const urls = extractUrls(line);
      return urls.map((url) => ({ url, caption: line.replace(url, "").trim() }));
    })
    .filter((item) => {
      const normalized = normalizeUrl(item.url);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

function loadSignals() {
  try {
    const seededSignals = initialCuratedSignals();
    const storedSignals = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

    if (!Array.isArray(storedSignals)) {
      return seededSignals;
    }

    return mergeSignals(seededSignals, storedSignals.map(enrichSignal));
  } catch {
    return initialCuratedSignals();
  }
}

function initialCuratedSignals() {
  return curatedSignals.map(enrichSignal);
}

function enrichSignal(signal) {
  const assessment = assessSignal(signal);

  return {
    ...signal,
    verified: Boolean(signal.verified),
    verification: signal.verification || "maps_pending",
    score: assessment.score,
    status: assessment.status,
    reasons: assessment.reasons,
    warnings: assessment.warnings,
    rejectionReason: assessment.rejectionReason,
  };
}

function assessSignal(signal) {
  const text = `${signal.caption} ${signal.venue} ${signal.address}`.toLowerCase();
  const creatorWeight = creators.find((creator) => creator.handle === signal.handle)?.weight ?? 58;
  const openMatches = openKeywords.filter((keyword) => text.includes(keyword));
  const rejectMatches = rejectKeywords.filter((keyword) => text.includes(keyword));
  const hasAddress = !/do sprawdzenia|do ustalenia/i.test(`${signal.address} ${signal.district}`);
  const hasVenue = signal.venue && signal.venue !== "Nowy lokal";
  const hasConcreteSource = isValidUrl(signal.sourceUrl);
  const isWatchlisted = creators.some((creator) => creator.handle === signal.handle);
  const sourceBoost = isWatchlisted ? 12 : 4;
  const openScore = Math.min(openMatches.length, 3) * 20;
  const rejectPenalty = rejectMatches.length * 28;
  const score = Math.max(
    0,
    Math.min(
      99,
      Math.round(
        creatorWeight * 0.35 +
          sourceBoost +
          openScore +
          Number(hasAddress) * 10 +
          Number(hasVenue) * 8 +
          Number(hasConcreteSource) * 8 -
          rejectPenalty,
      ),
    ),
  );
  const reasons = [
    isWatchlisted && "źródło z watchlisty",
    hasConcreteSource && "konkretny link",
    openMatches.length > 0 && `sygnał nowości: ${openMatches.slice(0, 2).join(", ")}`,
    hasAddress && "adres do sprawdzenia",
    hasVenue && "nazwa lokalu",
  ].filter(Boolean);
  const warnings = [
    !openMatches.length && "brak frazy nowego otwarcia",
    !hasAddress && "brak potwierdzonego adresu",
    rejectMatches.length > 0 && `możliwa polecajka/ranking: ${rejectMatches.slice(0, 2).join(", ")}`,
  ].filter(Boolean);

  if (!hasConcreteSource) {
    return { score: 0, status: "rejected", reasons, warnings, rejectionReason: "Brakuje konkretnego linku do źródła." };
  }

  if (!openMatches.length) {
    return {
      score: Math.min(score, 41),
      status: "rejected",
      reasons,
      warnings,
      rejectionReason: "Brakuje sygnału nowości w opisie źródła.",
    };
  }

  if (rejectMatches.length >= 2) {
    return {
      score: Math.min(score, 41),
      status: "rejected",
      reasons,
      warnings,
      rejectionReason: "Opis wygląda bardziej na ranking albo zwykłą polecajkę niż nowe otwarcie.",
    };
  }

  return { score, status: score >= 78 ? "confirmed" : "review", reasons, warnings, rejectionReason: "" };
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

function inferAddress(caption) {
  const match = caption.match(/(?:ul\.|ulica|przy|adres:)\s*([A-ZŁŚŻŹĆŃÓ0-9][\wąćęłńóśźż ./-]{3,48}\s+\d+[A-Za-z]?)/i);
  return match?.[1]?.trim() || "";
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

function inferCreatorFromUrl(sourceUrl) {
  try {
    const parsed = new URL(sourceUrl);
    const host = parsed.hostname.replace(/^www\./, "");
    const profile = parsed.pathname.split("/").filter(Boolean)[0];

    if (host.includes("instagram.com") && profile) return `@${profile}`;
    if (host.includes("facebook.com") && profile) return profile;
    return host.split(".")[0];
  } catch {
    return "Źródło";
  }
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

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function extractUrls(text) {
  return [...text.matchAll(/https?:\/\/[^\s),;]+/g)].map((match) => match[0].replace(/[),.;]+$/, ""));
}

function sourceLabel(url) {
  return isTikTokUrl(url) ? "Film TikTok" : "Źródło";
}

function openSourceLabel(url) {
  return isTikTokUrl(url) ? "Otwórz film TikTok" : "Otwórz źródło";
}

function statusLabel(status) {
  if (status === "confirmed") return "mocny sygnał";
  if (status === "review") return "kandydat";
  return "odrzucone";
}

function verificationLabel(signal) {
  if (signal.verified || signal.verification === "maps_confirmed") return "Maps sprawdzone";
  return "Maps do sprawdzenia";
}

function formatRefreshTime(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function creatorUrl(creator) {
  if (creator.profileUrl) {
    return creator.profileUrl;
  }

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
