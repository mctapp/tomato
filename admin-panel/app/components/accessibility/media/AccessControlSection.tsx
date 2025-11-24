
// app/components/accessibility/media/AccessControlSection.tsx
import React, { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Lock, Unlock, AlertCircle, ShieldCheck, CheckCircle, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { useAccessRequests, useToggleLockStatus, useProcessAccessRequest } from '@/hooks/useMediaAccess';

interface AccessControlSectionProps {
  assetId: number;
  isLocked: boolean;
  currentAdminId?: number;
}

export function AccessControlSection({
  assetId,
  isLocked,
  currentAdminId
}: AccessControlSectionProps) {
  const [viewMode, setViewMode] = useState<'settings' | 'requests'>('settings');
  
  // 접근 요청 목록 가져오기
  const { data: accessRequests, isLoading: isLoadingRequests } = useAccessRequests({
    mediaId: assetId,
    status: 'pending',
  }, viewMode === 'requests');
  
  // 잠금 상태 토글 뮤테이션
  const toggleLockMutation = useToggleLockStatus();
  
  // 잠금 상태 토글 핸들러
  const handleToggleLock = async () => {
    try {
      await toggleLockMutation.mutateAsync({
        mediaId: assetId,
        isLocked: !isLocked,
        adminId: currentAdminId
      });
    } catch (error) {
      console.error('Lock toggle error:', error);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>접근 제어</CardTitle>
        <CardDescription>
          접근성 미디어 자산의 잠금 상태와 접근 요청 관리
        </CardDescription>
        <div className="flex space-x-2">
          <Button 
            variant={viewMode === 'settings' ? 'default' : 'outline'}
            onClick={() => setViewMode('settings')}
          >
            설정
          </Button>
          <Button 
            variant={viewMode === 'requests' ? 'default' : 'outline'}
            onClick={() => setViewMode('requests')}
          >
            접근 요청
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'settings' ? (
          <AccessControlSettings
            isLocked={isLocked}
            onToggleLock={handleToggleLock}
            isToggling={toggleLockMutation.isPending}
          />
        ) : (
          <AccessRequestsTable
            requests={accessRequests || []}
            isLoading={isLoadingRequests}
            adminId={currentAdminId}
          />
        )}
      </CardContent>
    </Card>
  );
}

// 접근 제어 설정 컴포넌트
function AccessControlSettings({
  isLocked,
  onToggleLock,
  isToggling
}: {
  isLocked: boolean;
  onToggleLock: () => void;
  isToggling: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">잠금 상태</h3>
          <p className="text-sm text-gray-500">
            자산을 잠그면 승인된 접근 요청이 있는 사용자만 접근할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={isLocked}
            onCheckedChange={onToggleLock}
            disabled={isToggling}
          />
          <span>
            {isLocked ? (
              <Badge variant="outline" className="bg-red-100">잠김</Badge>
            ) : (
              <Badge variant="outline" className="bg-green-100">열림</Badge>
            )}
          </span>
        </div>
      </div>
      
      <Alert variant="default" className={isLocked ? '' : 'border-green-500 text-green-500'}>
        {isLocked ? (
          <>
            <Lock className="h-4 w-4" />
            <AlertTitle>접근 제한됨</AlertTitle>
            <AlertDescription>
              이 자산은 현재 잠겨 있으며, 승인된 접근 요청이 있는 사용자만 접근할 수 있습니다.
            </AlertDescription>
          </>
        ) : (
          <>
            <Unlock className="h-4 w-4" />
            <AlertTitle>자유롭게 접근 가능</AlertTitle>
            <AlertDescription>
              이 자산은 현재 모든 사용자가 접근할 수 있습니다.
            </AlertDescription>
          </>
        )}
      </Alert>
    </div>
  );
}

// 접근 요청 테이블 컴포넌트
function AccessRequestsTable({
  requests,
  isLoading,
  adminId
}: {
  requests: any[];
  isLoading: boolean;
  adminId?: number;
}) {
  // 접근 요청 처리 뮤테이션
  const processRequestMutation = useProcessAccessRequest();
  
  // 접근 요청 처리 핸들러
  const handleProcessRequest = async (requestId: number, status: 'approved' | 'rejected', expiry?: Date) => {
    if (!adminId) return;
    
    try {
      await processRequestMutation.mutateAsync({
        requestId,
        data: {
          status,
          adminId,
          adminNotes: status === 'approved' 
            ? '관리자가 접근을 승인했습니다' 
            : '관리자가 접근을 거부했습니다',
          expiryDate: expiry ? expiry.toISOString() : undefined
        }
      });
    } catch (error) {
      console.error('Process request error:', error);
    }
  };
  
  if (isLoading) {
    return <div className="py-10 text-center">로딩 중...</div>;
  }
  
  if (!requests.length) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>대기 중인 접근 요청 없음</AlertTitle>
        <AlertDescription>
          현재 처리 대기 중인 접근 요청이 없습니다.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>요청자</TableHead>
            <TableHead>요청 이유</TableHead>
            <TableHead>요청일</TableHead>
            <TableHead className="text-right">액션</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                {request.userId ? `사용자 #${request.userId}` : '익명 사용자'}
                <div className="text-sm text-gray-500">
                  {request.deviceId ? `기기: ${request.deviceId.substring(0, 8)}...` : ''}
                </div>
              </TableCell>
              <TableCell>
                {request.requestReason || '이유 없음'}
              </TableCell>
              <TableCell>
                {format(new Date(request.createdAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <ProcessRequestDialog
                    request={request}
                    onProcess={handleProcessRequest}
                    isProcessing={processRequestMutation.isPending}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleProcessRequest(request.id, 'rejected')}
                    disabled={processRequestMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    거부
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// 접근 요청 처리 다이얼로그
function ProcessRequestDialog({
  request,
  onProcess,
  isProcessing
}: {
  request: any;
  onProcess: (requestId: number, status: 'approved' | 'rejected', expiry?: Date) => void;
  isProcessing: boolean;
}) {
  const [open, setOpen] = useState(false);
  
  // 폼 스키마
  const formSchema = z.object({
    expiryDate: z.date().optional(),
  });
  
  // 폼 설정
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 기본값 30일 후
    }
  });
  
  // 폼 제출 핸들러
  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onProcess(request.id, 'approved', values.expiryDate);
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-green-500 hover:text-green-700"
          disabled={isProcessing}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          승인
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>접근 요청 승인</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col col-span-4">
                      <FormLabel>만료일</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: ko })
                              ) : (
                                <span>날짜 선택</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? '처리 중...' : '승인'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
