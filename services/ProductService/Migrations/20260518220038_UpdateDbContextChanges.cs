using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ProductService.Migrations
{
    /// <inheritdoc />
    public partial class UpdateDbContextChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "UpdatedBy",
                table: "Products",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Tags",
                table: "Products",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Products",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "CreatedBy",
                table: "Products",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "Products",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Brand",
                table: "Products",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AltText",
                table: "ProductImages",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.InsertData(
                table: "Products",
                columns: new[] { "Id", "Brand", "Category", "CategoryId", "CreatedBy", "CreatedDate", "Description", "DiscountPercent", "ImageUrl", "IsActive", "IsFeatured", "Name", "OriginalPrice", "Price", "Rating", "ReviewCount", "SellerId", "Sku", "Stock", "Tags", "UpdatedBy", "UpdatedDate" },
                values: new object[,]
                {
                    { 1, "Samsung", "Electronics", null, "seed", new DateTime(2024, 3, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Latest Samsung flagship with AI-powered camera and all-day battery life.", 10, "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400", true, true, "Samsung Galaxy S24", 209999m, 189999m, 4.5m, 128, 1, "EL-001", 45, "smartphone,android,samsung", null, null },
                    { 2, "Apple", "Electronics", null, "seed", new DateTime(2024, 3, 5, 0, 0, 0, 0, DateTimeKind.Utc), "Ultra-thin laptop with Apple M3 chip. 18 hours battery life, fanless design.", 8, "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400", true, true, "Apple MacBook Air M3", 379999m, 349999m, 4.8m, 256, 1, "EL-002", 22, "laptop,apple,macbook", null, null },
                    { 3, "Sony", "Electronics", null, "seed", new DateTime(2024, 3, 8, 0, 0, 0, 0, DateTimeKind.Utc), "Industry-leading noise cancellation with 30-hour battery and crystal-clear calls.", 18, "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400", true, true, "Sony WH-1000XM5 Headphones", 79999m, 65999m, 4.7m, 412, 1, "EL-003", 60, "headphones,sony,noise-cancelling", null, null },
                    { 4, "Nike", "Fashion", null, "seed", new DateTime(2024, 3, 10, 0, 0, 0, 0, DateTimeKind.Utc), "Inspired by two iconic Air Max models, the 270 delivers unrivaled comfort.", 22, "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400", true, true, "Nike Air Max 270", 31999m, 24999m, 4.4m, 189, 1, "FA-001", 85, "shoes,nike,running", null, null },
                    { 5, "Levis", "Fashion", null, "seed", new DateTime(2024, 3, 12, 0, 0, 0, 0, DateTimeKind.Utc), "The original straight fit jean with button fly. The jeans that started it all.", 25, "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400", true, false, "Levi's 501 Original Jeans", 11999m, 8999m, 4.3m, 95, 1, "FA-002", 120, "jeans,levis,fashion", null, null },
                    { 6, "Instant Pot", "Home & Kitchen", null, "seed", new DateTime(2024, 3, 14, 0, 0, 0, 0, DateTimeKind.Utc), "Multi-use pressure cooker, slow cooker, rice cooker, steamer, sauté, and warmer.", 21, "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400", true, true, "Instant Pot Duo 7-in-1", 23999m, 18999m, 4.6m, 342, 1, "HK-001", 35, "kitchen,cooking,appliance", null, null },
                    { 7, "LifeFit", "Sports & Outdoors", null, "seed", new DateTime(2024, 3, 16, 0, 0, 0, 0, DateTimeKind.Utc), "Extra thick 6mm exercise mat with superior grip. Ideal for yoga, pilates, and stretching.", 0, "https://images.unsplash.com/photo-1601925228010-f9c19985bee7?w=400", true, false, "Yoga Mat Premium Non-Slip", null, 3499m, 4.2m, 67, 1, "SP-001", 200, "yoga,fitness,mat", null, null },
                    { 8, "Addison-Wesley", "Books", null, "seed", new DateTime(2024, 3, 18, 0, 0, 0, 0, DateTimeKind.Utc), "From journeyman to master — timeless wisdom for software developers.", 20, "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400", true, false, "The Pragmatic Programmer", 4999m, 3999m, 4.9m, 512, 1, "BK-001", 75, "programming,books,software", null, null },
                    { 9, "Canon", "Electronics", null, "seed", new DateTime(2024, 3, 20, 0, 0, 0, 0, DateTimeKind.Utc), "24.2MP APS-C mirrorless with dual pixel autofocus and 4K video.", 13, "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400", true, true, "Canon EOS R50 Mirrorless Camera", 149999m, 129999m, 4.6m, 78, 1, "EL-004", 15, "camera,canon,photography", null, null },
                    { 10, "Logitech", "Electronics", null, "seed", new DateTime(2024, 3, 22, 0, 0, 0, 0, DateTimeKind.Utc), "Advanced wireless mouse with MagSpeed scroll wheel and customizable buttons.", 17, "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400", true, false, "Logitech MX Master 3S Mouse", 17999m, 14999m, 4.7m, 223, 1, "EL-005", 90, "mouse,logitech,wireless", null, null },
                    { 11, "Dyson", "Home & Kitchen", null, "seed", new DateTime(2024, 3, 24, 0, 0, 0, 0, DateTimeKind.Utc), "Laser detects hidden dust. Piezo sensor counts and sizes particles in real time.", 18, "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400", true, true, "Dyson V15 Detect Vacuum", 109999m, 89999m, 4.5m, 134, 1, "HK-002", 12, "vacuum,dyson,cleaning", null, null },
                    { 12, "Adidas", "Fashion", null, "seed", new DateTime(2024, 3, 26, 0, 0, 0, 0, DateTimeKind.Utc), "Energy-returning Boost midsole in a Primeknit+ upper. Run further, feel better.", 18, "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400", true, false, "Adidas Ultraboost 22", 27999m, 22999m, 4.4m, 167, 1, "FA-003", 55, "shoes,adidas,running", null, null }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 12);

            migrationBuilder.AlterColumn<string>(
                name: "UpdatedBy",
                table: "Products",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Tags",
                table: "Products",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Products",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<string>(
                name: "CreatedBy",
                table: "Products",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "Products",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "Brand",
                table: "Products",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AltText",
                table: "ProductImages",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200,
                oldNullable: true);
        }
    }
}
