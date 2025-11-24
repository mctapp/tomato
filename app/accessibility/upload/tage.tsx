'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import axios from 'axios'

const API_BASE = 'https://tomato.mct.kr'

export default function UploadAccessibilityPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [selectedMovieId, setSelectedMovieId] = useState('')
  const [accessType, setAccessType] = useState('')
  const [languageCode, setLanguageCode] = useState('')
  const [meta, setMeta] = useState({
    access_translator: '',
    access_superviser: '',
    access_narrator: '',
    access_director: '',
    access_company: '',
    access_created_at: '',
    access_memo: '',
  })

  const handleSubmit = async () => {
    if (!file) {
      alert('파일을 선택하세요.')
      return
    }
    if (!selectedMovieId || !accessType || !languageCode) {
      alert('영화, 접근성 유형, 언어를 선택하세요.')
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('movie_id', selectedMovieId)
      formData.append('access_type', accessType)
      formData.append('language_code', languageCode)

      Object.entries(meta).forEach(([key, value]) => {
        formData.append(key, value)
      })

      const res = await axios.post(`${API_BASE}/admin/accessibility/upload`, formData)

      if (res.status === 200) {
        alert('업로드 성공')
        router.push('/accessibility')
      } else {
        alert('업로드 실패')
      }
    } catch (err) {
      console.error(err)
      alert('오류 발생')
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-md space-y-6">
      <h1 className="text-2xl font-bold">접근성 파일 업로드</h1>

      <div>
        <Label htmlFor="movie">영화 ID</Label>
        <Input
          name="movie"
          value={selectedMovieId}
          onChange={(e) => setSelectedMovieId(e.target.value)}
          placeholder="예: 42"
        />
      </div>

      <div>
        <Label htmlFor="accessType">접근성 유형</Label>
        <Input
          name="accessType"
          value={accessType}
          onChange={(e) => setAccessType(e.target.value)}
          placeholder="예: cc, ad, sl"
        />
      </div>

      <div>
        <Label htmlFor="language">언어 코드</Label>
        <Input
          name="language"
          value={languageCode}
          onChange={(e) => setLanguageCode(e.target.value)}
          placeholder="예: ko, en"
        />
      </div>

      <div>
        <Label htmlFor="file">파일 선택</Label>
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>

      <div>
        <Label htmlFor="access_translator">작가</Label>
        <Input
          name="access_translator"
          value={meta.access_translator}
          onChange={(e) => setMeta({ ...meta, access_translator: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="access_superviser">감수</Label>
        <Input
          name="access_superviser"
          value={meta.access_superviser}
          onChange={(e) => setMeta({ ...meta, access_superviser: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="access_narrator">성우</Label>
        <Input
          name="access_narrator"
          value={meta.access_narrator}
          onChange={(e) => setMeta({ ...meta, access_narrator: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="access_director">연출</Label>
        <Input
          name="access_director"
          value={meta.access_director}
          onChange={(e) => setMeta({ ...meta, access_director: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="access_company">제작사</Label>
        <Input
          name="access_company"
          value={meta.access_company}
          onChange={(e) => setMeta({ ...meta, access_company: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="access_created_at">제작일 (YYMMDD)</Label>
        <Input
          name="access_created_at"
          value={meta.access_created_at}
          onChange={(e) => setMeta({ ...meta, access_created_at: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="access_memo">메모</Label>
        <Textarea
          name="access_memo"
          value={meta.access_memo}
          onChange={(e) => setMeta({ ...meta, access_memo: e.target.value })}
        />
      </div>

      <div className="pt-4">
        <Button onClick={handleSubmit}>업로드</Button>
      </div>
    </div>
  )
}
