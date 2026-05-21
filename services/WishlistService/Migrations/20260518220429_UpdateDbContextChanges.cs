using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace WishlistService.Migrations
{
    /// <inheritdoc />
    public partial class UpdateDbContextChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WishlistItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    ProductName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ProductImage = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ProductPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    AddedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WishlistItems", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "WishlistItems",
                columns: new[] { "Id", "AddedDate", "ProductId", "ProductImage", "ProductName", "ProductPrice", "UserId" },
                values: new object[,]
                {
                    { 1, new DateTime(2024, 6, 5, 0, 0, 0, 0, DateTimeKind.Utc), 2, "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400", "Apple MacBook Air M3", 349999m, 3 },
                    { 2, new DateTime(2024, 6, 6, 0, 0, 0, 0, DateTimeKind.Utc), 9, "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400", "Canon EOS R50 Mirrorless Camera", 129999m, 3 },
                    { 3, new DateTime(2024, 6, 8, 0, 0, 0, 0, DateTimeKind.Utc), 11, "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400", "Dyson V15 Detect Vacuum", 89999m, 4 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_WishlistItems_UserId_ProductId",
                table: "WishlistItems",
                columns: new[] { "UserId", "ProductId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WishlistItems");
        }
    }
}
