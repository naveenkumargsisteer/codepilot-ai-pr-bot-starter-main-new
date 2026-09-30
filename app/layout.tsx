import "./globals.css";
import type { Metadata } from "next";
import { MobileNav } from "./components/MobileNav";

export const metadata: Metadata = {
  title: "CodePilot — AI PR Bot",
  description: "Plan, implement and create pull requests from chat."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MobileNav />
        {children}
      </body>
    </html>
  );
}