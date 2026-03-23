import type { Metadata } from "next";
import { Cormorant_Garamond, Azeret_Mono, Figtree } from "next/font/google";
import "./globals.css";

// Cormorant Garamond: high-contrast classical serif for headings — editorial, distinctive
const cormorant = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

// Azeret Mono: technical monospace for data/numbers
const azeretMono = Azeret_Mono({
  weight: ["400", "500", "600", "700"],
  variable: "--font-data",
  subsets: ["latin"],
  display: "swap",
});

// Figtree: clean geometric sans-serif for body copy
const figtree = Figtree({
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://stock-dashboard.vercel.app';

export const metadata: Metadata = {
  title: "StockAI — Análisis de Mercado en Tiempo Real",
  description:
    "Análisis técnico de acciones con Fibonacci, Ondas de Elliott e IA. Señales de compra/venta en tiempo real para el mercado estadounidense.",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: "StockAI — Análisis de Mercado en Tiempo Real",
    description:
      "Análisis técnico de acciones con Fibonacci, Ondas de Elliott e IA. Señales de compra/venta en tiempo real.",
    url: BASE_URL,
    siteName: "StockAI",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "StockAI — Análisis de Mercado" }],
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StockAI — Análisis de Mercado en Tiempo Real",
    description: "Señales de compra/venta con Fibonacci, Elliott Waves e IA en tiempo real.",
    images: ["/api/og"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${cormorant.variable} ${azeretMono.variable} ${figtree.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
