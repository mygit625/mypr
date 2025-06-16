
import type {NextConfig} from 'next';
import type { Configuration as WebpackConfiguration } from 'webpack';

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
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdfkit', 'fontkit'], // Keep this as it's good practice
  },
  webpack: (
    config: WebpackConfiguration,
    { isServer }
  ) => {
    if (isServer) {
      // Ensure pdfkit and fontkit are treated as externals.
      // This forces Node.js to require() them from node_modules at runtime,
      // which often helps with libraries that rely on __dirname or have
      // complex asset loading mechanisms that don't work well when bundled.
      const existingExternals = Array.isArray(config.externals) 
        ? config.externals 
        : (config.externals ? [config.externals] : []);
      
      config.externals = [...existingExternals, 'pdfkit', 'fontkit'];
    }
    return config;
  },
};

export default nextConfig;
