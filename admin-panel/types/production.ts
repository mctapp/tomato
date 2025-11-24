// admin-panel/types/production.ts

// ── 공통 Enum 및 상수 ──────────────────────────────────────────────────

export enum MediaType {
  AD = "AD", // 음성해설
  CC = "CC", // 자막해설
  SL = "SL", // 수어해설
  AI = "AI", // 음성소개
  CI = "CI", // 자막소개
  SI = "SI", // 수어소개
  AR = "AR", // 음성리뷰
  CR = "CR", // 자막리뷰
  SR = "SR", // 수어리뷰
}

export enum WorkSpeedType {
  A = "A", // 빠름
  B = "B", // 보통
  C = "C", // 여유
}

export enum ProjectStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  PAUSED = "paused",
  CANCELLED = "cancelled",
}

export enum TaskStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  BLOCKED = "blocked",
}

export enum PersonType {
  SCRIPTWRITER = "scriptwriter",
  VOICE_ARTIST = "voice_artist", 
  SL_INTERPRETER = "sl_interpreter",
  STAFF = "staff",
}

export enum WorkType {
  MAIN = "main",
  REVIEW = "review",
  MONITORING = "monitoring",
}

export enum CreationTrigger {
  STATUS_CHANGE = "status_change",
  CREDITS_SUFFICIENT = "credits_sufficient",
  MANUAL = "manual",
}

// ── 레이아웃 관련 새로운 Enum 추가 ──────────────────────────────────────────────────

export enum LayoutMode {
  STANDARD = "standard",
  COMPACT = "compact",
}

export const LAYOUT_MODE_NAMES: Record<LayoutMode, string> = {
  [LayoutMode.STANDARD]: "표준 보기",
  [LayoutMode.COMPACT]: "간소 보기",
};

export const MEDIA_TYPE_NAMES: Record<MediaType, string> = {
  [MediaType.AD]: "음성해설",
  [MediaType.CC]: "자막해설",
  [MediaType.SL]: "수어해설",
  [MediaType.AI]: "음성소개",
  [MediaType.CI]: "자막소개",
  [MediaType.SI]: "수어소개",
  [MediaType.AR]: "음성리뷰",
  [MediaType.CR]: "자막리뷰",
  [MediaType.SR]: "수어리뷰",
};

export const SPEED_TYPE_NAMES: Record<WorkSpeedType, string> = {
  [WorkSpeedType.A]: "빠름",
  [WorkSpeedType.B]: "보통",
  [WorkSpeedType.C]: "여유",
};

export const PROJECT_STATUS_NAMES: Record<ProjectStatus, string> = {
  [ProjectStatus.ACTIVE]: "진행중",
  [ProjectStatus.COMPLETED]: "완료",
  [ProjectStatus.PAUSED]: "일시정지",
  [ProjectStatus.CANCELLED]: "취소",
};

export const TASK_STATUS_NAMES: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: "대기",
  [TaskStatus.IN_PROGRESS]: "진행중",
  [TaskStatus.COMPLETED]: "완료",
  [TaskStatus.BLOCKED]: "차단됨",
};

export const PERSON_TYPE_NAMES: Record<PersonType, string> = {
  [PersonType.SCRIPTWRITER]: "해설작가",
  [PersonType.VOICE_ARTIST]: "성우",
  [PersonType.SL_INTERPRETER]: "수어통역사",
  [PersonType.STAFF]: "스태프",
};

export const WORK_TYPE_NAMES: Record<WorkType, string> = {
  [WorkType.MAIN]: "메인 작업",
  [WorkType.REVIEW]: "감수",
  [WorkType.MONITORING]: "모니터링",
};

export const STAGE_NAMES: Record<StageNumber, string> = {
  1: "1단계: 기획/분석",
  2: "2단계: 제작/개발",
  3: "3단계: 검수/테스트",
  4: "4단계: 완료/배포",
};

export const QUALITY_SCORE_NAMES: Record<QualityScore, string> = {
  1: "매우 나쁨",
  2: "나쁨",
  3: "보통",
  4: "좋음",
  5: "매우 좋음",
};

// ── 기본 인터페이스 ──────────────────────────────────────────────────

export interface StaffInfo {
  name: string;
  role: string;
  isPrimary?: boolean;
}

