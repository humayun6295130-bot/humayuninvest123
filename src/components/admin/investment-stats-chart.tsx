"use client";

/**
 * Investment Stats Chart Component for Admin Dashboard
 * 
 * Features:
 * - Daily investment chart
 * - Deposit/investment logs
 * - Statistics cards
 * - Date range filtering
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtimeCollection } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    Activity,
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface Transaction {
    id: string;
    user_id: string;
    user_display_name: string;
    type: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    blockchain_verified?: boolean;
    confirmations?: number;
}

export function InvestmentStatsChart() {
    const { toast } = useToast();
    const [timeRange, setTimeRange] = useState<"7" | "30" | "90" | "all">("30");
    const [chartType, setChartType] = useState<"bar" | "line">("bar");

    // Fetch transactions
    const { data: transactions, isLoading } = useRealtimeCollection<Transaction>({
        table: 'transactions',
        orderByColumn: { column: 'created_at', direction: 'desc' },
    });

    // Filter by time range
    const filteredTransactions = useMemo(() => {
        if (!transactions) return [];

        if (timeRange === "all") return transactions;

        const days = parseInt(timeRange);
        const cutoffDate = subDays(new Date(), days);

        return transactions.filter(tx =>
            new Date(tx.created_at) >= cutoffDate
        );
    }, [transactions, timeRange]);

    // Calculate statistics
    const stats = useMemo(() => {
        if (!filteredTransactions) return {
            totalDeposits: 0,
            totalInvestments: 0,
            totalWithdrawals: 0,
            uniqueUsers: 0,
            avgDeposit: 0,
            verifiedCount: 0,
        };

        const deposits = filteredTransactions.filter(tx => tx.type === 'deposit');
        const investments = filteredTransactions.filter(tx => tx.type === 'investment');
        const withdrawals = filteredTransactions.filter(tx => tx.type === 'withdrawal');
        const verified = filteredTransactions.filter(tx => tx.blockchain_verified);

        const uniqueUserIds = new Set(filteredTransactions.map(tx => tx.user_id));

        return {
            totalDeposits: deposits.reduce((sum, tx) => sum + tx.amount, 0),
            totalInvestments: investments.reduce((sum, tx) => sum + tx.amount, 0),
            totalWithdrawals: withdrawals.reduce((sum, tx) => sum + tx.amount, 0),
            uniqueUsers: uniqueUserIds.size,
            avgDeposit: deposits.length > 0
                ? deposits.reduce((sum, tx) => sum + tx.amount, 0) / deposits.length
                : 0,
            verifiedCount: verified.length,
        };
    }, [filteredTransactions]);

    // Prepare chart data - daily breakdown
    const chartData = useMemo(() => {
        if (!filteredTransactions) return [];

        const dataMap = new Map();

        // Initialize last 30 days with 0
        const days = timeRange === "all" ? 30 : parseInt(timeRange);
        for (let i = days - 1; i >= 0; i--) {
            const date = format(subDays(new Date(), i), 'MMM dd');
            dataMap.set(date, { date, deposits: 0, investments: 0, withdrawals: 0 });
        }

        // Aggregate transactions
        filteredTransactions.forEach(tx => {
            const date = format(parseISO(tx.created_at), 'MMM dd');
            if (dataMap.has(date)) {
                const day = dataMap.get(date);
                if (tx.type === 'deposit') day.deposits += tx.amount;
                if (tx.type === 'investment') day.investments += tx.amount;
                if (tx.type === 'withdrawal') day.withdrawals += tx.amount;
            }
        });

        return Array.from(dataMap.values());
    }, [filteredTransactions, timeRange]);

    // Pie chart data - transaction types
    const pieData = useMemo(() => [
        { name: 'Deposits', value: stats.totalDeposits, color: '#10B981' },
        { name: 'Investments', value: stats.totalInvestments, color: '#3B82F6' },
        { name: 'Withdrawals', value: stats.totalWithdrawals, color: '#EF4444' },
    ].filter(item => item.value > 0), [stats]);

    // Recent deposits for the log
    const recentDeposits = useMemo(() => {
        if (!transactions) return [];
        return transactions
            .filter(tx => tx.type === 'deposit' || tx.type === 'investment')
            .slice(0, 20);
    }, [transactions]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border rounded-lg shadow-lg">
                    <p className="font-medium">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: ${entry.value.toLocaleString('en-US')}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            Total Deposits
                        </CardDescription>
                        <CardTitle className="text-2xl">
                            ${stats.totalDeposits.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-500" />
                            Total Investments
                        </CardDescription>
                        <CardTitle className="text-2xl">
                            ${stats.totalInvestments.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-500" />
                            Active Users
                        </CardDescription>
                        <CardTitle className="text-2xl">{stats.uniqueUsers}</CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-orange-500" />
                            Avg. Deposit
                        </CardDescription>
                        <CardTitle className="text-2xl">
                            ${stats.avgDeposit.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Charts Section */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Investment Trends
                            </CardTitle>
                            <CardDescription>Daily transaction volume over time</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Time Range" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7">Last 7 Days</SelectItem>
                                    <SelectItem value="30">Last 30 Days</SelectItem>
                                    <SelectItem value="90">Last 90 Days</SelectItem>
                                    <SelectItem value="all">All Time</SelectItem>
                                </SelectContent>
                            </Select>
                            <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)}>
                                <TabsList>
                                    <TabsTrigger value="bar">Bar</TabsTrigger>
                                    <TabsTrigger value="line">Line</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'bar' ? (
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="deposits" name="Deposits" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="investments" name="Investments" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            ) : (
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="deposits" name="Deposits" stroke="#10B981" strokeWidth={2} />
                                    <Line type="monotone" dataKey="investments" name="Investments" stroke="#3B82F6" strokeWidth={2} />
                                </LineChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Transaction Distribution & Recent Deposits */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Transaction Distribution</CardTitle>
                        <CardDescription>Breakdown by transaction type</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `$${value.toLocaleString('en-US')}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 mt-4">
                            {pieData.map((entry, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-sm">{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Deposits Log */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowDownLeft className="w-5 h-5 text-green-500" />
                            Recent Deposits
                        </CardTitle>
                        <CardDescription>Latest user deposits and investments</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[280px]">
                            <div className="space-y-3">
                                {isLoading ? (
                                    <p className="text-center text-muted-foreground py-8">Loading...</p>
                                ) : recentDeposits.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No deposits yet</p>
                                ) : (
                                    recentDeposits.map((tx) => (
                                        <div
                                            key={tx.id}
                                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-green-100 rounded-full">
                                                    <ArrowDownLeft className="w-4 h-4 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{tx.user_display_name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {format(parseISO(tx.created_at), 'MMM d, HH:mm')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-green-600">
                                                    +${tx.amount.toLocaleString('en-US')}
                                                </p>
                                                <div className="flex items-center gap-1 justify-end">
                                                    {tx.blockchain_verified && (
                                                        <Badge variant="outline" className="text-xs bg-blue-50">
                                                            ✓ Blockchain
                                                        </Badge>
                                                    )}
                                                    <Badge variant="secondary" className="text-xs">
                                                        {tx.type}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
