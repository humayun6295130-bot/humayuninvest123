"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";
import { insertRow } from "@/firebase";
import { useState } from "react";

const formSchema = z.object({
    symbol: z.string().min(1, "Symbol is required.").toUpperCase(),
    assetType: z.enum(["stock", "cryptocurrency", "ETF", "bond"]),
    quantity: z.coerce.number().positive("Quantity must be positive."),
    averageCost: z.coerce.number().positive("Price must be positive."),
});

export function AddAssetDialog({ portfolioId, userId }: { portfolioId: string, userId: string }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            symbol: "",
            quantity: 0,
            averageCost: 0,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!userId || !portfolioId) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not add asset. User or portfolio not found.",
            });
            return;
        }

        try {
            await insertRow("assets", {
                portfolio_id: portfolioId,
                user_id: userId,
                symbol: values.symbol,
                asset_type: values.assetType,
                quantity: values.quantity,
                average_cost: values.averageCost,
                currency: 'USD',
                purchase_date: new Date().toISOString().split('T')[0],
            });

            toast({
                title: "Asset Added",
                description: `${values.quantity} of ${values.symbol} has been added to your portfolio.`,
            });

            form.reset();
            setOpen(false);
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: err.message || "Failed to add asset.",
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Asset
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Asset</DialogTitle>
                    <DialogDescription>
                        Enter the details of your new investment.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="symbol"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Symbol</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., AAPL, BTC" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="assetType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Asset Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select asset type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="stock">Stock</SelectItem>
                                            <SelectItem value="cryptocurrency">Cryptocurrency</SelectItem>
                                            <SelectItem value="ETF">ETF</SelectItem>
                                            <SelectItem value="bond">Bond</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="quantity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quantity</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="any" placeholder="e.g., 10.5" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="averageCost"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Average Purchase Price</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="any" placeholder="e.g., 150.75" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">Cancel</Button>
                            </DialogClose>
                            <Button type="submit">Add Asset</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
