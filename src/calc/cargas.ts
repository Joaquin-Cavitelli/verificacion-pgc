import type { CombinacionCarga, DatosEntrada, ResultadoCargas } from './types';

export const PRESETS_CUBIERTA: Record<
  DatosEntrada['tipoCubierta'],
  { label: string; peso_kg_m2: number }
> = {
  chapa_inclinada: {
    label: 'Cubierta inclinada de chapa (35 kg/m²)',
    peso_kg_m2: 35,
  },
  teja_inclinada: {
    label: 'Cubierta inclinada de tejas (85 kg/m²)',
    peso_kg_m2: 85,
  },
  plana_liviana: {
    label: 'Cubierta plana H° liviano 1100 kg/m³ (185 kg/m²)',
    peso_kg_m2: 185,
  },
  plana_pesada: {
    label: 'Cubierta plana H° común 1800 kg/m³ (250 kg/m²)',
    peso_kg_m2: 250,
  },
  ninguna: {
    label: 'Sin cubierta (solo entrepiso / carga manual)',
    peso_kg_m2: 0,
  },
  personalizada: {
    label: 'Cubierta personalizada',
    peso_kg_m2: 40,
  },
};

export const PRESETS_ENTREPISO: Record<
  DatosEntrada['tipoEntrepiso'],
  { label: string; peso_kg_m2: number }
> = {
  ninguno: {
    label: 'Sin entrepiso',
    peso_kg_m2: 0,
  },
  seco_sin_cementicia: {
    label: 'Entrepiso seco s/placa cementicia (50 kg/m²)',
    peso_kg_m2: 50,
  },
  seco_con_cementicia: {
    label: 'Entrepiso seco c/placa cementicia (90 kg/m²)',
    peso_kg_m2: 90,
  },
  humedo_160: {
    label: 'Entrepiso húmedo (160 kg/m²)',
    peso_kg_m2: 160,
  },
  terraza_humeda_200: {
    label: 'Terraza húmeda accesible (200 kg/m²)',
    peso_kg_m2: 200,
  },
  personalizado: {
    label: 'Entrepiso personalizado',
    peso_kg_m2: 60,
  },
};

export const PRESETS_SOBRECARGA: Array<{ id: string; label: string; valor_kg_m2: number }> = [
  { id: 'cubierta_inclinada', label: 'Cubierta inclinada < 20° (96 kg/m²)', valor_kg_m2: 96 },
  { id: 'cubierta_plana', label: 'Cubierta plana no transitada (100 kg/m²)', valor_kg_m2: 100 },
  { id: 'vivienda', label: 'Entrepiso vivienda (200 kg/m²)', valor_kg_m2: 200 },
  { id: 'oficinas', label: 'Oficinas (250 kg/m²)', valor_kg_m2: 250 },
  { id: 'azotea', label: 'Azotea / Terraza transitable (300 kg/m²)', valor_kg_m2: 300 },
  { id: 'balcon_reuniones', label: 'Balcón / Reuniones / Comedor (500 kg/m²)', valor_kg_m2: 500 },
  { id: 'personalizada', label: 'Personalizada', valor_kg_m2: 100 },
];

export interface CiudadClima {
  id: string;
  nombre: string;
  viento_m_s: number;
  nieve_kg_m2: number;
}

