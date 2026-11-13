import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CIUDADES_ARGENTINA } from './cargas';
import type {
  DatosEntrada,
  ResultadoCargas,
  ResultadoVerificacionPerfil,
} from './types';

function pdfText(str: string): string {
  return str
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/δ/g, 'd')
    .replace(/τ/g, 'tau')
    .replace(/Ω/g, 'Omega')
    .replace(/Σ/g, 'Suma')
    .replace(/π/g, 'pi')
    .replace(/ρ/g, 'rho')
    .replace(/⁴/g, '^4')
    .replace(/−/g, '-')
    .replace(/→/g, '->')
    .replace(/∈/g, 'en')
    .replace(/•/g, '-')
    .replace(/·/g, ' - ')
    .replace(/[^\x00-\xFF]/g, '');
}

function getFinalY(doc: jsPDF, fallback: number): number {
  const internal = doc as unknown as { lastAutoTable?: { finalY?: number } };
  return internal.lastAutoTable?.finalY ?? fallback;
}

function ensureSpace(doc: jsPDF, currentY: number, neededHeight: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + neededHeight > pageHeight - 18) {
    doc.addPage();
    return 18;
  }
  return currentY;
}

export function descargarMemoriaPdf(
  entrada: DatosEntrada,
  cargas: ResultadoCargas,
  perfilDetalle: ResultadoVerificacionPerfil,
  top10QueVerifican: ResultadoVerificacionPerfil[]
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  const { perfil, geometria, flexion, deformacion, corte } = perfilDetalle;
  const nombreLimpio = perfil.nombre.replace('(*)', '').trim();
  const ciudadObj = CIUDADES_ARGENTINA.find((c) => c.id === entrada.ciudadUbicacion);
  const ciudadNombre = ciudadObj ? ciudadObj.nombre : 'Personalizada';

  // Encabezado principal
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(pdfText('MEMORIA DE CALCULO ESTRUCTURAL - VIGA PGC BARBIERI'), marginX, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const fechaStr = new Date().toLocaleDateString('es-AR');
  doc.text(
    pdfText(
      `Perfil analizado: PGC ${nombreLimpio} (${entrada.cantidadPerfiles === 2 ? 'Doble' : 'Simple'})  |  Estado: ${perfilDetalle.estadoGeneral}  |  Fecha: ${fechaStr}`
    ),
    marginX,
    18
  );

  let y = 34;

  // Bloque resumen de estado general
  const isOk = perfilDetalle.estadoGeneral === 'VERIFICA';
  const isPending = perfilDetalle.estadoGeneral === 'PENDIENTE';
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(isOk ? 236 : isPending ? 255 : 254, isOk ? 253 : isPending ? 251 : 242, isOk ? 245 : isPending ? 235 : 242);
  doc.roundedRect(marginX, y, contentWidth, 18, 1.5, 1.5, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(
    pdfText(`Perfil: PGC ${nombreLimpio} (${perfil.A_mm}x${perfil.B_mm}x${perfil.C_mm}x${perfil.e_mm.toFixed(2)} mm)`),
    marginX + 4,
    y + 7
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    pdfText(
      `Peso viga: ${perfilDetalle.pesoTotalViga_kg_m.toFixed(2)} kg/m  |  Uso Flexión: ${(flexion.ratioDC_efectivo * 100).toFixed(1)}%  |  Flecha: ${deformacion.flechaCalculada_efectiva_mm.toFixed(2)} / ${deformacion.flechaAdmisible_mm.toFixed(2)} mm  |  Uso Corte: ${(corte.ratioDC * 100).toFixed(1)}%`
    ),
    marginX + 4,
    y + 13.5
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  if (isOk) doc.setTextColor(4, 120, 87);
  else if (isPending) doc.setTextColor(180, 83, 9);
  else doc.setTextColor(190, 18, 60);
  doc.text(pdfText(perfilDetalle.estadoGeneral), pageWidth - marginX - 4, y + 7, {
    align: 'right',
  });

  y += 24;

  // 1. Parámetros de entrada y cargas
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(pdfText('1. Datos de Entrada y Cargas Aplicadas'), marginX, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    head: [['Parámetro', 'Valor', 'Parámetro', 'Valor']],
    body: [
      [
        'Luz de apoyo L',
        `${entrada.luz_m.toFixed(2)} m (${(entrada.luz_m * 100).toFixed(0)} cm)`,
        'Área de influencia',
        `${entrada.areaInfluencia_m.toFixed(2)} m`,
      ],
      [
        'Disposición',
        entrada.cantidadPerfiles === 2
          ? `Doble (${entrada.vinculacionDoble.replace('_', ' ')})`
          : 'Simple (1 perfil)',
        'Correa inclinada (-30%)',
        entrada.esCorreaInclinada ? 'Sí (factor 0.70 en flexión)' : 'No (horizontal / cabio)',
      ],
      [
        'Ubicación / Viento',
        pdfText(`${ciudadNombre} (${entrada.velocidadViento_m_s} m/s, Exp. ${entrada.exposicionViento})`),
        'Nieve (N)',
        `${entrada.nieve_kg_m2.toFixed(1)} kg/m²`,
      ],
      [
        'Cubierta (D)',
        `${entrada.pesoCubierta_kg_m2.toFixed(1)} kg/m²`,
        'Entrepiso (E)',
        `${entrada.pesoEntrepiso_kg_m2.toFixed(1)} kg/m²`,
      ],
      [
        'Sobrecarga (L)',
        `${entrada.sobrecarga_kg_m2.toFixed(1)} kg/m²`,
        'Margen / Carga manual',
        `${entrada.margenCalculo.toFixed(2)}x / ${entrada.cargaManual_kg_m2.toFixed(1)} kg/m²`,
      ],
      [
        'Acero fy / Coef. Omega',
        `${entrada.fy_MPa} MPa / ${entrada.coefSeguridadFlexion.toFixed(2)}`,
        'Flecha adm. / Apoyo N',
        `L/${entrada.coefFlechaAdmisible} / ${entrada.longitudApoyo_mm !== null ? `${entrada.longitudApoyo_mm} mm` : 'Sin dato'}`,
      ],
    ],
  });

  y = getFinalY(doc, y) + 6;
  y = ensureSpace(doc, y, 42);

  // Tabla de combinaciones
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(pdfText('Combinaciones de Carga Evaluadas (ASD)'), marginX, y);
  y += 2.5;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    styles: { fontSize: 7.8, cellPadding: 1.8, textColor: [30, 41, 59] },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    head: [['Combinación', 'Fórmula', 'q (kg/m²)', 'w viga (kg/m)', 'w/perfil (kg/cm)']],
    body: cargas.combinaciones.map((c) => [
      pdfText(c.nombre + (c.id === cargas.combCriticaResistencia.id ? ' [Critica]' : '')),
      pdfText(c.formulaTexto),
      c.q_superficial_kg_m2.toFixed(1),
      c.w_lineal_total_kg_m.toFixed(1),
      `${c.w_por_perfil_kg_cm.toFixed(4)} (${c.sentido})`,
    ]),
  });

  y = getFinalY(doc, y) + 7;
  y = ensureSpace(doc, y, 60);

  // 2. Geometría, Q y Propiedades Efectivas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(
    pdfText('2. Reconstrucción Geométrica, Momento Estático Q y Sección Efectiva'),
    marginX,
    y
  );
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    styles: { fontSize: 7.8, cellPadding: 1.8, textColor: [30, 41, 59] },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    head: [['Sub-figura superior (y >= 0)', 'Fórmula geométrica', 'Ai (cm²)', 'yi (cm)', 'Qi = Ai·yi (cm³)']],
    body: [
      ...geometria.subAreasSuperiores.map((sub) => [
        pdfText(sub.nombre),
        pdfText(sub.formulaDesc),
        sub.area_cm2.toFixed(3),
        sub.yi_cm.toFixed(3),
        sub.Qi_cm3.toFixed(3),
      ]),
      [
        'TOTAL MITAD SUPERIOR (Q en E.N.)',
        'Q = Suma(Ai · yi)',
        (geometria.area_calc_cm2 / 2).toFixed(3),
        '-',
        geometria.Q_max_cm3.toFixed(3),
      ],
    ],
  });

  y = getFinalY(doc, y) + 4;
  y = ensureSpace(doc, y, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const resumenGeom = pdfText(
    `Validación vs Catálogo Barbieri (${geometria.exactitud}): Área ${geometria.area_calc_cm2.toFixed(2)} vs ${perfil.area_cm2.toFixed(2)} cm² (${geometria.errorArea_pct.toFixed(2)}%) | Xg ${geometria.xg_calc_cm.toFixed(2)} vs ${perfil.xg_cm.toFixed(2)} cm (${geometria.errorXg_pct.toFixed(2)}%) | Jx ${geometria.Jx_calc_cm4.toFixed(2)} vs ${perfil.Jx_cm4.toFixed(2)} cm^4 (${geometria.errorJx_pct.toFixed(2)}%).`
  );
  const splitGeom = doc.splitTextToSize(resumenGeom, contentWidth);
  doc.text(splitGeom, marginX, y);
  y += splitGeom.length * 4 + 2;

  const resumenEff = pdfText(
    `Propiedades Efectivas (AISI S100): Wx bruto = ${perfil.Wx_cm3.toFixed(2)} cm³ | Wx efectivo = ${geometria.efectivas.Wx_eff_cm3.toFixed(2)} cm³ (rho_ala = ${geometria.efectivas.rho_ala.toFixed(3)}, k = ${geometria.efectivas.k_ala.toFixed(2)}).`
  );
  const splitEff = doc.splitTextToSize(resumenEff, contentWidth);
  doc.text(splitEff, marginX, y);
  y += splitEff.length * 4 + 5;

  // Helper para imprimir secciones de verificación paso a paso
  const renderSeccionVerificacion = (
    titulo: string,
    estado: string,
    observacion: string,
    pasos: ResultadoVerificacionPerfil['flexion']['pasos']
  ) => {
    y = ensureSpace(doc, y, 45);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(pdfText(`${titulo}  [${estado}]`), marginX, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const obsLines = doc.splitTextToSize(pdfText(observacion), contentWidth);
    doc.text(obsLines, marginX, y);
    y += obsLines.length * 3.8 + 1.5;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      theme: 'grid',
      styles: { fontSize: 7.8, cellPadding: 1.8, textColor: [30, 41, 59] },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 45 },
        2: { cellWidth: 60 },
        3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      },
      head: [['Paso', 'Fórmula', 'Sustitución de valores', 'Resultado']],
      body: pasos.map((p) => [
        pdfText(p.etiqueta),
        pdfText(p.formula),
        pdfText(p.valores),
        pdfText(p.resultado),
      ]),
    });

    y = getFinalY(doc, y) + 7;
  };

  renderSeccionVerificacion(
    '3. Verificación a Flexión (Bruta, Efectiva AISI S100 y LTB)',
    flexion.estado,
    flexion.observacion,
    flexion.pasos
  );

  renderSeccionVerificacion(
    `4. Verificación a Deformación (L/${entrada.coefFlechaAdmisible})`,
    deformacion.estado,
    deformacion.observacion,
    deformacion.pasos
  );

  renderSeccionVerificacion(
    '5. Verificación a Corte (Jourawski con Q, Alma AISI S100 y Apoyo)',
    corte.estado,
    corte.observacion,
    corte.pasos
  );

  if (perfilDetalle.verificaConRigidizadorApoyo) {
    y = ensureSpace(doc, y, 22);
    doc.setDrawColor(191, 219, 254);
    doc.setFillColor(239, 246, 255);
    const notaRig = pdfText(
      `ACLARACION - RIGIDIZADOR DE ALMA EN APOYO: Este perfil cumple flexion (${(flexion.ratioDC_efectivo * 100).toFixed(1)}%), deformacion (${(deformacion.ratioDC * 100).toFixed(1)}%) y corte del alma; solo excede la abolladura localizada en apoyo. Colocando un recorte vertical de perfil PGC/PGU atornillado al alma sobre el apoyo, el perfil SI VERIFICA (D/C max. = ${((perfilDetalle.ratioDC_conRigidizador ?? 0) * 100).toFixed(1)}%).`
    );
    const linesRig = doc.splitTextToSize(notaRig, contentWidth - 6);
    const boxH = linesRig.length * 3.8 + 5;
    doc.roundedRect(marginX, y, contentWidth, boxH, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 138);
    doc.text(linesRig, marginX + 3, y + 4.5);
    y += boxH + 6;
  }

  // 6. Top 10 alternativas que verifican
  if (top10QueVerifican.length > 0) {
    y = ensureSpace(doc, y, 45);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(
      pdfText(`6. Alternativas que Verifican (Top ${top10QueVerifican.length} por menor peso)`),
      marginX,
      y
    );
    y += 3;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      theme: 'grid',
      styles: { fontSize: 7.8, cellPadding: 1.8, textColor: [30, 41, 59] },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      head: [
        [
          'Perfil PGC',
          'Peso (kg/m)',
          'Mmáx (kg·m)',
          'Wx,eff / req',
          'Flecha (mm)',
          'Q (cm³)',
          'tau (kg/cm²)',
          'Estado',
        ],
      ],
      body: top10QueVerifican.map((r) => [
        r.perfil.nombre.replace('(*)', ''),
        r.pesoTotalViga_kg_m.toFixed(2),
        r.flexion.Mmax_por_perfil_kg_m.toFixed(1),
        `${r.flexion.Wx_efectivo_disponible_cm3.toFixed(1)} / ${r.flexion.Wx_requerido_cm3.toFixed(1)}`,
        `${r.deformacion.flechaCalculada_efectiva_mm.toFixed(1)} / ${r.deformacion.flechaAdmisible_mm.toFixed(1)}`,
        r.geometria.Q_max_cm3.toFixed(2),
        r.corte.tau_trabajo_kg_cm2.toFixed(1),
        r.estadoGeneral,
      ]),
    });
  }

  // Numeración de páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      pdfText(`PGC Estructural Barbieri - Memoria generada el ${fechaStr}`),
      marginX,
      doc.internal.pageSize.getHeight() - 8
    );
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - marginX,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' }
    );
  }

  const slugPerfil = nombreLimpio.replace(/[^a-zA-Z0-9]+/g, '_');
  doc.save(`Memoria_Calculo_PGC_${slugPerfil}.pdf`);
}
