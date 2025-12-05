// components/dashboard/TodoCard.tsx
"use client";
import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Plus, Trash2, Edit, X, Loader2, EyeOff, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTodos, useCreateTodo, useUpdateTodo, useDeleteTodo } from "@/hooks/data/useTodos";
import { Todo, TodoCreate, TodoUpdate } from "@/types/todo";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const ITEMS_PER_PAGE = 5;

export function TodoCard() {
  const [newTodo, setNewTodo] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium');
  // 완료된 할 일 표시 여부를 위한 상태
  const [showCompleted, setShowCompleted] = useState(false);
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);

  // React Query 훅 사용
  const { 
    data: todos, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useTodos();
  const createTodoMutation = useCreateTodo();
  const updateTodoMutation = useUpdateTodo();
  const deleteTodoMutation = useDeleteTodo();

  // 필터링된 할 일 목록 계산
  const filteredTodos = todos ? todos.filter(todo => showCompleted ? true : !todo.is_completed) : [];

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredTodos.length / ITEMS_PER_PAGE);
  const paginatedTodos = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTodos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTodos, currentPage]);

  // 페이지 변경 시 범위 체크
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // 에러 처리를 위한 useEffect
  useEffect(() => {
    if (isError && error) {
      console.error('Failed to fetch todos:', error);
      toast.error('할 일 목록을 불러올 수 없습니다.');
    }
  }, [isError, error]);

  // 할 일 추가
  const addTodo = async () => {
    if (newTodo.trim() === '') return;

    try {
      await createTodoMutation.mutateAsync({
        title: newTodo.trim(),
        priority: selectedPriority,
        is_completed: false
      });
      
      setNewTodo('');
      setIsAdding(false);
      setSelectedPriority('medium');
    } catch (err) {
      console.error('Error adding todo:', err);
    }
  };

  // 할 일 완료 상태 토글
  const toggleComplete = async (todo: Todo) => {
    try {
      console.log('토글 전 상태:', todo.id, todo.is_completed);
      
      await updateTodoMutation.mutateAsync({
        id: todo.id,
        data: {
          is_completed: !todo.is_completed
        }
      });
      
      console.log('토글 요청 완료');
    } catch (err) {
      console.error('Error toggling todo completion:', err);
    }
  };

  // 할 일 삭제
  const deleteTodo = async (id: number) => {
    try {
      await deleteTodoMutation.mutateAsync(id);
    } catch (err) {
      console.error('Error deleting todo:', err);
    }
  };

  // 할 일 수정 시작
  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.title);
    setSelectedPriority(todo.priority as 'low' | 'medium' | 'high');
  };

  // 할 일 수정 완료
  const finishEdit = async () => {
    if (editText.trim() === '' || editingId === null) return;

    try {
      await updateTodoMutation.mutateAsync({
        id: editingId,
        data: {
          title: editText.trim(),
          priority: selectedPriority
        }
      });
      
      setEditingId(null);
      setEditText('');
    } catch (err) {
      console.error('Error updating todo:', err);
    }
  };

  // 할 일 수정 취소
  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  // 우선순위에 따른 배지 색상
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Badge variant="outline" className="bg-[#f5fbf5] text-[#4da34c] border-[#4da34c]">낮음</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-[#fff8f0] text-[#ff8c42] border-[#ff8c42]">중간</Badge>;
      case 'high':
        return <Badge variant="outline" className="bg-[#fff5f3] text-[#ff6246] border-[#ff6246]">높음</Badge>;
      default:
        return null;
    }
  };

  // 엔터 키로 할 일 추가 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  // 수정 중 엔터 키로 완료 처리
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEdit();
    }
  };

  // 로딩 중 표시
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-[#ff6246]" />
        <span className="ml-2">로딩 중...</span>
      </div>
    );
  }

  // 완료된 할 일 개수
  const completedCount = todos ? todos.filter(todo => todo.is_completed).length : 0;
  const totalCount = todos ? todos.length : 0;

  return (
    <div className="space-y-3">
      {/* 할 일 추가 폼 */}
      {isAdding ? (
        <div className="space-y-2">
          <Input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="새 할 일을 입력하세요"
            className="w-full"
            autoFocus
            onKeyDown={handleKeyDown}
            disabled={createTodoMutation.isPending}
          />
          
          <div className="flex space-x-2 mb-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`${
                selectedPriority === 'low' 
                  ? 'bg-[#f5fbf5] text-[#4da34c] border-[#4da34c]' 
                  : 'text-gray-500'
              }`}
              onClick={() => setSelectedPriority('low')}
              disabled={createTodoMutation.isPending}
            >
              낮음
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`${
                selectedPriority === 'medium' 
                  ? 'bg-[#fff8f0] text-[#ff8c42] border-[#ff8c42]' 
                  : 'text-gray-500'
              }`}
              onClick={() => setSelectedPriority('medium')}
              disabled={createTodoMutation.isPending}
            >
              중간
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`${
                selectedPriority === 'high' 
                  ? 'bg-[#fff5f3] text-[#ff6246] border-[#ff6246]' 
                  : 'text-gray-500'
              }`}
              onClick={() => setSelectedPriority('high')}
              disabled={createTodoMutation.isPending}
            >
              높음
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button
              type="submit"
              size="sm"
              className="bg-[#4da34c] hover:bg-[#3a8a39] text-white"
              onClick={addTodo}
              disabled={createTodoMutation.isPending}
            >
              {createTodoMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  추가 중...
                </>
              ) : (
                '추가'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewTodo('');
              }}
              disabled={createTodoMutation.isPending}
            >
              취소
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setIsAdding(true)}
          variant="outline"
          className="w-full border-dashed border-gray-300 hover:border-[#4da34c] hover:text-[#4da34c]"
        >
          <Plus className="h-4 w-4 mr-2" />
          할 일 추가
        </Button>
      )}
      
      {/* 완료된 할 일 표시 여부 토글 */}
      {completedCount > 0 && (
        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
          <div className="text-sm text-gray-500 flex items-center">
            <span>{completedCount}/{totalCount} 완료됨</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              {showCompleted ? '완료된 항목 숨기기' : '완료된 항목 표시'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full"
              onClick={() => setShowCompleted(!showCompleted)}
            >
              {showCompleted ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
      
      {/* API 에러 발생 시 재시도 버튼 */}
      {isError && (
        <div className="flex justify-center mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            className="text-[#ff6246] border-[#ff6246] hover:bg-[#fff5f3]"
          >
            <Loader2 className="h-4 w-4 mr-2" />
            재시도
          </Button>
        </div>
      )}
      
      {/* 할 일 목록 */}
      <div className="space-y-2">
        {filteredTodos.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-4">
            {todos && todos.length > 0
              ? '모든 할 일이 완료되었습니다.'
              : '할 일이 없습니다.'}
          </p>
        ) : (
          paginatedTodos.map((todo) => (
            <div 
              key={todo.id} 
              className={`flex items-center justify-between p-2 rounded-md border ${
                todo.is_completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
              }`}
            >
              {editingId === todo.id ? (
                <div className="w-full space-y-2">
                  <Input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full"
                    autoFocus
                    onKeyDown={handleEditKeyDown}
                    disabled={updateTodoMutation.isPending}
                  />
                  
                  <div className="flex space-x-2 mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`${
                        selectedPriority === 'low' 
                          ? 'bg-[#f5fbf5] text-[#4da34c] border-[#4da34c]' 
                          : 'text-gray-500'
                      }`}
                      onClick={() => setSelectedPriority('low')}
                      disabled={updateTodoMutation.isPending}
                    >
                      낮음
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`${
                        selectedPriority === 'medium' 
                          ? 'bg-[#fff8f0] text-[#ff8c42] border-[#ff8c42]' 
                          : 'text-gray-500'
                      }`}
                      onClick={() => setSelectedPriority('medium')}
                      disabled={updateTodoMutation.isPending}
                    >
                      중간
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`${
                        selectedPriority === 'high' 
                          ? 'bg-[#fff5f3] text-[#ff6246] border-[#ff6246]' 
                          : 'text-gray-500'
                      }`}
                      onClick={() => setSelectedPriority('high')}
                      disabled={updateTodoMutation.isPending}
                    >
                      높음
                    </Button>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      className="bg-[#4da34c] hover:bg-[#3a8a39] text-white"
                      onClick={finishEdit}
                      disabled={updateTodoMutation.isPending}
                    >
                      {updateTodoMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          저장 중...
                        </>
                      ) : (
                        '저장'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEdit}
                      disabled={updateTodoMutation.isPending}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center flex-1 min-w-0">
                    <button
                      className={`mr-2 flex-shrink-0 h-5 w-5 rounded-full border ${
                        todo.is_completed 
                          ? 'bg-[#4da34c] border-[#4da34c] text-white flex items-center justify-center' 
                          : 'border-gray-300'
                      }`}
                      onClick={() => toggleComplete(todo)}
                      disabled={updateTodoMutation.isPending}
                    >
                      {todo.is_completed && <Check className="h-3 w-3" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${todo.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                        {todo.title}
                      </p>
                      <div className="mt-1">
                        {getPriorityBadge(todo.priority)}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <button
                      className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      onClick={() => startEdit(todo)}
                      disabled={updateTodoMutation.isPending || deleteTodoMutation.isPending}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-[#ff6246]"
                      onClick={() => deleteTodo(todo.id)}
                      disabled={deleteTodoMutation.isPending}
                    >
                      {deleteTodoMutation.isPending && deleteTodoMutation.variables === todo.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#ff6246]" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-500">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
