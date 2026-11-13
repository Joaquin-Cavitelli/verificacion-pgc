import type {
  GeometriaReconstruida,
  PerfilPGC,
  PropiedadesEfectivas,
  SubAreaQ,
} from './types';

const E_MPA = 205940; // 2.100.000 kg/cm² = 205.940 MPa (consistente con E = 2.100.000 kg/cm²)
const NU = 0.3;

/**
 * Calcula las propiedades efectivas de la sección conformada en frío según AISI S100 / CIRSOC 303
 * (Método de Ancho Efectivo para ala comprimida con pestaña rigidizadora y alma bajo gradiente).
 */
export function calcularPropiedadesEfectivas(
  perfil: PerfilPGC,
  ri_mm: number,
  ro_mm: number,
  fy_MPa: number,
  f_servicio_MPa?: number
): PropiedadesEfectivas {
  const { A_mm: A, B_mm: B, C_mm: C, e_mm: e } = perfil;
  // Tensión de cálculo en fibra extrema comprimida para propiedades efectivas a resistencia (f = Fy)
  const f = f_servicio_MPa ?? fy_MPa;

  // Longitudes planas según AISI S100 (entre puntos de tangencia de los radios)
  const wf = Math.max(0.1, B - 2 * ro_mm);
  const ds = Math.max(0, C - ro_mm);
  const hw = Math.max(1, A - 2 * ro_mm);

  // 1. Verificación del rigidizador de borde (pestaña) y ancho efectivo del ala comprimida (AISI S100 B4.2)
  const S = 1.28 * Math.sqrt(E_MPA / f);
  const wf_e = wf / e;

  let k_ala = 4.0;
  let Ia = 0;
  const Is = (e * Math.pow(ds, 3)) / 12;

  if (wf_e <= S / 3) {
    // Caso I: elemento completamente efectivo sin requerir rigidizador para pandeo local de placa
    k_ala = 4.0;
  } else if (wf_e < S) {
    // Caso II: 0.328 S < w/t < S
    Ia = 399 * Math.pow(e, 4) * Math.pow(wf_e / S - 0.328, 3);
    const n = Math.max(1 / 3, 0.582 - wf_e / (4 * S));
    const RI = Math.min(1.0, Ia > 0 ? Is / Ia : 1.0);
    const dw_ratio = ds / wf;
    const ka =
      dw_ratio <= 0.25
        ? Math.min(4.0, 3.57 * Math.pow(RI, n) + 0.43)
        : Math.min(4.0, (4.82 - (5 * ds) / wf) * Math.pow(RI, n) + 0.43);
    k_ala = Math.max(0.43, ka);
  } else {
    // Caso III: w/t >= S
    Ia = Math.pow(e, 4) * ((115 * wf_e) / S + 5);
    const n = 1 / 3;
    const RI = Math.min(1.0, Ia > 0 ? Is / Ia : 1.0);
    const dw_ratio = ds / wf;
    const ka =
      dw_ratio <= 0.25
        ? Math.min(4.0, 3.57 * Math.pow(RI, n) + 0.43)
        : Math.min(4.0, (4.82 - (5 * ds) / wf) * Math.pow(RI, n) + 0.43);
    k_ala = Math.max(0.43, ka);
  }

  // Factor de reducción de Winter para el ala comprimida
  const Fcr_ala = (k_ala * Math.PI * Math.PI * E_MPA) / (12 * (1 - NU * NU) * wf_e * wf_e);
  const lambda_ala = Math.sqrt(f / Fcr_ala);
  const rho_ala = lambda_ala <= 0.673 ? 1.0 : Math.min(1.0, (1 - 0.22 / lambda_ala) / lambda_ala);
  const b_eff_ala = rho_ala * wf;

  // Ancho efectivo de la pestaña comprimida (elemento no rigidizado, k = 0.43)
  const ds_e = ds / e;
  const Fcr_pest = ds_e > 0 ? (0.43 * Math.PI * Math.PI * E_MPA) / (12 * (1 - NU * NU) * ds_e * ds_e) : 1e9;
  const lambda_pest = Math.sqrt(f / Fcr_pest);
  const rho_pest_local = lambda_pest <= 0.673 ? 1.0 : Math.min(1.0, (1 - 0.22 / lambda_pest) / lambda_pest);
  const RI_final = Ia > 0 ? Math.min(1.0, Is / Ia) : 1.0;
  const d_eff_pest = ds * rho_pest_local * RI_final;
  const rho_pestana = ds > 0 ? d_eff_pest / ds : 1.0;

  // 2. Ancho efectivo del alma bajo gradiente de tensiones (AISI S100 B2.3)
  // Estimación inicial con eje neutro en A/2 y 1 iteración para reflejar el desplazamiento del EN
  let y_cg_eff = A / 2; // distancia desde fibra extrema inferior (traccionada)
  let b1_alma = 0;
  let b2_alma = 0;
  let lambda_alma = 0;
  let almaTotalmenteEfectiva = true;
  let Jx_eff_mm4 = perfil.Jx_cm4 * 10000;

  // Sub-elementos constantes (en coordenadas y desde la fibra extrema inferior y=0 hasta y=A)
  const aCorner = (Math.PI / 4) * (ro_mm * ro_mm - ri_mm * ri_mm);
  const dc =
    (4 / (3 * Math.PI)) *
    ((Math.pow(ro_mm, 3) - Math.pow(ri_mm, 3)) / (ro_mm * ro_mm - ri_mm * ri_mm));
  const iSelfCorner =
    (Math.PI / 16) * (Math.pow(ro_mm, 4) - Math.pow(ri_mm, 4)) - aCorner * dc * dc;

  // Ala inferior traccionada (totalmente efectiva)
  const aAlaInf = wf * e;
  const yAlaInf = e / 2;
  const iAlaInfLocal = (wf * Math.pow(e, 3)) / 12;

  // Pestaña inferior traccionada (totalmente efectiva)
  const aPestInf = ds * e;
  const yPestInf = ro_mm + ds / 2;
  const iPestInfLocal = (e * Math.pow(ds, 3)) / 12;

  // Codos inferiores (2) y superiores (2)
  const yCodoInf = ro_mm - dc;
  const yCodoSup = A - ro_mm + dc;

  // Ala superior comprimida (con ancho efectivo b_eff_ala)
  const aAlaSupEff = b_eff_ala * e;
  const yAlaSup = A - e / 2;
  const iAlaSupLocal = (b_eff_ala * Math.pow(e, 3)) / 12;

  // Pestaña superior comprimida (longitud efectiva d_eff_pest adherida al codo superior)
  const aPestSupEff = d_eff_pest * e;
  const yPestSup = A - ro_mm - d_eff_pest / 2;
  const iPestSupLocal = (e * Math.pow(d_eff_pest, 3)) / 12;

  // Iteramos 3 veces el equilibrio del eje neutro efectivo para capturar el corrimiento de y_cg
  for (let iter = 0; iter < 3; iter++) {
    // Tensiones en bordes del alma plana: fibra superior comprimida (y = A - ro_mm), inferior traccionada (y = ro_mm)
    const y_top_web = A - ro_mm;
    const y_bot_web = ro_mm;
    const c_comp = Math.max(1, A - y_cg_eff);
    const f1 = f * ((y_top_web - y_cg_eff) / c_comp);
    const f2 = f * ((y_bot_web - y_cg_eff) / c_comp); // negativo = tracción
    const psi = f1 > 0 ? f2 / f1 : -1;

    const k_alma = 4 + 2 * Math.pow(1 - psi, 3) + 2 * (1 - psi);
    const hw_e = hw / e;
    const Fcr_alma = (k_alma * Math.PI * Math.PI * E_MPA) / (12 * (1 - NU * NU) * hw_e * hw_e);
    lambda_alma = f1 > 0 ? Math.sqrt(f1 / Fcr_alma) : 0;
    const rho_alma =
      lambda_alma <= 0.673 ? 1.0 : Math.min(1.0, (1 - 0.22 / lambda_alma) / lambda_alma);
    const be_alma = rho_alma * hw;

    if (psi <= -0.236) {
      b1_alma = be_alma / (3 - psi);
      b2_alma = be_alma / 2;
    } else {
      b1_alma = be_alma / (3 - psi);
      b2_alma = be_alma / (1 - psi) - b1_alma;
    }

    const h_comp_alma = Math.max(0, y_top_web - y_cg_eff);
    almaTotalmenteEfectiva = b1_alma + b2_alma >= h_comp_alma - 1e-6 || lambda_alma <= 0.673;

    // Construimos tramos efectivos del alma
    let tramosAlma: Array<{ a: number; y: number; iLocal: number }> = [];
    if (almaTotalmenteEfectiva) {
      tramosAlma = [
        {
          a: hw * e,
          y: A / 2,
          iLocal: (e * Math.pow(hw, 3)) / 12,
        },
      ];
    } else {
      // Tramo 1: desde y_top_web hacia abajo por b1_alma
      const y1_mid = y_top_web - b1_alma / 2;
      // Tramo 2: desde y_cg_eff hacia arriba por b2_alma + toda la zona traccionada desde y_bot_web hasta y_cg_eff
      const h_tracc_alma = Math.max(0, y_cg_eff - y_bot_web);
      const h_inf_eff = h_tracc_alma + b2_alma;
      const y2_mid = y_bot_web + h_inf_eff / 2;
      tramosAlma = [
        { a: b1_alma * e, y: y1_mid, iLocal: (e * Math.pow(b1_alma, 3)) / 12 },
        { a: h_inf_eff * e, y: y2_mid, iLocal: (e * Math.pow(h_inf_eff, 3)) / 12 },
      ];
    }

    const piezas = [
      { a: aAlaInf, y: yAlaInf, iLocal: iAlaInfLocal },
      { a: aPestInf, y: yPestInf, iLocal: iPestInfLocal },
      { a: 2 * aCorner, y: yCodoInf, iLocal: 2 * iSelfCorner },
      { a: 2 * aCorner, y: yCodoSup, iLocal: 2 * iSelfCorner },
      { a: aAlaSupEff, y: yAlaSup, iLocal: iAlaSupLocal },
      { a: aPestSupEff, y: yPestSup, iLocal: iPestSupLocal },
      ...tramosAlma,
    ];

    const sumA = piezas.reduce((acc, p) => acc + p.a, 0);
    const sumAy = piezas.reduce((acc, p) => acc + p.a * p.y, 0);
    y_cg_eff = sumAy / sumA;

    Jx_eff_mm4 = piezas.reduce(
      (acc, p) => acc + p.iLocal + p.a * Math.pow(p.y - y_cg_eff, 2),
      0
    );
  }

  const Jx_eff_cm4 = Jx_eff_mm4 / 10000;
  // Distancia máxima a fibra extrema desde el eje neutro efectivo
  const y_max_mm = Math.max(y_cg_eff, A - y_cg_eff);
  const Wx_eff_cm3 = Jx_eff_mm4 / y_max_mm / 1000;

  return {
    f_Mpa: f,
    wf_mm: wf,
    ds_mm: ds,
    hw_mm: hw,
    esbeltezAla_wf_e: wf_e,
    k_ala,
    lambda_ala,
    rho_ala,
    b_eff_ala_mm: b_eff_ala,
    rho_pestana,
    d_eff_pest_mm: d_eff_pest,
    lambda_alma,
    b1_alma_mm: b1_alma,
    b2_alma_mm: b2_alma,
    almaTotalmenteEfectiva,
    y_cg_eff_desde_traccion_mm: y_cg_eff,
    Jx_eff_cm4: Math.min(perfil.Jx_cm4, Jx_eff_cm4),
    Wx_eff_cm3: Math.min(perfil.Wx_cm3, Wx_eff_cm3),
    relacionEfectiva_Wx: Math.min(1, Wx_eff_cm3 / perfil.Wx_cm3),
    relacionEfectiva_Jx: Math.min(1, Jx_eff_cm4 / perfil.Jx_cm4),
  };
}

