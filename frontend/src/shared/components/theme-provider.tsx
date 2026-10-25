"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// next-themes menyisipkan <script> inline. Saat React merender ulang di browser (mis. 404 di root),
// React memperingatkan tag <script>: tipe "text/plain" di browser mencegahnya (pola sama dengan InlineScript).
const scriptProps = {
  type: typeof window === "undefined" ? "text/javascript" : "text/plain",
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider scriptProps={scriptProps} {...props}>
      {children}
    </NextThemesProvider>
  )
}
