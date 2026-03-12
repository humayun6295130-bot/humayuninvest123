"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Bitcoin, Zap, Hash, Cpu, Server, Activity, Play, Pause, Clock, TrendingUp } from "lucide-react";

interface UserInvestment {
    id: string;
    plan_id: string;
    plan_name: string;
    amount: number;
    daily_roi: number;
    daily_roi_percent?: number;
    total_return: number;
    total_profit?: number;
    earned_so_far: number;
    claimed_so_far?: number;
    start_date: string;
    end_date: string;
    status: 'active' | 'completed' | 'cancelled';
    auto_compound: boolean;
    capital_return?: boolean;
    duration_days?: number;
    last_claim_date?: string;
    days_claimed: number;
    mining_started?: boolean;
}

interface ActiveMiningDialogProps {
    investment: UserInvestment | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ActiveMiningDialog({ investment, open, onOpenChange }: ActiveMiningDialogProps) {
    const [isMining, setIsMining] = useState(false);
    const [miningProgress, setMiningProgress] = useState(0);
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number; duration: number }>>([]);
    const [stats, setStats] = useState({
        hashRate: "0 TH/s",
        blocks: 0,
        earned: "$0.00",
        efficiency: 0
    });

    // Initialize mining state from investment
    useEffect(() => {
        if (investment) {
            setIsMining(investment.mining_started || investment.status === 'active');
            // Calculate initial progress based on time passed
            const start = new Date(investment.start_date);
            const end = new Date(investment.end_date);
            const now = new Date();
            const totalDuration = end.getTime() - start.getTime();
            const passed = now.getTime() - start.getTime();
            const initialProgress = Math.min(100, Math.max(0, (passed / totalDuration) * 100));
            setMiningProgress(initialProgress);
        }
    }, [investment]);

