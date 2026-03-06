import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, VT323, Fira_Code } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const vt323 = VT323({
  variable: "--font-vt323",
  weight: "400",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://ascii.alkemist.no"),
  title: "ALKEMIST ASCII Dither System",
  description: "Algorithmic ASCII topography — image, video, and live webcam",
  openGraph: {
    title: "ALKEMIST ASCII Dither System",
    description: "Algorithmic ASCII topography — image, video, and live webcam",
    images: [{ url: "/og-badge.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ALKEMIST ASCII Dither System",
    description: "Algorithmic ASCII topography — image, video, and live webcam",
    images: ["/og-badge.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${vt323.variable} ${firaCode.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
