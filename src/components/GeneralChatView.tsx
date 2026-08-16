import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const GeneralChatView: React.FC = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!user || (!user.canPlannerMode && !user.isAdmin)) {
    return (
      <div className="p-8 text-center text-slate-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>Je hebt geen toegang tot deze pagina.</p>
      </div>
    );
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMessage('Bericht mag niet leeg zijn.');
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await api.sendTelegramMessage(message.trim());
      setSuccessMessage(res.message || 'Bericht succesvol verzonden!');
      setMessage(''); // Clear the input field
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Versturen van bericht mislukt.';
      setErrorMessage(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full pb-24 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Algemene Chat
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Verstuur een bericht naar het gekoppelde Telegram-kanaal.
          </p>
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

      {/* Chat Form */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs p-6">
        <form onSubmit={handleSendMessage} className="space-y-4">
          <div>
            <label htmlFor="chat-message" className="block text-slate-700 mb-1.5 uppercase font-bold text-[10px] tracking-wider">
              Jouw Bericht
            </label>
            <textarea
              id="chat-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Typ je bericht hier..."
              rows={5}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:bg-white outline-none transition-all"
              disabled={isSending}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSending || !message.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Versturen</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
