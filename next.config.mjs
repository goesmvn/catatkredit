/** @type {import('next').NextConfig} */
const nextConfig = {
  // Wajib untuk build Docker menggunakan fitur standalone
  output: 'standalone',
  
  // Konfigurasi yang benar untuk Next.js 14.x
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },

  // (Opsional) Mengabaikan error typescript dan eslint saat build 
  // agar proses Docker tidak terhenti oleh error linter
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;