    // Generate floating particles
    useEffect(() => {
        const newParticles = Array.from({ length: 30 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 3 + Math.random() * 4
        }));
        setParticles(newParticles);
    }, []);

    // Simulate mining progress when active
    useEffect(() => {
        if (!isMining || !investment) return;

        const interval = setInterval(() => {
            setMiningProgress(prev => {
                const newProgress = prev + (100 / (investment.duration_days || 30) / 24 / 60 * 5); // ~5 minutes for 1 day
                return Math.min(100, newProgress);
            });

            setStats(prev => ({
                hashRate: `${(50 + Math.random() * 100).toFixed(1)} TH/s`,
                blocks: prev.blocks + Math.floor(Math.random() * 3),
                earned: `$${((investment.daily_roi || 0) * (miningProgress / 100)).toFixed(4)}`,
                efficiency: 95 + Math.random() * 5
            }));
        }, 5000);

        return () => clearInterval(interval);
    }, [isMining, investment, miningProgress]);

    const handleStartMining = () => {
        setIsMining(true);
    };

    const handlePauseMining = () => {
        setIsMining(false);
    };

    if (!investment) return null;

    const daysRemaining = Math.max(0, Math.ceil((new Date(investment.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const progressPercent = miningProgress;
    const dailyEarnings = investment.daily_roi || 0;
    const totalEarnings = (investment.earned_so_far || 0) + (investment.claimed_so_far || 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border-orange-500/30">
                <DialogHeader>
                    <DialogTitle className="text-xl text-white flex items-center gap-2">
                        <Bitcoin className="w-6 h-6 text-orange-400" />
                        {investment.plan_name} - Mining Dashboard
                    </DialogTitle>
                </DialogHeader>

                {/* 3D Mining Visualization */}
                <div className="relative w-full h-[400px] overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-orange-900 rounded-xl border-4 border-orange-500/30 shadow-2xl">
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
                            <div className={`absolute inset-0 bg-orange-500 rounded-full blur-3xl ${isMining ? 'opacity-50 animate-pulse' : 'opacity-20'}`} />

                            {/* 3D Bitcoin */}
                            <div className={`relative w-32 h-32 ${isMining ? 'animate-spin-slow' : ''}`}>
                                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
                                    <defs>
                                        <linearGradient id="btcGradientActive" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#f7931a" />
                                            <stop offset="50%" stopColor="#ffb84d" />
                                            <stop offset="100%" stopColor="#f7931a" />
                                        </linearGradient>
                                        <filter id="btcGlowActive">
                                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                            <feMerge>
                                                <feMergeNode in="coloredBlur" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    <circle cx="50" cy="50" r="45" fill="url(#btcGradientActive)" filter="url(#btcGlowActive)" />
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="#fff" strokeWidth="1" opacity="0.3" />
                                    <text x="50" y="62" textAnchor="middle" fill="#fff" fontSize="40" fontWeight="bold" fontFamily="Arial">₿</text>
                                </svg>
                            </div>

                            {/* Mining Rings */}
                            {isMining && (
                                <>
                                    <div className="absolute -inset-8 border-2 border-orange-400/50 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                                    <div className="absolute -inset-12 border border-orange-300/30 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Mining Rigs - Left Side */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-2 bg-slate-800/80 backdrop-blur px-3 py-2 rounded-lg border border-orange-500/20">
                                <Server className="w-6 h-6 text-orange-400" />
                                <div>
                                    <div className="text-xs text-orange-300">RIG-{i}</div>
                                    <div className="text-xs font-mono text-white">{(10 + i * 5).toFixed(0)} TH/s</div>
                                </div>
                                {isMining && (
                                    <div className="ml-1 flex gap-0.5">
                                        {[...Array(3)].map((_, j) => (
                                            <div
                                                key={j}
                                                className="w-0.5 h-2 bg-green-400 rounded-full animate-pulse"
                                                style={{ animationDelay: `${j * 0.2}s`, height: `${4 + Math.random() * 4}px` }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Stats - Right Side */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 space-y-3">
                        <div className="bg-slate-800/80 backdrop-blur px-4 py-3 rounded-lg border border-orange-500/20">
                            <div className="flex items-center gap-2 text-orange-400 mb-1">
                                <Hash className="w-4 h-4" />
                                <span className="text-xs font-medium">HASH RATE</span>
                            </div>
                            <div className="text-lg font-mono font-bold text-white">
                                {isMining ? `${(50 + Math.random() * 100).toFixed(1)} TH/s` : '0 TH/s'}
                            </div>
                        </div>

                        <div className="bg-slate-800/80 backdrop-blur px-4 py-3 rounded-lg border border-orange-500/20">
                            <div className="flex items-center gap-2 text-orange-400 mb-1">
                                <Cpu className="w-4 h-4" />
                                <span className="text-xs font-medium">EFFICIENCY</span>
                            </div>
                            <div className="text-lg font-mono font-bold text-white">
                                {isMining ? `${(95 + Math.random() * 5).toFixed(1)}%` : '0%'}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Stats Bar */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent pt-8 pb-4 px-6">
                        <div className="flex justify-center items-center gap-8">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-orange-500/20 rounded-lg">
                                    <Zap className="w-4 h-4 text-orange-400" />
                                </div>
                                <div>
                                    <div className="text-xs text-orange-300">Daily Earnings</div>
                                    <div className="text-sm font-bold text-white">${dailyEarnings.toFixed(2)}</div>
                                </div>
                            </div>

                            <div className="w-px h-8 bg-orange-500/30" />

                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-green-500/20 rounded-lg">
                                    <TrendingUp className="w-4 h-4 text-green-400" />
                                </div>
                                <div>
                                    <div className="text-xs text-green-300">Total Earned</div>
                                    <div className="text-sm font-bold text-white">${totalEarnings.toFixed(2)}</div>
                                </div>
                            </div>

                            <div className="w-px h-8 bg-orange-500/30" />

                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                    <Clock className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <div className="text-xs text-blue-300">Days Left</div>
                                    <div className="text-sm font-bold text-white">{daysRemaining}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mining Controls */}
                <div className="space-y-4 mt-4">
                    {/* Progress Section */}
                    <Card className="bg-slate-900/50 border-orange-500/20">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-orange-400" />
                                    <span className="text-sm font-medium text-white">Mining Progress</span>
                                </div>
                                <span className="text-sm font-bold text-orange-400">{progressPercent.toFixed(1)}%</span>
                            </div>
                            <Progress
                                value={progressPercent}
                                className="h-3 bg-slate-800"
                                style={{
                                    '--progress-background': 'linear-gradient(90deg, #f97316, #fbbf24)'
                                } as React.CSSProperties}
                            />
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Started: {new Date(investment.start_date).toLocaleDateString()}</span>
                                <span>Ends: {new Date(investment.end_date).toLocaleDateString()}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Investment Details */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-slate-900/50 border-orange-500/20">
                            <CardContent className="p-3 text-center">
                                <p className="text-xs text-slate-400 mb-1">Invested Amount</p>
                                <p className="text-lg font-bold text-white">${investment.amount.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900/50 border-orange-500/20">
                            <CardContent className="p-3 text-center">
                                <p className="text-xs text-slate-400 mb-1">Daily ROI</p>
                                <p className="text-lg font-bold text-green-400">+${dailyEarnings.toFixed(2)}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900/50 border-orange-500/20">
                            <CardContent className="p-3 text-center">
                                <p className="text-xs text-slate-400 mb-1">Total Return</p>
                                <p className="text-lg font-bold text-orange-400">${investment.total_return.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        {!isMining ? (
                            <Button
                                onClick={handleStartMining}
                                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                            >
                                <Play className="mr-2 h-4 w-4" />
                                Start Mining
                            </Button>
                        ) : (
                            <Button
                                onClick={handlePauseMining}
                                variant="outline"
                                className="flex-1 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                            >
                                <Pause className="mr-2 h-4 w-4" />
                                Pause Mining
                            </Button>
                        )}
                    </div>
                </div>

                <style jsx>{`
                    @keyframes float {
                        0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
                        50% { transform: translateY(-30px) scale(1.2); opacity: 1; }
                    }
                    
                    .animate-spin-slow {
                        animation: spin 20s linear infinite;
                    }
                    
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </DialogContent>
        </Dialog>
    );
}
