// types/auth.ts
export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  EDITOR = "EDITOR",
  USER = "USER"
}

export interface UserData {
  id: number;
  email: string;
  username: string;
  fullName: string | null;
  isActive: boolean;
  isAdmin: boolean;
  role: Role;
  mfaEnabled?: boolean;  // 추가
  mfaType?: 'NONE' | 'TOTP' | 'SMS' | 'EMAIL';  // 추가
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// MFA 관련 타입 추가
export interface MFALoginResponse {
  requires_mfa: boolean;
  mfa_token?: string;
  mfa_type?: 'NONE' | 'TOTP' | 'SMS' | 'EMAIL';
  message: string;
  user?: UserData;
}

export interface MFASetupRequest {
  mfa_type: 'TOTP' | 'SMS' | 'EMAIL';
  phone_number?: string;
}

export interface MFASetupResponse {
  mfa_type: 'TOTP' | 'SMS' | 'EMAIL';
  qr_code?: string;
  secret?: string;
  backup_codes: string[];
  message: string;
}

export interface MFAVerifyRequest {
  code: string;
  mfa_token?: string;
}

export interface MFAStatusResponse {
  mfa_enabled: boolean;
  mfa_type: 'NONE' | 'TOTP' | 'SMS' | 'EMAIL';
  backup_codes_count: number;
}
