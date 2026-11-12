import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // A correção de discursivas recebe a foto da folha pautada em base64,
  // que estoura com folga o limite padrão de corpo de requisição.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
