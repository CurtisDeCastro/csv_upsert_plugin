import { Component, OnDestroy, OnInit, ElementRef, HostListener, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

import { Subscription } from 'rxjs';

import { UiStateService } from 'src/app/services/plugin/ui-state.service';

@Component({
    selector: 'app-main-menu',
    templateUrl: './main-menu.component.html',
    styleUrls: ['./main-menu.component.css'],
    standalone: true,
    imports: [CommonModule],
    animations: [
      trigger('expandCollapse', [
        state('collapsed', style({
          height: '0px',
          opacity: 0,
          visibility: 'hidden'
        })),
        state('expanded', style({
          height: '35px',
          opacity: 1,
          visibility: 'visible'
        })),
        transition('collapsed <=> expanded', [
          animate('1000ms ease-in-out'),
        ]),
      ]),
      trigger('fadeIn', [
        state('hidden', style({ opacity: 0 })),
        state('visible', style({ opacity: 1 })),
        transition('hidden => visible', [
          animate('1000ms 200ms ease-in') // delay text animation by 200ms
        ]),
      ])
    ]
})

export class MainMenuComponent implements OnInit, OnDestroy {

    @Output() layerSelectorClick = new EventEmitter<Event>();

    private subscriptions: Subscription[] = [];

    mainMenuVisible: boolean = false;
    showMainMenuContent: boolean = false;

    legendVisible: boolean = false;

    constructor(
        private elementRef: ElementRef,
        private uiStateService: UiStateService) { }

    @HostListener('document:click', ['$event'])
    clickout(event: Event) {
      // skip if clicking the close icon (let the existing click handler work)
      if ((event.target as Element).closest('.close-icon')) {
        return;
      }
  
      // to close menu if clicked outside the menu
      /*
      if (!this.elementRef.nativeElement.contains(event.target)) {
          // check if the click target is not the topbar button that opens the menu
          const topbarButton = document.querySelector('.pi-bars');
          if (!topbarButton?.contains(event.target as Node)) {
            if (this.showMainMenuContent) {this.toggleMainMenu()}
          }
      }*/
    }

    ngOnInit(): void {

        this.subscriptions.push(

            this.uiStateService.mainMenuVisible$.subscribe(visible => {
                this.mainMenuVisible = visible;
                if (!visible) {
                    this.showMainMenuContent = false;
                } else {
                    setTimeout(() => (this.showMainMenuContent = true), 1000);
                }
            })
        );

        this.subscriptions.push(
            this.uiStateService.legendVisible$.subscribe(visible => {
                this.legendVisible = visible;
            })
        );
    }

    toggleMainMenu() {
        this.uiStateService.setMainMenuVisible(!this.mainMenuVisible);
    }

    toggleLegend() {
        this.uiStateService.setLegendVisible(!this.legendVisible);
    }

    toggleLayerSelector(event: Event) {
        this.layerSelectorClick.emit(event);
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(subscription => subscription.unsubscribe());
    }

}