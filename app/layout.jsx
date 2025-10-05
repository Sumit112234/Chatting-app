import { AuthProvider } from "@/contexts/AuthContext"
import { Suspense } from "react"
import { Inter, JetBrains_Mono } from "next/font/google"
import Analytics from "@/components/Analytics"
import "./globals.css"

const geistSans = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})


export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="font-sans antialiased">
        <Suspense fallback={<div>Loading...</div>}>
          <AuthProvider>{children}</AuthProvider>
          <Analytics />
        </Suspense>
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'Sumit Baghel'
    };
