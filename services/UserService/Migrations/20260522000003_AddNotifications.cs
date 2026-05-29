// services/UserService/Migrations/20260522000003_AddNotifications.cs

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UserService.Migrations
{
    public partial class AddNotifications : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(nullable: false),
                    Type = table.Column<string>(maxLength: 50, nullable: false),
                    Title = table.Column<string>(maxLength: 200, nullable: false),
                    Body = table.Column<string>(maxLength: 1000, nullable: false),
                    ActionUrl = table.Column<string>(maxLength: 300, nullable: true),
                    EntityType = table.Column<string>(maxLength: 50, nullable: true),
                    EntityId = table.Column<int>(nullable: true),
                    IsRead = table.Column<bool>(nullable: false, defaultValue: false),
                    CreatedDate = table.Column<DateTime>(nullable: false),
                    ReadAt = table.Column<DateTime>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId_IsRead_CreatedDate",
                table: "Notifications",
                columns: new[] { "UserId", "IsRead", "CreatedDate" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "Notifications");
        }
    }
}