export interface ProjectStaffInfo {
  mainWriter?: StaffInfo;
  producer?: StaffInfo;
  reviewers: StaffInfo[];
  monitors: StaffInfo[];
  voiceArtists: StaffInfo[];
  otherStaff: StaffInfo[];
}

// ── Production Project 인터페이스 ─────────────────────────────────────

export interface ProductionProjectBase {
  accessAssetId: number;
  workSpeedType: string;
  projectStatus: string;
  priorityOrder: number;
  startDate: string; // ISO date string
  estimatedCompletionDate?: string;
}

export interface ProductionProjectCreate extends ProductionProjectBase {}

export interface ProductionProjectUpdate {
  workSpeedType?: string;
  projectStatus?: string;
  priorityOrder?: number;
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
}

export interface ProductionProjectResponse extends ProductionProjectBase {
  id: number;
  currentStage: number;
  progressPercentage: number;
  actualCompletionDate?: string;
  autoCreated: boolean;
  creditsCount: number;
  creationTrigger?: string;
  createdAt: string;
  updatedAt: string;
  
  // 계산된 필드들
  isOverdue?: boolean;
  daysRemaining?: number | null;
  currentStageDisplay?: string;
  projectStatusDisplay?: string;
  workSpeedTypeDisplay?: string;
  creationTriggerDisplay?: string;
}

// ── Production Task 인터페이스 ────────────────────────────────────────

export interface ProductionTaskBase {
  taskName: string;
  taskOrder: number;
  taskStatus: string;
  isRequired: boolean;
}

export interface ProductionTaskCreate extends ProductionTaskBase {
  productionProjectId: number;
  stageNumber: number;
  assignedCreditId?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  plannedHours?: number;
}

export interface ProductionTaskUpdate {
  taskName?: string;
  taskStatus?: string;
  assignedCreditId?: number;
  actualStartDate?: string;
  actualEndDate?: string;
  actualHours?: number;
  qualityScore?: number;
  completionNotes?: string;
}

export interface ProductionTaskResponse extends ProductionTaskBase {
  id: number;
  productionProjectId: number;
  stageNumber: number;
  assignedCreditId?: number;
  plannedStartDate?: string;
  actualStartDate?: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  plannedHours?: number;
  actualHours?: number;
  reviewRequired: boolean;
  reviewerCreditId?: number;
  reviewHours?: number;
  monitoringRequired: boolean;
  monitorCreditId?: number;
  monitoringHours?: number;
  qualityScore?: number;
  reworkCount: number;
  efficiencyScore?: number;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;
  
  // 계산된 필드들
  stageName?: string;
  statusDisplay?: string;
  qualityScoreDisplay?: string;
  totalHours?: number | null;
  durationDays?: number | null;
  isOverdue?: boolean;
  canStart?: boolean;
  canComplete?: boolean;
}

// ── 작업 진행 현황 요약 ──────────────────────────────────────────────

export interface TaskProgressSummary {
  projectId: number;
  currentStage: StageNumber;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  blockedTasks: number;
  progressPercentage: number;
  estimatedRemainingDays?: number;
  nextMilestone?: string;
}

// ── Production Template 인터페이스 ────────────────────────────────────

export interface ProductionTemplateBase {
  mediaType: string;
  stageNumber: number;
  taskName: string;
  taskOrder: number;
  speedAHours: number;
  speedBHours: number;
  speedCHours: number;
  requiresReview: boolean;
  reviewHoursA: number;
  reviewHoursB: number;
  reviewHoursC: number;
  requiresMonitoring: boolean;
  monitoringHoursA: number;
  monitoringHoursB: number;
  monitoringHoursC: number;
  isRequired: boolean;
  isParallel: boolean;
}

export interface ProductionTemplateCreate extends ProductionTemplateBase {
  qualityChecklist?: Record<string, any>;
  acceptanceCriteria?: Record<string, any>;
  prerequisiteTasks?: string[];
}

export interface ProductionTemplateUpdate {
  taskName?: string;
  taskOrder?: number;
  speedAHours?: number;
  speedBHours?: number;
  speedCHours?: number;
  requiresReview?: boolean;
  reviewHoursA?: number;
  reviewHoursB?: number;
  reviewHoursC?: number;
  requiresMonitoring?: boolean;
  monitoringHoursA?: number;
  monitoringHoursB?: number;
  monitoringHoursC?: number;
  isRequired?: boolean;
  isParallel?: boolean;
  qualityChecklist?: Record<string, any>;
  acceptanceCriteria?: Record<string, any>;
  prerequisiteTasks?: string[];
}

