export type TodoPriority = "high" | "medium" | "low";

export type TodoStatus = "진행 중" | "완료" | "지연";

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  created_date: string;
  due_date?: string | null;
  priority?: TodoPriority | null;
  category?: string[] | null;
  completed: boolean;
  updated_at: string;
}

export interface TodoFormData {
  title: string;
  description?: string;
  due_date?: Date | null;
  priority?: TodoPriority;
  category?: string[];
  completed?: boolean;
}

