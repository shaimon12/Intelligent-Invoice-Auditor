import { useEffect, useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { fetchInvoices, uploadInvoice, deleteInvoice } from './api';
import './App.css';

const API_BASE = 'http://localhost:5238/api';

export interface LineItem {
    id?: number;
    description: string;
    amount: number;
}

export interface Invoice {
    id: number;
    fileName: string;
    uploadDate: string;
    status: string;
    vendorName?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate: string | null;     
    totalAmount?: number;
    subTotal?: number;
    taxAmount?: number;
    vendorABN?: string;
    category?: string;
    paymentDetails?: string;
    lineItems?: LineItem[];
}

const formatCurrency = (amount?: number) => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
};

const validateMath = (inv: Invoice) => {
    let summaryValid = true;
    let itemsValid = true;
    let calculatedItemsSum = 0;

    if (inv.subTotal !== undefined && inv.taxAmount !== undefined && inv.totalAmount !== undefined) {
        const calculatedTotal = (inv.subTotal || 0) + (inv.taxAmount || 0);
        summaryValid = Math.abs(calculatedTotal - (inv.totalAmount || 0)) < 0.05;
    }

    if (inv.lineItems && inv.lineItems.length > 0 && inv.subTotal !== undefined) {
        calculatedItemsSum = inv.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
        itemsValid = Math.abs(calculatedItemsSum - inv.subTotal) < 0.05;
    }

    return { summaryValid, itemsValid, isFullyValid: summaryValid && itemsValid, calculatedItemsSum };
};

// --- FIX: TIMEZONE HELPER ---
// This forces JavaScript to recognize the database time as UTC
const formatUtcDate = (rawDateStr: string | undefined | null) => {
    if (!rawDateStr) return new Date().toISOString();
    // If it already has a timezone indicator (Z or +offset), leave it alone.
    // Otherwise, append 'Z' to explicitly mark it as UTC.
    return rawDateStr.endsWith('Z') || rawDateStr.includes('+') ? rawDateStr : `${rawDateStr}Z`;
};

