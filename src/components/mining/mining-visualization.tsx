"use client";

import { useEffect, useState } from "react";
import { Bitcoin, Zap, Hash, Cpu, Server, Activity } from "lucide-react";

interface MiningStats {
    hashRate: string;
    blocks: number;
    miners: number;
    reward: string;
}

interface Particle {
    id: number;
    x: number;
    y: number;
    delay: number;
    duration: number;
    opacity: number;
}

interface RigBar {
    height: number;
}

const RIG_BARS: RigBar[][] = [
    [{ height: 8 }, { height: 12 }, { height: 10 }],
    [{ height: 14 }, { height: 8 }, { height: 12 }],
    [{ height: 10 }, { height: 16 }, { height: 8 }],
];

export function MiningVisualization() {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [mounted, setMounted] = useState(false);
    const [stats, setStats] = useState<MiningStats>({
        hashRate: "245.6 TH/s",
        blocks: 876543,
        miners: 12458,
        reward: "3.125 BTC"
    });

    useEffect(() => {
        setMounted(true);
        const newParticles: Particle[] = Array.from({ length: 30 }, (_, i) => ({
            id: i,
            x: (i * 3.33) % 100,
            y: (i * 7.1) % 100,
            delay: (i * 0.17) % 5,
            duration: 3 + (i * 0.13) % 4,
            opacity: 0.6 + (i * 0.013) % 0.4,
        }));
        setParticles(newParticles);

        const interval = setInterval(() => {
            setStats(prev => ({
                hashRate: `${(240 + (Date.now() % 20)).toFixed(1)} TH/s`,
                blocks: prev.blocks + 1,
                miners: prev.miners + (prev.miners % 2 === 0 ? 1 : -1),
                reward: "3.125 BTC"
            }));
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-[500px] overflow-hidden bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f] to-[#1a0a00] rounded-2xl border border-orange-500/20 shadow-2xl shadow-orange-500/10">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-10">
                <div
                    className="w-full h-full"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, rgba(249,115,22,0.3) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(249,115,22,0.3) 1px, transparent 1px)
                        `,
                        backgroundSize: '40px 40px',
                    }}
                />
            </div>

            {/* Floating Particles — only render after mount to avoid hydration mismatch */}
            {mounted && particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute w-1.5 h-1.5 bg-orange-400 rounded-full"
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        animation: `float ${particle.duration}s ease-in-out infinite`,
                        animationDelay: `${particle.delay}s`,
                        opacity: particle.opacity,
                    }}
                />
            ))}

            {/* Central Bitcoin */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                    <div className="absolute inset-0 bg-orange-500 rounded-full blur-3xl opacity-20 animate-pulse" />
                    <div className="relative w-36 h-36 animate-spin-slow">
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
                            <defs>
                                <linearGradient id="btcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#f7931a" />
                                    <stop offset="50%" stopColor="#FFD700" />
                                    <stop offset="100%" stopColor="#f7931a" />
                                </linearGradient>
                            </defs>
                            <circle cx="50" cy="50" r="45" fill="url(#btcGrad)" />
                            <circle cx="50" cy="50" r="42" fill="none" stroke="#fff" strokeWidth="1" opacity="0.3" />
                            <text x="50" y="62" textAnchor="middle" fill="#fff" fontSize="40" fontWeight="bold" fontFamily="Arial">₿</text>
                        </svg>
                    </div>
                    <div className="absolute -inset-8 border-2 border-orange-400/30 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                    <div className="absolute -inset-14 border border-orange-300/20 rounded-full animate-ping" style={{ animationDuration: '4.5s' }} />
                </div>
            </div>

            {/* Mining Rigs - Left */}
            <div className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-2 sm:px-4 sm:py-3 rounded-xl border border-orange-500/20">
                        <Server className="w-5 h-5 text-orange-400 shrink-0" />
                        <div className="min-w-0">
                            <div className="text-xs text-orange-300">RIG-{i}</div>
                            <div className="text-sm font-mono text-white">{(50 + i * 20).toFixed(1)} TH/s</div>
                        </div>
                        <div className="ml-1 flex gap-0.5 items-end h-5">
                            {RIG_BARS[i - 1].map((bar, j) => (
                                <div
                                    key={j}
                                    className="w-1 bg-green-400 rounded-full animate-pulse"
                                    style={{ animationDelay: `${j * 0.2}s`, height: `${bar.height}px` }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Stats - Right */}
            <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 space-y-3">
                <div className="bg-black/60 backdrop-blur px-4 py-3 rounded-xl border border-orange-500/20">
                    <div className="flex items-center gap-2 text-orange-400 mb-1">
                        <Hash className="w-4 h-4" />
                        <span className="text-xs font-medium">HASH RATE</span>
                    </div>
                    <div className="text-lg font-mono font-bold text-white">{stats.hashRate}</div>
                </div>
                <div className="bg-black/60 backdrop-blur px-4 py-3 rounded-xl border border-orange-500/20">
                    <div className="flex items-center gap-2 text-orange-400 mb-1">
                        <Cpu className="w-4 h-4" />
                        <span className="text-xs font-medium">MINERS</span>
                    </div>
                    <div className="text-lg font-mono font-bold text-white">{stats.miners.toLocaleString()}</div>
                </div>
                <div className="bg-black/60 backdrop-blur px-4 py-3 rounded-xl border border-orange-500/20">
                    <div className="flex items-center gap-2 text-orange-400 mb-1">
                        <Activity className="w-4 h-4" />
                        <span className="text-xs font-medium">BLOCKS</span>
                    </div>
                    <div className="text-lg font-mono font-bold text-white">{stats.blocks.toLocaleString()}</div>
                </div>
            </div>

            {/* Bottom ticker */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 border-t border-orange-500/20 px-4 py-2 flex items-center gap-4 overflow-hidden">
                <Zap className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="text-xs text-orange-300 font-mono whitespace-nowrap animate-pulse">
                    LIVE ● Network efficiency: 99.9% ● Reward: {stats.reward} ● Status: ONLINE
                </span>
            </div>
        </div>
    );
}
