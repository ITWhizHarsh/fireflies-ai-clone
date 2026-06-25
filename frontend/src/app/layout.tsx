import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fireflies Clone — Meeting Assistant",
  description: "AI-powered meeting transcripts, summaries, and action items",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-[#0f0f10] text-gray-900 dark:text-white min-h-screen transition-colors duration-200">
        <ThemeProvider>
          <QueryProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#25252c",
                  color: "#fff",
                  border: "1px solid #3a3a46",
                  borderRadius: "8px",
                  fontSize: "14px",
                },
                success: {
                  iconTheme: {
                    primary: "#8b5cf6",
                    secondary: "#fff",
                  },
                },
                error: {
                  iconTheme: {
                    primary: "#ef4444",
                    secondary: "#fff",
                  },
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
