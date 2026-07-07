import bcrypt from "bcryptjs";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string | null | undefined) {
  if (!passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
}
