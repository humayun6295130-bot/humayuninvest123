"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser, useRealtimeCollection } from "@/firebase";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
    Pickaxe,
    Bitcoin,
    Zap,
    Hash,
    Cpu,
    Server,
    Activity,
    Clock,
    TrendingUp,
    Lock,
    Unlock,
    Shield,
    AlertTriangle,
    Calculator,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    Coins,
    Gift,
    Timer,
    Flame,
    Sparkles,
    Gem,
    Trophy,
    Star,
    History
} from "lucide-react";

// Mining Package Types
interface MiningPackage {
    id: string;
    name: string;
    description: string;
    minInvestment: number;
    maxInvestment: number;
    dailyRoi: number;
    duration: number;
    hashRate: string;
    color: string;
    features: string[];
}

// Stuck Reserve Types
interface StuckReserve {
    id: string;
    amount: number;
    lockPeriod: number;
    interestRate: number;
    startDate: string;
    endDate: string;
    status: 'locked' | 'unlocked' | 'pending';
    earnedInterest: number;
    penaltyAmount?: number;
}

// Mining Packages Data
const MINING_PACKAGES: MiningPackage[] = [
    {
        id: "starter",
        name: "Starter Miner",
        description: "Perfect for beginners",
        minInvestment: 50,
        maxInvestment: 500,
        dailyRoi: 2.5,
        duration: 30,
        hashRate: "10 TH/s",
        color: "from-blue-500 to-cyan-500",
        features: ["Basic Support", "Daily Payouts", "Mobile App Access"]
    },
    {
        id: "pro",
        name: "Pro Miner",
        description: "For serious investors",
        minInvestment: 501,
        maxInvestment: 5000,
        dailyRoi: 4.5,
        duration: 60,
        hashRate: "50 TH/s",
        color: "from-purple-500 to-pink-500",
        features: ["Priority Support", "Instant Payouts", "API Access", "Bonus Rewards"]
    },
    {
        id: "enterprise",
        name: "Enterprise Miner",
        description: "Maximum returns",
        minInvestment: 5001,
        maxInvestment: 50000,
        dailyRoi: 7.5,
        duration: 90,
        hashRate: "200 TH/s",
        color: "from-orange-500 to-red-500",
        features: ["Dedicated Manager", "Zero Fees", "Custom Solutions", "VIP Events"]
    },
    {
        id: "vip",
        name: "VIP Elite",
        description: "Exclusive premium tier",
        minInvestment: 50001,
        maxInvestment: 500000,
        dailyRoi: 12,
        duration: 120,
        hashRate: "1000 TH/s",
        color: "from-yellow-500 to-amber-500",
        features: ["Private Pool", "Custom Contracts", "24/7 Support", "Luxury Rewards"]
    }
];

// Stuck Reserve Interest Rates
const STUCK_RESERVE_RATES = [
    { days: 30, rate: 2, label: "Basic Lock" },
    { days: 60, rate: 4, label: "Standard Lock" },
    { days: 90, rate: 6, label: "Extended Lock" },
    { days: 180, rate: 8, label: "Premium Lock" },
    { days: 365, rate: 20, label: "Ultimate Lock" }
];

