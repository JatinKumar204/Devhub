FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY OrderService.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENV PORT=3009
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 3009

ENTRYPOINT ["dotnet", "OrderService.dll"]
