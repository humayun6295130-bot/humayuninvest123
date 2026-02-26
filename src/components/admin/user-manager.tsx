"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc, query, where } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Pencil, UserCog, Briefcase, ShieldAlert, Ban, CheckCircle } from "lucide-react";
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

export function UserManager() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterPlan] = useState("all");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingPortfolio, setViewingPortfolio] = useState<any>(null);
  
  // Form states
  const [newBalance, setNewBalance] = useState<string>("");
  const [newPlan, setNewPlan] = useState<string>("");

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "users");
  }, [firestore]);

  const { data: users, isLoading } = useCollection(usersQuery);

  const filteredUsers = users?.filter(u => {
    const matchesSearch = u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlan = filterRole === "all" || u.activePlan === filterRole;
    
    return matchesSearch && matchesPlan;
  });

  const handleUpdateUser = async () => {
    if (!firestore || !editingUser) return;

    const amount = parseFloat(newBalance);
    if (isNaN(amount)) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid number." });
      return;
    }

    try {
      const userRef = doc(firestore, "users", editingUser.id);
      await updateDoc(userRef, { 
          balance: amount,
          activePlan: newPlan
      });
      toast({ title: "Success", description: `Updated details for ${editingUser.displayName}` });
      setEditingUser(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleToggleStatus = async (user: any) => {
    if (!firestore) return;
    const isSuspended = user.status === 'suspended';
    try {
      const userRef = doc(firestore, "users", user.id);
      await updateDoc(userRef, { status: isSuspended ? 'active' : 'suspended' });
      toast({ 
        title: isSuspended ? "User Activated" : "User Suspended", 
        description: `${user.displayName} status has been updated.` 
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleToggleRole = async (user: any) => {
    if (!firestore) return;
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      const userRef = doc(firestore, "users", user.id);
      await updateDoc(userRef, { role: newRole });
      toast({ title: "Role Updated", description: `${user.displayName} is now an ${newRole}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const PortfoliosWrapper = ({ user }: { user: any }) => {
    const portfoliosQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.id}/portfolios`), where("userId", "==", user.id));
    }, [user, firestore]);

    const { data: portfolios, isLoading: isPortfoliosLoading } = useCollection(portfoliosQuery);
    const portfolio = portfolios?.[0];

    const assetsQuery = useMemoFirebase(() => {
        if (!user || !firestore || !portfolio) return null;
        return collection(firestore, `users/${user.id}/portfolios/${portfolio.id}/assets`);
    }, [user, firestore, portfolio]);

    const { data: assets, isLoading: isAssetsLoading } = useCollection(assetsQuery);

    if (isPortfoliosLoading) return <div className="p-8 text-center text-[#334C99]">Loading user portfolios...</div>;
    if (!portfolio) return <div className="p-8 text-center text-muted-foreground">User has no portfolio.</div>;

    return (
        <div className="mt-4">
             <AssetsTable
                assets={assets || []}
                portfolioId={portfolio.id}
                userId={user.id}
            />
        </div>
    );
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
                    placeholder="Search users..."
                    className="pl-8 w-full sm:w-[250px]"
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
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading users...</TableCell></TableRow>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className={user.status === 'suspended' ? "opacity-50 grayscale" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profilePictureUrl} />
                          <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{user.displayName}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
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
                        {user.activePlan || "None"}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${(user.balance || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="View Portfolio" onClick={() => setViewingPortfolio(user)}>
                          <Briefcase className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit User" onClick={() => {
                          setEditingUser(user);
                          setNewBalance((user.balance || 0).toString());
                          setNewPlan(user.activePlan || "None");
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">No users found.</TableCell></TableRow>
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
                Modify account details for {editingUser?.displayName}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
                Portfolio: {viewingPortfolio?.displayName}
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
