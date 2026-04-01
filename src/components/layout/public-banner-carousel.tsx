"use client";

import { useMemo } from "react";
import { useRealtimeCollection } from "@/firebase";
import type { SiteBanner } from "@/components/admin/banner-manager";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export type BannerCarouselVariant = "landing" | "app";

interface PublicBannerCarouselProps {
    /** `app` = compact strip inside logged-in member layout (same Firestore `site_banners`). */
    variant?: BannerCarouselVariant;
}

export function PublicBannerCarousel({ variant = "landing" }: PublicBannerCarouselProps) {
    const { data, isLoading } = useRealtimeCollection<SiteBanner>({
        table: "site_banners",
        enabled: true,
    });

    const slides = useMemo(() => {
        const list = (data || []).filter((b) => b.is_active !== false);
        return [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }, [data]);

    const [i, setI] = useState(0);

    useEffect(() => {
        setI(0);
    }, [slides.length]);

    const next = useCallback(() => {
        if (slides.length <= 1) return;
        setI((v) => (v + 1) % slides.length);
    }, [slides.length]);

    const prev = useCallback(() => {
        if (slides.length <= 1) return;
        setI((v) => (v - 1 + slides.length) % slides.length);
    }, [slides.length]);

    useEffect(() => {
        if (slides.length <= 1) return;
        const t = setInterval(next, 8000);
        return () => clearInterval(t);
    }, [slides.length, next]);

    if (isLoading || slides.length === 0) return null;

    const s = slides[i];
    if (!s?.media_url) return null;

    const isApp = variant === "app";

    const inner = (
        <div
            className={cn(
                "relative w-full overflow-hidden border bg-slate-900/80 shadow-xl",
                isApp
                    ? "aspect-[24/7] min-h-[100px] max-h-[160px] sm:max-h-[200px] rounded-xl border-border/60"
                    : "aspect-[21/9] min-h-[140px] max-h-[220px] sm:max-h-[280px] rounded-2xl border-slate-800"
            )}
        >
            {s.media_type === "video" ? (
                <video
                    key={s.id}
                    className="absolute inset-0 w-full h-full object-cover"
                    src={s.media_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls
                    preload="metadata"
                />
            ) : (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic admin URLs
                <img
                    src={s.media_url}
                    alt={s.title || "Banner"}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            )}
            {s.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4">
                    <p className="text-sm sm:text-base font-semibold text-white drop-shadow">{s.title}</p>
                </div>
            )}
        </div>
    );

    return (
        <section
            className={cn(
                "w-full",
                isApp ? "px-3 sm:px-4 pt-2 pb-1 border-b border-border/40 bg-muted/15" : "px-4 pt-6 pb-2"
            )}
        >
            <div className={cn("relative", isApp ? "max-w-6xl mx-auto" : "container max-w-5xl mx-auto")}>
                {s.link_url?.startsWith("http") ? (
                    <a href={s.link_url} target="_blank" rel="noopener noreferrer" className="block">
                        {inner}
                    </a>
                ) : s.link_url?.startsWith("/") ? (
                    <Link href={s.link_url} className="block">
                        {inner}
                    </Link>
                ) : (
                    inner
                )}

                {slides.length > 1 && (
                    <>
                        <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-90"
                            onClick={prev}
                            aria-label="Previous banner"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-90"
                            onClick={next}
                            aria-label="Next banner"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <div className="flex justify-center gap-1.5 mt-3">
                            {slides.map((_, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className={cn(
                                        "h-1.5 rounded-full transition-all",
                                        idx === i ? "w-6 bg-orange-500" : "w-1.5 bg-slate-600"
                                    )}
                                    aria-label={`Go to slide ${idx + 1}`}
                                    onClick={() => setI(idx)}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
