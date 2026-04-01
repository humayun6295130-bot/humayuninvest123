"use client";

import { useState, useMemo } from "react";
import { useRealtimeCollection, updateRow } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Eye, Shield, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface KYCDocument {
    id: string;
    user_id: string;
    user_email: string;
    document_type: string;
    document_number: string;
    front_image_url: string;
    back_image_url: string;
    selfie_url: string;
    status: 'pending' | 'under_review' | 'approved' | 'rejected';
    rejection_reason: string;
    submitted_at: string;
}

export function KYCManager() {
    const { toast } = useToast();
    const [selectedDoc, setSelectedDoc] = useState<KYCDocument | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    const kycOptions = useMemo(
        () => ({
            table: 'kyc_documents' as const,
            enabled: true,
        }),
        []
    );

    const { data: documentsRaw, isLoading } = useRealtimeCollection<KYCDocument>(kycOptions);

    const documents = useMemo(() => {
        if (!documentsRaw?.length) return documentsRaw;
        return [...documentsRaw].sort(
            (a, b) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime()
        );
    }, [documentsRaw]);

    const pendingDocs = documents?.filter(d => d.status === 'pending' || d.status === 'under_review') || [];
    const approvedDocs = documents?.filter(d => d.status === 'approved') || [];
    const rejectedDocs = documents?.filter(d => d.status === 'rejected') || [];

    const handleApprove = async (docId: string, userId: string) => {
        try {
            await updateRow('kyc_documents', docId, {
                status: 'approved',
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            await updateRow('users', userId, { kyc_status: 'verified' });
            toast({ title: "KYC approved successfully" });
            setSelectedDoc(null);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const handleReject = async (docId: string, userId: string) => {
        if (!rejectionReason) {
            toast({ variant: "destructive", title: "Please provide a rejection reason" });
            return;
        }

        try {
            await updateRow('kyc_documents', docId, {
                status: 'rejected',
                rejection_reason: rejectionReason,
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            await updateRow('users', userId, { kyc_status: 'rejected' });
            toast({ title: "KYC rejected" });
            setSelectedDoc(null);
            setRejectionReason("");
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
            case 'rejected':
                return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
            case 'under_review':
                return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" /> Under Review</Badge>;
            default:
                return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
        }
    };

    const DocumentCard = ({ doc }: { doc: KYCDocument }) => (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarFallback>{doc.user_email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium">{doc.user_email}</p>
                            <p className="text-sm text-muted-foreground capitalize">{doc.document_type} • {format(new Date(doc.submitted_at), 'MMM dd, yyyy')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {getStatusBadge(doc.status)}
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(doc)}>
                            <Eye className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (isLoading) {
        return <div className="text-center py-8">Loading KYC documents...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    KYC Verification
                </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Submissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{documents?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{pendingDocs.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Approved</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{approvedDocs.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Rejected</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{rejectedDocs.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="pending">
                <TabsList>
                    <TabsTrigger value="pending">Pending ({pendingDocs.length})</TabsTrigger>
                    <TabsTrigger value="approved">Approved ({approvedDocs.length})</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected ({rejectedDocs.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-2">
                    {pendingDocs.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
                    {pendingDocs.length === 0 && <p className="text-center py-8 text-muted-foreground">No pending documents</p>}
                </TabsContent>

                <TabsContent value="approved" className="space-y-2">
                    {approvedDocs.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
                    {approvedDocs.length === 0 && <p className="text-center py-8 text-muted-foreground">No approved documents</p>}
                </TabsContent>

                <TabsContent value="rejected" className="space-y-2">
                    {rejectedDocs.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
                    {rejectedDocs.length === 0 && <p className="text-center py-8 text-muted-foreground">No rejected documents</p>}
                </TabsContent>
            </Tabs>

            <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>KYC Document Review</DialogTitle>
                        <DialogDescription>Review the submitted documents for {selectedDoc?.user_email}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium mb-2">Front Side</p>
                                {selectedDoc?.front_image_url && (
                                    <img src={selectedDoc.front_image_url} alt="Front" className="w-full h-48 object-cover rounded-lg" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-medium mb-2">Back Side</p>
                                {selectedDoc?.back_image_url && (
                                    <img src={selectedDoc.back_image_url} alt="Back" className="w-full h-48 object-cover rounded-lg" />
                                )}
                            </div>
                        </div>
                        {selectedDoc?.selfie_url && (
                            <div>
                                <p className="text-sm font-medium mb-2">Selfie</p>
                                <img src={selectedDoc.selfie_url} alt="Selfie" className="w-full h-48 object-cover rounded-lg" />
                            </div>
                        )}
                        <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm"><strong>Document Type:</strong> {selectedDoc?.document_type}</p>
                            <p className="text-sm"><strong>Document Number:</strong> {selectedDoc?.document_number}</p>
                            <p className="text-sm"><strong>Submitted:</strong> {selectedDoc?.submitted_at && format(new Date(selectedDoc.submitted_at), 'MMM dd, yyyy HH:mm')}</p>
                        </div>
                        {selectedDoc && (selectedDoc.status === 'pending' || selectedDoc.status === 'under_review') && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rejection Reason (if rejecting)</label>
                                <textarea
                                    className="w-full p-2 border rounded-md"
                                    rows={2}
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Reason for rejection..."
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedDoc(null)}>Close</Button>
                        {selectedDoc && (selectedDoc.status === 'pending' || selectedDoc.status === 'under_review') && (
                            <>
                                <Button variant="destructive" onClick={() => handleReject(selectedDoc.id, selectedDoc.user_id)}>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                </Button>
                                <Button className="bg-green-600" onClick={() => handleApprove(selectedDoc.id, selectedDoc.user_id)}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Approve
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
