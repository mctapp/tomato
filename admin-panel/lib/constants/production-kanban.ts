// lib/constants/production-kanban.ts

export const KANBAN_COLUMNS = [
  { id: 'planning', title: '기획', color: 'yellow' },
  { id: 'in_progress', title: '진행 중', color: 'blue' },
  { id: 'review', title: '검토', color: 'purple' },
  { id: 'completed', title: '완료', color: 'green' }
] as const;

export type KanbanColumnId = typeof KANBAN_COLUMNS[number]['id'];

export const STAGE_PROGRESS_RANGES: Record<string, { min: number; max: number }> = {
  planning: { min: 0, max: 20 },
  script: { min: 20, max: 40 },
  recording: { min: 40, max: 70 },
  editing: { min: 70, max: 90 },
  review: { min: 90, max: 99 },
  completed: { min: 100, max: 100 }
};

export const COMPACT_THRESHOLD = 1024;
export const DND_ACTIVATION_DISTANCE = 8;
export const REFETCH_INTERVAL = 30000;
export const KANBAN_STALE_TIME = 5000;
export const FILTERS_STALE_TIME = 60000;
export const KANBAN_LAYOUT_MODE_KEY = 'kanban_layout_mode';
