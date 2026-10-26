import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  CalendarDays,
  Megaphone,
  RefreshCw,
  AlertCircle,
  Clock,
  Loader2,
  Wifi,
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

export const OCPlanningView: React.FC = () => {
  const { user } = useAuth();

  const [slides, setSlides] = useState<OCSlide[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPlanning = useCallback(async (silent = false) => {
    if (!silent) {
      setRefreshing(true);
    }

    try {
     const token = api.getAuthToken();

const response = await fetch('/api/oc-planning', {
  headers: token
    ? { Authorization: `Bearer ${token}` }
    : {},
  cache: 'no-store',
});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'De OC-planning kon niet worden opgehaald.'
        );
      }

      const result = data as OCPlanningResponse;

      setSlides(result.slides || []);
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

  const filteredSlides = slides.filter((slide) => {
    if (filter === 'planning') return slide.dated;
    if (filter === 'notices') return !slide.dated;
    return true;
  });

  const filters: {
    id: FilterType;
    label: string;
    icon: typeof CalendarDays;
  }[] = [
    { id: 'all', label: 'Alles', icon: Wifi },
    { id: 'planning', label: 'Dagplanning', icon: CalendarDays },
    { id: 'notices', label: 'Mededelingen', icon: Megaphone },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl bg-gradient-to-br from-indigo-700 to-indigo-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-200">
                <CalendarDays className="h-5 w-5" />
                OC BUS GBR
              </div>

              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                OC Planning
              </h2>

              <p className="mt-2 max-w-xl text-sm text-indigo-100 sm:text-base">
                Actuele planningen en algemene mededelingen op één plaats.
              </p>

              {user?.name && (
                <p className="mt-3 text-xs text-indigo-200">
                  Ingelogd als {user.name}
                </p>
              )}
            </div>

            <button
              onClick={() => void fetchPlanning()}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-800 shadow transition hover:bg-indigo-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
              Vernieuwen
            </button>
          </div>
        </header>

        <section className="flex flex-wrap gap-2">
          {filters.map((item) => {
            const Icon = item.icon;
            const active = filter === item.id;

            const count =
              item.id === 'all'
                ? slides.length
                : slides.filter((slide) =>
                    item.id === 'planning' ? slide.dated : !slide.dated
                  ).length;

            return (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                <span
                  className={`rounded-md px-2 py-0.5 text-xs ${
                    active
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                error ? 'bg-red-500' : 'bg-emerald-500'
              }`}
            />
            {error ? 'Verbinding onderbroken' : 'OC Planning'}
            <span>·</span>
            Automatische controle elke 60 seconden
          </div>

          {lastUpdated && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Laatst opgehaald:{' '}
              {lastUpdated.toLocaleTimeString('nl-BE', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Planning niet beschikbaar</p>
              <p className="mt-1">{error}</p>
              <button
                onClick={() => void fetchPlanning()}
                className="mt-3 font-bold underline"
              >
                Opnieuw proberen
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm text-slate-500">
              OC Planning wordt opgehaald...
            </p>
          </div>
        ) : filteredSlides.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-4 font-bold text-slate-800">
              Geen informatie beschikbaar
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Er zijn momenteel geen slides voor deze selectie.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredSlides.map((slide) => (
              <article
                key={slide.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
                  slide.urgent
                    ? 'border-red-300 ring-1 ring-red-100'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`rounded-xl p-2.5 ${
                        slide.dated
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {slide.dated ? (
                        <CalendarDays className="h-5 w-5" />
                      ) : (
                        <Megaphone className="h-5 w-5" />
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900">
                        {slide.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {slide.dated ? 'Dagplanning' : 'Mededeling'}
                      </p>
                    </div>
                  </div>

                  {slide.urgent && (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                      Dringend
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <iframe
                    title={slide.title}
                    srcDoc={slide.html}
                    sandbox=""
                    className="w-full border-0 bg-white"
                    style={{ minHeight: 450 }}
                    onLoad={(event) => {
                      const frame = event.currentTarget;

                      try {
                        const document = frame.contentDocument;
                        if (document?.body) {
                          frame.style.height = `${Math.max(
                            220,
                            document.documentElement.scrollHeight,
                            document.body.scrollHeight
                          )}px`;
                        }
                      } catch {
                        // De inhoud blijft zichtbaar als de hoogte niet kan worden bepaald.
                      }
                    }}
                  />
                </div>

                <footer className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
                  <span>Bijgewerkt: </span>
                  {new Date(slide.updated_at).toLocaleString('nl-BE', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </footer>
              </article>
            ))}
          </div>
        )}

        <p className="pb-4 text-center text-xs text-slate-400">
          OC-GBR Planning · Interne personeelsinformatie
        </p>
      </div>
    </div>
  );
};

export default OCPlanningView;