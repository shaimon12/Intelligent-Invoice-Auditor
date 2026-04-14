export interface Invoice {
    id: number;
    fileName: string;
    uploadDate: string;
    status: 'Pending' | 'Completed' | 'Failed';
    vendorName?: string;
    invoiceDate?: string;
    totalAmount?: number;
}