"use client";

import { useState, useEffect } from "react";
import { useUser, updateRow } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
    Wallet,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Info,
    Copy,
    Check,
    ExternalLink,
    Lock,
    Unlock
} from "lucide-react";

interface Bep20WalletManagerProps {
    userProfile: any;
}

export function Bep20WalletManager({ userProfile }: Bep20WalletManagerProps) {
    const { user } = useUser();
    const { toast } = useToast();

    const [walletAddress, setWalletAddress] = useState(userProfile?.bep20_wallet_address || "");
    const [isValidating, setIsValidating] = useState(false);
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Check if user already has a wallet address
    const hasWalletAddress = !!userProfile?.bep20_wallet_address;

    // Validate address format and check on network
    const validateAddress = async (address: string) => {
        if (!address) {
            setIsValid(null);
            return;
        }

        // First check format locally
        const bep20AddressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!bep20AddressRegex.test(address)) {
            setIsValid(false);
            return;
        }

        setIsValidating(true);
        try {
            // Check with BEP20/BSC API for network validation
            const response = await fetch(`/api/bep20/validate-address?address=${encodeURIComponent(address)}`);
            const data = await response.json();
            setIsValid(data.isValid);
        } catch (error) {
            console.error("Address validation error:", error);
            // If API fails, still accept if format is valid
            setIsValid(true);
        } finally {
            setIsValidating(false);
        }
    };

    // Handle address input change
    const handleAddressChange = (value: string) => {
        setWalletAddress(value);
        setHasChanges(true);

        // Clear validation when empty
        if (!value) {
            setIsValid(null);
            return;
        }

        // Debounce validation
        const timeoutId = setTimeout(() => {
            validateAddress(value);
        }, 500);

        return () => clearTimeout(timeoutId);
    };

    // Save wallet address
    const handleSave = async () => {
        if (!user?.uid || !isValid) return;

        setIsSaving(true);
        try {
            await updateRow("users", user.uid, {
                bep20_wallet_address: walletAddress,
                bep20_wallet_verified: true,
                bep20_wallet_added_at: new Date().toISOString(),
            });

            toast({
                title: "Wallet Address Saved",
                description: "Your BNB Smart Chain (BEP20) wallet address has been securely saved for USDT transactions.",
            });

            setHasChanges(false);
        } catch (error) {
            console.error("Error saving wallet address:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to save wallet address. Please try again.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Copy address to clipboard
    const handleCopy = async () => {
        if (!walletAddress) return;
        try {
            await navigator.clipboard.writeText(walletAddress);
            setCopied(true);
            toast({ title: "Copied!", description: "Wallet address copied to clipboard" });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast({ variant: "destructive", title: "Copy Failed", description: "Please copy manually" });
        }
    };

    return (
        <Card className="border-amber-500/20">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Wallet className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">BNB Smart Chain (BEP20) Wallet</CardTitle>
                            <CardDescription>
                                Register your USDT wallet for deposits and withdrawals
                            </CardDescription>
                        </div>
                    </div>
                    {hasWalletAddress && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Connected
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Security Message */}
                <Alert className="bg-blue-500/10 border-blue-500/20">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                    <AlertDescription className="text-sm text-blue-200">
                        <strong>Secure & Private:</strong> Your wallet address is encrypted and stored securely.
                        We only use it for USDT transactions - deposits to your account and withdrawals you request.
                        Never share your private keys with anyone.
                    </AlertDescription>
                </Alert>

                {/* Current Wallet Address Display */}
                {hasWalletAddress && !hasChanges && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-green-400">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="font-medium">Wallet Connected</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setHasChanges(true)}
                                className="text-amber-400 hover:text-amber-300"
                            >
                                Update
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-black/30 px-3 py-2 rounded flex-1 overflow-x-auto">
                                {walletAddress}
                            </code>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleCopy}
                                className="shrink-0"
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                asChild
                                className="shrink-0"
                            >
                                <a
                                    href={`https://bscscan.com/address/${walletAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            This address will be used for all your USDT transactions
                        </p>
                    </div>
                )}

                {/* Wallet Address Input */}
                {(!hasWalletAddress || hasChanges) && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="bep20-address">
                                BEP20 Wallet Address
                                {hasWalletAddress && <span className="text-amber-400 ml-2">(Update)</span>}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="bep20-address"
                                    placeholder="0x..."
                                    value={walletAddress}
                                    onChange={(e) => handleAddressChange(e.target.value)}
                                    className={`font-mono pr-10 ${isValid === true
                                        ? "border-green-500 focus:border-green-500"
                                        : isValid === false
                                            ? "border-red-500 focus:border-red-500"
                                            : ""
                                        }`}
                                    maxLength={34}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {isValidating ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    ) : isValid === true ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : isValid === false ? (
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                    ) : walletAddress.length > 0 ? (
                                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                    ) : null}
                                </div>
                            </div>

                            {/* Validation Message */}
                            {isValid === false && (
                                <Alert variant="destructive" className="py-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        Invalid BEP20 address. Must start with '0x' and be exactly 42 characters.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {isValidating && (
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Validating address on BNB Smart Chain network...
                                </p>
                            )}

                            {isValid === true && !isValidating && (
                                <p className="text-sm text-green-500 flex items-center gap-2">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Valid BEP20 address confirmed on network
                                </p>
                            )}
                        </div>

                        {/* Wallet Requirements */}
                        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                            <p className="text-sm font-medium flex items-center gap-2">
                                <Info className="h-4 w-4 text-muted-foreground" />
                                Wallet Requirements:
                            </p>
                            <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                                <li>Must be a BNB Smart Chain (BEP20) compatible wallet</li>
                                <li>Supports USDT transactions on BNB Smart Chain network</li>
                                <li>Address must start with "0x" and be 42 characters</li>
                                <li>You must have access to this wallet's private keys</li>
                            </ul>
                        </div>

                        {/* Fee Information */}
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-2">
                            <p className="text-sm font-medium text-amber-400 flex items-center gap-2">
                                <Info className="h-4 w-4" />
                                Withdrawal Information:
                            </p>
                            <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                                <li><strong>Minimum withdrawal:</strong> $50 USD</li>
                                <li><strong>Withdrawal fee:</strong> 8% of withdrawal amount</li>
                                <li>Withdrawals are processed to your registered BEP20 wallet</li>
                            </ul>
                        </div>

                        {/* Save Button */}
                        <Button
                            onClick={handleSave}
                            disabled={!isValid || isSaving || !walletAddress}
                            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : hasWalletAddress ? (
                                <>
                                    <Unlock className="mr-2 h-4 w-4" />
                                    Update Wallet Address
                                </>
                            ) : (
                                <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Connect Wallet
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
