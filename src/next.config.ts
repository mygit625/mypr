
import { config } from 'dotenv';
config({ path: './.env' });

import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    // pdfjs-dist uses a dynamic require that webpack doesn't like.
    // This is the standard workaround.
    config.resolve.alias.canvas = false;
    return config;
  },
  // fontkit is a dependency of pdf-lib, which is used in server actions.
  // Marking it as external can help prevent bundling issues in serverless environments.
  serverExternalPackages: ['fontkit'],
};

export default nextConfig;