// Datos de viento (CIRSOC 102) y nieve (CIRSOC 104) extraídos del Apunte ConsulSteel 2021 (págs. 15 y 17)
export const CIUDADES_ARGENTINA: CiudadClima[] = [
  { id: 'buenos_aires', nombre: 'Buenos Aires', viento_m_s: 45, nieve_kg_m2: 0 },
  { id: 'cordoba', nombre: 'Córdoba', viento_m_s: 45, nieve_kg_m2: 30 },
  { id: 'rosario', nombre: 'Rosario', viento_m_s: 50, nieve_kg_m2: 0 },
  { id: 'mendoza', nombre: 'Mendoza', viento_m_s: 39, nieve_kg_m2: 30 },
  { id: 'la_plata', nombre: 'La Plata', viento_m_s: 46, nieve_kg_m2: 0 },
  { id: 'mar_del_plata', nombre: 'Mar del Plata', viento_m_s: 51, nieve_kg_m2: 0 },
  { id: 'bahia_blanca', nombre: 'Bahía Blanca', viento_m_s: 55, nieve_kg_m2: 0 },
  { id: 'santa_fe', nombre: 'Santa Fe', viento_m_s: 51, nieve_kg_m2: 0 },
  { id: 'parana', nombre: 'Paraná', viento_m_s: 52, nieve_kg_m2: 0 },
  { id: 'neuquen', nombre: 'Neuquén', viento_m_s: 48, nieve_kg_m2: 90 },
  { id: 'bariloche', nombre: 'Bariloche', viento_m_s: 46, nieve_kg_m2: 200 },
  { id: 'comodoro_rivadavia', nombre: 'Comodoro Rivadavia', viento_m_s: 67.5, nieve_kg_m2: 0 },
  { id: 'rio_gallegos', nombre: 'Río Gallegos', viento_m_s: 60, nieve_kg_m2: 45 },
  { id: 'ushuaia', nombre: 'Ushuaia', viento_m_s: 60, nieve_kg_m2: 100 },
  { id: 'rawson', nombre: 'Rawson', viento_m_s: 60, nieve_kg_m2: 0 },
  { id: 'viedma', nombre: 'Viedma', viento_m_s: 60, nieve_kg_m2: 0 },
  { id: 'santa_rosa', nombre: 'Santa Rosa', viento_m_s: 50, nieve_kg_m2: 0 },
  { id: 'corrientes', nombre: 'Corrientes', viento_m_s: 46, nieve_kg_m2: 0 },
  { id: 'resistencia', nombre: 'Resistencia', viento_m_s: 45, nieve_kg_m2: 0 },
  { id: 'posadas', nombre: 'Posadas', viento_m_s: 45, nieve_kg_m2: 0 },
  { id: 'formosa', nombre: 'Formosa', viento_m_s: 45, nieve_kg_m2: 0 },
  { id: 'san_luis', nombre: 'San Luis', viento_m_s: 45, nieve_kg_m2: 0 },
  { id: 'la_rioja', nombre: 'La Rioja', viento_m_s: 44, nieve_kg_m2: 0 },
  { id: 'catamarca', nombre: 'Catamarca', viento_m_s: 43, nieve_kg_m2: 0 },
  { id: 'santiago_del_estero', nombre: 'Santiago del Estero', viento_m_s: 43, nieve_kg_m2: 0 },
  { id: 'san_juan', nombre: 'San Juan', viento_m_s: 40, nieve_kg_m2: 0 },
  { id: 'tucuman', nombre: 'San Miguel de Tucumán', viento_m_s: 40, nieve_kg_m2: 0 },
  { id: 'salta', nombre: 'Salta', viento_m_s: 35, nieve_kg_m2: 0 },
  { id: 'jujuy', nombre: 'San Salvador de Jujuy', viento_m_s: 34, nieve_kg_m2: 0 },
  { id: 'personalizada', nombre: 'Otra ubicación (manual)', viento_m_s: 45, nieve_kg_m2: 0 },
];

export const ZONAS_VIENTO: Record<
  DatosEntrada['zonaViento'],
  { label: string; velocidad_m_s: number }
> = {
  zona_1: { label: 'Zona I — Norte / Centro-Oeste (40 m/s)', velocidad_m_s: 40 },
  zona_2: { label: 'Zona II — AMBA / Litoral / Centro (45 m/s)', velocidad_m_s: 45 },
  zona_3: { label: 'Zona III — Costa Atlántica / Centro-Sur (50 m/s)', velocidad_m_s: 50 },
  zona_4: { label: 'Zona IV — Patagonia (60 m/s)', velocidad_m_s: 60 },
  personalizada: { label: 'Velocidad personalizada', velocidad_m_s: 45 },
};

// Coeficiente de exposición Kz aproximado (CIRSOC 102 para altura media h ≈ 6 m)
const FACTOR_EXPOSICION_KZ: Record<DatosEntrada['exposicionViento'], number> = {
  B: 0.7, // Urbana / suburbana
  C: 0.9, // Campo abierto / terreno plano
  D: 1.08, // Costa / terrenos despejados frente al mar
};

