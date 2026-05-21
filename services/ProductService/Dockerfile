FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ProductService.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENV PORT=3008
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 3008

ENTRYPOINT ["dotnet", "ProductService.dll"]
