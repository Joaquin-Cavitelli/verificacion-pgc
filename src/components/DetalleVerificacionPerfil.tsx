import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { DatosEntrada, PasoCalculo, ResultadoVerificacionPerfil } from '../calc/types';
import { EstadoTexto } from './EstadoTexto';
import { SeccionPGCSvg } from './SeccionPGCSvg';

interface DetalleVerificacionPerfilProps {
  resultado: ResultadoVerificacionPerfil;
  entrada: DatosEntrada;
}

interface AccordionVerificacionProps {
  titulo: string;
  subtitulo: string;
  estado: ResultadoVerificacionPerfil['estadoGeneral'];
  ratioDC: number;
  observacion: string;
  pasos: PasoCalculo[];
  defaultOpen?: boolean;
}

const AccordionVerificacion: React.FC<AccordionVerificacionProps> = ({
  titulo,
  subtitulo,
  estado,
  ratioDC,
  observacion,
  pasos,
  defaultOpen = false,
}) => {
  const [abierto, setAbierto] = useState(defaultOpen);

  return (
    <div className="border-t border-slate-200">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-3 px-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {abierto ? (
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">{titulo}</div>
            <div className="text-xs text-slate-500 truncate">{subtitulo}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-xs font-mono tabular-nums text-slate-600">
            Uso: {(ratioDC * 100).toFixed(1)}%
          </span>
          <EstadoTexto estado={estado} />
        </div>
      </button>

      {abierto && (
        <div className="px-4 pb-4 pt-1 space-y-3 bg-slate-50/60">
          <p className="text-xs text-slate-700 leading-relaxed">{observacion}</p>
          <div className="overflow-x-auto border border-slate-200 rounded-md bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                  <th className="py-2 px-3 font-medium">Paso</th>
                  <th className="py-2 px-3 font-medium">Fórmula</th>
                  <th className="py-2 px-3 font-medium">Sustitución de valores</th>
                  <th className="py-2 px-3 font-medium text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pasos.map((p, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-3 font-medium text-slate-800 align-top">
                      {p.etiqueta}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600 align-top">
                      {p.formula}
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-600 align-top">
                      {p.valores}
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums font-semibold text-slate-900 text-right align-top whitespace-nowrap">
                      {p.resultado}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export const DetalleVerificacionPerfil: React.FC<DetalleVerificacionPerfilProps> = ({
  resultado,
  entrada,
}) => {
  const [mostrarGeometria, setMostrarGeometria] = useState(true);
  const { perfil, geometria, flexion, deformacion, corte } = resultado;

  return (
    <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Encabezado de memoria de cálculo */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
            <span>Memoria de cálculo individual</span>
            <span aria-hidden="true">·</span>
            <span>
              {entrada.cantidadPerfiles === 2 ? '2 × PGC (doble)' : '1 × PGC (simple)'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Peso total: {resultado.pesoTotalViga_kg_m.toFixed(2)} kg/m</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-0.5">
            PGC {perfil.nombre.replace('(*)', '')} — {perfil.A_mm} × {perfil.B_mm} ×{' '}
            {perfil.C_mm} × {perfil.e_mm.toFixed(2)} mm
          </h3>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-[11px] text-slate-500">Relación demanda/capacidad máx.</div>
            <div className="text-sm font-mono tabular-nums font-semibold text-slate-900">
              {(resultado.ratioMaximoDC * 100).toFixed(1)}%
            </div>
          </div>
          <div className="pl-4 border-l border-slate-200">
            <EstadoTexto estado={resultado.estadoGeneral} />
          </div>
        </div>
      </div>

      {/* Motivos de rechazo o pendiente si aplica */}
      {resultado.motivosNoVerificaOPendiente.length > 0 && (
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 space-y-2">
          <div className="space-y-1">
            {resultado.motivosNoVerificaOPendiente.map((m, i) => (
              <p key={i} className="text-xs text-slate-700 font-medium">
                • {m}
              </p>
            ))}
          </div>
          {resultado.verificaConRigidizadorApoyo && (
            <div className="rounded-md border border-blue-200 bg-blue-50/70 px-3.5 py-2.5 text-xs text-slate-800 leading-relaxed">
              <strong className="text-blue-900">
                Aclaración: Con rigidizador de alma en apoyo SÍ VERIFICA.
              </strong>{' '}
              El perfil cumple flexión ({(flexion.ratioDC_efectivo * 100).toFixed(1)}%), deformación (
              {(deformacion.ratioDC * 100).toFixed(1)}%) y corte del alma; únicamente excede la
              abolladura localizada en el apoyo (Vmáx = {corte.Vmax_por_perfil_kg.toFixed(0)} kg{' '}
              &gt; Padm = {(corte.Padm_apoyo_kg ?? 0).toFixed(0)} kg). Colocando un recorte vertical
              de perfil PGC/PGU atornillado al alma sobre el apoyo, la viga verifica con una
              relación demanda/capacidad máx. de{' '}
              <strong className="font-mono tabular-nums text-blue-900">
                {((resultado.ratioDC_conRigidizador ?? 0) * 100).toFixed(1)}%
              </strong>
              .
            </div>
          )}
        </div>
      )}

      {/* Bloque 1: Reconstrucción Geométrica, Q y Propiedades Brutas vs Efectivas */}
      <div>
        <button
          type="button"
          onClick={() => setMostrarGeometria((v) => !v)}
          className="w-full flex items-center justify-between gap-4 py-3 px-4 text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            {mostrarGeometria ? (
              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
            )}
            <div>
              <div className="text-sm font-semibold text-slate-900">
                01. Reconstrucción Geométrica, Momento Estático Q y Sección Efectiva
              </div>
              <div className="text-xs text-slate-500">
                Q = {geometria.Q_max_cm3.toFixed(2)} cm³ · Validación catálogo:{' '}
                {geometria.exactitud} · Wx,eff = {geometria.efectivas.Wx_eff_cm3.toFixed(2)} cm³
                (bruto {perfil.Wx_cm3.toFixed(2)} cm³)
              </div>
            </div>
          </div>
          <span
            className={`text-xs font-mono font-semibold ${
              geometria.exactitud === 'EXACTO' ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {geometria.exactitud}
          </span>
        </button>

        {mostrarGeometria && (
          <div className="px-4 pb-4 pt-1 bg-slate-50/60 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-5">
                <SeccionPGCSvg
                  geometria={geometria}
                  cantidadPerfiles={entrada.cantidadPerfiles}
                  vinculacionDoble={entrada.vinculacionDoble}
                />
              </div>

              <div className="lg:col-span-7 space-y-3">
                {/* Tabla de sub-áreas para Q */}
                <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">
                      Cálculo de Q = Σ (Ai × yi) por encima del eje neutro x-x
                    </span>
                    <span className="text-xs font-mono tabular-nums font-bold text-blue-700">
                      Q = {geometria.Q_max_cm3.toFixed(3)} cm³
                    </span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-left">
                        <th className="py-1.5 px-3 font-medium">Sub-figura (sin solape)</th>
                        <th className="py-1.5 px-2 font-medium text-right">Ai (cm²)</th>
                        <th className="py-1.5 px-2 font-medium text-right">yi (cm)</th>
                        <th className="py-1.5 px-3 font-medium text-right">Qi (cm³)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                      {geometria.subAreasSuperiores.map((sub) => (
                        <tr key={sub.id}>
                          <td className="py-1.5 px-3 font-sans text-slate-800">
                            <div>{sub.nombre}</div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {sub.formulaDesc}
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-right text-slate-700">
                            {sub.area_cm2.toFixed(3)}
                          </td>
                          <td className="py-1.5 px-2 text-right text-slate-700">
                            {sub.yi_cm.toFixed(3)}
                          </td>
                          <td className="py-1.5 px-3 text-right font-semibold text-slate-900">
                            {sub.Qi_cm3.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50 font-mono tabular-nums font-semibold">
                        <td className="py-1.5 px-3 font-sans text-slate-800">
                          Total mitad superior (Q en E.N.)
                        </td>
                        <td className="py-1.5 px-2 text-right text-slate-700">
                          {(geometria.area_calc_cm2 / 2).toFixed(3)}
                        </td>
                        <td className="py-1.5 px-2 text-right text-slate-400">—</td>
                        <td className="py-1.5 px-3 text-right text-blue-700">
                          {geometria.Q_max_cm3.toFixed(3)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Validación contra catálogo Barbieri + Propiedades efectivas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white border border-slate-200 rounded-md p-3 space-y-1.5">
                    <div className="font-semibold text-slate-800">
                      Validación vs Catálogo Barbieri
                    </div>
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="text-slate-500">Área (calc / cat):</span>
                      <span>
                        {geometria.area_calc_cm2.toFixed(2)} / {perfil.area_cm2.toFixed(2)} cm² (
                        {geometria.errorArea_pct >= 0 ? '+' : ''}
                        {geometria.errorArea_pct.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="text-slate-500">Xg (calc / cat):</span>
                      <span>
                        {geometria.xg_calc_cm.toFixed(2)} / {perfil.xg_cm.toFixed(2)} cm (
                        {geometria.errorXg_pct >= 0 ? '+' : ''}
                        {geometria.errorXg_pct.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="text-slate-500">Jx (calc / cat):</span>
                      <span>
                        {geometria.Jx_calc_cm4.toFixed(2)} / {perfil.Jx_cm4.toFixed(2)} cm⁴ (
                        {geometria.errorJx_pct >= 0 ? '+' : ''}
                        {geometria.errorJx_pct.toFixed(2)}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1 leading-snug">
                      {geometria.notaValidacion}
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-md p-3 space-y-1.5">
                    <div className="font-semibold text-slate-800">
                      Propiedades Brutas vs Efectivas (AISI S100)
                    </div>
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="text-slate-500">Wx bruto / Wx eff:</span>
                      <span>
                        {perfil.Wx_cm3.toFixed(2)} /{' '}
                        <strong className="text-slate-900">
                          {geometria.efectivas.Wx_eff_cm3.toFixed(2)} cm³
                        </strong>
                      </span>
                    </div>
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="text-slate-500">Jx bruto / Jx eff(Fy):</span>
                      <span>
                        {perfil.Jx_cm4.toFixed(2)} / {geometria.efectivas.Jx_eff_cm4.toFixed(2)} cm⁴
                      </span>
                    </div>
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="text-slate-500">Factor reducción ala ρ:</span>
                      <span>
                        {geometria.efectivas.rho_ala.toFixed(3)} (k ={' '}
                        {geometria.efectivas.k_ala.toFixed(2)})
                      </span>
                    </div>
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="text-slate-500">Alma en flexión:</span>
                      <span>
                        {geometria.efectivas.almaTotalmenteEfectiva
                          ? 'Totalmente efectiva'
                          : `Parcial (b1=${geometria.efectivas.b1_alma_mm.toFixed(1)}, b2=${geometria.efectivas.b2_alma_mm.toFixed(1)} mm)`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bloque 2: Verificación a Flexión */}
      <AccordionVerificacion
        titulo="02. Verificación a Flexión (Bruta, Efectiva AISI S100 y LTB)"
        subtitulo={`Mmáx = ${flexion.Mmax_por_perfil_kg_m.toFixed(1)} kg·m/perfil · Wx,req = ${flexion.Wx_requerido_cm3.toFixed(2)} cm³ · Wx,eff = ${flexion.Wx_efectivo_disponible_cm3.toFixed(2)} cm³`}
        estado={flexion.estado}
        ratioDC={flexion.ratioDC_efectivo}
        observacion={flexion.observacion}
        pasos={flexion.pasos}
        defaultOpen={true}
      />

      {/* Bloque 3: Verificación a Deformación */}
      <AccordionVerificacion
        titulo={`03. Verificación a Deformación (Flecha Admisible L/${entrada.coefFlechaAdmisible})`}
        subtitulo={`δcalc = ${deformacion.flechaCalculada_efectiva_mm.toFixed(2)} mm vs δadm = ${deformacion.flechaAdmisible_mm.toFixed(2)} mm · Ix,req = ${deformacion.Ix_requerido_cm4.toFixed(1)} cm⁴`}
        estado={deformacion.estado}
        ratioDC={deformacion.ratioDC}
        observacion={deformacion.observacion}
        pasos={deformacion.pasos}
        defaultOpen={true}
      />

      {/* Bloque 4: Verificación a Corte y Alma */}
      <AccordionVerificacion
        titulo="04. Verificación a Corte (Jourawski con Q, Pandeo del Alma y Apoyo)"
        subtitulo={`Vmáx = ${corte.Vmax_por_perfil_kg.toFixed(0)} kg · τ = ${corte.tau_trabajo_kg_cm2.toFixed(1)} kg/cm² · Vadm,alma = ${corte.Vadm_norma_kg.toFixed(0)} kg`}
        estado={corte.estado}
        ratioDC={corte.ratioDC}
        observacion={corte.observacion}
        pasos={corte.pasos}
        defaultOpen={true}
      />
    </section>
  );
};
