using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace OrderService.Migrations
{
    /// <inheritdoc />
    public partial class AddShipmentTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SellerId",
                table: "OrderLines",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SellerName",
                table: "OrderLines",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "Shipments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    SellerId = table.Column<int>(type: "int", nullable: false),
                    SellerName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    TrackingNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Carrier = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    EstimatedDelivery = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ShippedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeliveredAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Shipments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Shipments_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "OrderLines",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "SellerId", "SellerName" },
                values: new object[] { 2, "Bob's Store" });

            migrationBuilder.UpdateData(
                table: "OrderLines",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "SellerId", "SellerName" },
                values: new object[] { 2, "Bob's Store" });

            migrationBuilder.UpdateData(
                table: "OrderLines",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "SellerId", "SellerName" },
                values: new object[] { 5, "TechMart Official" });

            migrationBuilder.UpdateData(
                table: "OrderLines",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "SellerId", "SellerName" },
                values: new object[] { 5, "TechMart Official" });

            migrationBuilder.UpdateData(
                table: "OrderLines",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "SellerId", "SellerName" },
                values: new object[] { 5, "TechMart Official" });

            migrationBuilder.UpdateData(
                table: "OrderLines",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "SellerId", "SellerName" },
                values: new object[] { 5, "TechMart Official" });

            migrationBuilder.UpdateData(
                table: "OrderLines",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "SellerId", "SellerName" },
                values: new object[] { 5, "TechMart Official" });

            migrationBuilder.InsertData(
                table: "Shipments",
                columns: new[] { "Id", "Carrier", "CreatedDate", "DeliveredAt", "EstimatedDelivery", "Notes", "OrderId", "SellerId", "SellerName", "ShippedAt", "Status", "TrackingNumber", "UpdatedDate" },
                values: new object[,]
                {
                    { 1, "TCS", new DateTime(2024, 6, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2024, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), null, null, 1, 2, "Bob's Store", new DateTime(2024, 6, 4, 0, 0, 0, 0, DateTimeKind.Utc), "Delivered", "DH-001-BOB", null },
                    { 2, "Leopards", new DateTime(2024, 6, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2024, 6, 7, 0, 0, 0, 0, DateTimeKind.Utc), null, null, 1, 5, "TechMart Official", new DateTime(2024, 6, 5, 0, 0, 0, 0, DateTimeKind.Utc), "Delivered", "DH-001-TM", null },
                    { 3, "BlueEx", new DateTime(2024, 6, 10, 0, 0, 0, 0, DateTimeKind.Utc), null, new DateTime(2024, 6, 15, 0, 0, 0, 0, DateTimeKind.Utc), null, 2, 5, "TechMart Official", new DateTime(2024, 6, 12, 0, 0, 0, 0, DateTimeKind.Utc), "Shipped", "DH-002-TM", null },
                    { 4, null, new DateTime(2024, 6, 12, 0, 0, 0, 0, DateTimeKind.Utc), null, null, null, 3, 5, "TechMart Official", null, "Preparing", null, null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CreatedDate",
                table: "Orders",
                column: "CreatedDate");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CustomerId",
                table: "Orders",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_Status",
                table: "Orders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_OrderLines_SellerId",
                table: "OrderLines",
                column: "SellerId");

            migrationBuilder.CreateIndex(
                name: "IX_Shipments_OrderId_SellerId",
                table: "Shipments",
                columns: new[] { "OrderId", "SellerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Shipments_SellerId",
                table: "Shipments",
                column: "SellerId");

            migrationBuilder.CreateIndex(
                name: "IX_Shipments_Status",
                table: "Shipments",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Shipments");

            migrationBuilder.DropIndex(
                name: "IX_Orders_CreatedDate",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_CustomerId",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_Status",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_OrderLines_SellerId",
                table: "OrderLines");

            migrationBuilder.DropColumn(
                name: "SellerId",
                table: "OrderLines");

            migrationBuilder.DropColumn(
                name: "SellerName",
                table: "OrderLines");
        }
    }
}
