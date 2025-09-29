import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'app-tooltip',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './tooltip.component.html'
})
export class TooltipComponent implements OnChanges {

    @Input() feature: any = null;
    tooltipHtml: SafeHtml = '';

    constructor(
        private sanitizer: DomSanitizer
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['feature']) {
            this.updateTooltip();
        }
    }

    private updateTooltip(): void {
        if (!this.feature?.properties?.tooltip) {
            this.tooltipHtml = '';
            return;
        }
        
        let tooltipData = this.feature.properties.tooltip;
        
        if (typeof tooltipData === 'string') {
            try {
                this.tooltipHtml = this.sanitizer.bypassSecurityTrustHtml(tooltipData);
            } catch (e) {
                console.error('Failed to parse tooltip data:', e);
                this.tooltipHtml = '';
                return;
            }
        }

    }

} 