// src/app/features/reports/reports.component.ts
// Previous version re-exported PayrollComponent — wrong project template artifact.
// Analytics is now implemented at /analytics. This stub redirects there.
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [],
  template: `<div style="padding:24px;color:#8b949e;text-align:center;">Redirecting to Analytics…</div>`
})
export class ReportsComponent implements OnInit {
  constructor(private router: Router) {}
  ngOnInit(): void { this.router.navigate(['/analytics'], { replaceUrl: true }); }
}
