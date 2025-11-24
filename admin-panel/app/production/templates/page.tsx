// app/production/templates/page.tsx
'use client';

import React from 'react';
import { ProductionTemplateManager } from '@/components/production/ProductionTemplateManager';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function ProductionTemplatesPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <ProductionTemplateManager />
      </div>
    </ProtectedRoute>
  );
}
