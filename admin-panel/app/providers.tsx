// app/providers.tsx
"use client";

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "sonner";
import QueryProvider from '@/components/providers/QueryProvider';
import { ReactNode } from 'react';

export function Providers({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        {children}
        <Toaster />
      </QueryProvider>
    </ThemeProvider>
  );
}
