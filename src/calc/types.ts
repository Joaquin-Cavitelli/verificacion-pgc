export interface PerfilPGC {
  nombre: string;
  A_mm: number;
  B_mm: number;
  C_mm: number;
  e_mm: number;
  R_mm: number;
  area_cm2: number;
  peso_kg_m: number;
  xg_cm: number;
  Jx_cm4: number;
  Jy_cm4: number;
  Wx_cm3: number;
  Wy_cm3: number;
  Rx_cm: number;
  Ry_cm: number;
}

export interface SubAreaQ {
  id: string;
  nombre: string;
  formulaDesc: string;
  area_mm2: number;
  area_cm2: number;
  yi_mm: number;
  yi_cm: number;
  Qi_mm3: number;
  Qi_cm3: number;
}

export interface PropiedadesEfectivas {
  f_Mpa: number;
  wf_mm: number;
  ds_mm: number;
  hw_mm: number;
  esbeltezAla_wf_e: number;
  k_ala: number;
  lambda_ala: number;
  rho_ala: number;
  b_eff_ala_mm: number;
  rho_pestana: number;
  d_eff_pest_mm: number;
  lambda_alma: number;
  b1_alma_mm: number;
  b2_alma_mm: number;
  almaTotalmenteEfectiva: boolean;
  y_cg_eff_desde_traccion_mm: number;
  Jx_eff_cm4: number;
  Wx_eff_cm3: number;
  relacionEfectiva_Wx: number;
  relacionEfectiva_Jx: number;
}

export interface GeometriaReconstruida {
  perfil: PerfilPGC;
  ri_mm: number;
  rm_mm: number;
  ro_mm: number;
  hAlmaRecta_mm: number;
  wAlaRecta_mm: number;
  hPestanaRecta_mm: number;
  subAreasSuperiores: SubAreaQ[];
  Q_max_cm3: number;
  Q_unionAlaAlma_cm3: number;
  area_calc_cm2: number;
  xg_calc_cm: number;
  Jx_calc_cm4: number;
  Jy_calc_cm4: number;
  Wx_calc_cm3: number;
  errorArea_pct: number;
  errorXg_pct: number;
  errorJx_pct: number;
  errorJy_pct: number;
  exactitud: 'EXACTO' | 'APROXIMADO';
  notaValidacion: string;
  documentacionQ: string;
  efectivas: PropiedadesEfectivas;
}

export type TipoCubierta =
  | 'chapa_inclinada'
  | 'teja_inclinada'
  | 'plana_liviana'
  | 'plana_pesada'
  | 'ninguna'
  | 'personalizada';

export type TipoEntrepiso =
  | 'ninguno'
  | 'seco_sin_cementicia'
  | 'seco_con_cementicia'
  | 'humedo_160'
  | 'terraza_humeda_200'
  | 'personalizado';

export type ZonaViento =
  | 'zona_1'
  | 'zona_2'
  | 'zona_3'
  | 'zona_4'
  | 'personalizada';

export type ExposicionViento = 'B' | 'C' | 'D';

export type CantidadPerfiles = 1 | 2;

export type VinculacionDoble =
  | 'espalda_vinculado'
  | 'cajon_vinculado'
  | 'sin_vinculacion';

export interface DatosEntrada {
  // Ubicación (ConsulSteel / CIRSOC 102 & 104)
  ciudadUbicacion: string;

  // Cubierta y entrepiso
  tipoCubierta: TipoCubierta;
  pesoCubierta_kg_m2: number;
  tipoEntrepiso: TipoEntrepiso;
  pesoEntrepiso_kg_m2: number;
  tipoSobrecarga: string;
  sobrecarga_kg_m2: number;
  nieve_kg_m2: number;

  // Viento
  zonaViento: ZonaViento;
  velocidadViento_m_s: number;
  exposicionViento: ExposicionViento;
  cpPresion: number; // positivo descendente
  cpSuccion: number; // positivo representa magnitud de succión ascendente

  // Geometría de viga
  luz_m: number;
  areaInfluencia_m: number;
  cantidadPerfiles: CantidadPerfiles;
  vinculacionDoble: VinculacionDoble;
  incluirPesoPropio: boolean;
  esCorreaInclinada: boolean; // Pág. 7 ConsulSteel: reduce 30% resistencia a flexión

  // Márgenes y carga manual
  margenCalculo: number; // ej. 1.00, 1.10
  cargaManual_kg_m2: number;
  modoCargaManual: 'sumar' | 'reemplazar';

  // Parámetros normativos y de verificación
  fy_MPa: number; // 250 MPa del catálogo
  coefSeguridadFlexion: number; // 1.6 por defecto
  coefFlechaAdmisible: number; // 350 por defecto (L / 350)
  longitudNoArriostrada_m: number; // 0 = arriostramiento continuo por chapa/placa
  longitudApoyo_mm: number | null; // null = falta dato (genera PENDIENTE)
}

