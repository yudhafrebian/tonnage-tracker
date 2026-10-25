import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Fraunces,
  Geist,
  Geist_Mono,
  Instrument_Serif,
  Inter,
  JetBrains_Mono,
  Playfair_Display,
  Quicksand,
} from "next/font/google";
import "../globals.css";
import { Toaster } from "@/components/ui/toast";
import { QueryProvider } from "@/components/ui/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { hasLocale, locales } from "@/shared/i18n/config";
import { I18nProvider } from "@/shared/i18n/i18n-provider";
import { getDictionary } from "@/shared/i18n/dictionaries";
import { ThemeProvider } from "@/shared/components/theme-provider";
import { ColorThemeProvider } from "@/shared/components/ui/color-theme-provider";
import { colorThemeScript } from "@/shared/components/ui/color-theme-script";
import { InlineScript } from "@/shared/components/ui/inline-script";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
// Font tema Macaron; preload: false supaya tidak ikut diunduh di awal saat tema default.
const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  preload: false,
});
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  preload: false,
});

// Font tema Meridian. Jangan pakai nama "--font-serif": itu variabel tema, nanti bentrok.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  preload: false,
});

// Font tema Zen.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  preload: false,
});
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  preload: false,
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  preload: false,
});


// Wajib dengan cacheComponents: lang jadi diketahui saat build, halaman bisa di-prerender.
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.meta.title };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} ${quicksand.variable} ${fraunces.variable} ${instrumentSerif.variable} ${inter.variable} ${playfairDisplay.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={colorThemeScript} />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProvider lang={lang} dict={dict}>
          <TooltipProvider>
            <ThemeProvider
              attribute={"class"}
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <ColorThemeProvider>
                <QueryProvider>{children}</QueryProvider>
              </ColorThemeProvider>
            </ThemeProvider>
          </TooltipProvider>
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