export interface ProductionTemplateResponse extends ProductionTemplateBase {
  id: number;
  isActive: boolean;
  qualityChecklist?: Record<string, any>;
  acceptanceCriteria?: Record<string, any>;
  prerequisiteTasks?: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Production Memo 인터페이스 ────────────────────────────────────────

export interface ProductionMemoBase {
  memoContent: string;
  memoType: string;
  priorityLevel: number;
  tags?: string;
  isPinned: boolean;
}

export interface ProductionMemoCreate extends ProductionMemoBase {
  productionProjectId: number;
  productionTaskId?: number;
}

export interface ProductionMemoUpdate {
  memoContent?: string;
  memoType?: string;
  priorityLevel?: number;
  tags?: string;
  isPinned?: boolean;
}

export interface ProductionMemoResponse extends ProductionMemoBase {
  id: number;
  productionProjectId: number;
  productionTaskId?: number;
  createdBy: number;
  createdAt: string;
  updatedBy?: number;
  updatedAt: string;
  isActive: boolean;
}

// ── 칸반보드 전용 인터페이스 ──────────────────────────────────────────

export interface ChecklistItem {
  id: number;
  item: string;
  required: boolean;
  checked: boolean;
}

export interface ProductionCardData {
  id: number;
  movieTitle: string;
  moviePoster?: string | null;
  mediaType: string;
  mediaTypeName?: string | null;
  assetName?: string | null;
  workSpeedType?: string | null;
  currentStage?: number | null;
  progressPercentage?: number | null;
  staffInfo?: ProjectStaffInfo | null;
  daysRemaining?: number | null;
  isOverdue?: boolean | null;
  memoCount?: number | null;
  startDate?: string | null;
  estimatedCompletionDate?: string | null;
  projectStatus?: string | null;
  taskId?: number | null;
  checklistItems?: ChecklistItem[] | null;
  checklistProgress?: Record<string, boolean> | null;
  
  // 레이아웃 관련 새로운 필드
  isPinned?: boolean;
  
