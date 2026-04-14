using Microsoft.EntityFrameworkCore;
using InvoiceAuditor.API.Models;

namespace InvoiceAuditor.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // This line tells Entity Framework: "I have a table called Invoices"
        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<InvoiceItem> InvoiceItems { get; set; }
    }
}
