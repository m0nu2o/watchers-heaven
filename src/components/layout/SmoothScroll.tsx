'use client';
import React from 'react';

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  // Rely on native browser hardware-accelerated smooth scrolling to eliminate wheel-interception micro-stutter & shaking
  return <>{children}</>;
}

export default SmoothScroll;
