import React, { useEffect, useState } from 'react';
import { fetchAnalytics } from '../api';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    LineChart, Line 
  } from 'recharts';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics().then(setData).catch(console.error);
  }, []);

  if (!data) return <div style={{padding: '32px'}}>Loading Analytics...</div>;

  return (
    <div className="feed-section">
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px'}}>
        <div className="upload-card" style={{borderLeft: '4px solid var(--primary)'}}>
          <span className="field-label">Total Volume (AUD)</span>
          <div style={{fontSize: '2rem', fontWeight: 700}}>${data.totalSpend.toLocaleString()}</div>
        </div>
        <div className="upload-card" style={{borderLeft: '4px solid #10b981'}}>
          <span className="field-label">Invoices in System</span>
          <div style={{fontSize: '2rem', fontWeight: 700}}>{data.totalCount}</div>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
        <div className="table-card" style={{padding: '24px'}}>
          <h3 style={{marginBottom: '20px', fontSize: '1rem'}}>Spend by Category</h3>
          <div style={{height: '300px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="table-card" style={{padding: '24px'}}>
          <h3 style={{marginBottom: '20px', fontSize: '1rem'}}>Monthly Trend</h3>
          <div style={{height: '300px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={3} dot={{r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;