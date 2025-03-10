/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Suppress webpack warnings
    config.infrastructureLogging = {
      level: 'error'
    }

    // Disable warnings in webpack stats
    config.stats = {
      warnings: false
    }

    // Filter out the specific deprecation warning
    if (config.optimization) {
      config.optimization.moduleIds = 'deterministic'
    }
    
    // Fix for next-auth module resolution
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        net: false,
        tls: false,
      },
    }
    
    return config
  },
  // Ensure experimental features are disabled
  experimental: {
    serverComponentsExternalPackages: [],
  }
}

module.exports = nextConfig 