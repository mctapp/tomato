'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Smartphone, Mail, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/utils/api-client';
import { MFAStatusResponse, MFASetupResponse } from '@/types/auth';
import { QRCodeWrapper } from '@/components/ui/qr-code-wrapper';

export function MFASetup() {
  const queryClient = useQueryClient();
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setupData, setSetupData] = useState<MFASetupResponse | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  // MFA 상태 조회
  const { data: mfaStatus, isLoading } = useQuery<MFAStatusResponse>({
    queryKey: ['mfa-status'],
    queryFn: async () => {
      return await apiClient.get<MFAStatusResponse>('/api/auth/mfa/status');
    },
  });

  // MFA 설정
  const setupMutation = useMutation({
    mutationFn: async (mfaType: string) => {
      return await apiClient.post<MFASetupResponse>('/api/auth/mfa/setup', { 
        mfa_type: mfaType 
      });
    },
    onSuccess: (data) => {
      setSetupData(data);
      setBackupCodes(data.backup_codes);
      toast.success('MFA 설정을 시작합니다');
    },
    onError: () => {
      toast.error('MFA 설정에 실패했습니다');
    }
  });

  // MFA 확인
  const confirmMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiClient.post<{ message: string }>('/api/auth/mfa/confirm', { code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] });
      setSetupData(null);
      setVerificationCode('');
      toast.success('2단계 인증이 활성화되었습니다');
    },
    onError: () => {
      toast.error('인증 코드가 올바르지 않습니다');
      setVerificationCode('');
    }
  });

  // MFA 해제
  const disableMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiClient.post<{ message: string }>('/api/auth/mfa/disable', { code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] });
      setShowDisableConfirm(false);
      setVerificationCode('');
      toast.success('2단계 인증이 해제되었습니다');
    },
    onError: () => {
      toast.error('인증 코드가 올바르지 않습니다');
      setVerificationCode('');
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success('클립보드에 복사되었습니다');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff6246]" />
        </CardContent>
      </Card>
    );
  }

  // MFA가 이미 활성화된 경우
  if (mfaStatus?.mfa_enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#ff6246]" />
            2단계 인증
          </CardTitle>
          <CardDescription>
            계정이 2단계 인증으로 보호되고 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">상태</p>
              <Badge className="bg-[#4da34c] hover:bg-[#4da34c] text-white mt-1">활성화됨</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">인증 방식</p>
              <Badge variant="outline" className="mt-1">
                {mfaStatus.mfa_type === 'TOTP' && '인증 앱'}
                {mfaStatus.mfa_type === 'SMS' && 'SMS'}
                {mfaStatus.mfa_type === 'EMAIL' && '이메일'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">백업 코드</p>
              <Badge variant="outline" className="mt-1">{mfaStatus.backup_codes_count}개 남음</Badge>
            </div>
          </div>

          {!showDisableConfirm ? (
            <Button
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => setShowDisableConfirm(true)}
            >
              2단계 인증 해제
            </Button>
          ) : (
            <div className="space-y-3 p-4 border border-red-200 rounded-lg bg-red-50/50">
              <Alert className="border-red-200 bg-white">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  2단계 인증을 해제하면 계정 보안이 약해집니다. 계속하시려면 인증 코드를 입력하세요.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label>인증 코드</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="000000"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center tracking-widest"
                  />
                  <Button
                    variant="destructive"
                    onClick={() => disableMutation.mutate(verificationCode)}
                    disabled={verificationCode.length !== 6 || disableMutation.isPending}
                  >
                    {disableMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      '해제'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDisableConfirm(false);
                      setVerificationCode('');
                    }}
                  >
                    취소
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // MFA 설정 진행 중
  if (setupData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>2단계 인증 설정</CardTitle>
          <CardDescription>
            아래 단계를 따라 2단계 인증을 완료하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* TOTP 설정 */}
          {setupData.mfa_type === 'TOTP' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#ff6246] text-white flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <h3 className="font-medium">인증 앱으로 QR 코드 스캔</h3>
                </div>
                <p className="text-sm text-gray-600 ml-10">
                  Google Authenticator, Authy 등의 인증 앱으로 아래 QR 코드를 스캔하세요
                </p>
                {setupData.qr_code && (
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg border">
                      <QRCodeWrapper value={setupData.qr_code} size={200} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm text-gray-600">QR 코드를 스캔할 수 없나요? 아래 코드를 수동으로 입력하세요:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                    {setupData.secret}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(setupData.secret || '')}
                  >
                    {copiedCode === setupData.secret ? (
                      <Check className="h-4 w-4 text-[#4da34c]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 백업 코드 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#ff6246] text-white flex items-center justify-center text-sm font-medium">
                2
              </div>
              <h3 className="font-medium">백업 코드 저장</h3>
            </div>
            <p className="text-sm text-gray-600 ml-10">
              휴대폰을 분실했을 때 사용할 수 있는 백업 코드입니다. 안전한 곳에 보관하세요.
            </p>
            <div className="ml-10 grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <div key={index} className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                    {code}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(code)}
                  >
                    {copiedCode === code ? (
                      <Check className="h-3 w-3 text-[#4da34c]" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* 확인 코드 입력 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#ff6246] text-white flex items-center justify-center text-sm font-medium">
                3
              </div>
              <h3 className="font-medium">인증 코드 입력</h3>
            </div>
            <p className="text-sm text-gray-600 ml-10">
              인증 앱에 표시된 6자리 코드를 입력하여 설정을 완료하세요
            </p>
            <div className="ml-10 flex gap-2">
              <Input
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="w-32 text-center tracking-widest"
              />
              <Button
                onClick={() => confirmMutation.mutate(verificationCode)}
                disabled={verificationCode.length !== 6 || confirmMutation.isPending}
                className="bg-[#ff6246] hover:bg-[#ff7e66]"
              >
                {confirmMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '확인'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // MFA 설정 선택
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#ff6246]" />
          2단계 인증
        </CardTitle>
        <CardDescription>
          계정에 추가 보안 계층을 설정하여 더 안전하게 보호하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="totp" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="totp">인증 앱</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="email">이메일</TabsTrigger>
          </TabsList>
          
          <TabsContent value="totp" className="space-y-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Smartphone className="h-5 w-5 mt-1 text-[#ff6246]" />
              <div className="flex-1">
                <h3 className="font-medium">인증 앱 사용</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Google Authenticator, Authy, 1Password 등의 앱으로 시간 기반 코드를 생성합니다
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setupMutation.mutate('TOTP')} 
              className="w-full bg-[#ff6246] hover:bg-[#ff7e66]"
              disabled={setupMutation.isPending}
            >
              {setupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  설정 중...
                </>
              ) : (
                '인증 앱 설정하기'
              )}
            </Button>
          </TabsContent>
          
          <TabsContent value="sms" className="space-y-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Smartphone className="h-5 w-5 mt-1 text-gray-400" />
              <div className="flex-1">
                <h3 className="font-medium">SMS 인증</h3>
                <p className="text-sm text-gray-600 mt-1">
                  휴대폰으로 인증 코드를 받습니다
                </p>
              </div>
            </div>
            <Alert>
              <AlertDescription>
                SMS 인증은 준비 중입니다
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="email" className="space-y-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Mail className="h-5 w-5 mt-1 text-gray-400" />
              <div className="flex-1">
                <h3 className="font-medium">이메일 인증</h3>
                <p className="text-sm text-gray-600 mt-1">
                  이메일로 인증 코드를 받습니다
                </p>
              </div>
            </div>
            <Alert>
              <AlertDescription>
                이메일 인증은 준비 중입니다
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
