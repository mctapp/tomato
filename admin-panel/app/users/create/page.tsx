// app/users/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "@/lib/api/users";
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
const createUserSchema = z.object({
 email: z.string().email("유효한 이메일을 입력하세요"),
 username: z.string().min(3, "사용자명은 최소 3자 이상이어야 합니다"),
 password: z.string().min(8, "비밀번호는 최소 8자 이상이어야 합니다"),
 fullName: z.string().optional(),
 isActive: z.boolean(),
 role: z.nativeEnum(Role),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

export default function CreateUserPage() {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

 useEffect(() => {
   // 현재 사용자 권한 확인
   const checkPermission = async () => {
     try {
       const response = await fetch('/api/auth/me', {
         headers: {
           'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
         }
       });

       if (response.ok) {
         const userData = await response.json();
         setCurrentUserRole(userData.role);

         // SUPER_ADMIN만 사용자 생성 가능
         if (userData.role !== Role.SUPER_ADMIN) {
           toast.error("사용자 생성 권한이 없습니다");
           router.push('/users');
         }
       } else {
         // 인증 오류
         toast.error("인증에 실패했습니다");
         router.push('/auth/login');
       }
     } catch (error) {
       toast.error("권한 확인에 실패했습니다");
       console.error(error);
     }
   };

   checkPermission();
 }, [router]);

 const form = useForm<CreateUserFormValues>({
   resolver: zodResolver(createUserSchema),
   defaultValues: {
     email: "",
     username: "",
     password: "",
     fullName: "",
     isActive: true,
     role: Role.USER,
   },
 });

 const onSubmit = async (data: CreateUserFormValues) => {
   setLoading(true);
   try {
     await createUser(data);
     toast.success("사용자가 생성되었습니다");
     router.push('/users');
   } catch (error) {
     if (error instanceof Error) {
       toast.error(error.message);
     } else {
       toast.error("사용자 생성에 실패했습니다");
     }
     console.error(error);
   } finally {
     setLoading(false);
   }
 };

 // 역할 선택 옵션 (SUPER_ADMIN만 모든 역할 할당 가능)
 const getRoleOptions = () => {
   if (currentUserRole === Role.SUPER_ADMIN) {
     return Object.values(Role);
   }
   // 다른 역할은 자신보다 낮은 역할만 할당 가능
   return [Role.EDITOR, Role.USER];
 };

 return (
   <div className="container mx-auto py-10">
     <div className="flex items-center mb-6">
       <Link href="/users" className="mr-4">
         <Button variant="outline" size="icon">
           <ArrowLeft className="h-4 w-4" />
         </Button>
       </Link>
       <h1 className="text-3xl font-bold">사용자 생성</h1>
     </div>

     <Card className="max-w-2xl mx-auto">
       <CardHeader>
         <CardTitle>새 사용자 등록</CardTitle>
         <CardDescription>
           시스템에 새로운 사용자 계정을 생성합니다.
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
                   <FormDescription>
                     사용자 로그인에 사용되는 이메일 주소입니다.
                   </FormDescription>
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
                   <FormDescription>
                     시스템 내에서 사용되는 고유한 사용자 이름입니다.
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
                     <Input type="password" placeholder="********" {...field} />
                   </FormControl>
                   <FormDescription>
                     최소 8자 이상의 안전한 비밀번호를 설정하세요.
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
                     <Input placeholder="홍길동" {...field} />
                   </FormControl>
                   <FormDescription>
                     사용자의 실명 또는 표시 이름입니다.
                   </FormDescription>
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
               <Button type="submit" disabled={loading}>
                 {loading ? (
                   <>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     생성 중...
                   </>
                 ) : (
                   "사용자 생성"
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
