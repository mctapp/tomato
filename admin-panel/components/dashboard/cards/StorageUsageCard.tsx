// /components/dashboard/cards/StorageUsageCard.tsx
import { BaseCard } from './BaseCard';
import { StorageUsageCard as OriginalStorageUsageCard } from "@/components/dashboard/StorageUsageCard";

const StorageUsageCard = () => {
  const renderContent = () => (
    <div className="pt-0">
      <style jsx global>{`
        /* 텍스트 크기 축소 - 60%로 줄임 */
        .storage-usage-card .text-label {
          font-size: 0.65rem !important;
        }
        
        /* 원형 차트 위쪽 여백 축소 */
        .storage-usage-card .pie-chart-container {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }

        /* 차트 색상 - 공개 파일(녹색), 비공개 파일(빨간색) */
        .storage-usage-card .recharts-pie-sector:nth-child(1) path {
          fill: #4ade80 !important;
        }

        .storage-usage-card .recharts-pie-sector:nth-child(2) path {
          fill: #f87171 !important;
        }

        /* 라벨 색상도 차트와 일치 */
        .storage-usage-card .public-files-label {
          color: #4ade80 !important;
        }

        .storage-usage-card .private-files-label {
          color: #f87171 !important;
        }
        
        /* "마지막 갱신:" 텍스트 완전히 제거 */
        .storage-usage-card .update-time {
          display: none !important;
        }
        
        /* 통계 갱신 버튼 스타일 수정 */
        .storage-usage-card button.flex.items-center {
          border: none !important;
          padding: 0 !important;
          height: auto !important;
          min-height: auto !important;
          background: transparent !important;
          box-shadow: none !important;
          margin-right: 4px !important;
        }
        
        /* 스피너 색상 변경 */
        .storage-usage-card button.flex.items-center svg {
          color: #888 !important;
        }
        
        /* 푸터 스타일 조정 - 가운데 정렬 */
        .storage-usage-card .card-footer,
        .storage-usage-card div:has(> button.flex.items-center) {
          padding-top: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
        }
        
        /* 날짜 시간과 스피너 정렬 */
        .storage-usage-card p.text-xs.text-muted-foreground {
          margin-left: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
        }
        
        /* 짙은 회색 사용 */
        .storage-usage-card .text-black {
          color: #555555 !important;
        }
      `}</style>
      
      <div className="storage-usage-card">
        <OriginalStorageUsageCard />
      </div>
    </div>
  );
  
  return (
    <BaseCard
      id="storage-usage"
      title="S3 스토리지 사용 현황"
      description="S3 스토리지 사용 현황을 확인하세요"
      type="storage"
    >
      {renderContent()}
    </BaseCard>
  );
};

export default StorageUsageCard;
