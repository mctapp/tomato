// app/dashboard/settings/page.tsx
"use client";

import DashboardApiPanel from "@/components/dashboard/api-explorer/DashboardApiPanel";
import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Loader2, Save, RotateCcw, GripVertical, ArrowLeft, Settings,
  Code, User, Building, File, BarChart2, Users, Film, Clock,
  CheckSquare, Mic, BookOpen, Database, Menu, PenTool, UserCog, Hand,
  FolderOpen
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CardDefinition, CardType, DashboardPreferences } from "@/lib/dashboard/types";
import { getAvailableCards } from "@/lib/dashboard/registry";
import { Role } from "@/types/auth";
import { apiClient } from '@/lib/utils/api-client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  id: string;
  card: CardDefinition;
  isVisible: boolean;
  onToggleVisibility: (cardId: string) => void;
}

function SortableItem({ id, card, isVisible, onToggleVisibility }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const getIconByType = (type: CardType) => {
    switch(type) {
      case 'profile': return User;
      case 'distributor': return Building;
      case 'asset': return File;
      case 'stats': return BarChart2;
      case 'users': return Users;
      case 'storage': return Database;
      case 'movie': return Film;
      case 'expiring-movie': return Clock;
      case 'todo': return CheckSquare;
      case 'voice-artist': return Mic;
      case 'recent-backups': return Save;
      case 'guideline': return BookOpen;
      case 'file-type': return FolderOpen;
      case 'scriptwriter': return PenTool;
      case 'staff': return UserCog;
      case 'sl-interpreter': return Hand;
      default: return Settings;
    }
  };
  
  const Icon = getIconByType(card.type);
  
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-md hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center">
        <Icon className="h-5 w-5 mr-2 text-[#4da34c]" />
        <span>{card.title}</span>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Switch
            id={`visibility-${card.id}`}
            checked={isVisible}
            onCheckedChange={() => onToggleVisibility(card.id)}
            className="data-[state=checked]:bg-[#ff6246]"
          />
          <Label htmlFor={`visibility-${card.id}`} className="sr-only">
            카드 표시 여부
          </Label>
        </div>
        <div {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-gray-400 cursor-grab hover:text-gray-600" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardSettingsPage() {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [availableCards, setAvailableCards] = useState<CardDefinition[]>([]);
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [visibleCards, setVisibleCards] = useState<string[]>([]);
  const [collapsedCards, setCollapsedCards] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("cards");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        
        const cardDefinitions = getAvailableCards(Role.ADMIN);
        setAvailableCards(cardDefinitions);
        
        const defaultCardOrder = cardDefinitions.map(card => card.id);
        
        try {
          const preferences = await apiClient.get<DashboardPreferences>('/admin/api/dashboard/preferences');
          
          setCardOrder(preferences.cardOrder || defaultCardOrder);
          setVisibleCards(preferences.visibleCards || defaultCardOrder);
          setCollapsedCards(preferences.collapsedCards || []);
        } catch (error) {
          setCardOrder(defaultCardOrder);
          setVisibleCards(defaultCardOrder);
          setCollapsedCards([]);
        }
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);

  const toggleCardVisibility = (cardId: string) => {
    setVisibleCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setCardOrder((items) => {
        const activeId = typeof active.id === 'string' ? active.id : String(active.id);
        const overId = typeof over.id === 'string' ? over.id : String(over.id);
        
        const oldIndex = items.indexOf(activeId);
        const newIndex = items.indexOf(overId);
        
        if (oldIndex === -1 || newIndex === -1) return items;
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveSettings = async () => {
    try {
      if (visibleCards.length === 0) {
        toast.error('최소 한 개 이상의 카드를 표시해야 합니다');
        return;
      }
      
      setIsUpdating(true);
      
      const preferences: DashboardPreferences = {
        cardOrder: [...cardOrder],
        visibleCards: [...visibleCards],
        collapsedCards: [...collapsedCards]
      };
      
      await apiClient.put('/admin/api/dashboard/preferences', preferences);
      toast.success('대시보드 설정이 저장되었습니다');
    } catch (error) {
      toast.error('대시보드 설정 저장에 실패했습니다');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetSettings = () => {
    const defaultCardOrder = availableCards.map(card => card.id);
    const defaultVisibleCards = availableCards
      .filter(card => card.defaultVisible)
      .map(card => card.id);
    
    setCardOrder(defaultCardOrder);
    setVisibleCards(defaultVisibleCards);
    setCollapsedCards([]);
    
    toast.info('설정이 초기화되었습니다');
  };

  const renderContent = () => {
    if (activeTab === "cards") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>대시보드 카드 관리</CardTitle>
            <CardDescription>
              대시보드에 표시할 카드와 순서를 설정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <div className="font-medium">카드 이름</div>
                <div className="font-medium">표시 여부</div>
              </div>
              
              {cardOrder.length > 0 ? (
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={cardOrder}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {cardOrder.map((cardId) => {
                        const card = availableCards.find(c => c.id === cardId);
                        if (!card) return null;
                        
                        return (
                          <SortableItem 
                            key={card.id}
                            id={card.id}
                            card={card} 
                            isVisible={visibleCards.includes(card.id)}
                            onToggleVisibility={toggleCardVisibility}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  카드가 없습니다
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <div className="text-sm text-gray-500">
              드래그하여 카드 순서를 변경하고, 스위치로 표시 여부를 설정한 후 상단의 저장 버튼을 클릭하세요.
            </div>
          </CardFooter>
        </Card>
      );
    } else if (activeTab === "api") {
  return <DashboardApiPanel />;
}
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="max-w-[1200px] mx-auto py-10 flex items-center justify-center h-[70vh]">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff6246] mr-2" />
          <span>설정을 불러오는 중입니다...</span>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-[1200px] mx-auto py-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold">대시보드 설정</h1>
            
            {/* 브레드크럼 */}
            <div className="text-lg text-[#666666]">
              {'>'} {activeTab === "cards" ? "카드 관리" : "API 설정"}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/dashboard')} 
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              대시보드로 돌아가기
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 transition-all duration-200">
                  <Menu className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setActiveTab("cards")}>
                  카드 관리
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("api")}>
                  API 설정
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings/security')}>
                  보안 설정
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <button 
              onClick={handleResetSettings}
              disabled={isUpdating}
              className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-[#f5fbf5] hover:border-[#4da34c] text-gray-600 hover:text-[#4da34c] transition-all duration-200"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button 
              onClick={handleSaveSettings}
              disabled={isUpdating}
              className="p-2 rounded-lg border border-gray-300 bg-transparent text-gray-500 hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246] transition-colors"
            >
              {isUpdating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {renderContent()}
      </div>
    </ProtectedRoute>
  );
}
