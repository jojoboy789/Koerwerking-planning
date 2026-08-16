import React from 'react';
import { X, Send } from 'lucide-react';

interface TelegramInvitationModalProps {
  onClose: () => void;
  inviteUrl: string;
}

export const TelegramInvitationModal: React.FC<TelegramInvitationModalProps> = ({ onClose, inviteUrl }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full m-4 p-8 text-center relative font-sans transform transition-all animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Sluit venster"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 bg-sky-100 border-8 border-sky-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <Send className="w-8 h-8 text-sky-600" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Word Lid van de Telegram Groep!
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          Blijf op de hoogte van de laatste updates en communiceer direct met de planners.
        </p>

        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="w-full inline-flex items-center justify-center px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-sky-100 transition-all active:scale-98"
        >
          Nu Deelnemen
        </a>
        <button
            onClick={onClose}
            className="mt-3 text-xs text-slate-400 hover:text-slate-600"
        >
            Nee, bedankt
        </button>
      </div>
    </div>
  );
};
