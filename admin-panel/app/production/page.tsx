// app/production/page.tsx
'use client';

import React from 'react';
import { ProductionKanban } from '@/components/production/ProductionKanban';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function ProductionPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <ProductionKanban />
      </div>
    </ProtectedRoute>
  );
}
