import type {
  DatosEntrada,
  GeometriaReconstruida,
  PasoCalculo,
  ResultadoCorte,
} from './types';

const FACTOR_MPA_A_KG_CM2 = 10.1972;
const E_KG_CM2 = 2100000;

/**
 * Verifica a corte una viga simplemente apoyada con carga uniformemente distribuida:
 * 1) Tensión de corte de trabajo τ = (Vmax × Q) / (Jx × t) con flujo de corte q = Vmax × Q / Jx
 * 2) Resistencia normativa al corte del alma conformada en frío (AISI S100 G2 / CIRSOC 303 C3.2)
 * 3) Interacción flexión-corte en alma sin rigidizadores (AISI S100 H2)
 * 4) Abolladura localizada del alma en apoyos (AISI S100 G5) si se suministra longitud de apoyo N
 */
export function verificarCorte(
  geometria: GeometriaReconstruida,
  entrada: DatosEntrada,
  w_por_perfil_kg_cm: number,
  w_total_viga_kg_cm: number,
  Mmax_por_perfil_kg_cm: number,
  Madm_por_perfil_kg_cm: number,
  trabajoConjuntoJustificado: boolean
): ResultadoCorte {
  const { perfil, Q_max_cm3, hAlmaRecta_mm } = geometria;
  const L_cm = entrada.luz_m * 100;

  // Vmax = (w × L) / 2
  const Vmax_por_perfil_kg = (Math.abs(w_por_perfil_kg_cm) * L_cm) / 2;
  const Vmax_total_kg = (Math.abs(w_total_viga_kg_cm) * L_cm) / 2;

  const Q_cm3 = Q_max_cm3;
  const Jx_cm4 = perfil.Jx_cm4;
  const t_cm = perfil.e_mm / 10;

  // Flujo de corte en pared delgada (kg/cm) y tensión tangencial en el eje neutro (kg/cm²)
  const flujoCorte_kg_cm = (Vmax_por_perfil_kg * Q_cm3) / Jx_cm4;
  const tau_trabajo_kg_cm2 = flujoCorte_kg_cm / t_cm;
  const tau_trabajo_MPa = tau_trabajo_kg_cm2 / FACTOR_MPA_A_KG_CM2;

  const fy_kg_cm2 = entrada.fy_MPa * FACTOR_MPA_A_KG_CM2;
  // Tensión admisible básica a corte por fluencia (Von Mises 0.6*Fy / Ωv, con Ωv = 1.60 según criterio consistente)
  const omegaV = Math.max(1.6, entrada.coefSeguridadFlexion);
  const tau_admisible_basal_kg_cm2 = (0.6 * fy_kg_cm2) / omegaV;

  // Verificación normativa de pandeo por corte del alma (AISI S100 Sección G2 / CIRSOC 303 C3.2)
  const h_cm = hAlmaRecta_mm / 10;
  const h_t = h_cm / t_cm;
  const kv = 5.34; // Alma sin rigidizadores transversales
  const lim1 = Math.sqrt((E_KG_CM2 * kv) / fy_kg_cm2);
  const lim2 = 1.51 * lim1;
  const Aw_cm2 = h_cm * t_cm;

  let Vn_norma_kg = 0;
  let zonaPandeoAlma: ResultadoCorte['zonaPandeoAlma'] = 'Plástica (fluencia por corte)';
  let omegaNormaV = 1.6;

  if (h_t <= lim1) {
    zonaPandeoAlma = 'Plástica (fluencia por corte)';
    Vn_norma_kg = 0.6 * fy_kg_cm2 * Aw_cm2;
    omegaNormaV = 1.6;
  } else if (h_t <= lim2) {
    zonaPandeoAlma = 'Inelástica (pandeo inelástico)';
    Vn_norma_kg = 0.6 * t_cm * t_cm * Math.sqrt(E_KG_CM2 * kv * fy_kg_cm2);
    omegaNormaV = 1.67;
  } else {
    zonaPandeoAlma = 'Elástica (pandeo elástico del alma)';
    Vn_norma_kg = 0.904 * E_KG_CM2 * kv * Math.pow(t_cm, 3) / h_cm;
    omegaNormaV = 1.67;
  }

  const Vadm_norma_kg = Vn_norma_kg / omegaNormaV;
  const tau_adm_norma_kg_cm2 = Vadm_norma_kg / Aw_cm2;

  const cumpleTensionBasal = tau_trabajo_kg_cm2 <= tau_admisible_basal_kg_cm2;
  const cumpleNormaAlma = Vmax_por_perfil_kg <= Vadm_norma_kg;

  // Interacción Flexión + Corte para alma sin rigidizadores (AISI S100 H2): (M/Madm)^2 + (V/Vadm)^2 <= 1.0
  // Nota: En viga simplemente apoyada con carga uniforme, Mmáx ocurre en L/2 (V=0) y Vmáx ocurre en apoyo (M=0),
  // pero evaluamos conservadoramente la envolvente o verificamos el punto crítico. Dejamos explícito el valor.
  const ratioM = Madm_por_perfil_kg_cm > 0 ? Mmax_por_perfil_kg_cm / Madm_por_perfil_kg_cm : 0;
  const ratioV = Vadm_norma_kg > 0 ? Vmax_por_perfil_kg / Vadm_norma_kg : 0;
  const interaccionMV = Math.sqrt(ratioM * ratioM + ratioV * ratioV);
  // En viga simplemente apoyada con carga uniforme Mmax y Vmax no coinciden en la misma sección:
  // En cualquier sección x: M(x)/Madm <= 1 y V(x)/Vadm <= 1; la envolvente simultánea es <= 1.0 si es más conservadora.
  const cumpleInteraccionMV = ratioM <= 1.0 && ratioV <= 1.0;

  // Verificación de abolladura localizada del alma en apoyos (Web Crippling - AISI S100 G5, Caso EOF: un ala cargada en extremo)
  let Padm_apoyo_kg: number | null = null;
  let cumpleApoyo: boolean | null = null;

  if (entrada.longitudApoyo_mm !== null && entrada.longitudApoyo_mm > 0) {
    // AISI S100 Tabla G5-1 para canal C con pestaña, extremo de viga, carga en un ala (EOF), sin sujeción a ala:
    // Pn = C * t² * Fy * sin(θ) * (1 - CR*sqrt(R/t)) * (1 + CN*sqrt(N/t)) * (1 - Ch*sqrt(h/t))
    // Coeficientes ASD EOF (no fastened to support, stiffened flange): C=4, CR=0.14, CN=0.35, Ch=0.02, Omega_w=1.85
    const N_cm = entrada.longitudApoyo_mm / 10;
    const R_t = Math.min(9, geometria.ri_mm / perfil.e_mm);
    const N_t = Math.min(210, N_cm / t_cm);
    const h_t_lim = Math.min(200, h_t);
    const C_wc = 4.0;
    const CR = 0.14;
    const CN = 0.35;
    const Ch = 0.02;
    const Pn_kg =
      C_wc *
      t_cm *
      t_cm *
      fy_kg_cm2 *
      Math.max(0.1, 1 - CR * Math.sqrt(R_t)) *
      (1 + CN * Math.sqrt(N_t)) *
      Math.max(0.1, 1 - Ch * Math.sqrt(h_t_lim));
    const omega_wc = 1.85;
    Padm_apoyo_kg = Pn_kg / omega_wc;
    cumpleApoyo = Vmax_por_perfil_kg <= Padm_apoyo_kg;
  }

  const ratioBasal = tau_trabajo_kg_cm2 / tau_admisible_basal_kg_cm2;
  const ratioNorma = Vmax_por_perfil_kg / Vadm_norma_kg;
  const ratioApoyo = Padm_apoyo_kg ? Vmax_por_perfil_kg / Padm_apoyo_kg : 0;
  const ratioDC = Math.max(ratioBasal, ratioNorma, ratioApoyo);

  let estado: ResultadoCorte['estado'] = 'VERIFICA';
  let observacion = `Cumple corte por tensión tangencial (τ=${tau_trabajo_kg_cm2.toFixed(1)} ≤ ${tau_admisible_basal_kg_cm2.toFixed(1)} kg/cm²) y por pandeo del alma AISI S100 (V=${Vmax_por_perfil_kg.toFixed(0)} ≤ ${Vadm_norma_kg.toFixed(0)} kg).`;

  if (!trabajoConjuntoJustificado) {
    estado = 'PENDIENTE';
    observacion =
      'Perfil doble sin vinculación asegurada: pendiente de justificar el reparto equitativo del esfuerzo de corte.';
  } else if (entrada.longitudApoyo_mm === null || entrada.longitudApoyo_mm <= 0) {
    estado = 'PENDIENTE';
    observacion =
      'Falta especificar la longitud de apoyo (N en mm) para verificar abolladura localizada del alma en apoyos (AISI S100 G5).';
  } else if (!cumpleTensionBasal || !cumpleNormaAlma) {
    estado = 'NO VERIFICA';
    observacion = !cumpleNormaAlma
      ? `No verifica resistencia al corte del alma (${zonaPandeoAlma}): Vmáx = ${Vmax_por_perfil_kg.toFixed(0)} kg > Vadm = ${Vadm_norma_kg.toFixed(0)} kg.`
      : `No verifica tensión tangencial de trabajo: τ = ${tau_trabajo_kg_cm2.toFixed(1)} kg/cm² > τadm = ${tau_admisible_basal_kg_cm2.toFixed(1)} kg/cm².`;
  } else if (cumpleApoyo === false) {
    estado = 'NO VERIFICA';
    observacion = `Verifica a corte puro, pero NO VERIFICA por abolladura del alma en apoyo (N = ${entrada.longitudApoyo_mm} mm): Reacción Vmáx = ${Vmax_por_perfil_kg.toFixed(0)} kg > Padm = ${(Padm_apoyo_kg ?? 0).toFixed(0)} kg.`;
  }

  const pasos: PasoCalculo[] = [
    {
      etiqueta: '1. Esfuerzo cortante máximo por perfil',
      formula: 'Vmáx = (w × L) / 2',
      valores: `(${Math.abs(w_por_perfil_kg_cm).toFixed(4)} kg/cm × ${L_cm.toFixed(0)} cm) / 2`,
      resultado: `${Vmax_por_perfil_kg.toFixed(1)} kg`,
    },
    {
      etiqueta: '2. Flujo de corte y tensión tangencial de Jourawski (con Q real)',
      formula: 'q_flujo = (Vmáx × Q) / Jx  ;  τ = (Vmáx × Q) / (Jx × t)',
      valores: `(${Vmax_por_perfil_kg.toFixed(1)} kg × ${Q_cm3.toFixed(3)} cm³) / (${Jx_cm4.toFixed(2)} cm⁴ × ${t_cm.toFixed(3)} cm)`,
      resultado: `τ = ${tau_trabajo_kg_cm2.toFixed(2)} kg/cm² (${tau_trabajo_MPa.toFixed(2)} MPa) | q_flujo = ${flujoCorte_kg_cm.toFixed(2)} kg/cm`,
    },
    {
      etiqueta: '3. Tensión admisible básica a corte por fluencia',
      formula: 'τadm = (0.60 × fy) / Ωv',
      valores: `(0.60 × ${fy_kg_cm2.toFixed(1)} kg/cm²) / ${omegaV.toFixed(2)}`,
      resultado: `${tau_admisible_basal_kg_cm2.toFixed(1)} kg/cm² (${cumpleTensionBasal ? 'CUMPLE' : 'NO CUMPLE'})`,
    },
    {
      etiqueta: '4. Pandeo por corte del alma conformada en frío (AISI S100 G2)',
      formula: `h/t = ${h_t.toFixed(1)} (Lím.1 = ${lim1.toFixed(1)}, Lím.2 = ${lim2.toFixed(1)}) → ${zonaPandeoAlma}`,
      valores: `Vn = ${Vn_norma_kg.toFixed(0)} kg / Ω = ${omegaNormaV.toFixed(2)} → Vadm = ${Vadm_norma_kg.toFixed(0)} kg (τadm,alma = ${tau_adm_norma_kg_cm2.toFixed(1)} kg/cm²)`,
      resultado: cumpleNormaAlma
        ? `CUMPLE (${(ratioNorma * 100).toFixed(1)}%)`
        : `NO CUMPLE (${(ratioNorma * 100).toFixed(1)}%)`,
    },
    {
      etiqueta: '5. Abolladura localizada del alma en apoyos (AISI S100 G5 - EOF)',
      formula:
        entrada.longitudApoyo_mm !== null && entrada.longitudApoyo_mm > 0
          ? `Apoyo N = ${entrada.longitudApoyo_mm} mm, Ωw = 1.85`
          : 'Sin longitud de apoyo especificada',
      valores:
        Padm_apoyo_kg !== null
          ? `Reacción = ${Vmax_por_perfil_kg.toFixed(0)} kg vs Padm,apoyo = ${Padm_apoyo_kg.toFixed(0)} kg`
          : 'Dato de apoyo pendiente',
      resultado:
        cumpleApoyo === null
          ? 'PENDIENTE'
          : cumpleApoyo
            ? `CUMPLE (${(ratioApoyo * 100).toFixed(1)}%)`
            : `NO CUMPLE (${(ratioApoyo * 100).toFixed(1)}%)`,
    },
  ];

  return {
    estado,
    Vmax_por_perfil_kg,
    Vmax_total_kg,
    Q_cm3,
    Jx_cm4,
    t_cm,
    flujoCorte_kg_cm,
    tau_trabajo_kg_cm2,
    tau_trabajo_MPa,
    tau_admisible_basal_kg_cm2,
    esbeltezAlma_h_t: h_t,
    zonaPandeoAlma,
    Vn_norma_kg,
    Vadm_norma_kg,
    tau_adm_norma_kg_cm2,
    cumpleTensionBasal,
    cumpleNormaAlma,
    interaccionMV,
    cumpleInteraccionMV,
    Padm_apoyo_kg,
    cumpleApoyo,
    ratioDC,
    observacion,
    pasos,
  };
}
