using InvoiceAuditor.API.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// 1. Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// --- ADD THIS: Register CORS Service ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173") // Your Frontend URL
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});
// ---------------------------------------

// 2. CONFIGURATION: Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

var app = builder.Build();

// 3. Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// --- UPDATE THIS: Apply the CORS policy ---
// This must be BEFORE UseAuthorization
app.UseCors("AllowReactApp"); 
// ------------------------------------------

app.UseAuthorization();
app.MapControllers();

app.Run();