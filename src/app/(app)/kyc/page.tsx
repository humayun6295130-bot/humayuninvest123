"use client";

import { useMemo, useState, useRef } from "react";
import { useUser, useRealtimeCollection, insertRow, updateRow } from "@/firebase";
import { uploadFile } from "@/firebase/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Shield, CheckCircle, Clock, AlertCircle, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface KYCDocumentRow {
    id: string;
    user_id: string;
    status: "pending" | "under_review" | "approved" | "rejected";
    submitted_at?: string;
    rejection_reason?: string;
}

export default function KYCPage() {
    const { user, userProfile } = useUser();
    const { toast } = useToast();
    const [documentType, setDocumentType] = useState("passport");
    const [documentNumber, setDocumentNumber] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const frontRef = useRef<HTMLInputElement>(null);
    const backRef = useRef<HTMLInputElement>(null);
    const selfieRef = useRef<HTMLInputElement>(null);

    const kycOpts = useMemo(
        () => ({
            table: "kyc_documents" as const,
            filters: user ? [{ column: "user_id", operator: "==" as const, value: user.uid }] : [],
            enabled: !!user,
        }),
        [user]
    );

    const { data: myDocs } = useRealtimeCollection<KYCDocumentRow>(kycOpts);

    const latestOpen = useMemo(() => {
        if (!myDocs?.length) return null;
        return myDocs.find((d) => d.status === "pending" || d.status === "under_review") ?? null;
    }, [myDocs]);

    const kycStatus = (userProfile?.kyc_status as string | undefined) || "not_submitted";

    const getStatusBadge = () => {
        switch (kycStatus) {
            case "verified":
                return (
                    <Badge className="bg-green-500/20 text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" /> Verified
                    </Badge>
                );
            case "pending":
                return (
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                        <Clock className="w-3 h-3 mr-1" /> Pending review
                    </Badge>
                );
            case "rejected":
                return (
                    <Badge className="bg-red-500/20 text-red-400">
                        <AlertCircle className="w-3 h-3 mr-1" /> Rejected
                    </Badge>
                );
            default:
                return <Badge variant="secondary">Not submitted</Badge>;
        }
    };

    const handleSubmit = async () => {
        if (!user?.uid) {
            toast({ variant: "destructive", title: "Sign in required" });
            return;
        }
        if (latestOpen) {
            toast({
                variant: "destructive",
                title: "Already submitted",
                description: "You already have a verification request in the queue. Wait for admin review.",
            });
            return;
        }
        const front = frontRef.current?.files?.[0];
        if (!front || !front.type.startsWith("image/")) {
            toast({
                variant: "destructive",
                title: "Front document required",
                description: "Upload a clear photo (PNG or JPG) of your ID front page.",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const frontUrl = await uploadFile(front, user.uid, "kyc");
            let backUrl = "";
            const back = backRef.current?.files?.[0];
            if (back && back.type.startsWith("image/")) {
                backUrl = await uploadFile(back, user.uid, "kyc");
            }
            let selfieUrl = "";
            const selfie = selfieRef.current?.files?.[0];
            if (selfie && selfie.type.startsWith("image/")) {
                selfieUrl = await uploadFile(selfie, user.uid, "kyc");
            }

            const email = userProfile?.email || user.email || "";
            const now = new Date().toISOString();

            await insertRow("kyc_documents", {
                user_id: user.uid,
                user_email: email,
                document_type: documentType,
                document_number: documentNumber.trim() || "—",
                front_image_url: frontUrl,
                back_image_url: backUrl,
                selfie_url: selfieUrl,
                status: "pending",
                rejection_reason: "",
                submitted_at: now,
            });

            await updateRow("users", user.uid, {
                kyc_status: "pending",
                updated_at: now,
            });

            toast({
                title: "Submitted for review",
                description: "Admins will see your documents in Admin → KYC. You will be notified after review.",
            });
            setDocumentNumber("");
            if (frontRef.current) frontRef.current.value = "";
            if (backRef.current) backRef.current.value = "";
            if (selfieRef.current) selfieRef.current.value = "";
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Upload failed";
            toast({ variant: "destructive", title: "Could not submit", description: msg });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-[#334C99]">KYC Verification</h1>
                <p className="text-muted-foreground">Submit documents for admin review — same queue as the admin KYC panel.</p>
            </div>

            {latestOpen && (
                <Alert>
                    <AlertTitle>Request in queue</AlertTitle>
                    <AlertDescription>
                        Your documents are pending admin review. You do not need to submit again unless asked.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <CardTitle>Verification Status</CardTitle>
                            <CardDescription>Profile flag and latest submission</CardDescription>
                        </div>
                        {getStatusBadge()}
                    </div>
                </CardHeader>
                <CardContent>
                    {kycStatus === "verified" ? (
                        <div className="text-center py-8">
                            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                            <h3 className="mt-4 text-lg font-semibold">Verification complete</h3>
                            <p className="text-muted-foreground">Your identity has been verified.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-3">
                                <Card>
                                    <CardContent className="p-6 text-center">
                                        <Upload className="mx-auto h-8 w-8 text-[#334C99]" />
                                        <h4 className="mt-2 font-medium">Step 1</h4>
                                        <p className="text-sm text-muted-foreground">Upload documents</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6 text-center">
                                        <Clock className="mx-auto h-8 w-8 text-[#334C99]" />
                                        <h4 className="mt-2 font-medium">Step 2</h4>
                                        <p className="text-sm text-muted-foreground">Admin review</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6 text-center">
                                        <CheckCircle className="mx-auto h-8 w-8 text-[#334C99]" />
                                        <h4 className="mt-2 font-medium">Step 3</h4>
                                        <p className="text-sm text-muted-foreground">Verification complete</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-4 border rounded-lg p-6">
                                <div className="space-y-2">
                                    <Label>Document type</Label>
                                    <Select value={documentType} onValueChange={setDocumentType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="passport">Passport</SelectItem>
                                            <SelectItem value="national_id">National ID</SelectItem>
                                            <SelectItem value="driving_license">Driving license</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Document number (optional)</Label>
                                    <Input
                                        value={documentNumber}
                                        onChange={(e) => setDocumentNumber(e.target.value)}
                                        placeholder="As shown on the document"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Front of ID (required)</Label>
                                    <Input ref={frontRef} type="file" accept="image/png,image/jpeg,image/webp" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Back of ID (optional)</Label>
                                    <Input ref={backRef} type="file" accept="image/png,image/jpeg,image/webp" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Selfie with ID (optional)</Label>
                                    <Input ref={selfieRef} type="file" accept="image/png,image/jpeg,image/webp" />
                                </div>
                                <Button
                                    className="w-full bg-[#334C99]"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !!latestOpen || kycStatus === "verified"}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Uploading…
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="mr-2 h-4 w-4" />
                                            Submit for review
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
