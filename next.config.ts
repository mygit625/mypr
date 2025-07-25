
import type {NextConfig} from 'next';
import type { Configuration as WebpackConfiguration } from 'webpack';

// Load environment variables from .env file
import { config } from 'dotenv';
config();

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
  experimental: {
    // fontkit is a dependency of pdf-lib, which is used in server actions.
    // Marking it as external can help prevent bundling issues in serverless environments.
    serverComponentsExternalPackages: ['fontkit'],
  },
  webpack: (
    config: WebpackConfiguration,
    { isServer }
  ) => {
    if (isServer) {
      // Ensure fontkit is treated as an external module.
      // This forces Node.js to require() it from node_modules at runtime,
      // which often helps with libraries that have complex asset loading needs.
      const existingExternals = Array.isArray(config.externals) 
        ? config.externals 
        : (config.externals ? [config.externals] : []);
      
      config.externals = [...existingExternals, 'fontkit'];
    }
    return config;
  },
};

export default nextConfig;
