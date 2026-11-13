import { calcularPropiedadesEfectivas } from './geometriaPerfil';
import type {
  DatosEntrada,
  GeometriaReconstruida,
  PasoCalculo,
  ResultadoDeformacion,
} from './types';

export const E_ACERO_KG_CM2 = 2100000;
const FACTOR_MPA_A_KG_CM2 = 10.1972;

/**
 * Verifica la deformación (flecha) de una viga simplemente apoyada con carga uniformemente distribuida.
 * Para perfiles dobles considera la inercia conjunta según la disposición y vinculación real.
 */
export function verificarDeformacion(
  geometria: GeometriaReconstruida,
  entrada: DatosEntrada,
  w_servicio_total_viga_kg_cm: number,
  trabajoConjuntoJustificado: boolean
): ResultadoDeformacion {
  const { perfil, ri_mm, ro_mm } = geometria;
  const L_cm = entrada.luz_m * 100;
  const divisorFlecha = Math.max(100, entrada.coefFlechaAdmisible);
  const flechaAdmisible_cm = L_cm / divisorFlecha;
  const flechaAdmisible_mm = flechaAdmisible_cm * 10;

  const w_abs = Math.abs(w_servicio_total_viga_kg_cm);

  // IxRequerido = (5 × w × L⁴) / (384 × E × FlechaAdmisible) para la viga completa
  const Ix_requerido_cm4 =
    (5 * w_abs * Math.pow(L_cm, 4)) /
    (384 * E_ACERO_KG_CM2 * flechaAdmisible_cm);

  // Inercia conjunta considerando disposición y vinculación real:
  // Si es doble y vinculado (espalda con espalda o cajón), ambos perfiles comparten deformación respecto del eje X-X común: Jx_conjunto = 2 × Jx.
  // Si es doble sin vinculación asegurada, no se puede garantizar trabajo conjunto (Jx efectivo = 1 × Jx o PENDIENTE).
  const factorInercia =
    entrada.cantidadPerfiles === 2 && trabajoConjuntoJustificado ? 2 : 1;

  // Tensión de servicio en el perfil para calcular I_eff de servicio según AISI S100
  const w_serv_perfil_kg_cm = w_abs / factorInercia;
  const M_serv_kg_cm = (w_serv_perfil_kg_cm * L_cm * L_cm) / 8;
  const f_serv_MPa = Math.min(
    entrada.fy_MPa,
    Math.max(10, M_serv_kg_cm / perfil.Wx_cm3 / FACTOR_MPA_A_KG_CM2)
  );
  const efectivasServicio = calcularPropiedadesEfectivas(
    perfil,
    ri_mm,
    ro_mm,
    entrada.fy_MPa,
    f_serv_MPa
  );

  const Jx_bruto_conjunto_cm4 = perfil.Jx_cm4 * factorInercia;
  const Jx_efectivo_conjunto_cm4 = efectivasServicio.Jx_eff_cm4 * factorInercia;

  const flechaCalculada_bruta_cm =
    (5 * w_abs * Math.pow(L_cm, 4)) /
    (384 * E_ACERO_KG_CM2 * Jx_bruto_conjunto_cm4);
  const flechaCalculada_efectiva_cm =
    (5 * w_abs * Math.pow(L_cm, 4)) /
    (384 * E_ACERO_KG_CM2 * Jx_efectivo_conjunto_cm4);

  const ratioDC = flechaCalculada_efectiva_cm / flechaAdmisible_cm;
  const cumpleBruto = Jx_bruto_conjunto_cm4 >= Ix_requerido_cm4;
  const cumpleEfectivo = Jx_efectivo_conjunto_cm4 >= Ix_requerido_cm4;

  let estado: ResultadoDeformacion['estado'] = 'VERIFICA';
  let observacion = `Flecha calculada (${flechaCalculada_efectiva_cm.toFixed(3)} cm = ${(flechaCalculada_efectiva_cm * 10).toFixed(2)} mm) ≤ flecha admisible L/${divisorFlecha} (${flechaAdmisible_cm.toFixed(3)} cm).`;

  if (!trabajoConjuntoJustificado) {
    estado = 'PENDIENTE';
    observacion =
      'Perfil doble sin vinculación continua especificada: no es válido sumar 2×Jx hasta justificar la vinculación mecánica.';
  } else if (!cumpleBruto) {
    estado = 'NO VERIFICA';
    observacion = `No verifica: inercia conjunta disponible (${Jx_bruto_conjunto_cm4.toFixed(2)} cm⁴) < Ix requerido (${Ix_requerido_cm4.toFixed(2)} cm⁴).`;
  } else if (!cumpleEfectivo) {
    estado = 'NO VERIFICA';
    observacion = `Verifica con inercia bruta, pero excede flecha admisible con inercia efectiva de servicio (${Jx_efectivo_conjunto_cm4.toFixed(2)} cm⁴ < ${Ix_requerido_cm4.toFixed(2)} cm⁴).`;
  }

  const descDisposicion =
    entrada.cantidadPerfiles === 1
      ? 'Perfil simple: Jx,conj = 1 × Jx'
      : trabajoConjuntoJustificado
        ? `Perfil doble (${entrada.vinculacionDoble === 'espalda_vinculado' ? 'espalda con espalda' : 'cajón'}) vinculado continuamente: Jx,conj = 2 × Jx`
        : 'Perfil doble sin vinculación asegurada (no se duplica Jx)';

  const pasos: PasoCalculo[] = [
    {
      etiqueta: '1. Flecha admisible de diseño',
      formula: `δadm = L / ${divisorFlecha}`,
      valores: `${L_cm.toFixed(0)} cm / ${divisorFlecha}`,
      resultado: `${flechaAdmisible_cm.toFixed(3)} cm (${flechaAdmisible_mm.toFixed(2)} mm)`,
    },
    {
      etiqueta: '2. Momento de inercia requerido (viga completa)',
      formula: 'Ix,req = (5 × w_serv × L⁴) / (384 × E × δadm)',
      valores: `(5 × ${w_abs.toFixed(4)} kg/cm × (${L_cm.toFixed(0)} cm)⁴) / (384 × 2.100.000 kg/cm² × ${flechaAdmisible_cm.toFixed(3)} cm)`,
      resultado: `${Ix_requerido_cm4.toFixed(2)} cm⁴`,
    },
    {
      etiqueta: '3. Inercia disponible según disposición',
      formula: descDisposicion,
      valores: `Jx,perfil = ${perfil.Jx_cm4.toFixed(2)} cm⁴ | Jx,eff(f_serv=${f_serv_MPa.toFixed(0)} MPa) = ${efectivasServicio.Jx_eff_cm4.toFixed(2)} cm⁴`,
      resultado: `Jx,conj = ${Jx_bruto_conjunto_cm4.toFixed(2)} cm⁴ (eff: ${Jx_efectivo_conjunto_cm4.toFixed(2)} cm⁴)`,
    },
    {
      etiqueta: '4. Flecha real calculada',
      formula: 'δ = (5 × w_serv × L⁴) / (384 × E × Jx,conj)',
      valores: `Bruta: ${(flechaCalculada_bruta_cm * 10).toFixed(2)} mm | Efectiva: ${(flechaCalculada_efectiva_cm * 10).toFixed(2)} mm vs Adm: ${flechaAdmisible_mm.toFixed(2)} mm`,
      resultado: cumpleEfectivo
        ? `CUMPLE (${(ratioDC * 100).toFixed(1)}%)`
        : `NO CUMPLE (${(ratioDC * 100).toFixed(1)}%)`,
    },
  ];

  return {
    estado,
    L_cm,
    flechaAdmisible_cm,
    flechaAdmisible_mm,
    E_kg_cm2: E_ACERO_KG_CM2,
    Ix_requerido_cm4,
    Jx_bruto_conjunto_cm4,
    Jx_efectivo_conjunto_cm4,
    Jx_bruto_perfil_cm4: perfil.Jx_cm4,
    flechaCalculada_bruta_cm,
    flechaCalculada_bruta_mm: flechaCalculada_bruta_cm * 10,
    flechaCalculada_efectiva_cm,
    flechaCalculada_efectiva_mm: flechaCalculada_efectiva_cm * 10,
    ratioDC,
    observacion,
    pasos,
  };
}
