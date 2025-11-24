// lib/dashboard/registry.ts
import { Role } from '@/types/auth';
import { CardDefinition } from './types';

/**
 * 사용 가능한 모든 대시보드 카드 정의
 */
const ALL_CARDS: CardDefinition[] = [
  {
    id: 'profile',
    title: '프로필',
    type: 'profile',
    description: '사용자 프로필 정보',
    requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN, Role.EDITOR, Role.USER],
    defaultVisible: true
  },
  {
    id: 'distributor',
    title: '배급사',
    type: 'distributor',
    description: '배급사 정보',
    requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN],
    defaultVisible: true
  },
  {
    id: 'asset',
    title: '자산',
    type: 'asset',
    description: '자산 관리',
    requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN],
    defaultVisible: true
  },
  {
    id: 'stats',
    title: '통계',
    type: 'stats',
    description: '시스템 통계',
    requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN],
    defaultVisible: true
  },
  {
    id: 'users',
    title: '사용자',
    type: 'users',
    description: '사용자 관리',
    requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN],
    defaultVisible: true
  },
  {
    id: 'storage',
    title: '저장소',
    type: 'storage',
    description: '저장소 사용량',
    requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN],
    defaultVisible: true
  },
  {
    id: 'movie',
    title: '영화',
    type: 'movie',
    description: '영화 목록',
    requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN, Role.EDITOR],
    defaultVisible: true
  },
  {
    id: 'expiring-movie',
    title: '만료 예정 영화',
    type: 'expiring-movie',
    description: '만료 예정 영화 목록',
    requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN],
    defaultVisible: true
  },
  {
    id: 'todo',
    title: '할 일',
    type: 'todo',
    description: '할 일 목록',
    requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN, Role.EDITOR, Role.USER],
    defaultVisible: false
  },
  {
    id: 'voice-artist',
    title: '성우',
    type: 'voice-artist',
    description: '성우 정보',
    requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN],
    defaultVisible: false
  },
  {
    id: 'recent-backups',
    title: '최근 백업',
    type: 'recent-backups',
    description: '최근 백업 목록',
    requiredRoles: [Role.SUPER_ADMIN],
    defaultVisible: false
  },
  {
    id: 'guideline',
    title: '가이드라인',
    type: 'guideline',
    description: '시스템 가이드라인',
    requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN, Role.EDITOR, Role.USER],
    defaultVisible: false
  }
];

/**
 * 역할에 따라 사용 가능한 카드 목록 반환
 */
export function getAvailableCards(userRole: Role): CardDefinition[] {
  return ALL_CARDS.filter(card => {
    if (!card.requiredRoles || card.requiredRoles.length === 0) {
      return true;
    }
    return card.requiredRoles.includes(userRole);
  });
}

/**
 * 특정 카드 ID로 카드 정의 찾기
 */
export function getCardById(cardId: string): CardDefinition | undefined {
  return ALL_CARDS.find(card => card.id === cardId);
}

/**
 * 기본 표시 카드 목록 반환
 */
export function getDefaultVisibleCards(userRole: Role): string[] {
  return getAvailableCards(userRole)
    .filter(card => card.defaultVisible)
    .map(card => card.id);
}

/**
 * 기본 카드 순서 반환
 */
export function getDefaultCardOrder(userRole: Role): string[] {
  return getAvailableCards(userRole).map(card => card.id);
}
