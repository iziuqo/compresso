import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { compress, formatBytes, type CompressResult } from 'compresso.js';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="max-width: 600px; margin: 2rem auto; font-family: system-ui">
      <h1>Compresso — Angular Example</h1>

      <input type="file" accept="image/*" (change)="handleFile($event)" />

      <p *ngIf="loading">Optimizing...</p>

      <div *ngIf="result" style="margin-top: 1rem">
        <div style="background: #f3f4f6; padding: 1rem; border-radius: 8px">
          <p><strong>Original:</strong> {{ formatBytes(result.originalSize) }}</p>
          <p><strong>Optimized:</strong> {{ formatBytes(result.compressedSize) }}</p>
          <p><strong>Reduction:</strong> {{ result.savings }}%</p>
          <p><strong>Dimensions:</strong> {{ result.width }} × {{ result.height }}</p>
        </div>
        <img
          [src]="result.url"
          alt="Optimized"
          style="max-width: 100%; border-radius: 8px; margin-top: 0.5rem"
        />
      </div>
    </div>
  `,
})
export class AppComponent {
  result: CompressResult | null = null;
  loading = false;
  formatBytes = formatBytes;

  async handleFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.loading = true;
    this.result = await compress(file, {
      quality: 0.8,
      maxWidth: 1920,
      format: 'webp',
      maxSizeMB: 2,
    });
    this.loading = false;
  }
}
