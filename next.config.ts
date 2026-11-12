import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Sem limite de corpo customizado: a foto da folha manuscrita vai direto do
  // navegador para o bucket privado `essays-handwritten` do Supabase Storage,
  // e só o caminho do arquivo passa pela rota de correção. Um bodySizeLimit
  // aqui não resolveria o upload: ele vale apenas para Server Actions, e as
  // funções da Vercel recusam corpos acima de 4,5 MB de qualquer forma.
};

export default nextConfig;
