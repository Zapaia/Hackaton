import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Mooneto — space law, sourced",
  description:
    "A visual legal advisor for doing business in space. It tells you what is settled, what is disputed, and where it is written.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
