// admin-panel/app/database/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  DownloadIcon, 
  RefreshCw, 
  Database, 
  HardDrive, 
  Table2,
  FileText,
  Settings,
  Clock,
  AlertTriangle,
  Server,
  Layers,
  Trash2,
  Calendar,
  Play,
  Pause,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// 타입 정의
interface Backup {
  id: number;
  filename: string;
  description: string | null;
  created_at: string;
  size_mb: number;
  scheduled_backup_id: number | null;
}

interface TableStat {
  table_name: string;
  row_count: number;
  size: string;
  bytes: number;
}

interface DBSummary {
  table_count: number;
  database_size: {
    pretty: string;
    bytes: number;
  };
  largest_tables: {
    table_name: string;
    size: string;
    bytes: number;
  }[];
  most_rows: {
    table_name: string;
    row_count: number;
  }[];
}

interface ScheduledBackup {
  id: number;
  name: string;
  description: string | null;
  schedule_type: ScheduleType;
  schedule_info: string;
  is_active: boolean;
  created_at: string;
  last_run: string | null;
}

// 개선된 타입 정의
type ScheduleType = "daily" | "weekly" | "monthly";

interface ScheduleFormData {
  name: string;
  description: string;
  schedule_type: ScheduleType;
  hour: number;
  minute: number;
  day_of_week: number;
  day_of_month: number;
}

// API 응답 타입
interface BackupsResponse {
  backups: Backup[];
}

interface TablesResponse {
  tables: TableStat[];
}

interface ScheduledBackupsResponse {
  scheduled_backups: ScheduledBackup[];
}

interface ToggleScheduleResponse {
  is_active: boolean;
}

// API 함수
const fetchBackups = async (): Promise<BackupsResponse> => {
  const response = await axios.get("/api/admin/database/backups");
  return response.data;
};

const fetchTables = async (): Promise<TablesResponse> => {
  const response = await axios.get("/api/admin/database/tables");
  return response.data;
};

const fetchDBSummary = async (): Promise<DBSummary> => {
  const response = await axios.get("/api/admin/database/summary");
  return response.data;
};

const fetchScheduledBackups = async (): Promise<ScheduledBackupsResponse> => {
  const response = await axios.get("/api/admin/database/scheduled-backups");
  return response.data;
};

const createBackup = async (description: string | null): Promise<Backup> => {
  const response = await axios.post("/api/admin/database/backup", { description });
  return response.data;
};

const createScheduledBackup = async (data: ScheduleFormData): Promise<ScheduledBackup> => {
  const response = await axios.post("/api/admin/database/scheduled-backups", {
    ...data,
    description: data.description || null // 빈 문자열을 null로 처리
  });
  return response.data;
};

const toggleScheduledBackup = async (id: number): Promise<ToggleScheduleResponse> => {
  const response = await axios.put(`/api/admin/database/scheduled-backups/${id}/toggle`);
  return response.data;
};

const deleteBackup = async (id: number): Promise<{ success: boolean }> => {
  const response = await axios.delete(`/api/admin/database/backups/${id}`);
  return response.data;
};

const deleteScheduledBackup = async (id: number): Promise<{ success: boolean }> => {
  const response = await axios.delete(`/api/admin/database/scheduled-backups/${id}`);
  return response.data;
};

