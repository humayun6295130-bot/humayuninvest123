"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Upload, Copy, X, ImageIcon, Download, QrCode } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUser, insertRow, uploadFile } from "@/firebase";

const walletAddress = "0x362A4533B0E745d339ff4fdb98E96BDb838FAa85";

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number.").min(10, "Minimum deposit is $10"),
  transactionHash: z.string().min(5, "Please enter a valid transaction hash or reference."),
});

export default function DepositDialog({ userProfile }: { userProfile: any }) {
  const { toast } = useToast();
  const { user, isUserLoading, isProfileLoading } = useUser();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: 0, transactionHash: "" },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard.",
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Wait for auth to finish loading
    if (isUserLoading || isProfileLoading) {
      toast({ variant: "destructive", title: "Please wait", description: "Authentication is loading..." });
      return;
    }

    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "User not authenticated. Please log in again." });
      return;
    }

    // Use userProfile from props or fallback to user data
    const profile = userProfile || {
      display_name: user.displayName || user.email?.split('@')[0] || 'User',
      email: user.email
    };

    setIsLoading(true);

    try {
      let proofUrl = "";
      if (selectedFile) {
        proofUrl = await uploadFile(selectedFile, user.uid);
      }

      await insertRow("transactions", {
        user_id: user.uid,
        user_display_name: profile.display_name,
        user_email: profile.email,
        type: "deposit",
        amount: values.amount,
        currency: "USD",
        status: "pending",
        description: `Deposit request via ${values.transactionHash}`,
        transaction_hash: values.transactionHash,
        proof_url: proofUrl,
      });

      toast({
        title: "Deposit Submitted",
        description: "Your request is being reviewed by our team.",
      });

      setOpen(false);
      form.reset();
      setSelectedFile(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit deposit. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#334C99] hover:bg-[#283d7a] text-white">
          <Download className="mr-2 h-4 w-4" />
          Deposit Funds
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-[#EBEFF6]">
        <DialogHeader>
          <DialogTitle className="text-[#334C99]">Deposit Funds</DialogTitle>
          <DialogDescription>
            Transfer funds to the wallet below and provide details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">USDT (ERC20) Address</p>
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border">
              <code className="text-xs break-all flex-1 text-[#334C99]">{walletAddress}</code>
              <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8 hover:text-[#52BBDB]">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="p-4 bg-white rounded-xl border border-gray-200 flex flex-col items-center">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Scan QR Code to Pay</p>
            <div className="bg-white p-3 rounded-lg border-2 border-dashed border-gray-200">
              <Image
                src="/qr-code.png"
                alt="Payment QR Code"
                width={200}
                height={200}
                className="rounded-lg"
                priority
              />
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Scan this QR code with your crypto wallet app
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposit Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        className="bg-white border-gray-300 focus:border-[#52BBDB] focus:ring-[#52BBDB]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transactionHash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction ID / Hash</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Paste your TXID here"
                        {...field}
                        className="bg-white border-gray-300 focus:border-[#52BBDB] focus:ring-[#52BBDB]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Payment Proof (Optional)</FormLabel>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2
                    ${selectedFile ? 'border-[#52BBDB] bg-blue-50' : 'border-gray-300 hover:border-[#52BBDB] bg-white'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  {selectedFile ? (
                    <div className="flex items-center gap-2 w-full">
                      <ImageIcon className="h-5 w-5 text-[#334C99]" />
                      <span className="text-sm truncate flex-1">{selectedFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-400" />
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Click to upload screenshot</p>
                        <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                      </div>
                    </>
                  )}
                </div>
                <FormDescription>
                  Uploading a screenshot of your transaction helps speed up verification.
                </FormDescription>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#334C99] hover:bg-[#283d7a] text-white py-6"
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Complete Deposit"}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
