import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Tally", template: "%s · Tally" },
  description: "Every cent in and out, across cash, debit and credit.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0e" },
  ],
  viewportFit: "cover",
};

// Runs while the HTML is parsed, before first paint:
// 1. applies the saved theme (light / dark / system) so there's no flash
// 2. stores the browser's time zone in a cookie, so the server can work out
//    where "this month" starts for this user
const bootScript = `(function(){try{var t=localStorage.getItem("theme")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}try{var z=Intl.DateTimeFormat().resolvedOptions().timeZone;if(z&&document.cookie.indexOf("ft_tz="+encodeURIComponent(z))<0)document.cookie="ft_tz="+encodeURIComponent(z)+"; path=/; max-age=31536000; SameSite=Lax"}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
