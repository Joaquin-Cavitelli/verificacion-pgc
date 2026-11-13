import React, { useState } from 'react';
import type { GeometriaReconstruida } from '../calc/types';
import { SeccionPGCSvg } from './SeccionPGCSvg';

interface VistaCatalogoProps {
  geometrias: GeometriaReconstruida[];
}

export const VistaCatalogo: React.FC<VistaCatalogoProps> = ({ geometrias }) => {
  const [seleccionado, setSeleccionado] = useState<GeometriaReconstruida>(geometrias[0]);
  const [filtroExactitud, setFiltroExactitud] = useState<'todos' | 'EXACTO' | 'APROXIMADO'>(
    'todos'
  );
  const [ordenCatalogo, setOrdenCatalogo] = useState<'seccion' | 'peso'>('seccion');

  const filtrados = geometrias
    .filter((g) => (filtroExactitud === 'todos' ? true : g.exactitud === filtroExactitud))
    .sort((a, b) => {
      if (ordenCatalogo === 'peso') {
        if (a.perfil.peso_kg_m !== b.perfil.peso_kg_m) {
          return a.perfil.peso_kg_m - b.perfil.peso_kg_m;
        }
        return a.perfil.A_mm - b.perfil.A_mm;
      }
      if (a.perfil.A_mm !== b.perfil.A_mm) return a.perfil.A_mm - b.perfil.A_mm;
      return a.perfil.e_mm - b.perfil.e_mm;
    });

  const exactos = geometrias.filter((g) => g.exactitud === 'EXACTO').length;
  const aproximados = geometrias.length - exactos;

  return (
    <div className="space-y-6">
      {/* Resumen y filtro */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Base de datos oficial Barbieri PGC y cálculo geométrico de Q
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {geometrias.length} perfiles del catálogo PDF · {exactos} reconstrucciones exactas
            (error ≤ 1.5%) · {aproximados} con diferencias respecto a valores impresos del catálogo
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            <button
              type="button"
              onClick={() => setOrdenCatalogo('seccion')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                ordenCatalogo === 'seccion'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por sección
            </button>
            <button
              type="button"
              onClick={() => setOrdenCatalogo('peso')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                ordenCatalogo === 'peso'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por kg/perfil
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(['todos', 'EXACTO', 'APROXIMADO'] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setFiltroExactitud(op)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  filtroExactitud === op
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {op === 'todos'
                  ? `Todos (${geometrias.length})`
                  : op === 'EXACTO'
                    ? `Exactos (${exactos})`
                    : `Aproximados (${aproximados})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inspector seleccionado */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-4">
          <SeccionPGCSvg
            geometria={seleccionado}
            cantidadPerfiles={1}
            vinculacionDoble="espalda_vinculado"
          />
        </div>
        <div className="lg:col-span-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                PGC {seleccionado.perfil.nombre}
              </h3>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                A={seleccionado.perfil.A_mm} mm · B={seleccionado.perfil.B_mm} mm · C=
                {seleccionado.perfil.C_mm} mm · e={seleccionado.perfil.e_mm.toFixed(2)} mm · R=
                {seleccionado.perfil.R_mm.toFixed(2)} mm
              </p>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-xs text-slate-500">Momento estático Q</div>
              <div className="text-lg font-bold text-blue-700">
                {seleccionado.Q_max_cm3.toFixed(3)} cm³
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {seleccionado.documentacionQ}
          </p>

          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="w-full text-xs font-mono tabular-nums">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-left font-sans">
                  <th className="py-1.5 px-3 font-medium">Parte de la sección (y ≥ 0)</th>
                  <th className="py-1.5 px-2 font-medium text-right">Ai (cm²)</th>
                  <th className="py-1.5 px-2 font-medium text-right">yi (cm)</th>
                  <th className="py-1.5 px-3 font-medium text-right">Qi = Ai×yi (cm³)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {seleccionado.subAreasSuperiores.map((sub) => (
                  <tr key={sub.id}>
                    <td className="py-1.5 px-3 font-sans text-slate-800">{sub.nombre}</td>
                    <td className="py-1.5 px-2 text-right">{sub.area_cm2.toFixed(3)}</td>
                    <td className="py-1.5 px-2 text-right">{sub.yi_cm.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-right font-semibold">
                      {sub.Qi_cm3.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-600">{seleccionado.notaValidacion}</p>
        </div>
      </div>

      {/* Tabla completa del catálogo */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono tabular-nums">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-sans">
                <th className="py-2.5 px-3 text-left font-semibold">Perfil PGC</th>
                <th className="py-2.5 px-2 text-right font-semibold">A×B×C×e (mm)</th>
                <th className="py-2.5 px-2 text-right font-semibold">R (mm)</th>
                <th className="py-2.5 px-2 text-right font-semibold">Peso (kg/m)</th>
                <th className="py-2.5 px-2 text-right font-semibold">Área cat/calc</th>
                <th className="py-2.5 px-2 text-right font-semibold">Xg cat/calc</th>
                <th className="py-2.5 px-2 text-right font-semibold">Jx cat/calc</th>
                <th className="py-2.5 px-2 text-right font-semibold">Wx / Wx,eff</th>
                <th className="py-2.5 px-2 text-right font-semibold text-blue-700">Q (cm³)</th>
                <th className="py-2.5 px-3 text-left font-semibold">Validación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((g) => {
                const p = g.perfil;
                const isSel = seleccionado.perfil.nombre === p.nombre;
                return (
                  <tr
                    key={p.nombre}
                    onClick={() => setSeleccionado(g)}
                    className={`cursor-pointer transition-colors ${
                      isSel ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2 px-3 font-sans font-semibold text-slate-900 whitespace-nowrap">
                      {p.nombre}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600 whitespace-nowrap">
                      {p.A_mm}×{p.B_mm}×{p.C_mm}×{p.e_mm.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600">{p.R_mm.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-900">
                      {p.peso_kg_m.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600 whitespace-nowrap">
                      {p.area_cm2.toFixed(2)} / {g.area_calc_cm2.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600 whitespace-nowrap">
                      {p.xg_cm.toFixed(2)} / {g.xg_calc_cm.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600 whitespace-nowrap">
                      {p.Jx_cm4.toFixed(1)} / {g.Jx_calc_cm4.toFixed(1)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-700 whitespace-nowrap">
                      {p.Wx_cm3.toFixed(2)} / {g.efectivas.Wx_eff_cm3.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-blue-700">
                      {g.Q_max_cm3.toFixed(2)}
                    </td>
                    <td
                      className={`py-2 px-3 font-sans font-semibold whitespace-nowrap ${
                        g.exactitud === 'EXACTO' ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {g.exactitud} ({g.errorJx_pct >= 0 ? '+' : ''}
                      {g.errorJx_pct.toFixed(1)}% Jx)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
