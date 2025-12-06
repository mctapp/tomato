// app/ip-management/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from "sonner";
import {
  Shield,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { apiClient } from '@/lib/utils/api-client';

interface AllowedIP {
  id: number;
  ip_address: string;
  username: string;
  memo: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number | null;
}

interface AccessLog {
  id: number;
  ip_address: string;
  username: string | null;
  request_path: string | null;
  request_method: string | null;
  user_agent: string | null;
  status_code: number | null;
  accessed_at: string;
}

interface CurrentIP {
  ip_address: string;
  username: string | null;
  is_registered: boolean;
}

function IPManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState('list');
  const [allowedIPs, setAllowedIPs] = useState<AllowedIP[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [currentIP, setCurrentIP] = useState<CurrentIP | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const pageSize = 20;

  // 등록 폼
  const [formData, setFormData] = useState({
    ip_address: '',
    username: '',
    memo: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 다이얼로그
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AllowedIP | null>(null);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedIP, setSelectedIP] = useState<AllowedIP | null>(null);
  const [ipLogs, setIPLogs] = useState<AccessLog[]>([]);
  const [deleteLogsDialogOpen, setDeleteLogsDialogOpen] = useState(false);

  // URL 파라미터에서 탭 초기화
  useEffect(() => {
    const tab = searchParams.get('tab') || 'list';
    setActiveTab(tab);
  }, [searchParams]);

  // 데이터 로드
  useEffect(() => {
    fetchCurrentIP();
    fetchAllowedIPs();
    fetchAccessLogs();
  }, [currentPage]);

  const fetchCurrentIP = async () => {
    try {
      const data = await apiClient.get<CurrentIP>('/api/admin/ip-management/current-ip');
      setCurrentIP(data);
    } catch (error) {
      console.error('현재 IP 조회 실패:', error);
    }
  };

  const fetchAllowedIPs = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{ allowed_ips: AllowedIP[] }>('/api/admin/ip-management/allowed-ips');
      setAllowedIPs(data.allowed_ips);
    } catch (error) {
      console.error('IP 목록 조회 실패:', error);
      toast.error('IP 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccessLogs = async () => {
    try {
      const data = await apiClient.get<{
        access_logs: AccessLog[];
        total: number;
        total_pages: number;
      }>(`/api/admin/ip-management/access-logs?page=${currentPage}&limit=${pageSize}`);
      setAccessLogs(data.access_logs);
      setTotalLogs(data.total);
      setTotalPages(data.total_pages);
    } catch (error) {
      console.error('접속 로그 조회 실패:', error);
    }
  };

  const fetchIPLogs = async (ipAddress: string) => {
    try {
      const data = await apiClient.get<{ access_logs: AccessLog[] }>(
        `/api/admin/ip-management/access-logs/by-ip/${encodeURIComponent(ipAddress)}`
      );
      setIPLogs(data.access_logs);
    } catch (error) {
      console.error('IP 로그 조회 실패:', error);
      toast.error('접속 로그를 불러오는데 실패했습니다.');
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/ip-management?tab=${value}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.ip_address || !formData.username) {
      toast.error('IP 주소와 사용자명은 필수입니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/api/admin/ip-management/allowed-ips', {
        ip_address: formData.ip_address,
        username: formData.username,
        memo: formData.memo || null
      });

      toast.success('IP가 등록되었습니다.');
      setFormData({ ip_address: '', username: '', memo: '' });
      fetchAllowedIPs();
      setActiveTab('list');
      router.push('/ip-management?tab=list');
    } catch (error: any) {
      toast.error(error.message || 'IP 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await apiClient.delete(`/api/admin/ip-management/allowed-ips/${deleteTarget.id}`);
      toast.success('IP가 삭제되었습니다.');
      fetchAllowedIPs();
    } catch (error) {
      toast.error('IP 삭제에 실패했습니다.');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleActive = async (ip: AllowedIP) => {
    try {
      await apiClient.put(`/api/admin/ip-management/allowed-ips/${ip.id}/toggle`);
      toast.success(ip.is_active ? 'IP가 비활성화되었습니다.' : 'IP가 활성화되었습니다.');
      fetchAllowedIPs();
    } catch (error) {
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  const handleViewLogs = async (ip: AllowedIP) => {
    setSelectedIP(ip);
    await fetchIPLogs(ip.ip_address);
    setLogsDialogOpen(true);
  };

  const handleDeleteAllLogs = async () => {
    try {
      await apiClient.delete('/api/admin/ip-management/access-logs');
      toast.success('모든 접속 로그가 삭제되었습니다.');
      fetchAccessLogs();
    } catch (error) {
      toast.error('로그 삭제에 실패했습니다.');
    } finally {
      setDeleteLogsDialogOpen(false);
    }
  };

  const filteredIPs = allowedIPs.filter(ip =>
    ip.ip_address.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    ip.username.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    (ip.memo && ip.memo.toLowerCase().includes(searchKeyword.toLowerCase()))
  );

  return (
    <div className="max-w-[1200px] mx-auto py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#333333]">접속 IP 관리</h1>
          <p className="text-muted-foreground">
            {currentIP && (
              <span>
                현재 접속 IP: <strong>{currentIP.ip_address}</strong>
                {currentIP.is_registered ? (
                  <Badge className="ml-2 bg-green-100 text-green-700">등록됨</Badge>
                ) : (
                  <Badge className="ml-2 bg-yellow-100 text-yellow-700">미등록</Badge>
                )}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">IP 목록</TabsTrigger>
          <TabsTrigger value="register">IP 등록</TabsTrigger>
          <TabsTrigger value="logs">접속 로그</TabsTrigger>
        </TabsList>

        {/* IP 목록 탭 */}
        <TabsContent value="list">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <Shield className="h-5 w-5 mr-2 text-[#ff6246]" />
                등록된 IP 목록
              </CardTitle>
              <CardDescription>
                전체 {allowedIPs.length}개 중 {filteredIPs.length}개 표시 중
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* 검색 */}
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="IP, 사용자명, 메모로 검색..."
                      className="pl-8"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" onClick={() => { setSearchKeyword(''); fetchAllowedIPs(); }}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    새로고침
                  </Button>
                </div>

                <Separator />

                {/* 테이블 */}
                {isLoading ? (
                  <div className="w-full py-24 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : filteredIPs.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">등록된 IP가 없습니다.</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-[60px]">ID</TableHead>
                          <TableHead className="w-[180px]">IP 주소</TableHead>
                          <TableHead className="w-[120px]">사용자</TableHead>
                          <TableHead>메모</TableHead>
                          <TableHead className="w-[80px]">상태</TableHead>
                          <TableHead className="w-[120px]">등록일</TableHead>
                          <TableHead className="w-[150px]">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredIPs.map((ip) => (
                          <TableRow key={ip.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{ip.id}</TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">{ip.ip_address}</span>
                            </TableCell>
                            <TableCell className="font-medium">{ip.username}</TableCell>
                            <TableCell className="text-gray-500 text-sm">
                              {ip.memo || '-'}
                            </TableCell>
                            <TableCell>
                              {ip.is_active ? (
                                <Badge className="bg-green-100 text-green-700">활성</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-700">비활성</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(parseISO(ip.created_at), 'yyyy-MM-dd', { locale: ko })}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-600"
                                  onClick={() => handleViewLogs(ip)}
                                  title="접속 로그"
                                >
                                  <Clock className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className={`h-8 w-8 ${ip.is_active
                                    ? 'hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-600'
                                    : 'hover:bg-green-50 hover:text-green-600 hover:border-green-600'
                                    }`}
                                  onClick={() => handleToggleActive(ip)}
                                  title={ip.is_active ? '비활성화' : '활성화'}
                                >
                                  {ip.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246]"
                                  onClick={() => {
                                    setDeleteTarget(ip);
                                    setDeleteDialogOpen(true);
                                  }}
                                  title="삭제"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IP 등록 탭 */}
        <TabsContent value="register">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden max-w-2xl mx-auto">
            <CardHeader className="p-4 pb-2 bg-white">
              <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                <Plus className="h-5 w-5 mr-2 text-[#ff6246]" />
                새 IP 등록
              </CardTitle>
              <CardDescription>
                접속을 허용할 IP 주소를 등록합니다. CIDR 형식도 지원합니다. (예: 192.168.1.0/24)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="ip_address">IP 주소 *</Label>
                  <Input
                    id="ip_address"
                    placeholder="예: 192.168.1.100 또는 192.168.1.0/24"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    단일 IP 또는 CIDR 형식의 IP 대역을 입력하세요.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">사용자명 *</Label>
                  <Input
                    id="username"
                    placeholder="예: 홍길동"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    이 IP를 사용하는 사용자 또는 팀의 이름입니다.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memo">메모</Label>
                  <Textarea
                    id="memo"
                    placeholder="예: 본사 사무실 PC"
                    value={formData.memo}
                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    rows={3}
                  />
                  <p className="text-xs text-gray-500">
                    이 IP에 대한 추가 설명 (선택사항)
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData({ ip_address: '', username: '', memo: '' });
                      handleTabChange('list');
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#4da34c] hover:bg-[#3d8c3c]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '등록 중...' : 'IP 등록'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 접속 로그 탭 */}
        <TabsContent value="logs">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-white">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-medium text-[#333333] flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-[#ff6246]" />
                    접속 로그
                  </CardTitle>
                  <CardDescription>
                    최근 30일간의 접속 기록 (총 {totalLogs}건)
                  </CardDescription>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteLogsDialogOpen(true)}
                  disabled={accessLogs.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  전체 삭제
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {accessLogs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">접속 로그가 없습니다.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-[150px]">접속 시간</TableHead>
                          <TableHead className="w-[150px]">IP 주소</TableHead>
                          <TableHead className="w-[100px]">사용자</TableHead>
                          <TableHead className="w-[80px]">메소드</TableHead>
                          <TableHead>요청 경로</TableHead>
                          <TableHead className="w-[80px]">상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accessLogs.map((log) => (
                          <TableRow key={log.id} className="hover:bg-gray-50">
                            <TableCell className="text-sm">
                              {format(parseISO(log.accessed_at), 'MM-dd HH:mm:ss', { locale: ko })}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">{log.ip_address}</span>
                            </TableCell>
                            <TableCell>{log.username || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.request_method}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600 max-w-[300px] truncate">
                              {log.request_path}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  log.status_code && log.status_code < 400
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }
                              >
                                {log.status_code}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* 페이지네이션 */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                              className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                            />
                          </PaginationItem>
                          {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                            const page = index + 1;
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  isActive={page === currentPage}
                                  onClick={() => setCurrentPage(page)}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                              className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>IP 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.ip_address}</strong> ({deleteTarget?.username})를 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 접속 로그 다이얼로그 */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>접속 로그 - {selectedIP?.ip_address}</DialogTitle>
            <DialogDescription>
              {selectedIP?.username}의 최근 접속 기록
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {ipLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                접속 기록이 없습니다.
              </div>
            ) : (
              <div className="rounded-md border max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>접속 시간</TableHead>
                      <TableHead>메소드</TableHead>
                      <TableHead>요청 경로</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(parseISO(log.accessed_at), 'yyyy-MM-dd HH:mm:ss', { locale: ko })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.request_method}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                          {log.request_path}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              log.status_code && log.status_code < 400
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }
                          >
                            {log.status_code}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogsDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 전체 로그 삭제 확인 */}
      <AlertDialog open={deleteLogsDialogOpen} onOpenChange={setDeleteLogsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              전체 접속 로그 삭제
            </AlertDialogTitle>
            <AlertDialogDescription>
              모든 접속 로그({totalLogs}건)를 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllLogs} className="bg-red-600 hover:bg-red-700">
              전체 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function IPManagementPage() {
  return (
    <ProtectedRoute requiredRoles={['SUPER_ADMIN']}>
      <Suspense fallback={
        <div className="max-w-[1200px] mx-auto py-10 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }>
        <IPManagementContent />
      </Suspense>
    </ProtectedRoute>
  );
}
