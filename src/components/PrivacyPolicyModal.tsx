import React from 'react';
import { X } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 flex flex-col animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-600"
          title="Sluiten"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-bold text-xl sm:text-2xl text-slate-900 tracking-tight mb-4">
          Ons Epische Privacy- & Cookieverhaal
        </h2>
        
        <div className="prose prose-sm sm:prose-base prose-slate max-w-none overflow-y-auto pr-4 -mr-4">
          <p>
            Oké, je hebt op 'Lees meer' geklikt. Of je bent heel voorzichtig, of je verveelt je gewoon. Hoe dan ook, hier is onze poging om een juridisch document leesbaar én een beetje leuk te maken.
          </p>

          <h4>Wat zijn die digitale koekjes (cookies)?</h4>
          <p>
            Stel je voor dat deze app een café is. Cookies zijn als je digitale klantenkaart. We geven je een unieke stempel zodat we weten dat jij het bent als je terugkomt. We onthouden je favoriete 'koffie' (je voorkeuren, zoals de donkere modus als we die hadden) en of je de deur voor iemand hebt opengehouden (metafoor voor je instellingen). We gebruiken deze 'stempels' alleen om jouw bezoek beter te maken. We verkopen je 'klantenkaart' niet aan andere cafés. Nooit.
          </p>
          
          <h4>Welke data verzamelen we?</h4>
          <p>
            Alleen de hoognodige dingen om de app te laten werken. Je naam, je rol (planner, teamlid, opperbaas) en natuurlijk je planning. We zijn niet geïnteresseerd in je browsergeschiedenis, je schoenmaat of wat je gisteravond hebt gegeten (tenzij het pizza was, want pizza is geweldig en we zijn altijd in voor een goed pizzarecept).
          </p>

          <h4>Met wie delen we jouw data?</h4>
          <p>
            Met letterlijk niemand. Nada. Nul. Je geheimen zijn veilig bij ons. Onze database is als de kluis van Goudgrijp in Harry Potter, maar dan zonder de draken en knorrige kobolden... waarschijnlijk. Alles blijft binnen de muren van deze applicatie.
          </p>

          <h4>Jouw rechten als kapitein van je eigen data-schip</h4>
          <p>
            Je hebt het recht om een digitale geest te worden. Als je cookies weigert, gooien we je 'klantenkaart' weg en moeten we je elke keer opnieuw vragen wie je bent. Je kunt ook via een beheerder vragen om je account te verwijderen. Dan gooien we al je gegevens in onze digitale papierversnipperaar, wat verrassend veel voldoening geeft.
          </p>
          
          <h4>Conclusie</h4>
          <p>
            Kortom: we gebruiken je data alleen om deze app voor jou en je team te laten werken. Geen gekke dingen, geen doorverkoop, geen spionage. Beloofd. Nu, ga je gang en maak een keuze over die cookies. Er wacht een planning op je!
          </p>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-200 text-right">
            <button
                onClick={onClose}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-indigo-100 transition-all"
            >
                Ik snap het, sluiten
            </button>
        </div>
      </div>
    </div>
  );
};
