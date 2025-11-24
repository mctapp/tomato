// admin-panel/app/database/layout.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "데이터베이스 관리 | 토마토 어드민",
  description: "토마토 시스템 데이터베이스 관리 및 백업 페이지",
};

export default function DatabaseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
