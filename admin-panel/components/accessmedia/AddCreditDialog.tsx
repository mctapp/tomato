
// components/accessmedia/AddCreditDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Search, User, Mic, HandMetal, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  getAvailablePersonTypes, 
  PersonOption,
  AccessAssetCreditCreate
} from '@/types/accessAssetCredit';
import { useScriptwriters } from '@/hooks/useScriptwriters';
import { useVoiceArtists } from '@/hooks/useVoiceArtists';
import { useSLInterpreters } from '@/hooks/useSLInterpreters';
import { useStaffs } from '@/hooks/useStaffs';

interface AddCreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType: string;
  existingCredits: any[];
  onAdd: (credit: AccessAssetCreditCreate) => void;
}

const personTypeIcons = {
  scriptwriter: User,
  voice_artist: Mic,
  sl_interpreter: HandMetal,
  staff: Briefcase,
};

export function AddCreditDialog({
  open,
  onOpenChange,
  mediaType,
  existingCredits,
  onAdd
}: AddCreditDialogProps) {
  const availableTypes = getAvailablePersonTypes(mediaType);
  
  const [selectedType, setSelectedType] = useState<string>(availableTypes[0]?.type || '');
  const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null);
  const [memo, setMemo] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [nextSequenceNumber, setNextSequenceNumber] = useState(1);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: scriptwritersData, isLoading: isLoadingScriptwriters } = useScriptwriters({
    keyword: debouncedSearchTerm,
    specialties: selectedType === 'scriptwriter' ? 
      (availableTypes.find(t => t.type === 'scriptwriter')?.specialty || '') : ''
  });
  
  const { data: voiceArtistsData, isLoading: isLoadingVoiceArtists } = useVoiceArtists({
    keyword: debouncedSearchTerm
  });
  
  const { data: slInterpretersData, isLoading: isLoadingSlInterpreters } = useSLInterpreters({
    keyword: debouncedSearchTerm
  });
  
  const { data: staffsData, isLoading: isLoadingStaffs } = useStaffs({
    keyword: debouncedSearchTerm
  });

  useEffect(() => {
    if (open && availableTypes.length > 0) {
      setSelectedType(availableTypes[0].type);
      setSelectedPerson(null);
      setMemo('');
      setIsPrimary(true);
      setSearchTerm('');
    }
  }, [open]);

  useEffect(() => {
    setNextSequenceNumber(existingCredits.length + 1);
  }, [existingCredits]);

  const getAutomaticRole = (person: PersonOption): string => {
    switch (person.type) {
      case 'scriptwriter':
        const specialty = availableTypes.find(t => t.type === 'scriptwriter')?.specialty;
        return specialty === 'AD' ? '음성해설작가' : '자막해설작가';
      case 'voice_artist':
        return '성우';
      case 'sl_interpreter':
        return '수어통역사';
      case 'staff':
        if (person.roles && person.roles.length > 0) {
          const roleMap: Record<string, string> = {
            'producer': '프로듀서',
            'director': '연출',
            'supervisor': '감수',
            'monitor_general': '모니터(일반)',
            'monitor_visual': '모니터(시각)',
            'monitor_hearing': '모니터(청각)',
            'pr': '홍보',
            'marketing': '마케팅',
            'design': '디자인',
            'accounting': '회계',
            'other': '기타'
          };
          return roleMap[person.roles[0]] || person.roles[0];
        }
        return '스태프';
      default:
        return '';
    }
  };

  const getPeople = (): PersonOption[] => {
    let people: PersonOption[] = [];

    switch (selectedType) {
      case 'scriptwriter':
        if (scriptwritersData) {
          const specialty = availableTypes.find(t => t.type === 'scriptwriter')?.specialty;
          people = scriptwritersData.data
            .filter(s => {
              if (specialty === 'AD') {
                return s.specialties?.includes('AD');
              } else if (specialty === 'CC') {
                return s.specialties?.includes('CC');
              }
              return true;
            })
            .map(s => ({
              id: s.id,
              name: s.name,
              profileImage: s.profileImage,
              type: 'scriptwriter' as const,
              specialty: s.specialties?.join(', '),
              level: s.skillLevel
            }));
        }
        break;
      case 'voice_artist':
        if (voiceArtistsData) {
          people = voiceArtistsData.data.map(v => ({
            id: v.id,
            name: v.voiceartistName,
            profileImage: v.profileImage,
            type: 'voice_artist' as const,
            level: v.voiceartistLevel
          }));
        }
        break;
      case 'sl_interpreter':
        if (slInterpretersData) {
          people = slInterpretersData.data.map(s => ({
            id: s.id,
            name: s.name,
            profileImage: s.profileImage,
            type: 'sl_interpreter' as const,
            level: s.skillLevel
          }));
        }
        break;
      case 'staff':
        if (staffsData) {
          people = staffsData.data.map(s => ({
            id: s.id,
            name: s.name,
            profileImage: s.profileImage,
            type: 'staff' as const,
            roles: s.roles
          }));
        }
        break;
    }

    const existingIdsForType = existingCredits
      .filter(credit => credit.personType === selectedType)
      .map(credit => credit.personId);
    
    return people.filter(p => !existingIdsForType.includes(p.id));
  };

  const isLoading = (selectedType === 'scriptwriter' && isLoadingScriptwriters) ||
                   (selectedType === 'voice_artist' && isLoadingVoiceArtists) ||
                   (selectedType === 'sl_interpreter' && isLoadingSlInterpreters) ||
                   (selectedType === 'staff' && isLoadingStaffs);

  const handleAdd = () => {
    if (!selectedPerson) return;

    const role = getAutomaticRole(selectedPerson);

    const creditData: AccessAssetCreditCreate = {
      personType: selectedPerson.type,
      personId: selectedPerson.id,
      role,
      sequenceNumber: nextSequenceNumber,
      memo: memo.trim() || undefined,
      isPrimary: isPrimary
    };

    onAdd(creditData);
    onOpenChange(false);
  };

  const people = getPeople();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>크레디트 추가</DialogTitle>
          <DialogDescription>
            접근성 미디어 자산에 참여한 인원을 추가합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-3 block">인원 유형</Label>
            <div className="grid grid-cols-2 gap-3">
              {availableTypes.map((type) => {
                const Icon = personTypeIcons[type.type as keyof typeof personTypeIcons] || User;
                return (
                  <button
                    key={type.type}
                    onClick={() => setSelectedType(type.type)}
                    className={cn(
                      "flex items-center justify-start p-4 rounded-lg border-2 transition-all",
                      "hover:border-[#ff6246]/50 hover:bg-[#ff6246]/5",
                      selectedType === type.type 
                        ? "border-[#ff6246] bg-[#ff6246]/10 shadow-sm" 
                        : "border-gray-200 bg-white"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center mr-3",
                      selectedType === type.type 
                        ? "bg-[#ff6246] text-white" 
                        : "bg-gray-100 text-gray-600"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium flex items-center">
                        {type.label}
                        {type.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                      {type.specialty && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {type.specialty === 'AD' ? '음성해설 전문' : '자막해설 전문'}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>인원 검색</Label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="이름으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label>인원 선택</Label>
            <ScrollArea className="h-[300px] mt-2 border rounded-md">
              {isLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : people.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {searchTerm ? '검색 결과가 없습니다' : '등록된 인원이 없습니다'}
                </div>
              ) : (
                <div className="p-2 space-y-2 overflow-y-auto max-h-[280px]">
                  {people.map((person) => (
                    <div
                      key={`${person.type}-${person.id}`}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedPerson?.id === person.id 
                          ? "border-[#ff6246] bg-[#ff6246]/5" 
                          : "hover:bg-gray-50"
                      )}
                      onClick={() => setSelectedPerson(person)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={person.profileImage || undefined} />
                        <AvatarFallback>{person.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{person.name}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          {person.level && <span>레벨 {person.level}</span>}
                          {person.specialty && <Badge variant="outline" className="text-xs">{person.specialty}</Badge>}
                          {person.roles && <span>{person.roles.join(', ')}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {selectedPerson && (
            <div>
              <Label>역할</Label>
              <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                <p className="font-medium">{getAutomaticRole(selectedPerson)}</p>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPrimary"
              checked={isPrimary}
              onCheckedChange={(checked) => setIsPrimary(checked as boolean)}
            />
            <Label
              htmlFor="isPrimary"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              주작업자로 설정
            </Label>
          </div>

          <div>
            <Label htmlFor="memo">메모 (선택)</Label>
            <Textarea
              id="memo"
              placeholder="추가 정보나 특이사항을 입력하세요"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="mt-2 resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button 
            onClick={handleAdd} 
            disabled={!selectedPerson}
            className="bg-[#ff6246] hover:bg-[#c75146]"
          >
            추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
