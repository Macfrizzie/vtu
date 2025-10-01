
'use client';

import type { Transaction } from '@/lib/types';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';

interface OverviewChartProps {
  transactions: Transaction[];
}

export function OverviewChart({ transactions }: OverviewChartProps) {
  const chartData = useMemo(() => {
    const data: { [key: string]: { date: string; revenue: number; volume: number } } = {};
    const today = new Date();
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        data[dateString] = { date: dateString, revenue: 0, volume: 0 };
    }

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
       if (txDate > new Date(today.setDate(today.getDate() - 7))) {
          const dateString = txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (data[dateString]) {
            if (tx.type === 'Debit') {
                data[dateString].revenue += Math.abs(tx.amount);
            }
            data[dateString].volume += 1;
          }
       }
    });

    return Object.values(data);
  }, [transactions]);

  const chartConfig = {
    revenue: {
      label: 'Revenue (₦)',
      color: 'hsl(var(--primary))',
    },
    volume: {
      label: 'Volume',
      color: 'hsl(var(--secondary-foreground))',
    },
  };

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="date"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    yAxisId="left"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₦${value / 1000}k`}
                />
                 <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue (₦)" />
                <Bar yAxisId="right" dataKey="volume" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="Transactions" />
            </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}
