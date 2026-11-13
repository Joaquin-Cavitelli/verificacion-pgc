import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  CIUDADES_ARGENTINA,
  PRESETS_CUBIERTA,
  PRESETS_ENTREPISO,
  PRESETS_SOBRECARGA,
} from '../calc/cargas';
import type {
  DatosEntrada,
  ExposicionViento,
  ResultadoCargas,
  TipoCubierta,
  TipoEntrepiso,
  VinculacionDoble,
} from '../calc/types';

interface FormularioCargasProps {
  entrada: DatosEntrada;
  cargas: ResultadoCargas;
  onChange: (nuevo: DatosEntrada) => void;
}

export const FormularioCargas: React.FC<FormularioCargasProps> = ({
  entrada,
  cargas,
  onChange,
}) => {
  const [mostrarAvanzado, setMostrarAvanzado] = useState(false);

  const update = <K extends keyof DatosEntrada>(key: K, value: DatosEntrada[K]) => {
    onChange({ ...entrada, [key]: value });
  };

  const handleCiudadChange = (ciudadId: string) => {
    const ciudad = CIUDADES_ARGENTINA.find((c) => c.id === ciudadId);
    if (!ciudad || ciudadId === 'personalizada') {
      update('ciudadUbicacion', 'personalizada');
      return;
    }
    onChange({
      ...entrada,
      ciudadUbicacion: ciudad.id,
      zonaViento: 'personalizada',
      velocidadViento_m_s: ciudad.viento_m_s,
      nieve_kg_m2: ciudad.nieve_kg_m2,
    });
  };

  const handleCubiertaChange = (tipo: TipoCubierta) => {
    onChange({
      ...entrada,
      tipoCubierta: tipo,
      pesoCubierta_kg_m2:
        tipo === 'personalizada'
          ? entrada.pesoCubierta_kg_m2
          : PRESETS_CUBIERTA[tipo].peso_kg_m2,
    });
  };

  const handleEntrepisoChange = (tipo: TipoEntrepiso) => {
    onChange({
      ...entrada,
      tipoEntrepiso: tipo,
      pesoEntrepiso_kg_m2:
        tipo === 'personalizado'
          ? entrada.pesoEntrepiso_kg_m2
          : PRESETS_ENTREPISO[tipo].peso_kg_m2,
    });
  };

  const handleSobrecargaPresetChange = (id: string) => {
    const preset = PRESETS_SOBRECARGA.find((p) => p.id === id);
    if (!preset || id === 'personalizada') {
      update('tipoSobrecarga', 'personalizada');
      return;
    }
    onChange({
      ...entrada,
      tipoSobrecarga: preset.id,
      sobrecarga_kg_m2: preset.valor_kg_m2,
    });
  };

  const inputCls =
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15';
  const selectCls =
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15';
  const labelCls = 'block text-xs font-medium text-slate-700 mb-1';

  return (
    <aside className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
      {/* Paso 1: Medidas de la viga */}
      <div className="p-4 space-y-3.5">
        <h2 className="text-sm font-semibold text-slate-900">1. Medidas de la viga</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="luz_m" className={labelCls}>
              Luz libre (m)
            </label>
            <input
              id="luz_m"
              type="number"
              min={0.5}
              max={15}
              step={0.1}
              value={entrada.luz_m}
              onChange={(e) => update('luz_m', Math.max(0.5, Number(e.target.value) || 0.5))}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="areaInf_m" className={labelCls}>
              Separación / Ancho (m)
            </label>
            <input
              id="areaInf_m"
              type="number"
              min={0.1}
              max={10}
              step={0.05}
              value={entrada.areaInfluencia_m}
              onChange={(e) =>
                update('areaInfluencia_m', Math.max(0.1, Number(e.target.value) || 0.1))
              }
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <span className={labelCls}>Disposición de perfiles</span>
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-md">
            <button
              type="button"
              onClick={() => update('cantidadPerfiles', 1)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                entrada.cantidadPerfiles === 1
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Simple (1 perfil)
            </button>
            <button
              type="button"
              onClick={() => update('cantidadPerfiles', 2)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                entrada.cantidadPerfiles === 2
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Doble (2 perfiles)
            </button>
          </div>
        </div>

        {entrada.cantidadPerfiles === 2 && (
          <div>
            <label htmlFor="vinculacionDoble" className={labelCls}>
              Vinculación del perfil doble
            </label>
            <select
              id="vinculacionDoble"
              value={entrada.vinculacionDoble}
              onChange={(e) => update('vinculacionDoble', e.target.value as VinculacionDoble)}
              className={selectCls}
            >
              <option value="espalda_vinculado">
                Espalda con espalda (I) vinculados
              </option>
              <option value="cajon_vinculado">
                Cajón cerrado / Viga tubo vinculados
              </option>
              <option value="sin_vinculacion">
                Sin vinculación asegurada
              </option>
            </select>
            {entrada.vinculacionDoble === 'cajon_vinculado' && (
              <p className="mt-1 text-[11px] text-slate-500">
                Armado recomendado ConsulSteel: 2 PGC + 2 PGU de cierre (esp. mín. 0,90 mm).
              </p>
            )}
          </div>
        )}

        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={entrada.esCorreaInclinada}
            onChange={(e) => update('esCorreaInclinada', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
          />
          <span>Correa sobre techo inclinado (-30% capacidad a flexión)</span>
        </label>
      </div>

      {/* Paso 2: Cargas principales */}
      <div className="p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">2. Cargas y Ubicación</h2>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {cargas.q_gravitatoria_base_kg_m2.toFixed(0)} kg/m²
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="ciudadUbicacion" className={labelCls}>
              Ciudad (Viento + Nieve)
            </label>
            <select
              id="ciudadUbicacion"
              value={entrada.ciudadUbicacion}
              onChange={(e) => handleCiudadChange(e.target.value)}
              className={selectCls}
            >
              {CIUDADES_ARGENTINA.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {c.id !== 'personalizada'
                    ? ` (${c.viento_m_s} m/s${c.nieve_kg_m2 > 0 ? ` · ${c.nieve_kg_m2} kg/m²` : ''})`
                    : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="exposicion" className={labelCls}>
              Exposición al viento
            </label>
            <select
              id="exposicion"
              value={entrada.exposicionViento}
              onChange={(e) =>
                update('exposicionViento', e.target.value as ExposicionViento)
              }
              className={selectCls}
            >
              <option value="B">B · Urbana</option>
              <option value="C">C · Campo abierto</option>
              <option value="D">D · Costa</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="tipoCubierta" className={labelCls}>
            Cubierta (D = {entrada.pesoCubierta_kg_m2} kg/m²)
          </label>
          <select
            id="tipoCubierta"
            value={entrada.tipoCubierta}
            onChange={(e) => handleCubiertaChange(e.target.value as TipoCubierta)}
            className={selectCls}
          >
            {Object.entries(PRESETS_CUBIERTA).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tipoEntrepiso" className={labelCls}>
            Entrepiso (E = {entrada.pesoEntrepiso_kg_m2} kg/m²)
          </label>
          <select
            id="tipoEntrepiso"
            value={entrada.tipoEntrepiso}
            onChange={(e) => handleEntrepisoChange(e.target.value as TipoEntrepiso)}
            className={selectCls}
          >
            {Object.entries(PRESETS_ENTREPISO).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tipoSobrecarga" className={labelCls}>
            Destino / Sobrecarga CIRSOC 101 (L = {entrada.sobrecarga_kg_m2} kg/m²)
          </label>
          <select
            id="tipoSobrecarga"
            value={entrada.tipoSobrecarga}
            onChange={(e) => handleSobrecargaPresetChange(e.target.value)}
            className={selectCls}
          >
            {PRESETS_SOBRECARGA.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ajustes avanzados (colapsado por defecto) */}
      <div>
        <button
          type="button"
          onClick={() => setMostrarAvanzado((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <span className="text-xs font-semibold text-slate-700">
            Ajustes avanzados (valores manuales, apoyo, coeficientes)
          </span>
          {mostrarAvanzado ? (
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          )}
        </button>

        {mostrarAvanzado && (
          <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100 bg-slate-50/50">
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label htmlFor="pesoCubierta" className={labelCls}>
                  Cubierta D (kg/m²)
                </label>
                <input
                  id="pesoCubierta"
                  type="number"
                  min={0}
                  step={1}
                  value={entrada.pesoCubierta_kg_m2}
                  onChange={(e) =>
                    onChange({
                      ...entrada,
                      tipoCubierta: 'personalizada',
                      pesoCubierta_kg_m2: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="pesoEntrepiso" className={labelCls}>
                  Entrepiso E (kg/m²)
                </label>
                <input
                  id="pesoEntrepiso"
                  type="number"
                  min={0}
                  step={1}
                  value={entrada.pesoEntrepiso_kg_m2}
                  onChange={(e) =>
                    onChange({
                      ...entrada,
                      tipoEntrepiso: 'personalizado',
                      pesoEntrepiso_kg_m2: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sobrecarga" className={labelCls}>
                  Sobrecarga L (kg/m²)
                </label>
                <input
                  id="sobrecarga"
                  type="number"
                  min={0}
                  step={5}
                  value={entrada.sobrecarga_kg_m2}
                  onChange={(e) =>
                    onChange({
                      ...entrada,
                      tipoSobrecarga: 'personalizada',
                      sobrecarga_kg_m2: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="nieve" className={labelCls}>
                  Nieve N (kg/m²)
                </label>
                <input
                  id="nieve"
                  type="number"
                  min={0}
                  step={5}
                  value={entrada.nieve_kg_m2}
                  onChange={(e) =>
                    onChange({
                      ...entrada,
                      ciudadUbicacion: 'personalizada',
                      nieve_kg_m2: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="margen" className={labelCls}>
                  Margen de cálculo (×)
                </label>
                <input
                  id="margen"
                  type="number"
                  min={0.8}
                  max={2}
                  step={0.05}
                  value={entrada.margenCalculo}
                  onChange={(e) =>
                    update('margenCalculo', Math.max(0.8, Number(e.target.value) || 1.0))
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="cargaManual" className={labelCls}>
                  Carga manual (kg/m²)
                </label>
                <input
                  id="cargaManual"
                  type="number"
                  min={0}
                  step={5}
                  value={entrada.cargaManual_kg_m2}
                  onChange={(e) =>
                    update('cargaManual_kg_m2', Math.max(0, Number(e.target.value) || 0))
                  }
                  className={inputCls}
                />
              </div>
            </div>

            {entrada.cargaManual_kg_m2 > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Carga manual:</span>
                <button
                  type="button"
                  onClick={() =>
                    update(
                      'modoCargaManual',
                      entrada.modoCargaManual === 'sumar' ? 'reemplazar' : 'sumar'
                    )
                  }
                  className="font-medium text-blue-700 hover:underline"
                >
                  {entrada.modoCargaManual === 'sumar'
                    ? 'Sumar a las cargas'
                    : 'Reemplazar carga base'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="velViento" className={labelCls}>
                  Viento (m/s)
                </label>
                <input
                  id="velViento"
                  type="number"
                  min={0}
                  max={90}
                  step={0.5}
                  value={entrada.velocidadViento_m_s}
                  onChange={(e) =>
                    onChange({
                      ...entrada,
                      ciudadUbicacion: 'personalizada',
                      zonaViento: 'personalizada',
                      velocidadViento_m_s: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="cpPresion" className={labelCls}>
                  Cp presión
                </label>
                <input
                  id="cpPresion"
                  type="number"
                  min={0}
                  max={2}
                  step={0.05}
                  value={entrada.cpPresion}
                  onChange={(e) =>
                    update('cpPresion', Math.max(0, Number(e.target.value) || 0))
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="cpSuccion" className={labelCls}>
                  Cp succión
                </label>
                <input
                  id="cpSuccion"
                  type="number"
                  min={0}
                  max={2.5}
                  step={0.05}
                  value={entrada.cpSuccion}
                  onChange={(e) =>
                    update('cpSuccion', Math.max(0, Number(e.target.value) || 0))
                  }
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="lb_m" className={labelCls}>
                  Luz no arriostrada Lb (m)
                </label>
                <input
                  id="lb_m"
                  type="number"
                  min={0}
                  max={15}
                  step={0.1}
                  value={entrada.longitudNoArriostrada_m}
                  onChange={(e) =>
                    update('longitudNoArriostrada_m', Math.max(0, Number(e.target.value) || 0))
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="apoyo_mm" className="text-xs font-medium text-slate-700">
                    Apoyo N (mm)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      update('longitudApoyo_mm', entrada.longitudApoyo_mm === null ? 50 : null)
                    }
                    className="text-[11px] text-blue-700 hover:underline"
                  >
                    {entrada.longitudApoyo_mm === null ? 'Definir' : 'Omitir'}
                  </button>
                </div>
                {entrada.longitudApoyo_mm !== null ? (
                  <input
                    id="apoyo_mm"
                    type="number"
                    min={20}
                    max={300}
                    step={5}
                    value={entrada.longitudApoyo_mm}
                    onChange={(e) =>
                      update('longitudApoyo_mm', Math.max(20, Number(e.target.value) || 50))
                    }
                    className={inputCls}
                  />
                ) : (
                  <div className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                    Sin dato (PENDIENTE)
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="fy_MPa" className={labelCls}>
                  fy (MPa)
                </label>
                <input
                  id="fy_MPa"
                  type="number"
                  min={150}
                  max={450}
                  step={5}
                  value={entrada.fy_MPa}
                  onChange={(e) =>
                    update('fy_MPa', Math.max(150, Number(e.target.value) || 250))
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="omegaFlex" className={labelCls}>
                  Coef. Ω
                </label>
                <input
                  id="omegaFlex"
                  type="number"
                  min={1.0}
                  max={2.5}
                  step={0.05}
                  value={entrada.coefSeguridadFlexion}
                  onChange={(e) =>
                    update(
                      'coefSeguridadFlexion',
                      Math.max(1.0, Number(e.target.value) || 1.6)
                    )
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="flechaDiv" className={labelCls}>
                  Flecha L /
                </label>
                <input
                  id="flechaDiv"
                  type="number"
                  min={150}
                  max={600}
                  step={10}
                  value={entrada.coefFlechaAdmisible}
                  onChange={(e) =>
                    update(
                      'coefFlechaAdmisible',
                      Math.max(150, Number(e.target.value) || 350)
                    )
                  }
                  className={inputCls}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={entrada.incluirPesoPropio}
                onChange={(e) => update('incluirPesoPropio', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>Sumar peso propio del perfil (kg/m)</span>
            </label>
          </div>
        )}
      </div>
    </aside>
  );
};
