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
    
    return config
  }
}

module.exports = nextConfig 