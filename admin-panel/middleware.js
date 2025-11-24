import { NextResponse } from 'next/server';

export function middleware(request) {
  // 기본 요청 로깅
  console.log(`Request URL: ${request.url}, Pathname: ${request.nextUrl.pathname}`);

  // 경로가 /_next로 시작하는 경우 처리
  if (request.nextUrl.pathname.startsWith('/_next')) {
    console.log(`Redirecting from ${request.nextUrl.pathname} to /admin`);
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
