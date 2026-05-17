import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@plate.app",
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/",
    verifyRequest: "/auth/verify",
  },
  callbacks: {
    signIn({ user }) {
      const list = process.env.ALLOWED_EMAILS;
      if (!list) return true;
      const allowed = list.split(",").map((e) => e.trim().toLowerCase());
      return allowed.includes(user.email?.toLowerCase() ?? "");
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
