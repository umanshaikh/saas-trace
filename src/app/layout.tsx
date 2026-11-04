import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TraceProvider } from "@/context/TraceContext";

export const metadata: Metadata = {
  title: "TRACE — Smart Business. Simple Management.",
  description:
    "All-in-one shop management platform with POS billing, TRACE AI assistant, B2B shop network, PayLater credit ledger & subscriptions.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="font-sans min-h-screen antialiased selection:bg-indigo-500/20 selection:text-indigo-400">
        <TraceProvider>
          {children}
        </TraceProvider>
      </body>
    </html>
  );
}
