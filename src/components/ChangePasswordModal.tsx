
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Key, X, Eye, EyeOff, Loader2 } from 'lucide-react';

interface ChangePasswordModalProps {
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [oldCode, setOldCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [showOldCode, setShowOldCode] = useState(false);
  const [showNewCode, setShowNewCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCode !== confirmCode) {
      setErrorMessage('De nieuwe codes komen niet overeen.');
      return;
    }
    if (newCode.length < 6) {
        setErrorMessage('De nieuwe code moet minstens 6 karakters lang zijn.');
        return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await api.changeMyPassword({ oldCode, newCode });
      setSuccessMessage(res.message || 'Je wachtwoord is succesvol gewijzigd.');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Wachtwoord wijzigen mislukt.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base text-slate-900">Wachtwoord Wijzigen</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              {successMessage}
            </div>
          )}

          <div>
            <label className="block text-slate-700 mb-1.5 uppercase font-bold text-[10px] tracking-wider">
              Oude Toegangscode
            </label>
            <div className="relative">
              <input
                type={showOldCode ? 'text' : 'password'}
                value={oldCode}
                onChange={(e) => setOldCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:bg-white outline-none transition-all uppercase"
                required
              />
              <button
                type="button"
                onClick={() => setShowOldCode(!showOldCode)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showOldCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 mb-1.5 uppercase font-bold text-[10px] tracking-wider">
              Nieuwe Toegangscode
            </label>
            <div className="relative">
                <input
                    type={showNewCode ? 'text' : 'password'}
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:bg-white outline-none transition-all uppercase"
                    required
                />
                <button
                    type="button"
                    onClick={() => setShowNewCode(!showNewCode)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                    {showNewCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 mb-1.5 uppercase font-bold text-[10px] tracking-wider">
              Bevestig Nieuwe Code
            </label>
             <div className="relative">
                <input
                    type={showNewCode ? 'text' : 'password'}
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:bg-white outline-none transition-all uppercase"
                    required
                />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              <span>Opslaan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
