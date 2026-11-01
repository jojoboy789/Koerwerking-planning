import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SHIFT_DEFINITIONS } from '../types';
import { TelegramInvitationModal } from './TelegramInvitationModal';
import {
  Activity, ArrowRight, Bell, BusFront, CalendarDays, CheckCircle2,
  CircleHelp, ClipboardList, Clock3, ExternalLink, Info, Layers3,
  LockKeyhole, ShieldCheck, Sparkles, Users, CalendarCheck2,
} from 'lucide-react';

interface DashboardViewProps { onNavigate: (tab: string) => void; }

const MONTH_NAMES = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
const TELEGRAM_INVITE_URL = 'https://t.me/+B0GMB0QZaM01ZWJk';

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

    {/* Header / dashboard identity */}
    <header className="relative isolate overflow-hidden rounded-[2rem] bg-[#101923] px-5 py-6 text-white shadow-xl sm:px-8 sm:py-8">
      <div className="absolute -right-12 -top-24 -z-10 h-72 w-72 rounded-full bg-yellow-400/15 blur-3xl" />
      <div className="absolute bottom-0 right-0 -z-10 h-1.5 w-2/5 bg-gradient-to-l from-[#ffdc00] to-transparent" />
      <div className="flex flex-wrap items-center justify-between gap-5">
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
    </header>

    {/* Mini calendar: today, tomorrow and the day after */}
    <Surface className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-amber-100 p-2.5 text-amber-800"><CalendarCheck2 size={20}/></span><div><h2 className="text-lg font-black text-slate-900">Mijn komende diensten</h2><p className="text-xs text-slate-500">Vandaag, morgen en overmorgen</p></div></div>
        <button type="button" onClick={() => onNavigate('planning')} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:bg-amber-100">Volledige planning <ArrowRight size={14}/></button>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
        {upcomingDays.map(({date, code, loading}, index) => {
          const shift = code ? (Object.values(SHIFT_DEFINITIONS).find((item) => item.code === code) as {label?: string; colorClass?: string} | undefined) : undefined;
          const title = index === 0 ? 'Vandaag' : index === 1 ? 'Morgen' : 'Overmorgen';
          const hours = code === 'V' ? '05:00 – 13:00' : code === 'D' ? '08:00 – 16:00 / 09:00 – 17:00' : code === 'L' ? '13:00 – 21:00' : '';
          const dayNames = ['zo','ma','di','wo','do','vr','za'];
          const status = loading ? 'Laden…' : code ? (shift?.label || (code === 'X' ? 'Niet inplannen' : code === 'R' ? 'Rustdag' : `Dienst ${code}`)) : 'Nog niet ingevuld';
          return <div key={date.toISOString()} className={`rounded-2xl border p-4 ${index === 0 ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-200' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-start justify-between gap-2"><div><p className={`text-xs font-extrabold uppercase tracking-wider ${index === 0 ? 'text-amber-800' : 'text-slate-500'}`}>{title}</p><p className="mt-1 text-sm font-bold text-slate-800">{dayNames[date.getDay()]} {date.getDate()} {MONTH_NAMES[date.getMonth()]}</p></div>
              {code && !loading && <span className={`flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-sm font-black ${shift?.colorClass || 'bg-slate-200 text-slate-800'}`}>{code}</span>}
            </div>
            <p className="mt-4 text-lg font-black text-slate-900">{status}</p>{!loading && hours && <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600"><Clock3 size={14} className="shrink-0"/>{hours}</p>}
          </div>;
        })}
      </div>
    </Surface>

    {/* Snapshot metrics */}
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Maandstatistieken">
      <Surface className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ingevulde dagen</p><p className="mt-2 text-3xl font-black text-slate-900">{planningStats.total}<span className="ml-1 text-sm font-semibold text-slate-400">/ {requiredWorkdays}</span></p></div><span className="rounded-xl bg-amber-100 p-2.5 text-amber-800"><CalendarCheck2 size={20}/></span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#ffdc00] transition-all" style={{width:`${progress}%`}}/></div><p className="mt-2 text-xs font-semibold text-slate-500">{Math.round(progress)}% van de werkdagen</p></Surface>
      <Surface className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Diensten</p><p className="mt-2 text-3xl font-black text-slate-900">{planningStats.v+planningStats.d+planningStats.l}</p></div><span className="rounded-xl bg-sky-100 p-2.5 text-sky-700"><Activity size={20}/></span></div><p className="mt-4 text-xs text-slate-500">Vroeg, dag- en laatdiensten</p><div className="mt-2 flex gap-1.5"><span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">V {planningStats.v}</span><span className="rounded-md bg-sky-100 px-2 py-1 text-xs font-bold text-sky-900">D {planningStats.d}</span><span className="rounded-md bg-violet-100 px-2 py-1 text-xs font-bold text-violet-900">L {planningStats.l}</span></div></Surface>
      <Surface className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Code X</p><p className="mt-2 text-3xl font-black text-slate-900">{planningStats.x}</p></div><span className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700"><CheckCircle2 size={20}/></span></div><p className="mt-4 text-xs text-slate-500">Dagen met de code X in je planning</p></Surface>
      <Surface className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Accountstatus</p><p className="mt-2 text-xl font-black text-slate-900">Veilig actief</p></div><span className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><LockKeyhole size={20}/></span></div><p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14}/> Ingelogd met je persoonlijke account</p></Surface>
    </section>

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

        <button type="button" onClick={()=>onNavigate('oc_planning')} className="group relative w-full overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-[#ffdc00] via-[#ffe766] to-[#fff4b8] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900">
          <div className="absolute -right-5 -top-5 h-32 w-32 rounded-full border-[18px] border-white/30"/><div className="relative flex items-start justify-between"><span className="rounded-xl bg-white/70 p-3 text-slate-900"><BusFront size={24}/></span><ExternalLink size={18} className="text-slate-700 transition-transform group-hover:translate-x-1"/></div><div className="relative mt-5 text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-700">OC BUS GBR</div><h2 className="relative mt-1 text-2xl font-black text-slate-950">Dagplanning</h2><p className="relative mt-2 max-w-xs text-sm leading-relaxed text-slate-800">Open de dagplanning en mededelingen van OC BUS GBR.</p><div className="relative mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-extrabold text-white">Naar OC planning <ArrowRight size={15}/></div>
        </button>

        <Surface className="p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><ClipboardList size={19}/></span><div><h2 className="font-black text-slate-900">Dienstcodes</h2><p className="text-xs text-slate-500">Codes die in de planning voorkomen</p></div></div><div className="mt-4 grid grid-cols-2 gap-2">{Object.values(SHIFT_DEFINITIONS).map(shift=><div key={shift.code} className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 p-2.5"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${shift.colorClass}`}>{shift.code}</span><span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-700">{shift.label}</span><span className="mt-0.5 block text-[11px] font-semibold text-slate-500">{shift.code === 'V' ? '05:00 – 13:00' : shift.code === 'D' ? '08:00 – 16:00 / 09:00 – 17:00' : shift.code === 'L' ? '13:00 – 21:00' : 'Geen diensturen'}</span></span></div>)}</div></Surface>
      </aside>
    </div>

    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-[11px] text-slate-400"><span>Koerwerking Planning · {MONTH_NAMES[currentMonth-1]} {currentYear}</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500"/> Persoonlijke planning</span></footer>
  </div>;
};