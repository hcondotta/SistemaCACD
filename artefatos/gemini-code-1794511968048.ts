import type { Metadata } from "next";
import { Newsreader, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import DiplomaticSidebar from "@/components/layout/DiplomaticSidebar";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gabinete de Estudos CACD • Instituto Rio Branco",
  description:
    "Plataforma de alta performance para preparação ao Concurso de Admissão à Carreira de Diplomata.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${newsreader.variable} ${jakarta.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased selection:bg-itamaraty-gold-500/30">
        <div className="flex min-h-screen bg-travertine-50 dark:bg-itamaraty-navy-950 text-ink-900 dark:text-travertine-100">
          <div className="hidden lg:block">
            <DiplomaticSidebar />
          </div>
          <div className="flex flex-1 flex-col min-w-0">{children}</div>
        </div>
      </body>
    </html>
  );
}