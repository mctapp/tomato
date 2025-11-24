// types/todo.ts
export interface Todo {
  id: number;
  title: string;
  priority: string;
  is_completed: boolean; // 'completed'를 'is_completed'로 변경
  created_at?: string;
  updated_at?: string;
  user_id?: number;
}

export interface TodoCreate {
  title: string;
  priority: string;
  is_completed?: boolean; // 'completed'를 'is_completed'로 변경
}

export interface TodoUpdate {
  title?: string;
  priority?: string;
  is_completed?: boolean; // 'completed'를 'is_completed'로 변경
}
