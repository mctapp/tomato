// components/accessmedia/AccessControl.tsx
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, User, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// 접근 요청 인터페이스 정의
interface AccessRequest {
  id: number;
  userId: number;
  userName: string;
  status: string;
  requestedAt: string;
}

interface AccessControlProps {
  assetId: number;
  isLocked: boolean;
}

export function AccessControl({ assetId, isLocked }: AccessControlProps) {
  // 타입을 명시적으로 지정
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 접근 상태에 따른 스위치 설정
  const [lockState, setLockState] = useState(isLocked);
  
  useEffect(() => {
    // 실제 요청 데이터를 보여주기 위한 임시 데이터
    const dummyRequests: AccessRequest[] = [
      { id: 1, userId: 102, userName: '김영희', status: 'approved', requestedAt: '2025-05-10T09:30:00Z' },
      { id: 2, userId: 103, userName: '이철수', status: 'pending', requestedAt: '2025-05-11T14:22:00Z' },
      { id: 3, userId: 104, userName: '박지민', status: 'rejected', requestedAt: '2025-05-11T16:45:00Z' }
    ];
    
    setAccessRequests(dummyRequests);
    setIsLoading(false);
  }, [assetId]);
  
  // 잠금 토글 핸들러
  const handleLockToggle = async (newState: boolean) => {
    try {
      setLockState(newState);
      // 실제 API 호출은 생략 (데모 목적)
      console.log(`자산 ${assetId}의 잠금 상태를 ${newState ? '잠김' : '열림'}으로 변경`);
    } catch (error) {
      console.error('잠금 상태 변경 오류:', error);
      // 오류 시 원래 상태로 복원
      setLockState(isLocked);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* 잠금 상태 설정 */}
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-gray-500 mr-2" />
            <span className="font-medium">잠금 상태</span>
          </div>
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={lockState}
                onChange={() => handleLockToggle(!lockState)}
              />
              <div className={`w-11 h-6 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 
                ${lockState 
                  ? 'bg-red-100 after:translate-x-full after:border-white' 
                  : 'bg-gray-200'
                } after:content-[''] after:absolute after:top-0.5 after:left-[2px] 
                after:bg-white after:border-gray-300 after:border after:rounded-full 
                after:h-5 after:w-5 after:transition-all`}
              ></div>
              <span className="ml-3 text-sm font-medium">
                {lockState ? '잠김' : '열림'}
              </span>
            </label>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            {lockState 
              ? '이 자산은 현재 잠겨 있으며, 승인된 접근 요청이 있는 사용자만 접근할 수 있습니다.' 
              : '이 자산은 현재 잠금이 해제되어 있으며, 모든 인증된 사용자가 접근할 수 있습니다.'}
          </p>
        </div>
      </div>
      
      {/* 접근 요청 목록 */}
      {lockState && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-2 font-medium text-gray-700 border-b flex items-center">
            <User className="h-4 w-4 mr-2" />
            <span>접근 요청 목록</span>
          </div>
          
          {isLoading ? (
            <div className="p-4">
              <Skeleton className="h-10 w-full mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : accessRequests.length > 0 ? (
            <div className="divide-y max-h-[200px] overflow-y-auto">
              {accessRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                  <div>
                    <p className="font-medium">{request.userName}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(request.requestedAt), 'PPP p', { locale: ko })}
                    </p>
                  </div>
                  <div>
                    {request.status === 'approved' ? (
                      <Badge className="bg-green-100 text-green-800">승인됨</Badge>
                    ) : request.status === 'rejected' ? (
                      <Badge className="bg-red-100 text-red-800">거부됨</Badge>
                    ) : (
                      <div className="flex space-x-1">
                        <Button size="sm" variant="outline" className="h-8 px-2 bg-green-50 hover:bg-green-100 border-green-200">
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 px-2 bg-red-50 hover:bg-red-100 border-red-200">
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              접근 요청이 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
