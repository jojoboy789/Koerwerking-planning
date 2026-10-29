import React from 'react';
import { X, HelpCircle, ShieldAlert } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Toegangscode Vergeten?</h3>
              <p className="text-xs text-slate-500">Hoe werkt toegang zonder wachtwoord?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm text-slate-800">
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-start gap-3.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-xs uppercase tracking-wider text-amber-900">
                Veilig Systeembeleid
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                In dit systeem hebben medewerkers geen e-mailadres of klassiek wachtwoord. Elke toegangscode wordt exclusief
                aangemaakt en beheerd door de <strong>Systeembeheerder (Admin)</strong>.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Wat moet je doen?
            </h4>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li>Neem contact op met Jonas. 0476286766</li>
              <li>De beheerder kan in het Adminportaal jouw toegangscode direct inzien of een nieuwe genereren.</li>
              <li>Zodra een nieuwe code wordt gegenereerd, is je oude code automatisch direct ongeldig.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all cursor-pointer"
          >
            Begrepen
          </button>
        </div>
      </div>
    </div>
  );
};
