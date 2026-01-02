"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

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
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] =
    React.useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  // 이미 로그인된 사용자는 메인 페이지로 리다이렉트
  React.useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const getErrorMessage = (error: unknown): string => {
    if (!error) return "회원가입 중 오류가 발생했습니다. 다시 시도해주세요.";

    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : String(error);

    // 사용자 친화적인 오류 메시지로 변환
    if (errorMessage.includes("User already registered")) {
      return "이미 등록된 이메일입니다. 로그인 페이지로 이동해주세요.";
    }
    if (errorMessage.includes("Password")) {
      return "비밀번호가 요구사항을 만족하지 않습니다.";
    }
    if (errorMessage.includes("Email")) {
      return "올바른 이메일 형식이 아닙니다.";
    }
    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
    }

    return errorMessage || "회원가입 중 오류가 발생했습니다. 다시 시도해주세요.";
  };

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });

      if (signUpError) {
        throw signUpError;
      }

      // 회원가입 성공
      if (data.user) {
        // 세션이 있으면 즉시 로그인된 상태 (이메일 인증 비활성화)
        if (data.session) {
          // 메인 페이지로 리다이렉트
          router.push("/");
          router.refresh();
        } else {
          // 세션이 없으면 이메일 인증이 필요한 상태
          setRequiresEmailConfirmation(true);
          setSuccess(true);
        }
      } else {
        throw new Error("회원가입에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // 로딩 중이거나 이미 로그인된 사용자는 로딩 표시
  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block size-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

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
                {requiresEmailConfirmation
                  ? "회원가입이 완료되었습니다. 이메일 인증을 확인해주세요."
                  : "회원가입이 완료되었습니다."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {requiresEmailConfirmation ? (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    이메일로 인증 링크를 보내드렸습니다. 이메일을 확인하고 인증을 완료해주세요.
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/login">로그인 페이지로 이동</Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    환영합니다! 메인 페이지로 이동합니다.
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/">메인 페이지로 이동</Link>
                  </Button>
                </>
              )}
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
