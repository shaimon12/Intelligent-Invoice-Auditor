using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InvoiceAuditor.API.Data;
using InvoiceAuditor.API.Models;
using System.IO; 
using System;
using System.Security.Cryptography;

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
            if (file == null || file.Length == 0) return BadRequest("No file was uploaded.");
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (extension != ".pdf") return BadRequest("Only .pdf files are permitted.");

            // 1. Read file into memory safely (prevents Stream Position bugs)
            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            var fileBytes = memoryStream.ToArray();

            // 2. Calculate the exact SHA-256 Hash
            string fileHash;
            using (var sha256 = System.Security.Cryptography.SHA256.Create())
            {
                var hashBytes = sha256.ComputeHash(fileBytes);
                fileHash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
            }

            // 3. Check if this exact hash exists in the database
            var isDuplicate = await _context.Invoices.AnyAsync(i => i.FileHash == fileHash);

            // 4. Save to physical disk
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
            Directory.CreateDirectory(uploadsFolder);
            var uniqueFileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);
            
            await System.IO.File.WriteAllBytesAsync(filePath, fileBytes);

            // 5. Save record to DB
            var invoice = new Invoice
            {
                OriginalFileName = file.FileName,
                StoredFilePath = $"Uploads/{uniqueFileName}",
                FileHash = fileHash,
                IsDuplicate = isDuplicate,
                
                // This is the magic line. If it's a duplicate, Worker.py will ignore it!
                ProcessingStatus = isDuplicate ? "DUPLICATE" : "PENDING",
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