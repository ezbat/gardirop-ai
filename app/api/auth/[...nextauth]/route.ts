import NextAuth, { AuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { supabase } from "@/lib/supabase"

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      // Kullanıcı giriş yaptığında users tablosuna ekle veya güncelle
      if (user.id && user.email) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!existingUser) {
          // Yeni kullanıcı, users tablosuna ekle
          await supabase.from('users').insert({
            id: user.id,
            email: user.email,
            name: user.name || user.email.split('@')[0],
            username: user.email.split('@')[0],
            avatar_url: user.image || null,
            created_at: new Date().toISOString()
          })
        } else {
          // Mevcut kullanıcı, bilgileri güncelle
          await supabase.from('users').update({
            name: user.name || user.email.split('@')[0],
            avatar_url: user.image || null
          }).eq('id', user.id)
        }
      }
      return true
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub as string
      }
      return session
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }