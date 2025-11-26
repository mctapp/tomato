// hooks/data/useTodos.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Todo, TodoCreate, TodoUpdate } from '@/types/todo';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

// Todo 목록 가져오기
export function useTodos() {
  return useQuery<Todo[], Error>({
    queryKey: ['todos'],
    queryFn: async () => {
      const data = await apiClient.get<Todo[]>('/admin/api/todos');
      return data;
    },
    staleTime: 60 * 1000, // 1분
  });
}

// Todo 생성
export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation<Todo, Error, TodoCreate>({
    mutationFn: async (todo: TodoCreate) => {
      const data = await apiClient.post<Todo>('/admin/api/todos', todo);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      toast.success(`할 일이 추가되었습니다`);
    },
    onError: (error) => {
      console.error("Error creating todo:", error.message);
      toast.error('할 일 추가에 실패했습니다. 다시 시도해주세요.');
    }
  });
}

// 컨텍스트 타입 정의
interface UpdateTodoContext {
  previousTodos?: Todo[];
}

// Todo 업데이트 - 낙관적 업데이트 추가
export function useUpdateTodo() {
  const queryClient = useQueryClient();
  
  return useMutation<Todo, Error, { id: number; data: TodoUpdate }, UpdateTodoContext>({
    mutationFn: async ({ id, data }) => {
      console.log('업데이트 요청 데이터:', id, data); // 디버깅용 로그
      const response = await apiClient.put<Todo>(`/admin/api/todos/${id}`, data);
      return response;
    },
    
    // 낙관적 업데이트 추가
    onMutate: async ({ id, data }) => {
      // 이전 쿼리 데이터 백업
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);
      
      // 캐시 데이터 낙관적으로 업데이트
      queryClient.setQueryData<Todo[]>(['todos'], (old) => {
        if (!old) return [];
        return old.map(todo => 
          todo.id === id ? { ...todo, ...data } : todo
        );
      });
      
      return { previousTodos };
    },
    
    // 실패 시 이전 데이터로 롤백
    onError: (error, variables, context) => {
      console.error("Error updating todo:", error.message);
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
      toast.error('할 일 업데이트에 실패했습니다.');
    },
    
    onSuccess: (data) => {
      console.log('업데이트 성공:', data); // 디버깅용 로그
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      toast.success('할 일이 업데이트되었습니다');
    },
    
    onSettled: () => {
      // 무조건 쿼리 갱신
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    }
  });
}

// 삭제를 위한 컨텍스트 타입 정의
interface DeleteTodoContext {
  previousTodos?: Todo[];
}

// Todo 삭제
export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number, DeleteTodoContext>({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/api/todos/${id}`);
    },
    
    // 낙관적 업데이트 추가
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);
      
      queryClient.setQueryData<Todo[]>(['todos'], (old) => {
        if (!old) return [];
        return old.filter(todo => todo.id !== id);
      });
      
      return { previousTodos };
    },
    
    onError: (error, variables, context) => {
      console.error("Error deleting todo:", error.message);
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
      toast.error('할 일 삭제에 실패했습니다.');
    },
    
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      toast.success('할 일이 삭제되었습니다');
    }
  });
}
