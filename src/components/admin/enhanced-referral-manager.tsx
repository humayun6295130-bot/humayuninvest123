"use client";

/**
 * Enhanced Referral Manager with Level-wise Tracking
 * 
 * Features:
 * - Multi-level referral tracking (Level 1, 2, 3)
 * - Admin manual bonus credit
 * - Referral tree visualization
 * - Level-wise commission settings
 * - Referral statistics
 * - Bonus withdrawal management
 */

import { useState, useMemo } from "react";
import { useRealtimeCollection, insertRow, updateRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
    Users,
    DollarSign,
    Gift,
    Wallet,
    Search,
    Send,
    History,
    CheckCircle,
    Clock,
    XCircle,
    TrendingUp,
    UserPlus,
    Percent,
    Settings,
    Award,
    Network,
    ArrowRight,
    Loader2,
    User,
    ChevronRight,
    ChevronDown,
    TreePine
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface User {
    id: string;
    email: string;
    display_name?: string;
    username?: string;
    referral_balance?: number;
    referral_code?: string;
    referred_by?: string;
    total_referrals?: number;
    created_at: string;
}

interface ReferralRelationship {
    id: string;
    referrer_id: string;
    referrer_name?: string;
    referred_user_id: string;
    referred_email: string;
    referred_username?: string;
    level: number; // 1, 2, 3, 4, or 5
    commission_percent: number;
    total_commission: number;
    total_invested: number;
    status: 'active' | 'inactive';
    created_at: string;
}

interface ReferralBonus {
    id: string;
    user_id: string;
    user_email?: string;
    from_user_id?: string;
    from_user_name?: string;
    amount: number;
    level: number;
    type: 'commission' | 'manual' | 'signup_bonus' | 'investment_bonus';
    description: string;
    status: 'pending' | 'approved' | 'rejected';
    created_by?: string;
    created_at: string;
    approved_at?: string;
}

interface ReferralSettings {
    id: string;
    level1_percent: number;
    level2_percent: number;
    level3_percent: number;
    min_withdrawal: number;
    signup_bonus: number;
    enabled: boolean;
}

export function EnhancedReferralManager() {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showBonusDialog, setShowBonusDialog] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [showTreeDialog, setShowTreeDialog] = useState(false);
    const [bonusAmount, setBonusAmount] = useState("");
    const [bonusDescription, setBonusDescription] = useState("");
    const [bonusType, setBonusType] = useState<'manual' | 'signup_bonus' | 'investment_bonus'>('manual');
    const [selectedLevel, setSelectedLevel] = useState<number>(1);
    const [isSending, setIsSending] = useState(false);
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

    // Fetch users
    const usersOptions = useMemo(() => ({
        table: 'users',
        enabled: true,
    }), []);

    // Fetch referrals from the main referrals table (same as user panel)
    const referralsOptions = useMemo(() => ({
        table: 'referrals',
        enabled: true,
    }), []);

    // Fetch bonuses
    const bonusesOptions = useMemo(() => ({
        table: 'referral_bonuses',
        orderByColumn: { column: 'created_at', direction: 'desc' as const },
        enabled: true,
    }), []);

    // Fetch settings
    const settingsOptions = useMemo(() => ({
        table: 'referral_settings',
        limitCount: 1,
        enabled: true,
    }), []);

    const { data: users, isLoading: usersLoading } = useRealtimeCollection<User>(usersOptions);
    const { data: referrals } = useRealtimeCollection<ReferralRelationship>(referralsOptions);
    const { data: bonuses, isLoading: bonusesLoading } = useRealtimeCollection<ReferralBonus>(bonusesOptions);
    const { data: settingsData } = useRealtimeCollection<ReferralSettings>(settingsOptions);

    const settings = settingsData?.[0] || {
        level1_percent: 10,
        level2_percent: 5,
        level3_percent: 2,
        min_withdrawal: 10,
        signup_bonus: 0,
        enabled: true
    };

    // Filter users
    const filteredUsers = useMemo(() => {
        if (!users) return [];
        if (!searchQuery) return users;

        const query = searchQuery.toLowerCase();
        return users.filter(u =>
            u.email?.toLowerCase().includes(query) ||
            u.display_name?.toLowerCase().includes(query) ||
            u.referral_code?.toLowerCase().includes(query)
        );
    }, [users, searchQuery]);

    // Calculate statistics
    const stats = useMemo(() => {
        if (!users || !referrals || !bonuses) return {
            totalUsers: 0,
            totalReferrals: 0,
            level1Count: 0,
            level2Count: 0,
            level3Count: 0,
            totalBonusAmount: 0,
            pendingBonus: 0,
            approvedBonus: 0
        };

        return {
            totalUsers: users.length,
            totalReferrals: referrals.filter(r => r.level === 1).length,
            level1Count: referrals.filter(r => r.level === 1).length,
            level2Count: referrals.filter(r => r.level === 2).length,
            level3Count: referrals.filter(r => r.level === 3).length,
            totalBonusAmount: bonuses.reduce((sum, b) => sum + (b.status === 'approved' ? b.amount : 0), 0),
            pendingBonus: bonuses.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0),
            approvedBonus: bonuses.filter(b => b.status === 'approved').reduce((sum, b) => sum + b.amount, 0)
        };
    }, [users, referrals, bonuses]);

    // Get referral tree for a user
    const getReferralTree = (userId: string, level: number = 1): any[] => {
        if (!referrals || level > 3) return [];

        const directReferrals = referrals.filter(r => r.referrer_id === userId && r.level === 1);

        return directReferrals.map(r => {
            const referredUser = users?.find(u => u.id === r.referred_user_id);
            return {
                ...r,
                user: referredUser,
                children: getReferralTree(r.referred_user_id, level + 1)
            };
        });
    };

    // Send manual bonus
    const handleSendBonus = async () => {
        if (!selectedUser || !bonusAmount || !bonusDescription) return;

        setIsSending(true);
        try {
            await insertRow('referral_bonuses', {
                user_id: selectedUser.id,
                user_email: selectedUser.email,
                amount: parseFloat(bonusAmount),
                level: selectedLevel,
                type: bonusType,
                description: bonusDescription,
                status: 'approved', // Auto-approve admin bonuses
                created_by: 'admin',
                created_at: new Date().toISOString(),
                approved_at: new Date().toISOString()
            });

            // Update user referral balance
            await updateRow('users', selectedUser.id, {
                referral_balance: (selectedUser.referral_balance || 0) + parseFloat(bonusAmount)
            });

            // Create notification
            await insertRow('notifications', {
                user_id: selectedUser.id,
                title: 'Referral Bonus Credited',
                message: `You have received $${bonusAmount} ${bonusType.replace('_', ' ')} bonus!`,
                type: 'referral',
                read: false,
                created_at: new Date().toISOString()
            });

            toast({
                title: "Bonus Credited!",
                description: `Successfully sent $${bonusAmount} to ${selectedUser.display_name || selectedUser.email}`
            });

            setShowBonusDialog(false);
            setBonusAmount("");
            setBonusDescription("");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to send bonus"
            });
        } finally {
            setIsSending(false);
        }
    };

    // Update settings
    const handleUpdateSettings = async (newSettings: Partial<ReferralSettings>) => {
        try {
            if (settingsData?.[0]?.id) {
                await updateRow('referral_settings', settingsData[0].id, {
                    ...newSettings,
                    updated_at: new Date().toISOString()
                });
            } else {
                await insertRow('referral_settings', {
                    ...settings,
                    ...newSettings,
                    created_at: new Date().toISOString()
                });
            }

            toast({
                title: "Settings Updated",
                description: "Referral settings have been updated successfully."
            });
            setShowSettingsDialog(false);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            });
        }
    };

    const toggleExpand = (userId: string) => {
        const newExpanded = new Set(expandedUsers);
        if (newExpanded.has(userId)) {
            newExpanded.delete(userId);
        } else {
            newExpanded.add(userId);
        }
        setExpandedUsers(newExpanded);
    };

    // Render referral tree recursively
    const renderReferralTree = (nodes: any[], level: number = 1) => {
        if (!nodes.length) return null;

        return (
            <div className={`ml-${level * 4} space-y-2`}>
                {nodes.map((node) => (
                    <div key={node.id} className="border-l-2 border-primary/30 pl-4">
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                            <Badge variant="outline">Level {level}</Badge>
                            <span className="font-medium">{node.user?.display_name || node.user?.email}</span>
                            <span className="text-xs text-muted-foreground">({node.user?.referral_code})</span>
                            {node.children?.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleExpand(node.user.id)}
                                >
                                    {expandedUsers.has(node.user.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    {node.children.length} referrals
                                </Button>
                            )}
                        </div>
                        {expandedUsers.has(node.user.id) && renderReferralTree(node.children, level + 1)}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            Total Users
                        </CardDescription>
                        <CardTitle className="text-2xl">{stats.totalUsers}</CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-green-500" />
                            Level 1 Referrals
                        </CardDescription>
                        <CardTitle className="text-2xl text-green-600">{stats.level1Count}</CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-purple-500" />
                            Total Bonuses
                        </CardDescription>
                        <CardTitle className="text-2xl">${stats.totalBonusAmount.toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-500" />
                            Pending Bonus
                        </CardDescription>
                        <CardTitle className="text-2xl text-yellow-600">${stats.pendingBonus.toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Level-wise Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Network className="w-5 h-5" />
                        Level-wise Statistics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Level 1</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.level1Count}</p>
                            <p className="text-xs text-muted-foreground">{settings.level1_percent}% Commission</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Level 2</p>
                            <p className="text-2xl font-bold text-green-600">{stats.level2Count}</p>
                            <p className="text-xs text-muted-foreground">{settings.level2_percent}% Commission</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Level 3</p>
                            <p className="text-2xl font-bold text-purple-600">{stats.level3Count}</p>
                            <p className="text-xs text-muted-foreground">{settings.level3_percent}% Commission</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="users">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="bonuses">Bonuses</TabsTrigger>
                    <TabsTrigger value="trees">Referral Trees</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                {/* Users Tab */}
                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>All Users</CardTitle>
                                    <CardDescription>Manage users and send manual bonuses</CardDescription>
                                </div>
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search users..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
                                <div className="space-y-2">
                                    {usersLoading ? (
                                        <p className="text-center text-muted-foreground py-8">Loading...</p>
                                    ) : filteredUsers.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">No users found</p>
                                    ) : (
                                        filteredUsers.map((user) => {
                                            const userReferrals = referrals?.filter(r => r.referrer_id === user.id && r.level === 1) || [];
                                            return (
                                                <div
                                                    key={user.id}
                                                    className="flex items-center justify-between p-4 bg-muted rounded-lg"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-primary/10 rounded-full">
                                                            <User className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{user.display_name || "Unknown"}</p>
                                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                                            <p className="text-xs text-muted-foreground">Code: {user.referral_code}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold">${user.referral_balance || 0}</p>
                                                        <p className="text-xs text-muted-foreground">{userReferrals.length} referrals</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setShowBonusDialog(true);
                                                            }}
                                                        >
                                                            <Gift className="w-4 h-4 mr-1" />
                                                            Send Bonus
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setShowTreeDialog(true);
                                                            }}
                                                        >
                                                            <TreePine className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Bonuses Tab */}
                <TabsContent value="bonuses">
                    <Card>
                        <CardHeader>
                            <CardTitle>Referral Bonuses</CardTitle>
                            <CardDescription>All referral bonuses and commissions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
                                <div className="space-y-2">
                                    {bonusesLoading ? (
                                        <p className="text-center text-muted-foreground py-8">Loading...</p>
                                    ) : bonuses?.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">No bonuses yet</p>
                                    ) : (
                                        bonuses?.map((bonus) => (
                                            <div
                                                key={bonus.id}
                                                className="flex items-center justify-between p-4 bg-muted rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full ${bonus.status === 'approved' ? 'bg-green-100' :
                                                        bonus.status === 'pending' ? 'bg-yellow-100' :
                                                            'bg-red-100'
                                                        }`}>
                                                        {bonus.status === 'approved' ? (
                                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                                        ) : bonus.status === 'pending' ? (
                                                            <Clock className="w-4 h-4 text-yellow-600" />
                                                        ) : (
                                                            <XCircle className="w-4 h-4 text-red-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{bonus.user_email}</p>
                                                        <p className="text-sm text-muted-foreground">{bonus.description}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="outline">Level {bonus.level}</Badge>
                                                            <Badge variant="secondary">{bonus.type.replace('_', ' ')}</Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-lg">+${bonus.amount}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {format(new Date(bonus.created_at), 'MMM d, yyyy')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Trees Tab */}
                <TabsContent value="trees">
                    <Card>
                        <CardHeader>
                            <CardTitle>Referral Trees</CardTitle>
                            <CardDescription>View complete referral network</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px]">
                                <div className="space-y-4">
                                    {users?.filter(u => !u.referred_by).map((rootUser) => (
                                        <Card key={rootUser.id} className="border-l-4 border-l-primary">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center gap-2">
                                                    <TreePine className="w-5 h-5 text-primary" />
                                                    <CardTitle className="text-lg">{rootUser.display_name || rootUser.email}</CardTitle>
                                                    <Badge>Root</Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                {renderReferralTree(getReferralTree(rootUser.id))}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Referral Settings</CardTitle>
                            <CardDescription>Configure commission percentages and bonuses</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Level 1 Commission (%)</Label>
                                    <Input
                                        type="number"
                                        defaultValue={settings.level1_percent}
                                        onChange={(e) => handleUpdateSettings({ level1_percent: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Level 2 Commission (%)</Label>
                                    <Input
                                        type="number"
                                        defaultValue={settings.level2_percent}
                                        onChange={(e) => handleUpdateSettings({ level2_percent: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Level 3 Commission (%)</Label>
                                    <Input
                                        type="number"
                                        defaultValue={settings.level3_percent}
                                        onChange={(e) => handleUpdateSettings({ level3_percent: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Minimum Withdrawal ($)</Label>
                                    <Input
                                        type="number"
                                        defaultValue={settings.min_withdrawal}
                                        onChange={(e) => handleUpdateSettings({ min_withdrawal: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Signup Bonus ($)</Label>
                                    <Input
                                        type="number"
                                        defaultValue={settings.signup_bonus}
                                        onChange={(e) => handleUpdateSettings({ signup_bonus: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Send Bonus Dialog */}
            <Dialog open={showBonusDialog} onOpenChange={setShowBonusDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send Referral Bonus</DialogTitle>
                        <DialogDescription>
                            Manually credit bonus to {selectedUser?.display_name || selectedUser?.email}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Bonus Type</Label>
                            <Select value={bonusType} onValueChange={(v) => setBonusType(v as any)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manual">Manual Bonus</SelectItem>
                                    <SelectItem value="signup_bonus">Signup Bonus</SelectItem>
                                    <SelectItem value="investment_bonus">Investment Bonus</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Level</Label>
                            <Select value={selectedLevel.toString()} onValueChange={(v) => setSelectedLevel(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Level 1 (Direct)</SelectItem>
                                    <SelectItem value="2">Level 2</SelectItem>
                                    <SelectItem value="3">Level 3</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Amount ($)</Label>
                            <Input
                                type="number"
                                placeholder="Enter bonus amount"
                                value={bonusAmount}
                                onChange={(e) => setBonusAmount(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Enter bonus description..."
                                value={bonusDescription}
                                onChange={(e) => setBonusDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBonusDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSendBonus}
                            disabled={isSending || !bonusAmount || !bonusDescription}
                        >
                            {isSending ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                            ) : (
                                <><Gift className="w-4 h-4 mr-2" /> Send Bonus</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Tree View Dialog */}
            <Dialog open={showTreeDialog} onOpenChange={setShowTreeDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Referral Tree</DialogTitle>
                        <DialogDescription>
                            Complete referral network for {selectedUser?.display_name || selectedUser?.email}
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="h-[400px]">
                        {selectedUser && renderReferralTree(getReferralTree(selectedUser.id))}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
