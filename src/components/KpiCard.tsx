import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface KpiCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "primary" | "success" | "warning";
  tooltip?: string;
  onClick?: () => void;
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

export function KpiCard({ title, value, icon: Icon, trend, variant = "default", tooltip, onClick }: KpiCardProps) {
  return (
    <Card
      className={`glass-card transition-all duration-200 ${variantStyles[variant]} ${onClick ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div onClick={(e) => e.stopPropagation()}>
                      <HelpCircle className="h-[14px] w-[14px] text-muted-foreground/60 cursor-help" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px] text-xs" onClick={(e) => e.stopPropagation()}>
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <Icon className={`h-4 w-4 ${iconStyles[variant]} opacity-60`} />
        </div>
        <p className="kpi-value">{value}</p>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </CardContent>
    </Card>
  );
}
