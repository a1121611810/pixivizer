import { PixivClient } from "@book000/pixivts";

let client: PixivClient | null = null;
let currentRefreshToken: string | null = null;

/** 获取当前 PixivClient 实例（未初始化时返回 null） */
export function getClient(): PixivClient | null {
  return client;
}

/** 使用 refresh_token 初始化 PixivClient */
export async function initClient(refreshToken: string): Promise<PixivClient> {
  client = await PixivClient.of(refreshToken);
  currentRefreshToken = refreshToken;
  return client;
}

/** 获取当前使用的 refresh_token */
export function getRefreshToken(): string | null {
  return currentRefreshToken;
}

/** 销毁当前 client */
export function destroyClient() {
  client = null;
  currentRefreshToken = null;
}
