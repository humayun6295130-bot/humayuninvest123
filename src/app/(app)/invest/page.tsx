"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const plans = [
    {
        name: "Starter Plan",
        price: 25,
        description: "Ideal for those new to investing.",
        features: [
            "Basic market access",
            "Automated portfolio rebalancing",
            "Email support",
        ],
    },
    {
        name: "Growth Plan",
        price: 30,
        description: "Perfect for growing your portfolio.",
        features: [
            "Everything in Starter",
            "Advanced analytics",
            "Priority email support",
        ],
    },
    {
        name: "Professional Plan",
        price: 50,
        description: "For the serious, active investor.",
        features: [
            "Everything in Growth",
            "AI-powered insights",
            "Dedicated phone support",
        ],
    },
];

export default function InvestPage() {
    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold">Investment Plans</h1>
                <p className="text-muted-foreground">Choose a plan that fits your investment goals.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                {plans.map((plan) => (
                    <Card key={plan.name} className="flex flex-col h-full">
                        <CardHeader>
                            <CardTitle>{plan.name}</CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold">${plan.price}</span>
                                <span className="text-muted-foreground">/ month</span>
                            </div>
                            <ul className="space-y-2 text-sm">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span className="text-muted-foreground">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full">Choose Plan</Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
