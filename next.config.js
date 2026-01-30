/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['fs-extra', 'archiver', 'bcryptjs'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 클라이언트 번들에서 서버 전용 모듈 제외
      config.resolve.alias = {
        ...config.resolve.alias,
        'fs-extra': false,
        archiver: false,
        fs: false,
        path: false,
        stream: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