export default function MiningPage() {
    const { user, userProfile } = useUser();
    const { toast } = useToast();
    const router = useRouter();

    // State
    const [activeTab, setActiveTab] = useState("dashboard");
    const [selectedPackage, setSelectedPackage] = useState<MiningPackage | null>(null);
    const [investAmount, setInvestAmount] = useState("");
    const [isInvesting, setIsInvesting] = useState(false);
    const [showInvestDialog, setShowInvestDialog] = useState(false);
    const [showStuckReserveDialog, setShowStuckReserveDialog] = useState(false);

    // Stuck Reserve State
    const [stuckAmount, setStuckAmount] = useState(1000);
    const [lockPeriod, setLockPeriod] = useState(30);
    const [isLocking, setIsLocking] = useState(false);

    // Mining Stats State
    const [miningStats, setMiningStats] = useState({
        totalHashRate: "0 TH/s",
        activeMiners: 0,
        totalEarnings: 0,
        currentEfficiency: 0
    });

    // Particles for 3D effect
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number; duration: number }>>([]);

    // Real user investments from Firebase
    const investmentsOptions = useMemo(() => ({
        table: 'user_investments',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        enabled: !!user,
    }), [user]);
    const { data: firebaseInvestmentsRaw } = useRealtimeCollection(investmentsOptions);

    const firebaseInvestments = useMemo(() => {
        if (!firebaseInvestmentsRaw?.length) return firebaseInvestmentsRaw;
        return [...firebaseInvestmentsRaw].sort(
            (a: any, b: any) =>
                new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime()
        );
    }, [firebaseInvestmentsRaw]);

    // Map Firebase investments to display format
    const userInvestments = useMemo(() => {
        if (!firebaseInvestments) return [];
        return firebaseInvestments.map((inv: any) => {
            const start = new Date(inv.start_date);
            const end = new Date(inv.end_date);
            const now = new Date();
            const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
            const elapsedDays = Math.max(0, Math.round((now.getTime() - start.getTime()) / 86400000));
            const progress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
            return {
                id: inv.id,
                planName: inv.plan_name,
                amount: inv.amount,
                dailyEarnings:
                    typeof inv.daily_roi === 'number' && inv.daily_roi > 0
                        ? inv.daily_roi
                        : (inv.amount * (Number(inv.daily_roi_percent) || 0)) / 100,
                totalEarnings: inv.total_return || 0,
                startDate: inv.start_date?.slice(0, 10) || '',
                endDate: inv.end_date?.slice(0, 10) || '',
                status: inv.status || 'active',
                progress,
            };
        });
    }, [firebaseInvestments]);

    // Stuck reserves (empty — feature coming soon)
    const [stuckReserves, setStuckReserves] = useState<StuckReserve[]>([]);

    // Generate particles (deterministic — no Math.random in render)
    useEffect(() => {
        const newParticles = Array.from({ length: 50 }, (_, i) => ({
            id: i,
            x: (i * 2.1) % 100,
            y: (i * 3.7) % 100,
            delay: (i * 0.11) % 5,
            duration: 3 + (i * 0.08) % 4,
            opacity: 0.4 + (i * 0.012) % 0.6,
        }));
        setParticles(newParticles);
    }, []);

    // Simulate mining stats
    useEffect(() => {
        const interval = setInterval(() => {
            setMiningStats(prev => ({
                totalHashRate: `${(100 + Math.random() * 50).toFixed(1)} TH/s`,
                activeMiners: Math.floor(5000 + Math.random() * 1000),
                totalEarnings: prev.totalEarnings + Math.random() * 10,
                currentEfficiency: 95 + Math.random() * 5
            }));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Calculate stuck reserve earnings
    const stuckEarnings = useMemo(() => {
        const rate = STUCK_RESERVE_RATES.find(r => r.days === lockPeriod);
        return (stuckAmount * (rate?.rate || 0)) / 100;
    }, [stuckAmount, lockPeriod]);

    // Calculate penalty for early withdrawal
    const earlyWithdrawalPenalty = useMemo(() => {
        return stuckAmount * 0.10;
    }, [stuckAmount]);

    // Handle investment — redirect to invest page
    const handleInvest = async () => {
        setShowInvestDialog(false);
        router.push('/invest');
    };

    // Handle stuck reserve
    const handleStuckReserve = async () => {
        if (stuckAmount <= 0) return;

        setIsLocking(true);

        // Capture current values before async operation
        const currentStuckAmount = stuckAmount;
        const currentLockPeriod = lockPeriod;
        const currentRate = STUCK_RESERVE_RATES.find(r => r.days === currentLockPeriod)?.rate || 0;

        setTimeout(() => {
            const newReserve: StuckReserve = {
                id: Date.now().toString(),
                amount: currentStuckAmount,
                lockPeriod: currentLockPeriod,
                interestRate: currentRate,
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + currentLockPeriod * 24 * 60 * 60 * 1000).toISOString(),
                status: "locked",
                earnedInterest: 0
            };

            // Use functional update to avoid stale state
            setStuckReserves(prev => [...prev, newReserve]);
            setIsLocking(false);
            setShowStuckReserveDialog(false);

            toast({
                title: "Stuck Reserve Activated",
                description: `Your ${currentStuckAmount} is now locked for ${currentLockPeriod} days at ${currentRate}% interest`,
            });
        }, 2000);
    };

    // Handle early unlock
    const handleEarlyUnlock = (reserveId: string) => {
        setStuckReserves(prev => prev.map(r => {
            if (r.id === reserveId) {
                return {
                    ...r,
                    status: "unlocked" as const,
                    penaltyAmount: earlyWithdrawalPenalty
                };
            }
            return r;
        }));

        toast({
            title: "Early Withdrawal",
            description: `A 10% penalty of $${earlyWithdrawalPenalty} has been applied`,
            variant: "destructive"
        });
    };

    if (!user) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Pickaxe className="h-12 w-12 animate-pulse text-primary" />
                    <p className="text-muted-foreground">Loading mining dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0b0b0b] via-[#0f0f0f] to-[#0a0a0a] text-white">
            {/* Premium Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#0b0b0b] via-[#0f0f0f] to-[#0b0b0b] border-b border-slate-800/30">
                {/* Animated Background */}
                <div className="absolute inset-0 opacity-40">
                    <div
                        className="w-full h-full"
                        style={{
                            backgroundImage: `
                radial-gradient(circle at 20% 50%, rgba(255, 215, 0, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 80% 50%, rgba(0, 123, 255, 0.15) 0%, transparent 50%)
              `
                        }}
                    />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] bg-clip-text text-transparent" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                Premium Mining Hub
                            </h1>
                            <p className="mt-2 text-slate-400 text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
                                Invest in cutting-edge mining operations and earn premium returns
                            </p>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex gap-4">
                            <Card className="bg-[#0f0f0f]/80 border-[#FFD700]/30 backdrop-blur-md shadow-lg shadow-[#FFD700]/5">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-[#FFD700]/20 rounded-lg">
                                            <Hash className="w-5 h-5 text-[#FFD700]" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">Network Hash</p>
                                            <p className="text-lg font-bold text-white">{miningStats.totalHashRate}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-[#0f0f0f]/80 border-[#007BFF]/30 backdrop-blur-md shadow-lg shadow-[#007BFF]/5">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-[#007BFF]/20 rounded-lg">
                                            <Cpu className="w-5 h-5 text-[#007BFF]" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">Active Miners</p>
                                            <p className="text-lg font-bold text-white">{miningStats.activeMiners.toLocaleString('en-US')}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-[#0f0f0f]/80 border border-slate-800/50 p-1">
                        <TabsTrigger
                            value="dashboard"
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FFD700] data-[state=active]:to-[#FFA500] data-[state=active]:text-black data-[state=active]:font-semibold"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Dashboard
                        </TabsTrigger>
                        <TabsTrigger
                            value="invest"
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FFD700] data-[state=active]:to-[#FFA500] data-[state=active]:text-black data-[state=active]:font-semibold"
                        >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Invest
                        </TabsTrigger>
                        <TabsTrigger
                            value="stuck"
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FFD700] data-[state=active]:to-[#FFA500] data-[state=active]:text-black data-[state=active]:font-semibold"
                        >
                            <Lock className="w-4 h-4 mr-2" />
                            Stuck Reserve
                        </TabsTrigger>
                        <TabsTrigger
                            value="history"
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FFD700] data-[state=active]:to-[#FFA500] data-[state=active]:text-black data-[state=active]:font-semibold"
                        >
                            <History className="w-4 h-4 mr-2" />
                            History
                        </TabsTrigger>
                    </TabsList>

                    {/* Dashboard Tab */}
                    <TabsContent value="dashboard" className="space-y-6">
                        {/* 3D Mining Visualization */}
                        <Card className="bg-gradient-to-br from-[#0f0f0f] via-[#141414] to-[#0f0f0f] border-[#FFD700]/20 overflow-hidden shadow-2xl shadow-[#FFD700]/5">
                            <CardContent className="p-0">
                                <div className="relative h-[400px] overflow-hidden bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a00]/20">
                                    {/* Animated Grid */}
                                    <div className="absolute inset-0 opacity-20">
                                        <div
                                            className="w-full h-full"
                                            style={{
                                                backgroundImage: `
                          linear-gradient(to right, rgba(255, 215, 0, 0.08) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(255, 215, 0, 0.08) 1px, transparent 1px)
                        `,
                                                backgroundSize: '40px 40px',
                                            }}
                                        />
                                    </div>

                                    {/* Floating Particles */}
                                    {particles.map((particle) => (
                                        <div
                                            key={particle.id}
                                            className="absolute w-1.5 h-1.5 bg-[#FFD700] rounded-full"
                                            style={{
                                                left: `${particle.x}%`,
                                                top: `${particle.y}%`,
                                                animation: `float ${particle.duration}s ease-in-out infinite`,
                                                animationDelay: `${particle.delay}s`,
                                                opacity: particle.opacity ?? 0.7
                                            }}
                                        />
                                    ))}

                                    {/* 3D Gold BTC Coin - Central */}
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                        <div className="relative">
                                            {/* Glow Effect */}
                                            <div className="absolute inset-0 bg-[#FFD700] rounded-full blur-3xl opacity-30 animate-pulse" />

                                            {/* Gold Bitcoin */}
                                            <div className="relative w-36 h-36 animate-spin-slow">
                                                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
                                                    <defs>
                                                        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                            <stop offset="0%" stopColor="#FFD700" />
                                                            <stop offset="50%" stopColor="#FFA500" />
                                                            <stop offset="100%" stopColor="#FFD700" />
                                                        </linearGradient>
                                                        <filter id="goldGlow">
                                                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                                            <feMerge>
                                                                <feMergeNode in="coloredBlur" />
                                                                <feMergeNode in="SourceGraphic" />
                                                            </feMerge>
                                                        </filter>
                                                    </defs>
                                                    <circle cx="50" cy="50" r="45" fill="url(#goldGradient)" filter="url(#goldGlow)" />
                                                    <circle cx="50" cy="50" r="42" fill="none" stroke="#fff" strokeWidth="1" opacity="0.3" />
                                                    <text x="50" y="62" textAnchor="middle" fill="#fff" fontSize="40" fontWeight="bold" fontFamily="Arial">₿</text>
                                                </svg>
                                            </div>

                                            {/* Mining Ring */}
                                            <div className="absolute -inset-10 border-2 border-[#FFD700]/40 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                                            <div className="absolute -inset-16 border border-[#FFD700]/20 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
                                        </div>
                                    </div>

                                    {/* Mining Rigs - Left */}
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 space-y-3">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex items-center gap-2 bg-[#0f0f0f]/80 backdrop-blur-md px-4 py-3 rounded-xl border border-[#FFD700]/20 hover:border-[#FFD700]/40 transition-all duration-300 hover:scale-105">
                                                <Server className="w-6 h-6 text-[#FFD700]" />
                                                <div>
                                                    <div className="text-xs text-[#FFD700]/70">RIG-{i}</div>
                                                    <div className="text-sm font-mono text-white">{(50 + i * 20).toFixed(0)} TH/s</div>
                                                </div>
                                                <div className="ml-2 flex gap-1">
                                                    {[...Array(3)].map((_, j) => (
                                                        <div
                                                            key={j}
                                                            className="w-1 h-3 bg-green-400 rounded-full animate-pulse"
                                                            style={{ animationDelay: `${j * 0.2}s`, height: `${8 + j * 4}px` }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Stats - Right */}
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 space-y-3">
                                        <div className="bg-[#0f0f0f]/80 backdrop-blur-md px-5 py-3 rounded-xl border border-[#007BFF]/20 hover:border-[#007BFF]/40 transition-all duration-300 hover:scale-105">
                                            <div className="flex items-center gap-2 text-[#007BFF] mb-1">
                                                <Hash className="w-4 h-4" />
                                                <span className="text-xs font-medium">HASH RATE</span>
                                            </div>
                                            <div className="text-xl font-mono font-bold text-white">{miningStats.totalHashRate}</div>
                                        </div>

                                        <div className="bg-[#0f0f0f]/80 backdrop-blur-md px-5 py-3 rounded-xl border border-[#FFD700]/20 hover:border-[#FFD700]/40 transition-all duration-300 hover:scale-105">
                                            <div className="flex items-center gap-2 text-[#FFD700] mb-1">
                                                <Cpu className="w-4 h-4" />
                                                <span className="text-xs font-medium">EFFICIENCY</span>
                                            </div>
                                            <div className="text-xl font-mono font-bold text-white">{miningStats.currentEfficiency.toFixed(1)}%</div>
                                        </div>
                                    </div>

                                    {/* Bottom Stats Bar */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0a] via-[#0f0f0f]/90 to-transparent pt-12 pb-4 px-6">
                                        <div className="flex justify-center items-center gap-8">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-[#FFD700]/20 rounded-lg">
                                                    <Zap className="w-4 h-4 text-[#FFD700]" />
                                                </div>
                                                <div>
                                                    <div className="text-xs text-[#FFD700]/70">Total Earnings</div>
                                                    <div className="text-sm font-bold text-white">${userProfile?.total_earnings?.toFixed(2) || "0.00"}</div>
                                                </div>
                                            </div>

                                            <div className="w-px h-8 bg-[#FFD700]/20" />

                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-green-500/20 rounded-lg">
                                                    <TrendingUp className="w-4 h-4 text-green-400" />
                                                </div>
                                                <div>
                                                    <div className="text-xs text-green-400/70">Active Investments</div>
                                                    <div className="text-sm font-bold text-white">{userInvestments.length}</div>
                                                </div>
                                            </div>

                                            <div className="w-px h-8 bg-[#FFD700]/20" />

                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-[#007BFF]/20 rounded-lg">
                                                    <Clock className="w-4 h-4 text-[#007BFF]" />
                                                </div>
                                                <div>
                                                    <div className="text-xs text-[#007BFF]/70">Stuck Reserves</div>
                                                    <div className="text-sm font-bold text-white">${stuckReserves.reduce((acc, r) => acc + r.amount, 0).toLocaleString('en-US')}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Active Investments Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-[#0f0f0f]/60 border-slate-800/30 backdrop-blur-md hover:border-[#FFD700]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#FFD700]/5">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400">Total Invested</p>
                                            <p className="text-2xl font-bold text-white">${userProfile?.total_invested?.toLocaleString('en-US') || "0"}</p>
                                        </div>
                                        <div className="p-3 bg-[#FFD700]/10 rounded-xl">
                                            <Wallet className="w-6 h-6 text-[#FFD700]" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-[#0f0f0f]/60 border-slate-800/30 backdrop-blur-md hover:border-green-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/5">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400">Total Earnings</p>
                                            <p className="text-2xl font-bold text-green-400">${userProfile?.total_earnings?.toLocaleString('en-US') || "0"}</p>
                                        </div>
                                        <div className="p-3 bg-green-500/10 rounded-xl">
                                            <TrendingUp className="w-6 h-6 text-green-400" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-[#0f0f0f]/60 border-slate-800/30 backdrop-blur-md hover:border-[#007BFF]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#007BFF]/5">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400">Stuck Reserve</p>
                                            <p className="text-2xl font-bold text-[#007BFF]">${stuckReserves.reduce((acc, r) => acc + r.amount, 0).toLocaleString('en-US')}</p>
                                        </div>
                                        <div className="p-3 bg-[#007BFF]/10 rounded-xl">
                                            <Lock className="w-6 h-6 text-[#007BFF]" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Invest Tab */}
                    <TabsContent value="invest" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {MINING_PACKAGES.map((pkg) => (
                                <Card
                                    key={pkg.id}
                                    className={cn(
                                        "bg-[#0f0f0f]/80 border-slate-800/30 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:shadow-xl group overflow-hidden relative",
                                        "hover:border-[#FFD700]/50"
                                    )}
                                >
                                    {/* Gradient Overlay on Hover */}
                                    <div className={cn(
                                        "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br",
                                        pkg.color
                                    )} />

                                    <CardHeader className="relative">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg text-white">{pkg.name}</CardTitle>
                                            <Badge className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold">
                                                {pkg.dailyRoi}% Daily
                                            </Badge>
                                        </div>
                                        <CardDescription className="text-slate-400">{pkg.description}</CardDescription>
                                    </CardHeader>

                                    <CardContent className="relative space-y-4">
                                        <div className="text-center">
                                            <div className="text-3xl font-bold bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent">
                                                ${pkg.minInvestment.toLocaleString('en-US')} - ${pkg.maxInvestment.toLocaleString('en-US')}
                                            </div>
                                            <p className="text-xs text-slate-500">Investment Range</p>
                                        </div>

                                        <div className="flex items-center justify-center gap-2 text-[#007BFF]">
                                            <Hash className="w-4 h-4" />
                                            <span className="text-sm font-mono">{pkg.hashRate}</span>
                                        </div>

                                        <ul className="space-y-2">
                                            {pkg.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                                                    <div className="w-1.5 h-1.5 bg-[#FFD700] rounded-full" />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>

                                    <CardFooter className="relative">
                                        <Button
                                            onClick={() => {
                                                setSelectedPackage(pkg);
                                                setShowInvestDialog(true);
                                            }}
                                            className="w-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] hover:from-[#FFA500] hover:to-[#FFD700] text-black font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-[#FFD700]/20"
                                        >
                                            Invest Now
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* Stuck Reserve Tab */}
                    <TabsContent value="stuck" className="space-y-6">
                        <Card className="bg-gradient-to-br from-[#0f0f0f] via-[#141414] to-[#0f0f0f] border-[#007BFF]/20">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-[#007BFF]" />
                                    Stuck Reserve System
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Lock your funds for guaranteed returns with tiered interest rates
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Lock Period Slider */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-white">Lock Period</Label>
                                        <Badge variant="outline" className="border-[#007BFF]/50 text-[#007BFF]">
                                            {lockPeriod} Days
                                        </Badge>
                                    </div>
                                    <Slider
                                        value={[lockPeriod]}
                                        onValueChange={(val) => setLockPeriod(val[0])}
                                        min={30}
                                        max={365}
                                        step={30}
                                        className="py-4"
                                    />
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>30 Days</span>
                                        <span>365 Days</span>
                                    </div>
                                </div>

                                {/* Interest Rate Display */}
                                <div className="grid grid-cols-5 gap-2">
                                    {STUCK_RESERVE_RATES.map((rate) => (
                                        <div
                                            key={rate.days}
                                            className={cn(
                                                "p-3 rounded-xl text-center transition-all duration-300 cursor-pointer border",
                                                lockPeriod === rate.days
                                                    ? "bg-[#007BFF]/20 border-[#007BFF] scale-105 shadow-lg shadow-[#007BFF]/10"
                                                    : "bg-[#0f0f0f]/50 border-slate-800 hover:border-[#007BFF]/50"
                                            )}
                                            onClick={() => setLockPeriod(rate.days)}
                                        >
                                            <div className="text-lg font-bold text-white">{rate.rate}%</div>
                                            <div className="text-xs text-slate-400">{rate.days}d</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Amount Input */}
                                <div className="space-y-2">
                                    <Label className="text-white">Reserve Amount</Label>
                                    <div className="relative">
                                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#FFD700]" />
                                        <Input
                                            type="number"
                                            value={stuckAmount}
                                            onChange={(e) => setStuckAmount(parseFloat(e.target.value) || 0)}
                                            className="pl-10 bg-[#0f0f0f]/50 border-slate-700 text-white text-lg font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Earnings Calculator */}
                                <Card className="bg-[#0f0f0f]/50 border-slate-800">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Interest Rate</span>
                                            <span className="text-white font-mono">{STUCK_RESERVE_RATES.find(r => r.days === lockPeriod)?.rate}%</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Lock Period</span>
                                            <span className="text-white font-mono">{lockPeriod} Days</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Expected Earnings</span>
                                            <span className="text-green-400 font-mono font-bold">+${stuckEarnings.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                                            <span className="text-slate-400">Early Withdrawal Penalty</span>
                                            <span className="text-red-400 font-mono">-10% (${earlyWithdrawalPenalty.toFixed(2)})</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Button
                                    onClick={() => setShowStuckReserveDialog(true)}
                                    disabled={stuckAmount <= 0}
                                    className="w-full bg-gradient-to-r from-[#007BFF] to-[#0056b3] hover:from-[#0056b3] hover:to-[#007BFF] text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-[#007BFF]/20"
                                >
                                    <Lock className="w-4 h-4 mr-2" />
                                    Lock Funds
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Active Stuck Reserves */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-white">Active Reserves</h3>
                            {stuckReserves.map((reserve) => (
                                <Card
                                    key={reserve.id}
                                    className={cn(
                                        "bg-[#0f0f0f]/60 border-slate-800/30 backdrop-blur-md transition-all duration-300",
                                        reserve.status === "locked" && "hover:border-[#007BFF]/30"
                                    )}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "p-3 rounded-xl",
                                                    reserve.status === "locked" ? "bg-[#007BFF]/10" : "bg-red-500/10"
                                                )}>
                                                    {reserve.status === "locked" ? (
                                                        <Lock className="w-6 h-6 text-[#007BFF]" />
                                                    ) : (
                                                        <Unlock className="w-6 h-6 text-red-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-lg font-bold text-white">${reserve.amount.toLocaleString('en-US')}</p>
                                                    <p className="text-sm text-slate-400">
                                                        {reserve.lockPeriod} Days Lock • {reserve.interestRate}% APY
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-green-400 font-bold">+${reserve.earnedInterest.toFixed(2)}</p>
                                                <Badge variant="outline" className={reserve.status === "locked" ? "border-[#007BFF] text-[#007BFF]" : "border-red-500 text-red-400"}>
                                                    {reserve.status}
                                                </Badge>
                                            </div>
                                        </div>
                                        {reserve.status === "locked" && (
                                            <div className="mt-4 flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEarlyUnlock(reserve.id)}
                                                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                                >
                                                    <AlertTriangle className="w-4 h-4 mr-1" />
                                                    Early Unlock (-10%)
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* History Tab */}
                    <TabsContent value="history" className="space-y-6">
                        <Card className="bg-[#0f0f0f]/60 border-slate-800/30 backdrop-blur-md">
                            <CardHeader>
                                <CardTitle className="text-white">Mining History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {userInvestments.map((investment) => (
                                        <div
                                            key={investment.id}
                                            className="flex items-center justify-between p-4 bg-[#0a0a0a]/50 rounded-xl border border-slate-800/30 hover:border-[#FFD700]/20 transition-all duration-300"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-[#FFD700]/10 rounded-xl">
                                                    <Pickaxe className="w-6 h-6 text-[#FFD700]" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-white">{investment.planName}</p>
                                                    <p className="text-sm text-slate-400">${investment.amount.toLocaleString('en-US')} Investment</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-green-400 font-bold">+${investment.totalEarnings.toLocaleString('en-US')}</p>
                                                <p className="text-xs text-slate-500">Total Earnings</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Invest Dialog */}
            <Dialog open={showInvestDialog} onOpenChange={setShowInvestDialog}>
                <DialogContent className="bg-[#0f0f0f] border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bitcoin className="w-5 h-5 text-[#FFD700]" />
                            Invest in {selectedPackage?.name}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Enter the amount you want to invest
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-white">Investment Amount</Label>
                            <div className="relative">
                                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#FFD700]" />
                                <Input
                                    type="number"
                                    value={investAmount}
                                    onChange={(e) => setInvestAmount(e.target.value)}
                                    placeholder={`Min: $${selectedPackage?.minInvestment}`}
                                    className="pl-10 bg-[#0a0a0a] border-slate-700 text-white"
                                />
                            </div>
                            {selectedPackage && (
                                <p className="text-xs text-slate-500">
                                    Min: ${selectedPackage.minInvestment} - Max: ${selectedPackage.maxInvestment.toLocaleString('en-US')}
                                </p>
                            )}
                        </div>
                        {selectedPackage && investAmount && (
                            <Card className="bg-[#0a0a0a]/50 border-slate-800">
                                <CardContent className="p-3 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Daily ROI</span>
                                        <span className="text-[#FFD700]">${((parseFloat(investAmount) || 0) * selectedPackage.dailyRoi / 100).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-t border-slate-800 pt-2">
                                        <span className="text-slate-400">Monthly Estimate</span>
                                        <span className="text-green-400 font-bold">
                                            ${((parseFloat(investAmount) || 0) * selectedPackage.dailyRoi * 30 / 100).toFixed(2)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowInvestDialog(false)}
                            className="border-slate-700 text-white hover:bg-slate-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleInvest}
                            disabled={isInvesting || !investAmount}
                            className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-semibold"
                        >
                            {isInvesting ? "Processing..." : "Confirm Investment"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Stuck Reserve Dialog */}
            <Dialog open={showStuckReserveDialog} onOpenChange={setShowStuckReserveDialog}>
                <DialogContent className="bg-[#0f0f0f] border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-[#007BFF]" />
                            Confirm Stuck Reserve
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Review your locked fund details
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Card className="bg-[#0a0a0a]/50 border-slate-800">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Amount</span>
                                    <span className="text-white font-bold">${stuckAmount.toLocaleString('en-US')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Lock Period</span>
                                    <span>{lockPeriod} Days</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Interest Rate</span>
                                    <span className="text-[#007BFF]">{STUCK_RESERVE_RATES.find(r => r.days === lockPeriod)?.rate}%</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-800 pt-3">
                                    <span className="text-slate-400">Expected Earnings</span>
                                    <span className="text-green-400 font-bold">+${stuckEarnings.toFixed(2)}</span>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                            <p className="text-xs text-red-400">
                                Early withdrawal will incur a 10% penalty fee. Your funds will be locked until the end of the period.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowStuckReserveDialog(false)}
                            className="border-slate-700 text-white hover:bg-slate-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleStuckReserve}
                            disabled={isLocking}
                            className="bg-gradient-to-r from-[#007BFF] to-[#0056b3] text-white font-semibold"
                        >
                            {isLocking ? "Locking..." : "Confirm Lock"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
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
        </div>
    );
}
