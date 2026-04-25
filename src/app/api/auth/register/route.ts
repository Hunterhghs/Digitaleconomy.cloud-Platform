import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  name: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { email, password, name } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);
  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      name,
      // Demo placeholder. In prod this is set when Privy/Coinbase Smart Wallet
      // provisions a real custodial smart account at signup.
      custodialWalletAddress: `0x${Buffer.from(email).toString("hex").slice(0, 40).padEnd(40, "0")}`,
    },
  });

  return NextResponse.json({ id: user.id });
}
