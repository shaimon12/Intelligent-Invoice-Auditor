import axios from 'axios';

// --- FIX THE PORT HERE ---
// Your Swagger screenshot shows the server is on port 5238.
// Your logs showed you were still trying to hit port 5000.
const API_BASE_URL = 'http://localhost:5238/api'; 
// -------------------------

export const fetchInvoices = async () => {
    // This matches the GET /api/Invoices in your Swagger
    const response = await axios.get(`${API_BASE_URL}/Invoices`);
    return response.data;
};

export const uploadInvoice = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // This matches the POST /api/Invoices/upload in your Swagger
    const response = await axios.post(`${API_BASE_URL}/Invoices/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
    
};
// Add this at the bottom of src/api.ts
export const deleteInvoice = async (id: number) => {
    await axios.delete(`${API_BASE_URL}/Invoices/${id}`);
};