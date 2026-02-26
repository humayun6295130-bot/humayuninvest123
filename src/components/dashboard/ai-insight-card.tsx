"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, AlertCircle, TrendingUp, ShieldCheck } from "lucide-react";
import { generatePortfolioInsight, PortfolioInsightOutput } from "@/ai/flows/portfolio-insight-flow";
import { Badge } from "@/components/ui/badge";

interface AIInsightCardProps {
  assets: any[];
  userName: string;
  hasProPlan: boolean;
}

export function AIInsightCard({ assets, userName, hasProPlan }: AIInsightCardProps) {
  const [insight, setInsight] = useState<PortfolioInsightOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (assets.length === 0) return;
    setIsLoading(true);
    try {
      const result = await generatePortfolioInsight({
        assets: assets.map(a => ({
          symbol: a.symbol,
          assetType: a.assetType,
          quantity: a.quantity,
          averageCost: a.averageCost
        })),
        userName
      });
      setInsight(result);
    } catch (error) {
      console.error("Failed to generate AI insight", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasProPlan) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            AI Market Insights
          </CardTitle>
          <CardDescription>
            Unlock personalized portfolio analysis and market forecasts with our Professional Plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full bg-primary" asChild>
            <a href="/invest">Upgrade to Pro</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 overflow-hidden">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Portfolio Advisor
            </CardTitle>
            {insight && (
                <Badge variant={insight.riskLevel === 'High' ? 'destructive' : insight.riskLevel === 'Medium' ? 'secondary' : 'default'}>
                    {insight.riskLevel} Risk
                </Badge>
            )}
        </div>
        <CardDescription>
          Get instant, AI-generated analysis of your current holdings.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {insight ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h4 className="font-semibold text-sm mb-1 flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                Diversification Summary
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {insight.summary}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
              <h4 className="font-semibold text-sm mb-1 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                Strategic Recommendation
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {insight.recommendation}
              </p>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => setInsight(null)}>
                Refresh Analysis
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-6">
            <Sparkles className="h-12 w-12 text-primary/20 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Your data is ready for analysis. Click the button below to generate insights.
            </p>
            <Button onClick={handleGenerate} disabled={isLoading || assets.length === 0} className="w-full">
              {isLoading ? "Analyzing Portfolio..." : "Generate AI Insight"}
            </Button>
            {assets.length === 0 && (
                <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Add assets to your portfolio first.
                </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
