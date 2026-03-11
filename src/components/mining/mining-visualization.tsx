"use client";

import { useEffect, useState } from "react";
import { Bitcoin, Zap, Hash, Cpu, Server, Activity } from "lucide-react";

interface MiningStats {
    hashRate: string;
    blocks: number;
    miners: number;
    reward: string;
}

export function MiningVisualization() {
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number; duration: number }>>([]);
    const [stats, setStats] = useState<MiningStats>({
        hashRate: "245.6 TH/s",
        blocks: 876543,
        miners: 12458,
        reward: "3.125 BTC"
    });

    useEffect(() => {
        // Generate floating particles
        const newParticles = Array.from({ length: 30 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 3 + Math.random() * 4
        }));
        setParticles(newParticles);

        // Animate stats
        const interval = setInterval(() => {
            setStats(prev => ({
                hashRate: `${(240 + Math.random() * 20).toFixed(1)} TH/s`,
                blocks: prev.blocks + Math.floor(Math.random() * 3),
                miners: prev.miners + Math.floor(Math.random() * 10) - 5,
                reward: "3.125 BTC"
            }));
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-[600px] overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-orange-900 rounded-2xl border-4 border-orange-500/30 shadow-2xl">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 opacity-20">
                <div
                    className="w-full h-full"
                    style={{
                        backgroundImage: `
              linear-gradient(to right, rgba(249,115,22,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(249,115,22,0.1) 1px, transparent 1px)
            `,
                        backgroundSize: '40px 40px',
                        animation: 'gridMove 20s linear infinite'
                    }}
                />
            </div>

            {/* Floating Particles */}
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute w-2 h-2 bg-orange-400 rounded-full"
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        animation: `float ${particle.duration}s ease-in-out infinite`,
                        animationDelay: `${particle.delay}s`,
                        opacity: 0.6 + Math.random() * 0.4
                    }}
                />
            ))}

            {/* 3D Bitcoin Icon - Central */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-orange-500 rounded-full blur-3xl opacity-30 animate-pulse" />

                    {/* 3D Bitcoin */}
                    <div className="relative w-40 h-40 animate-spin-slow">
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
                            <defs>
                                <linearGradient id="btcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#f7931a" />
                                    <stop offset="50%" stopColor="#ffb84d" />
                                    <stop offset="100%" stopColor="#f7931a" />
                                </linearGradient>
                                <filter id="btcGlow">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            {/* Bitcoin Circle */}
                            <circle cx="50" cy="50" r="45" fill="url(#btcGradient)" filter="url(#btcGlow)" />
                            <circle cx="50" cy="50" r="42" fill="none" stroke="#fff" strokeWidth="1" opacity="0.3" />
                            {/* B Symbol */}
                            <text x="50" y="62" textAnchor="middle" fill="#fff" fontSize="40" fontWeight="bold" fontFamily="Arial">₿</text>
                        </svg>
                    </div>

                    {/* Mining Ring */}
                    <div className="absolute -inset-8 border-2 border-orange-400/50 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                    <div className="absolute -inset-12 border border-orange-300/30 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
                </div>
            </div>

            {/* Mining Rigs - Left Side */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-800/80 backdrop-blur px-4 py-3 rounded-xl border border-orange-500/20">
                        <Server className="w-8 h-8 text-orange-400" />
                        <div>
                            <div className="text-xs text-orange-300">RIG-{i}</div>
                            <div className="text-sm font-mono text-white">{(50 + i * 20).toFixed(1)} TH/s</div>
                        </div>
                        <div className="ml-2 flex gap-1">
                            {[...Array(3)].map((_, j) => (
                                <div
                                    key={j}
                                    className="w-1 h-3 bg-green-400 rounded-full animate-pulse"
                                    style={{ animationDelay: `${j * 0.2}s`, height: `${8 + Math.random() * 8}px` }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Hash Rate Display - Right Side */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 space-y-4">
                <div className="bg-slate-800/80 backdrop-blur px-6 py-4 rounded-xl border border-orange-500/20">
                    <div className="flex items-center gap-2 text-orange-400 mb-2">
                        <Hash className="w-5 h-5" />
                        <span className="text-sm font-medium">NETWORK HASH RATE</span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-white">{stats.hashRate}</div>
                </div>

                <div className="bg-slate-800/80 backdrop-blur px-6 py-4 rounded-xl border border-orange-500/20">
                    <div className="flex items-center gap-2 text-orange-400 mb-2">
                        <Cpu className="w-5 h-5" />
                        <span className="text-sm font-medium">ACTIVE MINERS</span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-white">{stats.miners.toLocaleString()}</div>
                </div>

                <div className="bg-slate-800/80 backdrop-blur px-6 py-4 rounded-xl border border-orange-500/20">
                    <div className="flex items-center gap-2 text-orange-400 mb-2">
                        <Activity className="w-5 h-5" />
                        <span className="text-sm font-medium">BLOCK HEIGHT</span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-white">{stats.blocks.toLocaleString()}</div>
                </div>
            </div>

            {/* Bottom Stats Bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent pt-12 pb-6 px-8">
                <div className="flex justify-center items-center gap-12">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-lg">
                            <Zap className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                            <div className="text-xs text-orange-300 uppercase tracking-wider">Block Reward</div>
                            <div className="text-lg font-bold text-white flex items-center gap-1">
                                <Bitcoin className="w-4 h-4 text-orange-400" />
                                {stats.reward}
                            </div>
                        </div>
                    </div>

                    <div className="w-px h-10 bg-orange-500/30" />

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <Activity className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <div className="text-xs text-green-300 uppercase tracking-wider">Your Hash Rate</div>
                            <div className="text-lg font-bold text-white">1.2 TH/s</div>
                        </div>
                    </div>

                    <div className="w-px h-10 bg-orange-500/30" />

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Hash className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-xs text-blue-300 uppercase tracking-wider">Daily Earnings</div>
                            <div className="text-lg font-bold text-white">0.00045 BTC</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scanning Line Effect */}
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="w-full h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent absolute"
                    style={{
                        animation: 'scanLine 4s ease-in-out infinite'
                    }}
                />
            </div>

            <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-30px) scale(1.2); opacity: 1; }
        }
        
        @keyframes gridMove {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        
        @keyframes scanLine {
          0%, 100% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        
        .animate-spin-slow {
          animation: spin 20s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
