import type { Metadata, Viewport } from "next";
import "@fontsource/big-shoulders-display/latin-700";
import "@fontsource/big-shoulders-display/latin-900";
import "@fontsource/chakra-petch/latin-500";
import "@fontsource/chakra-petch/latin-600";
import "@fontsource/chakra-petch/latin-700";
import "./globals.css";

export const metadata: Metadata = {
  title: "BARCATINI — Automotive Meet",
  description: "Experiencia inmersiva: la entrada y el descenso al estacionamiento.",
};

export const viewport: Viewport = {
  themeColor: "#05070c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
