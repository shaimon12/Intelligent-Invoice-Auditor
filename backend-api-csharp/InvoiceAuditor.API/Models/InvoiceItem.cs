namespace InvoiceAuditor.API.Models
{
    public class InvoiceItem
    {
        public int InvoiceItemId { get; set; }
        
        // Foreign Key
        public int InvoiceId { get; set; }
        
        public string Description { get; set; }
        public decimal Amount { get; set; }
    }
}