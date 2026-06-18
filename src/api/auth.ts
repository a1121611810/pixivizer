import { apiClient } from './client';
import type { PixivAuthResponse } from './types';

const CLIENT_ID = 'KzEZED7aC0vNo8LzDAUFJ2NfyC1rDzVQdFYbRgDc';
const CLIENT_SECRET = 'WJfLb1PAsLCbIUcNbK2zFkD4hC8rG6oX3mZ5sA7t9R';

export async function loginWithPassword(
  username: string,
  password: string,
): Promise<PixivAuthResponse> {
  return apiClient.post<PixivAuthResponse>('/auth/token', {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'password',
    username,
    password,
  });
}

export async function refreshToken(
  refreshToken: string,
): Promise<PixivAuthResponse> {
  return apiClient.post<PixivAuthResponse>('/auth/token', {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
}
