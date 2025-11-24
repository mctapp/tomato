// app/users/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, updateUser } from "@/lib/api/users";
import { Role } from "@/types/auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

// 폼 유효성 검증 스키마
const updateUserSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요"),
  username: z.string().min(3, "사용자명은 최소 3자 이상이어야 합니다"),
  password: z.string().min(8, "비밀번호는 최소 8자 이상이어야 합니다").optional().or(z.literal('')),
  fullName: z.string().optional(),
  isActive: z.boolean(),
  role: z.nativeEnum(Role),
});

type UpdateUserFormValues = z.infer<typeof updateUserSchema>;

export default function EditUserPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const userId = parseInt(params.id);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [originalUserRole, setOriginalUserRole] = useState<Role | null>(null);

  const form = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      fullName: "",
      isActive: true,
      role: Role.USER,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 현재 사용자 권한 확인
        const meResponse = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });

        if (meResponse.ok) {
          const currentUser = await meResponse.json();
          setCurrentUserRole(currentUser.role);

          // 사용자 정보 가져오기
          const userData = await getUser(userId);
          setOriginalUserRole(userData.role);

          // 권한 체크: SUPER_ADMIN만 다른 SUPER_ADMIN 편집 가능
          if (userData.role === Role.SUPER_ADMIN && currentUser.role !== Role.SUPER_ADMIN) {
            toast.error("최고관리자 계정은 편집할 수 없습니다");
            router.push('/users');
            return;
          }

          // ADMIN은 SUPER_ADMIN 편집 불가
          if (userData.role === Role.SUPER_ADMIN && currentUser.role === Role.ADMIN) {
            toast.error("최고관리자 계정은 편집할 수 없습니다");
            router.push('/users');
            return;
          }

          // 폼 초기값 설정
          form.reset({
            email: userData.email,
            username: userData.username,
            password: "", // 비밀번호는 비워둠
            fullName: userData.fullName || "",
            isActive: userData.isActive,
            role: userData.role,
          });
        } else {
          toast.error("인증에 실패했습니다");
          router.push('/auth/login');
        }
      } catch (error) {
        toast.error("사용자 정보를 가져오는데 실패했습니다");
        console.error(error);
        router.push('/users');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, router, form]);

  const onSubmit = async (data: UpdateUserFormValues) => {
    setSubmitting(true);

    // 비밀번호가 비어있으면 제외
    const payload = { ...data };
    if (!payload.password) {
      delete payload.password;
    }

    try {
      await updateUser(userId, payload);
      toast.success("사용자 정보가 업데이트되었습니다");
      router.push('/users');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("사용자 정보 업데이트에 실패했습니다");
      }
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // 역할 선택 옵션 (권한에 따라 다른 옵션 제공)
  const getRoleOptions = () => {
    if (currentUserRole === Role.SUPER_ADMIN) {
      return Object.values(Role);
    }
    // 관리자는 일반 사용자와 편집자 역할만 부여 가능
    return [Role.EDITOR, Role.USER];
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center mb-6">
        <Link href="/users" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">사용자 편집</h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>사용자 정보 수정</CardTitle>
          <CardDescription>
            사용자 계정 정보를 수정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>사용자명</FormLabel>
                    <FormControl>
                      <Input placeholder="username" {...field} />
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
                    <FormLabel>비밀번호 (변경 시에만 입력)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormDescription>
                      변경하지 않으려면 비워두세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름 (선택사항)</FormLabel>
                    <FormControl>
                      <Input placeholder="홍길동" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>역할</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={originalUserRole === Role.SUPER_ADMIN && currentUserRole !== Role.SUPER_ADMIN}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="역할을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getRoleOptions().map((role) => (
                          <SelectItem key={role} value={role}>
                            {role === Role.SUPER_ADMIN && "최고관리자"}
                            {role === Role.ADMIN && "관리자"}
                            {role === Role.EDITOR && "편집자"}
                            {role === Role.USER && "일반사용자"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      사용자의 시스템 권한을 결정하는 역할입니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={e => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>활성 상태</FormLabel>
                      <FormDescription>
                        비활성화된 사용자는 로그인할 수 없습니다.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <CardFooter className="flex justify-between px-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/users')}
                >
                  취소
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    "저장"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
