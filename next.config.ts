import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // better-sqlite3 is a native addon: it must stay external to the server bundle.
  serverExternalPackages: ['better-sqlite3'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'thespacedevs-prod.nyc3.digitaloceanspaces.com' },
      { protocol: 'https', hostname: 'thespacedevs-dev.nyc3.digitaloceanspaces.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
};

export default nextConfig;
