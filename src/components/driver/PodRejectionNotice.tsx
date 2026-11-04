import React from 'react';
import { getPodCorrectionInstruction } from '../../utils/podRejection';

interface PodRejectionNoticeProps {
  reason?: string;
  comment?: string;
}

export const PodRejectionNotice: React.FC<PodRejectionNoticeProps> = ({ reason, comment }) => (
  <section
    role="alert"
    className="rounded-3xl border border-[#F5B8B8] bg-[#FFF1F1] p-4 shadow-sm shadow-red-100/60"
  >
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FEE2E2] text-[#9B1C1C]">
        <span className="material-symbols-outlined text-[20px]">error</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-[#9B1C1C]">Preuve rejetée</p>
        <dl className="mt-2 space-y-2 text-xs">
          <div>
            <dt className="font-semibold text-[#5B6470]">Motif</dt>
            <dd className="mt-0.5 font-bold text-[#1D2229]">{reason || 'Motif non précisé'}</dd>
          </div>
          {comment?.trim() && (
            <div>
              <dt className="font-semibold text-[#5B6470]">Commentaire du superviseur</dt>
              <dd className="mt-0.5 text-[#1D2229]">{comment}</dd>
            </div>
          )}
          <div className="rounded-xl border border-[#F5B8B8] bg-white/80 p-2.5">
            <dt className="font-bold text-[#9B1C1C]">Correction demandée</dt>
            <dd className="mt-0.5 leading-relaxed text-[#1D2229]">
              {getPodCorrectionInstruction(reason)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </section>
);
