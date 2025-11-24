// /components/dashboard/cards/FileTypeCard.tsx
import { BaseCard } from './BaseCard';
import { FileTypeDistributionCard } from "@/components/dashboard/FileTypeDistributionCard";

const FileTypeCard = () => {
  const renderContent = () => (
    <div className="pt-0">
      <style jsx global>{`
        /* 막대 그래프 여백 조정 - 좌우 여백 제거하고 가로 폭을 100%로 확장 */
        .file-type-distribution-card .recharts-wrapper {
          width: 100% !important;
          margin: 0 auto !important;
        }
        
        .file-type-distribution-card .recharts-responsive-container {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }

        /* 차트 컨테이너 폭 확장 */
        .file-type-distribution-card .chart-container {
          width: 100% !important;
          max-width: 100% !important;
          padding: 0 !important;
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
        
        /* 막대 그래프 자체의 폭 확장 */
        .file-type-distribution-card .recharts-wrapper {
          min-width: 100% !important;
        }
        
        .file-type-distribution-card .recharts-surface {
          width: 100% !important;
          max-width: none !important;
        }
        
        /* 차트가 부모 요소에 맞게 확장되도록 설정 */
        .file-type-distribution-card svg {
          width: 100% !important;
        }
        
        /* 막대 차트 자체 확장 */
        .file-type-distribution-card .recharts-bar {
          width: 100% !important;
        }
        
        /* 막대 그래프 바 너비 확장 */
        .file-type-distribution-card .recharts-bar-rectangles {
          width: 100% !important;
        }
        
        /* X축과 그리드 확장 */
        .file-type-distribution-card .recharts-x-axis,
        .file-type-distribution-card .recharts-cartesian-grid {
          width: 100% !important;
        }
        
        /* 모든 차트 레이어 확장 */
        .file-type-distribution-card .recharts-layer {
          width: 100% !important;
        }

        /* 차트 색상 통일 - 첫 두 색상은 토마토와 세이지로 고정 */
        .file-type-distribution-card .recharts-bar-rectangle:nth-child(1) path {
          fill: #ff6246 !important;
        }
        
        .file-type-distribution-card .recharts-bar-rectangle:nth-child(2) path {
          fill: #4da34c !important;
        }

        .file-type-distribution-card .recharts-bar-rectangle:nth-child(3) path {
          fill: #ff7e66 !important;
        }

        .file-type-distribution-card .recharts-bar-rectangle:nth-child(4) path {
          fill: #ff9a86 !important;
        }

        .file-type-distribution-card .recharts-bar-rectangle:nth-child(5) path {
          fill: #ff8c42 !important;
        }
        
        .file-type-distribution-card .recharts-bar-rectangle:nth-child(6) path {
          fill: #f9c784 !important;
        }
        
        /* "마지막 갱신:" 텍스트 완전 제거 */
        .file-type-distribution-card .update-time {
          display: none !important;
        }
        
        /* 통계 갱신 버튼 스타일 수정 - 테두리 제거 및 크기 축소 */
        .file-type-distribution-card button.flex.items-center {
          border: none !important;
          padding: 0 !important;
          height: auto !important;
          min-height: auto !important;
          background: transparent !important;
          box-shadow: none !important;
          margin-right: 4px !important;
        }
        
        /* 스피너 색상 변경 */
        .file-type-distribution-card button.flex.items-center svg {
          color: #888 !important;
        }
        
        /* 푸터 스타일 조정 - 가운데 정렬 */
        .file-type-distribution-card .card-footer,
        .file-type-distribution-card div:has(> button.flex.items-center) {
          padding-top: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
        }
        
        /* 날짜 시간과 스피너 정렬 */
        .file-type-distribution-card p.text-xs.text-muted-foreground {
          margin-left: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
        }
        
        /* 짙은 회색 사용 */
        .file-type-distribution-card .text-black {
          color: #555555 !important;
        }
      `}</style>
      
      <div className="file-type-distribution-card">
        <FileTypeDistributionCard />
      </div>
    </div>
  );
  
  return (
    <BaseCard
      id="file-types"
      title="S3 스토리지 파일 분포 현황"
      description="S3 스토리지 파일 분포 현황을 확인하세요"
      type="storage"
    >
      {renderContent()}
    </BaseCard>
  );
};

export default FileTypeCard;
