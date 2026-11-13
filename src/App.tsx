import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, FileDown, RotateCcw } from 'lucide-react';
import { descargarMemoriaPdf } from './calc/exportarMemoriaPdf';
import type { DatosEntrada } from './calc/types';
import { ejecutarVerificacionCompleta } from './calc/verificarPerfil';
import { DetalleVerificacionPerfil } from './components/DetalleVerificacionPerfil';
import { EstadoTexto } from './components/EstadoTexto';
import { FormularioCargas } from './components/FormularioCargas';
import { SeccionPGCSvg } from './components/SeccionPGCSvg';
import { VistaCatalogo } from './components/VistaCatalogo';
import { VistaMetodologia } from './components/VistaMetodologia';

const ENTRADA_INICIAL: DatosEntrada = {
  ciudadUbicacion: 'cordoba',
  tipoCubierta: 'chapa_inclinada',
  pesoCubierta_kg_m2: 35,
  tipoEntrepiso: 'ninguno',
  pesoEntrepiso_kg_m2: 0,
  tipoSobrecarga: 'cubierta_inclinada',
  sobrecarga_kg_m2: 96,
  nieve_kg_m2: 30,
  zonaViento: 'zona_2',
  velocidadViento_m_s: 45,
  exposicionViento: 'B',
  cpPresion: 0.4,
  cpSuccion: 0.7,
  luz_m: 3.5,
  areaInfluencia_m: 0.4,
  cantidadPerfiles: 1,
  vinculacionDoble: 'espalda_vinculado',
  incluirPesoPropio: true,
  esCorreaInclinada: false,
  margenCalculo: 1.0,
  cargaManual_kg_m2: 0,
  modoCargaManual: 'sumar',
  fy_MPa: 250,
  coefSeguridadFlexion: 1.6,
  coefFlechaAdmisible: 350,
  longitudNoArriostrada_m: 0,
  longitudApoyo_mm: 50,
};

type VistaActiva = 'calculadora' | 'como_se_calculo' | 'catalogo';
type FiltroTabla = 'top10' | 'todos';
type OrdenTabla = 'peso' | 'seccion';

