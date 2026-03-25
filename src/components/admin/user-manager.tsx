"use client";

import { useRealtimeCollection, updateRow, deleteRow, useUser } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Pencil, UserCog, Briefcase, Ban, CheckCircle, Hash, Copy, Check, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { AssetsTable } from "@/components/portfolio/assets-table";

function PortfoliosWrapper({ user: targetUser }: { user: any }) {
  const portfoliosOptions = useMemo(() => ({
    table: 'portfolios',
    filters: [{ column: 'user_id', operator: '==' as const, value: targetUser.id }],
    limitCount: 1,
    enabled: !!targetUser,
  }), [targetUser]);

  const { data: portfolios, isLoading: isPortfoliosLoading } = useRealtimeCollection(portfoliosOptions);
  const portfolio = portfolios?.[0];

  const assetsOptions = useMemo(() => ({
    table: 'assets',
    filters: portfolio ? [{ column: 'portfolio_id', operator: '==' as const, value: portfolio.id }] : [],
    enabled: !!targetUser && !!portfolio,
  }), [targetUser, portfolio]);

  const { data: assets } = useRealtimeCollection(assetsOptions);

  if (isPortfoliosLoading) return <div className="p-8 text-center text-[#334C99]">Loading user portfolios...</div>;
  if (!portfolio) return <div className="p-8 text-center text-muted-foreground">User has no portfolio.</div>;

  return (
    <div className="mt-4">
      <AssetsTable
        assets={assets || []}
        portfolioId={portfolio.id}
        userId={targetUser.id}
      />
    </div>
  );
}

export function UserManager() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterPlan] = useState("all");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingPortfolio, setViewingPortfolio] = useState<any>(null);

  const [newBalance, setNewBalance] = useState<string>("");
  const [newClaimAmount, setNewClaimAmount] = useState<string>("");
  const [newPlan, setNewPlan] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const usersOptions = useMemo(() => ({
    table: 'users',
    enabled: true,
  }), []);

  const { data: users, isLoading } = useRealtimeCollection(usersOptions);

  const filteredUsers = users?.filter((u: any) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = u.email?.toLowerCase().includes(searchLower) ||
      u.display_name?.toLowerCase().includes(searchLower) ||
      u.username?.toLowerCase().includes(searchLower) ||
      u.support_id?.toString().includes(searchTerm); // Search by Support ID

    const matchesPlan = filterRole === "all" || u.active_plan === filterRole;

    return matchesSearch && matchesPlan;
  });

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    const amount = parseFloat(newBalance);
    const claimAmount = parseFloat(newClaimAmount || "0");
    if (isNaN(amount) || isNaN(claimAmount)) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter valid numbers." });
      return;
    }

    try {
      await updateRow("users", editingUser.id, {
        balance: amount,
        daily_claim_amount: claimAmount,
        active_plan: newPlan
      });
      toast({ title: "Success", description: `Updated details for ${editingUser.display_name}` });
      setEditingUser(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleToggleStatus = async (user: any) => {
    const isSuspended = user.status === 'suspended';
    try {
      await updateRow("users", user.id, { status: isSuspended ? 'active' : 'suspended' });
      toast({
        title: isSuspended ? "User Activated" : "User Suspended",
        description: `${user.display_name} status has been updated.`
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleToggleRole = async (user: any) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await updateRow("users", user.id, { role: newRole });
      toast({ title: "Role Updated", description: `${user.display_name} is now an ${newRole}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Are you sure you want to delete ${user.display_name}? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteRow("users", user.id);
      toast({ title: "User Deleted", description: `${user.display_name} has been permanently deleted.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Browse platform users, adjust balances, and manage roles.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or Support ID..."
                  className="pl-8 w-full sm:w-[280px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterPlan}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="None">No Plan</SelectItem>
                  <SelectItem value="Starter Plan">Starter</SelectItem>
                  <SelectItem value="Growth Plan">Growth</SelectItem>
                  <SelectItem value="Professional Plan">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Support ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Daily Claim</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading users...</TableCell></TableRow>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user: any) => (
                  <TableRow key={user.id} className={user.status === 'suspended' ? "opacity-50 grayscale" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profile_picture_url} />
                          <AvatarFallback>{user.display_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{user.display_name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.support_id ? (
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-primary/10 rounded text-xs font-mono font-semibold text-primary">
                            {formatSupportId(user.support_id)}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={async () => {
                              await navigator.clipboard.writeText(user.support_id);
                              setCopiedId(user.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                          >
                            {copiedId === user.id ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No ID</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'suspended' ? 'destructive' : 'default'} className="text-[10px]">
                        {user.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'outline'} className="capitalize text-[10px]">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold text-[#334C99]">
                        {user.active_plan || "None"}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${(user.daily_claim_amount || 0).toLocaleString('en-US')}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${(user.balance || 0).toLocaleString('en-US')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="View Portfolio" onClick={() => setViewingPortfolio(user)}>
                          <Briefcase className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit User" onClick={() => {
                          setEditingUser(user);
                          setNewBalance((user.balance || 0).toString());
                          setNewClaimAmount((user.daily_claim_amount || 0).toString());
                          setNewPlan(user.active_plan || "None");
                        }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-8 w-8 ${user.status === 'suspended' ? 'text-green-600' : 'text-orange-600'}`}
                          title={user.status === 'suspended' ? "Activate User" : "Suspend User"}
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.status === 'suspended' ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Toggle Admin Role" onClick={() => handleToggleRole(user)}>
                          <UserCog className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700" title="Delete User" onClick={() => handleDeleteUser(user)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="h-24 text-center">No users found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Edit User Details Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Details</DialogTitle>
              <DialogDescription>
                Modify account details for {editingUser?.display_name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Support ID Display */}
              {editingUser?.support_id && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <label className="text-sm font-medium text-primary flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Support ID
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-lg font-mono font-bold text-primary">
                      {formatSupportId(editingUser.support_id)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={async () => {
                        await navigator.clipboard.writeText(editingUser.support_id);
                        toast({ title: "Copied", description: "Support ID copied to clipboard" });
                      }}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    User provides this ID when contacting support
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Balance (USD)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Daily Claim Amount (USD)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newClaimAmount}
                  onChange={(e) => setNewClaimAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Investment Plan</label>
                <Select value={newPlan} onValueChange={setNewPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Starter Plan">Starter Plan</SelectItem>
                    <SelectItem value="Growth Plan">Growth Plan</SelectItem>
                    <SelectItem value="Professional Plan">Professional Plan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button onClick={handleUpdateUser} className="bg-[#334C99]">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Portfolio Viewer Dialog */}
        <Dialog open={!!viewingPortfolio} onOpenChange={() => setViewingPortfolio(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#334C99]">
                <Briefcase className="h-5 w-5" />
                Portfolio: {viewingPortfolio?.display_name}
              </DialogTitle>
              <DialogDescription>
                Manage individual assets and holdings for this user.
              </DialogDescription>
            </DialogHeader>

            {viewingPortfolio && <PortfoliosWrapper user={viewingPortfolio} />}

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setViewingPortfolio(null)}>Close Viewer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}
