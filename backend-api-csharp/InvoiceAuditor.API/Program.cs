using InvoiceAuditor.API.Data;
using InvoiceAuditor.API.Hubs; // NEW: Required to find your InvoiceHub
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// 1. Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// --- NEW: Register SignalR Service ---
builder.Services.AddSignalR();
// -------------------------------------

// 2. CONFIGURATION: Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// 3. CONFIGURATION: CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            // This tells .NET to allow ANY local Vite URL (localhost, 127.0.0.1, any port)
            policy.SetIsOriginAllowed(origin => true) 
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials(); // Still required for SignalR
        });
});

// ==========================================
// BUILD THE APP (Only call this once!)
// ==========================================
var app = builder.Build();

// 4. Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection();

// --- Apply CORS BEFORE Authorization and Hub Mapping ---
app.UseCors("AllowReactApp"); 

app.UseAuthorization();
app.MapControllers();

// --- NEW: Map the SignalR Hub Endpoint ---
app.MapHub<InvoiceHub>("/hubs/invoices");
// -----------------------------------------

app.Run();