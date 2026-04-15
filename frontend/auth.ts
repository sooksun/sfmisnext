import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}B_admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.username, password: credentials.password }),
          })
          const data = await res.json()
          if (data.flag === 'success' && data.data) {
            // รวม access_token จาก backend เข้าไปใน user object
            return {
              ...data.data,
              id: String(data.data.id || data.data.admin_id),
              access_token: data.access_token ?? null,
            }
          }
          return null
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user = user
        // เก็บ access_token แยกใน JWT payload เพื่อส่งกลับ client
        token.access_token = (user as Record<string, unknown>).access_token ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (token.user) {
        session.user = {
          ...session.user,
          ...(token.user as Record<string, unknown>),
        } as typeof session.user
      }
      // เปิด access_token ให้ client-side session ใช้ได้
      // (ยังอยู่ใน memory ไม่ persist บน disk เหมือน localStorage)
      ;(session as unknown as Record<string, unknown>).access_token =
        token.access_token ?? null
      return session
    },
  },
  pages: {
    signIn: '/sign-in',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 ชั่วโมง
  },
})
