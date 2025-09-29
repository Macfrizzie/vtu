
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { ChartTooltipContent } from '@/components/ui/chart';

interface RevenueData {
  date: string;
  revenue: number;
}

export function RevenueChart({ data }: { data: RevenueData[] }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="date"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `₦${Number(value) / 1000}k`}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--secondary))' }}
          content={<ChartTooltipContent 
            formatter={(value) => `₦${Number(value).toLocaleString()}`}
            labelClassName="font-bold"
           />}
        />
        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}


interface ServiceBreakdownData {
  name: string;
  count: number;
}

const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4d'];

export function ServiceBreakdownPieChart({ data }: { data: ServiceBreakdownData[] }) {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="name"
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

                        return (
                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="bold">
                                {`${(percent * 100).toFixed(0)}%`}
                            </text>
                        );
                    }}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip content={<ChartTooltipContent hideLabel />} />
                <Legend iconSize={10} />
            </PieChart>
        </ResponsiveContainer>
    );
}

