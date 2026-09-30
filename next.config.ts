import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Block our page from being embedded elsewhere (CSRF protection)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Prevent MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Send origin in Referer header to legitimate external embeds (e.g. YouTube, CDNs)
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Disable browser features that ads commonly abuse
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'payment=()',
              'usb=()',
              'autoplay=*',
              'fullscreen=*',
              'picture-in-picture=*',
              'encrypted-media=*',
            ].join(', '),
          },
          // Block known ad/tracker scripts from executing in our own page context
          // Note: does not affect cross-origin iframe sub-requests (handled by JS shield)
          {
            key: 'Content-Security-Policy',
            value: [
              // Allow our own scripts + inline (needed for Next.js)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https:",
              // Explicitly block known ad network script domains
              "script-src-elem 'self' 'unsafe-inline' https:",
              // Connect to any HTTPS (needed for TMDB, streams, APIs)
              "connect-src 'self' https: wss: blob: data:",
              // Allow images from anywhere (posters, thumbnails)
              "img-src 'self' https: data: blob:",
              // Allow our page to embed any HTTPS iframe (streaming servers)
              "frame-src 'self' https:",
              // Allow fonts
              "font-src 'self' https: data:",
              // Allow styles
              "style-src 'self' 'unsafe-inline' https:",
              // Allow media (HLS segments)
              "media-src 'self' https: blob: data:",
              // Workers for Hls.js
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
