import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

// 상수 정의
const MIN_TEXT_LENGTH = 2;
const MAX_TEXT_LENGTH = 500;
const MIN_TITLE_LENGTH = 1;
const MAX_TITLE_LENGTH = 100;

// 응답 스키마 정의
const todoResponseSchema = z.object({
  title: z.string().describe("할 일 제목"),
  description: z.string().optional().describe("할 일 상세 설명"),
  due_date: z.string().describe("마감일 (YYYY-MM-DD 형식)"),
  due_time: z.string().describe("마감 시간 (HH:mm 형식, 시간이 없으면 '09:00')"),
  priority: z.enum(["high", "medium", "low"]).describe("우선순위"),
  category: z.array(z.string()).optional().describe("카테고리 배열"),
});

// 후처리용 타입 정의
type TodoResponseData = {
  title: string;
  description?: string;
  due_date: string;
  due_time: string;
  priority: "high" | "medium" | "low";
  category?: string[];
};

// 입력 전처리 함수
function preprocessInput(text: string): string {
  // 앞뒤 공백 제거
  let processed = text.trim();
  
  // 연속된 공백을 하나로 통합
  processed = processed.replace(/\s+/g, " ");
  
  // 대소문자 정규화 (한국어는 영향 없지만 영어 처리)
  processed = processed.normalize("NFC");
  
  return processed;
}

// 입력 검증 함수
function validateInput(text: string): { valid: boolean; error?: string } {
  // 빈 문자열 체크
  if (!text || text.trim().length === 0) {
    return {
      valid: false,
      error: "입력 텍스트가 비어있습니다. 할 일을 입력해주세요.",
    };
  }

  // 최소 길이 체크
  if (text.length < MIN_TEXT_LENGTH) {
    return {
      valid: false,
      error: `입력 텍스트가 너무 짧습니다. 최소 ${MIN_TEXT_LENGTH}자 이상 입력해주세요.`,
    };
  }

  // 최대 길이 체크
  if (text.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `입력 텍스트가 너무 깁니다. 최대 ${MAX_TEXT_LENGTH}자까지 입력 가능합니다.`,
    };
  }

  // 특수 문자나 이모지 체크 (경고만, 차단하지 않음)
  // 실제로는 이모지와 특수 문자를 허용하되, 과도한 사용만 경고
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
  const emojiCount = (text.match(emojiRegex) || []).length;
  if (emojiCount > 10) {
    return {
      valid: false,
      error: "이모지가 너무 많습니다. 텍스트로 할 일을 입력해주세요.",
    };
  }

  return { valid: true };
}

