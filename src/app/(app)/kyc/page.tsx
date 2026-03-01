"use client";

import { useState } from "react";
import { useUser } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, Clock, AlertCircle, Upload } from "lucide-react";

export default function KYCPage() {
    const { userProfile } = useUser();
    const [isUploading, setIsUploading] = useState(false);

    const kycStatus = userProfile?.kyc_status || 'pending';

    const getStatusBadge = () => {
        switch (kycStatus) {
            case 'verified':
                return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
            case 'rejected':
                return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
            default:
                return <Badge variant="secondary">Not Submitted</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-[#334C99]">KYC Verification</h1>
                <p className="text-muted-foreground">Verify your identity to unlock all features</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Verification Status</CardTitle>
                            <CardDescription>Your current KYC verification status</CardDescription>
                        </div>
                        {getStatusBadge()}
                    </div>
                </CardHeader>
                <CardContent>
                    {kycStatus === 'verified' ? (
                        <div className="text-center py-8">
                            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                            <h3 className="mt-4 text-lg font-semibold">Verification Complete!</h3>
                            <p className="text-muted-foreground">Your identity has been verified successfully.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-3">
                                <Card>
                                    <CardContent className="p-6 text-center">
                                        <Upload className="mx-auto h-8 w-8 text-[#334C99]" />
                                        <h4 className="mt-2 font-medium">Step 1</h4>
                                        <p className="text-sm text-muted-foreground">Upload Documents</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6 text-center">
                                        <Clock className="mx-auto h-8 w-8 text-[#334C99]" />
                                        <h4 className="mt-2 font-medium">Step 2</h4>
                                        <p className="text-sm text-muted-foreground">Under Review</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6 text-center">
                                        <CheckCircle className="mx-auto h-8 w-8 text-[#334C99]" />
                                        <h4 className="mt-2 font-medium">Step 3</h4>
                                        <p className="text-sm text-muted-foreground">Verification Complete</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-medium">Upload Identity Document</h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Please upload a clear photo of your Passport, ID Card, or Driving License
                                </p>
                                <Button className="mt-4 bg-[#334C99]" disabled={isUploading}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {isUploading ? 'Uploading...' : 'Upload Document'}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
