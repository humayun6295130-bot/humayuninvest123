"use client";

import { useState } from "react";
import { useUser, useRealtimeCollection, insertRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, MessageSquare, Plus, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SupportTicket {
    id: string;
    subject: string;
    category: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: string;
    created_at: string;
}

export default function SupportPage() {
    const { user, userProfile } = useUser();
    const { toast } = useToast();
    const [showNewTicket, setShowNewTicket] = useState(false);
    const [subject, setSubject] = useState("");
    const [category, setCategory] = useState("");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const ticketsOptions = {
        table: 'support_tickets',
        filters: user ? [{ column: 'user_id', operator: '==' as const, value: user.uid }] : [],
        orderByColumn: { column: 'created_at', direction: 'desc' as const },
        enabled: !!user,
    };

    const { data: tickets, isLoading } = useRealtimeCollection<SupportTicket>(ticketsOptions);

    const handleSubmit = async () => {
        if (!user || !subject || !category || !message) return;

        setIsSubmitting(true);
        try {
            await insertRow('support_tickets', {
                user_id: user.uid,
                user_email: userProfile?.email || user.email,
                subject,
                category,
                message,
                status: 'open',
                priority: 'medium',
                responses: [],
            });

            toast({
                title: "Ticket Created",
                description: "Your support ticket has been submitted successfully.",
            });

            setShowNewTicket(false);
            setSubject("");
            setCategory("");
            setMessage("");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open':
                return <Badge className="bg-blue-100 text-blue-800">Open</Badge>;
            case 'in_progress':
                return <Badge className="bg-yellow-500/20 text-yellow-400">In Progress</Badge>;
            case 'resolved':
                return <Badge className="bg-green-500/20 text-green-400">Resolved</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#334C99]">Support Center</h1>
                    <p className="text-muted-foreground">Get help and track your support tickets</p>
                </div>
                <Button onClick={() => setShowNewTicket(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Ticket
                </Button>
            </div>

            {showNewTicket && (
                <Card>
                    <CardHeader>
                        <CardTitle>Create Support Ticket</CardTitle>
                        <CardDescription>Describe your issue and we'll help you</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Subject</label>
                            <Input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Brief description of your issue"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="deposit">Deposit Issue</SelectItem>
                                    <SelectItem value="withdrawal">Withdrawal Issue</SelectItem>
                                    <SelectItem value="investment">Investment Question</SelectItem>
                                    <SelectItem value="technical">Technical Support</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Message</label>
                            <Textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Describe your issue in detail..."
                                rows={4}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setShowNewTicket(false)}>Cancel</Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !subject || !category || !message}
                                className="bg-[#334C99]"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Your Tickets</CardTitle>
                    <CardDescription>Track the status of your support requests</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p>Loading...</p>
                    ) : tickets?.length === 0 ? (
                        <div className="text-center py-8">
                            <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                            <p className="mt-4 text-muted-foreground">No tickets yet</p>
                            <p className="text-sm text-muted-foreground">Create a ticket if you need help</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {tickets?.map((ticket) => (
                                <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <MessageSquare className="h-5 w-5 text-[#334C99]" />
                                        <div>
                                            <p className="font-medium">{ticket.subject}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {format(new Date(ticket.created_at), 'MMM dd, yyyy')} • {ticket.category}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(ticket.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
