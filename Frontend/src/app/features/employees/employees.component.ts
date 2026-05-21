import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  position: string;
  salary: number;
  hireDate: string;
  status: string;
  managerId: number | null;
}

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Employees</h1>
          <p class="page-subtitle">{{ employees().length }} team members across {{ deptCount() }} departments</p>
        </div>
        <input class="search-input" [(ngModel)]="search" placeholder="Search employees..." />
      </div>

      <div class="dept-pills">
        <button class="dept-pill" [class.active]="selectedDept === ''" (click)="selectedDept = ''">All</button>
        @for (d of departments(); track d) {
          <button class="dept-pill" [class.active]="selectedDept === d" (click)="selectedDept = d">{{ d }}</button>
        }
      </div>

      @if (loading()) {
        <div class="loading-state">Loading employees...</div>
      } @else {
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Position</th>
                <th>Salary</th>
                <th>Hire Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (e of filtered(); track e.id) {
                <tr>
                  <td class="cell-primary">
                    <div class="avatar" [style.background]="avatarColor(e.name)">{{ e.name.charAt(0) }}</div>
                    <div>
                      <div class="cell-name">{{ e.name }}</div>
                      <div class="cell-sub">{{ e.email }}</div>
                    </div>
                  </td>
                  <td>{{ e.department }}</td>
                  <td>{{ e.position }}</td>
                  <td>\${{ e.salary | number:'1.0-0' }}/yr</td>
                  <td>{{ e.hireDate | date:'mediumDate' }}</td>
                  <td><span class="badge" [class]="'badge-' + e.status.toLowerCase()">{{ e.status }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 28px; max-width: 1300px; margin: 0 auto; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
    .page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .page-subtitle { font-size: 13px; color: var(--text-muted); margin: 0; }
    .search-input { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 7px; padding: 8px 14px; color: var(--text-primary); font-size: 13px; width: 220px; }
    .search-input:focus { outline: none; border-color: #6366f1; }
    .dept-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; }
    .dept-pill { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 20px; padding: 5px 14px; font-size: 12px; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
    .dept-pill:hover, .dept-pill.active { background: rgba(99,102,241,.12); border-color: rgba(99,102,241,.3); color: #818cf8; }
    .loading-state { padding: 40px; text-align: center; color: var(--text-muted); }
    .table-wrapper { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    thead th { padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; background: var(--bg-primary); border-bottom: 1px solid var(--border); }
    tbody tr { border-bottom: 1px solid rgba(255,255,255,.03); transition: background 0.12s; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: var(--bg-hover); }
    td { padding: 10px 16px; vertical-align: middle; color: var(--text-secondary); }
    .cell-primary { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: white; flex-shrink: 0; }
    .cell-name { font-weight: 600; color: var(--text-primary); }
    .cell-sub { font-size: 11px; color: var(--text-muted); }
    .badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
    .badge-active { background: rgba(34,197,94,.1); color: #22c55e; }
    .badge-onleave { background: rgba(245,158,11,.1); color: #f59e0b; }
    .badge-terminated { background: rgba(239,68,68,.1); color: #ef4444; }
  `]
})
export class EmployeesComponent implements OnInit {
  private readonly _http = inject(HttpClient);
  readonly loading = signal(true);
  readonly employees = signal<Employee[]>([]);
  search = '';
  selectedDept = '';

  departments() {
    return [...new Set(this.employees().map(e => e.department))].sort();
  }

  deptCount() {
    return this.departments().length;
  }

  filtered() {
    let list = this.employees();
    if (this.selectedDept) list = list.filter(e => e.department === this.selectedDept);
    const q = this.search.toLowerCase();
    if (q) list = list.filter(e => e.name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q));
    return list;
  }

  avatarColor(name: string): string {
    const colors = ['#6366f1','#10b981','#f59e0b','#ec4899','#3b82f6','#8b5cf6'];
    return colors[name.charCodeAt(0) % colors.length];
  }

  ngOnInit(): void {
    this._http.get<Employee[]>('/api/employees').pipe(
      catchError(() => of(SAMPLE_EMPLOYEES))
    ).subscribe(data => {
      this.employees.set(data ?? SAMPLE_EMPLOYEES);
      this.loading.set(false);
    });
  }
}

const SAMPLE_EMPLOYEES: Employee[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', department: 'Engineering', position: 'Senior Engineer', salary: 120000, hireDate: '2021-03-15', status: 'Active', managerId: null },
  { id: 2, name: 'Bob Martinez', email: 'bob@example.com', department: 'Engineering', position: 'Developer', salary: 95000, hireDate: '2021-08-22', status: 'Active', managerId: 1 },
  { id: 3, name: 'Carol White', email: 'carol@example.com', department: 'Product', position: 'UX Designer', salary: 88000, hireDate: '2022-01-10', status: 'Active', managerId: null },
  { id: 4, name: 'David Kim', email: 'david@example.com', department: 'Operations', position: 'Ops Manager', salary: 105000, hireDate: '2020-11-05', status: 'OnLeave', managerId: null },
  { id: 5, name: 'Eva Chen', email: 'eva@example.com', department: 'Engineering', position: 'Developer', salary: 92000, hireDate: '2023-02-18', status: 'Active', managerId: 1 },
  { id: 6, name: 'Frank Lee', email: 'frank@example.com', department: 'Finance', position: 'Analyst', salary: 82000, hireDate: '2022-06-01', status: 'Active', managerId: null },
  { id: 7, name: 'Grace Osei', email: 'grace@example.com', department: 'HR', position: 'HR Manager', salary: 97000, hireDate: '2021-09-14', status: 'Active', managerId: null },
];
