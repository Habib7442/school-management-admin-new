import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "School Management System",
  description: "Modern school management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="top-right"
          expand={true}
          richColors={true}
          closeButton={true}
          toastOptions={{
            style: {
              background: 'var(--background)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            },
            className: 'toast-custom',
            descriptionClassName: 'toast-description-custom',
          }}
        />
      </body>
    </html>
  );
}
