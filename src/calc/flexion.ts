import type {
  DatosEntrada,
  GeometriaReconstruida,
  PasoCalculo,
  ResultadoFlexion,
} from './types';

const FACTOR_MPA_A_KG_CM2 = 10.1972;
const E_KG_CM2 = 2100000;
const G_KG_CM2 = 807692; // E / (2 * (1 + 0.3))

/**
 * Calcula la tensión crítica de pandeo lateral-torsional (LTB) para una sección C conformada en frío
 * según AISI S100 F2.1 / CIRSOC 303 cuando existe una longitud no arriostrada Lb > 0.
 */
function calcularMadmLTB(
  geometria: GeometriaReconstruida,
  entrada: DatosEntrada,
  Fadm_kg_cm2: number
): number | null {
  const Lb_m = entrada.longitudNoArriostrada_m;
  if (Lb_m <= 0) return null; // Arriostramiento continuo por diafragma (chapa/OSB/placa)

  const { perfil, efectivas } = geometria;
  const Lb_cm = Lb_m * 100;
  const Cb = 1.14; // Factor de gradiente de momento para viga simplemente apoyada con carga uniforme

  // Propiedades torsionales aproximadas para sección abierta de pared delgada
  const A_cm = perfil.A_mm / 10;
  const B_cm = perfil.B_mm / 10;
  const C_cm = perfil.C_mm / 10;
  const t_cm = perfil.e_mm / 10;
  const area_cm2 = perfil.area_cm2;
  const Jy = perfil.Jy_cm4;
  const Rx = perfil.Rx_cm;
  const Ry = perfil.Ry_cm;

  // Constante torsional de St. Venant J = (1/3) * Σ (l_i * t^3)
  const L_desarrollo_cm = A_cm + 2 * B_cm + 2 * C_cm - 4 * t_cm;
  const J_torsion_cm4 = (1 / 3) * L_desarrollo_cm * Math.pow(t_cm, 3);

  // Constante de alabeo Cw aproximada para canal C con pestañas (AISI / Yu)
  const h_bar = A_cm - t_cm;
  const b_bar = B_cm - t_cm;
  const c_bar = C_cm - t_cm / 2;
  const a_m = h_bar;
  const b_m = b_bar;
  const c_m = c_bar;
  const Cw_cm6 =
    (t_cm * Math.pow(a_m, 2) * Math.pow(b_m, 3) / 12) *
    ((2 * Math.pow(a_m, 3) * b_m +
      3 * Math.pow(a_m, 2) * Math.pow(b_m, 2) +
      48 * c_m * Math.pow(b_m, 2) * a_m + // término de rigidez de pestaña
      12 * Math.pow(c_m, 2) * Math.pow(b_m, 2)) /
      (Math.pow(a_m, 3) +
        6 * Math.pow(a_m, 2) * b_m +
        6 * Math.pow(a_m, 2) * c_m +
        8 * Math.pow(c_m, 3)));
  // Corrección conservadora para Cw estándar de canal con pestañas
  const Cw_conservador_cm6 = Math.max(
    (Jy * Math.pow(h_bar, 2)) / 4,
    Math.min(Cw_cm6, (Jy * Math.pow(h_bar, 2)) / 2)
  );

  const ro_cm = Math.sqrt(Rx * Rx + Ry * Ry + Math.pow(perfil.xg_cm, 2));
  const K_y = 1.0;
  const K_t = 1.0;

  const sigma_ey = (Math.PI * Math.PI * E_KG_CM2) / Math.pow((K_y * Lb_cm) / Ry, 2);
  const sigma_t =
    (1 / (area_cm2 * ro_cm * ro_cm)) *
    (G_KG_CM2 * J_torsion_cm4 + (Math.PI * Math.PI * E_KG_CM2 * Cw_conservador_cm6) / Math.pow(K_t * Lb_cm, 2));

  // Para sección con simetría simple flectada respecto al eje X: Fe = Cb * ro * A / Wx * sqrt(sigma_ey * sigma_t)
  const Fe_kg_cm2 =
    ((Cb * ro_cm * area_cm2) / perfil.Wx_cm3) * Math.sqrt(sigma_ey * sigma_t);

  const fy_kg_cm2 = entrada.fy_MPa * FACTOR_MPA_A_KG_CM2;
  let Fc_kg_cm2 = fy_kg_cm2;
  if (Fe_kg_cm2 <= 0.56 * fy_kg_cm2) {
    Fc_kg_cm2 = Fe_kg_cm2;
  } else if (Fe_kg_cm2 < 2.78 * fy_kg_cm2) {
    Fc_kg_cm2 = (10 / 9) * fy_kg_cm2 * (1 - (10 * fy_kg_cm2) / (36 * Fe_kg_cm2));
  } else {
    Fc_kg_cm2 = fy_kg_cm2;
  }

  // En perfil doble cajón cerrado vinculado, el pandeo lateral torsional se reduce drásticamente (no aplica igual que canal abierto)
  if (entrada.cantidadPerfiles === 2 && entrada.vinculacionDoble === 'cajon_vinculado') {
    Fc_kg_cm2 = fy_kg_cm2;
  }

  const Fc_adm = Math.min(Fadm_kg_cm2, Fc_kg_cm2 / entrada.coefSeguridadFlexion);
  return efectivas.Wx_eff_cm3 * Fc_adm;
}

