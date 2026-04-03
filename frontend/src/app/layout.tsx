import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConnectivityProvider } from "@/components/ConnectivityProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Gameshow",
  description: "Interactive gameshow platform for quizzes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.variable} min-h-full flex flex-col font-sans antialiased`}>
        <ConnectivityProvider>
          {children}
        </ConnectivityProvider>
      </body>
    </html>
  );
}
