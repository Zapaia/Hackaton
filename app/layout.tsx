import type { Metadata } from "next"
import { Inter, Newsreader } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
})

// The articulated law is quoted verbatim, so it gets a reading face rather than the
// interface face. The distinction is the point: this is the instrument speaking.
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-law",
  style: ["normal", "italic"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Mooneto — space law, sourced",
  description:
    "A visual legal advisor for doing business in space. It tells you what is settled, what is disputed, and where it is written.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body>{children}</body>
    </html>
  )
}
