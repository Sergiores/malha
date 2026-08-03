import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // O tracer de dependências não enxerga o binário do Prisma (ele é carregado
  // por caminho em runtime, não por import), então o engine ficaria de fora do
  // bundle das funções. Sem isso o deploy sobe e só quebra em runtime.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/client/**"],
  },
};

export default nextConfig;
