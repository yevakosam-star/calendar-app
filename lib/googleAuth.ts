import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useMemo } from 'react';

WebBrowser.maybeCompleteAuthSession();

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export const GOOGLE_AUTH_CONFIGURED = CLIENT_ID.length > 0;

const SCOPES = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar.readonly'];

export function useGoogleAuthRequest() {
  const redirectUri = useMemo(() => AuthSession.makeRedirectUri(), []);
  return AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
    },
    discovery
  );
}

export type GoogleAuthResult = {
  accessToken: string;
  expiresAt: number;
};

export function extractAuthResult(response: AuthSession.AuthSessionResult | null): GoogleAuthResult | null {
  if (!response || response.type !== 'success') return null;
  const accessToken = response.params.access_token;
  if (!accessToken) return null;
  const expiresIn = response.params.expires_in ? parseInt(response.params.expires_in, 10) : 3600;
  return { accessToken, expiresAt: Date.now() + expiresIn * 1000 };
}
