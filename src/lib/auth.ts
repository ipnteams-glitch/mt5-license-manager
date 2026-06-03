import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { upsertMember } from "@/lib/sheets";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      const email = user?.email || (profile as any)?.email;
      if (!email?.endsWith("@gmail.com")) {
        return false;
      }
      try {
        await upsertMember(email, user?.name || "");
      } catch (e) {
        console.error("upsertMember failed:", e);
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
  },
  session: {
    maxAge: 3 * 60 * 60, // 3 ชั่วโมง
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
