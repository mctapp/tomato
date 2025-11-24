// components/production/ProductionMemoModal.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, Plus, Pin, PinOff, Edit2, Trash2, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useDebounce } from '@/hooks/useDebounce';

// Import MemoForm separately to avoid circular dependencies
const MemoForm = React.lazy(() => import('./MemoForm'));

// ── 타입 정의 ──────────────────────────────────────────────────────────

interface ProductionMemo {
  id: number;
  productionProjectId: number;
  productionTaskId?: number | null;
  memoContent: string;
  memoType: string;
  memoTypeLabel: string;
  priorityLevel: number;
  priorityLabel: string;
  tags: string[];
  isPinned: boolean;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  updatedBy?: number | null;
  updatedByName?: string | null;
  updatedAt: string;
  isActive: boolean;
  isProjectLevel: boolean;
  taskStageNumber?: number | null;
}

interface ProductionMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectTitle: string;
  taskId?: number | null;
}

// ── 상수 정의 (토마토 색상 계열) ──────────────────────────────────────────

const MEMO_TYPE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  general: { 
    bg: 'bg-gray-50', 
    text: 'text-gray-700', 
    dot: 'bg-gray-400' 
  },
  issue: { 
    bg: 'bg-red-50', 
    text: 'text-[#c75146]', 
    dot: 'bg-[#ff6246]' 
  },
  decision: { 
    bg: 'bg-green-50', 
    text: 'text-[#4da34c]', 
    dot: 'bg-[#4da34c]' 
  },
  review: { 
    bg: 'bg-orange-50', 
    text: 'text-[#ff8c42]', 
    dot: 'bg-[#ff8c42]' 
  },
};

const PRIORITY_COLORS: Record<number, string> = {
  5: 'bg-[#c75146] text-white',    // 긴급 - 진한 토마토
  4: 'bg-[#ff6246] text-white',    // 높음 - 메인 토마토
  3: 'bg-[#ff8c42] text-white',    // 보통 - 오렌지
  2: 'bg-[#f9c784] text-gray-700', // 낮음 - 피치
  1: 'bg-gray-200 text-gray-700',  // 최소
};

// ── 유틸리티 함수 ──────────────────────────────────────────────────────

// UTC 시간을 KST로 변환하여 표시
const formatTimeAgo = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    // UTC → KST 변환 (9시간 추가)
    const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    return formatDistanceToNow(kstDate, { addSuffix: true, locale: ko });
  } catch {
    return dateString;
  }
};

// 배열 확인 헬퍼
const ensureArray = (value: any): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) return value.split(',').map(s => s.trim());
  return [];
};

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────

