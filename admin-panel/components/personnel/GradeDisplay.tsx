// components/personnel/GradeDisplay.tsx
import React from 'react';
import { Star } from 'lucide-react';

interface GradeDisplayProps {
  skillGrade: number | null | undefined;
  maxGrade?: number;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function GradeDisplay({ 
  skillGrade, 
  maxGrade = 9, 
  size = 'md',
  showText = true,
  className = ''
}: GradeDisplayProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };
  
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // 타입 안전한 등급 처리
  const safeGrade = typeof skillGrade === 'number' && skillGrade > 0 ? skillGrade : 0;
  const safeMaxGrade = maxGrade > 0 ? maxGrade : 9;

  // 등급이 최대값을 초과하지 않도록 제한
  const grade = Math.min(safeGrade, safeMaxGrade);

  return (
    <div className={`flex items-center ${className}`}>
      {Array.from({ length: safeMaxGrade }).map((_, i) => (
        <Star
          key={i}
          className={`${sizeClasses[size]} ${
            i < grade ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
          aria-hidden="true"
        />
      ))}
      {showText && (
        <span className={`ml-2 font-medium ${textSizeClasses[size]}`}>
          {grade}/{safeMaxGrade}
        </span>
      )}
    </div>
  );
}

// 타입 가드 함수
export const isValidGrade = (grade: unknown): grade is number => {
  return typeof grade === 'number' && grade >= 0 && grade <= 9;
};