function App() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const selectedInvoiceRef = useRef<Invoice | null>(null);
  
  useEffect(() => {
    selectedInvoiceRef.current = selectedInvoice;
  }, [selectedInvoice]);

  const refreshInvoices = async () => {
    try {
      const response = await fetchInvoices();
      
      const validData = (response as any[]).map((item) => ({
        id: item.invoiceId || item.id,
        fileName: item.originalFileName || item.fileName || 'Unknown File',
        status: item.processingStatus || item.status || 'Pending',
        
        // FIX: Wrap the date string in our new timezone helper
        uploadDate: formatUtcDate(item.createdAt || item.uploadDate),
        
        vendorName: item.extractedVendorName || item.vendorName || '-',
        invoiceNumber: item.extractedInvoiceNumber || 'Not found',
        invoiceDate: item.extractedDate ? new Date(item.extractedDate).toLocaleDateString() : '-',
        dueDate: item.extractedDueDate ? new Date(item.extractedDueDate).toLocaleDateString() : null,
        totalAmount: item.extractedTotalAmount || item.totalAmount,
        subTotal: item.extractedSubTotal,
        taxAmount: item.extractedTaxAmount,
        vendorABN: item.extractedVendorABN || '-',
        category: item.category || 'Uncategorized',
        paymentDetails: item.paymentDetails || '-',
        lineItems: item.lineItems ? item.lineItems.map((li: any) => ({
            id: li.invoiceItemId || li.id,
            description: li.description || 'Unknown Item',
            amount: li.amount || 0
        })) : []
      }));

      setInvoices(validData.sort((a, b) => b.id - a.id));
      
      if (selectedInvoiceRef.current) {
         const updatedSelected = validData.find(i => i.id === selectedInvoiceRef.current?.id);
         if (updatedSelected) setSelectedInvoice(updatedSelected);
      }
    } catch (error) {
      console.error("Failed to fetch invoices", error);
    }
  };

  useEffect(() => {
    refreshInvoices();
    const interval = setInterval(refreshInvoices, 5000);
    return () => clearInterval(interval);
  }, []); 

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setUploading(true);
    uploadInvoice(acceptedFiles[0])
      .then(async () => { await refreshInvoices(); })
      .catch((error) => { console.error("Upload Error:", error); alert('Upload failed!'); })
      .finally(() => { setUploading(false); });
  }, []);

  const { getRootProps, getInputProps } = useDropzone({ onDrop, 
    accept: {
      'application/pdf': ['.pdf']
    }
  } as any);

  const handleDelete = async (id: number) => {
      if (!window.confirm("Are you sure you want to delete this invoice? This cannot be undone.")) return;
      
      try {
          await deleteInvoice(id);
          setSelectedInvoice(null); 
          await refreshInvoices();  
      } catch (error) {
          console.error("Failed to delete", error);
          alert("Could not delete invoice.");
      }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">
          <div className="logo-box">A</div>
          <span>Intelligent Auditor</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'0.85rem', color:'#166534', background:'#dcfce7', padding:'4px 12px', borderRadius:'20px'}}>
           <div style={{width:'8px', height:'8px', background:'#166534', borderRadius:'50%'}}></div>
           System Online
        </div>
      </header>

      <main className="main-layout">
        <section className="feed-section">
          <div className="upload-card">
            <div {...getRootProps()} className="dropzone">
              <input {...(getInputProps() as any)} />
              {uploading ? (
                 <h3>⏳ Processing Invoice...</h3>
              ) : (
                 <>
                   <div style={{fontSize: '32px', marginBottom: '10px'}}>☁️</div>
                   <h3>Click to upload invoice</h3>
                   <p>Only PDF files allowed</p>
                 </>
              )}
            </div>
          </div>

          <div className="table-card">
            <div className="table-header">
              <h2>Recent Invoices</h2>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{width:'50px'}}>#</th>
                    <th style={{width:'100px'}}>Status</th>
                    <th>Vendor</th>
                    <th>Upload Time</th>
                    <th style={{textAlign: 'right'}}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const isSelected = selectedInvoice?.id === inv.id;
                    const mathCheck = validateMath(inv);
                    return (
                      <tr 
                        key={inv.id} 
                        onClick={() => setSelectedInvoice(inv)}
                        className={isSelected ? 'active-row' : ''}
                      >
                        <td style={{color:'#6b7280', fontWeight: 600}}>{inv.id}</td>
                        <td>
                           <span className={`badge ${inv.status.toLowerCase()}`}>{inv.status}</span>
                        </td>
                        <td>
                          <div style={{fontWeight: 600, color:'#111827'}}>{inv.vendorName}</div>
                          <div style={{fontSize:'0.8rem', color:'#6b7280'}}>{inv.category}</div>
                        </td>
                        <td style={{color:'#4b5563', fontSize:'0.85rem'}}>
                            {new Date(inv.uploadDate).toLocaleString()}
                        </td>
                        <td style={{textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', fontSize: '1rem'}}>
                          {formatCurrency(inv.totalAmount)}
                          {!mathCheck.isFullyValid && <span title="Math mismatch detected!" style={{color:'red', marginLeft:'5px', fontSize:'0.8rem'}}>⚠️</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {selectedInvoice && (
          <aside className="inspector-panel">
            <div className="inspector-header">
              <h3>Invoice #{selectedInvoice.id} Details</h3>
              <button className="close-btn" onClick={() => setSelectedInvoice(null)}>×</button>
            </div>

            <div className="inspector-content">
              <div style={{
                  height: '220px', background: '#f3f4f6', borderRadius: '8px', 
                  marginBottom: '24px', overflow: 'hidden', border: '1px solid #e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <iframe 
                    src={`${API_BASE}/Invoices/${selectedInvoice.id}/file`} 
                    style={{width:'100%', height:'100%', border:'none'}} 
                    title="Invoice Preview"
                />
              </div>

              <div className="vendor-block">
                <div className="vendor-avatar">
                  {selectedInvoice.vendorName?.charAt(0) || '#'}
                </div>
                <div className="vendor-info">
                  <h4>{selectedInvoice.vendorName}</h4>
                  <p>ABN: {selectedInvoice.vendorABN}</p>
                </div>
              </div>

              <div className="info-grid">
                 <div>
                    <span className="field-label">Invoice #</span>
                    <div className="field-value">{selectedInvoice.invoiceNumber}</div>
                 </div>
                 <div>
                    <span className="field-label">Category</span>
                    <div className="field-value">{selectedInvoice.category}</div>
                 </div>
                 <div>
                    <span className="field-label">Invoice Date</span>
                    <div className="field-value">{selectedInvoice.invoiceDate}</div>
                 </div>
                 <div>
                    <span className="field-label">Due Date</span>
                    <div className="field-value" style={{color: selectedInvoice.dueDate ? 'inherit' : '#9ca3af'}}>
                        {selectedInvoice.dueDate || 'No Due Date'}
                    </div>
                 </div>
              </div>

              {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 && (
                <div style={{marginBottom: '24px'}}>
                  <span className="field-label" style={{marginBottom: '10px', display: 'block'}}>Extracted Line Items</span>
                  <div style={{background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px'}}>
                    {selectedInvoice.lineItems.map((item, idx) => (
                      <div key={idx} style={{display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: idx !== selectedInvoice.lineItems!.length - 1 ? '1px dashed #e2e8f0' : 'none', fontSize: '0.85rem'}}>
                        <span style={{color: 'var(--text-main)'}}>{item.description}</span>
                        <span style={{fontWeight: 600}}>{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="receipt-box">
                  <div className="receipt-row">
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedInvoice.subTotal)}</span>
                  </div>
                  <div className="receipt-row">
                      <span>Tax (GST)</span>
                      <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                  </div>
                  <div className="receipt-divider"></div>
                  <div className="receipt-total">
                      <span>Total</span>
                      <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
                  </div>

                  {(() => {
                      const math = validateMath(selectedInvoice);
                      if (math.isFullyValid) return null;

                      return (
                          <div style={{marginTop:'16px', padding:'12px', background:'#fee2e2', color:'#991b1b', borderRadius:'6px', fontSize:'0.85rem', border: '1px solid #f87171'}}>
                              <div style={{fontWeight: 700, marginBottom: '6px'}}>⚠️ Math Irregularities Detected</div>
                              <ul style={{margin: 0, paddingLeft: '20px'}}>
                                  {!math.summaryValid && <li>Stated Subtotal + Tax does not equal Stated Total.</li>}
                                  {!math.itemsValid && <li>Sum of extracted items (<b>{formatCurrency(math.calculatedItemsSum)}</b>) does not match stated subtotal (<b>{formatCurrency(selectedInvoice.subTotal)}</b>).</li>}
                              </ul>
                          </div>
                      );
                  })()}
              </div>

              <div className="audit-box" style={{marginBottom: '24px'}}>
                 <div className="audit-title">
                    <span>🛡️</span> Audit Intelligence
                 </div>
                 <div className="audit-text">
                    <strong>Payment Details Extracted:</strong><br/>
                    {selectedInvoice.paymentDetails}
                 </div>
              </div>

              <button 
                  onClick={() => handleDelete(selectedInvoice.id)}
                  style={{
                      width: '100%', padding: '12px', background: '#fef2f2', 
                      color: '#dc2626', border: '1px solid #f87171', borderRadius: '8px',
                      fontWeight: 600, cursor: 'pointer', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center', gap: '8px',
                      transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#fef2f2'}
              >
                  🗑️ Delete Invoice Record
              </button>

            </div>
          </aside>
        )}

      </main>
    </div>
  );
}

export default App;