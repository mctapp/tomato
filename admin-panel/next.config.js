
// admin-panel/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone', // standalone 모드 활성화

  // TypeScript 타입 검사 활성화
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint 검사 활성화
  eslint: {
    ignoreDuringBuilds: false,
  },

  // 이미지 최적화 설정
  images: {
    domains: [process.env.AWS_S3_BUCKET_NAME || 'your-bucket-name.s3.amazonaws.com'],
  },

  // 환경 변수 설정
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://tomato.mct.kr',
  },

  // 프로덕션 빌드 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
}

module.exports = nextConfig
