// lib/constants/production-kanban.ts

export const KANBAN_COLUMNS = [
  { id: 'planning', title: '기획', color: 'yellow' },
  { id: 'in_progress', title: '진행 중', color: 'blue' },
  { id: 'review', title: '검토', color: 'purple' },
  { id: 'completed', title: '완료', color: 'green' }
] as const;

export type KanbanColumnId = typeof KANBAN_COLUMNS[number]['id'];
