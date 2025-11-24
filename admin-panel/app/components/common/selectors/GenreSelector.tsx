// components/common/selectors/GenreSelector.tsx
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Control } from "react-hook-form";

interface GenreSelectorProps {
  control: Control<any>;
  name: string;
  label?: string;
  placeholder?: string;
}

export function GenreSelector({ control, name, label = "장르", placeholder = "장르 선택" }: GenreSelectorProps) {
  const genres = [
    "액션", "드라마", "애니메이션", "코미디", "스릴러", "에로", "범죄", 
    "멜로/로맨스", "미스터리", "공포(호러)", "판타지", "어드벤처", "가족", 
    "SF", "전쟁", "다큐멘터리", "사극", "공연", "뮤지컬", "기타"
  ];

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <Select 
            onValueChange={field.onChange} 
            defaultValue={field.value || undefined}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {genres.map(genre => (
                <SelectItem key={genre} value={genre}>{genre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
