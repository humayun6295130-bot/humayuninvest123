"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser, useRealtimeCollection, insertRow, updateRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Wallet, Clock, CheckCircle, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InvestmentPlan {
    id: string;
    name: string;
    description: string;
    min_amount: number;
    max_amount: number;
    daily_roi_percent: number;
    duration_days: number;
    capital_return: boolean;
}

interface UserInvestment {
    id: string;
    plan_id: string;
    plan_name: string;
    amount: number;
    daily_roi: number;
    total_return: number;
    earned_so_far: number;
    start_date: string;
    end_date: string;
    status: 'active' | 'completed' | 'cancelled';
    auto_compound: boolean;
}

export default function InvestPage() {
    const { user, userProfile } = useUser();
    const { toast } = useToast();
    const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
    const [investAmount, setInvestAmount] = useState("");
    const [isInvesting, setIsInvesting] = useState(false);
    const [calculatorAmount, setCalculatorAmount] = useState("1000");

    const plansOptions = useMemo(() => ({
        table: 'investment_plans',
        filters: [{ column: 'is_active', operator: '==' as const, value: true }],
        enabled: true,
    }), []);

    const userInvestmentsOptions = useMemo(() => ({
        table: 'user_investments',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        orderByColumn: { column: 'created_at', direction: 'desc' as const },
        enabled: !!user,
    }), [user]);

    const { data: plans, isLoading: plansLoading } = useRealtimeCollection<InvestmentPlan>(plansOptions);
    const { data: userInvestments, isLoading: investmentsLoading } = useRealtimeCollection<UserInvestment>(userInvestmentsOptions);

    const activeInvestments = userInvestments?.filter(inv => inv.status === 'active') || [];
    const totalInvested = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalEarning = activeInvestments.reduce((sum, inv) => sum + inv.daily_roi, 0);

    const handleInvest = async () => {
        if (!user || !selectedPlan || !investAmount) return;

        const amount = parseFloat(investAmount);
        if (amount < selectedPlan.min_amount || amount > selectedPlan.max_amount) {
            toast({
                variant: "destructive",
                title: "Invalid Amount",
                description: `Investment amount must be between $${selectedPlan.min_amount} and $${selectedPlan.max_amount}`,
            });
            return;
        }

        if ((userProfile?.balance || 0) < amount) {
            toast({
                variant: "destructive",
                title: "Insufficient Balance",
                description: "Please deposit funds to your wallet first.",
            });
            return;
        }

        setIsInvesting(true);
        try {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + selectedPlan.duration_days);

            const dailyRoi = (amount * selectedPlan.daily_roi_percent) / 100;
            const totalReturn = dailyRoi * selectedPlan.duration_days + (selectedPlan.capital_return ? amount : 0);

            await insertRow('user_investments', {
                user_id: user.uid,
                plan_id: selectedPlan.id,
                plan_name: selectedPlan.name,
                amount: amount,
                daily_roi: dailyRoi,
                total_return: totalReturn,
                earned_so_far: 0,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                status: 'active',
                auto_compound: false,
            });

            await updateRow('users', user.uid, {
                balance: (userProfile?.balance || 0) - amount,
                active_plan: selectedPlan.name,
                daily_claim_amount: (userProfile?.daily_claim_amount || 0) + dailyRoi,
            });

            toast({
                title: "Investment Successful!",
                description: `You have invested $${amount} in ${selectedPlan.name}. Daily ROI: $${dailyRoi.toFixed(2)}`,
            });

            setSelectedPlan(null);
            setInvestAmount("");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Investment Failed",
                description: error.message,
            });
        } finally {
            setIsInvesting(false);
        }
    };

    const calculateReturns = (plan: InvestmentPlan, amount: number) => {
        const dailyRoi = (amount * plan.daily_roi_percent) / 100;
        const totalReturn = dailyRoi * plan.duration_days + (plan.capital_return ? amount : 0);
        return { dailyRoi, totalReturn };
    };

    if (plansLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center">
                    <TrendingUp className="mx-auto h-12 w-12 animate-pulse text-primary" />
                    <p className="mt-4 text-muted-foreground">Loading investment plans...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-[#334C99]">Investment Plans</h1>
                <p className="text-muted-foreground">Choose a plan and start earning daily returns</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Active Investments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeInvestments.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalInvested.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Daily Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">+${totalEarning.toFixed(2)}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="plans" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="plans">Investment Plans</TabsTrigger>
                    <TabsTrigger value="active">My Investments</TabsTrigger>
                    <TabsTrigger value="calculator">ROI Calculator</TabsTrigger>
                </TabsList>

                <TabsContent value="plans" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {plans?.map((plan) => (
                            <Card key={plan.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                                        <Badge variant="default" className="bg-[#334C99]">{plan.daily_roi_percent}% Daily</Badge>
                                    </div>
                                    <CardDescription>{plan.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Min Investment</span>
                                            <span className="font-medium">${plan.min_amount}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Max Investment</span>
                                            <span className="font-medium">${plan.max_amount}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Duration</span>
                                            <span className="font-medium">{plan.duration_days} Days</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Capital Return</span>
                                            <span className="font-medium">{plan.capital_return ? 'Yes' : 'No'}</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        className="w-full bg-[#334C99] hover:bg-[#52BBDB]"
                                        onClick={() => setSelectedPlan(plan)}
                                    >
                                        Invest Now
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="active">
                    <Card>
                        <CardHeader>
                            <CardTitle>My Active Investments</CardTitle>
                            <CardDescription>Track your ongoing investments</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {investmentsLoading ? (
                                <p>Loading...</p>
                            ) : activeInvestments.length === 0 ? (
                                <div className="text-center py-8">
                                    <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <p className="mt-4 text-muted-foreground">No active investments yet</p>
                                    <Button className="mt-4 bg-[#334C99]" onClick={() => document.querySelector('[value="plans"]')?.click()}>
                                        Browse Plans
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeInvestments.map((investment) => (
                                        <Card key={investment.id}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-semibold">{investment.plan_name}</h4>
                                                        <p className="text-sm text-muted-foreground">Invested: ${investment.amount}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-muted-foreground">Daily ROI</p>
                                                        <p className="font-semibold text-green-600">+${investment.daily_roi.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">Earned: ${investment.earned_so_far.toFixed(2)}</span>
                                                    <span className="text-muted-foreground">Ends: {new Date(investment.end_date).toLocaleDateString()}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="calculator">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="h-5 w-5" />
                                ROI Calculator
                            </CardTitle>
                            <CardDescription>Calculate your potential returns</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Investment Amount ($)</Label>
                                <Input
                                    type="number"
                                    value={calculatorAmount}
                                    onChange={(e) => setCalculatorAmount(e.target.value)}
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {plans?.map((plan) => {
                                    const amount = parseFloat(calculatorAmount) || 0;
                                    const { dailyRoi, totalReturn } = calculateReturns(plan, amount);
                                    return (
                                        <Card key={plan.id}>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm">{plan.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span>Daily Return</span>
                                                    <span className="font-semibold text-green-600">${dailyRoi.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span>Total Return</span>
                                                    <span className="font-semibold">${totalReturn.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span>Net Profit</span>
                                                    <span className="font-semibold text-[#334C99]">${(totalReturn - amount).toFixed(2)}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Investment Dialog */}
            <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Invest in {selectedPlan?.name}</DialogTitle>
                        <DialogDescription>
                            Enter the amount you want to invest. Min: ${selectedPlan?.min_amount}, Max: ${selectedPlan?.max_amount}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Investment Amount ($)</Label>
                            <Input
                                type="number"
                                value={investAmount}
                                onChange={(e) => setInvestAmount(e.target.value)}
                                placeholder={`Min: ${selectedPlan?.min_amount}`}
                            />
                            <p className="text-xs text-muted-foreground">
                                Available Balance: ${userProfile?.balance?.toFixed(2) || '0.00'}
                            </p>
                        </div>
                        {investAmount && selectedPlan && (
                            <div className="rounded-lg bg-muted p-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Daily ROI</span>
                                    <span className="font-semibold text-green-600">
                                        ${((parseFloat(investAmount) * selectedPlan.daily_roi_percent) / 100).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Duration</span>
                                    <span className="font-semibold">{selectedPlan.duration_days} Days</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedPlan(null)}>Cancel</Button>
                        <Button
                            onClick={handleInvest}
                            disabled={isInvesting || !investAmount}
                            className="bg-[#334C99]"
                        >
                            {isInvesting ? 'Processing...' : 'Confirm Investment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// NoSsr wrapper for icons
function NoSsr({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return <>{children}</>;
}
