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
import { supabase } from '@/supabase/config';

export default function ClaimDailyDialog({ userProfile }: { userProfile: any }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleClaim = async () => {
        if (!userProfile?.id) return;
        setIsLoading(true);

        try {
            const { data, error } = await supabase.rpc('process_daily_claim', {
                user_id: userProfile.id,
            });

            if (error) throw error;

            if (data && data.success) {
                toast({
                    title: 'Claim Successful!',
                    description: data.message,
                });
                setOpen(false);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Claim Failed',
                    description: data?.message || 'Could not process claim.',
                });
            }
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