// 후처리 함수
function postprocessResult(data: TodoResponseData, currentDate: string): TodoResponseData {
  const processed = { ...data };

  // 제목 길이 조정
  if (processed.title) {
    if (processed.title.length < MIN_TITLE_LENGTH) {
      processed.title = "할 일";
    } else if (processed.title.length > MAX_TITLE_LENGTH) {
      processed.title = processed.title.substring(0, MAX_TITLE_LENGTH - 3) + "...";
    }
  } else {
    processed.title = "할 일";
  }

  // 날짜가 과거인지 확인
  if (processed.due_date) {
    const dueDate = new Date(processed.due_date);
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    // 과거 날짜인 경우 오늘 날짜로 변경
    if (dueDate < today) {
      processed.due_date = currentDate;
    }
  } else {
    processed.due_date = currentDate;
  }

  // 시간 형식 검증 및 기본값 설정
  if (!processed.due_time || !/^\d{2}:\d{2}$/.test(processed.due_time)) {
    processed.due_time = "09:00";
  }

  // 우선순위 기본값 설정
  if (!processed.priority || !["high", "medium", "low"].includes(processed.priority)) {
    processed.priority = "medium";
  }

  // 카테고리 기본값 설정
  if (!processed.category || !Array.isArray(processed.category) || processed.category.length === 0) {
    processed.category = ["기타"];
  }

  // 설명이 너무 긴 경우 자르기
  if (processed.description && processed.description.length > 500) {
    processed.description = processed.description.substring(0, 497) + "...";
  }

  return processed;
}

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

    const { text } = body;

    // 입력 타입 검증
    if (text === undefined || text === null) {
      return NextResponse.json(
        { error: "입력 텍스트가 필요합니다. 'text' 필드를 포함해주세요." },
        { status: 400 }
      );
    }

    if (typeof text !== "string") {
      return NextResponse.json(
        { error: "입력 텍스트는 문자열 형식이어야 합니다." },
        { status: 400 }
      );
    }

    // 입력 전처리
    const preprocessedText = preprocessInput(text);

    // 입력 검증
    const validation = validateInput(preprocessedText);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 현재 날짜 정보를 컨텍스트로 제공
    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    
    // 요일 정보 계산 (0=일요일, 1=월요일, ..., 6=토요일)
    const dayOfWeek = now.getDay();
    const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    const currentDayName = dayNames[dayOfWeek];
    
    // 내일, 모레 날짜 계산
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split("T")[0];
    
    const dayAfterTomorrow = new Date(now);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const dayAfterTomorrowDate = dayAfterTomorrow.toISOString().split("T")[0];

    // Gemini API를 사용하여 구조화된 데이터 생성
    // gemini-2.5-flash가 사용 불가능한 경우 gemini-2.0-flash-exp로 대체 가능
    const result = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: todoResponseSchema,
      prompt: `다음 자연어 입력을 분석하여 할 일 데이터로 변환해주세요.

=== 현재 정보 ===
현재 날짜: ${currentDate} (${currentDayName})
현재 시간: ${currentTime}
내일 날짜: ${tomorrowDate}
모레 날짜: ${dayAfterTomorrowDate}

=== 자연어 입력 ===
"${preprocessedText}"

=== 변환 규칙 (반드시 준수) ===

1. 제목(title)
   - 할 일의 핵심 내용을 간결하게 추출
   - 불필요한 시간/날짜 표현은 제거

2. 설명(description)
   - 필요시 상세 설명 추가 (선택사항)
   - 원본 입력의 맥락을 유지

3. 마감일(due_date) - YYYY-MM-DD 형식으로 반환
   날짜 처리 규칙:
   - "오늘" → ${currentDate}
   - "내일" → ${tomorrowDate}
   - "모레" → ${dayAfterTomorrowDate}
   - "이번 주 [요일]" → 현재 주의 해당 요일 (과거면 다음 주)
   - "다음 주 [요일]" → 다음 주의 해당 요일
   - 구체적인 날짜가 명시된 경우 그대로 사용 (예: "1월 15일", "2026-01-15")
   - 날짜가 없으면 ${currentDate}를 기본값으로 사용

4. 마감 시간(due_time) - HH:mm 형식으로 반환 (24시간 형식)
   시간 처리 규칙:
   - "아침" → 09:00
   - "점심" → 12:00
   - "오후" → 14:00
   - "저녁" → 18:00
   - "밤" → 21:00
   - 구체적인 시간이 명시된 경우 그대로 사용 (예: "3시", "15시", "오후 3시" → 15:00)
   - 시간이 없으면 "09:00"을 기본값으로 사용

5. 우선순위(priority) - "high", "medium", "low" 중 하나
   우선순위 키워드:
   - high: "급하게", "중요한", "빨리", "꼭", "반드시", "긴급", "즉시" 등의 표현이 포함된 경우
   - medium: "보통", "적당히" 등의 표현이 있거나 키워드가 없는 경우
   - low: "여유롭게", "천천히", "언젠가", "나중에" 등의 표현이 포함된 경우

6. 카테고리(category) - 배열 형식, 여러 개 가능
   카테고리 분류 키워드:
   - 업무: "회의", "보고서", "프로젝트", "업무", "업체", "발표", "프레젠테이션"
   - 개인: "쇼핑", "친구", "가족", "개인", "약속", "만남"
   - 건강: "운동", "병원", "건강", "요가", "헬스", "검진", "약"
   - 학습: "공부", "책", "강의", "학습", "교육", "시험", "과제"
   - 위 키워드가 없으면 입력 내용을 분석하여 가장 적절한 카테고리 선택
   - 여러 카테고리가 적합한 경우 배열로 모두 포함

=== 출력 형식 ===
- 반드시 JSON 형식을 준수하여 응답
- 모든 필드는 스키마에 맞게 정확히 변환
- 날짜는 YYYY-MM-DD 형식, 시간은 HH:mm 형식으로 반환

한국어 입력을 정확히 이해하고 위 규칙을 엄격히 준수하여 변환해주세요.`,
    });

    // 후처리
    const processedData = postprocessResult(result.object, currentDate);

    // 결과 반환
    return NextResponse.json({
      success: true,
      data: processedData,
    });
  } catch (error) {
    console.error("AI 할 일 생성 오류:", error);
    
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
        error: "할 일 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}
