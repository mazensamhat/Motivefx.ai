/**
 * One-off: create or update a user with email + password.
 * Usage: node scripts/create-user.mjs <email> <password>
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = process.argv[2]?.trim().toLowerCase();
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: node scripts/create-user.mjs <email> <password>");
  process.exit(1);
}

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash(password, 12);

const user = await prisma.user.upsert({
  where: { email },
  create: { email, passwordHash },
  update: { passwordHash },
});

console.log(JSON.stringify({ ok: true, id: user.id, email: user.email }, null, 2));
await prisma.$disconnect();
