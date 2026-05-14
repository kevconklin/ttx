import type { Metadata } from "next";
import Navigation from "@/components/Navigation";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tabletop Exercise Generator",
  description: "Generate, deliver, and report cybersecurity tabletop exercises.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ToastProvider>
          <Navigation />
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
