// lib/dashboard/registry.ts
import { Role } from '@/types/auth';
import { CardDefinition, CardType } from './types';

// Dynamic imports for card components
import ProfileCard from '@/components/dashboard/cards/ProfileCard';
import DistributorCard from '@/components/dashboard/cards/DistributorCard';
import AssetCard from '@/components/dashboard/cards/AssetCard';
import UsersCard from '@/components/dashboard/cards/UsersCard';
import StorageUsageCard from '@/components/dashboard/cards/StorageUsageCard';
import MovieStatsCard from '@/components/dashboard/cards/MovieStatsCard';
import ExpiringMoviesCard from '@/components/dashboard/cards/ExpiringMoviesCard';
import TodoCard from '@/components/dashboard/cards/TodoCard';
import VoiceArtistCard from '@/components/dashboard/cards/VoiceArtistCard';
import GuidelineCard from '@/components/dashboard/cards/GuidelineCard';
import DatabaseBackupCard from '@/components/dashboard/cards/DatabaseBackupCard';
import FileTypeCard from '@/components/dashboard/cards/FileTypeCard';
import ScriptwriterCard from '@/components/dashboard/cards/ScriptwriterCard';
import StaffCard from '@/components/dashboard/cards/StaffCard';
import SLInterpreterCard from '@/components/dashboard/cards/SLInterpreterCard';

// Card definitions
const cardDefinitions: CardDefinition[] = [
  {
    id: 'profile',
    title: '사용자 정보',
    type: 'profile',
    description: '계정 정보를 확인하세요',
    component: ProfileCard,
    defaultVisible: true,
    order: 1,
  },
  {
    id: 'distributor',
    title: '배급사 관리',
    type: 'distributor',
    description: '배급사 정보를 관리하세요',
    component: DistributorCard,
    defaultVisible: true,
    allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN],
    order: 2,
  },
  {
    id: 'asset',
    title: '접근성 미디어',
    type: 'asset',
    description: '접근성 미디어 자산을 관리하세요',
    component: AssetCard,
    defaultVisible: true,
    order: 3,
  },
  {
    id: 'users',
    title: '사용자 관리',
    type: 'users',
    description: '시스템 사용자를 관리하세요',
    component: UsersCard,
    defaultVisible: true,
    allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN],
    order: 4,
  },
  {
    id: 'storage',
    title: '스토리지 현황',
    type: 'storage',
    description: '스토리지 사용량을 확인하세요',
    component: StorageUsageCard,
    defaultVisible: true,
    allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN],
    order: 5,
  },
  {
    id: 'movie-stats',
    title: '영화 통계',
    type: 'movie',
    description: '영화 관련 통계를 확인하세요',
    component: MovieStatsCard,
    defaultVisible: true,
    order: 6,
  },
  {
    id: 'expiring-movies',
    title: '만료 예정 영화',
    type: 'expiring-movie',
    description: '곧 만료되는 영화 목록입니다',
    component: ExpiringMoviesCard,
    defaultVisible: true,
    order: 7,
  },
  {
    id: 'todos',
    title: '할 일 목록',
    type: 'todo',
    description: '할 일 목록을 관리하세요',
    component: TodoCard,
    defaultVisible: true,
    order: 8,
  },
  {
    id: 'voice-artist',
    title: '성우 관리',
    type: 'voice-artist',
    description: '성우 정보를 관리하세요',
    component: VoiceArtistCard,
    defaultVisible: true,
    order: 9,
  },
  {
    id: 'guideline',
    title: '가이드라인',
    type: 'guideline',
    description: '가이드라인을 관리하세요',
    component: GuidelineCard,
    defaultVisible: true,
    order: 10,
  },
  {
    id: 'recent-backups',
    title: '최근 백업',
    type: 'recent-backups',
    description: '최근 데이터베이스 백업 현황',
    component: DatabaseBackupCard,
    defaultVisible: true,
    allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN],
    order: 11,
  },
  {
    id: 'file-type',
    title: '파일 유형 분포',
    type: 'file-type',
    description: '파일 유형별 분포를 확인하세요',
    component: FileTypeCard,
    defaultVisible: false,
    allowedRoles: [Role.SUPER_ADMIN, Role.ADMIN],
    order: 12,
  },
  {
    id: 'scriptwriter',
    title: '해설작가 관리',
    type: 'scriptwriter',
    description: '해설작가 정보를 관리하세요',
    component: ScriptwriterCard,
    defaultVisible: true,
    order: 13,
  },
  {
    id: 'staff',
    title: '스태프 관리',
    type: 'staff',
    description: '스태프 정보를 관리하세요',
    component: StaffCard,
    defaultVisible: true,
    order: 14,
  },
  {
    id: 'sl-interpreter',
    title: '수어통역사 관리',
    type: 'sl-interpreter',
    description: '수어통역사 정보를 관리하세요',
    component: SLInterpreterCard,
    defaultVisible: true,
    order: 15,
  },
];

/**
 * Get available cards based on user role
 */
export function getAvailableCards(userRole: Role): CardDefinition[] {
  return cardDefinitions
    .filter(card => {
      // If no role restrictions, available to all
      if (!card.allowedRoles || card.allowedRoles.length === 0) {
        return true;
      }
      // Check if user role is in allowed roles
      return card.allowedRoles.includes(userRole);
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Get a single card definition by ID
 */
export function getCardById(cardId: string): CardDefinition | undefined {
  return cardDefinitions.find(card => card.id === cardId);
}

/**
 * Get all card definitions (admin only)
 */
export function getAllCards(): CardDefinition[] {
  return [...cardDefinitions].sort((a, b) => (a.order || 0) - (b.order || 0));
}
