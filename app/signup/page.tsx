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
  FormDescription,
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

const signupFormSchema = z
  .object({
    email: z
      .string()
      .min(1, "이메일을 입력해주세요")
      .email("올바른 이메일 형식이 아닙니다"),
    password: z
      .string()
      .min(1, "비밀번호를 입력해주세요")
      .min(6, "비밀번호는 최소 6자 이상이어야 합니다")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "비밀번호는 영문 대소문자와 숫자를 포함해야 합니다"
      ),
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Supabase Auth 회원가입 로직 구현
      console.log("Signup attempt:", values);

      // 임시: 실제 회원가입 로직이 구현되면 제거
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 회원가입 성공
      setSuccess(true);

      // 이메일 인증이 필요한 경우 안내 메시지 표시
      // 로그인 페이지로 리다이렉트
      // setTimeout(() => {
      //   window.location.href = "/login";
      // }, 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "회원가입 중 오류가 발생했습니다. 다시 시도해주세요."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="w-full max-w-md space-y-8">
          <Card>
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex items-center justify-center size-16 rounded-full bg-primary text-primary-foreground">
                  <Sparkles className="size-8" />
                </div>
              </div>
              <CardTitle className="text-2xl">회원가입 완료!</CardTitle>
              <CardDescription>
                회원가입이 완료되었습니다. 이메일 인증을 확인해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                이메일로 인증 링크를 보내드렸습니다. 이메일을 확인하고 인증을 완료해주세요.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">로그인 페이지로 이동</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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

        {/* 회원가입 폼 */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">회원가입</CardTitle>
            <CardDescription>
              이메일과 비밀번호를 입력하여 계정을 만드세요
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
                      <FormDescription>
                        이메일 인증 링크를 보내드립니다
                      </FormDescription>
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
                          autoComplete="new-password"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        영문 대소문자, 숫자를 포함하여 최소 6자 이상
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호 확인</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="비밀번호를 다시 입력하세요"
                          autoComplete="new-password"
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
                  {isLoading ? "회원가입 중..." : "회원가입"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                이미 계정이 있으신가요?{" "}
              </span>
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                로그인
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 추가 정보 */}
        <p className="text-center text-xs text-muted-foreground">
          회원가입 시 서비스 이용약관 및 개인정보처리방침에 동의한 것으로 간주됩니다
        </p>
      </div>
    </div>
  );
}

