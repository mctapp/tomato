// lib/dashboard/types.ts
import { Role } from '@/types/auth';
import { ReactNode } from 'react';

export type CardType =
  | 'profile'
  | 'distributor'
  | 'asset'
  | 'stats'
  | 'users'
  | 'storage'
  | 'movie'
  | 'expiring-movie'
  | 'todo'
  | 'voice-artist'
  | 'recent-backups'
  | 'guideline';

export interface CardDefinition {
  id: string;
  title: string;
  type: CardType;
  description?: string;
  requiredRoles?: Role[];
  defaultVisible: boolean;
  defaultCollapsed?: boolean;
  component?: () => ReactNode;
  icon?: ReactNode;
}

export interface DashboardCard {
  id: string;
  title: string;
  type: CardType;
  content: ReactNode;
  visible: boolean;
}

export interface DashboardState {
  cards: DashboardCard[];
  visibleCards: string[];
  collapsedCards: string[];
  isLoading: boolean;
  error: string | null;
}

export interface DashboardPreferences {
  cardOrder: string[];
  visibleCards: string[];
  collapsedCards: string[];
}

export interface UserData {
  id: number;
  email: string;
  username: string;
  role: Role;
  fullName: string | null;
  isActive: boolean;
  isAdmin: boolean;
}

export interface ExpiringMovie {
  id: number;
  title: string;
  endAt: string;
}

export interface MovieStats {
  total: number;
  visibility_types: {
    always: number;
    period: number;
    hidden: number;
  };
  publishing_statuses: {
    draft: number;
    published: number;
    archived: number;
  };
}
