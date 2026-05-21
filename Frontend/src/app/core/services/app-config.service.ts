import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  services: {
    users: string;
    products: string;
    orders: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private _config: AppConfig | null = null;

  get config(): AppConfig {
    if (!this._config) throw new Error('AppConfig not loaded yet');
    return this._config;
  }

  async load(): Promise<void> {
    this._config = await firstValueFrom(
      this.http.get<AppConfig>('/assets/config.json')
    );
  }

  constructor(private http: HttpClient) {}
}