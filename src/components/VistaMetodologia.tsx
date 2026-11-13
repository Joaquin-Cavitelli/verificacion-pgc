import React from 'react';

export const VistaMetodologia: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-6">
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          Metodología de Cálculo y Verificación Estructural (PGC Barbieri)
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Este sistema evalúa vigas simplemente apoyadas conformadas por perfiles C galvanizados
          de acero grado ZAR 250 (IRAM IAS U 500-214 / 205), integrando las fórmulas clásicas de
          resistencia de materiales con los criterios de inestabilidad local y pandeo de almas
          establecidos por AISI S100 / CIRSOC 303 para elementos conformados en frío.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <h3 className="text-sm font-semibold text-slate-900">
              1. Reconstrucción Geométrica y Momento Estático Q
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              La sección transversal se subdivide por encima del eje neutro horizontal x-x en cinco
              sub-figuras sin áreas superpuestas: mitad superior del alma recta, codo alma-ala, ala
              superior recta, codo ala-pestaña y pestaña superior recta. Los codos se modelan como
              cuartos de corona circular de radio interno ri = R y radio externo ro = R + e.
            </p>
            <div className="font-mono text-xs bg-slate-50 border border-slate-200 rounded p-2.5 text-slate-800">
              Q = Σ (Ai × yi) [cm³]
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-3">
            <h3 className="text-sm font-semibold text-slate-900">
              2. Combinaciones de Carga y Reparto
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Se evalúan combinaciones ASD gravitatorias, simultaneidad con presión de viento (+W) y
              levantamiento por succión (-W contra 0.6× carga permanente). La carga superficial q
              (kg/m²) se multiplica por el área de influencia Ainf (m) para obtener w (kg/m) y se
              divide por 100 a kg/cm. En perfiles dobles solo se reparte 50/50 cuando la vinculación
              continua garantiza el trabajo conjunto.
            </p>
            <div className="font-mono text-xs bg-slate-50 border border-slate-200 rounded p-2.5 text-slate-800">
              w [kg/cm] = (q [kg/m²] × Ainf [m]) / 100
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-3">
            <h3 className="text-sm font-semibold text-slate-900">
              3. Verificación a Flexión (Propiedades Brutas y Efectivas)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Con Mmáx = w·L² / 8 y Fadm = (fy · 10.1972) / Ω (por defecto Ω = 1.60), se exige que
              tanto el módulo resistente bruto Wx del catálogo como el módulo resistente efectivo
              Wx,eff (calculado por el Método de Ancho Efectivo de Winter para ala comprimida con
              pestaña rigidizadora y alma bajo gradiente) superen Wx,req. Si Lb &gt; 0, se
              verifica además pandeo lateral-torsional (LTB).
            </p>
            <div className="font-mono text-xs bg-slate-50 border border-slate-200 rounded p-2.5 text-slate-800">
              Wx,req = Mmáx / Fadm ; Wx,eff ≥ Wx,req
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-3">
            <h3 className="text-sm font-semibold text-slate-900">
              4. Deformación y Corte / Alma Conformada en Frío
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              La flecha se controla frente al límite L/350 utilizando E = 2.100.000 kg/cm² e inercia
              efectiva bajo carga de servicio. A corte, se calcula el flujo de corte q = Vmáx·Q/Jx y
              la tensión tangencial τ = Vmáx·Q/(Jx·t), complementado obligatoriamente con el pandeo
              por corte del alma (AISI S100 G2 según h/t) y la abolladura localizada en apoyo N (AISI
              S100 G5). Si faltan datos de apoyo o vinculación, el perfil queda como PENDIENTE.
            </p>
            <div className="font-mono text-xs bg-slate-50 border border-slate-200 rounded p-2.5 text-slate-800">
              Ix,req = 5·w·L⁴ / (384·E·δadm) ; τ = (Vmáx·Q) / (Jx·t)
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
