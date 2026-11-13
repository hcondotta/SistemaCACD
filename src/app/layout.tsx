import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import DiplomaticSidebar from "@/components/layout/DiplomaticSidebar";
import { loadShellData } from "@/lib/data/study-data";
import "./globals.css";

// Toda página lê o banco a cada requisição: progresso nunca fica congelado no build.
export const dynamic = "force-dynamic";

const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Gabinete de Estudos CACD • Instituto Rio Branco",
    template: "%s • Gabinete CACD",
  },
  description: "Plataforma de alta performance para preparação ao Concurso de Admissão à Carreira de Diplomata.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF9F5" },
    { media: "(prefers-color-scheme: dark)", color: "#08111D" },
  ],
};

/**
 * Aplica o tema antes da primeira pintura. Sem isto, quem usa o Modo
 * Chancelaria veria a página piscar em claro a cada carregamento — o tema só
 * seria aplicado depois da hidratação. Sem escolha salva, segue o sistema.
 */
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("cacd-theme");var d=t?t==="chancelaria":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const shell = await loadShellData();

  return (
    <html
      lang="pt-BR"
      className={`${newsreader.variable} ${jakarta.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="font-sans antialiased selection:bg-itamaraty-gold-500/30">
        <AppShell sidebar={<DiplomaticSidebar shell={shell} />} stats={shell.stats}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
