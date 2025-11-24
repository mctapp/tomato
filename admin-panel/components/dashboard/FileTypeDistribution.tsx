import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatBytes, formatExtension } from '@/lib/utils/format';

interface FileTypeProps {
  fileTypes: {
    [extension: string]: {
      count: number;
      size: number;
    }
  };
}

export function FileTypeDistribution({ fileTypes }: FileTypeProps) {
  // 파일 타입별 통계 데이터 가공
  const data = Object.entries(fileTypes)
    .map(([ext, stats]) => ({
      name: formatExtension(ext),
      files: stats.count,
      size: stats.size
    }))
    .sort((a, b) => b.files - a.files) // 파일 수 기준 내림차순 정렬
    .slice(0, 8); // 상위 8개만 표시

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-2 border rounded shadow-md">
          <p className="text-sm font-medium">{`${label}`}</p>
          <p className="text-sm">{`파일 수: ${payload[0].value}개`}</p>
          <p className="text-sm">{`크기: ${formatBytes(payload[1].value)}`}</p>
        </div>
      );
    }
    return null;
  };

  // Y축 값 포맷팅
  const formatYAxisSize = (value: number) => {
    return formatBytes(value, 1); // 소수점 1자리까지만 표시
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis 
            yAxisId="left" 
            orientation="left" 
            stroke="#8884d8"
            style={{ fontSize: '0.7rem' }} // 왼쪽 Y축 폰트 크기 감소
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="#82ca9d" 
            tickFormatter={formatYAxisSize}  // 크기 값 포맷팅
            style={{ fontSize: '0.7rem' }} // 오른쪽 Y축 폰트 크기 감소
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar yAxisId="left" dataKey="files" fill="#8884d8" name="파일 수" />
          <Bar yAxisId="right" dataKey="size" fill="#82ca9d" name="크기(바이트)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
