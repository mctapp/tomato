// components/production/ProductionTemplateManager.tsx

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  AlertCircle, Save, RotateCcw, Clock, Loader2, CheckCircle, 
  AlertTriangle, Plus, Trash2, GripVertical, X, FileCheck,
  ListChecks, Gauge
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { fetchApi } from '@/lib/api';

// ── 타입 정의 (엄격한 타입 체크) ──────────────────────────────────────────────

type WorkSpeedType = 'A' | 'B' | 'C';
type MediaType = 'AD' | 'CC' | 'SL' | 'AI' | 'CI' | 'SI' | 'AR' | 'CR' | 'SR';
type StageNumber = 1 | 2 | 3 | 4;

interface ProductionTemplate {
  id: number;
  mediaType: MediaType;
  stageNumber: StageNumber;
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
  isActive: boolean;
  qualityChecklist?: any;
  // 프론트엔드 전용 필드
  isNew?: boolean;
  tempId?: string;
}

interface MediaTypeTemplates {
  mediaType: MediaType;
  mediaTypeName: string;
  stages: Record<StageNumber, ProductionTemplate[]>;
}

interface MediaTypeOption {
  value: MediaType;
  label: string;
}

interface HoursEstimation {
  mediaType: MediaType;
  mediaTypeName: string;
  workSpeedType: WorkSpeedType;
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
}

interface ApiError extends Error {
  status?: number;
  code?: string;
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// API 응답 타입 (수정됨)
interface ApiMediaTypeOption {
  mediaType?: unknown;
  mediaTypeName?: unknown;
}

interface ApiTemplateData {
  id?: unknown;
  mediaType?: unknown;
  stageNumber?: unknown;
  taskName?: unknown;
  taskOrder?: unknown;
  speedAHours?: unknown;
  speedBHours?: unknown;
  speedCHours?: unknown;
  requiresReview?: unknown;
  reviewHoursA?: unknown;
  reviewHoursB?: unknown;
  reviewHoursC?: unknown;
  requiresMonitoring?: unknown;
  monitoringHoursA?: unknown;
  monitoringHoursB?: unknown;
  monitoringHoursC?: unknown;
  isRequired?: unknown;
  isParallel?: unknown;
  isActive?: unknown;
  qualityChecklist?: unknown;
}

interface ApiMediaTypeTemplates {
  mediaType?: unknown;
  mediaTypeName?: unknown;
  stages?: unknown;
}

interface ApiHoursEstimation {
  mediaType?: unknown;
  mediaTypeName?: unknown;
  workSpeedType?: unknown;
  totalMainHours?: unknown;
  totalReviewHours?: unknown;
  totalMonitoringHours?: unknown;
  totalHours?: unknown;
  estimatedDays?: unknown;
  stageBreakdown?: unknown;
}

// ── 상수 정의 (토마토 색상) ──────────────────────────────────────────────

const STAGE_COLORS: Record<StageNumber, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  2: { bg: 'bg-[#fff5f3]', text: 'text-[#ff6246]', border: 'border-[#ffb5a6]' },
  3: { bg: 'bg-[#f9f7f4]', text: 'text-[#ff8c42]', border: 'border-[#f9c784]' },
  4: { bg: 'bg-[#e6f4e6]', text: 'text-[#4da34c]', border: 'border-[#a3d4a3]' }
};

const SPEED_TYPE_INFO = {
  A: { label: '빠름', color: 'bg-[#ff6246] text-white', borderColor: 'border-[#ff6246]' },
  B: { label: '보통', color: 'bg-[#ff8c42] text-white', borderColor: 'border-[#ff8c42]' },
  C: { label: '여유', color: 'bg-[#4da34c] text-white', borderColor: 'border-[#4da34c]' }
};

const STAGE_NAMES: Record<StageNumber, string> = {
  1: '자료 준비 및 섭외',
  2: '해설대본 작성',
  3: '녹음/편집',
  4: '선재 제작/배포'
};

// ── 타입 가드 및 유틸리티 함수 ──────────────────────────────────────────────

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const validateHoursInput = (value: string | number | null | undefined): number | null => {
  if (value == null || value === '') return null;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num) || num < 0 || num > 200) {
    return null;
  }
  
  return Math.round(num * 2) / 2; // 0.5 단위로 반올림
};

