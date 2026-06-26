export type JwtAlgorithm =
  | 'RS256' | 'RS384' | 'RS512'
  | 'HS256' | 'HS384' | 'HS512'
  | 'ES256';

export type AuthMethod = 'wp_auth' | 'jwt';

export type UserStatus = 'active' | 'revoked' | 'expiring';

export interface AuthorizedUser {
  id: number;
  display_name: string;
  email: string;
  roles: string[];
  current_user: boolean;
  admin_url: string;
  jwt_claim_sub?: string;
  status: UserStatus;
  expires_at?: string;   // ISO 8601, undefined = pas d'expiration
}

export interface AuthSettings {
  auth_enforce: boolean;
  auth_methods: AuthMethod;
  auth_jwt_algorithm: JwtAlgorithm;
  auth_jwt_public_key: string;
  auth_jwt_audience: string;
  auth_jwt_issuer: string;
  auth_users: AuthorizedUser[];
}