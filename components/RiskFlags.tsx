import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RiskFlags({ risks }: { risks: string[] }) {
  if (!risks.length) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-emerald-500 font-medium flex items-center gap-2">
            <span>✓</span>
            <span>Sin alertas de riesgo detectadas</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-amber-600 dark:text-amber-400">
          ⚠️ Alertas de Riesgo ({risks.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {risks.map((r, i) => (
            <li key={i} className="text-sm flex gap-2 items-start">
              <span className="text-amber-500 mt-0.5">•</span>
              <span className="text-muted-foreground">{r}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
