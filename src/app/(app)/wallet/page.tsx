"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function WalletPage() {
    const walletAddress = "0x362A4533B0E745d339ff4fdb98E96BDb838FAa85";
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${walletAddress}`;
    const { toast } = useToast();

    const handleCopy = () => {
        navigator.clipboard.writeText(walletAddress);
        toast({
            title: "Copied!",
            description: "Deposit address copied to clipboard.",
        });
    };

    return (
        <div className="flex justify-center items-start pt-10">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Fund Your Account</CardTitle>
                    <CardDescription>To deposit funds, scan the QR code with your wallet application or copy the address below.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6">
                    <div className="p-4 bg-white rounded-lg">
                        <Image
                            src={qrCodeUrl}
                            alt="Payment QR Code"
                            width={250}
                            height={250}
                            className="rounded-md"
                        />
                    </div>
                    <div className="w-full space-y-2 text-center">
                        <p className="text-sm font-medium text-muted-foreground">Deposit Address</p>
                        <div className="flex items-center gap-2 rounded-md border p-2 bg-muted">
                           <p className="text-sm font-mono break-all flex-1">{walletAddress}</p>
                            <Button variant="ghost" size="icon" onClick={handleCopy}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
