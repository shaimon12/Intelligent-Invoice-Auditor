using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InvoiceAuditor.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDuplicateDetection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FileHash",
                table: "Invoices",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "IsDuplicate",
                table: "Invoices",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FileHash",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "IsDuplicate",
                table: "Invoices");
        }
    }
}
