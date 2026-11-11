import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import { AppShell } from "@/components/shell/app-shell";
import { Providers } from "@/components/shell/providers";
import { getAiStatus } from "@/lib/services/settings";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["700", "800"] });

export const metadata: Metadata = {
  title: { default: "YoussefCopy AI Email Studio", template: "%s · YoussefCopy Studio" },
  description: "Research-grounded email campaign workspace for professional copywriters.",
};

// Every page reads the local database per request.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ai = await getAiStatus();
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>
          <AppShell aiAvailable={ai.available}>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
