import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('🔐 [AUTH] 로그인 시도:', { username: credentials?.username });
        
        if (!credentials?.username || !credentials?.password) {
          console.log('❌ [AUTH] 실패: 아이디 또는 비밀번호 누락');
          throw new Error('아이디와 비밀번호를 입력해주세요.');
        }

        // 임시 하드코딩 (테스트용)
        const authUsername = process.env.AUTH_USERNAME || 'genieone';
        const authPasswordHash = process.env.AUTH_PASSWORD_HASH || '$2b$10$5JpBho5Xp1aveOWpDApN0OznmC6.8PGGpdW678f7fC/ZYkSXpwmae';

        console.log('🔍 [AUTH] 환경변수 체크:', {
          authUsername: authUsername ? '✅ SET' : '❌ NOT SET',
          authPasswordHash: authPasswordHash ? '✅ SET' : '❌ NOT SET',
          authUsername_from_env: !!process.env.AUTH_USERNAME,
          authPasswordHash_from_env: !!process.env.AUTH_PASSWORD_HASH
        });

        if (!authUsername || !authPasswordHash) {
          console.log('❌ [AUTH] 실패: 환경변수 누락');
          throw new Error('서버 인증 설정이 올바르지 않습니다.');
        }

        // 아이디 체크
        console.log('🔍 [AUTH] 아이디 비교:', {
          입력: credentials.username,
          설정: authUsername,
          일치: credentials.username === authUsername
        });
        
        if (credentials.username !== authUsername) {
          console.log('❌ [AUTH] 실패: 아이디 불일치');
          throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
        }

        // 비밀번호 체크 (bcrypt)
        console.log('🔍 [AUTH] 비밀번호 해시 비교 시작...');
        console.log('🔍 [AUTH] 입력된 비밀번호 길이:', credentials.password.length);
        console.log('🔍 [AUTH] 저장된 해시 길이:', authPasswordHash.length);
        console.log('🔍 [AUTH] 해시 앞 10자:', authPasswordHash.substring(0, 10));
        console.log('🔍 [AUTH] 해시가 $2a$ 또는 $2b$로 시작하는지:', authPasswordHash.startsWith('$2a$') || authPasswordHash.startsWith('$2b$'));
        
        const isPasswordValid = await bcrypt.compare(credentials.password, authPasswordHash);
        console.log('🔍 [AUTH] 비밀번호 해시 비교 결과:', isPasswordValid ? '✅ 일치' : '❌ 불일치');
        
        if (!isPasswordValid) {
          console.log('❌ [AUTH] 실패: 비밀번호 불일치');
          throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
        }

        // 인증 성공
        console.log('✅ [AUTH] 로그인 성공:', credentials.username);
        return {
          id: '1',
          email: `${credentials.username}@local`,
          name: credentials.username
        };
      }
    })
  ],
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email as string;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};

