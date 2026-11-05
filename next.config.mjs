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
    const adminUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:3001';
    return [
      {
        source: '/super-admin',
        destination: adminUrl,
        permanent: false,
      },
      {
        source: '/super-admin/:path*',
        destination: `${adminUrl}/:path*`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
