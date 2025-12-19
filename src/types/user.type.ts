export interface User {
  name: string;
  email: string;
  password?: string;
  mobile?: string;
  age?: string;
  profile?: {
    bio?: string;
    address?: string;
    avatarUrl?: string;
  };
  devices?: Array<{
    deviceId: string;
    type?: string;
    category?: "mobile" | "laptop" | "other";
    platform?: string;
    userAgent?: string;
    ip?: string;
    name?: string;
    lastSeen?: string | Date;
    createdAt?: string | Date;
  }>
  isActive?: boolean;
  payment?: {
    type?: string;
    startDate?: string | Date;
    durationDays?: number;
    expiresAt?: string | Date;
  };
}