const safeParseNumber = (value: unknown, defaultValue: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

const isValidMediaType = (value: unknown): value is MediaType => {
  return typeof value === 'string' && ['AD', 'CC', 'SL', 'AI', 'CI', 'SI', 'AR', 'CR', 'SR'].includes(value);
};

const isValidWorkSpeedType = (value: unknown): value is WorkSpeedType => {
  return typeof value === 'string' && ['A', 'B', 'C'].includes(value);
};

const isValidStageNumber = (value: unknown): value is StageNumber => {
  return typeof value === 'number' && [1, 2, 3, 4].includes(value);
};

// 수정된 검증 함수 - API 응답 형식에 맞춤
const validateMediaTypeOption = (data: unknown): MediaTypeOption | null => {
  if (!isRecord(data)) return null;
  
  // API가 mediaType과 mediaTypeName을 반환하므로 이에 맞춤
  const mediaType = data.mediaType;
  const mediaTypeName = data.mediaTypeName;
  
  if (!isValidMediaType(mediaType)) return null;
  if (typeof mediaTypeName !== 'string') return null;
  
  return { 
    value: mediaType, 
    label: mediaTypeName 
  };
};

const validateTemplateData = (template: unknown): ProductionTemplate | null => {
  if (!isRecord(template)) return null;

  const id = safeParseNumber(template.id);
  if (id === 0) return null; // ID가 없으면 유효하지 않은 템플릿

  const mediaType = template.mediaType;
  if (!isValidMediaType(mediaType)) return null;

  const stageNumber = safeParseNumber(template.stageNumber);
  if (!isValidStageNumber(stageNumber)) return null;

  const taskName = template.taskName;
  if (typeof taskName !== 'string' || !taskName.trim()) return null;

  return {
    id,
    mediaType,
    stageNumber,
    taskName,
    taskOrder: safeParseNumber(template.taskOrder),
    speedAHours: safeParseNumber(template.speedAHours),
    speedBHours: safeParseNumber(template.speedBHours),
    speedCHours: safeParseNumber(template.speedCHours),
    requiresReview: Boolean(template.requiresReview),
    reviewHoursA: safeParseNumber(template.reviewHoursA),
    reviewHoursB: safeParseNumber(template.reviewHoursB),
    reviewHoursC: safeParseNumber(template.reviewHoursC),
    requiresMonitoring: Boolean(template.requiresMonitoring),
    monitoringHoursA: safeParseNumber(template.monitoringHoursA),
    monitoringHoursB: safeParseNumber(template.monitoringHoursB),
    monitoringHoursC: safeParseNumber(template.monitoringHoursC),
    isRequired: Boolean(template.isRequired),
    isParallel: Boolean(template.isParallel),
    isActive: Boolean(template.isActive),
    qualityChecklist: template.qualityChecklist
  };
};

const validateEstimationData = (estimation: unknown): HoursEstimation | null => {
  if (!isRecord(estimation)) return null;

  const mediaType = estimation.mediaType;
  if (!isValidMediaType(mediaType)) return null;

  const workSpeedType = estimation.workSpeedType;
  if (!isValidWorkSpeedType(workSpeedType)) return null;

  return {
    mediaType,
    mediaTypeName: typeof estimation.mediaTypeName === 'string' ? estimation.mediaTypeName : '',
    workSpeedType,
    totalMainHours: safeParseNumber(estimation.totalMainHours),
    totalReviewHours: safeParseNumber(estimation.totalReviewHours),
    totalMonitoringHours: safeParseNumber(estimation.totalMonitoringHours),
    totalHours: safeParseNumber(estimation.totalHours),
    estimatedDays: safeParseNumber(estimation.estimatedDays),
    stageBreakdown: isRecord(estimation.stageBreakdown) ? estimation.stageBreakdown as any : {}
  };
};

const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

// 새로운 태스크 생성 함수
const createNewTemplate = (
  mediaType: MediaType, 
  stageNumber: StageNumber, 
  taskOrder: number
): ProductionTemplate => {
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id: -1, // 임시 ID
    tempId,
    isNew: true,
    mediaType,
    stageNumber,
    taskName: '새 작업',
    taskOrder,
    speedAHours: 1.0,
    speedBHours: 1.0,
    speedCHours: 1.0,
    requiresReview: false,
    reviewHoursA: 0,
    reviewHoursB: 0,
    reviewHoursC: 0,
    requiresMonitoring: false,
    monitoringHoursA: 0,
    monitoringHoursB: 0,
    monitoringHoursC: 0,
    isRequired: true,
    isParallel: false,
    isActive: true,
  };
};

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────

