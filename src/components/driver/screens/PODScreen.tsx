import React, { useEffect, useRef, useState } from 'react';
import { useTms } from '../../../context/TmsContext';
import { MobilePrimaryButton, MobileScreenHeader } from '../MobileUI';
import { PodRejectionNotice } from '../PodRejectionNotice';

export const PODScreen: React.FC = () => {
  const {
    deliveries,
    selectedDeliveryId,
    confirmDeliveryPOD,
    workflowSettings,
    setDriverScreen,
  } = useTms();
  const delivery = deliveries.find((d) => d.id === selectedDeliveryId)!;

  const [photoUrl, setPhotoUrl] = useState<string>(
    delivery.status === 'Rejetée' ? delivery.proof?.photoUrl || '' : ''
  );
  const [recipientName, setRecipientName] = useState<string>(
    delivery.status === 'Rejetée' ? delivery.proof?.recipientName || '' : ''
  );
  const [driverNotes, setDriverNotes] = useState<string>(
    delivery.status === 'Rejetée' ? delivery.proof?.driverNotes || '' : ''
  );
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [customPhotoInput, setCustomPhotoInput] = useState('');
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0057A8';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasDrawnSignature(false);
  }, [delivery.id]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * canvas.width / rect.width, (clientY - rect.top) * canvas.height / rect.height);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo((clientX - rect.left) * canvas.width / rect.width, (clientY - rect.top) * canvas.height / rect.height);
    ctx.stroke();
    setHasDrawnSignature(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    const accepted = confirmDeliveryPOD(delivery.id, {
      photoUrl,
      signatureData: hasDrawnSignature ? canvasRef.current?.toDataURL('image/png') : undefined,
      recipientName,
      driverNotes,
    });
    if (accepted) setDriverScreen('success');
  };

  const handlePhotoFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
        setShowPhotoModal(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const allItemsChecked = delivery.items.length > 0 && delivery.items.every((item) => item.checked);
  const canConfirm =
    ['Livraison en cours', 'Rejetée'].includes(delivery.status) &&
    (!workflowSettings.requirePhoto || Boolean(photoUrl)) &&
    (!workflowSettings.requireSignature || hasDrawnSignature) &&
    Boolean(recipientName.trim()) &&
    allItemsChecked;

  return (
    <div className="flex-1 flex flex-col bg-[#EEF3F8] overflow-hidden pb-20">
      <MobileScreenHeader
        title="e-POD"
        subtitle={delivery.orderId}
        onBack={() => setDriverScreen(delivery.status === 'Rejetée' ? 'detail' : 'items')}
        right={<span className="rounded-full border border-[#BCD6ED] bg-[#E8F2FB] px-2 py-1 text-xs font-bold text-[#0057A8]">10:42</span>}
      />

      <div className="flex-1 overflow-y-auto scrollbar-soft p-4 space-y-4">
        {delivery.status === 'Rejetée' && (
          <PodRejectionNotice
            reason={delivery.proof?.rejectionReason}
            comment={delivery.proof?.rejectionComment}
          />
        )}
        <section className="rounded-3xl border border-[#DDE7F0] bg-white p-4 shadow-sm shadow-slate-200/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470]">Récapitulatif avant validation</p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-[#1D2229]">{delivery.customerName}</h2>
              <p className="truncate text-xs text-[#5B6470]">{delivery.district} • {delivery.timeSlot}</p>
            </div>
            <span className="rounded-xl border border-[#BEE3CE] bg-[#EAF5EE] px-2 py-1 text-[10px] font-bold text-[#176B3A]">GPS ±8m</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-[#DDE7F0] bg-[#F7FAFC] p-2">
              <span className="block text-[10px] text-[#5B6470]">Photo</span>
              <span className={`font-bold ${photoUrl ? 'text-[#176B3A]' : 'text-[#B8561B]'}`}>
                {photoUrl ? 'Ajoutée' : 'Manquante'}
              </span>
            </div>
            <div className="rounded-xl border border-[#DDE7F0] bg-[#F7FAFC] p-2">
              <span className="block text-[10px] text-[#5B6470]">Colis contrôlés</span>
              <span className="font-bold text-[#1D2229]">
                {delivery.items.filter((item) => item.checked).length}/{delivery.items.length}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#DDE7F0] bg-white p-4 shadow-sm shadow-slate-200/70 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D2229]">Photo de livraison</h3>
            <span className="text-[10px] font-bold text-[#0057A8]">
              {workflowSettings.requirePhoto ? 'Obligatoire' : 'Facultative'}
            </span>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-[#DDE7F0] bg-[#F7FAFC]">
            {photoUrl ? (
              <img src={photoUrl} alt="Preuve livraison" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-[#8EA0B5]">
                <span className="material-symbols-outlined text-[38px]">add_a_photo</span>
                <span className="text-xs font-semibold">Ajoutez une photo prise chez le client</span>
              </div>
            )}
            {photoUrl && (
              <div className="absolute bottom-2 left-2 rounded-lg bg-black/75 px-2 py-1 text-[10px] font-mono text-white">
                {delivery.coordinates.lat}, {delivery.coordinates.lng} • GPS simulé
              </div>
            )}
          </div>
          <button type="button" onClick={() => setShowPhotoModal(true)} className="min-h-[40px] w-full rounded-xl border border-dashed border-[#8FBCE6] text-xs font-bold text-[#0057A8]">
            Changer / prendre une photo
          </button>
        </section>

        <section className="rounded-3xl border border-[#DDE7F0] bg-white p-4 shadow-sm shadow-slate-200/70 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D2229]">Signature client</h3>
            <button type="button" onClick={handleClearSignature} className="text-[11px] font-bold text-[#7F1D1D]">Effacer</button>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-[#BCD6ED] bg-white touch-none">
            <canvas
              ref={canvasRef}
              width={360}
              height={150}
              className="h-[150px] w-full cursor-crosshair bg-white"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-[#5B6470]">Signer ici</span>
          </div>
          {!hasDrawnSignature && workflowSettings.requireSignature && (
            <p className="text-xs font-semibold text-[#E8722C]">Signature requise avant confirmation.</p>
          )}
        </section>

        <section className="rounded-3xl border border-[#DDE7F0] bg-white p-4 shadow-sm shadow-slate-200/70 space-y-3">
          <label className="block text-xs font-bold text-[#1D2229]">Nom du réceptionnaire</label>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="h-11 w-full rounded-xl border border-[#DDE7F0] bg-[#FBFDFF] px-3 text-xs font-bold text-[#1D2229] outline-none focus:border-[#0057A8]"
          />
          <label className="block text-xs font-bold text-[#1D2229]">Remarque chauffeur</label>
          <textarea
            rows={2}
            value={driverNotes}
            onChange={(e) => setDriverNotes(e.target.value)}
            className="w-full resize-none rounded-xl border border-[#DDE7F0] bg-[#FBFDFF] p-3 text-xs text-[#1D2229] outline-none focus:border-[#0057A8]"
          />
        </section>
      </div>

      <div className="shrink-0 border-t border-[#DDE7F0] bg-white p-4">
        <MobilePrimaryButton onClick={handleConfirm} disabled={!canConfirm} icon="check_circle">
          {delivery.status === 'Rejetée' ? 'Renvoyer la preuve corrigée' : 'Confirmer la livraison'}
        </MobilePrimaryButton>
      </div>

      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1D2229]">Photo e-POD</h3>
              <button onClick={() => setShowPhotoModal(false)} className="text-[#5B6470]">✕</button>
            </div>
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#8FBCE6] bg-[#F7FAFC] text-xs font-bold text-[#0057A8]">
              <span className="material-symbols-outlined text-[28px]">photo_camera</span>
              Prendre ou choisir une photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoFile}
                className="sr-only"
              />
            </label>
            <input value={customPhotoInput} onChange={(e) => setCustomPhotoInput(e.target.value)} placeholder="URL image personnalisée" className="h-10 w-full rounded-xl border border-[#DDE7F0] px-3 text-xs" />
            <button type="button" onClick={() => { if (customPhotoInput.trim()) { setPhotoUrl(customPhotoInput.trim()); setShowPhotoModal(false); } }} className="h-10 w-full rounded-xl bg-[#0057A8] text-xs font-bold text-white">Appliquer</button>
          </div>
        </div>
      )}
    </div>
  );
};
