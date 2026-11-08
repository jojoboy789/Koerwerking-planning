import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, type SpecialDay } from '../services/api';
import { SHIFT_DEFINITIONS } from '../types';
import { TelegramInvitationModal } from './TelegramInvitationModal';
import {
  Activity, ArrowRight, Bell, BusFront, CalendarDays, CheckCircle2,
  CircleHelp, ClipboardList, Clock3, ExternalLink, Info, Layers3,
  LockKeyhole, ShieldCheck, Sparkles, Users, CalendarCheck2, LogIn,
} from 'lucide-react';

interface DashboardViewProps { onNavigate: (tab: string) => void; }

const MONTH_NAMES = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
const TELEGRAM_INVITE_URL = 'https://t.me/+B0GMB0QZaM01ZWJk';
const SELFSERVICE_ICON = 'data:image/png;base64,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';

function getBelgianHolidays(year: number): Map<string, string> {
  const holidays = new Map<string, string>();
  const add = (month: number, day: number, name: string) => holidays.set(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`, name);
  add(1,1,'Nieuwjaar'); add(5,1,'Dag van de Arbeid'); add(7,21,'Nationale feestdag'); add(8,15,'O.L.V. Hemelvaart'); add(11,1,'Allerheiligen'); add(11,11,'Wapenstilstand'); add(12,25,'Kerstmis');
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const easter=new Date(year,Math.floor((h+l-7*m+114)/31)-1,((h+l-7*m+114)%31)+1);
  [[1,'Paasmaandag'],[39,'O.H. Hemelvaart'],[50,'Pinkstermaandag']].forEach(([offset,name])=>{const date=new Date(easter);date.setDate(date.getDate()+Number(offset));add(date.getMonth()+1,date.getDate(),String(name));});
  return holidays;
}
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }

const Surface: React.FC<React.PropsWithChildren<{className?: string}>> = ({children,className=''}) => <section className={`rounded-[1.6rem] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)] ${className}`}>{children}</section>;

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user, canViewOverview, canEditPlanning, isAdmin } = useAuth();
  const now = new Date();
  const currentMonth = now.getMonth()+1;
  const currentYear = now.getFullYear();
  const [showInviteModal,setShowInviteModal] = useState(false);
  const [planningStats,setPlanningStats] = useState({v:0,d:0,l:0,x:0,total:0,lastSaved:undefined as string|undefined});
  const [upcomingDays, setUpcomingDays] = useState<{date: Date; code?: string; loading: boolean}[]>([]);
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);

  const [transportDoorKoer, setTransportDoorKoer] = useState<{ text: string; date: string | null } | null>(null);

  // Haal vervangende feestdagen en stakingsdagen op.
  useEffect(() => {
    let active = true;

    api.getSpecialDays()
      .then((result) => {
        if (active) {
          setSpecialDays(result.specialDays || []);
        }
      })
      .catch((error) => {
        console.error('Speciale dagen ophalen mislukt:', error);
      });

    return () => {
      active = false;
    };
  }, []);


  // Lees uitsluitend de tekst die NA het label "Transport door Koer:"
  // in hetzelfde <p>-element staat. De volgende <p> is "Koerwerking"
  // en mag nooit als bron worden gebruikt.
  useEffect(() => {
    let active = true;

    const fetchTransportInfo = async () => {
      try {
        const token = api.getAuthToken();
        const response = await fetch('/api/oc-planning', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('OC-planning niet beschikbaar');

        const data = await response.json();
        const slides = Array.isArray(data?.slides) ? data.slides : [];
        const dailySlides = slides.filter((slide: { dated?: boolean }) => slide.dated);
        let found: { text: string; date: string | null } | null = null;

        for (const slide of dailySlides) {
          const doc = new DOMParser().parseFromString(String(slide.html || ''), 'text/html');
          const paragraphs = Array.from(doc.body.querySelectorAll('p'));
          const transportParagraph = paragraphs.find((paragraph) =>
            Array.from(paragraph.querySelectorAll('span, strong, b, label')).some((node) =>
              (node.textContent || '').replace(/\s+/g, ' ').trim().replace(/：$/, ':') === 'Transport door Koer:'
            )
          );

          // Datum staat in de eerste regel van de geëxporteerde dagplanning (bv. 06/11).
          const datePattern = /\b([0-3]?\d)[/.-]([01]?\d)(?:[/.-]((?:19|20)\d{2}))?\b/;
          const titleDate = String(slide.title || '').match(datePattern);
          const firstLineDate = (paragraphs[0]?.textContent || '').match(datePattern);
          const dateMatch = titleDate || firstLineDate;
          const planningDate = dateMatch
            ? `${dateMatch[1].padStart(2, '0')}/${dateMatch[2].padStart(2, '0')}${dateMatch[3] ? `/${dateMatch[3]}` : ''}`
            : null;

          if (!transportParagraph) continue;

          const label = Array.from(transportParagraph.querySelectorAll('span, strong, b, label')).find((node) =>
            (node.textContent || '').replace(/\s+/g, ' ').trim().replace(/：$/, ':') === 'Transport door Koer:'
          );

          let transportText = '';
          if (label) {
            // Alleen volgende siblings BINNEN hetzelfde <p> verzamelen.
            // Zo kan de inhoud van de volgende Koerwerking-paragraaf nooit meekomen.
            let sibling = label.nextSibling;
            while (sibling) {
              transportText += sibling.textContent || '';
              sibling = sibling.nextSibling;
            }
          }

          transportText = transportText.replace(/\s+/g, ' ').trim();
          if (/^(?:[-–—]+|n\/?a)?$/i.test(transportText)) {
            transportText = 'Nog niks gepland';
          }

          found = { text: transportText, date: planningDate };
          break;
        }

        if (active) setTransportDoorKoer(found || { text: 'Nog niks gepland', date: null });
      } catch {
        // Behoud de laatst bekende inhoud bij een tijdelijke netwerkfout.
      }
    };

    void fetchTransportInfo();
    const interval = window.setInterval(() => void fetchTransportInfo(), 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const dates = [0, 1, 2].map((offset) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + offset);
      return date;
    });
    setUpcomingDays(dates.map((date) => ({ date, loading: true })));
    const monthKeys = [...new Set(dates.map((date) => `${date.getFullYear()}-${date.getMonth() + 1}`))];
    Promise.all(monthKeys.map(async (key) => {
      const [year, month] = key.split('-').map(Number);
      const response = await api.getPlanning(year, month);
      return [key, (response.planning?.days as Record<number, string>) || {}] as const;
    })).then((results) => {
      if (!active) return;
      const plans = new Map(results);
      setUpcomingDays(dates.map((date) => {
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const days = plans.get(key) || {};
        return { date, code: days[date.getDate()], loading: false };
      }));
    }).catch(() => {
      if (active) setUpcomingDays(dates.map((date) => ({ date, loading: false })));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    api.getPlanning(currentYear,currentMonth).then((res) => {
      if (!active) return;
      const days=(res.planning?.days as Record<number,string>)||{};
      let v=0,d=0,l=0,x=0,total=0;
      const holidays=getBelgianHolidays(currentYear);
      const daysInMonth=new Date(currentYear,currentMonth,0).getDate();
      for(let day=1;day<=daysInMonth;day++) {
        const date=new Date(currentYear,currentMonth-1,day), weekday=date.getDay();
        if(weekday===0||weekday===6||holidays.has(dateKey(date))) continue;
        const code=days[day];
        if(code==='V')v++; else if(code==='D')d++; else if(code==='L')l++; else if(code==='X')x++;
        if(code)total++;
      }
      setPlanningStats({v,d,l,x,total,lastSaved:res.planning?.updatedAt});
    }).catch(()=>{});
    try {
      const seen=localStorage.getItem('hasSeenTelegramInvite');
      if(user?.role?.toLowerCase().includes('teamlid')&&!seen)setShowInviteModal(true);
    } catch {}
    return ()=>{active=false;};
  },[currentYear,currentMonth,user]);

  const requiredWorkdays=useMemo(()=>{
    const holidays=getBelgianHolidays(currentYear); let count=0;
    for(let day=1;day<=new Date(currentYear,currentMonth,0).getDate();day++){
      const date=new Date(currentYear,currentMonth-1,day),weekday=date.getDay();
      if(weekday!==0&&weekday!==6&&!holidays.has(dateKey(date)))count++;
    }
    return count;
  },[currentYear,currentMonth]);
  const progress=Math.min(100,requiredWorkdays?planningStats.total/requiredWorkdays*100:100);
  const remaining=Math.max(0,requiredWorkdays-planningStats.total);
  const closeInvite=()=>{try{localStorage.setItem('hasSeenTelegramInvite','true');}catch{}setShowInviteModal(false);};

  const quickActions=[
    {label:'Mijn planning',desc:'Bekijk of wijzig je diensten',icon:CalendarDays,tab:'planning',tone:'yellow'},
    ...(canViewOverview?[{label:'Teamoverzicht',desc:'Bekijk de teambezetting',icon:Users,tab:'overview',tone:'green'}]:[]),
    {label:'OC planning',desc:'Dagplanning van OC BUS GBR',icon:BusFront,tab:'oc_planning',tone:'blue'},
    ...(isAdmin?[{label:'Beheerportaal',desc:'Gebruikers en toegangsrechten',icon:ShieldCheck,tab:'admin',tone:'violet'}]:[]),
  ];
  const toneClasses:Record<string,string>={yellow:'bg-amber-100 text-amber-800',green:'bg-emerald-100 text-emerald-700',blue:'bg-sky-100 text-sky-700',violet:'bg-violet-100 text-violet-700'};

  return <div className="mx-auto max-w-[1600px] space-y-6 px-3 py-4 pb-24 font-sans sm:px-6 sm:py-6 lg:px-8">
    {showInviteModal&&<TelegramInvitationModal onClose={closeInvite} inviteUrl={TELEGRAM_INVITE_URL}/>}

    {/* Header met geïntegreerde komende diensten */}
    <header className="relative isolate overflow-hidden rounded-[2rem] bg-[#101923] px-5 py-6 text-white shadow-xl sm:px-8 sm:py-8">
      <div className="absolute -right-12 -top-24 -z-10 h-72 w-72 rounded-full bg-yellow-400/15 blur-3xl" />
      <div className="absolute bottom-0 right-0 -z-10 h-1.5 w-2/5 bg-gradient-to-l from-[#ffdc00] to-transparent" />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-yellow-300"><Sparkles size={13}/> Koerwerking planning</div>
          <h1 className="text-2xl font-black tracking-tight sm:text-4xl">Welkom terug{user?.name ? `, ${user.name}` : ''} <span aria-hidden="true">👋</span></h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">{remaining>0?`Je hebt nog ${remaining} werkdagen om je maandplanning aan te vullen.`:'Je maandplanning is volledig ingevuld. Goed bezig!'}</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ffdc00] text-[#101923]"><CalendarDays size={22}/></div>
          <div><div className="text-xs font-semibold text-slate-300">Huidige periode</div><div className="text-lg font-extrabold">{MONTH_NAMES[currentMonth-1]} {currentYear}</div><div className="text-xs text-slate-400">{user?.role||'Teamlid'}</div></div>
        </div>
      </div>

      <div className="relative mt-7 border-t border-white/10 pt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-white/10 p-2.5 text-yellow-300"><CalendarCheck2 size={20}/></span>
            <div><h2 className="text-lg font-black text-white">Mijn komende diensten</h2><p className="text-xs text-slate-300">Vandaag, morgen en overmorgen</p></div>
          </div>
          <button type="button" onClick={() => onNavigate('planning')} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-extrabold text-white transition hover:border-amber-300/50 hover:bg-white/15">Volledige planning <ArrowRight size={14}/></button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {upcomingDays.map(({ date, code, loading }, index) => {
            const shift = code
              ? (Object.values(SHIFT_DEFINITIONS).find(
                  (item) => item.code === code
                ) as { label?: string; colorClass?: string } | undefined)
              : undefined;

            const title = index === 0
              ? 'Vandaag'
              : index === 1
                ? 'Morgen'
                : 'Overmorgen';

            const hours =
              code === 'V' ? '05:00 – 13:00'
              : code === 'D' ? '08:00 – 16:00 / 09:00 – 17:00'
              : code === 'L' ? '13:00 – 21:00'
              : '';

            const dayNames = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isPublicHoliday = getBelgianHolidays(date.getFullYear()).has(dateKey(date));

            const specialDay = specialDays.find(
              (item) => item.date === dateKey(date)
            );

            // Een staking krijgt voorrang op weekend- en feestdagstatus.
            const isStrike = specialDay?.type === 'strike';
            const isReplacementHoliday = specialDay?.type === 'replacementHoliday';

            const noKoerDienst =
              !isStrike && (isReplacementHoliday || isPublicHoliday || isWeekend);

            let status = 'Nog niet ingevuld';

            if (loading) {
              status = 'Laden…';
            } else if (isStrike) {
              status = 'Staking';
            } else if (noKoerDienst) {
              status = 'Geen Koerdienst';
            } else if (code) {
              status = shift?.label ||
                (code === 'X' ? 'Niet inplannen'
                  : code === 'R' ? 'Rustdag'
                  : `Dienst ${code}`);
            }

            const showCode = !loading && !isStrike && !noKoerDienst && !!code;
            const showHours = !loading && !isStrike && !noKoerDienst && !!hours;

            return (
              <div
                key={date.toISOString()}
                className={`min-w-0 rounded-2xl border p-4 ${
                  isStrike && !loading
                    ? 'border-red-400/60 bg-red-500/10'
                    : noKoerDienst && !loading
                      ? 'border-slate-400/30 bg-white/[0.035]'
                      : index === 0
                        ? 'border-amber-300/70 bg-amber-300/10'
                        : 'border-white/10 bg-white/[0.055]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-xs font-extrabold uppercase tracking-wider ${
                      isStrike && !loading
                        ? 'text-red-300'
                        : index === 0
                          ? 'text-amber-300'
                          : 'text-slate-300'
                    }`}>
                      {title}
                    </p>

                    <p className="mt-1 text-sm font-bold text-white">
                      {dayNames[date.getDay()]} {date.getDate()} {MONTH_NAMES[date.getMonth()]}
                    </p>
                  </div>

                  {showCode && (
                    <span className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-black ${
                      shift?.colorClass || 'bg-slate-200 text-slate-800'
                    }`}>
                      {code}
                    </span>
                  )}

                  {!loading && isStrike && (
                    <span className="flex h-9 items-center justify-center rounded-xl bg-red-500/20 px-3 text-xs font-black text-red-300">
                      STAKING
                    </span>
                  )}

                  {!loading && noKoerDienst && (
                    <span className="flex h-9 items-center justify-center rounded-xl bg-slate-500/20 px-3 text-xs font-black text-slate-300">
                      GEEN DIENST
                    </span>
                  )}
                </div>

                <p className={`mt-3 text-base font-black sm:text-lg ${
                  isStrike && !loading ? 'text-red-300' : 'text-white'
                }`}>
                  {status}
                </p>

                {showHours && (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 sm:text-sm">
                    <Clock3 size={14} className="shrink-0" />
                    {hours}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </header>

    {/* Snelle links: naast elkaar op grotere schermen, onder elkaar op mobiel */}
    <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4">
    {/* Prominent Microsoft quick sign-in */}
    <a
      href="https://launcher.myapps.microsoft.com/api/signin/c528a6b1-26e8-4ab8-8db9-fcce4ace4358?tenantId=488b6c64-b0da-4b62-8bbd-8bbb63b5eb77"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Snel aanmelden via Microsoft 365, opent in een nieuw tabblad"
      className="group relative flex min-h-[92px] flex-col items-stretch gap-3 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-sky-50 px-4 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
    >
      <span className="absolute inset-y-0 left-0 w-1.5 bg-[#2563eb]" />
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2563eb] text-white shadow-sm transition-transform group-hover:scale-105 sm:h-14 sm:w-14">
        <LogIn size={26}/>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-black text-slate-900 sm:text-lg">Snel aanmelden</span>
      </span>
      <span className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition-colors group-hover:bg-blue-700 sm:w-auto sm:px-5">
        Aanmelden <ExternalLink size={15}/>
      </span>
    </a>

    {/* Directe toegang tot De Lijn Selfservice */}
    <a
      href="https://launcher.myapps.microsoft.com/api/signin/5dc71c29-1365-4e13-9d2e-250d00403cb5?tenantId=488b6c64-b0da-4b62-8bbd-8bbb63b5eb77"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open De Lijn Selfservice in een nieuw tabblad"
      className="group flex min-h-[92px] flex-col items-stretch gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
    >
      <img
        src={SELFSERVICE_ICON}
        alt=""
        aria-hidden="true"
        className="h-12 w-12 shrink-0 rounded-xl object-contain sm:h-14 sm:w-14"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-black text-slate-900">Selfservice</span>
      </span>
      <span className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-extrabold text-white transition-colors group-hover:bg-teal-800 sm:w-auto sm:px-5">
        Openen <ExternalLink size={15}/>
      </span>
    </a>
    </div>

    {/* Dagplanning prominenter bovenaan het dashboard */}
        <button type="button" onClick={()=>onNavigate('oc_planning')} className="group relative w-full overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-[#ffdc00] via-[#ffe766] to-[#fff4b8] p-5 text-left shadow-md transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 sm:p-6">
          <div className="absolute -right-5 -top-5 h-32 w-32 rounded-full border-[18px] border-white/30"/>
          <div className="relative flex items-start justify-between">
            <span className="rounded-xl bg-white/70 p-3 text-slate-900"><BusFront size={24}/></span>
            <ExternalLink size={18} className="text-slate-700 transition-transform group-hover:translate-x-1"/>
          </div>
          <div className="relative mt-5 text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-700">OC BUS GBR</div>
          <h2 className="relative mt-1 text-2xl font-black text-slate-950">Dagplanning</h2>
          <p className="relative mt-2 max-w-xs text-sm leading-relaxed text-slate-800">Open de dagplanning en mededelingen van OC BUS GBR.</p>

          <div className="relative mt-4 rounded-xl border border-white/60 bg-white/65 p-3.5">
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-700">Transport door Koer:</p>
            <p className="mt-1.5 text-sm font-bold leading-relaxed text-slate-950">
              {transportDoorKoer?.text || 'Nog niks gepland'}
            </p>
            {transportDoorKoer?.date && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1 text-xs font-extrabold text-slate-800">
                <CalendarDays size={13} aria-hidden="true"/>
                Datum: {transportDoorKoer.date}
              </p>
            )}
          </div>

          <div className="relative mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-extrabold text-white">Naar OC planning <ArrowRight size={15}/></div>
        </button>

    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
      {/* Main workspace */}
      <div className="space-y-6">
        <Surface className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6"><div><div className="flex items-center gap-2 text-[#a18a00]"><Layers3 size={18}/><span className="text-[10px] font-extrabold uppercase tracking-[.18em]">Jouw werkruimte</span></div><h2 className="mt-1 text-xl font-black text-slate-900">Waar wil je naartoe?</h2></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{quickActions.length} snelkoppelingen</span></div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            {quickActions.map(({label,desc,icon:Icon,tab,tone})=><button key={tab} type="button" onClick={()=>onNavigate(tab)} className="group flex min-h-[116px] items-center gap-4 rounded-2xl border border-slate-200 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffdc00]">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone]} transition-transform group-hover:scale-105`}><Icon size={23}/></span><span className="min-w-0 flex-1"><span className="block font-extrabold text-slate-900">{label}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{desc}</span></span><ArrowRight size={17} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-800"/>
            </button>)}
          </div>
        </Surface>

        <Surface className="p-5 sm:p-6">
          <div className="flex items-start gap-3"><span className="rounded-xl bg-amber-100 p-2.5 text-amber-800"><Clock3 size={20}/></span><div><h2 className="text-lg font-black text-slate-900">Maandplanning in één oogopslag</h2><p className="mt-1 text-sm text-slate-500">Je ingevulde werkdagen tegenover het maandtotaal.</p></div></div>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-3"><div><span className="text-4xl font-black tracking-tight text-slate-900">{planningStats.total}</span><span className="ml-2 text-sm font-semibold text-slate-400">van {requiredWorkdays} werkdagen</span></div><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-900">{remaining===0?'Compleet':`${remaining} nog in te vullen`}</span></div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-[#ffdc00] to-amber-400 transition-all duration-500" style={{width:`${progress}%`}}/></div>
          {canEditPlanning&&<div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-950"><Info size={16} className="mt-0.5 shrink-0"/><p><strong>Planning wijzigen:</strong> je kunt de planning voor een maand invullen of aanpassen tot en met de 7e van de maand ervoor.</p></div>}
          <button type="button" onClick={()=>onNavigate('planning')} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#101923] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffdc00]">Open mijn planning <ArrowRight size={16}/></button>
        </Surface>
      </div>

      {/* Side rail */}
      <aside className="space-y-6">
        <Surface className="overflow-hidden">
          <div className="bg-[#101923] px-5 py-5 text-white"><div className="flex items-center gap-2 text-yellow-300"><Bell size={17}/><span className="text-[10px] font-extrabold uppercase tracking-[.18em]">Meldingen & aandacht</span></div><h2 className="mt-2 text-xl font-black">Hou dit in de gaten</h2><p className="mt-1 text-sm text-slate-300">Praktische info voor je planning.</p></div>
          <div className="space-y-3 p-4">
            <div className="flex gap-3 rounded-xl border border-slate-200 p-3.5"><span className="rounded-lg bg-amber-100 p-2 text-amber-800"><CalendarDays size={18}/></span><div><p className="text-sm font-extrabold text-slate-800">Maandplanning</p><p className="mt-1 text-xs leading-relaxed text-slate-500">{remaining>0?`Er zijn nog ${remaining} werkdagen niet ingevuld.`:'Alle werkdagen zijn ingevuld.'}</p></div></div>
            <div className="flex gap-3 rounded-xl border border-slate-200 p-3.5"><span className="rounded-lg bg-sky-100 p-2 text-sky-700"><CircleHelp size={18}/></span><div><p className="text-sm font-extrabold text-slate-800">Toegangsrechten</p><p className="mt-1 text-xs leading-relaxed text-slate-500">{canViewOverview?'Je hebt toegang tot het teamoverzicht.':'Teamoverzicht is niet beschikbaar voor jouw account.'} {canEditPlanning?'Planning aanpassen is toegestaan.':'Je kunt de planning niet aanpassen.'}</p></div></div>
            {isAdmin&&<button type="button" onClick={()=>onNavigate('admin')} className="flex w-full items-center justify-between rounded-xl border border-violet-200 bg-violet-50 p-3.5 text-left"><span className="flex items-center gap-3"><span className="rounded-lg bg-violet-100 p-2 text-violet-700"><ShieldCheck size={18}/></span><span><span className="block text-sm font-extrabold text-violet-950">Beheerportaal</span><span className="mt-1 block text-xs text-violet-700">Administratieve acties beschikbaar</span></span></span><ArrowRight size={16} className="text-violet-700"/></button>}
          </div>
        </Surface>



        <Surface className="p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><ClipboardList size={19}/></span><div><h2 className="font-black text-slate-900">Dienstcodes</h2><p className="text-xs text-slate-500">Codes die in de planning voorkomen</p></div></div><div className="mt-4 grid grid-cols-2 gap-2">{Object.values(SHIFT_DEFINITIONS).map(shift=><div key={shift.code} className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 p-2.5"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${shift.colorClass}`}>{shift.code}</span><span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-700">{shift.label}</span><span className="mt-0.5 block text-[11px] font-semibold text-slate-500">{shift.code === 'V' ? '05:00 – 13:00' : shift.code === 'D' ? '08:00 – 16:00 / 09:00 – 17:00' : shift.code === 'L' ? '13:00 – 21:00' : 'Geen diensturen'}</span></span></div>)}</div></Surface>
      </aside>
    </div>

    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-[11px] text-slate-400"><span>Koerwerking Planning · {MONTH_NAMES[currentMonth-1]} {currentYear}</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500"/> Persoonlijke planning</span></footer>
  </div>;
};