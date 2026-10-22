"use client";
import { useEffect, useRef, useState } from "react";

// Muted loop that plays only while on screen. With reduced motion it stays still and shows controls instead.
export function AutoVideo({ src, poster, label, className }: { src: string; poster: string; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStill(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return <video ref={ref} src={src} poster={poster} aria-label={label} muted loop playsInline preload="metadata" controls={still} className={className} />;
}
