"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, "이메일을 입력해주세요")
    .email("올바른 이메일 형식이 아닙니다"),
  password: z
    .string()
    .min(1, "비밀번호를 입력해주세요")
    .min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Supabase Auth 로그인 로직 구현
      console.log("Login attempt:", values);
      
      // 임시: 실제 로그인 로직이 구현되면 제거
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // 로그인 성공 시 리다이렉트
      // window.location.href = "/";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "로그인 중 오류가 발생했습니다. 다시 시도해주세요."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-8">
        {/* 로고 및 소개 섹션 */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="size-8" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              AI 할 일 관리
            </h1>
            <p className="text-muted-foreground">
              자연어로 할 일을 생성하고, AI가 분석해주는 스마트한 할 일 관리 서비스
            </p>
          </div>
        </div>

        {/* 로그인 폼 */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">로그인</CardTitle>
            <CardDescription>
              이메일과 비밀번호를 입력하여 로그인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="example@email.com"
                          autoComplete="email"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="비밀번호를 입력하세요"
                          autoComplete="current-password"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "로그인 중..." : "로그인"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                계정이 없으신가요?{" "}
              </span>
              <Link
                href="/signup"
                className="font-medium text-primary hover:underline"
              >
                회원가입
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 추가 정보 */}
        <p className="text-center text-xs text-muted-foreground">
          로그인하시면 할 일 관리 서비스를 이용하실 수 있습니다
        </p>
      </div>
    </div>
  );
}

