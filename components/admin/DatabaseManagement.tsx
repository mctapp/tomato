// components/admin/DatabaseManagement.tsx

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from 'react-query';

// API 호출 함수
const fetchBackups = async () => {
  const response = await fetch('/api/admin/database/backups');
  if (!response.ok) throw new Error('백업 목록을 불러오는데 실패했습니다.');
  return response.json();
};

const fetchTables = async () => {
  const response = await fetch('/api/admin/database/tables');
  if (!response.ok) throw new Error('테이블 목록을 불러오는데 실패했습니다.');
  return response.json();
};

const createBackup = async (description: string) => {
  const response = await fetch('/api/admin/database/backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description })
  });
  if (!response.ok) throw new Error('백업 생성에 실패했습니다.');
  return response.json();
};

// 백업 관리 컴포넌트
const BackupManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery('backups', fetchBackups);
  
  const backupMutation = useMutation(createBackup, {
    onSuccess: () => {
      toast({
        title: "백업 생성 완료",
        description: "데이터베이스 백업이 성공적으로 생성되었습니다.",
      });
      setIsDialogOpen(false);
      queryClient.invalidateQueries('backups');
    },
    onError: (error: Error) => {
      toast({
        title: "백업 생성 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleBackup = () => {
    backupMutation.mutate(description);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>데이터베이스 백업 관리</span>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>새 백업 생성</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 데이터베이스 백업 생성</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="description">백업 설명</Label>
                  <Input
                    id="description"
                    placeholder="이 백업에 대한 설명을 입력하세요"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleBackup} 
                  disabled={backupMutation.isLoading}
                >
                  {backupMutation.isLoading ? "백업 진행 중..." : "백업 생성"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>로딩 중...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>파일명</TableHead>
                <TableHead>설명</TableHead>
                <TableHead>생성일시</TableHead>
                <TableHead>크기</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell>{backup.filename}</TableCell>
                  <TableCell>{backup.description || "-"}</TableCell>
                  <TableCell>{new Date(backup.created_at).toLocaleString()}</TableCell>
                  <TableCell>{backup.size_mb} MB</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => {
                      // 백업 다운로드 로직
                      window.open(`/api/admin/database/backups/${backup.id}/download`, '_blank');
                    }}>
                      다운로드
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// 테이블 현황 컴포넌트
const TableStats = () => {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const { data, isLoading } = useQuery('tables', fetchTables);
  
  // 선택된 테이블의 상세 통계
  const { data: tableDetail, isLoading: isDetailLoading } = useQuery(
    ['tableDetail', selectedTable],
    async () => {
      if (!selectedTable) return null;
      const response = await fetch(`/api/admin/database/tables/${selectedTable}/stats`);
      if (!response.ok) throw new Error('테이블 통계를 불러오는데 실패했습니다.');
      return response.json();
    },
    { enabled: !!selectedTable }
  );
  
  // 차트 데이터 변환
  const chartData = data?.tables
    ? data.tables
        .sort((a, b) => b.row_count - a.row_count)
        .slice(0, 10)
        .map(table => ({
          name: table.table_name,
          records: table.row_count
        }))
    : [];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>데이터베이스 테이블 현황</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart">
          <TabsList className="mb-4">
            <TabsTrigger value="chart">차트 보기</TabsTrigger>
            <TabsTrigger value="list">목록 보기</TabsTrigger>
            {selectedTable && (
              <TabsTrigger value="detail">선택된 테이블: {selectedTable}</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="chart">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="records" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="list">
            {isLoading ? (
              <div>로딩 중...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>테이블명</TableHead>
                    <TableHead>레코드 수</TableHead>
                    <TableHead>크기</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.tables.map((table) => (
                    <TableRow key={table.table_name}>
                      <TableCell>{table.table_name}</TableCell>
                      <TableCell>{table.row_count}</TableCell>
                      <TableCell>{table.size}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSelectedTable(table.table_name)}
                        >
                          상세보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
          
          {selectedTable && (
            <TabsContent value="detail">
              {isDetailLoading ? (
                <div>로딩 중...</div>
              ) : tableDetail && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">테이블 정보</h3>
                    <p>레코드 수: {tableDetail.stats.row_count}</p>
                    <p>테이블 크기: {tableDetail.stats.size}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium">컬럼 구조</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>컬럼명</TableHead>
                          <TableHead>데이터 타입</TableHead>
                          <TableHead>Nullable</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableDetail.columns.map((column) => (
                          <TableRow key={column.name}>
                            <TableCell>{column.name}</TableCell>
                            <TableCell>{column.type}</TableCell>
                            <TableCell>{column.nullable ? "YES" : "NO"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

// 메인 데이터베이스 관리 컴포넌트
const DatabaseManagement = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">데이터베이스 관리</h1>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>데이터베이스 요약</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 데이터베이스 요약 정보를 표시하는 컴포넌트 */}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>최근 변경 사항</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 최근 데이터 변경 내역을 표시하는 컴포넌트 */}
          </CardContent>
        </Card>
      </div>
      
      <BackupManager />
      
      <TableStats />
    </div>
  );
};

export default DatabaseManagement;
