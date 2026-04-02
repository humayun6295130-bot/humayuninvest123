"use client";

import { useState, useMemo, useEffect } from "react";
import { useRealtimeCollection, insertRow, updateRow, useUser } from "@/firebase";
import { applyAdminReferralBonusLedger } from "@/lib/admin-referral-bonus-ledger";
import { db } from "@/firebase/config";
import { doc, updateDoc, increment, setDoc } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Users,
    DollarSign,
    Gift,
    Search,
    Send,
    History,
    CheckCircle,
    Clock,
    XCircle,
    TrendingUp,
    Percent,
    Settings,
    Loader2,
    Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface User {
    id: string;
    email: string;
    display_name?: string;
    username?: string;
    referral_balance?: number;
    referral_code?: string;
    total_referrals?: number;
}

interface ReferralBonus {
    id: string;
    user_id: string;
    user_email?: string;
    from_user_id?: string;
    from_user_email?: string;
    amount: number;
    type: 'commission' | 'manual' | 'bonus' | 'investment';
    level?: number;
    description: string;
    status: 'pending' | 'approved' | 'rejected';
    created_by?: string;
    created_at: string;
}

interface ReferralWithdrawal {
    id: string;
    user_id: string;
    user_email?: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    requested_at: string;
    processed_at?: string;
    processed_by?: string;
    linked_transaction_id?: string;
}

interface ReferralSettings {
    id: string;
    level1_percent: number;
    level2_percent: number;
    level3_percent: number;
    min_withdrawal: number;
    enabled: boolean;
}

function formatAdminDate(iso?: string) {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-US");
}