export interface CombinacionCarga {
  id: string;
  nombre: string;
  descripcion: string;
  formulaTexto: string;
  q_superficial_kg_m2: number;
  w_lineal_total_kg_m: number;
  w_lineal_total_kg_cm: number;
  w_por_perfil_kg_m: number;
  w_por_perfil_kg_cm: number;
  sentido: 'descendente' | 'ascendente' | 'nulo';
  tipo: 'resistencia' | 'servicio';
}

export interface ResultadoCargas {
  D_kg_m2: number;
  E_kg_m2: number;
  L_kg_m2: number;
  N_kg_m2: number;
  q_viento_dinamica_kg_m2: number;
  W_presion_kg_m2: number;
  W_succion_kg_m2: number;
  q_gravitatoria_base_kg_m2: number;
  combinaciones: CombinacionCarga[];
  combCriticaResistencia: CombinacionCarga;
  combCriticaServicio: CombinacionCarga;
  factorDistribucionPerfil: number;
  trabajoConjuntoJustificado: boolean;
  notaDistribucion: string;
}

export type EstadoVerificacion = 'VERIFICA' | 'NO VERIFICA' | 'PENDIENTE';

export interface PasoCalculo {
  etiqueta: string;
  formula: string;
  valores: string;
  resultado: string;
}

export interface ResultadoFlexion {
  estado: EstadoVerificacion;
  Mmax_por_perfil_kg_cm: number;
  Mmax_por_perfil_kg_m: number;
  Mmax_total_kg_m: number;
  fy_kg_cm2: number;
  Fadm_kg_cm2: number;
  Wx_requerido_cm3: number;
  Wx_bruto_disponible_cm3: number;
  Wx_efectivo_disponible_cm3: number;
  cumpleBruto: boolean;
  cumpleEfectivo: boolean;
  cumpleLTB: boolean;
  ratioDC_bruto: number;
  ratioDC_efectivo: number;
  M_adm_efectivo_kg_cm: number;
  M_adm_LTB_kg_cm: number | null;
  observacion: string;
  pasos: PasoCalculo[];
}

export interface ResultadoDeformacion {
  estado: EstadoVerificacion;
  L_cm: number;
  flechaAdmisible_cm: number;
  flechaAdmisible_mm: number;
  E_kg_cm2: number;
  Ix_requerido_cm4: number;
  Jx_bruto_conjunto_cm4: number;
  Jx_efectivo_conjunto_cm4: number;
  Jx_bruto_perfil_cm4: number;
  flechaCalculada_bruta_cm: number;
  flechaCalculada_bruta_mm: number;
  flechaCalculada_efectiva_cm: number;
  flechaCalculada_efectiva_mm: number;
  ratioDC: number;
  observacion: string;
  pasos: PasoCalculo[];
}

export interface ResultadoCorte {
  estado: EstadoVerificacion;
  Vmax_por_perfil_kg: number;
  Vmax_total_kg: number;
  Q_cm3: number;
  Jx_cm4: number;
  t_cm: number;
  flujoCorte_kg_cm: number;
  tau_trabajo_kg_cm2: number;
  tau_trabajo_MPa: number;
  tau_admisible_basal_kg_cm2: number;
  // Verificación normativa alma conformada en frío (AISI S100 G2 / CIRSOC 303)
  esbeltezAlma_h_t: number;
  zonaPandeoAlma: 'Plástica (fluencia por corte)' | 'Inelástica (pandeo inelástico)' | 'Elástica (pandeo elástico del alma)';
  Vn_norma_kg: number;
  Vadm_norma_kg: number;
  tau_adm_norma_kg_cm2: number;
  cumpleTensionBasal: boolean;
  cumpleNormaAlma: boolean;
  // Interacción flexión + corte y abolladura en apoyo
  interaccionMV: number;
  cumpleInteraccionMV: boolean;
  Padm_apoyo_kg: number | null;
  cumpleApoyo: boolean | null;
  ratioDC: number;
  observacion: string;
  pasos: PasoCalculo[];
}

export interface ResultadoVerificacionPerfil {
  perfil: PerfilPGC;
  geometria: GeometriaReconstruida;
  cargasEfectivasPerfil: {
    w_res_por_perfil_kg_cm: number;
    w_res_por_perfil_kg_m: number;
    w_serv_por_perfil_kg_cm: number;
    w_serv_por_perfil_kg_m: number;
    pesoPropioIncluido_kg_m: number;
  };
  flexion: ResultadoFlexion;
  deformacion: ResultadoDeformacion;
  corte: ResultadoCorte;
  estadoGeneral: EstadoVerificacion;
  motivosNoVerificaOPendiente: string[];
  ratioMaximoDC: number;
  verificaConRigidizadorApoyo: boolean;
  ratioDC_conRigidizador: number | null;
  pesoTotalViga_kg_m: number;
}
