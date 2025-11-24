// components/production/ProductionCard.tsx

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import ProductionMemoModal from './ProductionMemoModal';
import ProductionDetailModal from './ProductionDetailModal';
import { 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  Clock,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Film,
  Pin,
  PinOff,
  Loader2
} from 'lucide-react';

// ── 타입 정의 ──────────────────────────────────────────────────────────

interface StaffInfo {
  name: string;
  role: string;
  isPrimary?: boolean;
}

interface ProjectStaffInfo {
  mainWriter?: StaffInfo | null;
  producer?: StaffInfo | null;
  reviewers?: StaffInfo[] | null; 
  monitors?: StaffInfo[] | null;  
  voiceArtists?: StaffInfo[] | null;
  otherStaff?: StaffInfo[] | null;
}

interface ChecklistItem {
  id: number;
  item: string;
  required: boolean;
  checked: boolean;
}

interface ProductionCardData {
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
  isPinned?: boolean;
}

interface ProductionCardProps {
  card: ProductionCardData;
  isDragging: boolean;
  isInDragOverlay?: boolean;
  onOpenDetail?: (projectId: number) => void;
  onTogglePin?: (projectId: number) => void;
  onOpenMemo?: (projectId: number) => void;
}

// ── 유틸리티 함수 ──────────────────────────────────────────────────────

const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  } catch (error) {
    console.warn('Invalid date format:', dateString);
    return '-';
  }
};

