/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/super-admin',
        destination: 'http://localhost:3001',
        permanent: false,
      },
      {
        source: '/super-admin/:path*',
        destination: 'http://localhost:3001/:path*',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
