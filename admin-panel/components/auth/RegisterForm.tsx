"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// 회원가입 폼 유효성 검증 스키마
const registerSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력해주세요."),
  password: z
    .string()
    .min(8, "비밀번호는 최소 8자 이상이어야 합니다.")
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d).+$/,
      "비밀번호는 최소 하나의 문자와 숫자를 포함해야 합니다."
    ),
  confirmPassword: z.string(),
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다."),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
});

// 회원가입 인터페이스
type RegisterData = z.infer<typeof registerSchema>;

// API 호출 함수
async function registerUser(data: RegisterData) {
  const { confirmPassword, ...registerData } = data;
  
  // name 필드를 username으로 변환
  const apiData = {
    username: data.name, // 백엔드가 요구하는 username 필드로 변경
    email: data.email,
    password: data.password,
  };
  
  console.log("전송 데이터:", JSON.stringify(apiData)); // 디버깅용
  
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(apiData), // 변경된 데이터 전송
  });
  
  // 응답 데이터 로깅
  const responseText = await response.text();
  console.log("응답 텍스트:", responseText);
  
  if (!response.ok) {
    let errorDetail;
    try {
      // 응답이 JSON 형식인지 확인 후 파싱
      errorDetail = responseText ? JSON.parse(responseText) : { detail: `서버 오류: ${response.status}` };
    } catch (e) {
      // JSON 파싱 실패 시 텍스트 응답 그대로 사용
      errorDetail = { detail: responseText || `서버 오류: ${response.status}` };
    }
    throw errorDetail;
  }
  
  // 성공 시 JSON으로 다시 파싱하여 반환
  try {
    return responseText ? JSON.parse(responseText) : {};
  } catch (e) {
    // JSON이 아닌 경우 빈 객체 반환
    return {};
  }
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  // React Hook Form 설정
  const form = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    },
  });
  
  // 폼 제출 핸들러
  const onSubmit = async (data: RegisterData) => {
    try {
      setError(null);
      await registerUser(data);
      toast.success('회원가입이 완료되었습니다!');
      // 직접 URL을 전체 경로로 지정 - query parameter 제거
      router.push('/auth/login');
    } catch (err) {
      console.error("회원가입 오류:", err); // 콘솔에 전체 오류 객체 출력
      
      // 오류 메시지 정확히 가져오기
      let errorMessage = '회원가입 중 오류가 발생했습니다.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object' && 'detail' in err) {
        // TypeScript 타입 안전성을 위해 타입 확인 및 변환
        const detail = (err as any).detail;
        if (Array.isArray(detail) && detail.length > 0) {
          // 배열인 경우 첫 번째 오류 메시지 사용
          errorMessage = detail[0].msg || '입력 데이터 오류가 발생했습니다.';
        } else {
          errorMessage = detail ? String(detail) : errorMessage;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">회원가입</CardTitle>
        <CardDescription className="text-center">
          계정을 생성하여 영화 접근성 관리 시스템에 참여하세요
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름</FormLabel>
                  <FormControl>
                    <Input placeholder="이름을 입력하세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
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
              control={form.control}
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
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호 확인</FormLabel>
                  <FormControl>
                    <Input placeholder="비밀번호를 다시 입력하세요" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                "회원가입"
              )}
            </Button>
            
            <div className="text-sm text-center mt-4">
              이미 계정이 있으신가요?{" "}
              <Link href="/auth/login" className="text-primary font-semibold">
                로그인
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
