import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onSignatureChange: (hasSignature: boolean) => void;
  defaultHasSignature?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureChange,
  defaultHasSignature = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(defaultHasSignature);
  const [showDefaultSvg, setShowDefaultSvg] = useState(defaultHasSignature);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set high DPI canvas resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(2, 2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.5;
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setShowDefaultSvg(false);
    setIsDrawing(true);
    setHasDrawn(true);
    onSignatureChange(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    setShowDefaultSvg(false);
    setHasDrawn(false);
    onSignatureChange(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const restoreDefaultSignature = () => {
    setShowDefaultSvg(true);
    setHasDrawn(true);
    onSignatureChange(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="relative rounded border border-[#c5c5d3] bg-[#FFFFFF] h-40 flex flex-col justify-between p-2 overflow-hidden shadow-inner touch-none">
      {/* Label and tech certification */}
      <div className="absolute top-2 left-3 text-[#757682] text-[11px] pointer-events-none flex items-center gap-1 z-10">
        <span className="material-symbols-outlined text-[13px]">gesture</span>
        <span>Écran tactile certifié e-POD</span>
      </div>

      {/* Baseline helper */}
      <div className="absolute bottom-10 left-6 right-6 border-b border-dashed border-[#cbd5e1] pointer-events-none flex items-center">
        <span className="text-[10px] text-[#94a3b8] -mb-5 font-mono">
          X Signer ci-dessus
        </span>
      </div>

      {/* Realistic default SVG vector signature matching image 4 */}
      {showDefaultSvg && (
        <div className="absolute inset-0 flex items-center justify-center pt-2 pointer-events-none z-0">
          <svg
            className="w-full h-28"
            viewBox="0 0 450 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className="signature-path"
              d="M 60 70 C 65 30, 95 20, 90 50 C 85 75, 75 90, 85 92 C 95 94, 110 65, 120 70 C 130 75, 135 90, 140 85 C 145 80, 150 68, 160 75 C 170 82, 175 90, 185 86 C 195 82, 205 60, 215 88 C 220 95, 230 85, 245 86 C 260 87, 280 82, 300 84 C 330 87, 360 75, 395 72 M 165 72 C 160 55, 175 45, 180 52 C 185 60, 175 80, 180 85 M 240 50 L 240 86 M 80 92 Q 180 102 380 80"
              stroke="#0F172A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* Interactive HTML5 drawing Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair relative z-10"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      {/* Controls */}
      <div className="flex justify-between items-center z-20 pt-1">
        {!showDefaultSvg && (
          <button
            type="button"
            onClick={restoreDefaultSignature}
            className="text-[11px] text-[#1976D2] hover:underline"
          >
            Exemple signature
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {hasDrawn && (
            <span className="text-[11px] font-semibold text-[#059669] flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[13px]">check</span>
              Capturée
            </span>
          )}
          <button
            type="button"
            onClick={clearSignature}
            className="bg-[#f2f3ff] hover:bg-[#eaedff] border border-[#c5c5d3] text-[#444651] hover:text-[#ba1a1a] text-[11px] font-semibold px-2.5 py-1 rounded flex items-center gap-1 active:scale-95 transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[14px]">delete</span>
            <span>Effacer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
