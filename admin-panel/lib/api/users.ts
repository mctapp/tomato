// lib/api/users.ts
import { api } from '@/lib/api';
import { Role } from '@/types/auth';

export interface User {
  id: number;
  email: string;
  username: string;
  fullName: string | null;
  isActive: boolean;
  isAdmin: boolean;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
  fullName?: string;
  role: Role;
  isActive?: boolean;
}

export interface UpdateUserData {
  email?: string;
  username?: string;
  fullName?: string;
  role?: Role;
  isActive?: boolean;
  password?: string;
}

/**
 * 사용자 목록 조회
 */
export async function getUsers(): Promise<User[]> {
  const response = await api.get<User[]>('/admin/api/users');
  return response.data;
}

/**
 * 특정 사용자 조회
 */
export async function getUser(userId: number): Promise<User> {
  const response = await api.get<User>(`/admin/api/users/${userId}`);
  return response.data;
}

/**
 * 사용자 생성
 */
export async function createUser(userData: CreateUserData): Promise<User> {
  const response = await api.post<User>('/admin/api/users', userData);
  return response.data;
}

/**
 * 사용자 수정
 */
export async function updateUser(userId: number, userData: UpdateUserData): Promise<User> {
  const response = await api.put<User>(`/admin/api/users/${userId}`, userData);
  return response.data;
}

/**
 * 사용자 삭제
 */
export async function deleteUser(userId: number): Promise<void> {
  await api.delete(`/admin/api/users/${userId}`);
}
