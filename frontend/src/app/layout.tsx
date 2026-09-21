import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { QueryProvider } from "@/providers/query-provider";

export const metadata: Metadata = {
  title: "ClassHelper - 올인원 학원 통합 관리 플랫폼",
  description: "학원 원생 출결 관리, 수업 진도 및 과제 체크, 수강료 납부 현황 관리 올인원 솔루션",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

// viewport-fit=cover lets the bottom tab bar respect the phone's home-indicator safe area.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies the saved theme before first paint so dark-mode users never see a light flash.
// Reads the same key the zustand theme store persists to; the string is static.
const themeInitScript = `try{var s=JSON.parse(localStorage.getItem('classhelper_theme')||'{}');if(s.state&&s.state.theme==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
