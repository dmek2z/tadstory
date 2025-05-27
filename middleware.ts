import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 정적 파일과 API 라우트는 건너뛰기
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 로그인 페이지 처리
  if (pathname === '/login') {
    const token = request.cookies.get('currentUser')
    if (token) {
      const from = request.nextUrl.searchParams.get('from')
      return NextResponse.redirect(new URL(from || '/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // 대시보드 페이지 처리
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('currentUser')
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // 기본 동작
  return NextResponse.next()
}

// 미들웨어가 실행될 경로 설정
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 