using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InvoiceAuditor.API.Data;
using InvoiceAuditor.API.Models;
using System.IO; 
using System;

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
            // 1. Check if a file was actually sent
            if (file == null || file.Length == 0)
                return BadRequest("No file was uploaded.");

            // 2. Validate the file extension
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (extension != ".pdf")
                return BadRequest("Only .pdf files are permitted.");

            // 3. Validate the MIME type (to prevent renamed malicious files)
            if (file.ContentType != "application/pdf")
                return BadRequest("Invalid file format detected.");

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            // 4. Generate a secure, unique filename for the physical disk
            var uniqueFileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // 5. Save the record to the database
            var invoice = new Invoice
            {
                OriginalFileName = file.FileName,             // The pretty name for the UI
                StoredFilePath = $"Uploads/{uniqueFileName}", // The safe, unique path for the backend
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

        [HttpGet("{id}/file")]
        public async Task<IActionResult> GetInvoiceFile(int id)
        {
            var invoice = await _context.Invoices.FindAsync(id);
            if (invoice == null) return NotFound("Invoice not found in DB.");

            // Use the StoredFilePath (the GUID name) to find the file
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), invoice.StoredFilePath);

            if (!System.IO.File.Exists(filePath))
                return NotFound("File not found on server disk.");

            // Since we strictly enforce PDFs on upload, we know exactly what this is
            var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
            return File(fileBytes, "application/pdf");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInvoice(int id)
        {
            var invoice = await _context.Invoices.FindAsync(id);
            if (invoice == null) return NotFound("Invoice not found.");

            // 1. Delete the unique physical file from the Uploads folder
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), invoice.StoredFilePath);
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }

            // 2. Delete the record from Database
            _context.Invoices.Remove(invoice);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}