export type Platform = 'ANDROID' | 'WINDOWS' | 'LINUX' | 'MACOS';

export interface PublisherRef {
  id: number;
  email: string;
  displayName: string;
}

export interface Software {
  id: number;
  name: string;
  version: string;
  description: string;
  platform: Platform;
  platformLabel: string;
  fileName: string;
  fileSize: number;
  fileSizeFormatted: string;
  sha256: string;
  downloadCount: number;
  publisher: PublisherRef;
  uploaderIp: string;
  publishedAt: string;
  hasIcon: boolean;
}

export interface Publisher {
  id: number;
  email: string;
  displayName: string;
  softwareCount: number;
  firstPublishedAt: string | null;
  joinedAt: string | null;
}

export interface Stats {
  totalSoftware: number;
  totalDownloads: number;
  totalPublishers: number;
  byPlatform: Record<string, number>;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AuthResult {
  token: string;
  email: string;
  displayName: string;
  role?: string;
  isAdmin?: boolean;
  needEmailSetup?: boolean;
  adminEmail?: string | null;
}

export interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  hasPassword: boolean;
  createdAt: string | null;
}

export interface MeResult {
  email: string;
  displayName: string;
}
