// components/accessmedia/CreditsManager.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Plus, 
  GripVertical, 
  Save, 
  AlertCircle,
  User,
  Mic,
  HandMetal,
  Briefcase,
  Edit2,
  Trash2
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAccessAssetCredits } from '@/hooks/useAccessAssetCredits';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AddCreditDialog } from './AddCreditDialog';

interface CreditsManagerProps {
  assetId: number;
  mediaType: string;
}

const personTypeIcons = {
  scriptwriter: User,
  voice_artist: Mic,
  sl_interpreter: HandMetal,
  staff: Briefcase,
};

const personTypeRoutes = {
  scriptwriter: '/scriptwriters',
  voice_artist: '/voiceartists',
  sl_interpreter: '/slinterpreters',
  staff: '/staffs',
};

function CreditItem({ credit, index, assetId, refetch }: { credit: any; index: number; assetId: number; refetch: () => void }) {
  const router = useRouter();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: credit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = personTypeIcons[credit.personType as keyof typeof personTypeIcons] || User;
  const personName = credit.scriptwriter?.name || 
                    credit.voiceArtist?.voiceartistName || 
                    credit.slInterpreter?.name || 
                    credit.staff?.name || 
                    '알 수 없음';

  const handleNameClick = () => {
    const route = personTypeRoutes[credit.personType as keyof typeof personTypeRoutes];
    const personId = credit.personId;
    
    if (route && personId) {
      router.push(`${route}/${personId}`);
    }
  };

  const handleEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMemo = prompt('메모를 수정하세요:', credit.memo || '');
    if (newMemo !== null) {
      try {
        const response = await fetch(`/admin/api/access-assets/${assetId}/credits/${credit.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ memo: newMemo }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update credit');
        }
        
        await refetch();
      } catch (error) {
        console.error('Failed to update credit:', error);
        alert('크레디트 수정에 실패했습니다.');
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('이 크레디트를 삭제하시겠습니까?')) {
      try {
        const response = await fetch(`/admin/api/access-assets/${assetId}/credits/${credit.id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete credit');
        }
        
        await refetch();
      } catch (error) {
        console.error('Failed to delete credit:', error);
        alert('크레디트 삭제에 실패했습니다.');
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center p-4 bg-white border rounded-lg group"
    >
      <div {...attributes} {...listeners} className="cursor-grab mr-3">
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="flex-shrink-0 mr-3">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-600">{index + 1}</span>
        </div>
      </div>
      
      <Avatar className="h-10 w-10 mr-3">
        <AvatarImage src={
          credit.scriptwriter?.profileImage ||
          credit.voiceArtist?.profileImage ||
          credit.slInterpreter?.profileImage ||
          credit.staff?.profileImage
        } />
        <AvatarFallback>
          <Icon className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
      
     <div className="flex-1">
  <button
    onClick={handleNameClick}
    className="font-medium text-left hover:text-[#ff6246] hover:underline transition-colors"
  >
    {personName}
  </button>
  <p className="text-sm text-gray-500">
    {credit.role} | {credit.isPrimary ? '주작업자' : '보조작업자'}
  </p>
  {credit.memo && (
    <p className="text-xs text-gray-400 mt-1">{credit.memo}</p>
  )}
</div>
      
      <Badge variant="outline" className="ml-2">
        {credit.personType === 'scriptwriter' ? '작가' :
         credit.personType === 'voice_artist' ? '성우' :
         credit.personType === 'sl_interpreter' ? '수어통역사' :
         credit.personType === 'staff' ? '스태프' : credit.personType}
      </Badge>
      
      <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleEdit}
          className="h-8 w-8 p-0"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          className="h-8 w-8 p-0 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function CreditsManager({ assetId, mediaType }: CreditsManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [credits, setCredits] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  const queryClient = useQueryClient();
  const { data: creditsData, isLoading, refetch } = useAccessAssetCredits(assetId);
  
  const reorderMutation = useMutation({
    mutationFn: async ({ assetId, creditIds }: { assetId: number; creditIds: number[] }) => {
      const response = await fetch(`/admin/api/access-assets/${assetId}/credits/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ creditIds }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reorder credits');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessAssetCredits', assetId] });
    },
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (creditsData) {
      setCredits(creditsData);
      setHasChanges(false);
    }
  }, [creditsData]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }
    
    const oldIndex = credits.findIndex((c) => c.id === active.id);
    const newIndex = credits.findIndex((c) => c.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newCredits = arrayMove(credits, oldIndex, newIndex);
      setCredits(newCredits);
      setHasChanges(true);
    }
  };

  const handleSaveOrder = async () => {
    try {
      const creditIds = credits.map(c => c.id);
      await reorderMutation.mutateAsync({
        assetId,
        creditIds
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save order:', error);
    }
  };

  const handleAddCredit = async (creditData: any) => {
    try {
      const response = await fetch(`/admin/api/access-assets/${assetId}/credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(creditData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add credit');
      }
      
      await refetch();
      setShowAddDialog(false);
    } catch (error) {
      console.error('Failed to add credit:', error);
      alert('크레디트 추가에 실패했습니다.');
    }
  };

  return (
    <>
      <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="p-4 pb-2 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <Users className="h-5 w-5 mr-2 text-[#ff6246]" />
                크레디트
              </CardTitle>
              <CardDescription>제작에 참여한 인원 목록</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {hasChanges && (
                <Button 
                  size="sm" 
                  onClick={handleSaveOrder}
                  disabled={reorderMutation.isPending}
                  className="bg-[#4da34c] hover:bg-[#3d8a3d] text-white"
                >
                  <Save className="h-4 w-4 mr-1" />
                  순서 저장
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowAddDialog(true)}
                className="hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c]"
              >
                <Plus className="h-4 w-4 mr-1" />
                인원 추가
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">

          {hasChanges && (
  <Alert className="mb-4 border-orange-200 bg-orange-50" style={{ minWidth: '400px' }}>
    <div className="flex items-start gap-2">
      <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
      <div className="text-sm whitespace-nowrap">
        <span className="text-orange-700 font-semibold">변경사항 있음:</span>{' '}
        크레디트 순서가 변경되었습니다. 상단의 "순서 저장" 버튼을 클릭하여 저장하세요.
      </div>
    </div>
  </Alert>
)}
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              크레디트 정보를 불러오는 중...
            </div>
          ) : credits.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">등록된 크레디트가 없습니다.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                첫 인원 추가하기
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={credits.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {credits.map((credit, index) => (
                    <CreditItem 
                      key={credit.id} 
                      credit={credit} 
                      index={index}
                      assetId={assetId}
                      refetch={refetch}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
      
      <AddCreditDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        mediaType={mediaType}
        existingCredits={credits}
        onAdd={handleAddCredit}
      />
    </>
  );
}
