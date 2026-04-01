import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "primary" | "success" | "warning";
}

const variantStyles = {
  default: "border-border/60",
  primary: "border-primary/20 bg-primary/[0.03]",
  success: "border-success/20 bg-success/[0.03]",
  warning: "border-warning/20 bg-warning/[0.03]",
};

const iconStyles = {
  default: "text-muted-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
};

export function KpiCard({ title, value, icon: Icon, trend, variant = "default" }: KpiCardProps) {
  return (
    <Card className={`glass-card ${variantStyles[variant]}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
          <Icon className={`h-4 w-4 ${iconStyles[variant]} opacity-60`} />
        </div>
        <p className="kpi-value">{value}</p>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </CardContent>
    </Card>
  );
}
