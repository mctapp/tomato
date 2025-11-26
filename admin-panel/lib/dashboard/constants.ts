// lib/dashboard/constants.ts
import {
  User,
  Truck,
  FileVideo,
  BarChart3,
  Users,
  HardDrive,
  Film,
  AlertCircle,
  CheckSquare,
  Mic,
  Archive,
  BookOpen,
  LucideIcon
} from 'lucide-react';
import { CardType } from './types';

export const STORAGE_KEYS = {
  DASHBOARD_PREFERENCES: 'dashboard_preferences',
  CARD_ORDER: 'card_order',
  VISIBLE_CARDS: 'visible_cards',
  COLLAPSED_CARDS: 'collapsed_cards',
} as const;

export const BUTTON_STYLES = {
  leftButton: 'w-full flex items-center justify-center',
  rightButton: 'w-full flex items-center justify-center',
} as const;

export const DASHBOARD_DEFAULTS = {
  REFRESH_INTERVAL: 30000, // 30 seconds
  ANIMATION_DURATION: 200, // milliseconds
} as const;

export const CARD_ICONS: Record<CardType, LucideIcon> = {
  profile: User,
  distributor: Truck,
  asset: FileVideo,
  stats: BarChart3,
  users: Users,
  storage: HardDrive,
  movie: Film,
  'expiring-movie': AlertCircle,
  todo: CheckSquare,
  'voice-artist': Mic,
  'recent-backups': Archive,
  guideline: BookOpen,
};
