using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace CategoryService.Migrations
{
    /// <inheritdoc />
    public partial class UpdateDbContextChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ParentId = table.Column<int>(type: "int", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    UpdatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Categories_Categories_ParentId",
                        column: x => x.ParentId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "CreatedBy", "CreatedDate", "Description", "ImageUrl", "IsActive", "Name", "ParentId", "Slug", "SortOrder", "UpdatedBy", "UpdatedDate" },
                values: new object[,]
                {
                    { 1, "seed", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Phones, laptops, accessories and more", null, true, "Electronics", null, "electronics", 1, null, null },
                    { 2, "seed", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Clothing, shoes, and accessories", null, true, "Fashion", null, "fashion", 2, null, null },
                    { 3, "seed", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Furniture, appliances, and decor", null, true, "Home & Kitchen", null, "home-kitchen", 3, null, null },
                    { 4, "seed", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Sports gear and outdoor equipment", null, true, "Sports & Outdoors", null, "sports-outdoors", 4, null, null },
                    { 5, "seed", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Fiction, non-fiction, textbooks", null, true, "Books", null, "books", 5, null, null },
                    { 6, "seed", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Skincare, makeup, and fragrances", null, true, "Beauty", null, "beauty", 6, null, null },
                    { 7, "seed", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Toys, board games, and video games", null, true, "Toys & Games", null, "toys-games", 7, null, null },
                    { 8, "seed", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Car accessories and tools", null, true, "Automotive", null, "automotive", 8, null, null },
                    { 10, "seed", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Android and iOS phones", null, true, "Smartphones", 1, "smartphones", 1, null, null },
                    { 11, "seed", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Notebooks and ultrabooks", null, true, "Laptops", 1, "laptops", 2, null, null },
                    { 12, "seed", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Headphones, speakers, earbuds", null, true, "Audio", 1, "audio", 3, null, null },
                    { 13, "seed", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "DSLR, mirrorless, and action cameras", null, true, "Cameras", 1, "cameras", 4, null, null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Categories_ParentId",
                table: "Categories",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Slug",
                table: "Categories",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Categories");
        }
    }
}
