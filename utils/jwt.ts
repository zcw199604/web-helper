/**
 * JWT 解码工具函数
 */

import { jwtDecode, JwtPayload } from 'jwt-decode';

/**
 * JWT 解码结果
 */
export interface JwtDecodeResult {
  header: Record<string, unknown>;
  payload: JwtPayload & Record<string, unknown>;
  signature: string;
  isExpired: boolean;
  expiresAt?: Date;
  issuedAt?: Date;
}

/**
 * 解码 JWT Token
 * @param token JWT 字符串
 * @returns 解码结果
 */
export function decodeJwt(token: string): JwtDecodeResult {
  // 分割 JWT
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('无效的 JWT 格式：应该包含 3 个部分');
  }

  // 解码 Header
  const header = JSON.parse(atob(parts[0]));

  // 解码 Payload
  const payload = jwtDecode<JwtPayload & Record<string, unknown>>(token);

  // 检查过期时间
  const now = Math.floor(Date.now() / 1000);
  const isExpired = payload.exp ? payload.exp < now : false;
  const expiresAt = payload.exp ? new Date(payload.exp * 1000) : undefined;
  const issuedAt = payload.iat ? new Date(payload.iat * 1000) : undefined;

  return {
    header,
    payload,
    signature: parts[2],
    isExpired,
    expiresAt,
    issuedAt,
  };
}

/**
 * 验证 JWT 格式是否有效
 * @param token JWT 字符串
 * @returns 验证结果
 */
export function validateJwt(token: string): { valid: boolean; error?: string } {
  try {
    decodeJwt(token);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
}

/**
 * 格式化时间戳为可读字符串
 * @param timestamp Unix 时间戳（秒）
 * @returns 格式化的时间字符串
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
