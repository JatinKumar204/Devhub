using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace UserService.Migrations
{
    /// <inheritdoc />
    public partial class AddSellerVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SellerProfiles",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "int", nullable: false),
                    StoreName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    StoreDescription = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    StoreLogoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    AddressLine1 = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    AddressLine2 = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    City = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Province = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PostalCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Country = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false, defaultValue: "Pakistan"),
                    BankName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    AccountTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    AccountNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IbanNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    NtnNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SalesTaxNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    UpdatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SellerProfiles", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_SellerProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SellerVerifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ReviewedByAdminId = table.Column<int>(type: "int", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SubmissionCount = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastResubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    UpdatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SellerVerifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SellerVerifications_SellerProfiles_UserId",
                        column: x => x.UserId,
                        principalTable: "SellerProfiles",
                        principalColumn: "UserId");
                    table.ForeignKey(
                        name: "FK_SellerVerifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VerificationDocuments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VerificationId = table.Column<int>(type: "int", nullable: false),
                    DocumentType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    FilePath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    OriginalFileName = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    UpdatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VerificationDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VerificationDocuments_SellerVerifications_VerificationId",
                        column: x => x.VerificationId,
                        principalTable: "SellerVerifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VerificationStatusHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VerificationId = table.Column<int>(type: "int", nullable: false),
                    FromStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ToStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ChangedByUserId = table.Column<int>(type: "int", nullable: false),
                    ChangedByName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VerificationStatusHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VerificationStatusHistories_SellerVerifications_VerificationId",
                        column: x => x.VerificationId,
                        principalTable: "SellerVerifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "SellerProfiles",
                columns: new[] { "UserId", "AccountNumber", "AccountTitle", "AddressLine1", "AddressLine2", "BankName", "City", "Country", "CreatedBy", "CreatedDate", "IbanNumber", "NtnNumber", "PhoneNumber", "PostalCode", "Province", "SalesTaxNumber", "StoreDescription", "StoreLogoUrl", "StoreName", "UpdatedBy", "UpdatedDate" },
                values: new object[,]
                {
                    { 2, null, null, "123 Main Street", null, null, "Karachi", "Pakistan", "seed", new DateTime(2024, 3, 10, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "03001234567", "75500", "Sindh", null, null, null, "Bob's Store", null, null },
                    { 5, null, null, "456 Tech Avenue", null, null, "Lahore", "Pakistan", "seed", new DateTime(2024, 6, 5, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "03119876543", "54000", "Punjab", null, null, null, "TechMart Official", null, null }
                });

            migrationBuilder.InsertData(
                table: "SellerVerifications",
                columns: new[] { "Id", "CreatedBy", "CreatedDate", "LastResubmittedAt", "ReviewedAt", "ReviewedByAdminId", "Status", "SubmissionCount", "SubmittedAt", "UpdatedBy", "UpdatedDate", "UserId" },
                values: new object[,]
                {
                    { 1, "seed", new DateTime(2024, 3, 10, 0, 0, 0, 0, DateTimeKind.Utc), null, new DateTime(2024, 3, 11, 0, 0, 0, 0, DateTimeKind.Utc), 1, "Approved", 1, new DateTime(2024, 3, 10, 0, 0, 0, 0, DateTimeKind.Utc), null, null, 2 },
                    { 2, "seed", new DateTime(2024, 6, 5, 0, 0, 0, 0, DateTimeKind.Utc), null, new DateTime(2024, 6, 6, 0, 0, 0, 0, DateTimeKind.Utc), 1, "Approved", 1, new DateTime(2024, 6, 5, 0, 0, 0, 0, DateTimeKind.Utc), null, null, 5 }
                });

            migrationBuilder.InsertData(
                table: "VerificationStatusHistories",
                columns: new[] { "Id", "ChangedAt", "ChangedByName", "ChangedByUserId", "Comment", "FromStatus", "ToStatus", "VerificationId" },
                values: new object[,]
                {
                    { 1, new DateTime(2024, 3, 11, 0, 0, 0, 0, DateTimeKind.Utc), "Alice Johnson", 1, "Verified via seed data migration", "PendingApproval", "Approved", 1 },
                    { 2, new DateTime(2024, 6, 6, 0, 0, 0, 0, DateTimeKind.Utc), "Alice Johnson", 1, "Verified via seed data migration", "PendingApproval", "Approved", 2 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_SellerVerifications_Status",
                table: "SellerVerifications",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SellerVerifications_SubmittedAt",
                table: "SellerVerifications",
                column: "SubmittedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SellerVerifications_UserId",
                table: "SellerVerifications",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VerificationDocuments_VerificationId_Status",
                table: "VerificationDocuments",
                columns: new[] { "VerificationId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_VerificationStatusHistories_VerificationId_ChangedAt",
                table: "VerificationStatusHistories",
                columns: new[] { "VerificationId", "ChangedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VerificationDocuments");

            migrationBuilder.DropTable(
                name: "VerificationStatusHistories");

            migrationBuilder.DropTable(
                name: "SellerVerifications");

            migrationBuilder.DropTable(
                name: "SellerProfiles");
        }
    }
}
