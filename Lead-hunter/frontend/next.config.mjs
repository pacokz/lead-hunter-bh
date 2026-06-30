/** @type {import('next').NextConfig} */
// Proxy interno: o navegador chama /backend-api/* (mesma origem, sem CORS) e o
// Next repassa pro backend (localhost:8000 na VPS). Assim o backend nunca fica
// exposto na internet. Em dev, basta NEXT_PUBLIC_API_URL=/backend-api.
const backend = process.env.BACKEND_ORIGIN || "http://localhost:8000";
const nextConfig = {
  async rewrites() {
    return [
      { source: "/backend-api/:path*", destination: `${backend}/:path*` },
    ];
  },
};

export default nextConfig;
