import React, { useState } from 'react';

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  stopName?: string;
  onConfirmIncident: (type: string, details: string) => void;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({
  isOpen,
  onClose,
  stopName = 'Sara Alaoui',
  onConfirmIncident,
}) => {
  const [selectedType, setSelectedType] = useState<string>('Client absent / Injoignable');
  const [details, setDetails] = useState<string>('');

  if (!isOpen) return null;

  const incidentOptions = [
    'Client absent / Injoignable',
    'Accès impossible (Travaux, portail)',
    'Colis endommagé ou non conforme',
    'Refus client de la marchandise',
    'Adresse erronée / introuvable',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmIncident(selectedType, details);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#283044]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#ffffff] border border-[#c5c5d3] rounded-xl max-w-md w-full p-4 sm:p-5 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-[#c5c5d3] pb-3">
          <div className="flex items-center gap-2 text-[#ba1a1a]">
            <span className="material-symbols-outlined">warning</span>
            <h3 className="text-[16px] font-bold text-[#131b2e]">
              Signaler un incident — {stopName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#444651] hover:bg-[#eaedff] rounded transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {incidentOptions.map((option) => (
              <label
                key={option}
                className={`flex items-center gap-3 p-2.5 border rounded cursor-pointer transition-colors ${
                  selectedType === option
                    ? 'border-[#1976D2] bg-[#eaedff]/60 font-semibold'
                    : 'border-[#c5c5d3] hover:bg-[#f2f3ff]'
                }`}
              >
                <input
                  type="radio"
                  name="incident_type"
                  value={option}
                  checked={selectedType === option}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-4 h-4 text-[#0057A8] focus:ring-0"
                />
                <span className="text-[13px] text-[#131b2e]">{option}</span>
              </label>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-semibold text-[#444651]">
              Commentaire circonstancié (optionnel)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Précisez le problème rencontré..."
              rows={2}
              className="w-full p-2 text-[13px] border border-[#c5c5d3] rounded focus:outline-none focus:border-[#1976D2] resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] bg-[#eaedff] border border-[#c5c5d3] text-[#131b2e] text-[13px] font-semibold rounded hover:bg-[#dae2fd] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[44px] bg-[#ba1a1a] text-[#ffffff] text-[13px] font-bold rounded hover:bg-red-700 transition-colors shadow"
            >
              Confirmer anomalie
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
