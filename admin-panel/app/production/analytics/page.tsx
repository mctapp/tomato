// app/production/analytics/page.tsx
'use client';

import React from 'react';
import { ProductionAnalytics } from '@/components/production/ProductionAnalytics';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function ProductionAnalyticsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <ProductionAnalytics />
      </div>
    </ProtectedRoute>
  );
}
