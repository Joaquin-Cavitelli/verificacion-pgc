import React from 'react';
import type { CantidadPerfiles, GeometriaReconstruida, VinculacionDoble } from '../calc/types';

interface SeccionPGCSvgProps {
  geometria: GeometriaReconstruida;
  cantidadPerfiles: CantidadPerfiles;
  vinculacionDoble: VinculacionDoble;
  mostrarDescomposicionQ?: boolean;
}

export const SeccionPGCSvg: React.FC<SeccionPGCSvgProps> = ({
  geometria,
  cantidadPerfiles,
  vinculacionDoble,
  mostrarDescomposicionQ = true,
}) => {
  const { perfil, ro_mm, efectivas } = geometria;
  const { A_mm: A, B_mm: B, C_mm: C, e_mm: e, xg_cm } = perfil;

  // Coordenadas en mm dentro del SVG, escaladas dinámicamente para encajar cualquier perfil (90 a 400 mm)
  const padX = 56;
  const padY = 34;
  const esDoble = cantidadPerfiles === 2;
  const gapEspalda = 2;
  const anchoTotal_mm = esDoble ? B * 2 + gapEspalda : B;
  const altoTotal_mm = A;

  // Escala visual para viewport SVG 320x260
  const svgW = 340;
  const svgH = 260;
  const scale = Math.min((svgW - padX * 2) / Math.max(anchoTotal_mm, 80), (svgH - padY * 2) / altoTotal_mm);

  // Espesor visual mínimo para que chapas de 0.90 mm se lean con nitidez en perfiles de 400 mm
  const tVis = Math.max(e, 2.2 / scale);
  const roVis = Math.max(ro_mm, tVis + 0.8);

  const cx = svgW / 2;
  const cy = svgH / 2;

  const toSvgX = (x_mm: number, offset_mm = 0) => cx + (x_mm + offset_mm - anchoTotal_mm / 2) * scale;
  const toSvgY = (y_mm: number) => cy - y_mm * scale; // y_mm = 0 en eje neutro

  const buildChannelPath = (mirrorX: boolean, offset_mm: number) => {
    // Coordenadas locales de un perfil PGC con alma en x=0..tVis, y ∈ [-A/2, +A/2]
    const xMap = (x: number) => toSvgX(mirrorX ? -x : x, offset_mm);
    const yMap = (y: number) => toSvgY(y);
    const yTop = A / 2;
    const yBot = -A / 2;
    const riVis = Math.max(0.5, roVis - tVis);

    // Poligonal simplificada con codos curvos precisos (aproximación bezier/arco)
    const sweepOut = mirrorX ? 0 : 1;
    const sweepIn = mirrorX ? 1 : 0;

    return [
      `M ${xMap(0)} ${yMap(yTop - roVis)}`,
      `A ${roVis * scale} ${roVis * scale} 0 0 ${sweepOut} ${xMap(roVis)} ${yMap(yTop)}`,
      `L ${xMap(B - roVis)} ${yMap(yTop)}`,
      `A ${roVis * scale} ${roVis * scale} 0 0 ${sweepOut} ${xMap(B)} ${yMap(yTop - roVis)}`,
      `L ${xMap(B)} ${yMap(yTop - C)}`,
      `L ${xMap(B - tVis)} ${yMap(yTop - C)}`,
      `L ${xMap(B - tVis)} ${yMap(yTop - roVis)}`,
      `A ${riVis * scale} ${riVis * scale} 0 0 ${sweepIn} ${xMap(B - roVis)} ${yMap(yTop - tVis)}`,
      `L ${xMap(roVis)} ${yMap(yTop - tVis)}`,
      `A ${riVis * scale} ${riVis * scale} 0 0 ${sweepIn} ${xMap(tVis)} ${yMap(yTop - roVis)}`,
      `L ${xMap(tVis)} ${yMap(yBot + roVis)}`,
      `A ${riVis * scale} ${riVis * scale} 0 0 ${sweepIn} ${xMap(roVis)} ${yMap(yBot + tVis)}`,
      `L ${xMap(B - roVis)} ${yMap(yBot + tVis)}`,
      `A ${riVis * scale} ${riVis * scale} 0 0 ${sweepIn} ${xMap(B - tVis)} ${yMap(yBot + roVis)}`,
      `L ${xMap(B - tVis)} ${yMap(yBot + C)}`,
      `L ${xMap(B)} ${yMap(yBot + C)}`,
      `L ${xMap(B)} ${yMap(yBot + roVis)}`,
      `A ${roVis * scale} ${roVis * scale} 0 0 ${sweepOut} ${xMap(B - roVis)} ${yMap(yBot)}`,
      `L ${xMap(roVis)} ${yMap(yBot)}`,
      `A ${roVis * scale} ${roVis * scale} 0 0 ${sweepOut} ${xMap(0)} ${yMap(yBot + roVis)}`,
      'Z',
    ].join(' ');
  };

  // Posicionamiento según disposición simple o doble
  const renderProfiles = () => {
    if (!esDoble) {
      return (
        <path
          d={buildChannelPath(false, 0)}
          fill="#1e293b"
          fillOpacity={0.12}
          stroke="#0f172a"
          strokeWidth={1.5}
        />
      );
    }

    if (vinculacionDoble === 'cajon_vinculado') {
      // Caja cerrada: alas encontradas
      return (
        <>
          <path
            d={buildChannelPath(false, 0)}
            fill="#1e293b"
            fillOpacity={0.12}
            stroke="#0f172a"
            strokeWidth={1.5}
          />
          <path
            d={buildChannelPath(true, B * 2 + gapEspalda)}
            fill="#1e293b"
            fillOpacity={0.12}
            stroke="#0f172a"
            strokeWidth={1.5}
          />
        </>
      );
    }

    // Espalda con espalda (forma I)
    return (
      <>
        <path
          d={buildChannelPath(true, B)}
          fill="#1e293b"
          fillOpacity={0.12}
          stroke="#0f172a"
          strokeWidth={1.5}
        />
        <path
          d={buildChannelPath(false, B + gapEspalda)}
          fill="#1e293b"
          fillOpacity={0.12}
          stroke="#0f172a"
          strokeWidth={1.5}
        />
      </>
    );
  };

  const xStart = esDoble ? toSvgX(0, 0) : toSvgX(0, 0);
  const xEnd = esDoble ? toSvgX(anchoTotal_mm, 0) : toSvgX(B, 0);
  const yTopPx = toSvgY(A / 2);
  const yBotPx = toSvgY(-A / 2);
  const xgPx = !esDoble ? toSvgX(xg_cm * 10, 0) : cx;

  // Zona resaltada para Q (mitad superior de un perfil simple)
  const renderQOverlay = () => {
    if (!mostrarDescomposicionQ || esDoble) return null;
    const x0 = toSvgX(0, 0);
    const x1 = toSvgX(B, 0);
    const y0 = toSvgY(0);
    const yTop = toSvgY(A / 2);
    const yLipBot = toSvgY(A / 2 - C);
    return (
      <g opacity={0.9}>
        {/* Rectángulo de resalte sobre la mitad superior para indicar región Q = Σ(Ai·yi) */}
        <rect
          x={x0 - 4}
          y={yTop - 4}
          width={x1 - x0 + 8}
          height={y0 - yTop + 4}
          fill="#1d4ed8"
          fillOpacity={0.07}
          stroke="#1d4ed8"
          strokeWidth={1}
          strokeDasharray="3 2"
          rx={2}
        />
        <text
          x={x1 + 10}
          y={(yTop + y0) / 2 - 4}
          className="fill-blue-700 text-[10px] font-mono font-semibold"
        >
          Zona Q (y ≥ 0)
        </text>
        <text
          x={x1 + 10}
          y={(yTop + y0) / 2 + 9}
          className="fill-blue-600 text-[9px] font-mono"
        >
          Q = {geometria.Q_max_cm3.toFixed(2)} cm³
        </text>
        {/* Marca de ancho efectivo en ala comprimida */}
        {efectivas.rho_ala < 0.999 && (
          <line
            x1={toSvgX(ro_mm, 0)}
            y1={yTop - 7}
            x2={toSvgX(ro_mm + efectivas.b_eff_ala_mm, 0)}
            y2={yTop - 7}
            stroke="#d97706"
            strokeWidth={2.5}
          />
        )}
        {/* Marca de pestaña */}
        <line
          x1={x1 + 4}
          y1={yTop}
          x2={x1 + 4}
          y2={yLipBot}
          stroke="#64748b"
          strokeWidth={1}
        />
      </g>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-700">
          Sección transversal PGC {perfil.nombre.replace('(*)', '')}
        </span>
        <span className="text-[11px] font-mono tabular-nums text-slate-500">
          {esDoble
            ? vinculacionDoble === 'cajon_vinculado'
              ? 'Doble Cajón'
              : 'Doble I'
            : 'Simple'}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-56 select-none"
        role="img"
        aria-label={`Diagrama técnico de la sección PGC ${perfil.nombre}`}
      >
        {/* Grilla de fondo sutil */}
        <defs>
          <pattern id="pgcGrid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#f1f5f9" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={svgW} height={svgH} fill="url(#pgcGrid)" rx="4" />

        {/* Eje neutro horizontal X-X */}
        <line
          x1={22}
          y1={cy}
          x2={svgW - 22}
          y2={cy}
          stroke="#ef4444"
          strokeWidth={1}
          strokeDasharray="5 3"
        />
        <text x={24} y={cy - 4} className="fill-red-600 text-[10px] font-mono">
          E.N. x-x
        </text>

        {/* Eje baricéntrico vertical Y-Y */}
        <line
          x1={xgPx}
          y1={16}
          x2={xgPx}
          y2={svgH - 16}
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <text x={xgPx + 4} y={24} className="fill-slate-500 text-[9px] font-mono">
          {esDoble ? 'y-y' : `xg=${xg_cm}cm`}
        </text>

        {renderProfiles()}
        {renderQOverlay()}

        {/* Cota Altura Alma A */}
        <g>
          <line x1={xStart - 16} y1={yTopPx} x2={xStart - 16} y2={yBotPx} stroke="#475569" strokeWidth={1} />
          <line x1={xStart - 20} y1={yTopPx} x2={xStart - 12} y2={yTopPx} stroke="#475569" strokeWidth={1} />
          <line x1={xStart - 20} y1={yBotPx} x2={xStart - 12} y2={yBotPx} stroke="#475569" strokeWidth={1} />
          <text
            x={xStart - 22}
            y={cy + 3}
            textAnchor="end"
            className="fill-slate-700 text-[10px] font-mono tabular-nums"
          >
            A={A}
          </text>
        </g>

        {/* Cota Ancho Ala B */}
        <g>
          <line x1={xStart} y1={yBotPx + 14} x2={esDoble ? toSvgX(B, 0) : xEnd} y2={yBotPx + 14} stroke="#475569" strokeWidth={1} />
          <line x1={xStart} y1={yBotPx + 10} x2={xStart} y2={yBotPx + 18} stroke="#475569" strokeWidth={1} />
          <line
            x1={esDoble ? toSvgX(B, 0) : xEnd}
            y1={yBotPx + 10}
            x2={esDoble ? toSvgX(B, 0) : xEnd}
            y2={yBotPx + 18}
            stroke="#475569"
            strokeWidth={1}
          />
          <text
            x={(xStart + (esDoble ? toSvgX(B, 0) : xEnd)) / 2}
            y={yBotPx + 26}
            textAnchor="middle"
            className="fill-slate-700 text-[10px] font-mono tabular-nums"
          >
            B={B} mm · C={C} mm · e={e.toFixed(2)}
          </text>
        </g>
      </svg>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-mono tabular-nums">
        <span>R={perfil.R_mm} mm</span>
        <span>Wx,eff={efectivas.Wx_eff_cm3.toFixed(2)} cm³ ({(efectivas.relacionEfectiva_Wx * 100).toFixed(0)}%)</span>
      </div>
    </div>
  );
};
