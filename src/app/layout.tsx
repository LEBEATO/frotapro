import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FROTA PRO",
  description: "Controle de frota para empresas de transporte",
  
  openGraph: {
    title: "FROTA PRO",
    description: "Controle de frota para empresas de transporte",
    siteName: "FROTA PRO",
    images: [
      {
        url: "/frotas.jpg", // Certifique-se de que frotas.jpg está na pasta 'public'
        width: 1200,
        height: 630,
        alt: "FROTA PRO - Gestão de Frotas",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  
  twitter: {
    card: "summary_large_image",
    title: "FROTA PRO",
    description: "Controle de frota para empresas de transporte",
    images: ["/frotas.jpg"], // Unificado para usar a mesma imagem de capa
  },

  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}