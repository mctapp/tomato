// /components/dashboard/cards/TodoCard.tsx
import { BaseCard } from './BaseCard';
import { TodoCard as OriginalTodoCard } from "@/components/dashboard/TodoCard";

const TodoCard = () => {
  return (
    <BaseCard
      id="todos"
      title="할 일 목록"
      description="할 일 목록을 관리하세요"
      type="todo"
    >
      <OriginalTodoCard />
    </BaseCard>
  );
};

export default TodoCard;
