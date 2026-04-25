import React, { useEffect, useState } from 'react';
import { fetchAnalytics } from '../api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';

// Helper to format tooltip values as currency
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value);
};

// Helper to format Y-Axis ticks (e.g., $20k instead of 20000)
const formatYAxis = (tickItem: number) => {
    if (tickItem === 0) return '$0';
    if (tickItem >= 1000) return `$${(tickItem / 1000).toFixed(0)}k`;
    return `$${tickItem}`;
};

// Custom minimal tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: '#fff', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>{label}</p>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem' }}>
                    {formatCurrency(payload[0].value)}
                </p>
            </div>
        );
    }
    return null;
};

const Dashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics().then(setData).catch(console.error);
  }, []);

  if (!data) return <div style={{padding: '32px'}}>Loading Analytics...</div>;

  return (
    <div className="feed-section">
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '8px'}}>
        <div className="upload-card" style={{borderLeft: '4px solid var(--primary)'}}>
          <span style={{display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px'}}>Total Volume (AUD)</span>
          <div style={{fontSize: '2.5rem', fontWeight: 700}}>{formatCurrency(data.totalSpend)}</div>
        </div>
        <div className="upload-card" style={{borderLeft: '4px solid #10b981'}}>
          <span style={{display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px'}}>Completed Invoices</span>
          <div style={{fontSize: '2.5rem', fontWeight: 700}}>{data.totalCount}</div>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
        <div className="table-card" style={{padding: '24px'}}>
          <h3 style={{marginBottom: '20px', fontSize: '1rem', marginTop: 0}}>Spend by Category</h3>
          <div style={{height: '300px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatYAxis} width={60} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f1f5f9'}} />
                {/* FIX: maxBarSize prevents the bar from taking up the whole screen */}
                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="table-card" style={{padding: '24px'}}>
          <h3 style={{marginBottom: '20px', fontSize: '1rem', marginTop: 0}}>Monthly Trend</h3>
          <div style={{height: '300px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatYAxis} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={3} dot={{r: 6, fill: 'var(--primary)'}} activeDot={{r: 8}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;