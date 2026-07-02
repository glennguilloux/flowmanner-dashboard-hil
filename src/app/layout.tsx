import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { KeyboardHelp } from "@/components/keyboard-help";
import { SearchTrigger } from "@/components/search-trigger";

export const metadata: Metadata = {
  title: "FlowManner HIL",
  description:
    "Human-in-the-loop control surface for FlowManner agent tactics, PRs, and human gates.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking script to apply dark class before paint — prevents flash of
            wrong theme on load. Reads localStorage, falls back to system pref. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(){try{var t=localStorage.getItem("theme");if(t==="dark"||!t&&matchMedia("(prefers-color-scheme:dark)").matches)document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark")}catch(e){}}()`,
          }}
        />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-200">
        <div className="flex min-h-screen">
          <Sidebar />
          <main role="main" className="flex-1 p-6 pt-16 lg:p-10 lg:pt-10">{children}</main>
        </div>
        <SearchTrigger />
        <KeyboardHelp />
      </body>
    </html>
  );
}