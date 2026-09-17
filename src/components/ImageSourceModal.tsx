import React, { useState } from 'react';

interface ImageSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhotoUrl: string;
  onSavePhotoUrl: (url: string) => void;
}

const PRESET_PHOTOS = [
  {
    name: 'Hall d’entrée appartement (Colis Frigo + TV)',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXHM1lL1rEWxr1uZ1QByoidI4PhxHfmI3dOWhQkSszjHsTd63ksNaYaIdt2N7nhacQXYiXZBorAj4NP2N5KFv1uG_HPPww6Dcp0RNA9N3ax6lZh1CCoR0s5H6q37Bh4F6eI-PUCwEGYvXta4mk0sQDDgBeSZWmYwl3jb4N4Q6kpY4WangBBp1ZV-20tM_4y0FClT0-uv_PQpEqstZBVGd-du_-qZ94Fc-HvgIoiyTd8TKO8Wupn6s8',
  },
  {
    name: 'Salon résidentiel — Déballage vérifié',
    url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Palier résidence Les Alizés',
    url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Remise en main propre sécurisée',
    url: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=800&q=80',
  },
];

export const ImageSourceModal: React.FC<ImageSourceModalProps> = ({
  isOpen,
  onClose,
  currentPhotoUrl,
  onSavePhotoUrl,
}) => {
  const [customUrl, setCustomUrl] = useState(currentPhotoUrl);
  const [previewUrl, setPreviewUrl] = useState(currentPhotoUrl);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const resultStr = event.target.result as string;
          setPreviewUrl(resultStr);
          setCustomUrl(resultStr);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (previewUrl) {
      onSavePhotoUrl(previewUrl);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#283044]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#ffffff] border border-[#c5c5d3] rounded-xl max-w-lg w-full p-4 sm:p-5 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto scrollbar-soft">
        <div className="flex items-center justify-between border-b border-[#c5c5d3] pb-3">
          <div className="flex items-center gap-2 text-[#0057A8]">
            <span className="material-symbols-outlined">photo_camera</span>
            <h3 className="text-[16px] font-bold text-[#131b2e]">
              Justificatif Photo — Liens dynamiques
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#444651] hover:bg-[#eaedff] rounded transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Dynamic URL input */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-bold uppercase tracking-wider text-[#444651]">
            Lien d’image dynamique (URL HTML / Web)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customUrl}
              onChange={(e) => {
                setCustomUrl(e.target.value);
                setPreviewUrl(e.target.value);
              }}
              placeholder="https://exemple.com/photo-livraison.jpg"
              className="flex-1 p-2 text-[13px] border border-[#c5c5d3] rounded font-mono focus:outline-none focus:border-[#1976D2]"
            />
            <button
              type="button"
              onClick={() => setPreviewUrl(customUrl)}
              className="px-3 bg-[#eaedff] border border-[#c5c5d3] rounded text-[12px] font-bold text-[#0057A8] hover:bg-[#dae2fd]"
            >
              Charger
            </button>
          </div>
          <p className="text-[11px] text-[#444651]">
            Collez n’importe quel lien direct d’image pour mettre à jour la preuve e-POD.
          </p>
        </div>

        {/* Local File upload */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-bold uppercase tracking-wider text-[#444651]">
            Ou téléverser depuis l'appareil / caméra
          </label>
          <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-[#c5c5d3] rounded-lg cursor-pointer hover:bg-[#f2f3ff] transition-colors">
            <span className="material-symbols-outlined text-[#1976D2]">add_a_photo</span>
            <span className="text-[13px] font-medium text-[#0057A8]">
              Prendre ou sélectionner une photo
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Preset selections */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-bold uppercase tracking-wider text-[#444651]">
            Exemples prédéfinis de livraison e-POD
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_PHOTOS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCustomUrl(preset.url);
                  setPreviewUrl(preset.url);
                }}
                className={`p-2 border rounded text-left text-[11px] transition-all flex flex-col gap-1 ${
                  previewUrl === preset.url
                    ? 'border-[#1976D2] bg-[#eaedff] font-bold text-[#0057A8]'
                    : 'border-[#c5c5d3] hover:bg-[#f2f3ff] text-[#444651]'
                }`}
              >
                <div className="h-14 w-full rounded overflow-hidden bg-gray-100">
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="line-clamp-1">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Preview with simulated Telemetry Watermark */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-bold uppercase tracking-wider text-[#444651]">
            Aperçu avec filigrane télémétrique
          </label>
          <div className="relative rounded border border-[#c5c5d3] overflow-hidden aspect-video bg-[#dae2fd] flex items-center justify-center">
            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt="Aperçu e-POD"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // fallback if URL is broken
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <div className="absolute bottom-2 left-2 bg-[#283044]/90 text-white px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 backdrop-blur-xs">
                  <span className="material-symbols-outlined text-[13px] text-[#A7F3D0]">
                    location_on
                  </span>
                  <span>33.5928° N, -7.6681° W • 10:38:14</span>
                </div>
              </>
            ) : (
              <span className="text-[13px] text-[#444651]">Aucune image sélectionnée</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-[#c5c5d3]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] bg-[#eaedff] border border-[#c5c5d3] text-[#131b2e] text-[13px] font-semibold rounded hover:bg-[#dae2fd] transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 min-h-[44px] bg-[#0057A8] text-white text-[13px] font-bold rounded hover:bg-[#004280] transition-colors shadow"
          >
            Appliquer l'image
          </button>
        </div>
      </div>
    </div>
  );
};
