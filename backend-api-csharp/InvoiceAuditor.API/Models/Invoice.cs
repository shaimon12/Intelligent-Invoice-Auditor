using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InvoiceAuditor.API.Models
{
    // This class maps to the "Invoices" table in MySQL
    public class Invoice
    {
        [Key]
        public int InvoiceId { get; set; }

        public string OriginalFileName { get; set; } = string.Empty;
        public string StoredFilePath { get; set; } = string.Empty;
        
        public string ProcessingStatus { get; set; } = "PENDING";

        public ICollection<InvoiceItem> LineItems { get; set; } = new List<InvoiceItem>();

        // --- AI Extracted Fields ---
        public string? ExtractedInvoiceNumber { get; set; }
        public string? ExtractedVendorName { get; set; }
        public DateTime? ExtractedDate { get; set; }       // Invoice Date
        public decimal? ExtractedTotalAmount { get; set; }

        // --- NEW: FUTURE-PROOF FIELDS (Added Jan 2026) ---
        
        // 1. Time Management
        public DateTime? ExtractedDueDate { get; set; }    // Track overdue bills

        // 2. Financial Breakdown (Essential for Tax Audits)
        public decimal? ExtractedSubTotal { get; set; }    // Net Amount (Before Tax)
        public decimal? ExtractedTaxAmount { get; set; }   // GST / VAT Amount

        // 3. Vendor Validation (Fraud Prevention)
        public string? ExtractedVendorABN { get; set; }    // Tax ID / ABN
        public string? ExtractedVendorAddress { get; set; } 
        
        // 4. Classification & Payment
        public string? Category { get; set; }              // e.g., "Office Supplies", "Software"
        public string? PaymentDetails { get; set; }        // e.g., BSB/Account Number
        
        // --------------------------------------------------

        // Audit Fields
        public decimal? ConfidenceScore { get; set; }
        public bool IsFlaggedForFraud { get; set; } = false;

        // ... existing fields ...

        // --- Duplicate Detection ---
        public string? FileHash { get; set; }              // SHA-256 hash of the PDF
        public bool IsDuplicate { get; set; } = false;     // True if hash already exists

// ... existing fields ...
        
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime? ProcessedAt { get; set; }
        
    }
}