export function ProductionTemplateManager() {
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // 상태 관리 (엄격한 타입)
  const [mediaTypes, setMediaTypes] = useState<MediaTypeOption[]>([]);
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType>('AD');
  const [templates, setTemplates] = useState<MediaTypeTemplates | null>(null);
  const [estimation, setEstimation] = useState<HoursEstimation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [selectedSpeedType, setSelectedSpeedType] = useState<WorkSpeedType>('B');
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    stageNumber: StageNumber;
    taskIndex: number;
    taskName: string;
  } | null>(null);

  // DnD 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // AbortController 관리
  const createAbortController = useCallback((key: string): AbortController => {
    const existing = abortControllersRef.current.get(key);
    if (existing) {
      existing.abort();
    }
    const controller = new AbortController();
    abortControllersRef.current.set(key, controller);
    return controller;
  }, []);

  const cleanup = useCallback(() => {
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();
  }, []);

  // ── 데이터 로딩 (fetchApi 사용) ──────────────────────────────────────────────

  const fetchMediaTypes = useCallback(async () => {
    const controller = createAbortController('mediaTypes');
    
    try {
      const data = await fetchApi<ApiMediaTypeOption[]>(
        '/admin/api/production/templates/media-types',
        { signal: controller.signal }
      );
      
      const validatedTypes: MediaTypeOption[] = [];
      
      if (Array.isArray(data)) {
        for (const item of data) {
          const validated = validateMediaTypeOption(item);
          if (validated) {
            validatedTypes.push(validated);
          }
        }
      }
      
      setMediaTypes(validatedTypes);
      
      if (validatedTypes.length > 0 && !validatedTypes.find(t => t.value === selectedMediaType)) {
        setSelectedMediaType(validatedTypes[0].value);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('미디어 타입 로딩 오류:', error);
        setError('미디어 타입을 불러올 수 없습니다');
        
        // 기본값 설정
        setMediaTypes([
          { value: 'AD', label: '음성해설' },
          { value: 'CC', label: '자막해설' },
          { value: 'SL', label: '수어해설' }
        ]);
      }
    }
  }, [createAbortController, selectedMediaType]);

  const fetchTemplates = useCallback(async (mediaType: MediaType) => {
    if (!isValidMediaType(mediaType)) {
      setError('유효하지 않은 미디어 타입입니다');
      return;
    }

    const controller = createAbortController('templates');

    try {
      const data = await fetchApi<ApiMediaTypeTemplates>(
        `/admin/api/production/templates/${mediaType}`,
        { signal: controller.signal }
      );
      
      if (!isRecord(data)) {
        throw new Error('Invalid response data');
      }

      const validatedTemplates: MediaTypeTemplates = {
        mediaType: isValidMediaType(data.mediaType) ? data.mediaType : mediaType,
        mediaTypeName: typeof data.mediaTypeName === 'string' ? data.mediaTypeName : mediaType,
        stages: {} as Record<StageNumber, ProductionTemplate[]>
      };

      // stages 데이터 처리
      if (isRecord(data.stages)) {
        for (let stageNum = 1; stageNum <= 4; stageNum++) {
          if (!isValidStageNumber(stageNum)) continue;
          
          validatedTemplates.stages[stageNum] = [];
          
          const stageKey = stageNum.toString();
          const stageData = data.stages[stageKey];
          
          if (Array.isArray(stageData)) {
            for (const template of stageData) {
              const validated = validateTemplateData(template);
              if (validated) {
                validatedTemplates.stages[stageNum].push(validated);
              }
            }
            
            // task_order로 정렬
            validatedTemplates.stages[stageNum].sort((a, b) => a.taskOrder - b.taskOrder);
          }
        }
      }
      
      setTemplates(validatedTemplates);
      setHasUnsavedChanges(false);
      setValidationErrors([]);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('템플릿 로딩 오류:', error);
        setError('템플릿을 불러올 수 없습니다');
      }
    }
  }, [createAbortController]);

  const fetchEstimation = useCallback(async (mediaType: MediaType, speedType: WorkSpeedType) => {
    if (!isValidMediaType(mediaType) || !isValidWorkSpeedType(speedType)) {
      return;
    }

    const controller = createAbortController('estimation');

    try {
      const data = await fetchApi<ApiHoursEstimation>(
        `/admin/api/production/templates/${mediaType}/hours-estimation?work_speed_type=${speedType}`,
        { signal: controller.signal }
      );
      
      const validatedEstimation = validateEstimationData(data);
      
      if (validatedEstimation) {
        setEstimation(validatedEstimation);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('시간 추정 로딩 오류:', error);
      }
    }
  }, [createAbortController]);

  const loadData = useCallback(async (mediaType: MediaType, speedType: WorkSpeedType) => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchTemplates(mediaType),
        fetchEstimation(mediaType, speedType)
      ]);
    } catch (error) {
      // 개별 fetch에서 이미 에러 처리됨
    } finally {
      setLoading(false);
    }
  }, [fetchTemplates, fetchEstimation]);

  // ── 기본값 초기화 ──────────────────────────────────────────────────────

  const initializeDefaults = useCallback(async () => {
    if (initializing) return;

    try {
      setInitializing(true);
      
      await fetchApi('/admin/api/production/templates/initialize-defaults', {
        method: 'POST'
      });
      
      toast.success("초기화 완료", {
        description: "기본 템플릿이 성공적으로 초기화되었습니다.",
        duration: 3000
      });

      await loadData(selectedMediaType, selectedSpeedType);
      
    } catch (error) {
      // 에러는 fetchApi에서 이미 처리됨
    } finally {
      setInitializing(false);
    }
  }, [loadData, selectedMediaType, selectedSpeedType, initializing]);

  // ── 템플릿 수정 (타입 안전성 강화) ──────────────────────────────────────────────

  const updateTemplate = useCallback((
    stageNumber: number, 
    taskIndex: number, 
    field: keyof ProductionTemplate, 
    value: any
  ) => {
    if (!templates || !isValidStageNumber(stageNumber)) return;

    let validatedValue = value;
    
    if (field.includes('Hours')) {
      const numValue = validateHoursInput(value);
      if (numValue === null) {
        setValidationErrors(prev => [
          ...prev.filter(e => e.field !== `${stageNumber}-${taskIndex}-${field}`),
          {
            field: `${stageNumber}-${taskIndex}-${field}`,
            message: '시간 값은 0시간 이상 200시간 이하여야 합니다',
            value
          }
        ]);
        return;
      }
      validatedValue = numValue;
    } else {
      setValidationErrors(prev => 
        prev.filter(e => e.field !== `${stageNumber}-${taskIndex}-${field}`)
      );
    }

    setTemplates(prevTemplates => {
      if (!prevTemplates) return prevTemplates;

      try {
        const updatedTemplates: MediaTypeTemplates = {
          ...prevTemplates,
          stages: {
            ...prevTemplates.stages,
            [stageNumber]: prevTemplates.stages[stageNumber]?.map((template, index) => 
              index === taskIndex 
                ? { ...template, [field]: validatedValue }
                : { ...template }
            ) || []
          } as Record<StageNumber, ProductionTemplate[]>
        };

        return updatedTemplates;
      } catch (error) {
        console.error('Template update error:', error);
        return prevTemplates;
      }
    });

    setHasUnsavedChanges(true);
  }, [templates]);

  const debouncedUpdate = useCallback(
    debounce(updateTemplate, 300),
    [updateTemplate]
  );

  // ── 태스크 추가/삭제 ──────────────────────────────────────────────────────

  const addTask = useCallback((stageNumber: StageNumber) => {
    if (!templates) return;

    const currentTasks = templates.stages[stageNumber] || [];
    const maxOrder = currentTasks.length > 0 
      ? Math.max(...currentTasks.map(t => t.taskOrder)) 
      : 0;  // 태스크가 없으면 0부터 시작
    
    const newTask = createNewTemplate(selectedMediaType, stageNumber, maxOrder + 1);

    setTemplates(prevTemplates => {
      if (!prevTemplates) return prevTemplates;

      return {
        ...prevTemplates,
        stages: {
          ...prevTemplates.stages,
          [stageNumber]: [...(prevTemplates.stages[stageNumber] || []), newTask]
        } as Record<StageNumber, ProductionTemplate[]>
      };
    });

    setHasUnsavedChanges(true);
    
    toast.success("새 태스크가 추가되었습니다.", {
      description: "작업명과 소요 시간을 설정해주세요."
    });
  }, [templates, selectedMediaType]);

  const deleteTask = useCallback((stageNumber: StageNumber, taskIndex: number, taskName: string) => {
    if (!templates) return;

    const currentTasks = templates.stages[stageNumber] || [];
    
    // 최소 1개 태스크는 남아있어야 함
    if (currentTasks.length <= 1) {
      toast.error("삭제 불가", {
        description: "각 단계에는 최소 1개의 태스크가 있어야 합니다."
      });
      return;
    }

    // 삭제 확인 다이얼로그 표시
    setDeleteConfirmDialog({
      open: true,
      stageNumber,
      taskIndex,
      taskName
    });
  }, [templates]);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirmDialog || !templates) return;

    const { stageNumber, taskIndex } = deleteConfirmDialog;

    setTemplates(prevTemplates => {
      if (!prevTemplates) return prevTemplates;

      const updatedTasks = prevTemplates.stages[stageNumber]
        .filter((_, index) => index !== taskIndex)
        .map((task, index) => ({ ...task, taskOrder: index + 1 })); // task_order를 1부터 시작하도록 수정

      return {
        ...prevTemplates,
        stages: {
          ...prevTemplates.stages,
          [stageNumber]: updatedTasks
        } as Record<StageNumber, ProductionTemplate[]>
      };
    });

    setHasUnsavedChanges(true);
    setDeleteConfirmDialog(null);
    
    toast.success("태스크가 삭제되었습니다.");
  }, [deleteConfirmDialog, templates]);

  // ── DnD 핸들러 ──────────────────────────────────────────────────────

  const handleDragEnd = useCallback((event: DragEndEvent, stageNumber: StageNumber) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !templates) return;

    const activeIndex = parseInt(active.id.toString().split('-').pop() || '0');
    const overIndex = parseInt(over.id.toString().split('-').pop() || '0');

    setTemplates(prevTemplates => {
      if (!prevTemplates) return prevTemplates;

      const items = [...(prevTemplates.stages[stageNumber] || [])];
      const reorderedItems = arrayMove(items, activeIndex, overIndex);
      
      // task_order를 1부터 시작하도록 수정
      const updatedItems = reorderedItems.map((item, index) => ({
        ...item,
        taskOrder: index + 1
      }));

      return {
        ...prevTemplates,
        stages: {
          ...prevTemplates.stages,
          [stageNumber]: updatedItems
        } as Record<StageNumber, ProductionTemplate[]>
      };
    });

    setHasUnsavedChanges(true);
  }, [templates]);

  // ── 템플릿 저장 (검증 강화) ──────────────────────────────────────────────────

  const saveTemplates = useCallback(async () => {
    if (!templates || saving) return;

    if (validationErrors.length > 0) {
      toast.error("검증 오류", {
        description: "입력값을 확인해주세요."
      });
      return;
    }

    try {
      setSaving(true);

      const allTemplates: any[] = [];
      let hasValidationError = false;

      for (const [stageNumStr, stageTemplates] of Object.entries(templates.stages)) {
        const stageNum = parseInt(stageNumStr, 10);
        if (!isValidStageNumber(stageNum)) continue;

        for (const template of stageTemplates) {
          // 새로운 태스크는 id 없이 전송
          const isNew = template.isNew || template.id === -1;
          
          try {
            const speedAHours = validateHoursInput(template.speedAHours);
            const speedBHours = validateHoursInput(template.speedBHours);
            const speedCHours = validateHoursInput(template.speedCHours);

            if (speedAHours === null || speedBHours === null || speedCHours === null) {
              hasValidationError = true;
              continue;
            }

            const templateData: any = {
              media_type: template.mediaType,
              stage_number: template.stageNumber,
              task_name: template.taskName.trim(),
              task_order: template.taskOrder,
              speed_a_hours: speedAHours,
              speed_b_hours: speedBHours,
              speed_c_hours: speedCHours,
              requires_review: template.requiresReview,
              review_hours_a: validateHoursInput(template.reviewHoursA) || 0,
              review_hours_b: validateHoursInput(template.reviewHoursB) || 0,
              review_hours_c: validateHoursInput(template.reviewHoursC) || 0,
              requires_monitoring: template.requiresMonitoring,
              monitoring_hours_a: validateHoursInput(template.monitoringHoursA) || 0,
              monitoring_hours_b: validateHoursInput(template.monitoringHoursB) || 0,
              monitoring_hours_c: validateHoursInput(template.monitoringHoursC) || 0,
              is_required: template.isRequired,
              is_parallel: template.isParallel
            };

            // 기존 템플릿은 id 포함
            if (!isNew) {
              templateData.id = template.id;
            }

            allTemplates.push(templateData);
          } catch (error) {
            console.error('Template validation error:', error);
            hasValidationError = true;
          }
        }
      }

      if (hasValidationError) {
        toast.error("검증 오류", {
          description: "일부 템플릿 데이터가 유효하지 않습니다."
        });
        return;
      }

      await fetchApi(`/admin/api/production/templates/${selectedMediaType}/bulk`, {
        method: 'PUT',
        body: JSON.stringify(allTemplates)
      });

      toast.success("저장 완료", {
        description: "템플릿이 성공적으로 저장되었습니다.",
        duration: 3000
      });

      setHasUnsavedChanges(false);
      setValidationErrors([]);
      
      // 저장 후 데이터 다시 로드
      await loadData(selectedMediaType, selectedSpeedType);

    } catch (error) {
      // 에러는 fetchApi에서 이미 처리됨
    } finally {
      setSaving(false);
    }
  }, [templates, saving, selectedMediaType, selectedSpeedType, validationErrors, loadData]);

  // ── 생명주기 관리 ──────────────────────────────────────────────────────

  useEffect(() => {
    fetchMediaTypes();
    return cleanup;
  }, [fetchMediaTypes, cleanup]);

  useEffect(() => {
    if (isValidMediaType(selectedMediaType)) {
      loadData(selectedMediaType, selectedSpeedType);
    }
  }, [selectedMediaType, selectedSpeedType, loadData]);

  // ── 렌더링: 로딩 스켈레톤 ──────────────────────────────────────────────

  const renderLoadingSkeleton = () => (
    <div className="max-w-[1200px] mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
      
      <Skeleton className="h-12 w-full" />
      
      <div className="flex gap-6 flex-wrap">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="flex-1 min-w-[280px]">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map(j => (
                <Skeleton key={j} className="h-24 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // ── 렌더링: 에러 상태 ──────────────────────────────────────────────────

  const renderError = () => (
    <div className="max-w-[1200px] mx-auto py-6">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex justify-between items-center">
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(selectedMediaType, selectedSpeedType)}
            disabled={loading}
          >
            <RotateCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            다시 시도
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );

  // ── 메인 렌더링 ──────────────────────────────────────────────────────

  if (loading && !templates) {
    return renderLoadingSkeleton();
  }

  if (error && !templates) {
    return renderError();
  }

  return (
    <div className="max-w-[1200px] mx-auto py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#333333]">기본 작업 일정 설정</h1>
          <p className="text-muted-foreground mt-1">
            9가지 접근성 미디어 유형별 기본 소요 시간을 관리합니다
          </p>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 mt-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-amber-600">저장되지 않은 변경사항이 있습니다</span>
            </div>
          )}
          {validationErrors.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600">
                {validationErrors.length}개의 검증 오류가 있습니다
              </span>
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={initializeDefaults}
            disabled={initializing || saving}
            className="hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c]"
          >
            {initializing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-2" />
            )}
            기본값 초기화
          </Button>
          <Button
            onClick={saveTemplates}
            disabled={saving || !hasUnsavedChanges || validationErrors.length > 0}
            className={hasUnsavedChanges ? 'bg-[#4da34c] hover:bg-[#3d8a3c]' : ''}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            저장
          </Button>
        </div>
      </div>

      {/* 부분적 에러 알림 */}
      {error && templates && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            일부 데이터 로딩에 문제가 있습니다: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* 검증 에러 표시 */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">다음 항목을 확인해주세요:</div>
            <ul className="text-sm space-y-1">
              {validationErrors.slice(0, 3).map((error, index) => (
                <li key={index}>• {error.message}</li>
              ))}
              {validationErrors.length > 3 && (
                <li>• 그 외 {validationErrors.length - 3}개 항목</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 미디어 유형 선택 */}
      {mediaTypes.length > 0 && (
        <Tabs value={selectedMediaType} onValueChange={(value) => {
          if (isValidMediaType(value)) {
            setSelectedMediaType(value);
          }
        }}>
          <TabsList className="grid grid-cols-9 w-full bg-white border">
            {mediaTypes.map(type => (
              <TabsTrigger 
                key={type.value} 
                value={type.value} 
                className="text-xs data-[state=active]:bg-[#ff6246] data-[state=active]:text-white data-[state=active]:hover:bg-[#e5533a] hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-[#ff6246] focus-visible:ring-offset-0"
              >
                {type.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedMediaType} className="space-y-6">
            {/* 시간 추정 */}
            {estimation && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5 text-[#ff6246]" />
                    예상 소요 시간
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {(['A', 'B', 'C'] as const).map(speed => {
                      const isSelected = selectedSpeedType === speed;
                      let buttonClass = "justify-start transition-all focus-visible:ring-offset-0 ";
                      
                      if (isSelected) {
                        // 선택된 상태 - hover 시에도 같은 색상 유지
                        if (speed === 'A') {
                          buttonClass += "bg-[#ff6246] text-white hover:bg-[#e5533a] border-[#ff6246] focus-visible:ring-[#ff6246]";
                        } else if (speed === 'B') {
                          buttonClass += "bg-[#ff8c42] text-white hover:bg-[#e57a36] border-[#ff8c42] focus-visible:ring-[#ff8c42]";
                        } else {
                          buttonClass += "bg-[#4da34c] text-white hover:bg-[#3d8a3c] border-[#4da34c] focus-visible:ring-[#4da34c]";
                        }
                      } else {
                        // 선택되지 않은 상태
                        if (speed === 'A') {
                          buttonClass += "hover:bg-[#fff5f3] hover:border-[#ff6246] hover:text-[#ff6246] focus-visible:ring-[#ff6246]";
                        } else if (speed === 'B') {
                          buttonClass += "hover:bg-[#fff9f3] hover:border-[#ff8c42] hover:text-[#ff8c42] focus-visible:ring-[#ff8c42]";
                        } else {
                          buttonClass += "hover:bg-[#f5fbf5] hover:border-[#4da34c] hover:text-[#4da34c] focus-visible:ring-[#4da34c]";
                        }
                      }
                      
                      return (
                        <Button
                          key={speed}
                          variant="outline"
                          onClick={() => setSelectedSpeedType(speed)}
                          className={buttonClass}
                          disabled={loading}
                        >
                          <Gauge className="h-4 w-4 mr-2" />
                          <span className="mr-2">
                            {SPEED_TYPE_INFO[speed].label}
                          </span>
                          <Badge variant="secondary" className="ml-auto">
                            {speed}
                          </Badge>
                        </Button>
                      );
                    })}
                  </div>
                  
                  {selectedSpeedType === estimation.workSpeedType && (
                    <div className="space-y-4">
                      {/* 단계별 시간 분석 */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {([1, 2, 3, 4] as const).map(stageNum => {
                          const stageData = estimation.stageBreakdown?.[stageNum.toString()];
                          const colors = STAGE_COLORS[stageNum];
                          const stageHours = stageData?.totalHours || 0;
                          
                          return (
                            <div key={stageNum} className={`${colors.bg} rounded-lg p-4 ${colors.border} border text-center`}>
                              <div className={`${colors.text}`}>
                                <span className="text-3xl font-bold">{stageHours}</span>
                                <span className="text-lg ml-1">시간</span>
                              </div>
                              <div className="text-sm text-gray-700 mt-2 font-medium">{STAGE_NAMES[stageNum]}</div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* 예상 기간 */}
                      <div className="bg-gradient-to-r from-[#e6f4e6] to-[#f5fbf5] rounded-lg p-6 text-center border border-[#a3d4a3]">
                        <div className="flex items-center justify-center gap-4">
                          <div>
                            <div className="text-3xl font-bold text-[#4da34c]">
                              {estimation.estimatedDays}일
                            </div>
                            <div className="text-sm text-gray-600">예상 기간</div>
                          </div>
                          <div className="text-gray-400">≈</div>
                          <div>
                            <div className="text-2xl font-semibold text-gray-700">
                              {estimation.totalHours}시간
                            </div>
                            <div className="text-sm text-gray-600">총 소요 시간</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 단계별 템플릿 설정 */}
            {templates ? (
              <div className="flex gap-6 flex-wrap">
                {([1, 2, 3, 4] as const).map(stageNumber => (
                  <StageTemplateEditor
                    key={stageNumber}
                    stageNumber={stageNumber}
                    templates={templates.stages[stageNumber] || []}
                    onUpdate={(taskIndex, field, value) => 
                      updateTemplate(stageNumber, taskIndex, field, value)
                    }
                    onAddTask={() => addTask(stageNumber)}
                    onDeleteTask={(taskIndex, taskName) => deleteTask(stageNumber, taskIndex, taskName)}
                    onDragEnd={(event) => handleDragEnd(event, stageNumber)}
                    disabled={saving}
                    validationErrors={validationErrors.filter(e => 
                      e.field.startsWith(`${stageNumber}-`)
                    )}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">템플릿이 없습니다</h3>
                <p className="text-gray-600 mb-4">
                  이 미디어 유형에 대한 템플릿이 설정되지 않았습니다.
                </p>
                <Button onClick={initializeDefaults} disabled={initializing}>
                  기본 템플릿 생성
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={deleteConfirmDialog?.open || false}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmDialog(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>태스크 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteConfirmDialog?.taskName}" 태스크를 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── 단계별 템플릿 편집기 (DnD 추가) ────────────────────────────────────────

interface StageTemplateEditorProps {
  stageNumber: StageNumber;
  templates: ProductionTemplate[];
  onUpdate: (taskIndex: number, field: keyof ProductionTemplate, value: any) => void;
  onAddTask: () => void;
  onDeleteTask: (taskIndex: number, taskName: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  disabled?: boolean;
  validationErrors: ValidationError[];
}

function StageTemplateEditor({ 
  stageNumber, 
  templates, 
  onUpdate, 
  onAddTask,
  onDeleteTask,
  onDragEnd,
  disabled = false,
  validationErrors 
}: StageTemplateEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleHoursChange = (index: number, field: keyof ProductionTemplate, value: string) => {
    const validatedValue = validateHoursInput(value);
    if (validatedValue !== null) {
      onUpdate(index, field, validatedValue);
    } else {
      onUpdate(index, field, value);
    }
  };

  const getFieldError = (templateIndex: number, field: string): ValidationError | undefined => {
    return validationErrors.find(e => 
      e.field === `${stageNumber}-${templateIndex}-${field}`
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEndLocal = (event: DragEndEvent) => {
    setActiveId(null);
    onDragEnd(event);
  };

  const stageColors = STAGE_COLORS[stageNumber];

  return (
    <Card className={`flex-1 min-w-[280px] ${stageColors.border} overflow-hidden`}>
      <CardHeader className={`${stageColors.bg} ${stageColors.border} border-b`}>
        <div className="flex justify-between items-center">
          <CardTitle className={`text-lg flex items-center gap-2 ${stageColors.text}`}>
            <span className="font-medium">{STAGE_NAMES[stageNumber]}</span>
            <Badge variant="secondary" className="text-xs">
              {templates.length}개 작업
            </Badge>
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={onAddTask}
            disabled={disabled}
            className={`hover:${stageColors.bg}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {templates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ListChecks className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">이 단계에 작업이 없습니다</p>
            <Button
              size="sm"
              variant="outline"
              onClick={onAddTask}
              className="mt-4"
              disabled={disabled}
            >
              <Plus className="h-4 w-4 mr-1" />
              첫 태스크 추가
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={useSensors(
              useSensor(PointerSensor, {
                activationConstraint: {
                  distance: 8,
                },
              })
            )}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEndLocal}
          >
            <SortableContext
              items={templates.map((_, index) => `task-${stageNumber}-${index}`)}
              strategy={verticalListSortingStrategy}
            >
              {templates.map((template, index) => (
                <SortableTaskItem
                  key={template.tempId || template.id}
                  id={`task-${stageNumber}-${index}`}
                  template={template}
                  index={index}
                  onUpdate={onUpdate}
                  onDelete={onDeleteTask}
                  onHoursChange={handleHoursChange}
                  getFieldError={getFieldError}
                  disabled={disabled}
                  isNew={template.isNew || false}
                  stageNumber={stageNumber}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeId && templates.find((_, index) => `task-${stageNumber}-${index}` === activeId) && (
                <div className="border rounded-lg p-4 bg-white shadow-lg opacity-80">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">
                      {templates.find((_, index) => `task-${stageNumber}-${index}` === activeId)?.taskName}
                    </span>
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}

// ── Sortable 태스크 아이템 컴포넌트 ──────────────────────────────────────

interface SortableTaskItemProps {
  id: string;
  template: ProductionTemplate;
  index: number;
  onUpdate: (index: number, field: keyof ProductionTemplate, value: any) => void;
  onDelete: (index: number, taskName: string) => void;
  onHoursChange: (index: number, field: keyof ProductionTemplate, value: string) => void;
  getFieldError: (templateIndex: number, field: string) => ValidationError | undefined;
  disabled: boolean;
  isNew: boolean;
  stageNumber: StageNumber;
}

function SortableTaskItem({
  id,
  template,
  index,
  onUpdate,
  onDelete,
  onHoursChange,
  getFieldError,
  disabled,
  isNew,
  stageNumber
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const stageColors = STAGE_COLORS[stageNumber];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group border rounded-lg p-4 space-y-3 bg-white ${
        isDragging ? 'shadow-lg' : 'shadow-sm'
      } ${isNew ? 'border-[#4da34c] bg-[#f5fbf5]' : ''} hover:shadow-md transition-shadow`}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
        
        {/* 작업명 */}
        <Input
          value={template.taskName}
          onChange={(e) => onUpdate(index, 'taskName', e.target.value)}
          className="flex-1 font-medium"
          disabled={disabled}
          placeholder="작업명을 입력하세요"
        />
        
        {/* 삭제 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(index, template.taskName)}
          disabled={disabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {isNew && (
        <div className="text-xs text-[#4da34c] flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          새로 추가된 태스크입니다. 저장 후 반영됩니다.
        </div>
      )}

      {/* 속도별 소요 시간 */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: 'speedAHours' as const, label: '빠름(A)' },
          { key: 'speedBHours' as const, label: '보통(B)' },
          { key: 'speedCHours' as const, label: '여유(C)' }
        ].map(({ key, label }) => {
          const error = getFieldError(index, key);
          return (
            <div key={key}>
              <Label className={`text-xs font-medium mb-1 block`}>{label}</Label>
              <Input
                type="number"
                min="0"
                max="200"
                step="0.5"
                value={template[key]}
                onChange={(e) => onHoursChange(index, key, e.target.value)}
                className={`text-sm ${error ? 'border-red-500' : ''}`}
                disabled={disabled}
              />
              {error && (
                <div className="text-xs text-red-500 mt-1">{error.message}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 감수/모니터링 설정 */}
      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={template.requiresReview}
            onCheckedChange={(checked) => onUpdate(index, 'requiresReview', checked)}
            disabled={disabled}
            className="data-[state=checked]:bg-[#ff8c42] data-[state=checked]:border-[#ff8c42] focus-visible:ring-[#ff8c42] focus-visible:ring-offset-0"
          />
          <Label className="text-sm cursor-pointer whitespace-nowrap">감수</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={template.requiresMonitoring}
            onCheckedChange={(checked) => onUpdate(index, 'requiresMonitoring', checked)}
            disabled={disabled}
            className="data-[state=checked]:bg-[#c75146] data-[state=checked]:border-[#c75146] focus-visible:ring-[#c75146] focus-visible:ring-offset-0"
          />
          <Label className="text-sm cursor-pointer whitespace-nowrap">모니터링</Label>
        </div>
      </div>

      {/* 감수 시간 (조건부 표시) */}
      {template.requiresReview && (
        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
          <Label className="text-sm font-medium mb-2 block text-[#ff8c42]">감수 소요 시간</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'reviewHoursA' as const, label: '빠름(A)' },
              { key: 'reviewHoursB' as const, label: '보통(B)' },
              { key: 'reviewHoursC' as const, label: '여유(C)' }
            ].map(({ key, label }) => {
              const error = getFieldError(index, key);
              return (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={template[key]}
                    onChange={(e) => onHoursChange(index, key, e.target.value)}
                    className={`text-xs ${error ? 'border-red-500' : ''}`}
                    disabled={disabled}
                  />
                  {error && (
                    <div className="text-xs text-red-500 mt-1">{error.message}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 모니터링 시간 (조건부 표시) */}
      {template.requiresMonitoring && (
        <div className="bg-red-50 p-3 rounded-lg border border-red-200">
          <Label className="text-sm font-medium mb-2 block text-[#c75146]">모니터링 소요 시간</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'monitoringHoursA' as const, label: '빠름(A)' },
              { key: 'monitoringHoursB' as const, label: '보통(B)' },
              { key: 'monitoringHoursC' as const, label: '여유(C)' }
            ].map(({ key, label }) => {
              const error = getFieldError(index, key);
              return (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={template[key]}
                    onChange={(e) => onHoursChange(index, key, e.target.value)}
                    className={`text-xs ${error ? 'border-red-500' : ''}`}
                    disabled={disabled}
                  />
                  {error && (
                    <div className="text-xs text-red-500 mt-1">{error.message}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
