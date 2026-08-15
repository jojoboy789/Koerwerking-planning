import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, AdminStats } from '../types';
import { api } from '../services/api';
import { AdminPlanningModal } from './AdminPlanningModal';
import {
  Users, UserPlus, Key, Edit3, Trash2, Calendar, Check, X, Shield,
  ShieldCheck, AlertCircle, CheckCircle2, Loader2, Sparkles, RefreshCw,
  Copy, CheckCheck, Save, Cloud, Database
} from 'lucide-react';

export const AdminPortalView: React.FC = () => {
  const { user: currentAdmin } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState<boolean>(false);
  const [firebaseStatus, setFirebaseStatus] = useState<{
    connected: boolean;
    projectId: string;
    authDomain: string;
    lastSyncAt: string;
  } | null>(null);

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

  // Change Code Form State
  const [generatedNewCode, setGeneratedNewCode] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [usersRes, statsRes, fbStatus] = await Promise.allSettled([
        api.getAdminUsers(),
        api.getAdminStats(),
        api.getFirebaseStatus(),
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Create Modal & generate initial random code
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

  // Submit Create User
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

  // Toggle user active status directly
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

  // Toggle quick permission
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

  // Change Code modal
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

  // Delete User
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

  // Edit User details
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

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Gebruikersbeheer
            </h2>
            <span className="px-2.5 py-0.5 bg-indigo-100 border border-indigo-200 rounded-full text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
              ADMIN PORTAL
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Beheer gebruikerstoegang, rechten, toegangscodes en planningen.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
            title="Verversen"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            id="btn-create-user"
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nieuwe Gebruiker</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-800 text-xs font-medium animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Stats Cards Row - Bento Style */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Totaal Gebruikers</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{stats.totalUsers}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[10px] text-emerald-600 uppercase font-semibold">Actief</div>
            <div className="text-xl font-bold text-emerald-700 mt-1">{stats.activeUsers}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[10px] text-red-600 uppercase font-semibold">Inactief</div>
            <div className="text-xl font-bold text-red-700 mt-1">{stats.inactiveUsers}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[10px] text-indigo-600 uppercase font-semibold">Planning Rechten</div>
            <div className="text-xl font-bold text-indigo-700 mt-1">{stats.canEditPlanningCount}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[10px] text-amber-600 uppercase font-semibold">Overzicht Rechten</div>
            <div className="text-xl font-bold text-amber-700 mt-1">{stats.canViewOverviewCount}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Beheerders</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{stats.adminCount}</div>
          </div>
        </div>
      )}

      {/* Firebase Cloud Sync Card */}
      <div className="p-4 md:p-5 rounded-3xl bg-linear-to-r from-amber-500/10 via-amber-50 to-orange-50/40 border border-amber-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-sm shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Google Cloud Firestore</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Gekoppeld
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Project: <span className="font-mono font-semibold text-amber-900">planning-koer-gbr</span> &bull; Realtime cloud-persistentie voor alle gebruikers en maandplanningen.
            </p>
          </div>
        </div>

        <button
          onClick={handleSyncFirebase}
          disabled={isSyncingFirebase}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-98 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer shrink-0"
        >
          {isSyncingFirebase ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Synchroniseren...</span>
            </>
          ) : (
            <>
              <Database className="w-3.5 h-3.5" />
              <span>Nu Syncen naar Firebase</span>
            </>
          )}
        </button>
      </div>

      {/* Users Table - Bento Card */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs relative">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Gebruikers laden...</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-4">Gebruiker</th>
                  <th className="p-4">Rol / Functie</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Rechten</th>
                  <th className="p-4 text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = u.id === currentAdmin?.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Avatar & Name */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border ${
                              u.isAdmin
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                            }`}
                          >
                            {u.avatar || u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 font-medium uppercase">
                                  Jij
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {u.rawCode && (
                                <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded">
                                  Code: {u.rawCode}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                ID: {u.id}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-4">
                        <span className="text-xs text-slate-700 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-medium">
                          {u.role || 'Teamlid'}
                        </span>
                      </td>

                      {/* Status Toggle Switch */}
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          disabled={isSelf}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                            u.isActive ? 'bg-indigo-600' : 'bg-slate-200'
                          }`}
                          title={u.isActive ? 'Klik om te deactiveren' : 'Klik om te activeren'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              u.isActive ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <div className="text-[10px] mt-1 text-slate-500 font-medium">
                          {u.isActive ? (
                            <span className="text-emerald-700 font-semibold">Actief</span>
                          ) : (
                            <span className="text-red-600">Inactief</span>
                          )}
                        </div>
                      </td>

                      {/* Permissions Chips */}
                      <td className="p-4 text-center">
                        <div className="inline-flex flex-wrap items-center justify-center gap-1.5 text-[10px]">
                          {/* Overzicht */}
                          <button
                            onClick={() => handleTogglePermission(u, 'canViewOverview')}
                            className={`px-2 py-0.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                              u.canViewOverview || u.isAdmin
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                            title="Klik om recht 'Overzicht' te wisselen"
                          >
                            <Users className="w-2.5 h-2.5" />
                            <span>Overzicht: {u.canViewOverview || u.isAdmin ? 'Ja' : 'Nee'}</span>
                          </button>

                          {/* Planner Mode */}
                          <button
                            onClick={() => handleTogglePermission(u, 'canPlannerMode')}
                            className={`px-2 py-0.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                              u.canPlannerMode || u.isAdmin
                                ? 'bg-amber-50 text-amber-700 border-amber-200 font-medium'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                            title="Klik om recht 'Planner Mode' te wisselen"
                          >
                            <Shield className="w-2.5 h-2.5" />
                            <span>Planner: {u.canPlannerMode || u.isAdmin ? 'Ja' : 'Nee'}</span>
                          </button>

                          {/* Planning */}
                          <button
                            onClick={() => handleTogglePermission(u, 'canEditPlanning')}
                            className={`px-2 py-0.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                              u.canEditPlanning || u.isAdmin
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                            title="Klik om recht 'Planning invullen' te wisselen"
                          >
                            <Calendar className="w-2.5 h-2.5" />
                            <span>Planning: {u.canEditPlanning || u.isAdmin ? 'Ja' : 'Nee'}</span>
                          </button>

                          {/* Admin */}
                          {u.isAdmin && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 font-bold">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              <span>Admin</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View/Edit Planning */}
                          <button
                            onClick={() => setPlanningModalUser(u)}
                            className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors cursor-pointer"
                            title="Planning van medewerker bekijken / bewerken"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          {/* Change Access Code */}
                          <button
                            onClick={() => handleOpenChangeCodeModal(u)}
                            className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-amber-600 hover:bg-amber-50 hover:border-amber-200 transition-colors cursor-pointer"
                            title="Nieuwe toegangscode toewijzen"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit User Info */}
                          <button
                            onClick={() => setEditingUser({ ...u })}
                            className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Gegevens bewerken"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirmUser(u)}
                            disabled={isSelf}
                            className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Gebruiker verwijderen"
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
      </div>

      {/* === MODAL: CREATE USER === */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">Nieuwe Gebruiker Aanmaken</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 mb-1.5 uppercase font-bold text-[10px] tracking-wider">
                  Volledige Naam *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="bijv. Jan Janssens"
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:bg-white outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1.5 uppercase font-bold text-[10px] tracking-wider">
                  Functie / Rol
                </label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="bijv. Teamlid / Verpleegkundige"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:bg-white outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-700 uppercase font-bold text-[10px] tracking-wider">
                    Toegangscode *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateCodeForCreate}
                    className="text-indigo-600 hover:underline text-[11px] flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Genereer code</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={newAccessCode}
                  onChange={(e) => setNewAccessCode(e.target.value.toUpperCase())}
                  placeholder="GBR-XXXX-XX"
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-indigo-700 font-mono font-bold tracking-widest text-center rounded-xl px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:bg-white outline-none uppercase"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Deze code geef je aan de medewerker om in te loggen.
                </p>
              </div>

              {/* Permissions Checkboxes */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <label className="text-slate-700 uppercase font-bold text-[10px] block tracking-wider">
                  Toegangsrechten
                </label>
                
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={newCanEditPlanning}
                    onChange={(e) => setNewCanEditPlanning(e.target.checked)}
                    className="accent-indigo-600 w-4 h-4 rounded"
                  />
                  <div>
                    <span className="font-semibold text-slate-900">Planning invullen</span>
                    <p className="text-[10px] text-slate-500">Gebruiker kan eigen maandshifts selecteren & opslaan</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={newCanPlannerMode}
                    onChange={(e) => setNewCanPlannerMode(e.target.checked)}
                    className="accent-indigo-600 w-4 h-4 rounded"
                  />
                  <div>
                    <span className="font-semibold text-slate-900">Planner Mode</span>
                    <p className="text-[10px] text-slate-500">Gebruiker kan planningen van collega's aanpassen & 'Team plannen' gebruiken</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={newCanViewOverview}
                    onChange={(e) => setNewCanViewOverview(e.target.checked)}
                    className="accent-indigo-600 w-4 h-4 rounded"
                  />
                  <div>
                    <span className="font-semibold text-slate-900">Overzicht bekijken</span>
                    <p className="text-[10px] text-slate-500">Gebruiker kan het teammatrix rooster inzien</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50/50 border border-amber-200 cursor-pointer hover:bg-amber-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={newIsAdmin}
                    onChange={(e) => setNewIsAdmin(e.target.checked)}
                    className="accent-amber-600 w-4 h-4 rounded"
                  />
                  <div>
                    <span className="font-semibold text-amber-900">Systeembeheerder (Admin)</span>
                    <p className="text-[10px] text-amber-700">Volledige beheerderstoegang tot alle gebruikers</p>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 font-medium cursor-pointer"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>Aanmaken</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === MODAL: SHOWCASE NEW ACCESS CODE === */}
      {newlyCreatedCodeInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
              <Key className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-bold text-xl text-slate-900">
                Toegangscode voor {newlyCreatedCodeInfo.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Kopieer deze code en geef hem aan de medewerker. In de database wordt alleen de veilige SHA-256 hash bewaard.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="font-mono text-2xl font-bold tracking-widest text-indigo-700 select-all">
                {newlyCreatedCodeInfo.code}
              </span>
              <button
                onClick={() => handleCopyCode(newlyCreatedCodeInfo.code)}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-600 text-indigo-600 transition-colors cursor-pointer shadow-xs"
                title="Kopieer code"
              >
                {copiedCode ? <CheckCheck className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            <button
              onClick={() => setNewlyCreatedCodeInfo(null)}
              className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all cursor-pointer"
            >
              Klaar / Sluiten
            </button>
          </div>
        </div>
      )}

      {/* === MODAL: CHANGE ACCESS CODE === */}
      {changeCodeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Key className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Toegangscode Wijzigen: {changeCodeUser.name}
                </h3>
              </div>
              <button
                onClick={() => setChangeCodeUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-500">
                Zodra je een nieuwe code instelt, wordt de vorige toegangscode direct permanent ongeldig gemaakt.
              </p>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-700 uppercase font-bold text-[10px] tracking-wider">
                    Nieuwe Toegangscode
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await api.generateAccessCode(changeCodeUser.name.substring(0, 3));
                      setGeneratedNewCode(res.code);
                    }}
                    className="text-indigo-600 hover:underline text-[11px] flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Genereer willekeurige code</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={generatedNewCode}
                  onChange={(e) => setGeneratedNewCode(e.target.value.toUpperCase())}
                  placeholder="GBR-XXXX-XX"
                  className="w-full bg-slate-50 border border-slate-200 text-indigo-700 font-mono font-bold tracking-widest text-center rounded-xl px-3.5 py-2.5 text-base focus:border-indigo-600 focus:bg-white outline-none uppercase"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setChangeCodeUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer font-medium"
                >
                  Annuleren
                </button>
                <button
                  type="button"
                  onClick={handleSubmitChangeCode}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-amber-700 shadow-md shadow-amber-100 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  <span>Code Opslaan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL: EDIT USER === */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">Gebruiker Bewerken</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 mb-1.5 uppercase font-bold text-[10px] tracking-wider">
                  Naam
                </label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2 text-sm focus:border-indigo-600 focus:bg-white outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1.5 uppercase font-bold text-[10px] tracking-wider">
                  Functie / Rol
                </label>
                <input
                  type="text"
                  value={editingUser.role || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2 text-sm focus:border-indigo-600 focus:bg-white outline-none transition-all"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-slate-700 uppercase font-bold text-[10px] block tracking-wider">
                  Rechten & Toegang
                </label>
                
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={editingUser.canEditPlanning}
                    onChange={(e) => setEditingUser({ ...editingUser, canEditPlanning: e.target.checked })}
                    className="accent-indigo-600 w-4 h-4 rounded"
                  />
                  <span className="font-semibold text-slate-900">Planning invullen</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={editingUser.canPlannerMode}
                    onChange={(e) => setEditingUser({ ...editingUser, canPlannerMode: e.target.checked })}
                    className="accent-indigo-600 w-4 h-4 rounded"
                  />
                  <span className="font-semibold text-slate-900">Planner Mode</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={editingUser.canViewOverview}
                    onChange={(e) => setEditingUser({ ...editingUser, canViewOverview: e.target.checked })}
                    className="accent-indigo-600 w-4 h-4 rounded"
                  />
                  <span className="font-semibold text-slate-900">Overzicht bekijken</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50/50 border border-amber-200 cursor-pointer hover:bg-amber-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={editingUser.isAdmin}
                    onChange={(e) => setEditingUser({ ...editingUser, isAdmin: e.target.checked })}
                    className="accent-amber-600 w-4 h-4 rounded"
                  />
                  <span className="font-semibold text-amber-900">Systeembeheerder (Admin)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={editingUser.isActive}
                    onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                    className="accent-indigo-600 w-4 h-4 rounded"
                  />
                  <span className="font-semibold text-slate-900">Account is actief</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer font-medium"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Opslaan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === MODAL: DELETE CONFIRMATION === */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-lg text-slate-900">
                Gebruiker Verwijderen?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Weet je zeker dat je <strong>{deleteConfirmUser.name}</strong> wilt verwijderen? Alle ingevulde maandplanningen van deze medewerker worden ook definitief gewist.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-medium cursor-pointer"
              >
                Annuleren
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-red-700 shadow-md shadow-red-100 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Definitief Verwijderen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL: ADMIN PLANNING EDITOR === */}
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
