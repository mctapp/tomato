// app/dashboard/layout.tsx 
"use client";

import { ReactNode, Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      {children}
    </Suspense>
  );
}
