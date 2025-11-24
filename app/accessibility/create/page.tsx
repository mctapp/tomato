'use client'

import { useState } from 'react'
import axios from 'axios'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

const API_BASE = 'https://tomato.mct.kr'

export default function CreateAccessFilePage() {
  const [form, setForm] = useState({
    movie_id: '',
    file: null as File | null,
    file_type: '',
    language_code: '',
    access_translator: '',
    access_superviser: '',
    access_narrator: '',
    access_director: '',
    access_company: '',
    access_created_at: '',
    access_memo: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    if (!form.movie_id || !form.file || !form.file_type || !form.language_code) {
      alert('필수 항목을 모두 입력해주세요.')
      return
    }

    const data = new FormData()
    data.append('movie_id', form.movie_id)
    data.append('file_type', form.file_type)
    data.append('language_code', form.language_code)
    data.append('file', form.file)
    data.append('access_translator', form.access_translator)
    data.append('access_superviser', form.access_superviser)
    data.append('access_narrator', form.access_narrator)
    data.append('access_director', form.access_director)
    data.append('access_company', form.access_company)
    data.append('access_created_at', form.access_created_at)
    data.append('access_memo', form.access_memo)

    try {
      await axios.post(`${API_BASE}/admin/api/moviefiles`, data)
      alert('업로드 완료')
    } catch (err) {
      alert('업로드 실패')
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h2 className="text-xl font-bold">접근성 파일 등록</h2>

      <div>
        <Label>영화 ID</Label>
        <Input name="movie_id" value={form.movie_id} onChange={handleChange} placeholder="예: 42" />
      </div>

      <div>
        <Label>파일 업로드</Label>
        <Input type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
      </div>

      <div>
        <Label>접근성 유형</Label>
        <Select onValueChange={(value) => setForm({ ...form, file_type: value })}>
          <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ad">음성해설 (ad)</SelectItem>
            <SelectItem value="cc">자막해설 (cc)</SelectItem>
            <SelectItem value="sl">수어해설 (sl)</SelectItem>
            <SelectItem value="intro_ad">영화소개(음성)</SelectItem>
            <SelectItem value="intro_cc">영화소개(자막)</SelectItem>
            <SelectItem value="intro_sl">영화소개(수어)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>언어 코드</Label>
        <Select onValueChange={(value) => setForm({ ...form, language_code: value })}>
          <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ko">한국어</SelectItem>
            <SelectItem value="en">영어</SelectItem>
            <SelectItem value="vi">베트남어</SelectItem>
            <SelectItem value="tl">타갈로그어</SelectItem>
            <SelectItem value="zh">중국어</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>작가</Label><Input name="access_translator" value={form.access_translator} onChange={handleChange} /></div>
        <div><Label>감수</Label><Input name="access_superviser" value={form.access_superviser} onChange={handleChange} /></div>
        <div><Label>성우</Label><Input name="access_narrator" value={form.access_narrator} onChange={handleChange} /></div>
        <div><Label>연출</Label><Input name="access_director" value={form.access_director} onChange={handleChange} /></div>
        <div><Label>제작사</Label><Input name="access_company" value={form.access_company} onChange={handleChange} /></div>
        <div><Label>제작일 (YYMMDD)</Label><Input name="access_created_at" value={form.access_created_at} onChange={handleChange} /></div>
        <div className="md:col-span-2"><Label>메모</Label><Textarea name="access_memo" value={form.access_memo} onChange={handleChange} /></div>
      </div>

      <Button className="mt-4" onClick={handleSubmit}>저장하기</Button>
    </div>
  )
}
