import type { ID, Status } from '@/types/utilityTypes';
import type { User } from '@/types/userTypes';

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  recoveryPhrase?: string;
  error?: string;
}

export interface LoginResponse {
  token: string;
  user: {
    _id: ID;
    username: string;
    display_name: string;
    avatar?: string;
    status: Status;
  };
}
