// lib/dashboard/types.ts
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
  | 'guideline';

export interface CardDefinition {
  id: string;
  title: string;
  type: CardType;
  description?: string;
  requiredRoles?: Role[];
  defaultVisible: boolean;
  defaultCollapsed?: boolean;
}

export interface DashboardPreferences {
  cardOrder: string[];
  visibleCards: string[];
  collapsedCards: string[];
}
