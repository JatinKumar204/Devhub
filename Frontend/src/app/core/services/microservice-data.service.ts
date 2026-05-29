// src/app/core/services/microservice-data.service.ts
// DEPRECATED — generic data fetching belongs in feature-specific services
// (OrderService, ProductService, etc.). Kept as empty injectable.
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MicroserviceDataService {}
