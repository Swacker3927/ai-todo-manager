"use client";

import * as React from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CheckIcon, ClockIcon, EditIcon, TrashIcon } from "lucide-react";

import { type Todo, type TodoPriority } from "@/types/todo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface TodoCardProps {
  todo: Todo;
  onToggleComplete?: (id: string, completed: boolean) => void;
  onEdit?: (todo: Todo) => void;
  onDelete?: (id: string) => void;
}

const priorityConfig: Record<TodoPriority, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  high: { label: "높음", variant: "destructive" },
  medium: { label: "보통", variant: "default" },
  low: { label: "낮음", variant: "secondary" },
};

const getTodoStatus = (todo: Todo): "진행 중" | "완료" | "지연" => {
  if (todo.completed) return "완료";
  if (todo.due_date) {
    const dueDate = new Date(todo.due_date);
    const now = new Date();
    if (dueDate < now) return "지연";
  }
  return "진행 중";
};

export function TodoCard({ todo, onToggleComplete, onEdit, onDelete }: TodoCardProps) {
  const status = getTodoStatus(todo);
  const isOverdue = status === "지연";
  const isCompleted = todo.completed;

  const handleToggleComplete = (checked: boolean) => {
    onToggleComplete?.(todo.id, checked);
  };

  const handleEdit = () => {
    onEdit?.(todo);
  };

  const handleDelete = () => {
    onDelete?.(todo.id);
  };

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        isCompleted && "opacity-60",
        isOverdue && !isCompleted && "border-destructive/50"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Checkbox
              checked={isCompleted}
              onCheckedChange={handleToggleComplete}
              className="mt-1"
              aria-label={isCompleted ? "완료 취소" : "완료 처리"}
            />
            <div className="flex-1 min-w-0">
              <CardTitle
                className={cn(
                  "text-lg font-semibold break-words",
                  isCompleted && "line-through text-muted-foreground"
                )}
              >
                {todo.title}
              </CardTitle>
              {todo.description && (
                <p className="text-sm text-muted-foreground mt-1 break-words">
                  {todo.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEdit}
                aria-label="수정"
              >
                <EditIcon className="size-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                aria-label="삭제"
              >
                <TrashIcon className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          {todo.priority && (
            <Badge variant={priorityConfig[todo.priority].variant}>
              {priorityConfig[todo.priority].label}
            </Badge>
          )}
          {status === "지연" && (
            <Badge variant="destructive" className="gap-1">
              <ClockIcon className="size-3" />
              지연
            </Badge>
          )}
          {status === "완료" && (
            <Badge variant="default" className="gap-1">
              <CheckIcon className="size-3" />
              완료
            </Badge>
          )}
          {todo.category && todo.category.length > 0 && (
            <>
              {todo.category.map((cat) => (
                <Badge key={cat} variant="outline">
                  {cat}
                </Badge>
              ))}
            </>
          )}
          {todo.due_date && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
              <ClockIcon className="size-3" />
              <span>
                {format(new Date(todo.due_date), "yyyy년 MM월 dd일 HH:mm", {
                  locale: ko,
                })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

