"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

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
    const formData: TodoFormData = {
      title: values.title,
      description: values.description || undefined,
      due_date: values.due_date || null,
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
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
                <FormDescription>
                  마감일을 선택하세요 (선택사항)
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

