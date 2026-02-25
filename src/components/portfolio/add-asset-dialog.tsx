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

const formSchema = z.object({
    ticker: z.string().min(1, "Ticker is required.").toUpperCase(),
    type: z.enum(["Stock", "Crypto", "ETF"]),
    quantity: z.coerce.number().positive("Quantity must be positive."),
    avgPrice: z.coerce.number().positive("Price must be positive."),
  });

export function AddAssetDialog() {
    const { toast } = useToast();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            ticker: "",
            quantity: 0,
            avgPrice: 0,
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(values);
        toast({
            title: "Asset Added",
            description: `${values.quantity} of ${values.ticker} has been added to your portfolio.`,
        });
        // Here you would typically call a server action or API to update the database
        // and then re-fetch or optimistically update the UI.
        // For now, we just log and close the dialog.
        // We'll reset the form for the next time it opens.
        form.reset();
      }

  return (
    <Dialog>
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
                    name="ticker"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ticker</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., AAPL, BTC" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="type"
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
                                <SelectItem value="Stock">Stock</SelectItem>
                                <SelectItem value="Crypto">Crypto</SelectItem>
                                <SelectItem value="ETF">ETF</SelectItem>
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
                    name="avgPrice"
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
                    <Button type="submit">Add Asset</Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
