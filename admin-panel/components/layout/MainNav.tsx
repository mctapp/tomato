// components/layout/MainNav.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Role } from "@/types/auth";
import { LayoutDashboard, Users, Film, FileText, FileBox, Settings } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  requiredRoles: Role[];
}

export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<Role | null>(null);
  
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
      }
    };
    
    fetchUserRole();
  }, []);

  const navItems: NavItem[] = [
    {
      title: "대시보드",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-4 w-4 mr-2" />,
      requiredRoles: [Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR, Role.USER],
    },
    {
      title: "영화 관리",
      href: "/movies",
      icon: <Film className="h-4 w-4 mr-2" />,
      requiredRoles: [Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR],
    },
    {
      title: "접근성 미디어",
      href: "/accessibility",
      icon: <FileBox className="h-4 w-4 mr-2" />,
      requiredRoles: [Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR],
    },
    {
      title: "가이드라인",
      href: "/guidelines",
      icon: <FileText className="h-4 w-4 mr-2" />,
      requiredRoles: [Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR, Role.USER],
    },
    {
      title: "사용자 관리",
      href: "/users",
      icon: <Users className="h-4 w-4 mr-2" />,
      requiredRoles: [Role.SUPER_ADMIN, Role.ADMIN],
    },
    {
      title: "설정",
      href: "/settings",
      icon: <Settings className="h-4 w-4 mr-2" />,
      requiredRoles: [Role.SUPER_ADMIN],
    },
  ];

  // 사용자 권한에 따라 필터링된 메뉴 항목
  const filteredNavItems = navItems.filter(item =>
    userRole && item.requiredRoles.includes(userRole)
  );

  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)}>
      {filteredNavItems.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center text-sm font-medium transition-colors hover:text-primary",
            pathname === item.href
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          {item.icon}
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
