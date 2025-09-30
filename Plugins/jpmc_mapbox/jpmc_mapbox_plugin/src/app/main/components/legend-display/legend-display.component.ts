import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-legend-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './legend-display.component.html'
})
export class LegendDisplayComponent {
  @Input() legend: SafeHtml | string = '';
}