/**
 * Reconstruye geométricamente la sección PGC sin superposiciones entre alma, alas, pestañas y radios de plegado.
 * Calcula Q = Σ (Ai × yi) respecto del eje neutro horizontal y valida contra los valores del catálogo Barbieri.
 */
export function reconstruirGeometriaPerfil(
  perfil: PerfilPGC,
  fy_MPa = 250
): GeometriaReconstruida {
  const { A_mm: A, B_mm: B, C_mm: C, e_mm: e, R_mm: R } = perfil;

  // En el catálogo Barbieri, R corresponde al radio interno de plegado ri = R, ro = R + e
  const ri = R;
  const rm = R + e / 2;
  const ro = R + e;

  // Longitudes rectas entre puntos de tangencia (sin superposiciones en esquinas)
  const hAlmaTotalRecta = Math.max(0, A - 2 * ro);
  const hAlmaMitadSup = hAlmaTotalRecta / 2;
  const wAlaRecta = Math.max(0, B - 2 * ro);
  const hPestanaRecta = Math.max(0, C - ro);

  // Propiedades de cada cuarto de anillo circular (codo a 90°)
  const aCodo = (Math.PI / 4) * (ro * ro - ri * ri);
  const dc = (4 / (3 * Math.PI)) * ((Math.pow(ro, 3) - Math.pow(ri, 3)) / (ro * ro - ri * ri));
  const iCentroCodo = (Math.PI / 16) * (Math.pow(ro, 4) - Math.pow(ri, 4));
  const iPropioCodo = iCentroCodo - aCodo * dc * dc;

  // Sub-áreas por encima del eje neutro horizontal (y = 0 en A/2)
  // 1. Mitad superior del alma recta: y ∈ [0, A/2 - ro]
  const areaAlmaSup = hAlmaMitadSup * e;
  const yAlmaSup = hAlmaMitadSup / 2;
  const qAlmaSup = areaAlmaSup * yAlmaSup;

  // 2. Radio de plegado superior alma-ala: centro de curvatura en (ro, A/2 - ro)
  const xCodo1 = ro - dc;
  const yCodo1 = A / 2 - ro + dc;
  const qCodo1 = aCodo * yCodo1;

  // 3. Ala superior recta: x ∈ [ro, B - ro], y ∈ [A/2 - e, A/2]
  const areaAlaSup = wAlaRecta * e;
  const xAlaSup = ro + wAlaRecta / 2;
  const yAlaSup = A / 2 - e / 2;
  const qAlaSup = areaAlaSup * yAlaSup;

  // 4. Radio de plegado superior ala-pestaña: centro de curvatura en (B - ro, A/2 - ro)
  const xCodo2 = B - ro + dc;
  const yCodo2 = A / 2 - ro + dc;
  const qCodo2 = aCodo * yCodo2;

  // 5. Pestaña superior recta: x ∈ [B - e, B], y ∈ [A/2 - C, A/2 - ro]
  const areaPestSup = hPestanaRecta * e;
  const xPestSup = B - e / 2;
  const yPestSup = A / 2 - ro - hPestanaRecta / 2;
  const qPestSup = areaPestSup * yPestSup;

  const subAreasSuperiores: SubAreaQ[] = [
    {
      id: 'alma_sup',
      nombre: 'Alma (mitad superior recta)',
      formulaDesc: `e × (A/2 − ro) = ${e.toFixed(2)} × ${hAlmaMitadSup.toFixed(2)} mm`,
      area_mm2: areaAlmaSup,
      area_cm2: areaAlmaSup / 100,
      yi_mm: yAlmaSup,
      yi_cm: yAlmaSup / 10,
      Qi_mm3: qAlmaSup,
      Qi_cm3: qAlmaSup / 1000,
    },
    {
      id: 'codo_alma_ala',
      nombre: 'Radio de plegado alma-ala',
      formulaDesc: `(π/4)(ro² − ri²), y = (A/2 − ro) + dc`,
      area_mm2: aCodo,
      area_cm2: aCodo / 100,
      yi_mm: yCodo1,
      yi_cm: yCodo1 / 10,
      Qi_mm3: qCodo1,
      Qi_cm3: qCodo1 / 1000,
    },
    {
      id: 'ala_sup',
      nombre: 'Ala superior (tramo recto)',
      formulaDesc: `(B − 2·ro) × e = ${wAlaRecta.toFixed(2)} × ${e.toFixed(2)} mm`,
      area_mm2: areaAlaSup,
      area_cm2: areaAlaSup / 100,
      yi_mm: yAlaSup,
      yi_cm: yAlaSup / 10,
      Qi_mm3: qAlaSup,
      Qi_cm3: qAlaSup / 1000,
    },
    {
      id: 'codo_ala_pestana',
      nombre: 'Radio de plegado ala-pestaña',
      formulaDesc: `(π/4)(ro² − ri²), y = (A/2 − ro) + dc`,
      area_mm2: aCodo,
      area_cm2: aCodo / 100,
      yi_mm: yCodo2,
      yi_cm: yCodo2 / 10,
      Qi_mm3: qCodo2,
      Qi_cm3: qCodo2 / 1000,
    },
    {
      id: 'pestana_sup',
      nombre: 'Pestaña superior (tramo recto)',
      formulaDesc: `(C − ro) × e = ${hPestanaRecta.toFixed(2)} × ${e.toFixed(2)} mm`,
      area_mm2: areaPestSup,
      area_cm2: areaPestSup / 100,
      yi_mm: yPestSup,
      yi_cm: yPestSup / 10,
      Qi_mm3: qPestSup,
      Qi_cm3: qPestSup / 1000,
    },
  ];

  const Q_max_mm3 = qAlmaSup + qCodo1 + qAlaSup + qCodo2 + qPestSup;
  const Q_max_cm3 = Q_max_mm3 / 1000;

  // Q en la unión alma-ala (excluye el alma recta superior)
  const Q_unionAlaAlma_cm3 = (qCodo1 + qAlaSup + qCodo2 + qPestSup) / 1000;

  // Validación completa de la sección reconstruida (2 mitades simétricas respecto de x-x)
  const areaTotal_mm2 = (areaAlmaSup + aCodo + areaAlaSup + aCodo + areaPestSup) * 2;
  const area_calc_cm2 = areaTotal_mm2 / 100;

  const xAlma = e / 2;
  const xg_mm =
    (2 * areaAlmaSup * xAlma +
      2 * aCodo * xCodo1 +
      2 * areaAlaSup * xAlaSup +
      2 * aCodo * xCodo2 +
      2 * areaPestSup * xPestSup) /
    areaTotal_mm2;
  const xg_calc_cm = xg_mm / 10;

  // Momentos de inercia respecto del baricentro
  const ixAlma = (e * Math.pow(hAlmaTotalRecta, 3)) / 12;
  const ixAla = (wAlaRecta * Math.pow(e, 3)) / 12 + areaAlaSup * Math.pow(yAlaSup, 2);
  const ixPest = (e * Math.pow(hPestanaRecta, 3)) / 12 + areaPestSup * Math.pow(yPestSup, 2);
  const ixCodo1 = iPropioCodo + aCodo * Math.pow(yCodo1, 2);
  const ixCodo2 = iPropioCodo + aCodo * Math.pow(yCodo2, 2);
  const Jx_mm4 = ixAlma + 2 * ixAla + 2 * ixPest + 2 * ixCodo1 + 2 * ixCodo2;
  const Jx_calc_cm4 = Jx_mm4 / 10000;
  const Wx_calc_cm3 = Jx_calc_cm4 / (A / 20);

  const iyAlma = (hAlmaTotalRecta * Math.pow(e, 3)) / 12 + 2 * areaAlmaSup * Math.pow(xAlma - xg_mm, 2);
  const iyAla = (e * Math.pow(wAlaRecta, 3)) / 12 + areaAlaSup * Math.pow(xAlaSup - xg_mm, 2);
  const iyPest = (hPestanaRecta * Math.pow(e, 3)) / 12 + areaPestSup * Math.pow(xPestSup - xg_mm, 2);
  const iyCodo1 = iPropioCodo + aCodo * Math.pow(xCodo1 - xg_mm, 2);
  const iyCodo2 = iPropioCodo + aCodo * Math.pow(xCodo2 - xg_mm, 2);
  const Jy_mm4 = iyAlma + 2 * iyAla + 2 * iyPest + 2 * iyCodo1 + 2 * iyCodo2;
  const Jy_calc_cm4 = Jy_mm4 / 10000;

  const errorArea_pct = ((area_calc_cm2 - perfil.area_cm2) / perfil.area_cm2) * 100;
  const errorXg_pct = ((xg_calc_cm - perfil.xg_cm) / perfil.xg_cm) * 100;
  const errorJx_pct = ((Jx_calc_cm4 - perfil.Jx_cm4) / perfil.Jx_cm4) * 100;
  const errorJy_pct = ((Jy_calc_cm4 - perfil.Jy_cm4) / perfil.Jy_cm4) * 100;

  const maxErr = Math.max(
    Math.abs(errorArea_pct),
    Math.abs(errorXg_pct),
    Math.abs(errorJx_pct)
  );
  const exactitud: 'EXACTO' | 'APROXIMADO' = maxErr <= 1.5 ? 'EXACTO' : 'APROXIMADO';

  const notaValidacion =
    exactitud === 'EXACTO'
      ? `Reconstrucción geométrica validada contra catálogo Barbieri (ri = R = ${ri.toFixed(2)} mm, ro = ${(ri + e).toFixed(2)} mm): error de área ${errorArea_pct.toFixed(2)}%, Xg ${errorXg_pct.toFixed(2)}%, Jx ${errorJx_pct.toFixed(2)}%.`
      : `Resultado clasificado como APROXIMADO: manteniendo estrictamente las dimensiones impresas en el catálogo (A=${A}, B=${B}, C=${C}, e=${e}, R=${R} mm), la reconstrucción difiere del catálogo publicado en Área (${errorArea_pct.toFixed(2)}%), Xg (${errorXg_pct.toFixed(2)}%) o Jx (${errorJx_pct.toFixed(2)}%). En perfiles altos (350/400) o con radios atípicos impresos, el catálogo oficial publica valores calculados con geometría interna no explicitada en la tabla.`;

  const documentacionQ = `Q = Σ(Ai × yi) evaluado sobre la mitad superior de la sección (y ≥ 0 desde el eje neutro horizontal x-x), descomponiendo la geometría sin superposiciones en: (1) mitad superior del alma recta, (2) codo alma-ala (cuarto de anillo de radios ri=${ri.toFixed(2)} mm y ro=${ro.toFixed(2)} mm), (3) ala superior recta, (4) codo ala-pestaña y (5) pestaña superior recta.`;

  const efectivas = calcularPropiedadesEfectivas(perfil, ri, ro, fy_MPa);

  return {
    perfil,
    ri_mm: ri,
    rm_mm: rm,
    ro_mm: ro,
    hAlmaRecta_mm: hAlmaTotalRecta,
    wAlaRecta_mm: wAlaRecta,
    hPestanaRecta_mm: hPestanaRecta,
    subAreasSuperiores,
    Q_max_cm3,
    Q_unionAlaAlma_cm3,
    area_calc_cm2,
    xg_calc_cm,
    Jx_calc_cm4,
    Jy_calc_cm4,
    Wx_calc_cm3,
    errorArea_pct,
    errorXg_pct,
    errorJx_pct,
    errorJy_pct,
    exactitud,
    notaValidacion,
    documentacionQ,
    efectivas,
  };
}
