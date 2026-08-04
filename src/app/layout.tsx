import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--fonte-texto" });

// Monoespaçada para traço unitário, códigos e tabelas de ensaio — em
// engenharia, número desalinhado é número difícil de conferir.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--fonte-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Malha — cálculo estrutural",
  description:
    "Plataforma de cálculo, verificação normativa e memorial técnico para engenharia estrutural.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f1a" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * Aplica o tema salvo ANTES da primeira pintura.
 *
 * Sem isto, quem usa o tema escuro vê um clarão branco a cada carregamento —
 * o React só assumiria depois de hidratar. Por isso o script é inline e
 * síncrono, no `<head>`.
 */
const SCRIPT_TEMA = `
(function(){try{
  var t = localStorage.getItem('malha-tema') || 'sistema';
  var escuro = t === 'escuro' || (t === 'sistema' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (escuro) document.documentElement.classList.add('dark');
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className={`${inter.variable} ${mono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
