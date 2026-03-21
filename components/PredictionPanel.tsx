import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AIPrediction } from '@/lib/types';

const dirConfig = {
  UP: { color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: '↑', label: 'SUBE' },
  DOWN: { color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30', icon: '↓', label: 'BAJA' },
  SIDEWAYS: { color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30', icon: '→', label: 'LATERAL' },
};

export function PredictionPanel({
  prediction,
  currentPrice,
}: {
  prediction: AIPrediction;
  currentPrice: number;
}) {
  const cfg = dirConfig[prediction.direction];
  const targetMid = (prediction.targetLow + prediction.targetHigh) / 2;
  const upsidePct = ((targetMid - currentPrice) / currentPrice) * 100;

  return (
    <Card className={`border-2 ${cfg.bg}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <span>🤖</span>
          <span>Predicción IA (Claude) — 30 días</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Direction + probability */}
        <div className="flex items-center gap-6">
          <div className={`text-5xl font-black ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Probabilidad</p>
            <p className={`text-3xl font-bold ${cfg.color}`}>{prediction.probability}%</p>
          </div>
        </div>

        {/* Price targets */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Target Mínimo</p>
            <p className="font-bold tabular-nums">${prediction.targetLow.toFixed(2)}</p>
            <p className={`text-xs ${prediction.targetLow >= currentPrice ? 'text-emerald-500' : 'text-red-500'}`}>
              {((prediction.targetLow - currentPrice) / currentPrice * 100).toFixed(1)}%
            </p>
          </div>
          <div className={`rounded-lg p-3 border ${cfg.bg}`}>
            <p className="text-xs text-muted-foreground mb-1">Target Central</p>
            <p className={`font-bold text-lg tabular-nums ${cfg.color}`}>
              ${targetMid.toFixed(2)}
            </p>
            <p className={`text-xs font-semibold ${upsidePct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {upsidePct >= 0 ? '+' : ''}{upsidePct.toFixed(1)}%
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Target Máximo</p>
            <p className="font-bold tabular-nums">${prediction.targetHigh.toFixed(2)}</p>
            <p className={`text-xs ${prediction.targetHigh >= currentPrice ? 'text-emerald-500' : 'text-red-500'}`}>
              {((prediction.targetHigh - currentPrice) / currentPrice * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Reasoning */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Razonamiento
          </p>
          <p className="text-sm leading-relaxed">{prediction.reasoning}</p>
        </div>

        {/* Key factors */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Factores Clave
          </p>
          <ul className="space-y-1.5">
            {prediction.keyFactors.map((f, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className={cfg.color}>•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Prediction risks */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Riesgos a la Predicción
          </p>
          <ul className="space-y-1.5">
            {prediction.risks.map((r, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-amber-500">⚠</span>
                <span className="text-muted-foreground">{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground border-t pt-3">
          ⚠️ No es asesoramiento financiero. Generado por IA con fines educativos únicamente.
        </p>
      </CardContent>
    </Card>
  );
}
