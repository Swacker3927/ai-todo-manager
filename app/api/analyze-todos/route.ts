import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 응답 스키마 정의
const analysisResponseSchema = z.object({
  summary: z.string().describe("할 일 목록의 요약 (완료율 포함)"),
  urgentTasks: z.array(z.string()).describe("긴급한 할 일 목록 (제목만)"),
  insights: z.array(z.string()).describe("인사이트 목록 (완료율, 마감일, 우선순위 분포, 시간대별 집중도 등)"),
  recommendations: z.array(z.string()).describe("실행 가능한 추천 사항 목록"),
});

export async function POST(request: NextRequest) {
  try {
    // API 키 확인
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // Supabase 클라이언트 생성
    const supabase = await createClient();

    // 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 요청 본문 파싱
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "잘못된 요청 형식입니다. JSON 형식으로 요청해주세요." },
        { status: 400 }
      );
    }

    const { period } = body; // "today" 또는 "week"

    if (!period || (period !== "today" && period !== "week")) {
      return NextResponse.json(
        { error: "분석 기간이 필요합니다. 'today' 또는 'week'를 지정해주세요." },
        { status: 400 }
      );
    }

    // 현재 날짜 및 시간 정보
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = today.toISOString().split("T")[0];

    // 이번 주의 시작일 (월요일)과 종료일 (일요일) 계산
    const dayOfWeek = now.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 월요일까지의 오프셋
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    // 할 일 목록 조회
    let query = supabase
      .from("todos")
      .select("*")
      .eq("user_id", user.id);

    if (period === "today") {
      // 오늘의 할 일만 조회 (due_date가 오늘 날짜이거나 null인 것)
      const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      query = query.or(`due_date.is.null,and(due_date.gte.${todayStr}T00:00:00.000Z,due_date.lt.${tomorrowStr}T00:00:00.000Z)`);
    } else {
      // 이번 주의 할 일 조회
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const nextWeekStartStr = new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      query = query.or(`due_date.is.null,and(due_date.gte.${weekStartStr}T00:00:00.000Z,due_date.lt.${nextWeekStartStr}T00:00:00.000Z)`);
    }

    const { data: todos, error: fetchError } = await query.order("due_date", { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    if (!todos || todos.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          summary: period === "today" 
            ? "오늘 등록된 할 일이 없습니다." 
            : "이번 주 등록된 할 일이 없습니다.",
          urgentTasks: [],
          insights: ["할 일을 추가하여 시작해보세요!"],
          recommendations: ["새로운 할 일을 추가해보세요."],
        },
      });
    }

    // 이전 기간 데이터 조회 (비교용)
    let previousPeriodTodos: Array<{
      id: string;
      user_id: string;
      title: string;
      description?: string | null;
      created_date: string;
      due_date?: string | null;
      priority?: string | null;
      category?: string[] | null;
      completed: boolean;
      updated_at: string;
    }> = [];
    if (period === "today") {
      // 어제 데이터 조회
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const { data: yesterdayTodos } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .or(`due_date.is.null,and(due_date.gte.${yesterdayStr}T00:00:00.000Z,due_date.lt.${todayStr}T00:00:00.000Z)`);
      previousPeriodTodos = yesterdayTodos || [];
    } else {
      // 지난 주 데이터 조회
      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(weekStart.getDate() - 7);
      const lastWeekEnd = new Date(weekStart);
      lastWeekEnd.setDate(weekStart.getDate() - 1);
      const lastWeekStartStr = lastWeekStart.toISOString().split("T")[0];
      const thisWeekStartStr = weekStart.toISOString().split("T")[0];
      const { data: lastWeekTodos } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .or(`due_date.is.null,and(due_date.gte.${lastWeekStartStr}T00:00:00.000Z,due_date.lt.${thisWeekStartStr}T00:00:00.000Z)`);
      previousPeriodTodos = lastWeekTodos || [];
    }

    // 할 일 데이터 분석 및 통계 계산
    const completedCount = todos.filter((t) => t.completed).length;
    const totalCount = todos.length;
    const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    // 이전 기간 완료율 계산
    const previousCompletedCount = previousPeriodTodos.filter((t) => t.completed).length;
    const previousTotalCount = previousPeriodTodos.length;
    const previousCompletionRate = previousTotalCount > 0 ? (previousCompletedCount / previousTotalCount) * 100 : 0;
    const completionRateChange = completionRate - previousCompletionRate;

    // 우선순위별 완료율 분석
    const priorityStats = {
      high: {
        total: todos.filter((t) => t.priority === "high").length,
        completed: todos.filter((t) => t.priority === "high" && t.completed).length,
      },
      medium: {
        total: todos.filter((t) => t.priority === "medium").length,
        completed: todos.filter((t) => t.priority === "medium" && t.completed).length,
      },
      low: {
        total: todos.filter((t) => t.priority === "low").length,
        completed: todos.filter((t) => t.priority === "low" && t.completed).length,
      },
      none: {
        total: todos.filter((t) => !t.priority).length,
        completed: todos.filter((t) => !t.priority && t.completed).length,
      },
    };

    // 우선순위 분포
    const priorityDistribution = {
      high: priorityStats.high.total,
      medium: priorityStats.medium.total,
      low: priorityStats.low.total,
      none: priorityStats.none.total,
    };

    // 마감일 준수율 계산 (마감일이 있는 할 일 중 완료된 것)
    const todosWithDueDate = todos.filter((t) => t.due_date);
    const completedOnTime = todosWithDueDate.filter((t) => {
      if (!t.completed || !t.due_date) return false;
      const dueDate = new Date(t.due_date);
      const completedDate = t.updated_at ? new Date(t.updated_at) : new Date();
      return completedDate <= dueDate;
    }).length;
    const onTimeRate = todosWithDueDate.length > 0 
      ? (completedOnTime / todosWithDueDate.length) * 100 
      : 0;

    // 연기된 할 일 분석 (마감일이 지났지만 미완료)
    const postponedTasks = todos.filter((t) => {
      if (t.completed) return false;
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate < today;
    });

    // 긴급한 할 일 (미완료 + high 우선순위 또는 마감일이 임박한 것)
    const urgentTasks = todos
      .filter((t) => {
        if (t.completed) return false;
        if (t.priority === "high") return true;
        if (t.due_date) {
          const dueDate = new Date(t.due_date);
          const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilDue <= 1 && daysUntilDue >= 0;
        }
        return false;
      })
      .map((t) => t.title);

    // 시간대별 집중도 분석
    const timeSlots = {
      morning: 0, // 09:00-12:00
      afternoon: 0, // 12:00-18:00
      evening: 0, // 18:00-21:00
      night: 0, // 21:00-09:00
      none: 0,
    };

    todos.forEach((todo) => {
      if (todo.due_date) {
        const dueDate = new Date(todo.due_date);
        const hour = dueDate.getHours();
        if (hour >= 9 && hour < 12) {
          timeSlots.morning++;
        } else if (hour >= 12 && hour < 18) {
          timeSlots.afternoon++;
        } else if (hour >= 18 && hour < 21) {
          timeSlots.evening++;
        } else {
          timeSlots.night++;
        }
      } else {
        timeSlots.none++;
      }
    });

    // 요일별 완료 패턴 분석 (이번 주만)
    const dayOfWeekStats: Record<number, { total: number; completed: number }> = {};
    if (period === "week") {
      todos.forEach((todo) => {
        if (todo.due_date) {
          const dueDate = new Date(todo.due_date);
          const dayOfWeek = dueDate.getDay();
          if (!dayOfWeekStats[dayOfWeek]) {
            dayOfWeekStats[dayOfWeek] = { total: 0, completed: 0 };
          }
          dayOfWeekStats[dayOfWeek].total++;
          if (todo.completed) {
            dayOfWeekStats[dayOfWeek].completed++;
          }
        }
      });
    }

    // 마감일이 지난 미완료 할 일
    const overdueTasks = postponedTasks.length;

    // 완료하기 쉬운 작업 분석 (완료된 작업의 공통 특징)
    const completedTodos = todos.filter((t) => t.completed);
    const easyToCompletePatterns = {
      avgPriority: completedTodos.length > 0
        ? completedTodos.filter((t) => t.priority === "high").length / completedTodos.length
        : 0,
      avgCategoryCount: completedTodos.length > 0
        ? completedTodos.reduce((sum, t) => sum + (t.category?.length || 0), 0) / completedTodos.length
        : 0,
      hasDescription: completedTodos.filter((t) => t.description).length / completedTodos.length || 0,
    };

    // 자주 미루는 작업 유형 분석
    const postponedTaskPatterns = {
      byPriority: {
        high: postponedTasks.filter((t) => t.priority === "high").length,
        medium: postponedTasks.filter((t) => t.priority === "medium").length,
        low: postponedTasks.filter((t) => t.priority === "low").length,
        none: postponedTasks.filter((t) => !t.priority).length,
      },
      byCategory: {} as Record<string, number>,
    };
    postponedTasks.forEach((todo) => {
      if (todo.category && Array.isArray(todo.category)) {
        todo.category.forEach((cat: string) => {
          postponedTaskPatterns.byCategory[cat] = (postponedTaskPatterns.byCategory[cat] || 0) + 1;
        });
      }
    });

    // 카테고리 분포
    const categoryCount: Record<string, number> = {};
    todos.forEach((todo) => {
      if (todo.category && Array.isArray(todo.category)) {
        todo.category.forEach((cat: string) => {
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
      }
    });

    // Gemini API를 사용하여 분석 및 요약 생성
    const periodLabel = period === "today" ? "오늘" : "이번 주";
    const periodDateInfo = period === "today" 
      ? `오늘 날짜: ${todayStr}`
      : `이번 주 기간: ${weekStart.toISOString().split("T")[0]} ~ ${weekEnd.toISOString().split("T")[0]}`;

    const todosDataForAI = todos.map((todo) => ({
      title: todo.title,
      description: todo.description || "",
      due_date: todo.due_date || null,
      priority: todo.priority || "none",
      category: todo.category || [],
      completed: todo.completed,
    }));

    const result = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: analysisResponseSchema,
      prompt: `당신은 할 일 관리 전문가입니다. 사용자의 할 일 목록을 심층 분석하여 실용적이고 동기부여가 되는 인사이트를 제공해주세요.

=== 분석 기간 ===
${periodLabel} (${periodDateInfo})
${period === "today" ? "이전 기간: 어제" : "이전 기간: 지난 주"}

=== 할 일 목록 데이터 ===
${JSON.stringify(todosDataForAI, null, 2)}

=== 1. 완료율 분석 ===
- 총 할 일 수: ${totalCount}개
- 완료된 할 일: ${completedCount}개
- 완료율: ${completionRate.toFixed(1)}%
- 이전 기간 완료율: ${previousCompletionRate.toFixed(1)}%
- 완료율 변화: ${completionRateChange >= 0 ? "+" : ""}${completionRateChange.toFixed(1)}%p
${completionRateChange > 0 ? "→ 개선되었습니다!" : completionRateChange < 0 ? "→ 주의가 필요합니다." : "→ 유지되었습니다."}

=== 우선순위별 완료 패턴 ===
- 높음(high): ${priorityStats.high.completed}/${priorityStats.high.total}개 완료 (${priorityStats.high.total > 0 ? ((priorityStats.high.completed / priorityStats.high.total) * 100).toFixed(1) : 0}%)
- 보통(medium): ${priorityStats.medium.completed}/${priorityStats.medium.total}개 완료 (${priorityStats.medium.total > 0 ? ((priorityStats.medium.completed / priorityStats.medium.total) * 100).toFixed(1) : 0}%)
- 낮음(low): ${priorityStats.low.completed}/${priorityStats.low.total}개 완료 (${priorityStats.low.total > 0 ? ((priorityStats.low.completed / priorityStats.low.total) * 100).toFixed(1) : 0}%)
- 미지정: ${priorityStats.none.completed}/${priorityStats.none.total}개 완료 (${priorityStats.none.total > 0 ? ((priorityStats.none.completed / priorityStats.none.total) * 100).toFixed(1) : 0}%)

=== 2. 시간 관리 분석 ===
- 마감일이 있는 할 일: ${todosWithDueDate.length}개
- 마감일 준수율: ${onTimeRate.toFixed(1)}% (${completedOnTime}/${todosWithDueDate.length}개)
- 연기된 할 일: ${overdueTasks}개
${overdueTasks > 0 ? `- 연기된 할 일 우선순위 분포: 높음 ${postponedTaskPatterns.byPriority.high}개, 보통 ${postponedTaskPatterns.byPriority.medium}개, 낮음 ${postponedTaskPatterns.byPriority.low}개, 미지정 ${postponedTaskPatterns.byPriority.none}개` : ""}
${Object.keys(postponedTaskPatterns.byCategory).length > 0 ? `- 연기된 할 일 카테고리: ${Object.entries(postponedTaskPatterns.byCategory).map(([cat, count]: [string, number]) => `${cat} ${count}개`).join(", ")}` : ""}

=== 시간대별 업무 집중도 ===
- 오전 (09:00-12:00): ${timeSlots.morning}개 (${totalCount > 0 ? ((timeSlots.morning / totalCount) * 100).toFixed(1) : 0}%)
- 오후 (12:00-18:00): ${timeSlots.afternoon}개 (${totalCount > 0 ? ((timeSlots.afternoon / totalCount) * 100).toFixed(1) : 0}%)
- 저녁 (18:00-21:00): ${timeSlots.evening}개 (${totalCount > 0 ? ((timeSlots.evening / totalCount) * 100).toFixed(1) : 0}%)
- 밤/새벽 (21:00-09:00): ${timeSlots.night}개 (${totalCount > 0 ? ((timeSlots.night / totalCount) * 100).toFixed(1) : 0}%)
- 시간 미지정: ${timeSlots.none}개 (${totalCount > 0 ? ((timeSlots.none / totalCount) * 100).toFixed(1) : 0}%)

${period === "week" ? `=== 요일별 완료 패턴 (이번 주) ===
${Object.keys(dayOfWeekStats).length > 0 
  ? Object.entries(dayOfWeekStats).map(([day, stats]: [string, { total: number; completed: number }]) => {
      const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
      const rate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0;
      return `- ${dayNames[parseInt(day)]}: ${stats.completed}/${stats.total}개 완료 (${rate}%)`;
    }).join("\n")
  : "- 데이터 없음"}
` : ""}

=== 3. 생산성 패턴 분석 ===
${completedTodos.length > 0 ? `완료된 작업의 특징:
- 높은 우선순위 비율: ${(easyToCompletePatterns.avgPriority * 100).toFixed(1)}%
- 평균 카테고리 수: ${easyToCompletePatterns.avgCategoryCount.toFixed(1)}개
- 설명이 있는 작업 비율: ${(easyToCompletePatterns.hasDescription * 100).toFixed(1)}%
` : "- 완료된 작업이 없어 분석할 수 없습니다."}

${Object.keys(postponedTaskPatterns.byCategory).length > 0 ? `자주 미루는 작업 유형:
${Object.entries(postponedTaskPatterns.byCategory).map(([cat, count]: [string, number]) => `- ${cat}: ${count}개`).join("\n")}
` : ""}

=== 우선순위 분포 ===
- 높음(high): ${priorityDistribution.high}개
- 보통(medium): ${priorityDistribution.medium}개
- 낮음(low): ${priorityDistribution.low}개
- 미지정: ${priorityDistribution.none}개

=== 카테고리 분포 ===
${Object.entries(categoryCount).length > 0 
  ? Object.entries(categoryCount).map(([cat, count]: [string, number]) => `- ${cat}: ${count}개`).join("\n")
  : "- 카테고리 없음"}

=== 긴급한 할 일 목록 ===
${urgentTasks.length > 0 ? urgentTasks.map((t) => `- ${t}`).join("\n") : "- 없음"}

=== 분석 요청 사항 ===

1. summary (요약):
${period === "today" 
  ? `오늘의 할 일 목록을 간결하게 요약해주세요. 다음을 포함하세요:
   - 총 할 일 수와 완료율
   - 이전 기간(어제) 대비 완료율 변화
   - 남은 할 일의 우선순위와 집중도
   - 오늘 하루의 생산성 평가`
  : `이번 주 할 일 목록을 간결하게 요약해주세요. 다음을 포함하세요:
   - 총 할 일 수와 완료율
   - 이전 기간(지난 주) 대비 완료율 변화
   - 주간 패턴과 생산성 분석
   - 다음 주 계획에 대한 제안`}

2. urgentTasks (긴급한 할 일):
긴급한 할 일의 제목만 배열로 제공해주세요. 위에 계산된 목록을 참고하되, AI가 판단하여 추가로 중요한 것들을 포함할 수 있습니다.

3. insights (인사이트):
다음을 포함한 심층 인사이트를 3-5개 제공해주세요. 각 인사이트는 구체적이고 실행 가능해야 합니다:

   [완료율 분석]
   - 일일/주간 완료율과 이전 기간 대비 개선도 분석
   - 우선순위별 완료 패턴 분석 (어떤 우선순위의 작업을 잘 완료하는지)
   - 완료율이 높은/낮은 이유 추론

   [시간 관리 분석]
   - 마감일 준수율과 연기 패턴 분석
   - 시간대별 업무 집중도가 생산성에 미치는 영향
   - 연기된 할 일의 공통 특징 (우선순위, 카테고리 등)

   [생산성 패턴]
   ${period === "week" ? "- 가장 생산적인 요일과 시간대 도출\n   " : ""}- 자주 미루는 작업 유형과 그 이유 분석
   - 완료하기 쉬운 작업의 공통 특징 (우선순위, 설명 유무, 카테고리 등)
   - 생산성 향상을 위한 패턴 발견

   [긍정적 피드백]
   - 사용자가 잘하고 있는 부분 강조 (예: 높은 우선순위 작업 완료율, 특정 시간대 집중도 등)
   - 개선된 부분이 있다면 격려

4. recommendations (추천 사항):
실행 가능한 구체적인 추천 사항을 3-4개 제공해주세요. 각 추천은 다음을 포함해야 합니다:

   [시간 관리 팁]
   - 구체적인 시간대별 일정 재배치 제안
   - 마감일 준수율 향상을 위한 방법
   - 연기된 할 일 처리 전략

   [우선순위 조정]
   - 우선순위 재조정이 필요한 작업 식별
   - 우선순위별 완료 패턴을 고려한 조정 제안

   [업무 분산 전략]
   - 시간대별 집중도를 고려한 업무 분산 방법
   - 생산성 패턴을 활용한 일정 최적화
   - 과부하를 줄이는 구체적인 전략

   [다음 단계]
   ${period === "today" ? "- 내일을 위한 구체적인 계획 제안" : "- 다음 주를 위한 구체적인 계획 제안"}

=== 문체 및 톤 요구사항 ===
- 한국어로 자연스럽고 친근한 문체로 작성
- 격식적이지 않고 대화하듯이 작성
- 사용자를 격려하고 동기부여하는 긍정적 톤 유지
- 구체적이고 실행 가능한 내용으로 작성
- 사용자가 잘하고 있는 부분을 먼저 강조한 후, 개선점을 격려하는 방식으로 제시
- 비판보다는 건설적인 피드백 제공
- 동기부여 메시지 포함

=== 출력 형식 ===
- summary: ${periodLabel}의 할 일 목록을 요약한 자연스러운 한국어 문장
- urgentTasks: 긴급한 할 일 제목 배열
- insights: 3-5개의 구체적이고 실행 가능한 인사이트 배열 (각각 자연스러운 한국어 문장)
- recommendations: 3-4개의 실행 가능한 추천 사항 배열 (각각 자연스러운 한국어 문장)

위 정보를 바탕으로 사용자의 할 일 목록을 심층 분석하여 요약, 인사이트, 추천 사항을 제공해주세요.`,
    });

    // 결과 반환
    return NextResponse.json({
      success: true,
      data: result.object,
    });
  } catch (error) {
    console.error("AI 할 일 분석 오류:", error);

    // 에러 타입에 따른 처리
    if (error instanceof Error) {
      // API 호출 한도 초과 (429)
      if (
        error.message.includes("429") ||
        error.message.includes("quota") ||
        error.message.includes("rate limit") ||
        error.message.includes("too many requests")
      ) {
        return NextResponse.json(
          {
            error: "API 호출 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.",
          },
          { status: 429 }
        );
      }

      // API 키 오류 (401)
      if (
        error.message.includes("API key") ||
        error.message.includes("authentication") ||
        error.message.includes("401") ||
        error.message.includes("unauthorized")
      ) {
        return NextResponse.json(
          { error: "AI API 인증에 실패했습니다. API 키를 확인해주세요." },
          { status: 401 }
        );
      }

      // 모델 오류 (404)
      if (
        error.message.includes("model") ||
        error.message.includes("not found") ||
        error.message.includes("404")
      ) {
        return NextResponse.json(
          { error: "AI 모델을 찾을 수 없습니다. 모델 이름을 확인해주세요." },
          { status: 404 }
        );
      }

      // 잘못된 요청 (400)
      if (
        error.message.includes("400") ||
        error.message.includes("bad request") ||
        error.message.includes("invalid")
      ) {
        return NextResponse.json(
          { error: "잘못된 요청입니다. 입력 내용을 확인해주세요." },
          { status: 400 }
        );
      }
    }

    // 기타 서버 오류 (500)
    return NextResponse.json(
      {
        error: "할 일 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}
