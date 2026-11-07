import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, AdminStats } from '../types';
import { api } from '../services/api';
import type { MaintenanceStatus, SpecialDay } from '../services/api';
import { AdminPlanningModal } from './AdminPlanningModal';
import {
  Users, UserPlus, Key, Edit3, Trash2, Calendar, Check, X, Shield,
  ShieldCheck, AlertCircle, CheckCircle2, Loader2, Sparkles, RefreshCw,
  Copy, CheckCheck, Save, Cloud, Database, Send, BusFront, Power,
  Search, Terminal, Activity, Server, Cpu, Filter, Radio
} from 'lucide-react';

export const AdminPortalView: React.FC = () => {
  const { user: currentAdmin } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUsersMatrixExpanded, setIsUsersMatrixExpanded] = useState<boolean>(false);
  const [showDeploymentPriorities, setShowDeploymentPriorities] = useState<boolean>(false);
  const [deploymentSearch, setDeploymentSearch] = useState('');
  const [savingPriorityUserId, setSavingPriorityUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState<boolean>(false);
  const [firebaseStatus, setFirebaseStatus] = useState<{
    connected: boolean;
    projectId: string;
    authDomain: string;
    lastSyncAt: string;
  } | null>(null);

  // Zoek- en Filterstate
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [planningModalUser, setPlanningModalUser] = useState<User | null>(null);
  const [changeCodeUser, setChangeCodeUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  // Newly created user code showcase
  const [newlyCreatedCodeInfo, setNewlyCreatedCodeInfo] = useState<{ name: string; code: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Create User Form State
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newAccessCode, setNewAccessCode] = useState('');
  const [newCanViewOverview, setNewCanViewOverview] = useState(true);
  const [newCanEditPlanning, setNewCanEditPlanning] = useState(true);
  const [newCanPlannerMode, setNewCanPlannerMode] = useState(false);
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newIsActive, setNewIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOcPlanning, setIsSendingOcPlanning] = useState(false);

  // Onderhoudsmodus
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(null);
  const [isUpdatingMaintenance, setIsUpdatingMaintenance] = useState<boolean>(false);

  // Speciale kalenderdagen
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);
  const [specialDayDate, setSpecialDayDate] = useState('');
  const [specialDayType, setSpecialDayType] = useState<SpecialDay['type']>('replacementHoliday');
  const [isSavingSpecialDay, setIsSavingSpecialDay] = useState(false);

  // Change Code Form State
  const [generatedNewCode, setGeneratedNewCode] = useState('');

  const handleAddSpecialDay = async () => {
    if (!specialDayDate || isSavingSpecialDay) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSavingSpecialDay(true);
    try {
      const result = await api.addSpecialDay(specialDayDate, specialDayType);
      setSpecialDays(result.specialDays || []);
      setSpecialDayDate('');
      setSuccessMessage(
        specialDayType === 'replacementHoliday'
          ? 'Vervangende feestdag toegevoegd.'
          : 'Stakingsdag toegevoegd.'
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Kon de speciale dag niet toevoegen.');
    } finally {
      setIsSavingSpecialDay(false);
    }
  };

  const handleDeleteSpecialDay = async (date: string) => {
    if (!window.confirm(`Wil je de speciale dag van ${date} verwijderen?`)) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await api.deleteSpecialDay(date);
      setSpecialDays(result.specialDays || []);
      setSuccessMessage('Speciale dag verwijderd.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Kon de speciale dag niet verwijderen.');
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [usersRes, statsRes, fbStatus, maintenanceRes, specialDaysRes] =
        await Promise.allSettled([
          api.getAdminUsers(),
          api.getAdminStats(),
          api.getFirebaseStatus(),
          api.getMaintenanceStatus(),
          api.getSpecialDays(),
        ]);

      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.users || []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
      if (fbStatus.status === 'fulfilled') {
        setFirebaseStatus(fbStatus.value);
      }
      if (maintenanceRes.status === 'fulfilled') {
        setMaintenanceStatus(maintenanceRes.value);
      }
      if (specialDaysRes.status === 'fulfilled') {
        setSpecialDays(specialDaysRes.value.specialDays || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kon gebruikersgegevens niet laden.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSyncFirebase = async () => {
    setIsSyncingFirebase(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.syncFirebase();
      setSuccessMessage(res.message || 'Database succesvol gesynchroniseerd met Firebase!');
      const fbStatus = await api.getFirebaseStatus();
      setFirebaseStatus(fbStatus);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fout bij synchroniseren naar Firebase.';
      setErrorMessage(msg);
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const handleToggleMaintenance = async () => {
    if (!maintenanceStatus || isUpdatingMaintenance) return;
    const nextStatus = !maintenanceStatus.enabled;
    const confirmed = window.confirm(
      nextStatus
        ? 'Wil je de onderhoudsmodus inschakelen? Alle bezoekers krijgen dan een UPDATE IN PROGRESS-melding op de loginpagina.'
        : 'Wil je de onderhoudsmodus uitschakelen? De melding verdwijnt dan bij de bezoekers.'
    );

    if (!confirmed) return;

    setIsUpdatingMaintenance(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await api.updateMaintenanceMode(nextStatus);
      setMaintenanceStatus(result.maintenance);
      setSuccessMessage(result.message);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'De onderhoudsmodus kon niet worden gewijzigd.';
      setErrorMessage(msg);
    } finally {
      setIsUpdatingMaintenance(false);
    }
  };

  const handleSendOcPlanningToTelegram = async () => {
    setIsSendingOcPlanning(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await api.sendOcPlanningToTelegram();
      setSuccessMessage(result.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'De OC BUS GBR-planning kon niet naar Telegram worden verstuurd.';
      setErrorMessage(msg);
    } finally {
      setIsSendingOcPlanning(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateModal = async () => {
    setNewName('');
    setNewRole('Teamlid');
    setNewCanViewOverview(true);
    setNewCanEditPlanning(true);
    setNewIsAdmin(false);
    setNewIsActive(true);
    try {
      const res = await api.generateAccessCode('GBR');
      setNewAccessCode(res.code);
    } catch {
      setNewAccessCode('GBR-4829-XK');
    }
    setShowCreateModal(true);
  };

  const handleGenerateCodeForCreate = async () => {
    try {
      const res = await api.generateAccessCode('GBR');
      setNewAccessCode(res.code);
    } catch {
      // fallback
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMessage('Vul een naam in.');
      return;
    }
    if (!newAccessCode.trim()) {
      setErrorMessage('Vul een toegangscode in.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.createUser({
        name: newName.trim(),
        role: newRole.trim() || 'Teamlid',
        accessCode: newAccessCode.trim(),
        canViewOverview: newCanViewOverview,
        canEditPlanning: newCanEditPlanning,
        canPlannerMode: newCanPlannerMode,
        isAdmin: newIsAdmin,
        isActive: newIsActive,
      });

      setShowCreateModal(false);
      setNewlyCreatedCodeInfo({
        name: res.user.name,
        code: res.generatedCode,
      });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Aanmaken mislukt.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDeploymentPriority = async (
    targetUser: User,
    priority: NonNullable<User['deploymentPriority']>
  ) => {
    if (savingPriorityUserId) return;
    setSavingPriorityUserId(targetUser.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await api.updateUser(targetUser.id, { deploymentPriority: priority });
      setUsers((previous) => previous.map((item) =>
        item.id === targetUser.id ? { ...item, deploymentPriority: priority } : item
      ));
      setSuccessMessage(`AI-inzetprioriteit voor ${targetUser.name} opgeslagen.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'AI-inzetprioriteit kon niet worden opgeslagen.');
    } finally {
      setSavingPriorityUserId(null);
    }
  };

  const deploymentPriorityUsers = useMemo(() => {
    const query = deploymentSearch.trim().toLowerCase();
    return users
      .filter((item) => item.isActive)
      // Alleen gewone teamleden tonen: admins en gebruikers met Planner Mode uitsluiten.
      .filter((item) => !item.isAdmin && !item.canPlannerMode)
      .filter((item) => !/planner|admin/i.test(item.role || ''))
      .filter((item) => !query || item.name.toLowerCase().includes(query) || (item.role || '').toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  }, [users, deploymentSearch]);

  const handleToggleActive = async (targetUser: User) => {
    if (targetUser.id === currentAdmin?.id) {
      setErrorMessage('Je kunt je eigen beheerderaccount niet deactiveren.');
      return;
    }

    const nextStatus = !targetUser.isActive;
    try {
      await api.updateUser(targetUser.id, { isActive: nextStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: nextStatus } : u))
      );
      setSuccessMessage(`Status voor ${targetUser.name} aangepast naar ${nextStatus ? 'Actief' : 'Inactief'}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      api.getAdminStats().then(setStats);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bijwerken mislukt.';
      setErrorMessage(msg);
    }
  };

  const handleTogglePermission = async (targetUser: User, field: 'canViewOverview' | 'canEditPlanning' | 'canPlannerMode' | 'isAdmin') => {
    const nextVal = !targetUser[field];
    try {
      await api.updateUser(targetUser.id, { [field]: nextVal });
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, [field]: nextVal } : u))
      );
      setSuccessMessage(`Rechten voor ${targetUser.name} bijgewerkt.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      api.getAdminStats().then(setStats);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Rechten wijzigen mislukt.';
      setErrorMessage(msg);
    }
  };

  const handleOpenChangeCodeModal = async (targetUser: User) => {
    setChangeCodeUser(targetUser);
    try {
      const res = await api.generateAccessCode(targetUser.name.substring(0, 3));
      setGeneratedNewCode(res.code);
    } catch {
      setGeneratedNewCode('NEW-9000-XX');
    }
  };

  const handleSubmitChangeCode = async () => {
    if (!changeCodeUser || !generatedNewCode.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await api.changeUserCode(changeCodeUser.id, generatedNewCode.trim());
      setNewlyCreatedCodeInfo({
        name: changeCodeUser.name,
        code: res.newCode,
      });
      setChangeCodeUser(null);
      setSuccessMessage(`Nieuwe toegangscode ingesteld voor ${changeCodeUser.name}. Oude code is direct ongeldig.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Wijzigen code mislukt.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser) return;
    setIsSubmitting(true);
    try {
      await api.deleteUser(deleteConfirmUser.id);
      setDeleteConfirmUser(null);
      setSuccessMessage(`Gebruiker ${deleteConfirmUser.name} is verwijderd.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verwijderen mislukt.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      await api.updateUser(editingUser.id, {
        name: editingUser.name,
        role: editingUser.role,
        canViewOverview: editingUser.canViewOverview,
        canEditPlanning: editingUser.canEditPlanning,
        canPlannerMode: editingUser.canPlannerMode,
        isAdmin: editingUser.isAdmin,
        isActive: editingUser.isActive,
        deploymentPriority: editingUser.deploymentPriority || 'normal',
      });
      setEditingUser(null);
      setSuccessMessage('Gebruiker succesvol bijgewerkt.');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Opslaan mislukt.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Gefilterde gebruikers voor ICT Table 2.0
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.role && u.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.rawCode && u.rawCode.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (roleFilter === 'ADMIN') return u.isAdmin;
      if (roleFilter === 'ACTIVE') return u.isActive;
      if (roleFilter === 'INACTIVE') return !u.isActive;
      return true;
    });
  }, [users, searchQuery, roleFilter]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-mono selection:bg-cyan-500 selection:text-white p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto w-full pb-24">
      {/* Top ICT Telemetry Bar */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span className="text-cyan-700 font-bold uppercase tracking-wider text-[11px]">ADMIN CONTROL ROOM v2.0</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-500 text-[11px] border-l border-slate-200 pl-4">
            <Server className="w-3.5 h-3.5 text-indigo-700" />
            <span>NODE: GBR-MAIN-NODE-01</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-slate-500 text-[11px] border-l border-slate-200 pl-4">
            <Cpu className="w-3.5 h-3.5 text-emerald-700" />
            <span>DATABASE: FIRESTORE ACTIVE</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-600 hover:text-cyan-700 hover:border-cyan-500/50 hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-2 text-xs"
            title="Systeem verversen"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-700' : ''}`} />
            <span className="hidden sm:inline">RE-SYNC DATA</span>
          </button>

          <button
            id="btn-create-user"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ NIEUWE GEBRUIKER</span>
          </button>
        </div>
      </div>

      {/* Hero / Header Section */}
      <div className="bg-gradient-to-r from-white via-white to-cyan-50 border border-slate-200 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-50 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-xl text-cyan-700">
                <Terminal className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Systeem- & Gebruikersbeheer
              </h1>
              <span className="px-3 py-1 bg-cyan-50 border border-cyan-200 rounded-full text-[10px] font-bold text-cyan-700 uppercase tracking-widest">
                SYS_ADMIN 2.0
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-2 font-sans max-w-2xl leading-relaxed">
              Geavanceerde ICT-beheeromgeving voor medewerkers, toegangsrechten, veiligheidscodes en Telegram-dispatchers.
            </p>
          </div>

          {/* Quick Metrics Bar inside Header */}
          {stats && (
            <div className="grid grid-cols-3 gap-3 bg-slate-50/60 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shrink-0">
              <div className="px-3 py-1 text-center">
                <div className="text-[10px] text-slate-500 font-sans">TOTAL USERS</div>
                <div className="text-xl font-bold text-cyan-700">{stats.totalUsers}</div>
              </div>
              <div className="px-3 py-1 text-center border-l border-slate-200">
                <div className="text-[10px] text-emerald-700 font-sans">ONLINE/ACTIEF</div>
                <div className="text-xl font-bold text-emerald-700">{stats.activeUsers}</div>
              </div>
              <div className="px-3 py-1 text-center border-l border-slate-200">
                <div className="text-[10px] text-amber-700 font-sans">ADMINS</div>
                <div className="text-xl font-bold text-amber-700">{stats.adminCount}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-700 text-xs font-sans animate-in fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-700 text-xs font-sans animate-in fade-in shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Bento Grid layout for System Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Maintenance Status Control */}
        <div className={`p-5 rounded-3xl border shadow-xl transition-all font-sans relative overflow-hidden ${
          maintenanceStatus?.enabled
            ? 'bg-gradient-to-br from-amber-950/40 via-white to-white border-amber-200'
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${
                maintenanceStatus?.enabled ? 'bg-amber-400 text-slate-900' : 'bg-emerald-50 text-emerald-700 border border-emerald-500/30'
              }`}>
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">Onderhoudsmodus</h3>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  maintenanceStatus?.enabled
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-500/40'
                }`}>
                  {maintenanceStatus?.enabled ? '● UPDATE IN PROGRESS' : '● OPERATIONAL'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleMaintenance}
              disabled={!maintenanceStatus || isUpdatingMaintenance}
              className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none cursor-pointer ${
                maintenanceStatus?.enabled ? 'bg-amber-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ${
                  maintenanceStatus?.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
              {isUpdatingMaintenance && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-900" />
                </span>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            {maintenanceStatus?.enabled
              ? 'Bezoekers krijgen een onderhoudsscherm op de loginpagina.'
              : 'Schakel in bij het uitvoeren van systeemupdates.'}
          </p>
        </div>

        {/* Card 2: Telegram Dispatcher */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xl font-sans flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-2xl shrink-0">
              <BusFront className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">OC BUS GBR Dispatch</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Verstuur actuele planningen direct naar het Telegram kanaal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendOcPlanningToTelegram}
            disabled={isSendingOcPlanning}
            className="mt-4 w-full py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSendingOcPlanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>VERSTUUR NAAR TELEGRAM</span>
          </button>
        </div>

        {/* Card 3: Cloud Firestore Sync */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xl font-sans flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/20 text-cyan-700 border border-cyan-200 rounded-2xl shrink-0">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">Cloud Firestore</h3>
                <span className="text-[10px] text-cyan-700 font-mono block mt-0.5">planning-koer-gbr</span>
              </div>
            </div>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <button
            onClick={handleSyncFirebase}
            disabled={isSyncingFirebase}
            className="mt-4 w-full py-2.5 bg-cyan-50 hover:bg-cyan-500/20 border border-cyan-200 text-cyan-300 font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSyncingFirebase ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            <span>SYNC DATABASE</span>
          </button>
        </div>

        {/* Snelle toegang AI-inzetprioriteiten */}
        <button
          type="button"
          onClick={() => setShowDeploymentPriorities((visible) => !visible)}
          aria-expanded={showDeploymentPriorities}
          className={`p-5 rounded-3xl border shadow-xl font-sans text-left transition-all ${showDeploymentPriorities ? 'bg-cyan-50 border-cyan-300 ring-2 ring-cyan-100' : 'bg-white border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/40'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-violet-50 border border-violet-200 text-violet-700"><Sparkles className="w-5 h-5" /></div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">AI-inzetprioriteiten</h3>
                <p className="text-xs text-slate-500 mt-1">Beheer wie de AI bij gelijke geschiktheid voorrang geeft.</p>
              </div>
            </div>
            <span className="text-xs font-bold text-cyan-700">{showDeploymentPriorities ? 'SLUITEN −' : 'OPENEN +'}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold">
            <span className="rounded-lg bg-blue-50 text-blue-700 px-2 py-1">Hoge prioriteit</span>
            <span className="rounded-lg bg-emerald-50 text-emerald-700 px-2 py-1">Normaal</span>
            <span className="rounded-lg bg-orange-50 text-orange-700 px-2 py-1">Lage prioriteit</span>
            <span className="rounded-lg bg-slate-100 text-slate-600 px-2 py-1">Geen extra voorkeur</span>
          </div>
        </button>
      </div>

      {showDeploymentPriorities && (
        <section className="rounded-3xl border border-cyan-200 bg-white p-5 md:p-6 shadow-xl space-y-4 font-sans">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-violet-600" /><h2 className="text-base font-extrabold text-slate-900">AI-inzetprioriteiten beheren</h2></div>
              <p className="mt-1 text-xs text-slate-500 max-w-2xl">Alleen actieve teamleden worden getoond. Planners en admins zijn uitgesloten. Stel in hoe de AI een teamlid meeweegt wanneer meerdere medewerkers even geschikt zijn. Dit is een voorkeur, geen garantie op extra diensten.</p>
            </div>
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input type="search" value={deploymentSearch} onChange={(event) => setDeploymentSearch(event.target.value)} placeholder="Zoek medewerker..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-cyan-500" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {deploymentPriorityUsers.map((member) => {
              const priority = member.deploymentPriority || 'normal';
              const priorityStyle = priority === 'high' ? 'border-blue-200 bg-blue-50/60' : priority === 'low' ? 'border-orange-200 bg-orange-50/50' : priority === 'none' ? 'border-slate-200 bg-slate-50' : 'border-emerald-200 bg-emerald-50/50';
              return (
                <div key={member.id} className={`rounded-2xl border p-4 space-y-3 ${priorityStyle}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{member.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{member.role || 'Teamlid'}</p></div>
                    
                  </div>
                  <div className="relative">
                    <select
                      aria-label={`AI-inzetprioriteit voor ${member.name}`}
                      value={priority}
                      disabled={savingPriorityUserId !== null}
                      onChange={(event) => handleUpdateDeploymentPriority(member, event.target.value as NonNullable<User['deploymentPriority']>)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-cyan-500 disabled:opacity-60"
                    >
                      <option value="high">🔵 Hoge prioriteit · vaker inzetten</option>
                      <option value="normal">🟢 Normaal</option>
                      <option value="low">🟠 Lage prioriteit · minder snel inzetten</option>
                      <option value="none">⚪ Geen extra voorkeur</option>
                    </select>
                    {savingPriorityUserId === member.id && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-cyan-700" />}
                  </div>
                </div>
              );
            })}
            {deploymentPriorityUsers.length === 0 && <p className="col-span-full rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-500">Geen actieve teamleden gevonden.</p>}
          </div>
          <p className="text-[10px] text-slate-400">Wijzigingen worden onmiddellijk opgeslagen. Bestaande medewerkers zonder ingestelde voorkeur worden als Normaal weergegeven.</p>
        </section>
      )}

      {/* Speciale Dagen Module */}
      <section className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-xl space-y-4 font-sans">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">Speciale Kalenderdagen</h3>
              <p className="text-xs text-slate-500">Stakingsdagen en vervangende feestdagen markeren in het systeem.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Datum</label>
            <input
              type="date"
              value={specialDayDate}
              onChange={(e) => setSpecialDayDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Type Dag</label>
            <select
              value={specialDayType}
              onChange={(e) => setSpecialDayType(e.target.value as SpecialDay['type'])}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="replacementHoliday">Vervangende Feestdag</option>
              <option value="strike">Stakingsdag</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAddSpecialDay}
              disabled={!specialDayDate || isSavingSpecialDay}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 border border-amber-600 text-slate-950 font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSavingSpecialDay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>TOEVOEGEN</span>
            </button>
          </div>
        </div>

        {specialDays.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
            {[...specialDays].sort((a, b) => a.date.localeCompare(b.date)).map((day) => (
              <div key={day.date} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    day.type === 'replacementHoliday' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-rose-500/20 text-rose-700 border border-rose-500/30'
                  }`}>
                    {day.type === 'replacementHoliday' ? 'FEESTDAG' : 'STAKING'}
                  </span>
                  <div className="text-slate-700 font-mono mt-1 text-xs">
                    {day.date}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSpecialDay(day.date)}
                  className="p-1.5 rounded-lg bg-white text-slate-500 hover:text-rose-400 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Main Users Management 2.0 Table Section */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl space-y-4">
        {/* Table Header Controls / Filters */}
        <div className="p-4 md:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-cyan-700" />
            <button
              type="button"
              onClick={() => setIsUsersMatrixExpanded((expanded) => !expanded)}
              aria-expanded={isUsersMatrixExpanded}
              aria-controls="users-matrix-content"
              className="flex items-center gap-3 text-left group"
            >
              <h2 className="text-lg font-bold text-slate-900 font-mono uppercase tracking-wider">
                Gebruikers Matrix ({filteredUsers.length})
              </h2>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 group-hover:bg-cyan-100 transition-colors" aria-hidden="true">
                <span className="text-base leading-none">{isUsersMatrixExpanded ? '−' : '+'}</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{isUsersMatrixExpanded ? 'INKLAPPEN' : 'UITKLAPPEN'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Zoek op naam of code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 border border-slate-200 rounded-xl text-xs w-full sm:w-auto justify-center">
              <button
                onClick={() => setRoleFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-[11px] font-mono transition-colors ${roleFilter === 'ALL' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-500 hover:text-slate-900'}`}
              >
                ALLES
              </button>
              <button
                onClick={() => setRoleFilter('ADMIN')}
                className={`px-3 py-1 rounded-lg text-[11px] font-mono transition-colors ${roleFilter === 'ADMIN' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-500 hover:text-slate-900'}`}
              >
                ADMINS
              </button>
              <button
                onClick={() => setRoleFilter('ACTIVE')}
                className={`px-3 py-1 rounded-lg text-[11px] font-mono transition-colors ${roleFilter === 'ACTIVE' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-500 hover:text-slate-900'}`}
              >
                ACTIEF
              </button>
            </div>
          </div>
        </div>

        {/* ICT Table: standaard ingeklapt, open via de matrixkop */}
        {isUsersMatrixExpanded && <div id="users-matrix-content">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-cyan-700 animate-spin" />
            <p className="text-xs text-slate-500 font-mono">DATABASE METRICS LADEN...</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse min-w-[800px] font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="p-4">GEBRUIKER & IDENTITEIT</th>
                  <th className="p-4">ROL / FUNCTIE</th>
                  <th className="p-4 text-center">STATUS</th>
                  <th className="p-4 text-center">RECHTEN MATRIX</th>
                  <th className="p-4 text-right">ACTIES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentAdmin?.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-100/40 transition-colors group">
                      {/* Name & Avatar */}
                      <td className="p-4 font-sans">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs border ${
                            u.isAdmin
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-700'
                              : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                          }`}>
                            {u.avatar || u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-200">
                                  JIJ
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {u.rawCode && (
                                <span className="text-[10px] font-mono bg-slate-50 border border-slate-200 text-cyan-700 px-1.5 py-0.5 rounded">
                                  CODE: {u.rawCode}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 font-mono">
                                ID: {u.id}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-4 font-mono">
                        <span className="text-xs text-slate-600 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                          {u.role || 'Teamlid'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center font-mono">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          disabled={isSelf}
                          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-30 ${
                            u.isActive ? 'bg-emerald-600' : 'bg-slate-100'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-50 shadow transition duration-200 ease-in-out ${
                              u.isActive ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <div className="text-[9px] mt-1 text-slate-500">
                          {u.isActive ? <span className="text-emerald-700 font-bold">ACTIEF</span> : <span className="text-rose-400">INACTIEF</span>}
                        </div>
                      </td>

                      {/* Rights */}
                      <td className="p-4 text-center font-sans">
                        <div className="inline-flex flex-wrap items-center justify-center gap-1.5 text-[10px]">
                          <button
                            onClick={() => handleTogglePermission(u, 'canViewOverview')}
                            className={`px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer font-mono ${
                              u.canViewOverview || u.isAdmin
                                ? 'bg-cyan-50 text-cyan-300 border-cyan-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            <Users className="w-3 h-3" />
                            <span>OVERZICHT</span>
                          </button>

                          <button
                            onClick={() => handleTogglePermission(u, 'canPlannerMode')}
                            className={`px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer font-mono ${
                              u.canPlannerMode || u.isAdmin
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            <span>PLANNER</span>
                          </button>

                          <button
                            onClick={() => handleTogglePermission(u, 'canEditPlanning')}
                            className={`px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer font-mono ${
                              u.canEditPlanning || u.isAdmin
                                ? 'bg-emerald-600/10 text-emerald-700 border-emerald-500/30'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            <span>PLANNING</span>
                          </button>

                          {u.isAdmin && (
                            <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                              ADMIN
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPlanningModalUser(u)}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-cyan-700 hover:border-cyan-500/50 transition-colors cursor-pointer"
                            title="Planning bekijken/bewerken"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenChangeCodeModal(u)}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-amber-700 hover:border-amber-200 transition-colors cursor-pointer"
                            title="Nieuwe code toewijzen"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setEditingUser({ ...u })}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-600 transition-colors cursor-pointer"
                            title="Bewerken"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmUser(u)}
                            disabled={isSelf}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-rose-400 hover:bg-rose-50 hover:border-rose-200 transition-colors disabled:opacity-20 cursor-pointer"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </div>}
      </div>

      {/* Modals met ICT Cyber Styling */}
      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 backdrop-blur-md animate-in fade-in font-sans">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-cyan-700" />
                <h3 className="font-mono font-bold text-sm uppercase text-slate-900 tracking-wider">Nieuwe Gebruiker Aanmaken</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Volledige Naam *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="bv. Jan Janssens"
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Functie / Rol</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="bv. Teamlid / Verpleegkundige"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-500 font-mono text-[10px] uppercase">Toegangscode *</label>
                  <button type="button" onClick={handleGenerateCodeForCreate} className="text-cyan-700 font-mono text-[10px] flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Genereer
                  </button>
                </div>
                <input
                  type="text"
                  value={newAccessCode}
                  onChange={(e) => setNewAccessCode(e.target.value.toUpperCase())}
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-cyan-700 font-mono font-bold tracking-widest text-center rounded-xl px-3.5 py-2.5 text-sm uppercase outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-2">
                <label className="text-slate-500 font-mono text-[10px] uppercase block">Toegangsrechten</label>
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input type="checkbox" checked={newCanEditPlanning} onChange={(e) => setNewCanEditPlanning(e.target.checked)} className="accent-cyan-500" />
                  <span className="text-slate-700">Planning invullen</span>
                </label>
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input type="checkbox" checked={newCanPlannerMode} onChange={(e) => setNewCanPlannerMode(e.target.checked)} className="accent-cyan-500" />
                  <span className="text-slate-700">Planner Mode</span>
                </label>
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input type="checkbox" checked={newCanViewOverview} onChange={(e) => setNewCanViewOverview(e.target.checked)} className="accent-cyan-500" />
                  <span className="text-slate-700">Overzicht bekijken</span>
                </label>
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-amber-950/30 border border-amber-500/30 cursor-pointer">
                  <input type="checkbox" checked={newIsAdmin} onChange={(e) => setNewIsAdmin(e.target.checked)} className="accent-amber-500" />
                  <span className="text-amber-300 font-bold">Systeembeheerder (Admin)</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3 font-mono">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600">
                  ANNULEREN
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-cyan-500 text-white font-bold flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>AANMAKEN</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHOWCASE NEW CODE MODAL */}
      {newlyCreatedCodeInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 backdrop-blur-md animate-in fade-in font-mono">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 mx-auto">
              <Key className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Toegangscode Gegenereerd</h3>
            <p className="text-xs text-slate-500">Medewerker: {newlyCreatedCodeInfo.name}</p>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-cyan-700 font-bold text-xl tracking-widest">{newlyCreatedCodeInfo.code}</span>
              <button onClick={() => handleCopyCode(newlyCreatedCodeInfo.code)} className="p-2 text-slate-500 hover:text-slate-900">
                {copiedCode ? <CheckCheck className="w-5 h-5 text-emerald-700" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            <button onClick={() => setNewlyCreatedCodeInfo(null)} className="w-full py-2.5 rounded-xl bg-cyan-500 text-white font-bold">
              SLUITEN
            </button>
          </div>
        </div>
      )}

      {/* CHANGE CODE MODAL */}
      {changeCodeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 backdrop-blur-md animate-in fade-in font-mono">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Code Wijzigen: {changeCodeUser.name}</h3>
            <div>
              <input
                type="text"
                value={generatedNewCode}
                onChange={(e) => setGeneratedNewCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-200 text-amber-700 font-bold tracking-widest text-center rounded-xl p-3 text-base uppercase"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setChangeCodeUser(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs">
                ANNULEREN
              </button>
              <button onClick={handleSubmitChangeCode} disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-amber-400 text-slate-900 font-bold text-xs">
                OPSLAAN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 backdrop-blur-md animate-in fade-in font-sans">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 font-mono">
              <h3 className="font-bold text-slate-900 uppercase">Gebruiker Bewerken</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-500"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveEditUser} className="space-y-3">
              <div>
                <label className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Naam</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Functie</label>
                <input
                  type="text"
                  value={editingUser.role || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 font-mono"
                />
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editingUser.canEditPlanning} onChange={(e) => setEditingUser({ ...editingUser, canEditPlanning: e.target.checked })} className="accent-cyan-500" />
                  <span className="text-slate-700">Planning invullen</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editingUser.canPlannerMode} onChange={(e) => setEditingUser({ ...editingUser, canPlannerMode: e.target.checked })} className="accent-cyan-500" />
                  <span className="text-slate-700">Planner Mode</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editingUser.canViewOverview} onChange={(e) => setEditingUser({ ...editingUser, canViewOverview: e.target.checked })} className="accent-cyan-500" />
                  <span className="text-slate-700">Overzicht bekijken</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editingUser.isAdmin} onChange={(e) => setEditingUser({ ...editingUser, isAdmin: e.target.checked })} className="accent-amber-500" />
                  <span className="text-amber-300 font-bold">Admin Status</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editingUser.isActive} onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })} className="accent-emerald-500" />
                  <span className="text-emerald-700">Account actief</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-3 font-mono">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl">ANNULEREN</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-cyan-500 text-white font-bold rounded-xl">OPSLAAN</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 backdrop-blur-md animate-in fade-in font-mono">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4">
            <Trash2 className="w-8 h-8 text-rose-400 mx-auto" />
            <h3 className="font-bold text-slate-900">Gebruiker Verwijderen?</h3>
            <p className="text-xs text-slate-500">{deleteConfirmUser.name} permanent wissen uit de database?</p>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={() => setDeleteConfirmUser(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs">
                ANNULEREN
              </button>
              <button onClick={handleConfirmDelete} disabled={isSubmitting} className="px-5 py-2 bg-rose-500 text-white font-bold rounded-xl text-xs">
                VERWIJDEREN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PLANNING MODAL */}
      {planningModalUser && (
        <AdminPlanningModal
          user={planningModalUser}
          onClose={() => setPlanningModalUser(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
};