// lib/dashboard/constants.ts
import {
  User,
  Building,
  File,
  BarChart2,
  Users,
  Database,
  Film,
  Clock,
  CheckSquare,
  Mic,
  BookOpen,
  Save,
  FolderOpen,
  LucideIcon
} from 'lucide-react';
import { CardType } from './types';

export const STORAGE_KEYS = {
  DASHBOARD_PREFERENCES: 'dashboard_preferences',
  CARD_ORDER: 'dashboard_card_order',
  VISIBLE_CARDS: 'dashboard_visible_cards',
  COLLAPSED_CARDS: 'dashboard_collapsed_cards',
} as const;

export const CARD_ICONS: Record<CardType, LucideIcon> = {
  'profile': User,
  'distributor': Building,
  'asset': File,
  'stats': BarChart2,
  'users': Users,
  'storage': Database,
  'movie': Film,
  'expiring-movie': Clock,
  'todo': CheckSquare,
  'voice-artist': Mic,
  'guideline': BookOpen,
  'recent-backups': Save,
  'file-type': FolderOpen,
};

export const BUTTON_STYLES = {
  primary: 'bg-[#4da34c] hover:bg-[#3d8c3c] text-white',
  secondary: 'bg-[#ff6246] hover:bg-[#e5583e] text-white',
  outline: 'border border-gray-300 hover:bg-gray-100',
  ghost: 'hover:bg-gray-100',
  link: 'text-[#4da34c] hover:underline',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  leftButton: 'border-gray-300 hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c]',
  rightButton: 'border-gray-300 hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246]',
} as const;
