import api from './api';
import { ENDPOINTS } from '../constants/api';

// ─── Types ─────────────────────────────────────────
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'LECTURER' | 'STUDENT_LEADER';
  departmentId?: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  userId: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'LECTURER' | 'STUDENT_LEADER';
  token: string;
}

// ─── Register ─────────────────────────────────────────────────────────────────
export const register = async (payload: RegisterPayload): Promise<AuthUser> => {
  const response = await api.post(ENDPOINTS.REGISTER, payload);
  return response.data;
};

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = async (payload: LoginPayload): Promise<AuthUser> => {
  const response = await api.post(ENDPOINTS.LOGIN, payload);
  return response.data;
};