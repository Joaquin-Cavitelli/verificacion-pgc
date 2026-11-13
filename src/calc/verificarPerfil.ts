import perfilesData from './perfilesPGC.json';
import { calcularCargas } from './cargas';
import { verificarCorte } from './corte';
import { verificarDeformacion } from './deformacion';
import { verificarFlexion } from './flexion';
import { reconstruirGeometriaPerfil } from './geometriaPerfil';
import type {
  DatosEntrada,
  EstadoVerificacion,
  GeometriaReconstruida,
  PerfilPGC,
  ResultadoCargas,
  ResultadoVerificacionPerfil,
} from './types';

export const CATALOGO_PGC: PerfilPGC[] = perfilesData as PerfilPGC[];

export interface ResultadoGlobalCalculo {
  cargas: ResultadoCargas;
  todosLosPerfiles: ResultadoVerificacionPerfil[];
  top10QueVerifican: ResultadoVerificacionPerfil[];
  cantidadVerifican: number;
  cantidadNoVerifican: number;
  cantidadPendientes: number;
  geometriasCatalogo: GeometriaReconstruida[];
}

/**
 * Evalúa un perfil PGC individual frente a las acciones calculadas.
 */
export function evaluarPerfil(
  perfil: PerfilPGC,
  entrada: DatosEntrada,
  cargas: ResultadoCargas
): ResultadoVerificacionPerfil {
  const geometria = reconstruirGeometriaPerfil(perfil, entrada.fy_MPa);

  const pesoPropioTotalViga_kg_m = entrada.incluirPesoPropio
    ? perfil.peso_kg_m * entrada.cantidadPerfiles * entrada.margenCalculo
    : 0;
  const pesoPropioPorPerfil_kg_m = entrada.incluirPesoPropio
    ? perfil.peso_kg_m * entrada.margenCalculo
    : 0;

  // Cargas efectivas (sumando el peso propio real del perfil si corresponde, respetando el signo de combinación)
  const signoRes =
    cargas.combCriticaResistencia.sentido === 'ascendente' ? -1 : 1;
  // Si la combinación crítica es succión ascendente, el peso propio es favorable (0.6×) reduciendo el levantamiento
  const w_pp_res_total_kg_m =
    signoRes < 0 ? 0.6 * pesoPropioTotalViga_kg_m : pesoPropioTotalViga_kg_m;
  const w_pp_res_perfil_kg_m =
    signoRes < 0 ? 0.6 * pesoPropioPorPerfil_kg_m : pesoPropioPorPerfil_kg_m;

  const w_res_total_kg_m =
    cargas.combCriticaResistencia.w_lineal_total_kg_m + w_pp_res_total_kg_m;
  const w_res_por_perfil_kg_m =
    cargas.combCriticaResistencia.w_por_perfil_kg_m +
    (cargas.trabajoConjuntoJustificado ? w_pp_res_perfil_kg_m : pesoPropioTotalViga_kg_m);

  const w_res_total_kg_cm = w_res_total_kg_m / 100;
  const w_res_por_perfil_kg_cm = w_res_por_perfil_kg_m / 100;

  const w_serv_total_kg_m =
    cargas.combCriticaServicio.w_lineal_total_kg_m + pesoPropioTotalViga_kg_m;
  const w_serv_por_perfil_kg_m =
    cargas.combCriticaServicio.w_por_perfil_kg_m +
    (cargas.trabajoConjuntoJustificado ? pesoPropioPorPerfil_kg_m : pesoPropioTotalViga_kg_m);

  const w_serv_total_kg_cm = w_serv_total_kg_m / 100;
  const w_serv_por_perfil_kg_cm = w_serv_por_perfil_kg_m / 100;

  const flexion = verificarFlexion(
    geometria,
    entrada,
    w_res_por_perfil_kg_cm,
    w_res_total_kg_cm,
    cargas.trabajoConjuntoJustificado
  );

  const deformacion = verificarDeformacion(
    geometria,
    entrada,
    w_serv_total_kg_cm,
    cargas.trabajoConjuntoJustificado
  );

  const corte = verificarCorte(
    geometria,
    entrada,
    w_res_por_perfil_kg_cm,
    w_res_total_kg_cm,
    flexion.Mmax_por_perfil_kg_cm,
    flexion.M_adm_efectivo_kg_cm,
    cargas.trabajoConjuntoJustificado
  );

  const motivosNoVerificaOPendiente: string[] = [];
  if (flexion.estado !== 'VERIFICA') motivosNoVerificaOPendiente.push(`Flexión: ${flexion.observacion}`);
  if (deformacion.estado !== 'VERIFICA')
    motivosNoVerificaOPendiente.push(`Deformación: ${deformacion.observacion}`);
  if (corte.estado !== 'VERIFICA') motivosNoVerificaOPendiente.push(`Corte: ${corte.observacion}`);

  let estadoGeneral: EstadoVerificacion = 'VERIFICA';
  if (
    flexion.estado === 'NO VERIFICA' ||
    deformacion.estado === 'NO VERIFICA' ||
    corte.estado === 'NO VERIFICA'
  ) {
    estadoGeneral = 'NO VERIFICA';
  } else if (
    flexion.estado === 'PENDIENTE' ||
    deformacion.estado === 'PENDIENTE' ||
    corte.estado === 'PENDIENTE'
  ) {
    estadoGeneral = 'PENDIENTE';
  }

  const ratioMaximoDC = Math.max(
    flexion.ratioDC_efectivo,
    deformacion.ratioDC,
    corte.ratioDC
  );

  const verificaConRigidizadorApoyo =
    estadoGeneral === 'NO VERIFICA' &&
    flexion.estado === 'VERIFICA' &&
    deformacion.estado === 'VERIFICA' &&
    corte.cumpleTensionBasal &&
    corte.cumpleNormaAlma &&
    corte.cumpleApoyo === false;

  const ratioCorteSinApoyo = Math.max(
    corte.tau_admisible_basal_kg_cm2 > 0
      ? corte.tau_trabajo_kg_cm2 / corte.tau_admisible_basal_kg_cm2
      : 0,
    corte.Vadm_norma_kg > 0 ? corte.Vmax_por_perfil_kg / corte.Vadm_norma_kg : 0
  );

  const ratioDC_conRigidizador = verificaConRigidizadorApoyo
    ? Math.max(flexion.ratioDC_efectivo, deformacion.ratioDC, ratioCorteSinApoyo)
    : null;

  return {
    perfil,
    geometria,
    cargasEfectivasPerfil: {
      w_res_por_perfil_kg_cm,
      w_res_por_perfil_kg_m,
      w_serv_por_perfil_kg_cm,
      w_serv_por_perfil_kg_m,
      pesoPropioIncluido_kg_m: pesoPropioTotalViga_kg_m,
    },
    flexion,
    deformacion,
    corte,
    estadoGeneral,
    motivosNoVerificaOPendiente,
    ratioMaximoDC,
    verificaConRigidizadorApoyo,
    ratioDC_conRigidizador,
    pesoTotalViga_kg_m: perfil.peso_kg_m * entrada.cantidadPerfiles,
  };
}

