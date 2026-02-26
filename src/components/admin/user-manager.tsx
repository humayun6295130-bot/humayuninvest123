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
import { Search, Pencil, UserCog, Briefcase, ShieldAlert } from "lucide-react";
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

  const filteredUsers = users?.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  // Helper to get portfolio ID for a user (Admin view)
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

    if (isPortfoliosLoading) return <div className="p-8 text-center">Loading user portfolios...</div>;
    if (!portfolio) return <div className="p-8 text-center">User has no portfolio.</div>;

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
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Browse platform users, adjust balances, and manage roles.</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or username..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading users...</TableCell></TableRow>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
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
                      <Badge variant={user.role === 'admin' ? 'default' : 'outline'} className="capitalize">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                        {user.activePlan || "No Plan"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${(user.balance || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" title="View Portfolio" onClick={() => setViewingPortfolio(user)}>
                          <Briefcase className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Edit User" onClick={() => {
                          setEditingUser(user);
                          setNewBalance((user.balance || 0).toString());
                          setNewPlan(user.activePlan || "None");
                        }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Toggle Admin Role" onClick={() => handleToggleRole(user)}>
                          <UserCog className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">No users found.</TableCell></TableRow>
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
              <Button onClick={handleUpdateUser}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Portfolio Viewer Dialog */}
        <Dialog open={!!viewingPortfolio} onOpenChange={() => setViewingPortfolio(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
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
