import { createUser, getUserByUsername, getUserById, updateLastLogin, createSession, deleteSession, getSession, logAudit } from "../services/users.ts";
import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "pingup-secret-key-change-in-production");

function generateTOTPSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < 16; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
}

function base32ToHex(base32: string): string {
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  
  for (const char of base32.toUpperCase()) {
    const val = base32Chars.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  
  let hex = "";
  for (let i = 0; i + 4 <= bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  
  return hex;
}

function generateTOTP(secret: string, timestamp?: number): string {
  const time = Math.floor((timestamp || Date.now()) / 1000 / 30);
  const hexSecret = base32ToHex(secret);
  
  const timeHex = time.toString(16).padStart(16, "0");
  
  const timeBytes: number[] = [];
  for (let i = 0; i < timeHex.length; i += 2) {
    timeBytes.push(parseInt(timeHex.slice(i, i + 2), 16));
  }
  
  const keyBytes: number[] = [];
  for (let i = 0; i < hexSecret.length; i += 2) {
    keyBytes.push(parseInt(hexSecret.slice(i, i + 2), 16));
  }
  
  const hmac = simpleHmac(keyBytes, timeBytes);
  
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = 
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, "0");
}

function simpleHmac(key: number[], message: number[]): number[] {
  const blockSize = 64;
  
  let paddedKey = [...key];
  if (paddedKey.length > blockSize) {
    const hash = simpleHash(paddedKey);
    paddedKey = [...hash];
  }
  
  while (paddedKey.length < blockSize) {
    paddedKey.push(0);
  }
  
  const oKeyPad: number[] = [];
  const iKeyPad: number[] = [];
  
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }
  
  const innerHash = simpleHash([...iKeyPad, ...message]);
  const result = simpleHash([...oKeyPad, ...innerHash]);
  
  return result;
}

function simpleHash(data: number[]): number[] {
  let h = 0x67452301;
  let a = 0xefcdab89;
  let b = 0x98badcfe;
  let c = 0x10325476;
  
  for (let i = 0; i < data.length; i++) {
    h = ((h + data[i]) * 31) | 0;
    a = ((a + h) * 37) | 0;
    b = ((b + a) * 41) | 0;
    c = ((c + b) * 43) | 0;
  }
  
  return [
    h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff, (h >> 24) & 0xff,
    a & 0xff, (a >> 8) & 0xff, (a >> 16) & 0xff, (a >> 24) & 0xff,
    b & 0xff, (b >> 8) & 0xff, (b >> 16) & 0xff, (b >> 24) & 0xff,
    c & 0xff, (c >> 8) & 0xff, (c >> 16) & 0xff, (c >> 24) & 0xff,
  ];
}

export function verifyTOTP(secret: string, code: string): boolean {
  const now = Date.now();
  
  for (let i = -1; i <= 1; i++) {
    const testCode = generateTOTP(secret, now + i * 30000);
    if (testCode === code) {
      return true;
    }
  }
  
  return false;
}

export function getTOTPSecretForUser(username: string): { secret: string; qrCode: string } | null {
  const user = getUserByUsername(username);
  
  if (!user) return null;
  
  const issuer = "Pingup";
  const qrCode = `otpauth://totp/${issuer}:${username}?secret=${user.totp_secret}&issuer=${issuer}`;
  
  return {
    secret: user.totp_secret,
    qrCode,
  };
}

export async function registerUser(username: string): Promise<{ userId: string; secret: string; qrCode: string }> {
  const existing = getUserByUsername(username);
  if (existing) {
    throw new Error("Username already exists");
  }
  
  const secret = generateTOTPSecret();
  const user = createUser(username, "PUB", secret);
  
  const issuer = "Pingup";
  const qrCode = `otpauth://totp/${issuer}:${username}?secret=${secret}&issuer=${issuer}`;
  
  logAudit(user.id, "user_register", "user", `User registered: ${username}`);
  
  return {
    userId: user.id,
    secret,
    qrCode,
  };
}

export async function loginUser(username: string, totpCode: string, ipAddress?: string): Promise<{ token: string; user: { id: string; username: string; role: string } }> {
  const user = getUserByUsername(username);
  
  if (!user) {
    logAudit(null, "login_failed", "auth", `Failed login attempt for username: ${username}`);
    throw new Error("Invalid credentials");
  }
  
  if (user.status === "disabled") {
    logAudit(user.id, "login_disabled", "auth", "Disabled user attempted login");
    throw new Error("Account is disabled");
  }
  
  if (!verifyTOTP(user.totp_secret, totpCode)) {
    logAudit(user.id, "login_failed", "auth", "Invalid TOTP code");
    throw new Error("Invalid TOTP code");
  }
  
  updateLastLogin(user.id);
  
  const session = createSession(user.id, ipAddress);
  
  const token = await new SignJWT({ 
    sub: user.id, 
    username: user.username, 
    role: user.role,
    sessionId: session.id 
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET_KEY);
  
  logAudit(user.id, "login_success", "auth", "User logged in successfully");
  
  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
}

export async function verifyToken(token: string): Promise<{ sub: string; username: string; role: string; sessionId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    
    if (!payload.sub || !payload.sessionId) {
      return null;
    }
    
    const session = getSession(payload.sessionId);
    if (!session) {
      return null;
    }
    
    return {
      sub: payload.sub as string,
      username: payload.username as string,
      role: payload.role as string,
      sessionId: payload.sessionId as string,
    };
  } catch {
    return null;
  }
}

export async function logoutUser(sessionId: string): Promise<void> {
  const session = getSession(sessionId);
  if (session) {
    logAudit(session.user_id, "logout", "auth", "User logged out");
  }
  deleteSession(sessionId);
}

export function getQRCodeUrl(username: string): string {
  const secret = getTOTPSecretForUser(username);
  if (!secret) return "";
  return secret.qrCode;
}
