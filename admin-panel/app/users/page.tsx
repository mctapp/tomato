// admin-panel/app/users/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUsers, deleteUser, User } from "@/lib/api/users";
import { Role } from "@/types/auth";
import { Button } from "@/components/ui/button";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import {
 Card,
 CardContent,
 CardDescription,
 CardHeader,
 CardTitle,
} from "@/components/ui/card";
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

// 역할 표시를 위한 헬퍼 함수
const getRoleBadgeClass = (role: Role) => {
 switch(role) {
   case Role.SUPER_ADMIN:
     return "bg-purple-100 text-purple-800";
   case Role.ADMIN:
     return "bg-blue-100 text-blue-800";
   case Role.EDITOR:
     return "bg-green-100 text-green-800";
   case Role.USER:
     return "bg-gray-100 text-gray-800";
   default:
     return "bg-gray-100 text-gray-800";
 }
};

// 역할 한글 표시
const getRoleLabel = (role: Role) => {
 switch(role) {
   case Role.SUPER_ADMIN:
     return "최고관리자";
   case Role.ADMIN:
     return "관리자";
   case Role.EDITOR:
     return "편집자";
   case Role.USER:
     return "일반사용자";
   default:
     return "미지정";
 }
};

export default function UsersPage() {
 const router = useRouter();
 const [users, setUsers] = useState<User[]>([]);
 const [loading, setLoading] = useState(true);
 const [userToDelete, setUserToDelete] = useState<number | null>(null);
 const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

 // 현재 로그인한 사용자 정보와 사용자 목록 가져오기
 useEffect(() => {
   const fetchData = async () => {
     try {
       // 현재 사용자 정보 가져오기
       const response = await fetch('/api/auth/me', {
         headers: {
           'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
         }
       });

       if (response.ok) {
         const userData = await response.json();
         setCurrentUserRole(userData.role);

         // SUPER_ADMIN과 ADMIN만 사용자 관리 페이지 접근 가능
         if (userData.role !== Role.SUPER_ADMIN && userData.role !== Role.ADMIN) {
           toast.error("접근 권한이 없습니다");
           router.push('/dashboard');
           return;
         }

         // 사용자 목록 가져오기
         const userList = await getUsers();
         setUsers(userList);
       } else {
         // 인증 오류
         toast.error("인증에 실패했습니다");
         router.push('/auth/login');
       }
     } catch (error) {
       toast.error("사용자 정보를 가져오는데 실패했습니다");
       console.error(error);
     } finally {
       setLoading(false);
     }
   };

   fetchData();
 }, [router]);

 // 사용자 삭제 처리
 const handleDeleteUser = async () => {
   if (!userToDelete) return;

   try {
     await deleteUser(userToDelete);
     setUsers(users.filter(user => user.id !== userToDelete));
     toast.success("사용자가 삭제되었습니다");
   } catch (error) {
     toast.error("사용자 삭제에 실패했습니다");
     console.error(error);
   } finally {
     setUserToDelete(null);
   }
 };

 // 편집 권한 확인 (자신보다 높은 권한의 사용자는 편집 불가)
 const canEdit = (userRole: Role) => {
   if (currentUserRole === Role.SUPER_ADMIN) return true;
   if (currentUserRole === Role.ADMIN) {
     return userRole !== Role.SUPER_ADMIN;
   }
   return false;
 };

 // 삭제 권한 확인 (자신보다 높은 권한의 사용자는 삭제 불가)
 const canDelete = (userRole: Role) => {
   if (currentUserRole === Role.SUPER_ADMIN) return true;
   if (currentUserRole === Role.ADMIN) {
     return userRole !== Role.SUPER_ADMIN;
   }
   return false;
 };

 return (
   <div className="container mx-auto py-10">
     <div className="flex justify-between items-center mb-6">
       <h1 className="text-3xl font-bold">사용자 관리</h1>
       {currentUserRole === Role.SUPER_ADMIN && (
         <Link href="/users/create">
           <Button>
             <Plus className="h-4 w-4 mr-2" />
             사용자 생성
           </Button>
         </Link>
       )}
     </div>

     <Card>
       <CardHeader>
         <CardTitle>사용자 목록</CardTitle>
         <CardDescription>시스템에 등록된 모든 사용자를 관리합니다.</CardDescription>
       </CardHeader>
       <CardContent>
         {loading ? (
           <div className="flex items-center justify-center py-8">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
         ) : (
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>ID</TableHead>
                 <TableHead>이메일</TableHead>
                 <TableHead>사용자명</TableHead>
                 <TableHead>이름</TableHead>
                 <TableHead>역할</TableHead>
                 <TableHead>상태</TableHead>
                 <TableHead>등록일</TableHead>
                 <TableHead className="text-right">작업</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {users.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={8} className="text-center py-4">
                     등록된 사용자가 없습니다
                   </TableCell>
                 </TableRow>
               ) : (
                 users.map((user) => (
                   <TableRow key={user.id}>
                     <TableCell>{user.id}</TableCell>
                     <TableCell>{user.email}</TableCell>
                     <TableCell>{user.username}</TableCell>
                     <TableCell>{user.fullName || '-'}</TableCell>
                     <TableCell>
                       <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                         {getRoleLabel(user.role)}
                       </span>
                     </TableCell>
                     <TableCell>
                       <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                         {user.isActive ? '활성' : '비활성'}
                       </span>
                     </TableCell>
                     <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                     <TableCell className="text-right">
                       <div className="flex justify-end gap-2">
                         {canEdit(user.role) && (
                           <Link href={`/users/${user.id}/edit`}>
                             <Button size="sm" variant="outline">
                               <Edit className="h-4 w-4" />
                             </Button>
                           </Link>
                         )}
                         {canDelete(user.role) && (
                           <Button
                             size="sm"
                             variant="destructive"
                             onClick={() => setUserToDelete(user.id)}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         )}
                       </div>
                     </TableCell>
                   </TableRow>
                 ))
               )}
             </TableBody>
           </Table>
         )}
       </CardContent>
     </Card>

     {/* 삭제 확인 다이얼로그 */}
     <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
       <AlertDialogContent>
         <AlertDialogHeader>
           <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
           <AlertDialogDescription>
             정말 이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
           </AlertDialogDescription>
         </AlertDialogHeader>
         <AlertDialogFooter>
           <AlertDialogCancel>취소</AlertDialogCancel>
           <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
             삭제
           </AlertDialogAction>
         </AlertDialogFooter>
       </AlertDialogContent>
     </AlertDialog>
   </div>
 );
}
