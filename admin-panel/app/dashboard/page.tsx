// /app/dashboard/page.tsx
"use client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Dashboard from "@/components/dashboard/Dashboard";
import { DashboardProvider } from "@/components/dashboard/core/DashboardContext";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardProvider>
        <Dashboard />
      </DashboardProvider>
    </ProtectedRoute>
  );
}