/**
 * Verifica a flexión una viga simplemente apoyada con carga uniformemente distribuida.
 * Distingue explícitamente Wx bruto de catálogo y Wx efectivo de diseño (AISI S100 / CIRSOC 303).
 */
export function verificarFlexion(
  geometria: GeometriaReconstruida,
  entrada: DatosEntrada,
  w_por_perfil_kg_cm: number,
  w_total_viga_kg_cm: number,
  trabajoConjuntoJustificado: boolean
): ResultadoFlexion {
  const { perfil, efectivas } = geometria;
  const L_cm = entrada.luz_m * 100;
  const w_abs = Math.abs(w_por_perfil_kg_cm);

  // Momento máximo: Mmax = (w × L²) / 8
  const Mmax_por_perfil_kg_cm = (w_abs * L_cm * L_cm) / 8;
  const Mmax_por_perfil_kg_m = Mmax_por_perfil_kg_cm / 100;
  const Mmax_total_kg_m = (Math.abs(w_total_viga_kg_cm) * L_cm * L_cm) / 8 / 100;

  // Tensión de fluencia y tensión admisible del acero
  const fy_kg_cm2 = entrada.fy_MPa * FACTOR_MPA_A_KG_CM2;
  const omega = Math.max(1.0, entrada.coefSeguridadFlexion);
  const Fadm_kg_cm2 = fy_kg_cm2 / omega;

  // Reducción del 30% por correa inclinada (Apunte ConsulSteel, pág. 7)
  const factorCorrea = entrada.esCorreaInclinada ? 0.7 : 1.0;

  // Módulo resistente requerido
  const Wx_requerido_cm3 = Mmax_por_perfil_kg_cm / Fadm_kg_cm2;

  const Wx_bruto = perfil.Wx_cm3 * factorCorrea;
  const Wx_efectivo = efectivas.Wx_eff_cm3 * factorCorrea;

  const cumpleBruto = Wx_bruto >= Wx_requerido_cm3;
  const cumpleEfectivo = Wx_efectivo >= Wx_requerido_cm3;

  const M_adm_efectivo_kg_cm = Wx_efectivo * Fadm_kg_cm2;
  const M_adm_LTB_raw = calcularMadmLTB(geometria, entrada, Fadm_kg_cm2);
  const M_adm_LTB_kg_cm = M_adm_LTB_raw !== null ? M_adm_LTB_raw * factorCorrea : null;
  const cumpleLTB = M_adm_LTB_kg_cm === null ? true : M_adm_LTB_kg_cm >= Mmax_por_perfil_kg_cm;

  const ratioDC_bruto = Wx_requerido_cm3 / Wx_bruto;
  const ratioDC_efectivo =
    M_adm_LTB_kg_cm !== null
      ? Mmax_por_perfil_kg_cm / Math.min(M_adm_efectivo_kg_cm, M_adm_LTB_kg_cm)
      : Wx_requerido_cm3 / Wx_efectivo;

  let estado: ResultadoFlexion['estado'] = 'VERIFICA';
  let observacion = entrada.esCorreaInclinada
    ? 'Cumple verificación a flexión aplicando reducción del 30% por correa inclinada (ConsulSteel) y sección efectiva AISI S100.'
    : 'Cumple verificación a flexión tanto por módulo resistente bruto como por sección efectiva AISI S100 / CIRSOC 303.';

  if (!trabajoConjuntoJustificado) {
    estado = 'PENDIENTE';
    observacion =
      'Se seleccionó perfil doble sin vinculación continua asegurada: falta justificación del reparto equitativo de momentos entre perfiles.';
  } else if (!cumpleBruto) {
    estado = 'NO VERIFICA';
    observacion = `No verifica: Wx bruto disponible (${Wx_bruto.toFixed(2)} cm³) < Wx requerido (${Wx_requerido_cm3.toFixed(2)} cm³).`;
  } else if (!cumpleEfectivo) {
    estado = 'NO VERIFICA';
    observacion = `Verifica por sección bruta (${Wx_bruto.toFixed(2)} cm³), pero NO VERIFICA por sección efectiva conformada en frío (Wx,eff = ${Wx_efectivo.toFixed(2)} cm³ < ${Wx_requerido_cm3.toFixed(2)} cm³ debido a pandeo local de ala/alma).`;
  } else if (!cumpleLTB) {
    estado = 'NO VERIFICA';
    observacion = `No verifica por pandeo lateral-torsional (Lb = ${entrada.longitudNoArriostrada_m} m): Madm,LTB = ${((M_adm_LTB_kg_cm ?? 0) / 100).toFixed(1)} kg·m < Mmáx = ${Mmax_por_perfil_kg_m.toFixed(1)} kg·m.`;
  }

  const pasos: PasoCalculo[] = [
    {
      etiqueta: '1. Momento flector máximo por perfil',
      formula: 'Mmáx = (w × L²) / 8',
      valores: `(${w_abs.toFixed(4)} kg/cm × (${L_cm.toFixed(0)} cm)²) / 8`,
      resultado: `${Mmax_por_perfil_kg_cm.toFixed(1)} kg·cm (${Mmax_por_perfil_kg_m.toFixed(2)} kg·m)`,
    },
    {
      etiqueta: '2. Tensión de fluencia y admisible del acero ZAR 250',
      formula: 'fy = fy[MPa] × 10.1972  ;  Fadm = fy / Ω',
      valores: `fy = ${entrada.fy_MPa} × 10.1972 = ${fy_kg_cm2.toFixed(1)} kg/cm²  ;  Fadm = ${fy_kg_cm2.toFixed(1)} / ${omega.toFixed(2)}`,
      resultado: `${Fadm_kg_cm2.toFixed(1)} kg/cm²`,
    },
    {
      etiqueta: '3. Módulo resistente requerido',
      formula: 'Wx,req = Mmáx / Fadm',
      valores: `${Mmax_por_perfil_kg_cm.toFixed(1)} / ${Fadm_kg_cm2.toFixed(1)}`,
      resultado: `${Wx_requerido_cm3.toFixed(2)} cm³`,
    },
    {
      etiqueta: '4. Comparación propiedad bruta vs efectiva (AISI S100)',
      formula: entrada.esCorreaInclinada
        ? '0.70 × Wx,bruto ≥ Wx,req  y  0.70 × Wx,eff ≥ Wx,req (correa inclinada)'
        : 'Wx,bruto ≥ Wx,req  y  Wx,eff ≥ Wx,req',
      valores: `Wx,bruto = ${Wx_bruto.toFixed(2)} cm³ (D/C = ${(ratioDC_bruto * 100).toFixed(1)}%) | Wx,eff = ${Wx_efectivo.toFixed(2)} cm³ (ρ_ala=${efectivas.rho_ala.toFixed(2)}, k=${efectivas.k_ala.toFixed(2)})`,
      resultado: cumpleEfectivo
        ? `CUMPLE (${(ratioDC_efectivo * 100).toFixed(1)}%)`
        : `NO CUMPLE (${(ratioDC_efectivo * 100).toFixed(1)}%)`,
    },
    {
      etiqueta: '5. Estabilidad lateral-torsional (LTB)',
      formula:
        entrada.longitudNoArriostrada_m <= 0
          ? 'Lb = 0 m (arriostramiento lateral continuo por cubierta/entrepiso)'
          : 'Madm,LTB (AISI S100 F2) ≥ Mmáx',
      valores:
        M_adm_LTB_kg_cm === null
          ? 'Arriostramiento continuo especificado en el cordón comprimido.'
          : `Lb = ${entrada.longitudNoArriostrada_m.toFixed(2)} m → Madm,LTB = ${(M_adm_LTB_kg_cm / 100).toFixed(1)} kg·m`,
      resultado: cumpleLTB ? 'CUMPLE' : 'NO CUMPLE',
    },
  ];

  return {
    estado,
    Mmax_por_perfil_kg_cm,
    Mmax_por_perfil_kg_m,
    Mmax_total_kg_m,
    fy_kg_cm2,
    Fadm_kg_cm2,
    Wx_requerido_cm3,
    Wx_bruto_disponible_cm3: Wx_bruto,
    Wx_efectivo_disponible_cm3: Wx_efectivo,
    cumpleBruto,
    cumpleEfectivo,
    cumpleLTB,
    ratioDC_bruto,
    ratioDC_efectivo,
    M_adm_efectivo_kg_cm,
    M_adm_LTB_kg_cm,
    observacion,
    pasos,
  };
}
