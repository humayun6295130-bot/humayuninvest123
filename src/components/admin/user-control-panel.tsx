"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRealtimeCollection, updateRow, deleteRow, insertRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Pencil, UserCog, Ban, CheckCircle, Trash2, Wallet, Gift, TrendingUp, Copy, Check, ExternalLink, UserPlus, ArrowUpDown } from "lucide-react";
import { formatSupportId } from "@/lib/support-id";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { isAdminRoleValue } from "@/lib/user-role";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface User {
    id: string;
    email: string;
    display_name?: string;
    username?: string;
    support_id?: string;
    status?: 'active' | 'suspended' | 'banned';
    role?: 'user' | 'admin';
    balance?: number;
    referral_balance?: number;
    active_plan?: string;
    daily_claim_amount?: number;
    created_at?: string;
    last_login?: string;
    wallet_address?: string;
    total_invested?: number;
    total_earned?: number;
    // Level system fields
    current_level?: number;
    income_percent?: number;
    level_name?: string;
    // System control fields
    auto_daily_earnings?: boolean;
    auto_level_upgrade?: boolean;
    team_commission_enabled?: boolean;
}

export function UserControlPanel() {
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const qFromUrl = searchParams.get("q") ?? "";
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (qFromUrl) setSearchTerm(qFromUrl);
    }, [qFromUrl]);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<{ field: keyof User; order: 'asc' | 'desc' }>({ field: 'created_at', order: 'desc' });

    // Dialog states
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showBonusDialog, setShowBonusDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showUserDetails, setShowUserDetails] = useState(false);

    // Form states
    const [editForm, setEditForm] = useState({
        balance: "",
        referral_balance: "",
        daily_claim_amount: "",
        active_plan: "",
        status: "",
        role: "",
    });

    const [bonusForm, setBonusForm] = useState({
        amount: "",
        type: "manual" as 'manual' | 'external_wallet' | 'binance' | 'trust_wallet',
        description: "",
        wallet_tx_id: "",
    });

    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Fetch users
    const usersOptions = useMemo(() => ({
        table: 'users',
        enabled: true,
    }), []);

    const { data: users, isLoading } = useRealtimeCollection<User>(usersOptions);

    // Filter and sort users
    const filteredUsers = useMemo(() => {
        if (!users) return [];

        let result = users.filter((user) => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                user.email?.toLowerCase().includes(searchLower) ||
                user.display_name?.toLowerCase().includes(searchLower) ||
                user.username?.toLowerCase().includes(searchLower) ||
                user.support_id?.toString().includes(searchTerm) ||
                user.wallet_address?.toLowerCase().includes(searchLower);

            const matchesStatus = statusFilter === "all" || user.status === statusFilter;
            const matchesRole =
                roleFilter === "all" ||
                (roleFilter === "admin" ? isAdminRoleValue(user.role) : user.role === roleFilter);

            return matchesSearch && matchesStatus && matchesRole;
        });

        // Sort
        result.sort((a, b) => {
            const aVal = a[sortBy.field] ?? 0;
            const bVal = b[sortBy.field] ?? 0;
            if (sortBy.order === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        });

        return result;
    }, [users, searchTerm, statusFilter, roleFilter, sortBy]);

    // Stats
    const stats = useMemo(() => {
        if (!users) return { total: 0, active: 0, suspended: 0, admins: 0, totalBalance: 0 };
        return {
            total: users.length,
            active: users.filter(u => u.status === 'active' || !u.status).length,
            suspended: users.filter(u => u.status === 'suspended' || u.status === 'banned').length,
            admins: users.filter(u => isAdminRoleValue(u.role)).length,
            totalBalance: users.reduce((sum, u) => sum + (u.balance || 0), 0),
            totalReferralBalance: users.reduce((sum, u) => sum + (u.referral_balance || 0), 0),
        };
    }, [users]);

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setEditForm({
            balance: (user.balance || 0).toString(),
            referral_balance: (user.referral_balance || 0).toString(),
            daily_claim_amount: (user.daily_claim_amount || 0).toString(),
            active_plan: user.active_plan || "None",
            status: user.status || "active",
            role: user.role || "user",
        });
        setShowEditDialog(true);
    };

    const handleSaveUser = async () => {
        if (!selectedUser) return;

        setIsProcessing(true);
        try {
            await updateRow("users", selectedUser.id, {
                balance: parseFloat(editForm.balance) || 0,
                referral_balance: parseFloat(editForm.referral_balance) || 0,
                daily_claim_amount: parseFloat(editForm.daily_claim_amount) || 0,
                active_plan: editForm.active_plan === "None" ? null : editForm.active_plan,
                status: editForm.status,
                role: editForm.role,
                updated_at: new Date().toISOString(),
            });

            toast({
                title: "User Updated",
                description: `${selectedUser.display_name || selectedUser.email} has been updated successfully.`,
            });
            setShowEditDialog(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSendBonus = async () => {
        if (!selectedUser) return;

        const amount = parseFloat(bonusForm.amount);
        if (!amount || amount <= 0) {
            toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount" });
            return;
        }

        setIsProcessing(true);
        try {
            // Create bonus record
            await insertRow('referral_bonuses', {
                user_id: selectedUser.id,
                user_email: selectedUser.email,
                amount: amount,
                type: bonusForm.type,
                description: bonusForm.description || `Bonus from ${bonusForm.type}`,
                wallet_tx_id: bonusForm.wallet_tx_id || null,
                status: 'approved',
                created_at: new Date().toISOString(),
                created_by: 'admin',
            });

            // Update user referral balance
            await updateRow('users', selectedUser.id, {
                referral_balance: (selectedUser.referral_balance || 0) + amount,
            });

            toast({
                title: "Bonus Credited! 🎉",
                description: `$${amount.toFixed(2)} has been added to ${selectedUser.email}'s referral balance from ${bonusForm.type}.`,
            });

            setBonusForm({ amount: "", type: "manual", description: "", wallet_tx_id: "" });
            setShowBonusDialog(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        setIsProcessing(true);
        try {
            await deleteRow("users", selectedUser.id);
            toast({
                title: "User Deleted",
                description: `${selectedUser.display_name || selectedUser.email} has been permanently deleted.`,
            });
            setShowDeleteDialog(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const copyToClipboard = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        toast({ title: "Copied!", description: "Copied to clipboard" });
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-green-600">Active</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-red-600">Suspended</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.suspended}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-blue-600">Admins</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.admins}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-purple-600">Total Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">${stats.totalBalance?.toLocaleString('en-US')}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-orange-600">Referral Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">${stats.totalReferralBalance?.toLocaleString('en-US')}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Search, filter and manage all platform users</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, username, support ID or wallet address..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Filter by Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="banned">Banned</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Filter by Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
                <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Level</TableHead>
                                    <TableHead>Support ID</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                    <TableHead className="text-right">Referral</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center">Loading users...</TableCell>
                                    </TableRow>
                                ) : filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.id} className={user.status === 'suspended' || user.status === 'banned' ? "opacity-50 bg-red-50/50" : ""}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={`https://picsum.photos/seed/${user.id}/100/100`} />
                                                        <AvatarFallback>{user.display_name?.[0] || user.email?.[0] || 'U'}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-medium text-sm">{user.display_name || 'N/A'}</div>
                                                        <div className="text-xs text-muted-foreground">{user.email}</div>
                                                        {user.username && (
                                                            <div className="text-xs text-muted-foreground">@{user.username}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`
                                                    ${user.current_level === 1 ? 'bg-gray-500' :
                                                        user.current_level === 2 ? 'bg-blue-500' :
                                                            user.current_level === 3 ? 'bg-slate-400' :
                                                                user.current_level === 4 ? 'bg-yellow-500' :
                                                                    user.current_level === 5 ? 'bg-purple-500' : 'bg-gray-500'} text-white text-[10px]`}
                                                >
                                                    L{user.current_level || 1}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {user.support_id ? (
                                                    <div className="flex items-center gap-1">
                                                        <code className="px-2 py-1 bg-primary/10 rounded text-xs font-mono font-semibold text-primary">
                                                            {formatSupportId(user.support_id)}
                                                        </code>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => copyToClipboard(user.support_id!, user.id)}
                                                        >
                                                            {copiedId === user.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">No ID</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={user.status === 'suspended' ? 'secondary' : user.status === 'banned' ? 'destructive' : 'default'}
                                                    className="text-[10px] capitalize"
                                                >
                                                    {user.status || 'active'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={isAdminRoleValue(user.role) ? 'default' : 'outline'} className="capitalize text-[10px]">
                                                    {user.role || 'user'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-semibold text-primary">
                                                    {user.active_plan || "None"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                ${(user.balance || 0).toLocaleString('en-US')}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-orange-600">
                                                ${(user.referral_balance || 0).toLocaleString('en-US')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8"
                                                        title="View Details"
                                                        onClick={() => { setSelectedUser(user); setShowUserDetails(true); }}
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-green-600"
                                                        title="Send Bonus"
                                                        onClick={() => { setSelectedUser(user); setShowBonusDialog(true); }}
                                                    >
                                                        <Gift className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8"
                                                        title="Edit User"
                                                        onClick={() => handleEditUser(user)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-red-600"
                                                        title="Delete User"
                                                        onClick={() => { setSelectedUser(user); setShowDeleteDialog(true); }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                                            No users found matching your criteria.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Edit User Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>Update user details and settings</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Balance ($)</Label>
                                <Input
                                    type="number"
                                    value={editForm.balance}
                                    onChange={(e) => setEditForm({ ...editForm, balance: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Referral Balance ($)</Label>
                                <Input
                                    type="number"
                                    value={editForm.referral_balance}
                                    onChange={(e) => setEditForm({ ...editForm, referral_balance: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Daily Claim Amount ($)</Label>
                                <Input
                                    type="number"
                                    value={editForm.daily_claim_amount}
                                    onChange={(e) => setEditForm({ ...editForm, daily_claim_amount: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Active Plan</Label>
                                <Select value={editForm.active_plan} onValueChange={(v) => setEditForm({ ...editForm, active_plan: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="None">None</SelectItem>
                                        <SelectItem value="Starter Plan">Starter Plan</SelectItem>
                                        <SelectItem value="Growth Plan">Growth Plan</SelectItem>
                                        <SelectItem value="Professional Plan">Professional Plan</SelectItem>
                                        <SelectItem value="Enterprise Plan">Enterprise Plan</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="suspended">Suspended</SelectItem>
                                        <SelectItem value="banned">Banned</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveUser} disabled={isProcessing}>
                            {isProcessing ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Send Bonus Dialog */}
            <Dialog open={showBonusDialog} onOpenChange={setShowBonusDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Send Referral Bonus</DialogTitle>
                        <DialogDescription>
                            Credit bonus to {selectedUser?.email}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Current Referral Balance:</span>
                                <span className="font-bold">${(selectedUser?.referral_balance || 0).toLocaleString('en-US')}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Bonus Source</Label>
                            <Select
                                value={bonusForm.type}
                                onValueChange={(v: any) => setBonusForm({ ...bonusForm, type: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manual">Manual / System</SelectItem>
                                    <SelectItem value="binance">Binance Wallet</SelectItem>
                                    <SelectItem value="trust_wallet">Trust Wallet</SelectItem>
                                    <SelectItem value="external_wallet">Other External Wallet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Amount ($)</Label>
                            <Input
                                type="number"
                                placeholder="Enter bonus amount"
                                value={bonusForm.amount}
                                onChange={(e) => setBonusForm({ ...bonusForm, amount: e.target.value })}
                            />
                        </div>
                        {(bonusForm.type === 'binance' || bonusForm.type === 'trust_wallet' || bonusForm.type === 'external_wallet') && (
                            <div className="space-y-2">
                                <Label>Wallet Transaction ID</Label>
                                <Input
                                    placeholder="Enter external wallet transaction hash"
                                    value={bonusForm.wallet_tx_id}
                                    onChange={(e) => setBonusForm({ ...bonusForm, wallet_tx_id: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    This will be recorded for tracking purposes
                                </p>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Description (Optional)</Label>
                            <Input
                                placeholder="Bonus description"
                                value={bonusForm.description}
                                onChange={(e) => setBonusForm({ ...bonusForm, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBonusDialog(false)}>Cancel</Button>
                        <Button onClick={handleSendBonus} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                            {isProcessing ? "Processing..." : "Credit Bonus"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete User Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedUser?.display_name || selectedUser?.email}?
                            This action cannot be undone and all user data will be permanently removed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteUser} disabled={isProcessing}>
                            {isProcessing ? "Deleting..." : "Delete Permanently"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* User Details Dialog */}
            <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>User Details</DialogTitle>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={`https://picsum.photos/seed/${selectedUser.id}/200/200`} />
                                    <AvatarFallback className="text-2xl">{selectedUser.display_name?.[0] || 'U'}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-xl font-bold">{selectedUser.display_name || 'N/A'}</h3>
                                    <p className="text-muted-foreground">{selectedUser.email}</p>
                                    {selectedUser.username && <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>}
                                </div>
                            </div>
                            <Separator />

                            {/* Level & System Status */}
                            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Level & System Status
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded">
                                        <span className="text-muted-foreground">Level:</span>
                                        <Badge className={`
                                            ${selectedUser.current_level === 1 ? 'bg-gray-500' :
                                                selectedUser.current_level === 2 ? 'bg-blue-500' :
                                                    selectedUser.current_level === 3 ? 'bg-slate-400' :
                                                        selectedUser.current_level === 4 ? 'bg-yellow-500' :
                                                            selectedUser.current_level === 5 ? 'bg-purple-500' : 'bg-gray-500'} text-white`}
                                        >
                                            {selectedUser.current_level || 1} - {selectedUser.level_name || 'Starter'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded">
                                        <span className="text-muted-foreground">Daily %:</span>
                                        <span className="font-semibold text-green-600">{selectedUser.income_percent || 1.5}%</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded">
                                        <span className="text-muted-foreground">Auto Earnings:</span>
                                        <Badge variant={selectedUser.auto_daily_earnings !== false ? 'default' : 'secondary'}>
                                            {selectedUser.auto_daily_earnings !== false ? 'ON' : 'OFF'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded">
                                        <span className="text-muted-foreground">Auto Level:</span>
                                        <Badge variant={selectedUser.auto_level_upgrade !== false ? 'default' : 'secondary'}>
                                            {selectedUser.auto_level_upgrade !== false ? 'ON' : 'OFF'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded col-span-2">
                                        <span className="text-muted-foreground">Team Commission:</span>
                                        <Badge variant={selectedUser.team_commission_enabled !== false ? 'default' : 'secondary'}>
                                            {selectedUser.team_commission_enabled !== false ? 'ENABLED' : 'DISABLED'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <Separator />
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Support ID:</span>
                                    <p className="font-mono font-semibold">{selectedUser.support_id ? formatSupportId(selectedUser.support_id) : 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Status:</span>
                                    <p className="capitalize font-semibold">{selectedUser.status || 'active'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Role:</span>
                                    <p className="capitalize font-semibold">{selectedUser.role || 'user'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Active Plan:</span>
                                    <p className="font-semibold text-primary">{selectedUser.active_plan || 'None'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Balance:</span>
                                    <p className="font-semibold">${(selectedUser.balance || 0).toLocaleString('en-US')}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Referral Balance:</span>
                                    <p className="font-semibold text-orange-600">${(selectedUser.referral_balance || 0).toLocaleString('en-US')}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Daily Claim:</span>
                                    <p className="font-semibold">${(selectedUser.daily_claim_amount || 0).toLocaleString('en-US')}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Total Invested:</span>
                                    <p className="font-semibold">${(selectedUser.total_invested || 0).toLocaleString('en-US')}</p>
                                </div>
                            </div>
                            {selectedUser.wallet_address && (
                                <>
                                    <Separator />
                                    <div>
                                        <span className="text-muted-foreground text-sm">Wallet Address:</span>
                                        <p className="font-mono text-xs break-all">{selectedUser.wallet_address}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUserDetails(false)}>Close</Button>
                        <Button onClick={() => { setShowUserDetails(false); handleEditUser(selectedUser!); }}>Edit User</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
