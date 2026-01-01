# PRD (Product Requirements Document)

## AI 기반 할 일 관리 서비스

---

## 1. 제품 개요

### 1.1 목적

본 제품은 개인 및 업무 사용자를 위한 **AI 기반 할 일(To-do) 관리 웹 애플리케이션**이다.  
사용자는 기본적인 할 일 관리(CRUD) 기능뿐 아니라, 자연어 입력을 통해 AI가 자동으로 할 일을 생성하고, 전체 할 일에 대한 요약 및 분석을 받을 수 있다.

### 1.2 목표

- 빠르고 직관적인 할 일 관리 경험 제공
- AI를 활용한 입력 최소화 및 생산성 향상
- 확장 가능한 구조로 향후 통계/분석 기능 강화

### 1.3 타겟 사용자

- 개인 일정 및 업무를 관리하는 일반 사용자
- 팀 단위 업무를 체계적으로 관리하고 싶은 직장인
- 학습 계획을 관리하는 학생

---

## 2. 주요 기능 요구사항

### 2.1 사용자 인증 (Supabase Auth)

#### 기능 설명

- 이메일/비밀번호 기반 회원가입 및 로그인
- Supabase Auth 사용

#### 세부 요구사항

- 회원가입 시 이메일 인증(Optional)
- 로그인 유지(Session 관리)
- 로그아웃 기능
- 인증되지 않은 사용자는 메인 페이지 접근 불가

---

### 2.2 할 일 관리 (CRUD)

#### 기능 설명

사용자는 자신의 할 일을 생성, 조회, 수정, 삭제할 수 있다.

#### 할 일 데이터 필드

| 필드명 | 타입 | 설명 |
| ------ | ------ | ------ |
| id | uuid | 할 일 고유 ID |
| user_id | uuid | 사용자 ID (users.id 참조) |
| title | string | 할 일 제목 |
| description | text | 할 일 상세 설명 |
| created_date | timestamp | 생성일 |
| due_date | timestamp | 마감일 |
| priority | enum | high / medium / low |
| category | text[] | 업무, 개인, 학습 등 |
| completed | boolean | 완료 여부 |
| updated_at | timestamp | 수정일 |

#### 세부 요구사항

- 할 일 추가 시 필수값: title
- 마감일이 지난 경우 자동으로 '지연' 상태로 판단
- 완료 처리 시 completed = true

---

### 2.3 검색, 필터, 정렬

#### 검색

- 제목(title), 설명(description) 기준 부분 검색

#### 필터

- 우선순위: high / medium / low
- 카테고리: 업무 / 개인 / 학습 등 (다중 선택)
- 진행 상태:
  - 진행 중 (completed = false && due_date >= now)
  - 완료 (completed = true)
  - 지연 (completed = false && due_date < now)

#### 정렬

- 우선순위순 (high → low)
- 마감일순 (오름차순)
- 생성일순 (최신순)

---

### 2.4 AI 할 일 생성 기능

#### 기능 설명

사용자가 자연어로 입력한 문장을 AI가 분석하여 구조화된 할 일 데이터로 변환한다.

#### 입력 예

> "내일 오전 10시에 팀 회의 준비"

#### 출력 예

```json
{
  "title": "팀 회의 준비",
  "description": "내일 오전 10시에 있을 팀 회의를 위해 자료 작성하기",
  "created_date": "YYYY-MM-DD HH:MM",
  "due_date": "YYYY-MM-DD 10:00",
  "priority": "high",
  "category": ["업무"],
  "completed": false
}
```

#### 세부 요구사항

- Google Gemini API 사용
- 날짜/시간 파싱 실패 시 사용자에게 확인 요청
- 생성 전 미리보기 제공

---

### 2.5 AI 요약 및 분석 기능

#### 기능 설명

버튼 클릭 한 번으로 AI가 전체 할 일을 분석하고 요약 결과를 제공한다.

#### 일일 요약

- 오늘 완료한 할 일 목록
- 오늘 남은 할 일 개수 및 주요 항목

#### 주간 요약

- 이번 주 전체 할 일 수
- 완료율(%)
- 카테고리별 비중
- 주요 미완료 작업

---

## 3. 화면 구성 (UI/UX)

### 3.1 로그인 / 회원가입 화면

- 이메일, 비밀번호 입력
- 회원가입 / 로그인 전환
- 오류 메시지 표시

### 3.2 할 일 관리 메인 화면

- 상단: 검색, 필터, 정렬
- 중앙: 할 일 목록
- 하단 또는 플로팅 버튼: 할 일 추가
- AI 기능:
  - AI 할 일 생성 입력창
  - AI 요약/분석 버튼

### 3.3 통계 및 분석 화면 (확장)

- 주간 활동량 차트
- 완료율 그래프
- 카테고리별 분포

---

## 4. 기술 스택

### 프론트엔드

- Next.js (App Router)
- Tailwind CSS
- shadcn/ui

### 백엔드 / 인프라

- Supabase
  - Auth
  - PostgreSQL
  - Row Level Security (RLS)

### AI

- Google Gemini API
- AI SDK 활용

---

## 5. 데이터베이스 설계 (Supabase)

### 5.1 users

- Supabase Auth 기본 테이블 사용

### 5.2 todos

```sql
create table todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  created_date timestamp with time zone default now(),
  due_date timestamp with time zone,
  priority text check (priority in ('high', 'medium', 'low')),
  category text[],
  completed boolean default false,
  updated_at timestamp with time zone default now()
);
```

### RLS 정책

- 사용자는 본인의 todos만 조회/수정/삭제 가능

---

## 6. 비기능 요구사항

- 반응형 디자인 (모바일/데스크톱)
- 초기 로딩 2초 이내
- 접근성 고려 (ARIA)
- 에러 로깅 및 기본 모니터링

---

## 7. 향후 확장 아이디어

- 팀 단위 할 일 공유
- 알림 기능 (이메일/푸시)
- 캘린더 연동
- 다국어 지원

---

**본 PRD는 즉시 개발 착수가 가능하도록 작성되었으며, MVP 기준을 충족한다.**
