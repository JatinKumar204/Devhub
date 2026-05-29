// services/ProductService/Authorization/SellerApprovedRequirement.cs
// New file — implements a custom ASP.NET Core authorization requirement.
//
// Usage in ProductsController:
//   [Authorize(Policy = "ApprovedSeller")]
//
// Registered in ProductService/Program.cs:
//   builder.Services.AddAuthorization(opts =>
//   {
//       opts.AddPolicy("ApprovedSeller", policy =>
//           policy.Requirements.Add(new SellerApprovedRequirement()));
//   });
//   builder.Services.AddSingleton<IAuthorizationHandler, SellerApprovedHandler>();
//
// How it works:
//   Reads the "verificationStatus" claim from the JWT.
//   Admins are always allowed through (they can do anything).
//   Sellers must have verificationStatus == "Approved".
//   Buyers are blocked (they shouldn't be creating products anyway).
//   If the claim is missing (old token), we deny with a clear message.

using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace ProductService.Authorization;

public class SellerApprovedRequirement : IAuthorizationRequirement { }

public class SellerApprovedHandler : AuthorizationHandler<SellerApprovedRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        SellerApprovedRequirement requirement)
    {
        var user = context.User;

        // Admins pass through unconditionally
        if (user.IsInRole("Admin"))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // Must be a Seller
        if (!user.IsInRole("Seller"))
        {
            context.Fail(new AuthorizationFailureReason(this,
                "Only Sellers and Admins can manage products."));
            return Task.CompletedTask;
        }

        // Read verificationStatus claim
        var verificationStatus = user.FindFirstValue("verificationStatus");

        if (verificationStatus == "Approved")
        {
            context.Succeed(requirement);
        }
        else
        {
            // Provide specific failure reasons so the controller can return a clear message
            var reason = verificationStatus switch
            {
                "PendingApproval" => "Your seller account is pending admin approval. You cannot list products until approved.",
                "Resubmitted"     => "Your verification is under review. You cannot list products until approved.",
                "Rejected"        => "Your seller verification was rejected. Please resubmit with the required documents.",
                "InfoRequested"   => "Admin has requested additional information. Please resubmit your verification.",
                null              => "Seller verification status not found. Please log in again.",
                _                 => "Your seller account is not approved to list products."
            };

            context.Fail(new AuthorizationFailureReason(this, reason));
        }

        return Task.CompletedTask;
    }
}
