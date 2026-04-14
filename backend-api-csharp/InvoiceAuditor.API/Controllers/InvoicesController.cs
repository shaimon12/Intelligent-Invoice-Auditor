using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InvoiceAuditor.API.Data;
using InvoiceAuditor.API.Models;
using System.IO; 

namespace InvoiceAuditor.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InvoicesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public InvoicesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadInvoice(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            var filePath = Path.Combine(uploadsFolder, file.FileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var invoice = new Invoice
            {
                OriginalFileName = file.FileName,
                StoredFilePath = $"Uploads/{file.FileName}", 
                ProcessingStatus = "PENDING",
                CreatedAt = DateTime.UtcNow
            };

            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetInvoices), new { id = invoice.InvoiceId }, invoice);
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Invoice>>> GetInvoices()
        {
            return await _context.Invoices.Include(i => i.LineItems).ToListAsync();
        }

        // --- NEW ENDPOINT: SERVE THE FILE ---
        [HttpGet("{id}/file")]
        public async Task<IActionResult> GetInvoiceFile(int id)
        {
            var invoice = await _context.Invoices.FindAsync(id);
            if (invoice == null) return NotFound("Invoice not found in DB.");

            // Construct the path reliably
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", invoice.OriginalFileName);

            if (!System.IO.File.Exists(filePath))
                return NotFound("File not found on server disk.");

            // Determine Content Type (MIME)
            string contentType = "application/octet-stream";
            var ext = Path.GetExtension(filePath).ToLowerInvariant();
            if (ext == ".pdf") contentType = "application/pdf";
            else if (ext == ".jpg" || ext == ".jpeg") contentType = "image/jpeg";
            else if (ext == ".png") contentType = "image/png";

            var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
            return File(fileBytes, contentType);
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInvoice(int id)
        {
            var invoice = await _context.Invoices.FindAsync(id);
            if (invoice == null) return NotFound("Invoice not found.");

            // 1. Delete the physical file from the Uploads folder
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", invoice.OriginalFileName);
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }

            // 2. Delete from Database
            _context.Invoices.Remove(invoice);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}