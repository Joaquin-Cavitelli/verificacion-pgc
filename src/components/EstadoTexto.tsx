import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import type { EstadoVerificacion } from '../calc/types';

interface EstadoTextoProps {
  estado: EstadoVerificacion;
  compacto?: boolean;
}

export const EstadoTexto: React.FC<EstadoTextoProps> = ({ estado, compacto = false }) => {
  if (estado === 'VERIFICA') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{compacto ? 'OK' : 'VERIFICA'}</span>
      </span>
    );
  }
  if (estado === 'NO VERIFICA') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-rose-700 whitespace-nowrap">
        <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{compacto ? 'NO' : 'NO VERIFICA'}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-amber-700 whitespace-nowrap">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>PENDIENTE</span>
    </span>
  );
};
