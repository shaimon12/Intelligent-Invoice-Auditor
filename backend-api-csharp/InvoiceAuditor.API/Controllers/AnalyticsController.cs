using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InvoiceAuditor.API.Data;
using InvoiceAuditor.API.Models;

namespace InvoiceAuditor.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AnalyticsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            // Filter strictly for COMPLETED invoices
            var completedInvoices = _context.Invoices.Where(i => i.ProcessingStatus == "COMPLETED");

            var totalSpend = await completedInvoices.SumAsync(i => i.ExtractedTotalAmount ?? 0);
            
            // FIX: Count ONLY the completed invoices
            var totalCount = await completedInvoices.CountAsync(); 

            var categoryData = await completedInvoices
                .GroupBy(i => i.Category ?? "Uncategorized")
                .Select(g => new { 
                    name = g.Key, 
                    value = (double)g.Sum(i => i.ExtractedTotalAmount ?? 0) 
                })
                .ToListAsync();

            var monthlyData = await completedInvoices
                .GroupBy(i => new { 
                    Year = (i.ExtractedDate ?? i.CreatedAt).Year, 
                    Month = (i.ExtractedDate ?? i.CreatedAt).Month 
                })
                .Select(g => new {
                    month = $"{g.Key.Month}/{g.Key.Year}",
                    total = (double)g.Sum(i => i.ExtractedTotalAmount ?? 0),
                    sortKey = g.Key.Year * 100 + g.Key.Month
                })
                .OrderBy(x => x.sortKey)
                .ToListAsync();

            return Ok(new { totalSpend, totalCount, categoryData, monthlyData });
        }
    }
}