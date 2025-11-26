// lib/api/users.ts
import { Role } from '@/types/auth';
import { apiClient } from '@/lib/utils/api-client';

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
  isActive: boolean;
  role: Role;
}

export interface UpdateUserData {
  email?: string;
  username?: string;
  password?: string;
  fullName?: string;
  isActive?: boolean;
  role?: Role;
}

/**
 * Get all users
 */
export async function getUsers(): Promise<User[]> {
  return apiClient.get<User[]>('/api/users');
}

/**
 * Get a single user by ID
 */
export async function getUser(id: number): Promise<User> {
  return apiClient.get<User>(`/api/users/${id}`);
}

/**
 * Create a new user
 */
export async function createUser(data: CreateUserData): Promise<User> {
  return apiClient.post<User>('/api/users', data);
}

/**
 * Update an existing user
 */
export async function updateUser(id: number, data: UpdateUserData): Promise<User> {
  return apiClient.put<User>(`/api/users/${id}`, data);
}

/**
 * Delete a user
 */
export async function deleteUser(id: number): Promise<void> {
  return apiClient.delete<void>(`/api/users/${id}`);
}
