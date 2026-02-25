"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DepositDialog = () => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const walletAddress = "0x362A4533B0E745d339ff4fdb98E96BDb838FAa85";
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${walletAddress}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(walletAddress);
        toast({
            title: "Copied!",
            description: "Deposit address copied to clipboard.",
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Deposit Funds
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Fund Your Account</DialogTitle>
                    <DialogDescription>
                        To deposit funds, send currency to the address below or scan the QR code.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-6 py-4">
                    <div className="p-2 bg-white rounded-lg border">
                        <Image
                            src={qrCodeUrl}
                            alt="Deposit QR Code"
                            width={200}
                            height={200}
                        />
                    </div>
                    <div className="w-full space-y-2 text-center">
                        <p className="text-sm font-medium text-muted-foreground">Deposit Address</p>
                        <div className="flex items-center gap-2 rounded-md border p-2 bg-muted">
                           <p className="text-sm font-mono break-all flex-1">{walletAddress}</p>
                            <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8">
                                <Copy className="h-3 w-3" />
                                <span className="sr-only">Copy Address</span>
                            </Button>
                        </div>
                    </div>
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button">Done</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DepositDialog;
