// /components/dashboard/cards/DatabaseBackupCard.tsx
import { useEffect, useState } from 'react';
import { Loader2, Database, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { BaseCard } from './BaseCard';
import { format } from 'date-fns';
import { BUTTON_STYLES } from '@/lib/dashboard/constants';
import { apiClient } from '@/lib/utils/api-client';

// 백업 데이터 인터페이스 정의
interface BackupResponse {
 backups: Array<{
   id: number;
   filename: string;
   created_at: string;
   size_mb: number;
   description: string | null;
 }>;
}

const DatabaseBackupCard = () => {
 const [backups, setBackups] = useState<Array<{
   id: number;
   filename: string;
   created_at: string;
   size_mb: number;
   description: string | null;
 }>>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
   const fetchRecentBackups = async () => {
     try {
       setIsLoading(true);
       // 제네릭 타입 추가
       const data = await apiClient.get<BackupResponse>('/api/admin/database/recent-backups');
       setBackups(data.backups);
     } catch (err) {
       setError(err instanceof Error ? err.message : "알 수 없는 오류");
       console.error("최근 백업 로드 오류:", err);
     } finally {
       setIsLoading(false);
     }
   };

   fetchRecentBackups();
   
   // 5분마다 데이터 갱신
   const interval = setInterval(fetchRecentBackups, 5 * 60 * 1000);
   
   return () => clearInterval(interval);
 }, []);

 // 백업 개요 페이지로 새 창에서 열기
 const goToBackupOverview = () => {
   window.open('/database?tab=backups', '_blank');
 };

 // 예약 백업 페이지로 새 창에서 열기
 const goToScheduledBackup = () => {
   window.open('/database?tab=backups&schedule=schedule', '_blank');
 };

 const renderContent = () => {
   if (isLoading) {
     return (
       <div className="flex items-center justify-center h-20">
         <Loader2 className="h-6 w-6 animate-spin text-[#ff6246]" />
       </div>
     );
   }

   if (error) {
     return (
       <div className="flex items-center text-destructive">
         <AlertTriangle className="h-5 w-5 mr-2" />
         <p>{error}</p>
       </div>
     );
   }

   return (
     <div className="space-y-3">
       {backups.length === 0 ? (
         <div className="text-center text-muted-foreground py-2">
           최근 3일 이내 생성된 백업이 없습니다
         </div>
       ) : (
         backups.map((backup) => (
           <div key={backup.id} className="flex flex-col space-y-1 border-b border-gray-100 pb-2 last:border-b-0 last:pb-0">
             <div className="flex items-center justify-between">
               <span className="font-medium text-sm truncate max-w-[70%]">
                 {backup.filename}
               </span>
               <span className="text-xs text-muted-foreground">
                 {format(new Date(backup.created_at), "MM-dd HH:mm")}
               </span>
             </div>
             <div className="flex items-center justify-between">
               <span className="text-xs text-gray-500 truncate">
                 {backup.description || "설명 없음"}
               </span>
               <span className="text-xs font-medium">
                 {backup.size_mb.toFixed(2)} MB
               </span>
             </div>
           </div>
         ))
       )}
     </div>
   );
 };
 
 const renderFooter = () => (
   <div className="w-full grid grid-cols-2 gap-2">
     <Button
       variant="outline"
       className={BUTTON_STYLES.leftButton}
       onClick={goToBackupOverview}
     >
       <Database className="h-4 w-4 mr-2" />
       백업 개요
     </Button>
     <Button
       variant="outline"
       className={BUTTON_STYLES.rightButton}
       onClick={goToScheduledBackup}
     >
       <Calendar className="h-4 w-4 mr-2" />
       예약 백업
     </Button>
   </div>
 );
 
 return (
   <BaseCard
     id="recent-backups"
     title="데이터베이스 백업 현황"
     description="최근 3일간의 데이터베이스 백업 목록을 확인하세요"
     type="recent-backups"
     footerContent={renderFooter()}
   >
     {renderContent()}
   </BaseCard>
 );
};

export default DatabaseBackupCard;
