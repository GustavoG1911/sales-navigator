import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Deal } from "@/lib/types";
import { formatCurrency } from "@/lib/commission";
import { BarChart3 } from "lucide-react";

interface OperationsChartProps {
  deals: Deal[];
}

export function OperationsChart({ deals }: OperationsChartProps) {
  const data = [
    {
      name: "BluePex",
      value: deals.filter((d) => d.operation === "BluePex").reduce((s, d) => s + d.monthlyValue + d.implantationValue, 0),
    },
    {
      name: "Conecta Suite",
      value: deals.filter((d) => d.operation === "Conecta Suite").reduce((s, d) => s + d.monthlyValue + d.implantationValue, 0),
    },
  ];

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="section-title flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Volume por Operação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barSize={48}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-xs" />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} className="text-xs" />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Volume"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  fontSize: "0.875rem",
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                <Cell fill="hsl(var(--chart-1))" />
                <Cell fill="hsl(var(--chart-2))" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