/**
 * Calcula las cargas superficiales, combinaciones ASD (gravitatorias, presión y succión de viento)
 * y convierte a carga lineal por viga y por perfil según cantidad y vinculación.
 */
export function calcularCargas(entrada: DatosEntrada): ResultadoCargas {
  const D = Math.max(0, entrada.pesoCubierta_kg_m2);
  const E = Math.max(0, entrada.pesoEntrepiso_kg_m2);
  const L = Math.max(0, entrada.sobrecarga_kg_m2);
  const N = Math.max(0, entrada.nieve_kg_m2);
  const margen = Math.max(0.5, entrada.margenCalculo);
  const Ainf = Math.max(0.05, entrada.areaInfluencia_m);
  const cargaManual = Math.max(0, entrada.cargaManual_kg_m2);

  // Presión dinámica del viento según CIRSOC 102:
  // q_z [N/m²] = 0.613 × K_z × K_zt × K_d × V²  (tomamos K_zt=1.0, K_d=0.85 para vigas/cubiertas)
  // En kg/m²: dividir N/m² por 9.80665
  const Kz = FACTOR_EXPOSICION_KZ[entrada.exposicionViento];
  const Kd = 0.85;
  const V = Math.max(0, entrada.velocidadViento_m_s);
  const q_dinamica_N_m2 = 0.613 * Kz * Kd * V * V;
  const q_viento_dinamica_kg_m2 = q_dinamica_N_m2 / 9.80665;

  // Presión (descendente) y Succión (ascendente) usando factor de ráfaga G = 0.85 y Cp
  const G = 0.85;
  const W_presion_kg_m2 = q_viento_dinamica_kg_m2 * G * Math.max(0, entrada.cpPresion);
  const W_succion_kg_m2 = q_viento_dinamica_kg_m2 * G * Math.max(0, entrada.cpSuccion);

  // Carga gravitatoria base q = (D + E + L + N) × margen (con eventual carga manual)
  const sumaBase =
    entrada.modoCargaManual === 'reemplazar' && cargaManual > 0
      ? cargaManual
      : D + E + L + N + cargaManual;
  const q_gravitatoria_base_kg_m2 = sumaBase * margen;

  // Justificación de reparto en perfil doble (apartado 4):
  // Solo se distribuye 50/50 cuando está vinculada la dupla para trabajar en conjunto.
  const trabajoConjuntoJustificado =
    entrada.cantidadPerfiles === 1 || entrada.vinculacionDoble !== 'sin_vinculacion';
  const factorDistribucionPerfil =
    entrada.cantidadPerfiles === 2 && trabajoConjuntoJustificado ? 0.5 : 1.0;

  const notaDistribucion =
    entrada.cantidadPerfiles === 1
      ? 'Perfil simple: toma el 100% de la carga lineal del área de influencia.'
      : trabajoConjuntoJustificado
        ? `Perfil doble (${entrada.vinculacionDoble === 'espalda_vinculado' ? 'espalda con espalda vinculados' : 'cajón vinculado'}): vinculación continua justificada, cada perfil toma el 50% de las acciones.`
        : 'Perfil doble SIN vinculación asegurada: no se justifica reparto equitativo; el sistema exige verificar/alertar (estado PENDIENTE de vinculación o carga íntegra en un perfil).';

  const crearComb = (
    id: string,
    nombre: string,
    descripcion: string,
    formulaTexto: string,
    q_sup_kg_m2: number,
    sentido: CombinacionCarga['sentido'],
    tipo: CombinacionCarga['tipo']
  ): CombinacionCarga => {
    const w_total_kg_m = q_sup_kg_m2 * Ainf;
    const w_total_kg_cm = w_total_kg_m / 100;
    return {
      id,
      nombre,
      descripcion,
      formulaTexto,
      q_superficial_kg_m2: q_sup_kg_m2,
      w_lineal_total_kg_m: w_total_kg_m,
      w_lineal_total_kg_cm: w_total_kg_cm,
      w_por_perfil_kg_m: w_total_kg_m * factorDistribucionPerfil,
      w_por_perfil_kg_cm: w_total_kg_cm * factorDistribucionPerfil,
      sentido,
      tipo,
    };
  };

  // Evaluamos combinaciones ASD estándar (incluyendo signos y acciones favorables/desfavorables)
  const c1_q = q_gravitatoria_base_kg_m2;
  const c2_q =
    entrada.modoCargaManual === 'reemplazar' && cargaManual > 0
      ? (cargaManual + 0.75 * W_presion_kg_m2) * margen
      : (D + E + 0.75 * L + 0.75 * N + 0.75 * W_presion_kg_m2 + cargaManual) * margen;
  const c3_q_directa_viento =
    entrada.modoCargaManual === 'reemplazar' && cargaManual > 0
      ? (cargaManual + W_presion_kg_m2) * margen
      : (D + E + W_presion_kg_m2 + cargaManual) * margen;

  // Combinación de succión / levantamiento: peso muerto favorable (0.6 D + 0.6 E) contra succión de viento (-W_succion)
  const cargaPermanenteFavorable =
    entrada.modoCargaManual === 'reemplazar' && cargaManual > 0
      ? 0.6 * cargaManual
      : 0.6 * (D + E);
  const c4_q_succion = (cargaPermanenteFavorable - W_succion_kg_m2) * margen;

  const combinaciones: CombinacionCarga[] = [
    crearComb(
      'C1',
      'C1 · Gravitatoria Total',
      'Carga permanente + entrepiso + sobrecarga + nieve',
      'q = (D + E + L + N + Manual) × margen',
      c1_q,
      c1_q >= 0 ? 'descendente' : 'ascendente',
      'resistencia'
    ),
    crearComb(
      'C2',
      'C2 · Gravitatoria + Presión de Viento (0.75)',
      'Simultaneidad ASD de sobrecarga, nieve y presión de viento',
      'q = (D + E + 0.75·L + 0.75·N + 0.75·Wp + Manual) × margen',
      c2_q,
      c2_q >= 0 ? 'descendente' : 'ascendente',
      'resistencia'
    ),
    crearComb(
      'C3',
      'C3 · Permanente + Presión Plena de Viento',
      'Peso propio + 100% presión de viento descendente',
      'q = (D + E + Wp + Manual) × margen',
      c3_q_directa_viento,
      c3_q_directa_viento >= 0 ? 'descendente' : 'ascendente',
      'resistencia'
    ),
    crearComb(
      'C4',
      'C4 · Succión de Viento (Levantamiento)',
      'Peso propio favorable reducido (0.6×) vs succión ascendente',
      'q = (0.6·(D + E) − Ws) × margen',
      c4_q_succion,
      c4_q_succion < 0 ? 'ascendente' : 'descendente',
      'resistencia'
    ),
    crearComb(
      'C_SERV',
      'Servicio · Deformación',
      'Envolvente de servicio para verificación de flecha admisible L/350',
      'q_serv = máx(C1, C2, C3)',
      Math.max(c1_q, c2_q, c3_q_directa_viento, Math.abs(c4_q_succion)),
      'descendente',
      'servicio'
    ),
  ];

  const combsResistencia = combinaciones.filter((c) => c.tipo === 'resistencia');
  const combCriticaResistencia = combsResistencia.reduce((prev, curr) =>
    Math.abs(curr.w_lineal_total_kg_cm) > Math.abs(prev.w_lineal_total_kg_cm) ? curr : prev
  );

  const combCriticaServicio = combinaciones.find((c) => c.id === 'C_SERV')!;

  return {
    D_kg_m2: D,
    E_kg_m2: E,
    L_kg_m2: L,
    N_kg_m2: N,
    q_viento_dinamica_kg_m2,
    W_presion_kg_m2,
    W_succion_kg_m2,
    q_gravitatoria_base_kg_m2,
    combinaciones,
    combCriticaResistencia,
    combCriticaServicio,
    factorDistribucionPerfil,
    trabajoConjuntoJustificado,
    notaDistribucion,
  };
}