  // 추가 메타데이터
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  hasBlockedTasks?: boolean;
  completedTasksCount?: number;
  totalTasksCount?: number;
}

export interface KanbanStageData {
  stageNumber: number;
  stageName: string;
  cards: ProductionCardData[];
  stageColor?: string;
  stageDescription?: string;
}

export interface KanbanResponse {
  stages: KanbanStageData[];
  totalProjects: number;
  lastUpdated?: string;
}

export interface MoveCardRequest {
  projectId: number;
  targetStage: number;
  targetPosition?: number;
  progressPercentage?: number;
}

export interface MoveCardResponse {
  message: string;
  projectId: number;
  oldStage: number;
  newStage: number;
  progressPercentage: number;
  projectStatus: string;
  movedCard?: ProductionCardData;
  updatedStages?: KanbanStageData[];
}

// ── 레이아웃 관련 새로운 인터페이스 ──────────────────────────────────────────

export interface KanbanLayoutSettings {
  mode: LayoutMode;
  compactThreshold: number; // 컴팩트 모드 자동 전환 임계값 (카드 개수)
  showCompletionTime: boolean;
  enableAutoSwitch: boolean;
}

export interface ProductionCardCompactProps {
  card: ProductionCardData;
  onOpenDetail: (projectId: number) => void;
  onOpenMemo: (projectId: number) => void;
  onTogglePin?: (projectId: number) => void;
  isDragging?: boolean;
}

export interface PinToggleRequest {
  projectId: number;
  isPinned: boolean;
}

export interface LayoutToggleEvent {
  columnId: string;
  newMode: LayoutMode;
  cardCount: number;
}

// ── 필터 및 통계 인터페이스 ───────────────────────────────────────────

export interface FilterOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

export interface FiltersResponse {
  mediaTypes: FilterOption[];
  speedTypes: FilterOption[];
  projectStatuses: FilterOption[];
  taskStatuses?: FilterOption[];
  personTypes?: FilterOption[];
  workTypes?: FilterOption[];
  stages?: FilterOption[];
}

export interface SearchFilters {
  mediaType?: MediaType;
  speedType?: WorkSpeedType;
  projectStatus?: ProjectStatus;
  stage?: StageNumber;
  assignedTo?: number;
  dateRange?: {
    start: string;
    end: string;
  };
  isOverdue?: boolean;
  hasNoStaff?: boolean;
  keyword?: string;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
  label: string;
}

export interface MediaTypeStats {
  count: number;
  name: string;
}

export interface StatisticsResponse {
  stageCounts: Record<string, number>;
  overdueCount: number;
  totalActive: number;
  mediaTypeDistribution: Record<string, MediaTypeStats>;
}

// ── 템플릿 관련 추가 인터페이스 ─────────────────────────────────────

export interface MediaTypeInfo {
  mediaType: string;
  mediaTypeName: string;
}

export interface MediaTypeTemplatesResponse {
  mediaType: string;
  mediaTypeName: string;
  stages: Record<number, ProductionTemplateResponse[]>;
  lastUpdated?: string;
  version?: string;
}

export interface HoursEstimationResponse {
  mediaType: string;
  mediaTypeName: string;
  workSpeedType: string;
  totalMainHours: number;
  totalReviewHours: number;
  totalMonitoringHours: number;
  totalHours: number;
  estimatedDays: number;
  stageBreakdown: Record<string, {
    stageName: string;
    mainHours: number;
    reviewHours: number;
    monitoringHours: number;
    totalHours: number;
    estimatedDays?: number;
  }>;
  assumptions?: string[];
  lastCalculated?: string;
}

// ── 아카이브 인터페이스 ───────────────────────────────────────────────

export interface ProductionArchiveResponse {
  id: number;
  originalProjectId: number;
  accessAssetId: number;
  movieTitle: string;
  mediaType: string;
  assetName: string;
  workSpeedType: string;
  startDate: string;
  completionDate: string;
  totalDays: number;
  totalHours?: number;
  participants: Record<string, any>;
  overallEfficiency?: number;
  averageQuality?: number;
  totalCost?: number;
  reworkPercentage?: number;
  stageDurations?: Record<string, number>;
  projectSuccessRating?: number;
  lessonsLearned?: string;
  completionNotes?: string;
  archivedAt: string;
  archivedBy: number;
}

// ── 성과 분석 인터페이스 ──────────────────────────────────────────────

export interface WorkerPerformanceRecord {
  id: number;
  productionTaskId: number;
  creditId: number;
  personType: string;
  roleName: string;
  workType: string;
  plannedHours: number;
  actualHours: number;
  efficiencyRatio: number;
  qualityScore?: number;
  reworkRequired: boolean;
  reworkHours: number;
  plannedCompletion: string;
  actualCompletion: string;
  daysVariance: number;
  supervisorRating?: number;
  collaborationRating?: number;
  punctualityRating?: number;
  feedbackNotes?: string;
  recordedAt: string;
}

export interface WorkerPerformanceSummary {
  creditId: number;
  personName: string;
  personType: string;
  totalProjects: number;
  totalHours: number;
  averageEfficiency: number;
  averageQuality: number;
  onTimeDeliveryRate: number;
  reworkRate: number;
}

export interface PerformanceMetrics {
  period: {
    start: string;
    end: string;
  };
  totalProjects: number;
  completedProjects: number;
  averageCompletionTime: number;
  onTimeCompletionRate: number;
  averageEfficiency: number;
  averageQualityScore: number;
  totalWorkHours: number;
  reworkRate: number;
  
  // 단계별 분석
  stageMetrics: Record<StageNumber, {
    averageDuration: number;
    bottleneckRate: number;
    qualityScore: number;
  }>;
  
  // 속도별 분석
  speedTypeMetrics: Record<WorkSpeedType, {
    projectCount: number;
    averageEfficiency: number;
    completionRate: number;
  }>;
  
  // 인력별 분석
  staffMetrics: Array<{
    staffId: number;
    staffName: string;
    personType: PersonType;
    projectCount: number;
    averageEfficiency: number;
    averageQuality: number;
    onTimeRate: number;
  }>;
}

// ── 차트 데이터 타입 ────────────────────────────────────────────────

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  category?: string;
  metadata?: Record<string, any>;
}

// ── 유틸리티 타입 ────────────────────────────────────────────────────

export type StageNumber = 1 | 2 | 3 | 4;

