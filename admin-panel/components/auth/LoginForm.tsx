// components/auth/LoginForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { MFALoginResponse } from "@/types/auth";

// 로그인 폼 유효성 검증 스키마
const loginSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

// MFA 검증 스키마
const mfaSchema = z.object({
  code: z.string().length(6, "인증 코드는 6자리여야 합니다.").regex(/^\d+$/, "숫자만 입력해주세요."),
});

// 로그인 인터페이스
type LoginData = z.infer<typeof loginSchema>;
type MFAData = z.infer<typeof mfaSchema>;

// API 호출 함수
async function loginUser(data: LoginData): Promise<MFALoginResponse> {
  const apiData = {
    username: data.email,
    password: data.password
  };

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(apiData),
    credentials: 'include'
  });

  const responseText = await response.text();

  if (!response.ok) {
    let errorDetail;
    try {
      errorDetail = responseText ? JSON.parse(responseText) : { detail: `서버 오류: ${response.status}` };
    } catch (e) {
      errorDetail = { detail: responseText || `서버 오류: ${response.status}` };
    }
    throw errorDetail;
  }

  return JSON.parse(responseText);
}

async function verifyMFA(code: string, mfaToken: string) {
  const response = await fetch('/api/auth/mfa/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, mfa_token: mfaToken }),
    credentials: 'include'
  });

  const responseText = await response.text();

  if (!response.ok) {
    let errorDetail;
    try {
      errorDetail = responseText ? JSON.parse(responseText) : { detail: `서버 오류: ${response.status}` };
    } catch (e) {
      errorDetail = { detail: responseText || `서버 오류: ${response.status}` };
    }
    throw errorDetail;
  }

  return JSON.parse(responseText);
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // MFA 상태
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaType, setMfaType] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get('registered') === 'true') {
        setSuccess('회원가입이 완료되었습니다. 로그인해주세요.');
        toast.success('회원가입이 완료되었습니다. 로그인해주세요.');
      }
    }
  }, []);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const mfaForm = useForm<MFAData>({
    resolver: zodResolver(mfaSchema),
    defaultValues: {
      code: "",
    },
  });

  const onLoginSubmit = async (data: LoginData) => {
    try {
      setError(null);
      setSuccess(null);
      const result = await loginUser(data);

      // MFA가 필요한 경우
      if (result.requires_mfa) {
        setMfaRequired(true);
        setMfaToken(result.mfa_token || "");
        setMfaType(result.mfa_type || "");
        return;
      }

      // MFA가 없는 경우 바로 로그인
      toast.success('로그인 성공! 대시보드로 이동합니다.');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (err) {
      console.error("로그인 오류:", err);

      let errorMessage = '로그인 중 오류가 발생했습니다.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object' && 'detail' in err) {
        const detail = (err as any).detail;
        if (Array.isArray(detail) && detail.length > 0) {
          errorMessage = detail[0].msg || '입력 데이터 오류가 발생했습니다.';
        } else {
          errorMessage = detail ? String(detail) : errorMessage;
        }
      }

      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const onMFASubmit = async (data: MFAData) => {
    try {
      setError(null);
      await verifyMFA(data.code, mfaToken);
      
      toast.success('인증 성공! 대시보드로 이동합니다.');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (err) {
      console.error("MFA 오류:", err);

      let errorMessage = '인증 코드가 올바르지 않습니다.';
      if (err && typeof err === 'object' && 'detail' in err) {
        const detail = (err as any).detail;
        errorMessage = detail ? String(detail) : errorMessage;
      }

      setError(errorMessage);
      toast.error(errorMessage);
      mfaForm.reset();
    }
  };

  // MFA 입력 화면
  if (mfaRequired) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">2단계 인증</CardTitle>
          <CardDescription className="text-center">
            {mfaType === 'TOTP' && '인증 앱에서 생성된 6자리 코드를 입력하세요'}
            {mfaType === 'SMS' && '휴대폰으로 전송된 6자리 코드를 입력하세요'}
            {mfaType === 'EMAIL' && '이메일로 전송된 6자리 코드를 입력하세요'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...mfaForm}>
            <form onSubmit={mfaForm.handleSubmit(onMFASubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <FormField
                control={mfaForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>인증 코드</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="000000"
                        maxLength={6}
                        className="text-center text-2xl tracking-widest"
                        autoComplete="one-time-code"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={mfaForm.formState.isSubmitting}>
                  {mfaForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      인증 중...
                    </>
                  ) : (
                    "인증"
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setMfaRequired(false);
                    setMfaToken("");
                    setError(null);
                    mfaForm.reset();
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  로그인으로 돌아가기
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  // 일반 로그인 화면
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">로그인</CardTitle>
        <CardDescription className="text-center">
          계정에 로그인하여 영화 접근성 관리 시스템을 이용하세요
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 text-green-800 border border-green-200">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={loginForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input placeholder="이메일을 입력하세요" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호</FormLabel>
                  <FormControl>
                    <Input placeholder="비밀번호를 입력하세요" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
              {loginForm.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                "로그인"
              )}
            </Button>

            <div className="text-sm text-center mt-4">
              계정이 없으신가요?{" "}
              <Link href="/auth/register" className="text-primary font-semibold">
                회원가입
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
