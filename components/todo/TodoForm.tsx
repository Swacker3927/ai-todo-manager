"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon, Sparkles, Loader2 } from "lucide-react";

import { type Todo, type TodoFormData, type TodoPriority } from "@/types/todo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

const todoFormSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  description: z.string().optional(),
  due_date: z.date().nullable().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  category: z.array(z.string()).optional(),
  completed: z.boolean().optional(),
});

type TodoFormValues = z.infer<typeof todoFormSchema>;

interface TodoFormProps {
  todo?: Todo;
  onSubmit: (data: TodoFormData) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  isLoading?: boolean;
}

const priorityOptions: { value: TodoPriority; label: string }[] = [
  { value: "high", label: "높음" },
  { value: "medium", label: "보통" },
  { value: "low", label: "낮음" },
];

const categoryOptions = ["업무", "개인", "학습", "건강", "기타"];

export function TodoForm({
  todo,
  onSubmit,
  onCancel,
  submitLabel = todo ? "수정" : "추가",
  isLoading = false,
}: TodoFormProps) {
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(
    todo?.category || []
  );
  const [selectedTime, setSelectedTime] = React.useState<string>(() => {
    if (todo?.due_date) {
      const date = new Date(todo.due_date);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }
    return "09:00";
  });
  
  // AI 기반 할 일 생성 상태
  const [aiInput, setAiInput] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);

  const form = useForm<TodoFormValues>({
    resolver: zodResolver(todoFormSchema),
    defaultValues: {
      title: todo?.title || "",
      description: todo?.description || "",
      due_date: todo?.due_date ? new Date(todo.due_date) : null,
      priority: (todo?.priority as TodoPriority) || "medium",
      category: todo?.category || [],
      completed: todo?.completed || false,
    },
  });

  const handleSubmit = async (values: TodoFormValues) => {
    let dueDate: Date | null = values.due_date || null;
    
    // 날짜가 선택된 경우 시간을 추가
    if (dueDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      dueDate = new Date(dueDate);
      dueDate.setHours(hours, minutes, 0, 0);
    }
    
    const formData: TodoFormData = {
      title: values.title,
      description: values.description || undefined,
      due_date: dueDate,
      priority: values.priority,
      category: selectedCategories.length > 0 ? selectedCategories : undefined,
      completed: values.completed,
    };
    await onSubmit(formData);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  // AI 기반 할 일 생성
  const handleGenerateWithAI = async () => {
    if (!aiInput.trim()) {
      setAiError("자연어 입력을 입력해주세요.");
      return;
    }

    setIsGenerating(true);
    setAiError(null);

    try {
      const response = await fetch("/api/generate-todo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: aiInput }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "할 일 생성에 실패했습니다.");
      }

      if (!result.success || !result.data) {
        throw new Error("올바른 응답을 받지 못했습니다.");
      }

      const data = result.data;

      // 날짜 파싱
      let dueDate: Date | null = null;
      if (data.due_date) {
        const [year, month, day] = data.due_date.split("-").map(Number);
        dueDate = new Date(year, month - 1, day);
        
        // 시간 추가
        if (data.due_time) {
          const [hours, minutes] = data.due_time.split(":").map(Number);
          dueDate.setHours(hours, minutes, 0, 0);
          setSelectedTime(data.due_time);
        } else {
          setSelectedTime("09:00");
          dueDate.setHours(9, 0, 0, 0);
        }
      }

      // 폼에 데이터 채우기
      form.setValue("title", data.title || "");
      if (data.description) {
        form.setValue("description", data.description);
      }
      if (dueDate) {
        form.setValue("due_date", dueDate);
      }
      if (data.priority) {
        form.setValue("priority", data.priority as TodoPriority);
      }
      if (data.category && data.category.length > 0) {
        setSelectedCategories(data.category);
        form.setValue("category", data.category);
      }

      // 성공 후 입력 필드 초기화
      setAiInput("");
    } catch (error) {
      console.error("AI 할 일 생성 오류:", error);
      setAiError(
        error instanceof Error
          ? error.message
          : "할 일 생성 중 오류가 발생했습니다."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* AI 기반 할 일 생성 섹션 */}
        {!todo && (
          <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <Label className="text-sm font-semibold">AI로 할 일 생성</Label>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="예: 내일 오후 3시까지 중요한 팀 회의 준비하기"
                value={aiInput}
                onChange={(e) => {
                  setAiInput(e.target.value);
                  setAiError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isGenerating) {
                    e.preventDefault();
                    handleGenerateWithAI();
                  }
                }}
                disabled={isGenerating || isLoading}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={isGenerating || isLoading || !aiInput.trim()}
                variant="default"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    생성
                  </>
                )}
              </Button>
            </div>
            {aiError && (
              <p className="text-sm text-destructive">{aiError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              자연어로 할 일을 입력하면 자동으로 제목, 날짜, 시간, 우선순위, 카테고리를 추출합니다.
            </p>
          </div>
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>제목 *</FormLabel>
              <FormControl>
                <Input
                  placeholder="할 일을 입력하세요"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>설명</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="상세 설명을 입력하세요 (선택사항)"
                  className="min-h-24"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>마감일</FormLabel>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isLoading}
                          type="button"
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {field.value ? (
                            format(field.value, "yyyy년 MM월 dd일", {
                              locale: ko,
                            })
                          ) : (
                            <span>날짜 선택</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={(date) => field.onChange(date || null)}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {field.value && (
                    <Input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-32"
                      disabled={isLoading}
                    />
                  )}
                </div>
                <FormDescription>
                  마감일과 시간을 선택하세요 (선택사항)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>우선순위</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value as TodoPriority)
                  }
                  value={field.value}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="우선순위 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormItem>
          <FormLabel>카테고리</FormLabel>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((category) => (
              <Button
                key={category}
                type="button"
                variant={
                  selectedCategories.includes(category) ? "default" : "outline"
                }
                size="sm"
                onClick={() => toggleCategory(category)}
                disabled={isLoading}
              >
                {category}
              </Button>
            ))}
          </div>
          <FormDescription>
            여러 카테고리를 선택할 수 있습니다
          </FormDescription>
        </FormItem>

        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              취소
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "처리 중..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