export type SpeedType = "A" | "B" | "C";

export type MemoType = "general" | "issue" | "decision" | "review";

export type QualityScore = 1 | 2 | 3 | 4 | 5;

// ── API 응답 타입 ────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  success?: boolean;
  statusCode?: number;
  errors?: ApiError[];
}

export interface ApiError {
  field?: string;
  message: string;
  code?: string;
  detail?: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

// ── 폼 관련 타입 ──────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

export interface FormState<T = Record<string, any>> {
  data: T;
  errors: ValidationError[];
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  touched: Record<string, boolean>;
}

export interface ProductionTemplateFormData {
  taskName: string;
  taskOrder: number;
  speedAHours: string; // 폼에서는 string으로 처리
  speedBHours: string;
  speedCHours: string;
  requiresReview: boolean;
  reviewHoursA: string;
  reviewHoursB: string;
  reviewHoursC: string;
  requiresMonitoring: boolean;
  monitoringHoursA: string;
  monitoringHoursB: string;
  monitoringHoursC: string;
  isRequired: boolean;
  isParallel: boolean;
}

export interface ProductionProjectFormData {
  accessAssetId: number;
  workSpeedType: SpeedType;
  startDate: Date;
  estimatedCompletionDate?: Date;
  priorityOrder: number;
}

// ── 검증 헬퍼 함수 ───────────────────────────────────────────────────

export const isValidMediaType = (type: string): type is MediaType => {
  return Object.values(MediaType).includes(type as MediaType);
};

export const isValidSpeedType = (type: string): type is SpeedType => {
  return ["A", "B", "C"].includes(type);
};

export const isValidStageNumber = (stage: number): stage is StageNumber => {
  return stage >= 1 && stage <= 4;
};

export const isValidProjectStatus = (status: string): status is ProjectStatus => {
  return Object.values(ProjectStatus).includes(status as ProjectStatus);
};

export const isValidTaskStatus = (status: string): status is TaskStatus => {
  return Object.values(TaskStatus).includes(status as TaskStatus);
};

export const isValidPersonType = (type: string): type is PersonType => {
  return Object.values(PersonType).includes(type as PersonType);
};

export const isValidWorkType = (type: string): type is WorkType => {
  return Object.values(WorkType).includes(type as WorkType);
};

export const isValidQualityScore = (score: number): score is QualityScore => {
  return score >= 1 && score <= 5;
};

export const isValidLayoutMode = (mode: string): mode is LayoutMode => {
  return Object.values(LayoutMode).includes(mode as LayoutMode);
};

// ── ProductionDetailModal 전용 타입 ──────────────────────────────────────

export interface ProjectDetail {
  id: number;
  movieTitle: string;
  moviePoster?: string | null;
  mediaType: string;
  mediaTypeName: string;
  assetName: string;
  workSpeedType: WorkSpeedType;
  currentStage: StageNumber;
  progressPercentage: number;
  startDate: string;
  estimatedCompletionDate?: string | null;
  actualCompletionDate?: string | null;
  projectStatus: string;
  staffInfo: {
    mainWriter?: { name: string; role: string } | null;
    producer?: { name: string; role: string } | null;
    reviewers?: { name: string; role: string }[] | null;
    monitors?: { name: string; role: string }[] | null;
    voiceArtists?: { name: string; role: string }[] | null;
  };
}

export interface TaskDetail {
  id: number;
  stageNumber: StageNumber;
  taskName: string;
  taskOrder: number;
  taskStatus: TaskStatus;
  plannedHours: number;
  actualHours?: number | null;
  reviewRequired: boolean;
  monitoringRequired: boolean;
  isMainCompleted: boolean;
  isReviewCompleted: boolean;
  isMonitoringCompleted: boolean;
  assignedPerson?: string | null;
  reviewerPerson?: string | null;
  monitorPerson?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  mainCompletedAt?: string | null;
  reviewCompletedAt?: string | null;
  monitoringCompletedAt?: string | null;
}

export interface StageProgress {
  stageNumber: StageNumber;
  stageName: string;
  tasks: TaskDetail[];
  completedCount: number;
  totalCount: number;
  stageProgress: number;
}

export interface TaskUpdatePayload {
  taskId: number;
  field: 'isMainCompleted' | 'isReviewCompleted' | 'isMonitoringCompleted';
  value: boolean;
}
