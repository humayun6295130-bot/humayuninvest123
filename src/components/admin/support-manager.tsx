"use client";

import { useState } from "react";
import { useRealtimeCollection, updateRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Clock, MessageSquare, Eye, Headphones } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SupportTicket {
    id: string;
    user_id: string;
    user_email: string;
    subject: string;
    category: string;
    message: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    assigned_to: string;
    responses: Array<{
        from: 'user' | 'support';
        message: string;
        created_at: string;
    }>;
    created_at: string;
    updated_at: string;
}

export function SupportManager() {
    const { toast } = useToast();
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [replyMessage, setReplyMessage] = useState("");
    const [assignee, setAssignee] = useState("");

    const ticketsOptions = {
        table: 'support_tickets',
        orderByColumn: { column: 'created_at', direction: 'desc' as const },
        enabled: true,
    };

    const { data: tickets, isLoading } = useRealtimeCollection<SupportTicket>(ticketsOptions);

    const openTickets = tickets?.filter(t => t.status === 'open') || [];
    const inProgressTickets = tickets?.filter(t => t.status === 'in_progress') || [];
    const resolvedTickets = tickets?.filter(t => t.status === 'resolved' || t.status === 'closed') || [];

    const handleReply = async () => {
        if (!selectedTicket || !replyMessage) return;

        try {
            const newResponse = {
                from: 'support' as const,
                message: replyMessage,
                created_at: new Date().toISOString(),
            };

            await updateRow('support_tickets', selectedTicket.id, {
                responses: [...(selectedTicket.responses || []), newResponse],
                status: 'in_progress',
                updated_at: new Date().toISOString(),
            });

            toast({ title: "Reply sent successfully" });
            setReplyMessage("");

            // Update local state
            setSelectedTicket({
                ...selectedTicket,
                responses: [...(selectedTicket.responses || []), newResponse],
                status: 'in_progress',
            });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const handleStatusChange = async (status: string) => {
        if (!selectedTicket) return;

        try {
            await updateRow('support_tickets', selectedTicket.id, {
                status,
                updated_at: new Date().toISOString(),
            });

            toast({ title: `Ticket marked as ${status}` });
            setSelectedTicket({ ...selectedTicket, status: status as any });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open':
                return <Badge className="bg-blue-100 text-blue-800">Open</Badge>;
            case 'in_progress':
                return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
            case 'resolved':
                return <Badge className="bg-green-100 text-green-800">Resolved</Badge>;
            case 'closed':
                return <Badge variant="secondary">Closed</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'high':
                return <Badge className="bg-red-100 text-red-800">High</Badge>;
            case 'medium':
                return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
            default:
                return <Badge className="bg-gray-100 text-gray-800">Low</Badge>;
        }
    };

    const TicketCard = ({ ticket }: { ticket: SupportTicket }) => (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarFallback>{ticket.user_email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium">{ticket.subject}</p>
                            <p className="text-sm text-muted-foreground">{ticket.user_email} • {ticket.category}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {getPriorityBadge(ticket.priority)}
                        {getStatusBadge(ticket.status)}
                        <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(ticket)}>
                            <Eye className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (isLoading) {
        return <div className="text-center py-8">Loading tickets...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Headphones className="h-5 w-5" />
                    Support Tickets
                </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Tickets</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tickets?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Open</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{openTickets.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">In Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{inProgressTickets.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Resolved</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{resolvedTickets.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="open">
                <TabsList>
                    <TabsTrigger value="open">Open ({openTickets.length})</TabsTrigger>
                    <TabsTrigger value="in_progress">In Progress ({inProgressTickets.length})</TabsTrigger>
                    <TabsTrigger value="resolved">Resolved ({resolvedTickets.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="open" className="space-y-2">
                    {openTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
                    {openTickets.length === 0 && <p className="text-center py-8 text-muted-foreground">No open tickets</p>}
                </TabsContent>

                <TabsContent value="in_progress" className="space-y-2">
                    {inProgressTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
                    {inProgressTickets.length === 0 && <p className="text-center py-8 text-muted-foreground">No tickets in progress</p>}
                </TabsContent>

                <TabsContent value="resolved" className="space-y-2">
                    {resolvedTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
                    {resolvedTickets.length === 0 && <p className="text-center py-8 text-muted-foreground">No resolved tickets</p>}
                </TabsContent>
            </Tabs>

            <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedTicket?.subject}</DialogTitle>
                        <DialogDescription>
                            From: {selectedTicket?.user_email} • {selectedTicket?.created_at && format(new Date(selectedTicket.created_at), 'PPp')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm font-medium mb-1">Original Message:</p>
                            <p className="text-sm">{selectedTicket?.message}</p>
                        </div>

                        {selectedTicket?.responses && selectedTicket.responses.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Conversation:</p>
                                {selectedTicket?.responses?.map((response, idx) => (
                                    <div key={idx} className={`p-3 rounded-lg ${response.from === 'support' ? 'bg-blue-50 ml-4' : 'bg-gray-50'}`}>
                                        <p className="text-xs text-muted-foreground mb-1">
                                            {response.from === 'support' ? 'Support Team' : 'User'} • {format(new Date(response.created_at), 'PPp')}
                                        </p>
                                        <p className="text-sm">{response.message}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedTicket?.status !== 'closed' && selectedTicket?.status !== 'resolved' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Reply:</label>
                                <Textarea
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    placeholder="Type your response..."
                                    rows={3}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter className="flex justify-between">
                        <div className="flex gap-2">
                            <Select value={selectedTicket?.status} onValueChange={handleStatusChange}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setSelectedTicket(null)}>Close</Button>
                            {selectedTicket?.status !== 'closed' && selectedTicket?.status !== 'resolved' && (
                                <Button onClick={handleReply} disabled={!replyMessage} className="bg-[#334C99]">
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Send Reply
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
