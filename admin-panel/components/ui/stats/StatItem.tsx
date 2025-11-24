// components/ui/stats/StatItem.tsx
import { ReactNode } from "react";

interface StatItemProps {
  title: string;
  value: string;
  icon?: ReactNode;
}

export function StatItem({ title, value, icon }: StatItemProps) {
  return (
    <div className="bg-card rounded-lg p-3 border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}
