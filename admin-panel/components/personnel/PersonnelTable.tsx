// components/personnel/PersonnelTable.tsx
import React from 'react';
import Link from 'next/link';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, User, Video, Image } from 'lucide-react';
import { PersonnelSummary, PersonnelType, isPersonnelSummary } from '@/types/personnel';
import { GENDER_DISPLAY, SIGN_LANGUAGE_DISPLAY } from '@/lib/constants/personnel';
import { getSkillLevelBadgeColor, getPersonnelPaths, safeArray, safeString } from '@/lib/utils/personnel';

interface PersonnelTableProps {
  type: PersonnelType;
  data: PersonnelSummary[];
  isLoading: boolean;
  onEdit: (item: PersonnelSummary) => void;
  onDelete: (item: PersonnelSummary) => void;
  onView: (item: PersonnelSummary) => void;
}

export function PersonnelTable({ 
  type, 
  data, 
  isLoading, 
  onEdit, 
  onDelete, 
  onView 
}: PersonnelTableProps) {
  const paths = getPersonnelPaths(type);

  if (isLoading) {
    return (
      <div className="w-full py-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 타입 안전한 데이터 검증
  const validData = data.filter(isPersonnelSummary);

  if (validData.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">검색 결과가 없습니다.</p>
      </div>
    );
  }

  const renderSpecialColumns = (item: PersonnelSummary) => {
    switch (type) {
      case 'voice-artist':
        return (
          <TableCell className="text-center">
            <Badge variant="outline" className="bg-blue-50">
              {item.audioSamplesCount ?? item.samplesCount ?? 0}
            </Badge>
          </TableCell>
        );
      
      case 'translator':
        const specialties = safeArray(item.specialties);
        return (
          <TableCell>
            <div className="flex flex-wrap gap-1">
              {specialties.map((specialty, index) => (
                <Badge key={index} variant="outline" className="bg-green-50">
                  {specialty}
                </Badge>
              ))}
              {specialties.length === 0 && (
                <span className="text-gray-500 text-sm">-</span>
              )}
            </div>
          </TableCell>
        );
      
      case 'sl-interpreter':
        const signLanguages = safeArray(item.signLanguages);
        const videoCount = item.videoSamplesCount ?? 0;
        const imageCount = item.imageSamplesCount ?? 0;
        
        return (
          <>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {signLanguages.slice(0, 2).map((langCode, index) => (
                  <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700">
                    {SIGN_LANGUAGE_DISPLAY[langCode] || langCode}
                  </Badge>
                ))}
                {signLanguages.length > 2 && (
                  <Badge variant="outline" className="bg-gray-50">
                    +{signLanguages.length - 2}
                  </Badge>
                )}
                {signLanguages.length === 0 && (
                  <span className="text-gray-500 text-sm">-</span>
                )}
              </div>
            </TableCell>
            <TableCell className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <Badge variant="outline" className="bg-purple-50">
                  <Video className="h-3 w-3 mr-1" />
                  {videoCount}
                </Badge>
                <Badge variant="outline" className="bg-green-50">
                  <Image className="h-3 w-3 mr-1" />
                  {imageCount}
                </Badge>
              </div>
            </TableCell>
          </>
        );
      
      default:
        return null;
    }
  };

  const getHeaders = () => {
    const baseHeaders = [
      { key: 'id', label: 'ID', width: 'w-[60px]' },
      { key: 'info', label: `${type === 'voice-artist' ? '성우' : type === 'translator' ? '번역가' : '수어통역사'} 정보`, width: 'w-[200px]' },
      { key: 'skillLevel', label: '스킬 레벨', width: 'w-[80px]' },
      { key: 'location', label: '지역', width: 'w-[120px]' }
    ];

    switch (type) {
      case 'voice-artist':
        return [
          ...baseHeaders,
          { key: 'contact', label: '연락처', width: '' },
          { key: 'samples', label: '샘플 수', width: 'w-[80px]' },
          { key: 'actions', label: '작업', width: 'w-[150px]' }
        ];
      
      case 'translator':
        return [
          ...baseHeaders,
          { key: 'specialties', label: '전문능력', width: 'w-[120px]' },
          { key: 'contact', label: '연락처', width: '' },
          { key: 'actions', label: '작업', width: 'w-[150px]' }
        ];
      
      case 'sl-interpreter':
        return [
          ...baseHeaders,
          { key: 'signLanguages', label: '사용수어', width: 'w-[150px]' },
          { key: 'contact', label: '연락처', width: '' },
          { key: 'samples', label: '샘플 수', width: 'w-[100px]' },
          { key: 'actions', label: '작업', width: 'w-[150px]' }
        ];
      
      default:
        return baseHeaders;
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            {getHeaders().map((header) => (
              <TableHead key={header.key} className={header.width}>
                {header.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {validData.map((item) => (
            <TableRow key={item.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">{item.id}</TableCell>
              
              <TableCell>
                <div className="flex items-center space-x-3">
                  {item.profileImage ? (
                    <img 
                      src={item.profileImage} 
                      alt={item.name} 
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center text-sm font-medium">
                      {item.name.slice(0, 2) || "??"}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-[#333333] hover:text-[#ff6246] hover:underline">
                      <Link href={paths.detail(item.id)}>{item.name}</Link>
                    </p>
                    {item.gender && (
                      <p className="text-xs text-gray-500">
                        {GENDER_DISPLAY[item.gender] || item.gender}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <Badge className={`${getSkillLevelBadgeColor(item.skillLevel)} border`}>
                  Lv.{item.skillLevel ?? '-'}
                </Badge>
              </TableCell>
              
              <TableCell>{safeString(item.location, '-')}</TableCell>
              
              {type === 'translator' && renderSpecialColumns(item)}
              {type === 'sl-interpreter' && renderSpecialColumns(item)}
              
              <TableCell>
                <div className="space-y-1">
                  {item.phone && <p className="text-sm">{item.phone}</p>}
                  {item.email && <p className="text-xs text-gray-500">{item.email}</p>}
                  {!item.phone && !item.email && <p className="text-sm">-</p>}
                </div>
              </TableCell>
              
              {type === 'voice-artist' && renderSpecialColumns(item)}
              {type === 'sl-interpreter' && renderSpecialColumns(item)}
              
              <TableCell>
                <div className="flex space-x-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 hover:bg-[#f5fbf5] hover:text-[#4da34c] hover:border-[#4da34c]"
                    onClick={() => onEdit(item)}
                    aria-label={`${item.name} 편집`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 hover:bg-[#fff5f3] hover:text-[#ff6246] hover:border-[#ff6246]"
                    onClick={() => onDelete(item)}
                    aria-label={`${item.name} 삭제`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => onView(item)}
                    aria-label={`${item.name} 상세보기`}
                  >
                    <User className="h-4 w-4" />
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
