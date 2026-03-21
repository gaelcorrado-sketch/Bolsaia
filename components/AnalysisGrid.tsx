import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StockAnalysis } from '@/lib/types';

const signalColor = {
  BUY: 'text-emerald-500',
  HOLD: 'text-amber-500',
  SELL: 'text-red-500',
};
const barColor = {
  BUY: 'bg-emerald-500',
  HOLD: 'bg-amber-500',
  SELL: 'bg-red-500',
};

export function AnalysisGrid({ analysis }: { analysis: StockAnalysis }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex justify-between">
          <span>Análisis Técnico — {analysis.dimensions.length} dimensiones</span>
          <span className="text-muted-foreground font-normal">Score: {analysis.score}/100</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysis.dimensions.map((d) => (
          <div key={d.name} className="space-y-1.5">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">{d.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-xs">{d.notes}</span>
                <span className={`font-bold text-xs w-8 text-right ${signalColor[d.signal]}`}>
                  {d.signal}
                </span>
                <span className="font-mono text-xs text-muted-foreground w-8 text-right">
                  {d.score}
                </span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor[d.signal]} transition-all duration-700`}
                style={{ width: `${d.score}%` }}
              />
            </div>
          </div>
        ))}

        {/* Overall score bar */}
        <div className="pt-3 border-t space-y-1.5">
          <div className="flex justify-between text-sm font-semibold">
            <span>Puntaje Global</span>
            <span
              className={
                analysis.score >= 60
                  ? 'text-emerald-500'
                  : analysis.score <= 40
                    ? 'text-red-500'
                    : 'text-amber-500'
              }
            >
              {analysis.score}/100
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                analysis.score >= 60
                  ? 'bg-emerald-500'
                  : analysis.score <= 40
                    ? 'bg-red-500'
                    : 'bg-amber-500'
              }`}
              style={{ width: `${analysis.score}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
