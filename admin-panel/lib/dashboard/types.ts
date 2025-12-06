// lib/dashboard/types.ts
import { ReactNode, ComponentType } from 'react';
import { Role } from '@/types/auth';

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
  | 'guideline'
  | 'file-type'
  | 'scriptwriter'
  | 'staff'
  | 'sl-interpreter'
  | 'ip-management';

export interface CardDefinition {
  id: string;
  title: string;
  type: CardType;
  description?: string;
  component?: ComponentType;
  defaultVisible: boolean;
  allowedRoles?: Role[];
  order?: number;
  icon?: ReactNode;
}

export interface DashboardCard {
  id: string;
  title: string;
  type: CardType;
  content: ReactNode | null;
  visible: boolean;
}

export interface DashboardPreferences {
  cardOrder: string[];
  visibleCards: string[];
  collapsedCards: string[];
}

export interface DashboardState {
  cards: DashboardCard[];
  visibleCards: string[];
  collapsedCards: string[];
  isLoading: boolean;
  error: string | null;
}

export interface UserData {
  id: number;
  email: string;
  username: string;
  fullName: string | null;
  isActive: boolean;
  isAdmin: boolean;
  role: Role;
  mfaEnabled?: boolean;
  mfaType?: 'NONE' | 'TOTP' | 'SMS' | 'EMAIL';
}

export interface ExpiringMovie {
  id: number;
  title: string;
  endAt: string;
  daysRemaining?: number;
  posterImage?: string;
}

export interface MovieStats {
  total: number;
  totalMovies?: number;
  activeMovies?: number;
  draftMovies?: number;
  publishedMovies?: number;
  visibility_types?: {
    always?: number;
    period?: number;
    hidden?: number;
  };
  publishing_statuses?: {
    draft?: number;
    published?: number;
    archived?: number;
  };
}
