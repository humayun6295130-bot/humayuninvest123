'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Gift } from 'lucide-react';
import { useFirebase, fetchRow, insertRow, incrementBalance } from '@/firebase';

export default function ClaimDailyDialog({ userProfile }: { userProfile: any }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { isConfigured } = useFirebase();

    const handleClaim = async () => {
        if (!userProfile?.id) return;
        if (!isConfigured) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Firebase is not configured.',
            });
            return;
        }
        setIsLoading(true);

        try {
            // Check if user has already claimed today
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const claims = await fetchRow('daily_claims', `${userProfile.id}_${today}`);

            if (claims) {
                toast({
                    variant: 'destructive',
                    title: 'Already Claimed',
                    description: 'You have already claimed your daily reward today. Come back tomorrow!',
                });
                setIsLoading(false);
                return;
            }

            const claimAmount = userProfile?.daily_claim_amount || 0;

            if (claimAmount <= 0) {
                toast({
                    variant: 'destructive',
                    title: 'No Claim Available',
                    description: 'You do not have an active plan or a valid claim amount.',
                });
                setIsLoading(false);
                return;
            }

            // Process the claim
            await incrementBalance(userProfile.id, claimAmount);

            // Record the claim
            await insertRow('daily_claims', {
                id: `${userProfile.id}_${today}`,
                user_id: userProfile.id,
                date: today,
                amount: claimAmount,
                claimed_at: new Date().toISOString(),
            });

            // Record transaction
            await insertRow('transactions', {
                user_id: userProfile.id,
                type: 'daily_claim',
                amount: claimAmount,
                status: 'completed',
                description: `Daily claim for ${today}`,
            });

            toast({
                title: 'Claim Successful!',
                description: `You have claimed $${claimAmount.toFixed(2)}. It has been added to your balance.`,
            });
            setOpen(false);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const claimAmount = userProfile?.daily_claim_amount || 0;
    const canClaim = claimAmount > 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={!canClaim}>
                    <Gift className="h-4 w-4" />
                    Daily Claim
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Daily Investment Claim</DialogTitle>
                    <DialogDescription>
                        Claim your daily investment return based on your active plan. Claims reset every day at 9 AM.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6 flex flex-col items-center justify-center space-y-4">
                    <div className="text-4xl font-bold text-primary">
                        ${claimAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {canClaim ? (
                        <p className="text-sm text-muted-foreground text-center">
                            Available to claim today.
                        </p>
                    ) : (
                        <p className="text-sm text-destructive text-center">
                            You do not have an active plan or a valid claim amount.
                        </p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleClaim} disabled={isLoading || !canClaim} className="bg-[#334C99]">
                        {isLoading ? 'Processing...' : 'Claim Now'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
