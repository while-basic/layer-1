import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Christopher Celaya | AI Research Platform',
  description: 'Semantic search engine and tool execution platform for Christopher Celaya\'s research ecosystem',
  keywords: ['AI', 'Research', 'CLOS', 'Cognitive Architecture', 'Neural Networks'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
