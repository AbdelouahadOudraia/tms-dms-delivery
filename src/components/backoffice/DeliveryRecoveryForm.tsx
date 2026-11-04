import React, { useState } from 'react';
import type { Delivery, FailedDeliveryTreatment } from '../../types';
import { getDeliveryWarehouse, WAREHOUSES } from '../../data/logisticsReference';
import { isDamagedDelivery } from '../../utils/deliveryRecovery';

export const DeliveryRecoveryForm: React.FC<{
  delivery: Delivery;
  onSubmit: (payload: FailedDeliveryTreatment) => void;
}> = ({ delivery, onSubmit }) => {
  const damaged = isDamagedDelivery(delivery.failureReason || '');
  const [form, setForm] = useState<FailedDeliveryTreatment>({
    action: damaged ? 'replace' : 'retry', note: '', confirmed: false,
    date: '', startTime: delivery.timeSlot.match(/\d{2}:\d{2}/g)?.[0] || '09:00',
    endTime: delivery.timeSlot.match(/\d{2}:\d{2}/g)?.[1] || '10:00',
    address: delivery.address, phone: delivery.phone, city: delivery.city, district: delivery.district,
    warehouseId: getDeliveryWarehouse(delivery)?.id || '',
  });
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const destinationChanged = form.address.trim() !== delivery.address || form.city.trim() !== delivery.city || form.district !== delivery.district;
  const field = (key: keyof FailedDeliveryTreatment, value: string) => {
    if (['address', 'city', 'district'].includes(key)) { setLatitude(''); setLongitude(''); }
    setForm((current) => ({ ...current, [key]: value, confirmed: false }));
  };
  const labelClass = 'block text-[13px] font-medium text-[#475569]';
  const inputClass = 'bo-input mt-1.5 w-full';
  return <form className="mb-4 rounded-lg border border-[#BFDBFE] bg-[#F8FBFF] p-4" onSubmit={(event) => {
    event.preventDefault();
    onSubmit({ ...form, coordinates: destinationChanged && latitude.trim() && longitude.trim()
      ? { lat: Number(latitude), lng: Number(longitude) } : undefined });
  }}>
    <h5 className="text-sm font-semibold text-[#1F2937]">Traitement du BL en échec</h5>
    <label className={`${labelClass} mt-3`}>Décision
      <select className={inputClass} value={form.action} onChange={(event) => field('action', event.target.value)}>
        {!damaged && <option value="retry">Programmer une nouvelle tentative</option>}
        <option value="replace">Remplacer le produit et reprogrammer</option>
        <option value="return">Enregistrer le retour reçu à l’entrepôt</option>
      </select>
    </label>
    {form.action !== 'return' && <>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>Nouvelle date<input className={inputClass} type="date" required value={form.date} onChange={(event) => field('date', event.target.value)} /></label>
        <label className={labelClass}>Entrepôt de départ<select className={inputClass} required value={form.warehouseId} onChange={(event) => field('warehouseId', event.target.value)}><option value="">Choisir</option>{WAREHOUSES.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
        <label className={labelClass}>Début du créneau<input className={inputClass} type="time" required value={form.startTime} onChange={(event) => field('startTime', event.target.value)} /></label>
        <label className={labelClass}>Fin du créneau<input className={inputClass} type="time" required value={form.endTime} onChange={(event) => field('endTime', event.target.value)} /></label>
        <label className={`${labelClass} sm:col-span-2`}>Adresse de livraison<input className={inputClass} required value={form.address} onChange={(event) => field('address', event.target.value)} /></label>
        <label className={labelClass}>Quartier<select className={inputClass} required value={form.district} onChange={(event) => field('district', event.target.value)}>{Array.from(new Set([delivery.district, ...WAREHOUSES.flatMap((warehouse) => warehouse.zones)])).map((district) => <option key={district}>{district}</option>)}</select></label>
        <label className={labelClass}>Ville<input className={inputClass} required value={form.city} onChange={(event) => field('city', event.target.value)} /></label>
        <label className={`${labelClass} sm:col-span-2`}>Téléphone du client<input className={inputClass} type="tel" required value={form.phone} onChange={(event) => field('phone', event.target.value)} /></label>
      </div>
      {destinationChanged && <fieldset className="mt-3 rounded border border-[#CBD5E1] p-3">
        <legend className="px-1 text-sm font-medium">Localisation de l’adresse corrigée</legend>
        <p className="text-xs text-[#64748B]">Saisissez les coordonnées vérifiées avec le client ou sur la carte.</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>Latitude<input type="number" step="any" min="-90" max="90" required className={inputClass} value={latitude} onChange={(event) => setLatitude(event.target.value)} /></label>
          <label className={labelClass}>Longitude<input type="number" step="any" min="-180" max="180" required className={inputClass} value={longitude} onChange={(event) => setLongitude(event.target.value)} /></label>
        </div>
      </fieldset>}
    </>}
    <label className={`${labelClass} mt-3`}>Motif de la décision / instructions
      <textarea className={`${inputClass} min-h-20 py-2`} required value={form.note} onChange={(event) => field('note', event.target.value)} />
    </label>
    <label className="mt-3 flex items-start gap-2 text-[13px] text-[#475569]">
      <input className="mt-1" type="checkbox" required checked={form.confirmed} onChange={(event) => setForm((current) => ({ ...current, confirmed: event.target.checked }))} />
      <span>{form.action === 'return' ? 'Je confirme que la marchandise a été reçue à l’entrepôt.' : form.action === 'replace' ? 'Je confirme que le remplacement est prêt et que le nouveau créneau est convenu avec le client.' : 'Je confirme les coordonnées et le nouveau créneau convenus avec le client.'}</span>
    </label>
    <p className="mt-3 text-xs leading-5 text-[#64748B]">L’ancienne tentative, sa tournée et ses preuves restent dans l’historique.</p>
    <button type="submit" className="bo-button-primary mt-3">{form.action === 'return' ? 'Confirmer le retour' : 'Créer la nouvelle tentative'}</button>
  </form>;
};
