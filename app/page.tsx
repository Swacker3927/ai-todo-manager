"use client";

import * as React from "react";
import { Sparkles, LogOut, Search, Filter, User } from "lucide-react";
import Link from "next/link";

import { type Todo, type TodoFormData, type TodoPriority } from "@/types/todo";
import { TodoForm, TodoList } from "@/components/todo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Mock 데이터
const mockUser = {
  id: "user-1",
  email: "user@example.com",
  name: "사용자",
};

const mockTodos: Todo[] = [
  {
    id: "1",
    user_id: "user-1",
    title: "프로젝트 기획서 작성",
    description: "다음 주까지 완료해야 하는 중요한 프로젝트 기획서",
    created_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    priority: "high",
    category: ["업무"],
    completed: false,
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    user_id: "user-1",
    title: "운동하기",
    description: "저녁에 헬스장 가기",
    created_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    priority: "medium",
    category: ["건강"],
    completed: false,
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    user_id: "user-1",
    title: "React 학습",
    description: "Next.js App Router 공부하기",
    created_date: new Date().toISOString(),
    due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    priority: "low",
    category: ["학습"],
    completed: false,
    updated_at: new Date().toISOString(),
  },
  {
    id: "4",
    user_id: "user-1",
    title: "회의 준비",
    description: "내일 오전 회의 자료 준비",
    created_date: new Date().toISOString(),
    due_date: null,
    priority: "high",
    category: ["업무"],
    completed: true,
    updated_at: new Date().toISOString(),
  },
];

type FilterStatus = "all" | "진행 중" | "완료" | "지연";
type SortOption = "priority" | "due_date" | "created_date";

