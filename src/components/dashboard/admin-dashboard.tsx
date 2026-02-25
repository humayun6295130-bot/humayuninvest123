"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminDashboard() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Admin Dashboard</CardTitle>
                    <CardDescription>This is where you can manage application-wide settings and content.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Welcome, admin. You have access to special privileges.</p>
                </CardContent>
            </Card>
        </div>
    );
}
