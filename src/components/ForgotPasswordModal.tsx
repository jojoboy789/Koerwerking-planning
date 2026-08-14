import React from 'react';
import { X, KeyRound, HelpCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  demoPresets?: Array<{ name: string; code: string; rights: string }>;
  onSelectPreset?: (code: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  demoPresets = [],
  onSelectPreset,
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
              <li>Neem contact op met je teamleider of planner.</li>
              <li>De beheerder kan in het Adminportaal jouw toegangscode direct inzien of een nieuwe genereren.</li>
              <li>Zodra een nieuwe code wordt gegenereerd, is je oude code automatisch direct ongeldig.</li>
            </ul>
          </div>

          {/* Quick Demo Presets */}
          {demoPresets.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Testaccounts (Direct Inloggen):
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {demoPresets.map((preset) => (
                  <button
                    key={preset.code}
                    onClick={() => {
                      if (onSelectPreset) {
                        onSelectPreset(preset.code);
                      }
                      onClose();
                    }}
                    className="text-left p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">
                        {preset.name}
                      </span>
                      <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="text-[11px] font-mono text-indigo-700 mt-0.5 font-bold tracking-wider">
                      {preset.code}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">{preset.rights}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
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
