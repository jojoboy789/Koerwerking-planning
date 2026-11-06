import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Loader2,
  Megaphone,
  RefreshCw,
  Wifi,
  WifiOff,
  Layers3,
  ArrowDownToLine,
  Info,
} from 'lucide-react';
import { api } from '../services/api';

type OCSlide = {
  id: string;
  title: string;
  seconds: number;
  urgent: boolean;
  dated: boolean;
  version: string;
  updated_at: string;
  expires: string | null;
  html: string;
};

type OCPlanningResponse = {
  generated_at?: string;
  poll_seconds?: number;
  slides: OCSlide[];
};

type FilterType = 'all' | 'planning' | 'notices';

const formatDateTime = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Onbekend';
  return date.toLocaleString('nl-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const downloadSlide = (slide: OCSlide) => {
  const safeTitle = slide.title.replace(/[<>&"]/g, '');
  const htmlDocument = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
</head>
<body>
${slide.html}
</body>
</html>`;

  const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `OC-Planning-${slide.id}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const FilterButton: React.FC<{
  active: boolean;
  label: string;
  count: number;
  icon: React.ElementType;
  onClick: () => void;
}> = ({ active, label, count, icon: Icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
      active
        ? 'border-[#ffdc00] bg-[#ffdc00] text-[#17202b] shadow-sm'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
    }`}
  >
    <Icon className="h-4 w-4" />
    <span>{label}</span>
    <span
      className={`min-w-6 rounded-lg px-1.5 py-0.5 text-xs ${
        active ? 'bg-[#17202b]/10 text-[#17202b]' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {count}
    </span>
  </button>
);

export const OCPlanningView: React.FC = () => {
  const { user } = useAuth();

  const [slides, setSlides] = useState<OCSlide[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPlanning = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);

    try {
      const token = api.getAuthToken();
      const response = await fetch('/api/oc-planning', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'De OC-planning kon niet worden opgehaald.');
      }

      const result = data as OCPlanningResponse;
      setSlides(Array.isArray(result.slides) ? result.slides : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Er is een onverwachte fout opgetreden.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlanning();
    const interval = window.setInterval(() => {
      void fetchPlanning(true);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [fetchPlanning]);

  const counts = useMemo(
    () => ({
      all: slides.length,
      planning: slides.filter((slide) => slide.dated).length,
      notices: slides.filter((slide) => !slide.dated).length,
      urgent: slides.filter((slide) => slide.urgent).length,
    }),
    [slides]
  );

  const filteredSlides = useMemo(
    () =>
      slides
        .filter((slide) => {
          if (filter === 'planning') return slide.dated;
          if (filter === 'notices') return !slide.dated;
          return true;
        })
        // Toon bij 'Alles' eerst alle dagplanningen en daarna de mededelingen.
        .sort((a, b) => Number(b.dated) - Number(a.dated)),
    [slides, filter]
  );

  const filters: { id: FilterType; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'all', label: 'Alles', icon: Layers3, count: counts.all },
    { id: 'planning', label: 'Dagplanning', icon: CalendarDays, count: counts.planning },
    { id: 'notices', label: 'Mededelingen', icon: Megaphone, count: counts.notices },
  ];

  return (
    <main className="min-h-screen bg-[#f3f5f8] px-3 py-5 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Hero */}
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#17202b] text-white shadow-xl">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border-[44px] border-white/[0.035]" />
          <div className="pointer-events-none absolute -bottom-36 right-1/4 h-72 w-72 rounded-full bg-[#ffdc00]/[0.07] blur-3xl" />
          <div className="relative flex flex-col gap-7 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#ffdc00]">
                <span className="h-2 w-2 rounded-full bg-[#ffdc00]" />
                OC BUS GBR · GENTBRUGGE
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                OC <span className="text-[#ffdc00]">Planning</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                Dagplanningen en belangrijke mededelingen overzichtelijk samengebracht op één centrale plek.
              </p>
              {user?.name && (
                <p className="mt-5 text-sm text-slate-400">
                  Aangemeld als <span className="font-semibold text-white">{user.name}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => void fetchPlanning()}
              disabled={refreshing}
              className="inline-flex shrink-0 items-center justify-center gap-2.5 rounded-xl bg-[#ffdc00] px-5 py-3 text-sm font-extrabold text-[#17202b] shadow-lg shadow-black/20 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Vernieuwen...' : 'Vernieuwen'}
            </button>
          </div>

          <div className="relative grid grid-cols-2 border-t border-white/10 bg-black/10 sm:grid-cols-4">
            <div className="border-r border-white/10 px-5 py-4 sm:px-7">
              <p className="text-xs font-medium text-slate-400">Totaal beschikbaar</p>
              <p className="mt-1 text-2xl font-black text-white">{counts.all}</p>
            </div>
            <div className="border-r border-white/10 px-5 py-4 sm:px-7">
              <p className="text-xs font-medium text-slate-400">Dagplanningen</p>
              <p className="mt-1 text-2xl font-black text-white">{counts.planning}</p>
            </div>
            <div className="border-r border-white/10 px-5 py-4 sm:px-7">
              <p className="text-xs font-medium text-slate-400">Mededelingen</p>
              <p className="mt-1 text-2xl font-black text-white">{counts.notices}</p>
            </div>
            <div className="col-span-2 px-5 py-4 sm:col-span-1 sm:px-7">
              <p className="text-xs font-medium text-slate-400">Dringende berichten</p>
              <p className={`mt-1 text-2xl font-black ${counts.urgent ? 'text-red-300' : 'text-white'}`}>
                {counts.urgent}
              </p>
            </div>
          </div>
        </section>

        {/* Status and filters */}
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {error ? (
                <WifiOff className="h-4 w-4 text-red-500" />
              ) : (
                <Wifi className="h-4 w-4 text-emerald-600" />
              )}
              <span className="text-sm font-bold text-slate-800">
                {error ? 'Verbinding onderbroken' : 'Live verbinding actief'}
              </span>
              <span className={`h-2 w-2 rounded-full ${error ? 'bg-red-500' : 'bg-emerald-500'}`} />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock3 className="h-3.5 w-3.5" />
              <span>
                {lastUpdated
                  ? `Laatst bijgewerkt om ${lastUpdated.toLocaleTimeString('nl-BE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : 'Nog niet gesynchroniseerd'}
              </span>
              <span className="hidden sm:inline">· Controle elke 60 seconden</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="mr-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              Weergave
            </span>
            {filters.map((item) => (
              <FilterButton
                key={item.id}
                active={filter === item.id}
                label={item.label}
                count={item.count}
                icon={item.icon}
                onClick={() => setFilter(item.id)}
              />
            ))}
          </div>
        </section>

        {error && (
          <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold">De planning kon niet worden opgehaald</p>
                <p className="mt-1 text-red-700">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void fetchPlanning()}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-red-700 px-3 py-2 font-bold text-white transition hover:bg-red-800 sm:self-center"
            >
              <RefreshCw className="h-4 w-4" />
              Opnieuw proberen
            </button>
          </div>
        )}

        {/* Section heading */}
        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Informatieoverzicht</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-[#17202b] sm:text-2xl">
              {filter === 'planning'
                ? 'Dagplanningen'
                : filter === 'notices'
                  ? 'Mededelingen'
                  : 'Alle berichten'}
            </h2>
          </div>
          <p className="text-xs font-medium text-slate-500">
            {filteredSlides.length} {filteredSlides.length === 1 ? 'bericht' : 'berichten'}
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ffdc00]/20">
              <Loader2 className="h-7 w-7 animate-spin text-[#17202b]" />
            </div>
            <p className="mt-4 font-bold text-slate-800">OC Planning wordt geladen</p>
            <p className="mt-1 text-sm text-slate-500">Even geduld, we halen de laatste informatie op.</p>
          </div>
        ) : filteredSlides.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              {filter === 'notices' ? (
                <Megaphone className="h-8 w-8 text-slate-400" />
              ) : (
                <CalendarDays className="h-8 w-8 text-slate-400" />
              )}
            </div>
            <h3 className="mt-5 text-lg font-extrabold text-slate-800">Geen informatie beschikbaar</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Er zijn momenteel geen items beschikbaar voor deze selectie. Nieuwe informatie verschijnt hier automatisch.
            </p>
            <button
              type="button"
              onClick={() => void fetchPlanning()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#17202b] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              Opnieuw laden
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredSlides.map((slide) => (
              <article
                key={slide.id}
                className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                  slide.urgent
                    ? 'border-red-200 ring-1 ring-red-100'
                    : 'border-slate-200/80'
                }`}
              >
                <div className={`h-1.5 ${slide.urgent ? 'bg-red-500' : slide.dated ? 'bg-[#ffdc00]' : 'bg-slate-300'}`} />

                <header className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                        slide.urgent
                          ? 'bg-red-50 text-red-600'
                          : slide.dated
                            ? 'bg-[#ffdc00]/25 text-[#17202b]'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {slide.dated ? (
                        <CalendarDays className="h-6 w-6" />
                      ) : (
                        <Megaphone className="h-6 w-6" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                          'Dagplanning'
                        </span>
                        {slide.urgent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-red-700">
                            <Bell className="h-3 w-3" />
                            Dringend
                          </span>
                        )}
                      </div>
                      <h3 className="truncate text-lg font-extrabold tracking-tight text-[#17202b] sm:text-xl">
                        {slide.title}
                      </h3>
                    </div>
                  </div>

                  {slide.dated && (
                    <button
                      type="button"
                      onClick={() => downloadSlide(slide)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#17202b] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700"
                    >
                      <Download className="h-4 w-4 text-[#ffdc00]" />
                      Download planning
                    </button>
                  )}
                </header>

                <div className="bg-slate-50/70 p-2 sm:p-4">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <iframe
                      title={slide.title}
                      srcDoc={slide.html}
                      sandbox=""
                      loading="lazy"
                      className="block w-full border-0 bg-white"
                      style={{ minHeight: 420 }}
                      onLoad={(event) => {
                        const frame = event.currentTarget;
                        try {
                          const frameDocument = frame.contentDocument;
                          if (frameDocument?.body) {
                            frame.style.height = `${Math.max(
                              220,
                              frameDocument.documentElement.scrollHeight,
                              frameDocument.body.scrollHeight
                            )}px`;
                          }
                        } catch {
                          // De inhoud blijft zichtbaar als de hoogte niet kan worden bepaald.
                        }
                      }}
                    />
                  </div>
                </div>

                <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-6">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    Bijgewerkt: {formatDateTime(slide.updated_at)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    {slide.version ? `Versie ${slide.version}` : 'OC-GBR Planning'}
                  </span>
                </footer>
              </article>
            ))}
          </div>
        )}

        <footer className="flex flex-col items-center justify-center gap-2 pb-5 pt-2 text-center">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ffdc00]" />
            OC-GBR PLANNING
            <span className="h-1.5 w-1.5 rounded-full bg-[#ffdc00]" />
          </div>
          <p className="text-[11px] text-slate-400">Interne personeelsinformatie · Automatische synchronisatie actief</p>
        </footer>
      </div>
    </main>
  );
};

export default OCPlanningView;
