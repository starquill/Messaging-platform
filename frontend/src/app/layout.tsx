import type { Metadata } from "next";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal",
  description: "Secure messaging platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