/**
 * Recorre todos los perfiles del JSON, verifica flexión, deformación, corte y normas complementarias,
 * ordena de menor a mayor peso y selecciona los primeros 10 perfiles que cumplen.
 */
export function ejecutarVerificacionCompleta(
  entrada: DatosEntrada
): ResultadoGlobalCalculo {
  const cargas = calcularCargas(entrada);

  const evaluados = CATALOGO_PGC.map((perfil) =>
    evaluarPerfil(perfil, entrada, cargas)
  ).sort((a, b) => {
    if (a.pesoTotalViga_kg_m !== b.pesoTotalViga_kg_m) {
      return a.pesoTotalViga_kg_m - b.pesoTotalViga_kg_m;
    }
    return a.perfil.A_mm - b.perfil.A_mm;
  });

  const queVerifican = evaluados.filter((r) => r.estadoGeneral === 'VERIFICA');
  const top10QueVerifican = queVerifican.slice(0, 10);

  return {
    cargas,
    todosLosPerfiles: evaluados,
    top10QueVerifican,
    cantidadVerifican: queVerifican.length,
    cantidadNoVerifican: evaluados.filter((r) => r.estadoGeneral === 'NO VERIFICA').length,
    cantidadPendientes: evaluados.filter((r) => r.estadoGeneral === 'PENDIENTE').length,
    geometriasCatalogo: evaluados.map((r) => r.geometria),
  };
}