export default function HomePage() {
  const [todos, setTodos] = React.useState<Todo[]>(mockTodos);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("all");
  const [filterPriority, setFilterPriority] = React.useState<
    TodoPriority | "all"
  >("all");
  const [sortOption, setSortOption] = React.useState<SortOption>("priority");
  const [editingTodo, setEditingTodo] = React.useState<Todo | null>(null);

  // 검색 필터링
  const filteredTodos = React.useMemo(() => {
    let result = [...todos];

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (todo) =>
          todo.title.toLowerCase().includes(query) ||
          todo.description?.toLowerCase().includes(query)
      );
    }

    // 상태 필터
    if (filterStatus !== "all") {
      result = result.filter((todo) => {
        if (filterStatus === "완료") return todo.completed;
        if (filterStatus === "진행 중") {
          return !todo.completed && (!todo.due_date || new Date(todo.due_date) >= new Date());
        }
        if (filterStatus === "지연") {
          return !todo.completed && todo.due_date && new Date(todo.due_date) < new Date();
        }
        return true;
      });
    }

    // 우선순위 필터
    if (filterPriority !== "all") {
      result = result.filter((todo) => todo.priority === filterPriority);
    }

    // 정렬
    result.sort((a, b) => {
      if (sortOption === "priority") {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority || "low"];
        const bPriority = priorityOrder[b.priority || "low"];
        return bPriority - aPriority;
      }
      if (sortOption === "due_date") {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (sortOption === "created_date") {
        return (
          new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
        );
      }
      return 0;
    });

    return result;
  }, [todos, searchQuery, filterStatus, filterPriority, sortOption]);

  const handleAddTodo = async (data: TodoFormData) => {
    const newTodo: Todo = {
      id: `todo-${Date.now()}`,
      user_id: mockUser.id,
      title: data.title,
      description: data.description || null,
      created_date: new Date().toISOString(),
      due_date: data.due_date?.toISOString() || null,
      priority: data.priority || null,
      category: data.category || null,
      completed: data.completed || false,
      updated_at: new Date().toISOString(),
    };
    setTodos([...todos, newTodo]);
    setEditingTodo(null);
  };

  const handleEditTodo = async (data: TodoFormData) => {
    if (!editingTodo) return;

    const updatedTodos = todos.map((todo) =>
      todo.id === editingTodo.id
        ? {
            ...todo,
            title: data.title,
            description: data.description || null,
            due_date: data.due_date?.toISOString() || null,
            priority: data.priority || null,
            category: data.category || null,
            completed: data.completed || false,
            updated_at: new Date().toISOString(),
          }
        : todo
    );
    setTodos(updatedTodos);
    setEditingTodo(null);
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const handleToggleComplete = (id: string, completed: boolean) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed, updated_at: new Date().toISOString() } : todo
      )
    );
  };

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
  };

  const handleCancelEdit = () => {
    setEditingTodo(null);
  };

  const handleLogout = () => {
    // TODO: Supabase Auth 로그아웃 로직 구현
    console.log("Logout");
    // window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="size-5" />
              </div>
              <span className="text-xl font-bold">AI 할 일 관리</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="size-8">
                    <AvatarFallback>
                      <User className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-block">{mockUser.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{mockUser.name}</p>
                    <p className="text-xs text-muted-foreground">{mockUser.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 size-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container flex-1 px-4 py-6">
        <div className="flex flex-col gap-6">
          {/* Toolbar */}
          <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <span className="font-semibold">필터 및 정렬</span>
            </div>
            <Separator />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="제목 또는 설명 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* 상태 필터 */}
              <Select
                value={filterStatus}
                onValueChange={(value) => setFilterStatus(value as FilterStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="상태 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="진행 중">진행 중</SelectItem>
                  <SelectItem value="완료">완료</SelectItem>
                  <SelectItem value="지연">지연</SelectItem>
                </SelectContent>
              </Select>

              {/* 우선순위 필터 */}
              <Select
                value={filterPriority}
                onValueChange={(value) =>
                  setFilterPriority(value as TodoPriority | "all")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="우선순위 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="high">높음</SelectItem>
                  <SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="low">낮음</SelectItem>
                </SelectContent>
              </Select>

              {/* 정렬 */}
              <Select
                value={sortOption}
                onValueChange={(value) => setSortOption(value as SortOption)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="정렬 기준" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">우선순위순</SelectItem>
                  <SelectItem value="due_date">마감일순</SelectItem>
                  <SelectItem value="created_date">생성일순</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 필터 결과 표시 */}
            {(filterStatus !== "all" ||
              filterPriority !== "all" ||
              searchQuery) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">적용된 필터:</span>
                {searchQuery && (
                  <Badge variant="outline" className="gap-1">
                    검색: {searchQuery}
                    <button
                      onClick={() => setSearchQuery("")}
                      className="ml-1 rounded-full hover:bg-muted"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {filterStatus !== "all" && (
                  <Badge variant="outline" className="gap-1">
                    상태: {filterStatus}
                    <button
                      onClick={() => setFilterStatus("all")}
                      className="ml-1 rounded-full hover:bg-muted"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {filterPriority !== "all" && (
                  <Badge variant="outline" className="gap-1">
                    우선순위: {filterPriority === "high" ? "높음" : filterPriority === "medium" ? "보통" : "낮음"}
                    <button
                      onClick={() => setFilterPriority("all")}
                      className="ml-1 rounded-full hover:bg-muted"
                    >
                      ×
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Main Area */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* TodoForm */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">
                  {editingTodo ? "할 일 수정" : "할 일 추가"}
                </h2>
                {editingTodo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    취소
                  </Button>
                )}
              </div>
              <TodoForm
                todo={editingTodo || undefined}
                onSubmit={editingTodo ? handleEditTodo : handleAddTodo}
                onCancel={editingTodo ? handleCancelEdit : undefined}
                submitLabel={editingTodo ? "수정" : "추가"}
              />
            </div>

            {/* TodoList */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">할 일 목록</h2>
                <Badge variant="secondary">
                  {filteredTodos.length}개
                </Badge>
              </div>
              <TodoList
                todos={filteredTodos}
                onToggleComplete={handleToggleComplete}
                onEdit={handleEdit}
                onDelete={handleDeleteTodo}
                emptyMessage={
                  searchQuery || filterStatus !== "all" || filterPriority !== "all"
                    ? "검색 결과가 없습니다"
                    : "할 일이 없습니다. 새로운 할 일을 추가해보세요!"
                }
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
