import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextAuthOptions } from 'next-auth';
import { timingSafeEqual } from 'crypto';

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return timingSafeEqual(bufA, bufB);
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
          console.error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are not set');
          return null;
        }

        if (
          credentials?.email &&
          credentials?.password &&
          safeCompare(credentials.email, adminEmail) &&
          safeCompare(credentials.password, adminPassword)
        ) {
          return { id: '1', name: 'Admin', email: adminEmail };
        }
        return null;
      }
    })
  ],
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  pages: { signIn: '/admin/login' },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
