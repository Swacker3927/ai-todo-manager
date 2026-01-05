"use client";

import * as React from "react";
import { 
  Sparkles, 
  LogOut, 
  Search, 
  Filter, 
  User, 
  TrendingUp, 
  AlertCircle, 
  Lightbulb, 
  CheckCircle2, 
  Calendar,
  Target,
  RefreshCw,
  Clock,
  BarChart3
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";

type FilterStatus = "all" | "진행 중" | "완료" | "지연";
type SortOption = "priority" | "due_date" | "created_date" | "title";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [todos, setTodos] = React.useState<Todo[]>([]);
  const [todosLoading, setTodosLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("all");
  const [filterPriority, setFilterPriority] = React.useState<
    TodoPriority | "all"
  >("all");
  const [sortOption, setSortOption] = React.useState<SortOption>("created_date");
  const [editingTodo, setEditingTodo] = React.useState<Todo | null>(null);
  
  // AI 분석 관련 상태
  type AnalysisData = {
    summary: string;
    urgentTasks: string[];
    insights: string[];
    recommendations: string[];
  };

  const [analysisLoading, setAnalysisLoading] = React.useState<{
    today: boolean;
    week: boolean;
  }>({ today: false, week: false });
  const [analysisData, setAnalysisData] = React.useState<{
    today: AnalysisData | null;
    week: AnalysisData | null;
  }>({ today: null, week: null });
  const [analysisError, setAnalysisError] = React.useState<{
    today: string | null;
    week: string | null;
  }>({ today: null, week: null });

  // 할 일 목록 조회
  const fetchTodos = React.useCallback(async () => {
    if (!user) return;

    try {
      setTodosLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_date", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setTodos(data || []);
    } catch (err) {
      console.error("할 일 조회 오류:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "할 일을 불러오는 중 오류가 발생했습니다.";
      setError(errorMessage);
      
      // 인증 오류인 경우 로그인 페이지로 리다이렉트
      if (
        errorMessage.includes("JWT") ||
        errorMessage.includes("authentication") ||
        errorMessage.includes("unauthorized")
      ) {
        alert("인증이 만료되었습니다. 다시 로그인해주세요.");
        router.push("/login");
      }
    } finally {
      setTodosLoading(false);
    }
  }, [user, supabase, router]);

  // 사용자가 로그인되면 할 일 목록 조회
  React.useEffect(() => {
    if (user) {
      fetchTodos();
    }
  }, [user, fetchTodos]);

  // 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // 검색 필터링 (early return 전에 정의)
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
      if (sortOption === "title") {
        return a.title.localeCompare(b.title, "ko");
      }
      return 0;
    });

    return result;
  }, [todos, searchQuery, filterStatus, filterPriority, sortOption]);

  // 로딩 중이거나 사용자가 없으면 로딩 표시
  if (loading || todosLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block size-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 사용자가 없으면 아무것도 렌더링하지 않음 (리다이렉트 중)
  if (!user) {
    return null;
  }

  const handleAddTodo = async (data: TodoFormData) => {
    if (!user) return;

    try {
      setError(null);

      const { data: newTodo, error: insertError } = await supabase
        .from("todos")
        .insert({
          user_id: user.id,
          title: data.title,
          description: data.description || null,
          due_date: data.due_date?.toISOString() || null,
          priority: data.priority || null,
          category: data.category || null,
          completed: data.completed || false,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      if (newTodo) {
        // 목록 새로고침
        await fetchTodos();
        setEditingTodo(null);
      }
    } catch (err) {
      console.error("할 일 생성 오류:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "할 일을 생성하는 중 오류가 발생했습니다.";
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  const handleEditTodo = async (data: TodoFormData) => {
    if (!editingTodo || !user) return;

    try {
      setError(null);

      const { error: updateError } = await supabase
        .from("todos")
        .update({
          title: data.title,
          description: data.description || null,
          due_date: data.due_date?.toISOString() || null,
          priority: data.priority || null,
          category: data.category || null,
          completed: data.completed || false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingTodo.id)
        .eq("user_id", user.id); // 본인 소유만 수정 가능

      if (updateError) {
        throw updateError;
      }

      // 목록 새로고침
      await fetchTodos();
      setEditingTodo(null);
    } catch (err) {
      console.error("할 일 수정 오류:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "할 일을 수정하는 중 오류가 발생했습니다.";
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    if (!user) return;

    // 확인창 표시
    if (!confirm("정말로 이 할 일을 삭제하시겠습니까?")) {
      return;
    }

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from("todos")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id); // 본인 소유만 삭제 가능

      if (deleteError) {
        throw deleteError;
      }

      // 목록 새로고침
      await fetchTodos();
    } catch (err) {
      console.error("할 일 삭제 오류:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "할 일을 삭제하는 중 오류가 발생했습니다.";
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    if (!user) return;

    try {
      setError(null);

      const { error: updateError } = await supabase
        .from("todos")
        .update({
          completed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id); // 본인 소유만 수정 가능

      if (updateError) {
        throw updateError;
      }

      // 목록 새로고침
      await fetchTodos();
    } catch (err) {
      console.error("완료 상태 변경 오류:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "완료 상태를 변경하는 중 오류가 발생했습니다.";
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
  };

  const handleCancelEdit = () => {
    setEditingTodo(null);
  };

  // AI 분석 요청 함수
  const handleAnalyzeTodos = async (period: "today" | "week") => {
    if (!user) return;

    try {
      setAnalysisLoading((prev) => ({ ...prev, [period]: true }));
      setAnalysisError((prev) => ({ ...prev, [period]: null }));

      const response = await fetch("/api/analyze-todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ period }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "분석 중 오류가 발생했습니다.");
      }

      if (result.success && result.data) {
        setAnalysisData((prev) => ({ ...prev, [period]: result.data }));
      } else {
        throw new Error("분석 결과를 받아오지 못했습니다.");
      }
    } catch (err) {
      console.error("AI 분석 오류:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "할 일 분석 중 오류가 발생했습니다.";
      setAnalysisError((prev) => ({ ...prev, [period]: errorMessage }));
    } finally {
      setAnalysisLoading((prev) => ({ ...prev, [period]: false }));
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("로그아웃 오류:", error);
        // 사용자에게 오류 메시지 표시 (선택사항: toast 등 사용 가능)
        alert("로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.");
        return;
      }

      // 로그아웃 성공 시 로그인 페이지로 이동
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("로그아웃 오류:", err);
      alert("로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
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
                  <span className="hidden sm:inline-block">
                    {user.email || "사용자"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {user.user_metadata?.name || user.email?.split("@")[0] || "사용자"}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
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
          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              <p className="font-medium">오류가 발생했습니다</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

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
                  <SelectItem value="title">제목순</SelectItem>
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

          {/* AI 요약 및 분석 섹션 */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-5 text-primary" />
                    <CardTitle>AI 요약 및 분석</CardTitle>
                  </div>
                </div>
                <CardDescription>
                  AI가 할 일 목록을 분석하여 요약과 인사이트를 제공합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="today" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="today">오늘의 요약</TabsTrigger>
                    <TabsTrigger value="week">이번 주 요약</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="today" className="mt-4 space-y-4">
                    {!analysisData.today && !analysisLoading.today && !analysisError.today && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border bg-card p-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">오늘의 할 일을 분석합니다</p>
                          <p className="text-xs text-muted-foreground">
                            AI가 당일 집중도와 남은 할 일 우선순위를 분석해드립니다.
                          </p>
                        </div>
                        <Button
                          onClick={() => handleAnalyzeTodos("today")}
                          disabled={analysisLoading.today}
                          className="gap-2"
                        >
                          <Sparkles className="size-4" />
                          AI 요약 보기
                        </Button>
                      </div>
                    )}

                    {analysisLoading.today && (
                      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border bg-card p-12">
                        <Spinner className="size-8 text-primary" />
                        <div className="text-center space-y-1">
                          <p className="text-sm font-medium">AI가 할 일을 분석하고 있습니다</p>
                          <p className="text-xs text-muted-foreground">잠시만 기다려주세요...</p>
                        </div>
                      </div>
                    )}

                    {analysisError.today && (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium text-destructive">분석 중 오류가 발생했습니다</p>
                            <p className="text-xs text-destructive/80">{analysisError.today}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAnalyzeTodos("today")}
                          variant="outline"
                          size="sm"
                          className="gap-2 w-full sm:w-auto"
                        >
                          <RefreshCw className="size-4" />
                          재시도
                        </Button>
                      </div>
                    )}

                    {analysisData.today && !analysisLoading.today && (
                      <div className="space-y-6">
                        {/* 완료율 시각화 */}
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <BarChart3 className="size-5 text-primary" />
                                오늘의 완료율
                              </CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-baseline justify-between">
                                <span className="text-3xl font-bold text-primary">
                                  {(() => {
                                    const match = analysisData.today.summary.match(/(\d+(?:\.\d+)?)%/);
                                    return match ? `${parseFloat(match[1]).toFixed(1)}%` : "0%";
                                  })()}
                                </span>
                                <span className="text-sm text-muted-foreground">완료율</span>
                              </div>
                              <Progress
                                value={(() => {
                                  const match = analysisData.today.summary.match(/(\d+(?:\.\d+)?)%/);
                                  return match ? parseFloat(match[1]) : 0;
                                })()}
                                className="h-3"
                              />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {analysisData.today.summary}
                            </p>
                          </CardContent>
                        </Card>

                        {/* 긴급한 할 일 */}
                        {analysisData.today.urgentTasks && analysisData.today.urgentTasks.length > 0 && (
                          <Card className="border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <AlertCircle className="size-5 text-orange-600 dark:text-orange-400" />
                                집중해야 할 작업
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {analysisData.today.urgentTasks.map((task: string, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-3 p-3 rounded-lg bg-background border border-orange-200 dark:border-orange-800"
                                  >
                                    <Target className="size-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                                    <span className="text-sm font-medium">{task}</span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* 인사이트 */}
                        {analysisData.today.insights && analysisData.today.insights.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <Lightbulb className="size-5 text-primary" />
                              인사이트
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {analysisData.today.insights.map((insight: string, idx: number) => (
                                <Card key={idx} className="border-l-4 border-l-primary">
                                  <CardContent className="pt-4">
                                    <p className="text-sm leading-relaxed">{insight}</p>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 추천 사항 */}
                        {analysisData.today.recommendations && analysisData.today.recommendations.length > 0 && (
                          <Card className="border-primary/20 bg-primary/5">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <CheckCircle2 className="size-5 text-primary" />
                                실행 가능한 추천
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {analysisData.today.recommendations.map((rec: string, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-3 p-3 rounded-lg bg-background border"
                                  >
                                    <div className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary shrink-0 text-xs font-semibold">
                                      {idx + 1}
                                    </div>
                                    <p className="text-sm leading-relaxed flex-1">{rec}</p>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* 다시 분석 버튼 */}
                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleAnalyzeTodos("today")}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <RefreshCw className="size-4" />
                            다시 분석하기
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="week" className="mt-4 space-y-4">
                    {!analysisData.week && !analysisLoading.week && !analysisError.week && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border bg-card p-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">이번 주 전체 할 일을 분석합니다</p>
                          <p className="text-xs text-muted-foreground">
                            AI가 주간 패턴 분석 및 다음 주 계획을 제안해드립니다.
                          </p>
                        </div>
                        <Button
                          onClick={() => handleAnalyzeTodos("week")}
                          disabled={analysisLoading.week}
                          className="gap-2"
                        >
                          <Sparkles className="size-4" />
                          AI 요약 보기
                        </Button>
                      </div>
                    )}

                    {analysisLoading.week && (
                      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border bg-card p-12">
                        <Spinner className="size-8 text-primary" />
                        <div className="text-center space-y-1">
                          <p className="text-sm font-medium">AI가 할 일을 분석하고 있습니다</p>
                          <p className="text-xs text-muted-foreground">잠시만 기다려주세요...</p>
                        </div>
                      </div>
                    )}

                    {analysisError.week && (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium text-destructive">분석 중 오류가 발생했습니다</p>
                            <p className="text-xs text-destructive/80">{analysisError.week}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAnalyzeTodos("week")}
                          variant="outline"
                          size="sm"
                          className="gap-2 w-full sm:w-auto"
                        >
                          <RefreshCw className="size-4" />
                          재시도
                        </Button>
                      </div>
                    )}

                    {analysisData.week && !analysisLoading.week && (
                      <div className="space-y-6">
                        {/* 주간 완료율 및 트랜드 */}
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <TrendingUp className="size-5 text-primary" />
                                주간 완료율
                              </CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-baseline justify-between">
                                <span className="text-3xl font-bold text-primary">
                                  {(() => {
                                    const match = analysisData.week.summary.match(/(\d+(?:\.\d+)?)%/);
                                    return match ? `${parseFloat(match[1]).toFixed(1)}%` : "0%";
                                  })()}
                                </span>
                                <span className="text-sm text-muted-foreground">이번 주 완료율</span>
                              </div>
                              <Progress
                                value={(() => {
                                  const match = analysisData.week.summary.match(/(\d+(?:\.\d+)?)%/);
                                  return match ? parseFloat(match[1]) : 0;
                                })()}
                                className="h-3"
                              />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {analysisData.week.summary}
                            </p>
                            {/* 간단한 트랜드 표시 */}
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Clock className="size-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                지난 주 대비 완료율 변화가 분석에 포함되었습니다.
                              </span>
                            </div>
                          </CardContent>
                        </Card>

                        {/* 긴급한 할 일 */}
                        {analysisData.week.urgentTasks && analysisData.week.urgentTasks.length > 0 && (
                          <Card className="border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <AlertCircle className="size-5 text-orange-600 dark:text-orange-400" />
                                이번 주 긴급한 할 일
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {analysisData.week.urgentTasks.map((task: string, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-3 p-3 rounded-lg bg-background border border-orange-200 dark:border-orange-800"
                                  >
                                    <Target className="size-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                                    <span className="text-sm font-medium">{task}</span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* 인사이트 */}
                        {analysisData.week.insights && analysisData.week.insights.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <Lightbulb className="size-5 text-primary" />
                              주간 인사이트
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {analysisData.week.insights.map((insight: string, idx: number) => (
                                <Card key={idx} className="border-l-4 border-l-primary">
                                  <CardContent className="pt-4">
                                    <p className="text-sm leading-relaxed">{insight}</p>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 추천 사항 및 다음 주 계획 */}
                        {analysisData.week.recommendations && analysisData.week.recommendations.length > 0 && (
                          <Card className="border-primary/20 bg-primary/5">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Calendar className="size-5 text-primary" />
                                다음 주 계획 제안
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {analysisData.week.recommendations.map((rec: string, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-3 p-3 rounded-lg bg-background border"
                                  >
                                    <div className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary shrink-0 text-xs font-semibold">
                                      {idx + 1}
                                    </div>
                                    <p className="text-sm leading-relaxed flex-1">{rec}</p>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* 다시 분석 버튼 */}
                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleAnalyzeTodos("week")}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <RefreshCw className="size-4" />
                            다시 분석하기
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Main Area */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* TodoForm */}
            <div className="space-y-4" data-todo-form>
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