export default function ProductionMemoModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  taskId,
}: ProductionMemoModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMemo, setEditingMemo] = useState<ProductionMemo | null>(null);

  // 메모 목록 조회
  const { data: memos = [], isLoading, refetch } = useQuery({
    queryKey: ['production-memos', projectId, taskId],
    queryFn: async () => {
      const endpoint = taskId 
        ? `/admin/api/production/memos/task/${taskId}`
        : `/admin/api/production/memos/project/${projectId}?includeTaskMemos=true`;
      
      const response = await fetchApi<ProductionMemo[]>(endpoint);
      // tags 배열 정규화
      return (response || []).map(memo => ({
        ...memo,
        tags: ensureArray(memo.tags)
      }));
    },
    enabled: isOpen,
  });

  // 메모 통계 조회
  const { data: stats } = useQuery({
    queryKey: ['production-memo-stats', projectId],
    queryFn: async () => {
      const response = await fetchApi<{
        totalMemos: number;
        byType: Record<string, number>;
        byPriority: Record<number, number>;
        pinnedCount: number;
      }>(`/admin/api/production/memos/stats/project/${projectId}`);
      return response;
    },
    enabled: isOpen,
  });

  // 핀 토글 뮤테이션
  const togglePinMutation = useMutation({
    mutationFn: async (memoId: number) => {
      await fetchApi(`/admin/api/production/memos/${memoId}/pin`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      refetch();
      toast.success('핀 상태가 변경되었습니다.');
    },
    onError: () => {
      toast.error('핀 상태 변경에 실패했습니다.');
    },
  });

  // 메모 삭제 뮤테이션
  const deleteMemoMutation = useMutation({
    mutationFn: async (memoId: number) => {
      await fetchApi(`/admin/api/production/memos/${memoId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      refetch();
      toast.success('메모가 삭제되었습니다.');
      // 칸반보드 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['production-kanban'] });
    },
    onError: () => {
      toast.error('메모 삭제에 실패했습니다.');
    },
  });

  // 필터링된 메모
  const filteredMemos = memos.filter(memo => {
    // 탭 필터
    if (activeTab === 'project' && !memo.isProjectLevel) return false;
    if (activeTab === 'task' && memo.isProjectLevel) return false;
    
    // 타입 필터
    if (selectedType && memo.memoType !== selectedType) return false;
    
    // 검색어 필터
    if (debouncedSearchTerm) {
      const search = debouncedSearchTerm.toLowerCase();
      const memoTags = ensureArray(memo.tags);
      return (
        memo.memoContent.toLowerCase().includes(search) ||
        memoTags.some(tag => tag.toLowerCase().includes(search))
      );
    }
    
    return true;
  });

  // 핀 고정 메모와 일반 메모 분리
  const pinnedMemos = filteredMemos.filter(memo => memo.isPinned);
  const regularMemos = filteredMemos.filter(memo => !memo.isPinned);

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingMemo(null);
    refetch();
    // 칸반보드 데이터 새로고침
    queryClient.invalidateQueries({ queryKey: ['production-kanban'] });
  };

  const handleEdit = (memo: ProductionMemo) => {
    setEditingMemo(memo);
    setShowForm(true);
  };

  const handleDelete = (memoId: number) => {
    if (confirm('이 메모를 삭제하시겠습니까?')) {
      deleteMemoMutation.mutate(memoId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[900px] h-[80vh] p-0" 
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-bold">
            {projectTitle} - 메모
          </DialogTitle>
          <DialogDescription className="sr-only">
            프로젝트 메모 관리 모달
          </DialogDescription>
          
          <div className="text-sm text-gray-600 mt-1">
            {taskId ? '이 태스크의 메모입니다.' : '프로젝트 전체 및 태스크별 메모를 관리합니다.'}
          </div>
          
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="메모 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedType(selectedType ? null : 'issue')}
              className={selectedType ? 'bg-[#fff5f3]' : ''}
            >
              <Filter className="h-4 w-4 mr-2" />
              필터
            </Button>
            
            <Button
              size="sm"
              onClick={() => {
                setEditingMemo(null);
                setShowForm(true);
              }}
              className="bg-[#ff6246] hover:bg-[#e55439] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              새 메모
            </Button>
          </div>
          
          {/* 메모 타입 필터 */}
          {selectedType !== null && (
            <div className="flex gap-2 mt-3">
              {['general', 'issue', 'decision', 'review'].map(type => {
                const style = MEMO_TYPE_STYLES[type];
                return (
                  <Badge
                    key={type}
                    variant={selectedType === type ? 'default' : 'outline'}
                    className={`cursor-pointer text-xs py-0.5 px-2 ${selectedType === type ? `${style.bg} ${style.text}` : ''}`}
                    onClick={() => setSelectedType(selectedType === type ? null : type)}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot} mr-1`} />
                    {type === 'general' && '일반'}
                    {type === 'issue' && '이슈'}
                    {type === 'decision' && '결정'}
                    {type === 'review' && '검토'}
                  </Badge>
                );
              })}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {showForm ? (
            <div className="h-full overflow-y-auto p-6">
              <React.Suspense fallback={<div>로딩 중...</div>}>
                <MemoForm
                  projectId={projectId}
                  taskId={taskId}
                  editingMemo={editingMemo}
                  onSuccess={handleFormSuccess}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingMemo(null);
                  }}
                />
              </React.Suspense>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="w-full justify-start px-6 py-0 h-12 bg-transparent border-b rounded-none flex-shrink-0">
                <TabsTrigger value="all" className="data-[state=active]:border-b-2 data-[state=active]:border-[#ff6246]">
                  전체 ({stats?.totalMemos || 0})
                </TabsTrigger>
                <TabsTrigger value="project" className="data-[state=active]:border-b-2 data-[state=active]:border-[#ff6246]">
                  프로젝트
                </TabsTrigger>
                <TabsTrigger value="task" className="data-[state=active]:border-b-2 data-[state=active]:border-[#ff6246]">
                  태스크
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="flex-1 m-0 p-0 overflow-hidden" style={{ minHeight: 0 }}>
                <div className="h-full overflow-y-auto">
                  <div className="p-6 space-y-4">
                    {isLoading ? (
                      <div className="text-center py-8 text-gray-500">
                        메모를 불러오는 중...
                      </div>
                    ) : filteredMemos.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        메모가 없습니다.
                      </div>
                    ) : (
                      <>
                        {/* 핀 고정 메모 */}
                        {pinnedMemos.length > 0 && (
                          <>
                            <div className="flex items-center gap-2 mb-3">
                              <Pin className="h-4 w-4 text-[#ff6246]" />
                              <span className="text-sm font-medium text-gray-700">
                                핀 고정 메모
                              </span>
                            </div>
                            {pinnedMemos.map(memo => (
                              <MemoCard
                                key={memo.id}
                                memo={memo}
                                totalMemos={filteredMemos.length}
                                onTogglePin={() => togglePinMutation.mutate(memo.id)}
                                onEdit={() => handleEdit(memo)}
                                onDelete={() => handleDelete(memo.id)}
                              />
                            ))}
                            {regularMemos.length > 0 && (
                              <Separator className="my-6" />
                            )}
                          </>
                        )}
                        
                        {/* 일반 메모 */}
                        {regularMemos.map(memo => (
                          <MemoCard
                            key={memo.id}
                            memo={memo}
                            totalMemos={filteredMemos.length}
                            onTogglePin={() => togglePinMutation.mutate(memo.id)}
                            onEdit={() => handleEdit(memo)}
                            onDelete={() => handleDelete(memo.id)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── 메모 카드 컴포넌트 ───────────────────────────────────────────────────

interface MemoCardProps {
  memo: ProductionMemo;
  totalMemos: number;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function MemoCard({ memo, totalMemos, onTogglePin, onEdit, onDelete }: MemoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const memoTags = ensureArray(memo.tags);
  
  // 메모가 1개면 전체 표시, 2개 이상이면 축약
  const shouldCollapse = totalMemos > 1;
  const isLongContent = memo.memoContent.split('\n').length > 2 || memo.memoContent.length > 150;
  const shouldShowToggle = shouldCollapse && isLongContent && !isExpanded;
  
  // 축약된 내용
  const displayContent = shouldShowToggle 
    ? memo.memoContent.split('\n').slice(0, 2).join('\n').substring(0, 150) + '...'
    : memo.memoContent;

  const memoStyle = MEMO_TYPE_STYLES[memo.memoType] || MEMO_TYPE_STYLES.general;

  return (
    <div 
      className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <Badge className={`${memoStyle.bg} ${memoStyle.text} border-0 text-xs py-0.5 px-2`}>
            <span className={`w-1.5 h-1.5 rounded-full ${memoStyle.dot} mr-1`} />
            {memo.memoTypeLabel}
          </Badge>
          <Badge className={`${PRIORITY_COLORS[memo.priorityLevel]} text-xs py-0.5 px-2`}>
            {memo.priorityLabel}
          </Badge>
          {memoTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {memoTags.map((tag, index) => (
                <Badge key={`${tag}-${index}`} variant="secondary" className="text-xs py-0.5 px-2 bg-[#fff5f3] text-[#ff6246] border-[#ffb5a6]">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
          {!memo.isProjectLevel && (
            <Badge variant="outline" className="text-xs py-0.5 px-2 border-[#ff6246] text-[#ff6246]">
              {memo.taskStageNumber ? `${memo.taskStageNumber}단계` : '태스크'}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePin}
            className="p-1 h-auto"
          >
            {memo.isPinned ? (
              <PinOff className="h-4 w-4 text-[#ff6246]" />
            ) : (
              <Pin className="h-4 w-4 text-gray-400" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="p-1 h-auto"
          >
            <Edit2 className="h-4 w-4 text-gray-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="p-1 h-auto"
          >
            <Trash2 className="h-4 w-4 text-gray-400" />
          </Button>
        </div>
      </div>
      
      <div className="text-sm text-gray-700 mb-3 whitespace-pre-wrap break-words max-w-full"
        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
      >
        <div 
          className={`${shouldCollapse && isLongContent ? 'cursor-pointer' : ''} ${isExpanded || !shouldCollapse || !isLongContent ? 'max-h-[400px] overflow-y-auto pr-2' : ''}`}
          onClick={() => shouldCollapse && isLongContent && !isExpanded && setIsExpanded(true)}
        >
          {displayContent}
        </div>
      </div>
      
      {shouldCollapse && isLongContent && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-[#ff6246] hover:text-[#e55439] p-0 h-auto"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                접기
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                더 보기
              </>
            )}
          </Button>
          
          {/* 시간과 작성자 정보 */}
          <div className="text-xs text-gray-500">
            {formatTimeAgo(memo.createdAt)} | {memo.createdByName}
          </div>
        </div>
      )}
      
      {/* 더보기 버튼이 없는 경우 시간과 작성자 정보 표시 */}
      {(!shouldCollapse || !isLongContent) && (
        <div className="text-xs text-gray-500 text-right">
          {formatTimeAgo(memo.createdAt)} | {memo.createdByName}
        </div>
      )}
    </div>
  );
}
