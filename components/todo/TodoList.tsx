"use client";

import * as React from "react";
import { type Todo } from "@/types/todo";
import { TodoCard } from "./TodoCard";
import { Empty } from "@/components/ui/empty";

interface TodoListProps {
  todos: Todo[];
  onToggleComplete?: (id: string, completed: boolean) => void;
  onEdit?: (todo: Todo) => void;
  onDelete?: (id: string) => void;
  emptyMessage?: string;
}

export function TodoList({
  todos,
  onToggleComplete,
  onEdit,
  onDelete,
  emptyMessage = "할 일이 없습니다. 새로운 할 일을 추가해보세요!",
}: TodoListProps) {
  if (todos.length === 0) {
    return (
      <Empty
        title="할 일이 없습니다"
        description={emptyMessage}
        className="py-12"
      />
    );
  }

  return (
    <div className="space-y-4">
      {todos.map((todo) => (
        <TodoCard
          key={todo.id}
          todo={todo}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

