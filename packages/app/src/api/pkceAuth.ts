/**
 * 生成 PKCE code_verifier + code_challenge。
 *
 * code_verifier: 43 字符 URL-safe 随机字符串。
 * code_challenge: SHA-256(code_verifier) 的 base64url 编码。
 */
export async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  // 32 字节随机 → base64url → 43 字符
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  let binary = "";
  for (let i = 0; i < random.length; i++) {
    binary += String.fromCharCode(random[i]);
  }
  const codeVerifier = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
    .slice(0, 43);

  // SHA-256 → base64url
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(codeVerifier));
  const codeChallenge = base64url(hash);

  return { codeVerifier, codeChallenge };
}

/** base64url 编码（URL-safe，无 padding）。 */
function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
