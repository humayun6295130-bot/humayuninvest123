"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import {
    Shield,
    Users,
    Settings,
    Bell,
    Database,
    Globe,
    FileText,
    Lock,
    Activity,
    Mail,
    ExternalLink
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function AdminSettings() {
    const { userProfile } = useUser();
    const { toast } = useToast();

    // System Settings State
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [newRegistrations, setNewRegistrations] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);

    const handleMaintenanceToggle = (checked: boolean) => {
        setMaintenanceMode(checked);
        toast({
            title: checked ? "Maintenance Mode Enabled" : "Maintenance Mode Disabled",
            description: checked
                ? "Users will see a maintenance message."
                : "Platform is now accessible to all users.",
        });
    };

    const handleRegistrationToggle = (checked: boolean) => {
        setNewRegistrations(checked);
        toast({
            title: checked ? "Registrations Enabled" : "Registrations Disabled",
            description: checked
                ? "New users can now register."
                : "New user registrations are temporarily closed.",
        });
    };

    const handleSystemAction = (action: string) => {
        toast({
            title: "Action Triggered",
            description: `${action} - This would perform the action in production.`,
        });
    };

    return (
        <div className="space-y-6">
            {/* Admin Overview Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        <CardTitle>Administrator Overview</CardTitle>
                    </div>
                    <CardDescription>Manage global application settings and configurations.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                        <div className="space-y-0.5">
                            <p className="text-base font-semibold">Admin Access</p>
                            <p className="text-sm text-muted-foreground">
                                You have full administrative privileges.
                            </p>
                        </div>
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                            <Shield className="w-3 h-3 mr-1" />
                            {userProfile?.role === "super_admin" ? "Super Admin" : "Admin"}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* System Settings Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" />
                        <CardTitle>System Settings</CardTitle>
                    </div>
                    <CardDescription>Control platform-wide settings and features.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="maintenance-mode" className="text-base">Maintenance Mode</Label>
                            <p className="text-sm text-muted-foreground">
                                Put the platform in maintenance mode. Only admins can access.
                            </p>
                        </div>
                        <Switch
                            id="maintenance-mode"
                            checked={maintenanceMode}
                            onCheckedChange={handleMaintenanceToggle}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="new-registrations" className="text-base">New Registrations</Label>
                            <p className="text-sm text-muted-foreground">
                                Allow new users to register on the platform.
                            </p>
                        </div>
                        <Switch
                            id="new-registrations"
                            checked={newRegistrations}
                            onCheckedChange={handleRegistrationToggle}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="admin-emails" className="text-base">Admin Email Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                                Receive email alerts for important system events.
                            </p>
                        </div>
                        <Switch
                            id="admin-emails"
                            checked={emailNotifications}
                            onCheckedChange={setEmailNotifications}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        <CardTitle>Quick Actions</CardTitle>
                    </div>
                    <CardDescription>Perform common administrative tasks.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-2">
                        <Button variant="outline" className="justify-start" asChild>
                            <a href="/admin">
                                <Users className="w-4 h-4 mr-2" />
                                Manage Users
                                <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                            </a>
                        </Button>
                        <Button variant="outline" className="justify-start" onClick={() => handleSystemAction("Clear Cache")}>
                            <Database className="w-4 h-4 mr-2" />
                            Clear System Cache
                        </Button>
                        <Button variant="outline" className="justify-start" onClick={() => handleSystemAction("Backup Database")}>
                            <Database className="w-4 h-4 mr-2" />
                            Backup Database
                        </Button>
                        <Button variant="outline" className="justify-start" onClick={() => handleSystemAction("Send Announcement")}>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Announcement
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Platform Configuration Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-primary" />
                        <CardTitle>Platform Configuration</CardTitle>
                    </div>
                    <CardDescription>Configure platform-wide settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium">Platform Name</p>
                            <p className="text-xs text-muted-foreground">InvestPro Platform</p>
                        </div>
                        <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium">Default Currency</p>
                            <p className="text-xs text-muted-foreground">USD - US Dollar</p>
                        </div>
                        <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium">Minimum Deposit</p>
                            <p className="text-xs text-muted-foreground">$10.00</p>
                        </div>
                        <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium">Withdrawal Fee</p>
                            <p className="text-xs text-muted-foreground">2%</p>
                        </div>
                        <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Security & Logs Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-primary" />
                        <CardTitle>Security & Logs</CardTitle>
                    </div>
                    <CardDescription>Monitor security and access logs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <Button variant="outline" className="justify-start" onClick={() => handleSystemAction("View Access Logs")}>
                            <FileText className="w-4 h-4 mr-2" />
                            View Access Logs
                        </Button>
                        <Button variant="outline" className="justify-start" onClick={() => handleSystemAction("Security Audit")}>
                            <Shield className="w-4 h-4 mr-2" />
                            Security Audit
                        </Button>
                        <Button variant="outline" className="justify-start" onClick={() => handleSystemAction("Failed Logins")}>
                            <Activity className="w-4 h-4 mr-2" />
                            Failed Login Attempts
                        </Button>
                        <Button variant="outline" className="justify-start" onClick={() => handleSystemAction("API Usage")}>
                            <Database className="w-4 h-4 mr-2" />
                            API Usage Stats
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* System Status Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        <CardTitle>System Status</CardTitle>
                    </div>
                    <CardDescription>Current system health and status.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-green-500/5 border-green-500/20">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-sm font-medium">Database</span>
                            </div>
                            <Badge variant="outline" className="text-green-500 border-green-500/20">Operational</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-green-500/5 border-green-500/20">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-sm font-medium">Authentication</span>
                            </div>
                            <Badge variant="outline" className="text-green-500 border-green-500/20">Operational</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-green-500/5 border-green-500/20">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-sm font-medium">Payment Gateway</span>
                            </div>
                            <Badge variant="outline" className="text-green-500 border-green-500/20">Operational</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-green-500/5 border-green-500/20">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-sm font-medium">Email Service</span>
                            </div>
                            <Badge variant="outline" className="text-green-500 border-green-500/20">Operational</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