function DatabaseManagementContent() {
  const [backupDescription, setBackupDescription] = useState("");
  const [selectedTab, setSelectedTab] = useState("overview");
  const [scheduleTabValue, setScheduleTabValue] = useState("backup-list");
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>({
    name: "",
    description: "",
    schedule_type: "daily",
    hour: 0,
    minute: 0,
    day_of_week: 0,
    day_of_month: 1
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // URL 쿼리 파라미터에서 탭 값 읽기
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'backups', 'tables'].includes(tabParam)) {
      setSelectedTab(tabParam);
    }

    const scheduleParam = searchParams.get('schedule');
    if (scheduleParam && ['backup-list', 'schedule'].includes(scheduleParam)) {
      setScheduleTabValue(scheduleParam);
    }
  }, [searchParams]);

  // 요일 이름 배열
  const weekdays = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];

  // 쿼리 훅
  const backupsQuery = useQuery({
    queryKey: ["backups"],
    queryFn: fetchBackups,
  });

  const tablesQuery = useQuery({
    queryKey: ["tables"],
    queryFn: fetchTables,
    enabled: selectedTab === "tables",
  });

  const summaryQuery = useQuery({
    queryKey: ["db-summary"],
    queryFn: fetchDBSummary,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const scheduledBackupsQuery = useQuery({
    queryKey: ["scheduled-backups"],
    queryFn: fetchScheduledBackups,
    enabled: selectedTab === "backups" && scheduleTabValue === "schedule",
  });

  // 뮤테이션 훅
  const backupMutation = useMutation({
    mutationFn: createBackup,
    onSuccess: () => {
      toast.success("백업이 시작되었습니다.");
      setBackupDescription("");
      // 3초 후 백업 목록 갱신
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["backups"] });
      }, 3000);
    },
    onError: (error) => {
      toast.error("백업 생성 중 오류가 발생했습니다.");
      console.error("Backup error:", error);
    },
  });

  const scheduleBackupMutation = useMutation({
    mutationFn: createScheduledBackup,
    onSuccess: () => {
      toast.success("예약 백업이 생성되었습니다.");
      setIsDialogOpen(false);
      // 폼 초기화
      setScheduleForm({
        name: "",
        description: "",
        schedule_type: "daily",
        hour: 0,
        minute: 0,
        day_of_week: 0,
        day_of_month: 1
      });
      queryClient.invalidateQueries({ queryKey: ["scheduled-backups"] });
    },
    onError: (error) => {
      toast.error("예약 백업 생성 중 오류가 발생했습니다.");
      console.error("Schedule error:", error);
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: toggleScheduledBackup,
    onSuccess: (data) => {
      const status = data.is_active ? "활성화" : "비활성화";
      toast.success(`예약 백업이 ${status}되었습니다.`);
      queryClient.invalidateQueries({ queryKey: ["scheduled-backups"] });
    },
    onError: (error) => {
      toast.error("예약 백업 상태 변경 중 오류가 발생했습니다.");
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: deleteBackup,
    onSuccess: () => {
      toast.success("백업이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["backups"] });
    },
    onError: (error) => {
      toast.error("백업 삭제 중 오류가 발생했습니다.");
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: deleteScheduledBackup,
    onSuccess: () => {
      toast.success("예약 백업이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["scheduled-backups"] });
    },
    onError: (error) => {
      toast.error("예약 백업 삭제 중 오류가 발생했습니다.");
    },
  });

  const handleBackup = () => {
    backupMutation.mutate(backupDescription || null);
  };

  const handleDownload = (backupId: number) => {
    window.open(`/api/admin/database/backups/${backupId}/download`);
  };

  const handleDeleteBackup = (backupId: number) => {
    deleteBackupMutation.mutate(backupId);
  };

  const handleToggleSchedule = (scheduleId: number) => {
    toggleScheduleMutation.mutate(scheduleId);
  };

  const handleDeleteSchedule = (scheduleId: number) => {
    deleteScheduleMutation.mutate(scheduleId);
  };

  const handleTabChange = (value: string) => {
    setSelectedTab(value);
  };

  const handleScheduleTabChange = (value: string) => {
    setScheduleTabValue(value);
  };

  const handleCreateSchedule = () => {
    scheduleBackupMutation.mutate(scheduleForm);
  };

  // 타입 안정성이 강화된 폼 변경 핸들러
  const handleScheduleFormChange = <K extends keyof ScheduleFormData>(
    field: K, 
    value: ScheduleFormData[K]
  ) => {
    setScheduleForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // 새로고침 핸들러를 구체적인 쿼리로 세분화
  const handleRefresh = () => {
    // 현재 선택된 탭에 따라 관련 쿼리만 새로고침
    if (selectedTab === "overview") {
      queryClient.invalidateQueries({ queryKey: ["db-summary"] });
      queryClient.invalidateQueries({ queryKey: ["backups"] });
    } else if (selectedTab === "backups") {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      if (scheduleTabValue === "schedule") {
        queryClient.invalidateQueries({ queryKey: ["scheduled-backups"] });
      }
    } else if (selectedTab === "tables") {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["db-summary"] });
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#333333]">데이터베이스 관리</h1>
          <p className="text-muted-foreground">토마토 시스템 데이터베이스를 모니터링하고 백업합니다.</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          className="flex items-center"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> 새로고침
        </Button>
      </div>

      <Tabs defaultValue="overview" value={selectedTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="overview" className="flex items-center">
            <Database className="mr-2 h-4 w-4" /> 개요
          </TabsTrigger>
          <TabsTrigger value="backups" className="flex items-center">
            <HardDrive className="mr-2 h-4 w-4" /> 백업
          </TabsTrigger>
          <TabsTrigger value="tables" className="flex items-center">
            <Table2 className="mr-2 h-4 w-4" /> 테이블
          </TabsTrigger>
        </TabsList>

        {/* 개요 탭 */}
        <TabsContent value="overview">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <Database className="h-5 w-5 mr-2 text-[#ff6246]" />
                데이터베이스 개요
              </CardTitle>
              <CardDescription>
                토마토 시스템 데이터베이스의 전반적인 상태와 통계입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {summaryQuery.isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : summaryQuery.isError ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium">데이터베이스 정보를 불러오는 중 오류가 발생했습니다.</p>
                  <p className="text-sm text-gray-500 mt-2">서버 로그를 확인해 주세요.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">총 테이블 수</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="flex items-center">
                          <Table2 className="h-8 w-8 text-[#4da34c] mr-3" />
                          <p className="text-3xl font-bold text-[#333333]">{summaryQuery.data?.table_count}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">데이터베이스 크기</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="flex items-center">
                          <Database className="h-8 w-8 text-[#ff6246] mr-3" />
                          <p className="text-3xl font-bold text-[#333333]">{summaryQuery.data?.database_size.pretty}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">최근 백업</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="flex items-center">
                          <Clock className="h-8 w-8 text-blue-500 mr-3" />
                          <p className="text-lg font-medium text-[#333333]">
                            {backupsQuery.data?.backups && backupsQuery.data.backups.length > 0
                              ? format(new Date(backupsQuery.data.backups[0].created_at), "yyyy-MM-dd HH:mm:ss")
                              : "백업 없음"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base font-medium flex items-center">
                          <Layers className="h-4 w-4 mr-2 text-[#ff6246]" />
                          가장 큰 테이블 (크기별)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead>테이블명</TableHead>
                              <TableHead className="text-right">크기</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summaryQuery.data?.largest_tables.map((table) => (
                              <TableRow key={table.table_name} className="hover:bg-gray-50">
                                <TableCell className="font-medium">{table.table_name}</TableCell>
                                <TableCell className="text-right">{table.size}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base font-medium flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-[#4da34c]" />
                          가장 많은 행 (행 수별)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead>테이블명</TableHead>
                              <TableHead className="text-right">행 수</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summaryQuery.data?.most_rows.map((table) => (
                              <TableRow key={table.table_name} className="hover:bg-gray-50">
                                <TableCell className="font-medium">{table.table_name}</TableCell>
                                <TableCell className="text-right">{table.row_count.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 백업 탭 */}
        <TabsContent value="backups">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <HardDrive className="h-5 w-5 mr-2 text-[#ff6246]" />
                데이터베이스 백업
              </CardTitle>
              <CardDescription>
                데이터베이스의 백업을 생성하고 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {/* 백업 탭 내부 탭 */}
              <Tabs defaultValue="backup-list" value={scheduleTabValue} onValueChange={handleScheduleTabChange}>
                <TabsList className="mb-4 w-full">
                  <TabsTrigger value="backup-list" className="flex items-center">
                    <HardDrive className="mr-2 h-4 w-4" /> 백업 목록
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" /> 예약 백업
                  </TabsTrigger>
                </TabsList>

                {/* 백업 목록 탭 */}
                <TabsContent value="backup-list">
                  <div className="space-y-6">
                    <Card className="border border-gray-200 shadow-sm border-dashed bg-gray-50">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex justify-center">
                            <HardDrive className="h-12 w-12 text-gray-400" />
                          </div>
                          <div className="text-center">
                            <h3 className="text-lg font-medium text-[#333333]">새 백업 생성</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              현재 데이터베이스 상태의 백업을 생성합니다.
                            </p>
                          </div>
                          <div className="flex items-end gap-4">
                            <div className="flex-1">
                              <label htmlFor="backup-description" className="block text-sm font-medium mb-1">
                                백업 설명 (선택사항)
                              </label>
                              <Input
                                id="backup-description"
                                value={backupDescription}
                                onChange={(e) => setBackupDescription(e.target.value)}
                                placeholder="백업에 대한 설명을 입력하세요"
                                className="border-gray-300 focus:ring-[#4da34c] focus:border-[#4da34c]"
                              />
                            </div>
                            <Button
                              onClick={handleBackup}
                              disabled={backupMutation.isPending}
                              className="bg-[#4da34c] hover:bg-[#3d8c3c]"
                            >
                              {backupMutation.isPending ? "백업 진행 중..." : "백업 생성"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center text-[#333333]">
                        <Server className="h-4 w-4 mr-2 text-[#ff6246]" />
                        기존 백업 목록
                      </h3>
                      <Separator className="mb-4" />
                      
                      {backupsQuery.isLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : backupsQuery.isError ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                          <p className="text-red-500">
                            백업 목록을 불러오는 중 오류가 발생했습니다.
                          </p>
                        </div>
                      ) : backupsQuery.data?.backups.length === 0 ? (
                        <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                          <HardDrive className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p>아직 생성된 백업이 없습니다.</p>
                          <p className="text-sm text-gray-400 mt-1">위 양식을 사용하여 첫 백업을 생성하세요.</p>
                        </div>
                      ) : (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead>파일명</TableHead>
                                <TableHead>설명</TableHead>
                                <TableHead>생성일시</TableHead>
                                <TableHead>크기</TableHead>
                                <TableHead className="text-right">작업</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {backupsQuery.data?.backups.map((backup) => (
                                <TableRow key={backup.id} className="hover:bg-gray-50">
                                  <TableCell className="font-medium">
                                    {backup.filename}
                                    {backup.scheduled_backup_id && 
                                      <Badge variant="outline" className="ml-2 bg-blue-50">예약</Badge>
                                    }
                                  </TableCell>
                                  <TableCell>
                                    {backup.description || <span className="text-gray-400">-</span>}
                                  </TableCell>
                                  <TableCell>
                                    {format(new Date(backup.created_at), "yyyy-MM-dd HH:mm:ss")}
                                  </TableCell>
                                  <TableCell>{backup.size_mb.toFixed(2)} MB</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDownload(backup.id)}
                                        className="hover:bg-blue-50 hover:text-blue-500"
                                      >
                                        <DownloadIcon className="h-4 w-4" />
                                      </Button>
                                      
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="hover:bg-red-50 hover:text-red-500"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>백업 삭제 확인</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              이 백업을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>취소</AlertDialogCancel>
                                            <AlertDialogAction 
                                              onClick={() => handleDeleteBackup(backup.id)}
                                              className="bg-red-500 hover:bg-red-600 text-white"
                                            >
                                              삭제
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* 예약 백업 탭 */}
                <TabsContent value="schedule">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium flex items-center text-[#333333]">
                        <Calendar className="h-4 w-4 mr-2 text-[#ff6246]" />
                        예약된 백업 목록
                      </h3>
                      
                      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-[#4da34c] hover:bg-[#3d8c3c]">
                            <Plus className="mr-2 h-4 w-4" />
                            예약 백업 추가
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>새 예약 백업 생성</DialogTitle>
                            <DialogDescription>
                              주기적으로 자동 실행될 백업 일정을 설정합니다.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="schedule-name" className="text-right">
                                이름
                              </Label>
                              <Input
                                id="schedule-name"
                                value={scheduleForm.name}
                                onChange={(e) => handleScheduleFormChange('name', e.target.value)}
                                className="col-span-3"
                                placeholder="예약 백업 이름"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="schedule-description" className="text-right">
                                설명
                              </Label>
                              <Input
                                id="schedule-description"
                                value={scheduleForm.description}
                                onChange={(e) => handleScheduleFormChange('description', e.target.value)}
                                className="col-span-3"
                                placeholder="예약 백업 설명 (선택사항)"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="schedule-type" className="text-right">
                                주기
                              </Label>
                              <Select
                                value={scheduleForm.schedule_type}
                                onValueChange={(value) => handleScheduleFormChange('schedule_type', value as ScheduleType)}
                              >
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="주기 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="daily">매일</SelectItem>
                                  <SelectItem value="weekly">매주</SelectItem>
                                  <SelectItem value="monthly">매월</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {scheduleForm.schedule_type === 'weekly' && (
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="day-of-week" className="text-right">
                                  요일
                                </Label>
                                <Select
                                  value={scheduleForm.day_of_week.toString()}
                                  onValueChange={(value) => handleScheduleFormChange('day_of_week', parseInt(value))}
                                >
                                  <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="요일 선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {weekdays.map((day, index) => (
                                      <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            
                            {scheduleForm.schedule_type === 'monthly' && (
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="day-of-month" className="text-right">
                                  일자
                                </Label>
                                <Select
                                  value={scheduleForm.day_of_month.toString()}
                                  onValueChange={(value) => handleScheduleFormChange('day_of_month', parseInt(value))}
                                >
                                  <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="일자 선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[...Array(31)].map((_, i) => (
                                      <SelectItem key={i+1} value={(i+1).toString()}>{i+1}일</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="schedule-time" className="text-right">
                                시간
                              </Label>
                              <div className="col-span-3 flex space-x-2">
                                <Select
                                  value={scheduleForm.hour.toString()}
                                  onValueChange={(value) => handleScheduleFormChange('hour', parseInt(value))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="시" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[...Array(24)].map((_, i) => (
                                      <SelectItem key={i} value={i.toString()}>{i}시</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                <Select
                                  value={scheduleForm.minute.toString()}
                                  onValueChange={(value) => handleScheduleFormChange('minute', parseInt(value))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="분" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[...Array(60)].map((_, i) => (
                                      <SelectItem key={i} value={i.toString()}>{i}분</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                              취소
                            </Button>
                            <Button 
                              onClick={handleCreateSchedule} 
                              disabled={!scheduleForm.name}
                              className="bg-[#4da34c] hover:bg-[#3d8c3c]"
                            >
                              저장
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <Separator className="mb-4" />
                    
                    {scheduledBackupsQuery.isLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : scheduledBackupsQuery.isError ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-red-500">
                          예약 백업 목록을 불러오는 중 오류가 발생했습니다.
                        </p>
                      </div>
                    ) : scheduledBackupsQuery.data?.scheduled_backups.length === 0 ? (
                      <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p>아직 생성된 예약 백업이 없습니다.</p>
                        <p className="text-sm text-gray-400 mt-1">예약 백업 추가를 통해 자동화된 백업을 설정하세요.</p>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead>이름</TableHead>
                              <TableHead>설명</TableHead>
                              <TableHead>예약 일정</TableHead>
                              <TableHead>마지막 실행</TableHead>
                              <TableHead>상태</TableHead>
                              <TableHead className="text-right">작업</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {scheduledBackupsQuery.data?.scheduled_backups.map((schedule) => (
                              <TableRow key={schedule.id} className="hover:bg-gray-50">
                                <TableCell className="font-medium">
                                  {schedule.name}
                                </TableCell>
                                <TableCell>
                                  {schedule.description || <span className="text-gray-400">-</span>}
                                </TableCell>
                                <TableCell>
                                  {schedule.schedule_info}
                                </TableCell>
                                <TableCell>
                                  {schedule.last_run 
                                    ? format(new Date(schedule.last_run), "yyyy-MM-dd HH:mm:ss")
                                    : <span className="text-gray-400">아직 실행되지 않음</span>
                                  }
                                </TableCell>
                                <TableCell>
                                  {schedule.is_active 
                                    ? <Badge className="bg-green-100 text-green-800">활성</Badge>
                                    : <Badge variant="outline" className="text-gray-500">비활성</Badge>
                                  }
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleToggleSchedule(schedule.id)}
                                      className={schedule.is_active 
                                        ? "hover:bg-amber-50 hover:text-amber-500" 
                                        : "hover:bg-green-50 hover:text-green-500"
                                      }
                                    >
                                      {schedule.is_active 
                                        ? <Pause className="h-4 w-4" />
                                        : <Play className="h-4 w-4" />
                                      }
                                    </Button>
                                    
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="hover:bg-red-50 hover:text-red-500"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>예약 백업 삭제 확인</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            이 예약 백업을 정말로 삭제하시겠습니까? 이미 생성된 백업 파일은 유지됩니다.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>취소</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={() => handleDeleteSchedule(schedule.id)}
                                            className="bg-red-500 hover:bg-red-600 text-white"
                                          >
                                            삭제
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 테이블 탭 */}
        <TabsContent value="tables">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <Table2 className="h-5 w-5 mr-2 text-[#ff6246]" />
                데이터베이스 테이블
              </CardTitle>
              <CardDescription>
                토마토 시스템에서 사용 중인 모든 테이블과 그 통계를 조회합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {tablesQuery.isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : tablesQuery.isError ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-red-500">
                    테이블 목록을 불러오는 중 오류가 발생했습니다.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>테이블명</TableHead>
                        <TableHead className="text-right">행 수</TableHead>
                        <TableHead className="text-right">크기</TableHead>
                        <TableHead className="text-right">비율</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tablesQuery.data?.tables
                        .sort((a, b) => b.bytes - a.bytes)
                        .map((table) => {
                          // DB 전체 크기에 대한 테이블 크기 비율 계산
                          const totalBytes = summaryQuery.data?.database_size.bytes || 1;
                          // 올바른 비율 계산 (0-100% 사이로 제한)
                          const percentage = Math.min(100, (table.bytes / totalBytes) * 100);

                          return (
                            <TableRow key={table.table_name} className="hover:bg-gray-50">
                              <TableCell className="font-medium">
                                {table.table_name}
                              </TableCell>
                              <TableCell className="text-right">
                                {table.row_count.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">{table.size}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Progress 
                                    value={percentage} 
                                    className="w-24" 
                                  />
                                  <span className="text-xs">{percentage.toFixed(1)}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 메인 페이지 컴포넌트 - ProtectedRoute로 감싸기
export default function DatabaseManagementPage() {
  return (
    <ProtectedRoute>
      <DatabaseManagementContent />
    </ProtectedRoute>
  );
}
