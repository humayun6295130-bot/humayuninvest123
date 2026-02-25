"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionManager } from "@/components/admin/transaction-manager";

export function AdminDashboard() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Admin Dashboard</CardTitle>
                    <CardDescription>Welcome, admin. This is where you can manage application-wide settings and user activity.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>You have access to special privileges.</p>
                </CardContent>
            </Card>

            <TransactionManager />
        </div>
    );
}

    