const clampProgress = (value: number): number => {
  if (isNaN(value) || value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
};

const getTotalStaffCount = (staffInfo: ProjectStaffInfo | null | undefined): number => {
  if (!staffInfo) return 0;
  
  return [
    staffInfo.mainWriter ? 1 : 0,
    staffInfo.producer ? 1 : 0,
    staffInfo.reviewers?.length || 0,
    staffInfo.monitors?.length || 0,
    staffInfo.voiceArtists?.length || 0,
    staffInfo.otherStaff?.length || 0
  ].reduce((a, b) => a + b, 0);
};

// ── 영화 포스터 컴포넌트 ──────────────────────────────────────────

interface MoviePosterProps {
  poster?: string | null;
  title: string;
}

function MoviePoster({ poster, title }: MoviePosterProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(!!poster);

  const getInitial = (text: string): string => {
    if (!text) return '?';
    const firstChar = text.trim()[0];
    return firstChar ? firstChar.toUpperCase() : '?';
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const getAvatarColor = (text: string): string => {
    const colors = [
      'bg-red-200 text-red-700',
      'bg-orange-200 text-orange-700',
      'bg-yellow-200 text-yellow-700',
      'bg-green-200 text-green-700',
      'bg-blue-200 text-blue-700',
      'bg-indigo-200 text-indigo-700',
      'bg-purple-200 text-purple-700',
      'bg-pink-200 text-pink-700',
    ];
    
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const shouldShowFallback = !poster || imageError;
  const avatarColor = getAvatarColor(title);

  return (
    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
      {shouldShowFallback ? (
        <div className={`w-full h-full flex items-center justify-center ${avatarColor}`}>
          <span className="text-sm font-bold">{getInitial(title)}</span>
        </div>
      ) : (
        <>
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
              <Film className="w-5 h-5 text-gray-400" />
            </div>
          )}
          
          <img 
            src={poster} 
            alt={title}
            className={`w-full h-full object-cover ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        </>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────

export function ProductionCard({ 
  card, 
  isDragging, 
  isInDragOverlay = false,
  onOpenDetail,
  onTogglePin,
  onOpenMemo
}: ProductionCardProps) {
  // Pin 상태에 따라 초기 확장 상태 설정
  const [isExpanded, setIsExpanded] = useState(card.isPinned || false);
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showBackwardConfirm, setShowBackwardConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [pendingStageMove, setPendingStageMove] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `card-${card.id}`,
    disabled: isDragging || isInDragOverlay,
    data: {
      type: 'card',
      card: card
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.3 : 1,
  };

  // ── 헬퍼 함수 ──────────────────────────────────────────────────────────

  const getSpeedTypeColor = (type: string | null | undefined) => {
    switch (type?.toUpperCase()) {
      case 'A': return 'bg-red-100 text-red-800 border-red-200';
      case 'B': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'C': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSpeedTypeLabel = (type: string | null | undefined) => {
    switch (type?.toUpperCase()) {
      case 'A': return '빠름';
      case 'B': return '보통';
      case 'C': return '여유';
      default: return '보통';
    }
  };

  const getDaysRemainingColor = (days: number, isOverdue: boolean) => {
    if (isOverdue) return 'bg-red-100 text-red-700';
    if (days <= 3) return 'bg-orange-100 text-orange-700';
    if (days <= 7) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const getMainResponsible = () => {
    if (!card.staffInfo) return null;
    
    if (card.staffInfo.mainWriter) {
      return {
        name: card.staffInfo.mainWriter.name,
        role: '해설작가',
        isPrimary: card.staffInfo.mainWriter.isPrimary
      };
    }
    if (card.staffInfo.producer) {
      return {
        name: card.staffInfo.producer.name,
        role: '프로듀서',
        isPrimary: card.staffInfo.producer.isPrimary
      };
    }
    if (card.staffInfo.voiceArtists && card.staffInfo.voiceArtists.length > 0) {
      return {
        name: card.staffInfo.voiceArtists[0].name,
        role: '성우',
        isPrimary: card.staffInfo.voiceArtists[0].isPrimary
      };
    }
    return null;
  };

  const hasNoStaff = !card.staffInfo || getTotalStaffCount(card.staffInfo) === 0;
  const mainResponsible = getMainResponsible();
  const isOverdue = card.isOverdue ?? false;
  const daysRemaining = card.daysRemaining ?? 0;
  const memoCount = card.memoCount || 0;
  
  // props로 받은 진행률을 우선 사용 - null/undefined 처리 추가
  const progressValue = clampProgress(card.progressPercentage ?? 0);
  const currentStage = card.currentStage ?? 1;

  // Pin 상태가 변경되면 확장 상태도 업데이트
  useEffect(() => {
    if (card.isPinned) {
      setIsExpanded(true);
    }
  }, [card.isPinned]);

  // ── 이벤트 핸들러 ──────────────────────────────────────────────────────

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleViewDetails = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (onOpenDetail) {
      onOpenDetail(card.id);
    } else {
      setIsDetailModalOpen(true);
    }
  }, [onOpenDetail, card.id]);

  const handleOpenMemo = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onOpenMemo) {
      onOpenMemo(card.id);
    } else {
      setIsMemoModalOpen(true);
    }
  }, [onOpenMemo, card.id]);

  const handleTogglePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onTogglePin) {
      onTogglePin(card.id);
    }
  }, [onTogglePin, card.id]);

  const handleComplete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!card.id) return;
    
    // 완료 확인 다이얼로그
    if (!confirm('프로젝트를 완료 처리하시겠습니까?\n완료 후에는 되돌릴 수 없습니다.')) {
      return;
    }
    
    setIsCompleting(true);
    
    try {
      await fetchApi(`/admin/api/production/kanban/projects/${card.id}/complete`, {
        method: 'POST'
      });
      
      toast.success('프로젝트가 완료되었습니다.', {
        description: '연관된 미디어 자산도 완료 상태로 변경되었습니다.'
      });
      
      // 페이지 새로고침 또는 데이터 리로드
      if (window.location.reload) {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      console.error('프로젝트 완료 처리 실패:', error);
      toast.error('프로젝트 완료 처리에 실패했습니다.');
    } finally {
      setIsCompleting(false);
    }
  }, [card.id]);

  const handleMoveCard = async (targetStage: number) => {
    try {
      await fetchApi('/admin/api/production/kanban/move-card', {
        method: 'POST',
        body: JSON.stringify({
          projectId: card.id,
          targetStage: targetStage
        })
      });
      
      // 페이지 새로고침 대신 onRefresh 콜백 사용
      if (window.location.reload) {
        window.location.reload();
      }
    } catch (error) {
      toast.error('카드 이동에 실패했습니다');
    }
  };

  const confirmBackwardMove = () => {
    if (pendingStageMove !== null) {
      handleMoveCard(pendingStageMove);
      setShowBackwardConfirm(false);
      setPendingStageMove(null);
    }
  };

  const confirmCompleteMove = () => {
    if (pendingStageMove !== null) {
      handleMoveCard(pendingStageMove);
      setShowCompleteConfirm(false);
      setPendingStageMove(null);
    }
  };

  // ── 렌더링 ───────────────────────────────────────────────────────────

  return (
    <>
      <Card 
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`
          transition-all select-none cursor-grab active:cursor-grabbing
          ${isOverdue ? 'border-red-500 shadow-red-100' : 'hover:shadow-md border-gray-200'}
          ${isSortableDragging ? 'shadow-lg rotate-2' : ''}
          ${isInDragOverlay ? 'shadow-2xl rotate-3' : ''}
          ${hasNoStaff ? 'border-orange-400' : ''}
          ${card.isPinned ? 'border-[#ff6246] shadow-[#ff6246]/10' : ''}
        `}
      >
        <CardContent className="p-4 relative">
                    
          {/* 헤더 */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <MoviePoster poster={card.moviePoster} title={card.movieTitle} />
              
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-sm leading-tight mb-1 truncate" title={card.movieTitle}>
                  {card.movieTitle || '제목 없음'}
                </h4>
                <div className="flex gap-1 mb-2 flex-wrap">
                  <Badge variant="outline" className="text-[11px] px-1.5 py-0">
                    {card.mediaTypeName || card.mediaType || '유형없음'}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-[11px] px-1.5 py-0 border ${getSpeedTypeColor(card.workSpeedType)}`}
                  >
                    {getSpeedTypeLabel(card.workSpeedType)}
                  </Badge>
                  <div className="flex items-center gap-0.5 flex-nowrap">
                    {card.daysRemaining !== null && (
                      <Badge className={`text-[11px] px-1.5 py-0 ${getDaysRemainingColor(daysRemaining, isOverdue)}`}>
                        {isOverdue 
                          ? `${Math.abs(daysRemaining)}일 지연` 
                          : `D-${daysRemaining}`
                        }
                      </Badge>
                    )}
                    {onTogglePin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleTogglePin}
                        className={`h-[22px] w-[22px] p-0 text-[11px] ${card.isPinned ? 'text-[#ff6246]' : 'text-gray-400'}`}
                        title={card.isPinned ? "핀 해제" : "핀 고정"}
                      >
                        {card.isPinned ? (
                          <PinOff className="h-3 w-3" />
                        ) : (
                          <Pin className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                  {hasNoStaff && (
                    <Badge variant="destructive" className="text-[11px] px-1.5 py-0">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      담당자 없음
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* 확장/축소 버튼 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleExpand}
              className="p-1 h-auto hover:bg-gray-100 flex-shrink-0"
              title={isExpanded ? "접기" : "펼치기"}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* 기본 정보 */}
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>진행률</span>
                <span>{progressValue}%</span>
              </div>
              <Progress 
                value={progressValue} 
                className="h-2"
                indicatorClassName="bg-[#ff6246]"
              />
            </div>
          </div>

          {/* 확장 상태 */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t space-y-4">
              
              {/* 1단계 체크리스트 표시 */}
              {currentStage === 1 && card.checklistItems && card.checklistItems.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                  <h5 className="font-medium text-sm flex items-center gap-2">
                    자료 준비 체크리스트
                    <Badge variant="secondary" className="text-xs">
                      {Object.values(card.checklistProgress || {}).filter(Boolean).length}/{card.checklistItems.length}
                    </Badge>
                  </h5>
                  
                  <div className="space-y-2">
                    {card.checklistItems.map((item) => {
                      const isChecked = card.checklistProgress?.[item.id.toString()] || false;
                      
                      return (
                        <div key={item.id} className="flex items-start gap-2">
                          <Checkbox
                            id={`checklist-${item.id}`}
                            checked={isChecked}
                            onCheckedChange={async (checked) => {
                              if (!card.taskId) return;
                              
                              try {
                                const newProgress = {
                                  ...card.checklistProgress,
                                  [item.id.toString()]: checked as boolean
                                };
                                
                                await fetchApi(`/admin/api/production/kanban/task/${card.taskId}/checklist`, {
                                  method: 'PATCH',
                                  body: JSON.stringify(newProgress)
                                });
                                
                                toast.success("체크리스트가 업데이트되었습니다");
                                
                                if (window.location.reload) {
                                  setTimeout(() => window.location.reload(), 1000);
                                }
                              } catch (error) {
                                toast.error("체크리스트 업데이트에 실패했습니다");
                              }
                            }}
                            className="mt-1"
                          />
                          <label 
                            htmlFor={`checklist-${item.id}`}
                            className={`text-sm cursor-pointer ${isChecked ? 'line-through text-gray-500' : ''}`}
                          >
                            {item.item}
                            {item.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  
                  <Progress 
                    value={Object.values(card.checklistProgress || {}).filter(Boolean).length / card.checklistItems.length * 100} 
                    className="h-2 mt-2"
                    indicatorClassName="bg-[#ff6246]"
                  />
                </div>
              )}
              
              {/* 상세 스태프 정보 (최대 4명 표시) */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <h5 className="font-medium text-sm flex items-center gap-2">
                  참여 스태프
                  <Badge variant="secondary" className="text-xs">
                    {getTotalStaffCount(card.staffInfo)}명
                  </Badge>
                  {hasNoStaff && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      배정 필요
                    </Badge>
                  )}
                </h5>
                
                {hasNoStaff ? (
                  <div className="text-center py-3 text-sm text-orange-600">
                    <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                    아직 담당자가 배정되지 않았습니다.
                  </div>
                ) : (
                  <>
                    {(() => {
                      const staffList: Array<{label: string; name: string; isPrimary?: boolean}> = [];
                      
                      // 스태프 목록 구성
                      if (card.staffInfo?.mainWriter) {
                        staffList.push({
                          label: "해설작가",
                          name: card.staffInfo.mainWriter.name,
                          isPrimary: card.staffInfo.mainWriter.isPrimary
                        });
                      }
                      
                      if (card.staffInfo?.producer) {
                        staffList.push({
                          label: "프로듀서",
                          name: card.staffInfo.producer.name,
                          isPrimary: card.staffInfo.producer.isPrimary
                        });
                      }
                      
                      card.staffInfo?.reviewers?.forEach(r => {
                        staffList.push({
                          label: "감수",
                          name: r.name,
                          isPrimary: r.isPrimary
                        });
                      });
                      
                      card.staffInfo?.monitors?.forEach(m => {
                        staffList.push({
                          label: "모니터링",
                          name: m.name,
                          isPrimary: m.isPrimary
                        });
                      });
                      
                      card.staffInfo?.voiceArtists?.forEach(v => {
                        staffList.push({
                          label: "성우",
                          name: v.name,
                          isPrimary: v.isPrimary
                        });
                      });
                      
                      card.staffInfo?.otherStaff?.forEach(s => {
                        staffList.push({
                          label: "기타",
                          name: s.name,
                          isPrimary: s.isPrimary
                        });
                      });
                      
                      // 최대 4명까지만 표시
                      const displayStaff = staffList.slice(0, 4);
                      const remainingCount = staffList.length - 4;
                      
                      return (
                        <>
                          {displayStaff.map((staff, index) => (
                            <StaffRow
                              key={index}
                              label={staff.label}
                              name={staff.name}
                              isPrimary={staff.isPrimary}
                            />
                          ))}
                          {remainingCount > 0 && (
                            <div className="text-xs text-gray-500 text-center pt-1">
                              +{remainingCount}명 더 보기
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* 프로젝트 세부 정보 */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">시작일</span>
                  <div className="font-medium">{formatDate(card.startDate)}</div>
                </div>
                <div>
                  <span className="text-gray-500">예정 완료일</span>
                  <div className="font-medium">{formatDate(card.estimatedCompletionDate)}</div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 text-xs"
                  onClick={handleViewDetails}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  상세보기
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-xs"
                  onClick={handleOpenMemo}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  메모{memoCount > 0 && ` (${memoCount})`}
                </Button>
                
                {currentStage === 4 && progressValue === 100 && (
                  <Button 
                    size="sm"
                    className="text-xs bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleComplete}
                    disabled={isCompleting}
                  >
                    {isCompleting ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      '완료'
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 모달들 */}
      {!onOpenMemo && isMemoModalOpen && (
        <ProductionMemoModal
          isOpen={isMemoModalOpen}
          onClose={() => setIsMemoModalOpen(false)}
          projectId={card.id}
          projectTitle={card.movieTitle}
          taskId={card.taskId}
        />
      )}
      
      {/* onOpenDetail이 없을 때만 내부 모달 사용 */}
      {!onOpenDetail && isDetailModalOpen && (
        <ProductionDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          projectId={card.id}
          onRefresh={() => {
            if (window.location.reload) {
              window.location.reload();
            }
          }}
        />
      )}

      {/* 뒤로 가기 확인 대화상자 */}
      <AlertDialog open={showBackwardConfirm} onOpenChange={setShowBackwardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>진행된 작업을 취소하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이전 단계로 돌아가면 현재 단계의 작업 진행 상황이 초기화됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStageMove(null)}>
              아니오
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBackwardMove}
              className="bg-red-600 hover:bg-red-700"
            >
              예
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 프로젝트 완료 확인 대화상자 */}
      <AlertDialog open={showCompleteConfirm} onOpenChange={setShowCompleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프로젝트를 완료하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              프로젝트가 완료되면 다시 되돌릴 수 없습니다. 계속 진행하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStageMove(null)}>
              아니오
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCompleteMove}
              className="bg-green-600 hover:bg-green-700"
            >
              예
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── 스태프 행 컴포넌트 ───────────────────────────────────────────────────

interface StaffRowProps {
  label: string;
  name: string;
  isPrimary?: boolean;
}

function StaffRow({ label, name, isPrimary }: StaffRowProps) {
  return (
    <div className="flex justify-between text-xs items-center">
      <span className="text-gray-600 min-w-[60px] flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1 flex-1 justify-end min-w-0">
        {isPrimary && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0 flex-shrink-0">
            주
          </Badge>
        )}
        <span className="font-medium text-right truncate" title={name}>
          {name}
        </span>
      </div>
    </div>
  );
}
