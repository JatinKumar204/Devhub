// services/ProductService/Migrations/20260522000003_AddProductReviews.cs
// Additive — no existing tables modified.

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductService.Migrations
{
    public partial class AddProductReviews : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProductReviews",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(nullable: false),
                    BuyerId = table.Column<int>(nullable: false),
                    BuyerName = table.Column<string>(maxLength: 200, nullable: false),
                    OrderId = table.Column<int>(nullable: true),
                    Rating = table.Column<int>(nullable: false),
                    Title = table.Column<string>(maxLength: 200, nullable: false),
                    Body = table.Column<string>(maxLength: 4000, nullable: false),
                    SellerReply = table.Column<string>(maxLength: 2000, nullable: true),
                    SellerRepliedAt = table.Column<DateTime>(nullable: true),
                    SellerRepliedById = table.Column<int>(nullable: true),
                    IsVisible = table.Column<bool>(nullable: false, defaultValue: true),
                    ModeratorNote = table.Column<string>(maxLength: 500, nullable: true),
                    CreatedDate = table.Column<DateTime>(nullable: false),
                    UpdatedDate = table.Column<DateTime>(nullable: true),
                    CreatedBy = table.Column<string>(maxLength: 200, nullable: false),
                    UpdatedBy = table.Column<string>(maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductReviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductReviews_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // One review per buyer per product
            migrationBuilder.CreateIndex(
                name: "IX_ProductReviews_ProductId_BuyerId",
                table: "ProductReviews",
                columns: new[] { "ProductId", "BuyerId" },
                unique: true);

            migrationBuilder.CreateIndex(name: "IX_ProductReviews_ProductId", table: "ProductReviews", column: "ProductId");
            migrationBuilder.CreateIndex(name: "IX_ProductReviews_BuyerId", table: "ProductReviews", column: "BuyerId");
            migrationBuilder.CreateIndex(name: "IX_ProductReviews_IsVisible", table: "ProductReviews", column: "IsVisible");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "ProductReviews");
        }
    }
}
