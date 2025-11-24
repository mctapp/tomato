// components/accessmedia/CreditItem.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  GripVertical, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  User,
  Mic,
  BookOpen,
  Users
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  AccessAssetCredit, 
  getPersonDisplayName, 
  getPersonTypeLabel 
} from '@/types/accessAssetCredit';

interface CreditItemProps {
  credit: AccessAssetCredit;
  onUpdate: (creditId: number, data: { role: string; memo?: string }) => void;
  onDelete: (creditId: number) => void;
  isDragging?: boolean;
}

export function CreditItem({ credit, onUpdate, onDelete, isDragging }: CreditItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    role: credit.role,
    memo: credit.memo || ''
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: credit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    onUpdate(credit.id, editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      role: credit.role,
      memo: credit.memo || ''
    });
    setIsEditing(false);
  };

  const getPersonIcon = () => {
    switch (credit.personType) {
      case 'scriptwriter':
        return BookOpen;
      case 'voice_artist':
        return Mic;
      case 'sl_interpreter':
        return Users;
      case 'staff':
        return User;
      default:
        return User;
    }
  };

  const getPersonAvatar = () => {
    let profileImage: string | null = null;
    let initial = '?';

    switch (credit.personType) {
      case 'scriptwriter':
        profileImage = credit.scriptwriter?.profileImage || null;
        initial = credit.scriptwriter?.name?.[0] || '작';
        break;
      case 'voice_artist':
        profileImage = credit.voiceArtist?.profileImage || null;
        initial = credit.voiceArtist?.voiceartistName?.[0] || '성';
        break;
      case 'sl_interpreter':
        profileImage = credit.slInterpreter?.profileImage || null;
        initial = credit.slInterpreter?.name?.[0] || '수';
        break;
      case 'staff':
        profileImage = credit.staff?.profileImage || null;
        initial = credit.staff?.name?.[0] || '스';
        break;
    }

    return { profileImage, initial };
  };

  const PersonIcon = getPersonIcon();
  const { profileImage, initial } = getPersonAvatar();
  const displayName = getPersonDisplayName(credit);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg p-4 ${isDragging ? 'shadow-lg' : 'shadow-sm'}`}
    >
      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profileImage || undefined} />
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{displayName}</p>
                <Badge variant="outline" className="text-xs">
                  {getPersonTypeLabel(credit.personType)}
                </Badge>
              </div>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">역할</label>
            <Input
              value={editData.role}
              onChange={(e) => setEditData({ ...editData, role: e.target.value })}
              placeholder="예: 음성해설 작가, 내레이터"
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">메모</label>
            <Textarea
              value={editData.memo}
              onChange={(e) => setEditData({ ...editData, memo: e.target.value })}
              placeholder="추가 정보나 특이사항을 입력하세요"
              className="mt-1 resize-none"
              rows={2}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              취소
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              저장
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div {...attributes} {...listeners} className="mt-1 cursor-grab">
              <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </div>
            
            <Avatar className="h-10 w-10">
              <AvatarImage src={profileImage || undefined} />
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <PersonIcon className="h-4 w-4 text-gray-500" />
                <p className="font-medium">{displayName}</p>
                <Badge variant="outline" className="text-xs">
                  {getPersonTypeLabel(credit.personType)}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600">{credit.role}</p>
              
              {credit.memo && (
                <p className="text-sm text-gray-500 mt-1 italic">
                  메모: {credit.memo}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1 ml-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(credit.id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
