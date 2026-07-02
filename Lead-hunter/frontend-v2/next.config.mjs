/** @type {import('next').NextConfig} */
// Proxy interno: o navegador chama /backend-api/* (mesma origem, sem CORS) e o
// Next repassa pro backend (localhost:8000 na VPS). O backend nunca fica
// exposto na internet.
const backend = process.env.BACKEND_ORIGIN || "http://localhost:8000";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/backend-api/:path*", destination: `${backend}/:path*` }];
  },
};

export default nextConfig;
