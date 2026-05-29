// src/app/core/services/port-allocator.service.ts
// DEPRECATED — replaced by ServiceDiscoveryService (Phase 0).
// Kept as an empty injectable to avoid breaking any lingering import
// without requiring a codebase-wide find-replace.
// Remove entirely in the next major cleanup pass once all consumers
// have been confirmed migrated to ServiceDiscoveryService.
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PortAllocatorService {}
