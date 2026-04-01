"use client";

import { useState } from "react";
import { useRealtimeCollection, insertRow, updateRow, deleteRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
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
    is_active: boolean;
}

export function PlanManager() {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<InvestmentPlan | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        min_amount: "",
        max_amount: "",
        daily_roi_percent: "",
        duration_days: "",
        capital_return: true,
        is_active: true,
    });

    const plansOptions = {
        table: 'investment_plans',
        orderByColumn: { column: 'min_amount', direction: 'asc' as const },
        enabled: true,
    };

    const { data: plans, isLoading } = useRealtimeCollection<InvestmentPlan>(plansOptions);

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            min_amount: "",
            max_amount: "",
            daily_roi_percent: "",
            duration_days: "",
            capital_return: true,
            is_active: true,
        });
        setEditingPlan(null);
    };

    const handleEdit = (plan: InvestmentPlan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            description: plan.description,
            min_amount: plan.min_amount.toString(),
            max_amount: plan.max_amount.toString(),
            daily_roi_percent: plan.daily_roi_percent.toString(),
            duration_days: plan.duration_days.toString(),
            capital_return: plan.capital_return,
            is_active: plan.is_active,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (planId: string) => {
        if (!confirm("Are you sure you want to delete this plan?")) return;

        try {
            await deleteRow('investment_plans', planId);
            toast({ title: "Plan deleted successfully" });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const handleSubmit = async () => {
        try {
            const planData = {
                name: formData.name,
                description: formData.description,
                min_amount: parseFloat(formData.min_amount),
                max_amount: parseFloat(formData.max_amount),
                daily_roi_percent: parseFloat(formData.daily_roi_percent),
                duration_days: parseInt(formData.duration_days),
                capital_return: formData.capital_return,
                is_active: formData.is_active,
            };

            if (editingPlan) {
                await updateRow('investment_plans', editingPlan.id, planData);
                toast({ title: "Plan updated successfully" });
            } else {
                await insertRow('investment_plans', planData);
                toast({ title: "Plan created successfully" });
            }

            setIsDialogOpen(false);
            resetForm();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    if (isLoading) {
        return <div className="text-center py-8">Loading plans...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Investment Plans</h2>
                <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Plan
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plans?.map((plan) => (
                    <Card key={plan.id}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{plan.name}</CardTitle>
                                <Badge variant={plan.is_active ? "default" : "secondary"}>
                                    {plan.is_active ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                            <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Min/Max</span>
                                <span>${plan.min_amount} - ${plan.max_amount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Daily %</span>
                                <span className="text-green-600 font-medium">{plan.daily_roi_percent}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Duration</span>
                                <span>{plan.duration_days} days</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Capital Return</span>
                                <span>{plan.capital_return ? "Yes" : "No"}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(plan)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </Button>
                            <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDelete(plan.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {plans?.length === 0 && (
                <Card className="p-8 text-center">
                    <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">No investment plans yet</p>
                    <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                        Create your first plan
                    </Button>
                </Card>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
                        <DialogDescription>
                            Configure the investment plan details
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Plan Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Starter Plan"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of the plan"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Min Amount ($)</Label>
                                <Input
                                    type="number"
                                    value={formData.min_amount}
                                    onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Amount ($)</Label>
                                <Input
                                    type="number"
                                    value={formData.max_amount}
                                    onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Daily percent (%)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.daily_roi_percent}
                                    onChange={(e) => setFormData({ ...formData, daily_roi_percent: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Duration (Days)</Label>
                                <Input
                                    type="number"
                                    value={formData.duration_days}
                                    onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={formData.capital_return}
                                    onCheckedChange={(checked) => setFormData({ ...formData, capital_return: checked })}
                                />
                                <Label>Return Capital</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                />
                                <Label>Active</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} className="bg-[#334C99]">
                            {editingPlan ? "Update Plan" : "Create Plan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