export function ReferralManager() {
    const { user } = useUser();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showSendBonusDialog, setShowSendBonusDialog] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [bonusAmount, setBonusAmount] = useState("");
    const [bonusDescription, setBonusDescription] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    // Fetch users
    const usersOptions = useMemo(() => ({
        table: 'users',
        enabled: true,
    }), []);

    const bonusesOptions = useMemo(() => ({
        table: 'referral_bonuses',
        limitCount: 400,
        enabled: true,
    }), []);

    const withdrawalsOptions = useMemo(() => ({
        table: 'referral_withdrawals',
        limitCount: 300,
        enabled: true,
    }), []);

    // Fetch settings
    const settingsOptions = useMemo(() => ({
        table: 'referral_settings',
        enabled: true,
    }), []);

    const { data: users, isLoading: usersLoading, error: usersError } = useRealtimeCollection<User>(usersOptions);
    const { data: bonuses, isLoading: bonusesLoading, error: bonusesError } = useRealtimeCollection<ReferralBonus>(bonusesOptions);
    const { data: withdrawals, isLoading: withdrawalsLoading, error: withdrawalsError } = useRealtimeCollection<ReferralWithdrawal>(withdrawalsOptions);
    const { data: settings, error: settingsError } = useRealtimeCollection<ReferralSettings>(settingsOptions);

    const referralSettings = useMemo(() => {
        const list = settings || [];
        const docRow = list.find((s) => s.id === "default") || list[0];
        return (
            docRow || {
                id: "",
                level1_percent: 5,
                level2_percent: 3,
                level3_percent: 2,
                min_withdrawal: 10,
                enabled: true,
            }
        );
    }, [settings]);

    const sortedBonuses = useMemo(() => {
        if (!bonuses?.length) return [];
        return [...bonuses]
            .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
            .slice(0, 120);
    }, [bonuses]);

    const sortedWithdrawals = useMemo(() => {
        if (!withdrawals?.length) return [];
        return [...withdrawals].sort(
            (a, b) => new Date(b.requested_at || 0).getTime() - new Date(a.requested_at || 0).getTime()
        );
    }, [withdrawals]);

    const [settingsDraft, setSettingsDraft] = useState({
        level1_percent: 5,
        level2_percent: 3,
        level3_percent: 2,
        min_withdrawal: 10,
    });

    useEffect(() => {
        if (!showSettingsDialog) return;
        setSettingsDraft({
            level1_percent: referralSettings.level1_percent,
            level2_percent: referralSettings.level2_percent,
            level3_percent: referralSettings.level3_percent,
            min_withdrawal: referralSettings.min_withdrawal,
        });
    }, [showSettingsDialog, referralSettings]);

    const loadError = usersError || bonusesError || withdrawalsError || settingsError;

    // Filter users
    const filteredUsers = useMemo(() => {
        if (!users) return [];
        if (!searchQuery) return users.slice(0, 20);
        const q = searchQuery.toLowerCase();
        return users
            .filter(
                (u) =>
                    u.email?.toLowerCase().includes(q) ||
                    u.username?.toLowerCase().includes(q) ||
                    u.display_name?.toLowerCase().includes(q) ||
                    u.id?.toLowerCase().includes(q) ||
                    u.referral_code?.toLowerCase().includes(q)
            )
            .slice(0, 20);
    }, [users, searchQuery]);

    // Statistics
    const totalBonuses = bonuses?.filter(b => b.status === 'approved').reduce((sum, b) => sum + b.amount, 0) || 0;
    const pendingBonuses = bonuses?.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0) || 0;
    const totalWithdrawals = withdrawals?.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.amount, 0) || 0;
    const pendingWithdrawals = sortedWithdrawals.filter((w) => w.status === "pending");

    const handleSendBonus = async () => {
        if (!selectedUser) return;

        const amount = parseFloat(bonusAmount);
        if (!amount || amount <= 0) {
            toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount" });
            return;
        }

        const memo = bonusDescription.trim();
        if (memo.length < 3) {
            toast({
                variant: "destructive",
                title: "Reason required",
                description: "Write at least 3 characters for the member’s Wallet / history.",
            });
            return;
        }

        setIsSending(true);
        try {
            await applyAdminReferralBonusLedger({
                userId: selectedUser.id,
                userDisplayName: selectedUser.display_name || selectedUser.email || "User",
                userEmail: selectedUser.email || "",
                amount,
                memo,
                extras: { bonusType: "manual" },
            });

            toast({
                title: "Bonus credited",
                description: `$${amount.toFixed(2)} added; member sees it under transactions as Received with your note.`,
            });

            setBonusAmount("");
            setBonusDescription("");
            setShowSendBonusDialog(false);
            setSelectedUser(null);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSending(false);
        }
    };

    const handleProcessWithdrawal = async (withdrawal: ReferralWithdrawal, action: "approve" | "reject") => {
        setIsProcessing(withdrawal.id);
        const now = new Date().toISOString();
        const processor = user?.uid || "admin";
        try {
            const status = action === "approve" ? "approved" : "rejected";

            await updateRow("referral_withdrawals", withdrawal.id, {
                status,
                processed_at: now,
                processed_by: processor,
            });

            // User already had referral_balance reduced when they requested; approve = no extra deduction.
            if (action === "reject" && db) {
                await updateDoc(doc(db, "users", withdrawal.user_id), {
                    referral_balance: increment(withdrawal.amount),
                    updated_at: now,
                });
            }

            if (withdrawal.linked_transaction_id) {
                await updateRow("transactions", withdrawal.linked_transaction_id, {
                    status: action === "approve" ? "completed" : "rejected",
                    processed_at: now,
                    ...(action === "reject" ? { rejection_reason: "Referral withdrawal rejected by admin" } : {}),
                });
            }

            toast({
                title: action === "approve" ? "Withdrawal Approved" : "Withdrawal Rejected",
                description:
                    action === "approve"
                        ? `Payout recorded. Referral balance was already locked at request time.`
                        : `Funds returned to user's referral balance.`,
            });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsProcessing(null);
        }
    };

    const handleSaveSettings = async () => {
        if (!db) {
            toast({ variant: "destructive", title: "Error", description: "Firebase is not configured." });
            return;
        }
        try {
            const payload = {
                level1_percent: Number(settingsDraft.level1_percent) || 0,
                level2_percent: Number(settingsDraft.level2_percent) || 0,
                level3_percent: Number(settingsDraft.level3_percent) || 0,
                min_withdrawal: Number(settingsDraft.min_withdrawal) || 0,
                enabled: referralSettings.enabled !== false,
                updated_at: new Date().toISOString(),
            };
            const targetId = settings?.find((s) => s.id === "default")?.id || settings?.[0]?.id;
            if (targetId) {
                await updateRow("referral_settings", targetId, payload);
            } else {
                await setDoc(doc(db, "referral_settings", "default"), payload, { merge: true });
            }
            toast({ title: "Settings saved", description: "Referral settings have been updated." });
            setShowSettingsDialog(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    return (
        <div className="space-y-6">
            {loadError && (
                <Alert variant="destructive">
                    <AlertTitle>Could not load referral data</AlertTitle>
                    <AlertDescription>{loadError.message}</AlertDescription>
                </Alert>
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Referral Program Management</h2>
                    <p className="text-muted-foreground">Manage referrals, bonuses, and withdrawals</p>
                </div>
                <Button onClick={() => setShowSettingsDialog(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Gift className="h-4 w-4 text-green-500" />
                            Total Bonuses
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">${totalBonuses.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">${pendingBonuses.toFixed(2)} pending</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-blue-500" />
                            Withdrawals
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalWithdrawals.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">{pendingWithdrawals.length} pending</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-500" />
                            Total Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">With referral codes</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Percent className="h-4 w-4 text-orange-500" />
                            Commission Rates
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{referralSettings.level1_percent}%</div>
                        <p className="text-xs text-muted-foreground">L1:{referralSettings.level1_percent}% L2:{referralSettings.level2_percent}% L3:{referralSettings.level3_percent}%</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="send-bonus" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="send-bonus">Send Bonus</TabsTrigger>
                    <TabsTrigger value="withdrawals">
                        Withdrawals {pendingWithdrawals.length > 0 && `(${pendingWithdrawals.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                {/* Send Bonus Tab */}
                <TabsContent value="send-bonus" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Gift className="h-5 w-5" />
                                Send Manual Bonus
                            </CardTitle>
                            <CardDescription>Search for a user and send them a referral bonus</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by email, username, or name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {usersLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <ScrollArea className="h-[400px]">
                                    <div className="space-y-2">
                                        {filteredUsers.map((user) => (
                                            <div
                                                key={user.id}
                                                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setShowSendBonusDialog(true);
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <Users className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium font-mono">
                                                            {user.username?.trim() ? `@${user.username.trim()}` : (user.display_name || "User")}
                                                        </p>
                                                        {user.username?.trim() && (
                                                            <p className="text-sm text-muted-foreground">{user.display_name || "—"}</p>
                                                        )}
                                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold">${(user.referral_balance || 0).toFixed(2)}</p>
                                                    <p className="text-xs text-muted-foreground">Referral Balance</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Withdrawals Tab */}
                <TabsContent value="withdrawals">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Withdrawal Requests
                            </CardTitle>
                            <CardDescription>Approve or reject user withdrawal requests</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {withdrawalsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : sortedWithdrawals.length === 0 ? (
                                <div className="text-center py-8">
                                    <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">No withdrawal requests</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-[400px]">
                                    <div className="space-y-2">
                                        {sortedWithdrawals.map((withdrawal) => (
                                            <div key={withdrawal.id} className="p-4 rounded-lg border">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={
                                                            withdrawal.status === 'pending' ? 'outline' :
                                                                withdrawal.status === 'approved' ? 'default' : 'destructive'
                                                        }>
                                                            {withdrawal.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                                            {withdrawal.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                            {withdrawal.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                                                            {withdrawal.status}
                                                        </Badge>
                                                        <span className="font-semibold">${withdrawal.amount.toFixed(2)}</span>
                                                    </div>
                                                    <span className="text-sm text-muted-foreground">
                                                        {formatAdminDate(withdrawal.requested_at)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm text-muted-foreground">{withdrawal.user_email}</p>
                                                    {withdrawal.status === 'pending' && (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleProcessWithdrawal(withdrawal, 'reject')}
                                                                disabled={isProcessing === withdrawal.id}
                                                            >
                                                                <XCircle className="w-4 h-4 mr-1" />
                                                                Reject
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleProcessWithdrawal(withdrawal, 'approve')}
                                                                disabled={isProcessing === withdrawal.id}
                                                            >
                                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                                Approve
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Bonus History
                            </CardTitle>
                            <CardDescription>View all bonuses sent and commissions earned</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {bonusesLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : sortedBonuses.length === 0 ? (
                                <div className="text-center py-8">
                                    <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">No bonus history</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-[400px]">
                                    <div className="space-y-2">
                                        {sortedBonuses.map((bonus) => (
                                            <div key={bonus.id} className="p-4 rounded-lg border hover:bg-muted/50">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-full flex items-center justify-center",
                                                            bonus.type === 'manual' ? "bg-purple-500/10" :
                                                                bonus.type === 'bonus' ? "bg-blue-500/10" :
                                                                    bonus.type === 'investment' ? "bg-amber-500/10" : "bg-green-500/10"
                                                        )}>
                                                            {bonus.type === 'manual' ? <Gift className="w-4 h-4 text-purple-500" /> :
                                                                bonus.type === 'bonus' ? <Award className="w-4 h-4 text-blue-500" /> :
                                                                    bonus.type === 'investment' ? <TrendingUp className="w-4 h-4 text-amber-600" /> :
                                                                    <TrendingUp className="w-4 h-4 text-green-500" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">+${bonus.amount.toFixed(2)}</p>
                                                            <p className="text-xs text-muted-foreground">{bonus.user_email}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant={bonus.status === 'approved' ? 'default' : 'outline'}>
                                                        {bonus.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <p className="text-muted-foreground">{bonus.description}</p>
                                                    <span className="text-muted-foreground">
                                                        {formatAdminDate(bonus.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Send Bonus Dialog */}
            <Dialog open={showSendBonusDialog} onOpenChange={setShowSendBonusDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send Referral Bonus</DialogTitle>
                        <DialogDescription>
                            Send a manual bonus to {selectedUser?.email}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Current Balance</p>
                            <p className="text-xl font-bold">${(selectedUser?.referral_balance || 0).toFixed(2)}</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Bonus Amount ($)</Label>
                            <Input
                                type="number"
                                value={bonusAmount}
                                onChange={(e) => setBonusAmount(e.target.value)}
                                placeholder="Enter amount"
                                min={0}
                                step={0.01}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description (Optional)</Label>
                            <Textarea
                                value={bonusDescription}
                                onChange={(e) => setBonusDescription(e.target.value)}
                                placeholder="Reason for bonus..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowSendBonusDialog(false)}>Cancel</Button>
                        <Button
                            onClick={handleSendBonus}
                            disabled={isSending || !bonusAmount || parseFloat(bonusAmount) <= 0}
                        >
                            {isSending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                            ) : (
                                <><Send className="mr-2 h-4 w-4" /> Send Bonus</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Settings Dialog */}
            <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Referral Settings</DialogTitle>
                        <DialogDescription>Configure commission rates and withdrawal settings</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Level 1 Commission (%)</Label>
                            <Input
                                type="number"
                                value={settingsDraft.level1_percent}
                                onChange={(e) =>
                                    setSettingsDraft((d) => ({ ...d, level1_percent: parseFloat(e.target.value) || 0 }))
                                }
                            />
                            <p className="text-xs text-muted-foreground">Direct referrals</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Level 2 Commission (%)</Label>
                            <Input
                                type="number"
                                value={settingsDraft.level2_percent}
                                onChange={(e) =>
                                    setSettingsDraft((d) => ({ ...d, level2_percent: parseFloat(e.target.value) || 0 }))
                                }
                            />
                            <p className="text-xs text-muted-foreground">Referrals' referrals</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Level 3 Commission (%)</Label>
                            <Input
                                type="number"
                                value={settingsDraft.level3_percent}
                                onChange={(e) =>
                                    setSettingsDraft((d) => ({ ...d, level3_percent: parseFloat(e.target.value) || 0 }))
                                }
                            />
                            <p className="text-xs text-muted-foreground">Extended network</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Minimum Withdrawal ($)</Label>
                            <Input
                                type="number"
                                value={settingsDraft.min_withdrawal}
                                onChange={(e) =>
                                    setSettingsDraft((d) => ({ ...d, min_withdrawal: parseFloat(e.target.value) || 0 }))
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveSettings}>Save settings</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
