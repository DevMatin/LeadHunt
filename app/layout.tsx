import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadHunt - B2B Lead Research & Outreach",
  description: "B2B SaaS Plattform zur Lead-Recherche und -Verwaltung",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