export default function App() {
  const [vista, setVista] = useState<VistaActiva>('calculadora');
  const [entrada, setEntrada] = useState<DatosEntrada>(ENTRADA_INICIAL);
  const [filtroTabla, setFiltroTabla] = useState<FiltroTabla>('top10');
  const [ordenTabla, setOrdenTabla] = useState<OrdenTabla>('peso');
  const [perfilSeleccionadoNombre, setPerfilSeleccionadoNombre] = useState<string | null>(null);
  const [mostrarMetodologia, setMostrarMetodologia] = useState(false);

  const resultadoGlobal = useMemo(() => ejecutarVerificacionCompleta(entrada), [entrada]);

  const {
    cargas,
    todosLosPerfiles,
    top10QueVerifican,
    cantidadVerifican,
    cantidadNoVerifican,
    cantidadPendientes,
    geometriasCatalogo,
  } = resultadoGlobal;

  const filasMostradas = useMemo(() => {
    const base = filtroTabla === 'top10' ? [...top10QueVerifican] : [...todosLosPerfiles];
    if (ordenTabla === 'seccion') {
      return base.sort((a, b) => {
        if (a.perfil.A_mm !== b.perfil.A_mm) return a.perfil.A_mm - b.perfil.A_mm;
        if (a.perfil.e_mm !== b.perfil.e_mm) return a.perfil.e_mm - b.perfil.e_mm;
        return a.pesoTotalViga_kg_m - b.pesoTotalViga_kg_m;
      });
    }
    return base.sort((a, b) => {
      if (a.pesoTotalViga_kg_m !== b.pesoTotalViga_kg_m) {
        return a.pesoTotalViga_kg_m - b.pesoTotalViga_kg_m;
      }
      return a.perfil.A_mm - b.perfil.A_mm;
    });
  }, [filtroTabla, ordenTabla, top10QueVerifican, todosLosPerfiles]);

  const perfilOptimo = top10QueVerifican[0] ?? null;

  const perfilMenorPesoConRigidizador = useMemo(() => {
    const candidato = todosLosPerfiles.find((r) => r.verificaConRigidizadorApoyo) ?? null;
    if (!candidato) return null;
    if (perfilOptimo && candidato.pesoTotalViga_kg_m >= perfilOptimo.pesoTotalViga_kg_m) {
      return null;
    }
    return candidato;
  }, [todosLosPerfiles, perfilOptimo]);

  const tresNoVerificanCercanos = useMemo(() => {
    return [...todosLosPerfiles]
      .filter((r) => r.estadoGeneral === 'NO VERIFICA')
      .sort((a, b) => a.ratioMaximoDC - b.ratioMaximoDC)
      .slice(0, 3)
      .sort((a, b) => {
        if (a.pesoTotalViga_kg_m !== b.pesoTotalViga_kg_m) {
          return a.pesoTotalViga_kg_m - b.pesoTotalViga_kg_m;
        }
        return a.perfil.A_mm - b.perfil.A_mm;
      });
  }, [todosLosPerfiles]);

  const obtenerLimitante = (r: (typeof todosLosPerfiles)[number]) => {
    const candidatos = [
      { nombre: 'Flexión', valor: r.flexion.ratioDC_efectivo },
      { nombre: 'Deformación', valor: r.deformacion.ratioDC },
      { nombre: 'Corte', valor: r.corte.ratioDC },
    ].sort((a, b) => b.valor - a.valor);
    if (candidatos[0].nombre === 'Corte') {
      const ratioApoyo = r.corte.Padm_apoyo_kg
        ? r.corte.Vmax_por_perfil_kg / r.corte.Padm_apoyo_kg
        : 0;
      const ratioNorma = r.corte.Vadm_norma_kg
        ? r.corte.Vmax_por_perfil_kg / r.corte.Vadm_norma_kg
        : 0;
      const ratioBasal = r.corte.tau_admisible_basal_kg_cm2
        ? r.corte.tau_trabajo_kg_cm2 / r.corte.tau_admisible_basal_kg_cm2
        : 0;
      if (ratioApoyo >= ratioNorma && ratioApoyo >= ratioBasal) {
        return 'Abolladura en apoyo';
      }
      if (ratioNorma >= ratioBasal) {
        return 'Pandeo alma (corte)';
      }
      return 'Corte (τ)';
    }
    return candidatos[0].nombre;
  };

  const perfilDetalle = useMemo(() => {
    if (perfilSeleccionadoNombre) {
      const encontrado = todosLosPerfiles.find(
        (r) => r.perfil.nombre === perfilSeleccionadoNombre
      );
      if (encontrado) return encontrado;
    }
    return perfilOptimo ?? todosLosPerfiles[0];
  }, [perfilSeleccionadoNombre, todosLosPerfiles, perfilOptimo]);

  const abrirCalculoPerfil = (nombrePerfil: string) => {
    setPerfilSeleccionadoNombre(nombrePerfil);
    setVista('como_se_calculo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 1 fila, 3 zonas */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setVista('calculadora');
            }}
            className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            PGC Estructural
          </a>

          <nav
            aria-label="Navegación principal"
            className="flex items-center gap-6 text-sm font-medium overflow-x-auto"
          >
            <button
              type="button"
              onClick={() => setVista('calculadora')}
              className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                vista === 'calculadora'
                  ? 'border-blue-700 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Calculadora
            </button>
            <button
              type="button"
              onClick={() => setVista('como_se_calculo')}
              className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                vista === 'como_se_calculo'
                  ? 'border-blue-700 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Cómo se calculó
            </button>
            <button
              type="button"
              onClick={() => setVista('catalogo')}
              className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                vista === 'catalogo'
                  ? 'border-blue-700 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Catálogo PGC
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() =>
                descargarMemoriaPdf(entrada, cargas, perfilDetalle, top10QueVerifican)
              }
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Imprimir Memoria (PDF)</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6">
        {/* PANTALLA 1: CALCULADORA SIMPLE */}
        {vista === 'calculadora' && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Panel izquierdo simple de carga de datos */}
            <div className="w-full lg:w-[360px] shrink-0 no-print space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h1 className="text-base font-bold text-slate-900">
                    Cálculo de Vigas PGC
                  </h1>
                  <p className="text-xs text-slate-500">
                    Ingresá las medidas y cargas de la viga
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEntrada(ENTRADA_INICIAL);
                    setPerfilSeleccionadoNombre(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reiniciar</span>
                </button>
              </div>
              <FormularioCargas entrada={entrada} cargas={cargas} onChange={setEntrada} />
            </div>

            {/* Panel derecho: devolución clara del perfil recomendado + Top 10 */}
            <div className="flex-1 min-w-0 space-y-5 w-full">
              {/* Resultado Principal: Perfil Recomendado */}
              <section className="bg-white border border-slate-200 rounded-lg p-5">
                {perfilOptimo ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-7 space-y-4">
                      <div>
                        <div className="text-xs font-medium text-slate-500">
                          Perfil recomendado de menor peso · {entrada.luz_m} m de luz ·{' '}
                          {entrada.cantidadPerfiles === 2 ? 'Doble (2 × PGC)' : 'Simple (1 × PGC)'}
                        </div>
                        <div className="mt-1 flex flex-wrap items-baseline gap-3">
                          <h2 className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
                            PGC {perfilOptimo.perfil.nombre.replace('(*)', '')}
                          </h2>
                          <EstadoTexto estado="VERIFICA" />
                        </div>
                        <p className="mt-1 text-sm text-slate-600 font-mono tabular-nums">
                          {perfilOptimo.perfil.A_mm} × {perfilOptimo.perfil.B_mm} ×{' '}
                          {perfilOptimo.perfil.C_mm} × {perfilOptimo.perfil.e_mm.toFixed(2)} mm ·{' '}
                          <strong>{perfilOptimo.pesoTotalViga_kg_m.toFixed(2)} kg/m</strong>
                        </p>
                      </div>

                      {/* 4 métricas simples de aprovechamiento */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                        <div>
                          <div className="text-xs text-slate-500">Relación D/C máx.</div>
                          <div className="text-base font-bold font-mono tabular-nums text-blue-700">
                            {(perfilOptimo.ratioMaximoDC * 100).toFixed(1)}%
                          </div>
                          <div className="text-[11px] text-slate-500">
                            límite: {obtenerLimitante(perfilOptimo)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Flexión</div>
                          <div className="text-base font-bold font-mono tabular-nums text-slate-900">
                            {(perfilOptimo.flexion.ratioDC_efectivo * 100).toFixed(1)}%
                          </div>
                          <div className="text-[11px] text-slate-500">de capacidad</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Deformación</div>
                          <div className="text-base font-bold font-mono tabular-nums text-slate-900">
                            {perfilOptimo.deformacion.flechaCalculada_efectiva_mm.toFixed(1)} mm
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-slate-500">
                            adm. {perfilOptimo.deformacion.flechaAdmisible_mm.toFixed(1)} mm
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Corte</div>
                          <div className="text-base font-bold font-mono tabular-nums text-slate-900">
                            {(perfilOptimo.corte.ratioDC * 100).toFixed(1)}%
                          </div>
                          <div className="text-[11px] text-slate-500">de capacidad</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => abrirCalculoPerfil(perfilOptimo.perfil.nombre)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors"
                        >
                          <span>Ver cómo se calculó este perfil</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <span className="text-xs text-slate-500">
                          {cantidadVerifican} perfiles cumplen de {todosLosPerfiles.length}
                        </span>
                      </div>

                      {perfilMenorPesoConRigidizador && (
                        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs text-slate-700">
                          <span className="font-mono font-bold text-slate-900">
                            PGC {perfilMenorPesoConRigidizador.perfil.nombre.replace('(*)', '')}
                          </span>
                          <span className="font-mono tabular-nums text-slate-600">
                            ({perfilMenorPesoConRigidizador.pesoTotalViga_kg_m.toFixed(2)} kg/m · D/C{' '}
                            {((perfilMenorPesoConRigidizador.ratioDC_conRigidizador ?? 0) * 100).toFixed(1)}%)
                          </span>
                          <span className="inline-block rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                            con rigidizador de apoyo
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-5">
                      <SeccionPGCSvg
                        geometria={perfilOptimo.geometria}
                        cantidadPerfiles={entrada.cantidadPerfiles}
                        vinculacionDoble={entrada.vinculacionDoble}
                        mostrarDescomposicionQ={false}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-4 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          {cantidadPendientes > 0 && cantidadNoVerifican === 0
                            ? 'Verificación pendiente de datos'
                            : 'Ningún perfil simple o actual cumple todas las verificaciones'}
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                          {cantidadPendientes > 0 && cantidadNoVerifican === 0
                            ? 'Falta definir la vinculación del perfil doble o la longitud de apoyo en Ajustes avanzados.'
                            : 'Probá seleccionar perfil doble (2 perfiles) o reducir la luz / separación.'}
                        </p>
                      </div>
                      <EstadoTexto
                        estado={
                          cantidadPendientes > 0 && cantidadNoVerifican === 0
                            ? 'PENDIENTE'
                            : 'NO VERIFICA'
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => abrirCalculoPerfil(todosLosPerfiles[todosLosPerfiles.length - 1].perfil.nombre)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      <span>Inspeccionar motivo en Cómo se calculó</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>

                    {perfilMenorPesoConRigidizador && (
                      <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs text-slate-700">
                        <span className="font-mono font-bold text-slate-900">
                          PGC {perfilMenorPesoConRigidizador.perfil.nombre.replace('(*)', '')}
                        </span>
                        <span className="font-mono tabular-nums text-slate-600">
                          ({perfilMenorPesoConRigidizador.pesoTotalViga_kg_m.toFixed(2)} kg/m · D/C{' '}
                          {((perfilMenorPesoConRigidizador.ratioDC_conRigidizador ?? 0) * 100).toFixed(1)}%)
                        </span>
                        <span className="inline-block rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                          con rigidizador de apoyo
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Lista sencilla de alternativas (Top 10 por peso o todos) */}
              <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Alternativas ({ordenTabla === 'peso' ? 'ordenadas por kg/m' : 'ordenadas por sección'})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Seleccioná un perfil para ver su desarrollo paso a paso en la pantalla de cálculo.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                      <button
                        type="button"
                        onClick={() => setOrdenTabla('peso')}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                          ordenTabla === 'peso'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Por kg/perfil
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrdenTabla('seccion')}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                          ordenTabla === 'seccion'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Por sección
                      </button>
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                      <button
                        type="button"
                        onClick={() => setFiltroTabla('top10')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                          filtroTabla === 'top10'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Top 10 que cumplen ({top10QueVerifican.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltroTabla('todos')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                          filtroTabla === 'todos'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Todos ({todosLosPerfiles.length})
                      </button>
                    </div>
                  </div>
                </div>

                {filasMostradas.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No hay perfiles que cumplan simultáneamente. Cambiá el filtro a{' '}
                    <button
                      type="button"
                      onClick={() => setFiltroTabla('todos')}
                      className="text-blue-700 font-semibold hover:underline"
                    >
                      Todos ({todosLosPerfiles.length})
                    </button>{' '}
                    para ver el detalle de cada sección.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <th className="py-2.5 px-3 text-left font-semibold">Perfil PGC</th>
                          <th className="py-2.5 px-2 text-right font-semibold">Peso (kg/m)</th>
                          <th className="py-2.5 px-2 text-right font-semibold">D/C máx.</th>
                          <th className="py-2.5 px-2 text-right font-semibold">Flexión</th>
                          <th className="py-2.5 px-2 text-right font-semibold">Deformación</th>
                          <th className="py-2.5 px-2 text-right font-semibold">Corte</th>
                          <th className="py-2.5 px-3 text-left font-semibold">Estado</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                        {filasMostradas.map((r) => {
                          const porcentajeDC = r.ratioMaximoDC * 100;
                          const porcentajeExcedido = Math.max(0, (r.ratioMaximoDC - 1) * 100);
                          return (
                            <tr
                              key={r.perfil.nombre}
                              onClick={() => abrirCalculoPerfil(r.perfil.nombre)}
                              className="cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                              <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                                <span className="font-semibold text-slate-900">
                                  {r.perfil.nombre.replace('(*)', '')}
                                </span>
                                <span className="ml-2 text-[11px] font-mono text-slate-500">
                                  {r.perfil.A_mm}×{r.perfil.B_mm}×{r.perfil.e_mm.toFixed(2)}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-right font-semibold text-slate-900">
                                {r.pesoTotalViga_kg_m.toFixed(2)}
                              </td>
                              <td
                                className={`py-2.5 px-2 text-right font-semibold ${
                                  r.estadoGeneral === 'VERIFICA'
                                    ? 'text-blue-700'
                                    : r.estadoGeneral === 'NO VERIFICA'
                                      ? 'text-rose-700'
                                      : 'text-amber-700'
                                }`}
                              >
                                {porcentajeDC.toFixed(1)}%
                                {r.estadoGeneral === 'NO VERIFICA' && porcentajeExcedido > 0 && (
                                  <span className="block text-[10px] font-normal text-rose-700">
                                    (+{porcentajeExcedido.toFixed(1)}% exc.)
                                  </span>
                                )}
                              </td>
                              <td
                                className={`py-2.5 px-2 text-right ${
                                  r.flexion.estado === 'VERIFICA'
                                    ? 'text-slate-700'
                                    : 'text-rose-700 font-semibold'
                                }`}
                              >
                                {(r.flexion.ratioDC_efectivo * 100).toFixed(1)}%
                              </td>
                              <td
                                className={`py-2.5 px-2 text-right ${
                                  r.deformacion.estado === 'VERIFICA'
                                    ? 'text-slate-700'
                                    : 'text-rose-700 font-semibold'
                                }`}
                              >
                                {r.deformacion.flechaCalculada_efectiva_mm.toFixed(1)} /{' '}
                                {r.deformacion.flechaAdmisible_mm.toFixed(1)} mm
                              </td>
                              <td
                                className={`py-2.5 px-2 text-right ${
                                  r.corte.estado === 'VERIFICA'
                                    ? 'text-slate-700'
                                    : 'text-rose-700 font-semibold'
                                }`}
                              >
                                {(r.corte.ratioDC * 100).toFixed(1)}%
                              </td>
                              <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                                <EstadoTexto estado={r.estadoGeneral} />
                                {r.verificaConRigidizadorApoyo && (
                                  <div className="mt-0.5 text-[11px] font-medium text-blue-700 whitespace-normal">
                                    Con rigidizador de alma verifica (D/C{' '}
                                    {((r.ratioDC_conRigidizador ?? 0) * 100).toFixed(1)}%)
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-sans">
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                                  Ver cálculo
                                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {tresNoVerificanCercanos.length > 0 && (
                  <div className="border-t border-slate-200 bg-slate-50/60">
                    <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          3 perfiles NO VERIFICA más cercanos al límite
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Alternativas inmediatas por debajo de la verificación y porcentaje excedido respecto al 100% admisible
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600">
                            <th className="py-2 px-3 text-left font-semibold">Perfil PGC</th>
                            <th className="py-2 px-2 text-right font-semibold">Peso (kg/m)</th>
                            <th className="py-2 px-2 text-right font-semibold">D/C máx.</th>
                            <th className="py-2 px-2 text-right font-semibold">Excedido</th>
                            <th className="py-2 px-2 text-left font-semibold">Verificación límite</th>
                            <th className="py-2 px-3 text-left font-semibold">Estado</th>
                            <th className="py-2 px-3 text-right font-semibold">Detalle</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 font-mono tabular-nums bg-white">
                          {tresNoVerificanCercanos.map((r) => {
                            const porcentajeDC = r.ratioMaximoDC * 100;
                            const porcentajeExcedido = Math.max(0, (r.ratioMaximoDC - 1) * 100);
                            return (
                              <tr
                                key={`no-ver-${r.perfil.nombre}`}
                                onClick={() => abrirCalculoPerfil(r.perfil.nombre)}
                                className="cursor-pointer hover:bg-rose-50/40 transition-colors"
                              >
                                <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                                  <span className="font-semibold text-slate-900">
                                    {r.perfil.nombre.replace('(*)', '')}
                                  </span>
                                  <span className="ml-2 text-[11px] font-mono text-slate-500">
                                    {r.perfil.A_mm}×{r.perfil.B_mm}×{r.perfil.e_mm.toFixed(2)}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 text-right font-semibold text-slate-900">
                                  {r.pesoTotalViga_kg_m.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-2 text-right font-semibold text-rose-700">
                                  {porcentajeDC.toFixed(1)}%
                                </td>
                                <td className="py-2.5 px-2 text-right font-bold text-rose-700">
                                  +{porcentajeExcedido.toFixed(1)}%
                                </td>
                                <td className="py-2.5 px-2 text-left font-sans text-slate-700">
                                  {obtenerLimitante(r)}
                                </td>
                                <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                                  <EstadoTexto estado={r.estadoGeneral} />
                                  {r.verificaConRigidizadorApoyo && (
                                    <div className="mt-0.5 text-[11px] font-medium text-blue-700 whitespace-normal">
                                      Con rigidizador de alma verifica (D/C{' '}
                                      {((r.ratioDC_conRigidizador ?? 0) * 100).toFixed(1)}%)
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-sans">
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                                    Ver cálculo
                                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* PANTALLA 2: CÓMO SE CALCULÓ (DESARROLLO COMPLETO EN OTRA PANTALLA) */}
        {vista === 'como_se_calculo' && (
          <div className="space-y-5">
            <div className="no-print bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setVista('calculadora')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Volver a la Calculadora</span>
                </button>
                <div>
                  <h1 className="text-sm font-bold text-slate-900">
                    Memoria de Cálculo y Desarrollo Paso a Paso
                  </h1>
                  <p className="text-xs text-slate-500">
                    Luz {entrada.luz_m} m · Área de influencia {entrada.areaInfluencia_m} m ·{' '}
                    {entrada.cantidadPerfiles === 2 ? 'Perfil doble' : 'Perfil simple'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label
                  htmlFor="selectorPerfilMemoria"
                  className="text-xs font-medium text-slate-600"
                >
                  Perfil analizado:
                </label>
                <select
                  id="selectorPerfilMemoria"
                  value={perfilDetalle.perfil.nombre}
                  onChange={(e) => setPerfilSeleccionadoNombre(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  {todosLosPerfiles.map((r) => (
                    <option key={r.perfil.nombre} value={r.perfil.nombre}>
                      PGC {r.perfil.nombre.replace('(*)', '')} ({r.pesoTotalViga_kg_m.toFixed(2)}{' '}
                      kg/m) — {r.estadoGeneral}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setMostrarMetodologia((v) => !v)}
                  className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
                >
                  {mostrarMetodologia ? 'Ocultar marco teórico' : 'Ver marco teórico'}
                </button>
              </div>
            </div>

            {mostrarMetodologia && <VistaMetodologia />}

            {/* Resumen de Cargas y Combinaciones ASD */}
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    00. Determinación de Cargas y Combinaciones Evaluadas
                  </h2>
                  <p className="text-xs text-slate-500">
                    D={cargas.D_kg_m2} · E={cargas.E_kg_m2} · L={cargas.L_kg_m2} · N=
                    {cargas.N_kg_m2} · Viento +{cargas.W_presion_kg_m2.toFixed(1)} / -
                    {cargas.W_succion_kg_m2.toFixed(1)} kg/m² · {cargas.notaDistribucion}
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-600">
                  Crítica: {cargas.combCriticaResistencia.nombre}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-left">
                      <th className="py-2 px-3 font-medium">Combinación</th>
                      <th className="py-2 px-3 font-medium">Fórmula</th>
                      <th className="py-2 px-2 font-medium text-right">q (kg/m²)</th>
                      <th className="py-2 px-2 font-medium text-right">w viga (kg/m)</th>
                      <th className="py-2 px-3 font-medium text-right">w/perfil (kg/cm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {cargas.combinaciones.map((c) => {
                      const esCritica = c.id === cargas.combCriticaResistencia.id;
                      return (
                        <tr
                          key={c.id}
                          className={esCritica ? 'bg-blue-50/50 font-semibold' : ''}
                        >
                          <td className="py-2 px-3 font-sans text-slate-800">
                            {c.nombre}
                            {esCritica && (
                              <span className="ml-2 text-[11px] font-mono text-blue-700">
                                (Gobernante)
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{c.formulaTexto}</td>
                          <td className="py-2 px-2 text-right">{c.q_superficial_kg_m2.toFixed(1)}</td>
                          <td className="py-2 px-2 text-right">{c.w_lineal_total_kg_m.toFixed(1)}</td>
                          <td className="py-2 px-3 text-right">
                            {c.w_por_perfil_kg_cm.toFixed(4)} ({c.sentido})
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Memoria paso a paso del perfil seleccionado */}
            <DetalleVerificacionPerfil resultado={perfilDetalle} entrada={entrada} />
          </div>
        )}

        {/* PANTALLA 3: CATÁLOGO Y GEOMETRÍA Q */}
        {vista === 'catalogo' && <VistaCatalogo geometrias={geometriasCatalogo} />}
      </main>
    </div>
  );
}
