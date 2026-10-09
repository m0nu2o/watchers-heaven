import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CinemaModeProvider } from "@/components/effects/CinemaModeProvider";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeScript } from "@/components/effects/ThemeScript";
import "../globals.css";

export const metadata: Metadata = {
  title: "Lumina — Cinema, Series & Anime",
  description: "Your modern entertainment universe. Stream blockbuster movies, television series, and anime.",
};

const themeScript = `
try {
  const mode = localStorage.getItem('setting-theme-mode');
  if (mode === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
  const accent = localStorage.getItem('setting-accent-color');
  if (accent) document.documentElement.style.setProperty('--color-accent-blue', accent);
  const font = localStorage.getItem('setting-font-family');
  if (font === 'ethiopic') {
    document.documentElement.style.setProperty('--font-sans', '"Noto Sans Ethiopic", sans-serif');
  } else if (font === 'system') {
    document.documentElement.style.setProperty('--font-sans', 'system-ui, sans-serif');
  }
} catch (e) {}
`;

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const resolvedParams = await Promise.resolve(params);
  const locale = (resolvedParams?.locale && routing.locales.includes(resolvedParams.locale as any))
    ? resolvedParams.locale
    : 'en';

  console.log('[RootLayout] Resolved locale:', locale);

  // Get messages for the locale
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Noto+Sans+Ethiopic:wght@400..700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Lumina',
              alternateName: 'Lumina Cinema',
              url: 'https://lumina-cinema.com',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://lumina-cinema.com/en/search?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
      </head>
      <body className="antialiased mesh-bg" suppressHydrationWarning>
        <ThemeScript script={themeScript} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SmoothScroll>
            <CinemaModeProvider>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1 w-full relative pt-14 lg:pt-0 lg:pl-24 pb-16 lg:pb-0 flex flex-col justify-between">
                  <div className="flex-grow">
                    {children}
                  </div>
                  <Footer />
                </main>
              </div>
            </CinemaModeProvider>
          </SmoothScroll>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
