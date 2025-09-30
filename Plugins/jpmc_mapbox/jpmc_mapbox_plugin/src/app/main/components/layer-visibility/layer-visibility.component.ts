import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';

import { MapLayer } from '../../models/map-layer.model';

@Component({
  selector: 'app-layer-visibility',
  standalone: true,
  imports: [CommonModule, FormsModule, CheckboxModule],
  templateUrl: './layer-visibility.component.html'
})
export class LayerVisibilityComponent {
  @Input() layers: MapLayer[] = [];
  @Output() toggle = new EventEmitter<string>();

  onToggle(layer: MapLayer): void {
    this.toggle.emit(layer.key);
  }

  trackLayer(_: number, layer: MapLayer): string {
    return layer.key;
  }
}
