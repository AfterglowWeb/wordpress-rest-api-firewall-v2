export type AuthSettings = {
	auth_enforce: boolean;
	auth_methods: 'wp_auth' | 'jwt';
	auth_jwt_algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256';
	auth_jwt_public_key: string;
	auth_jwt_audience: string;
	auth_jwt_issuer: string;
	auth_user_ids: number;
};