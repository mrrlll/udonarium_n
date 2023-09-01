import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { EventSystem, Network } from '@udonarium/core/system';
import { GameObject } from '@udonarium/core/synchronize-object/game-object';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { PanelOption, PanelService } from 'service/panel.service';
import { ContextMenuAction, ContextMenuService, ContextMenuSeparator } from 'service/context-menu.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { Card } from '@udonarium/card';


@Component({
  selector: 'app-cards-list-window',
  templateUrl: './cards-list-window.component.html',
  styleUrls: ['./cards-list-window.component.css']
})
export class CardsListWindowComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(
    private changeDetector: ChangeDetectorRef,
    private panelService: PanelService,
    private contextMenuService: ContextMenuService,
    private pointerDeviceService: PointerDeviceService
  ) { }

    ngOnInit(): void {
      Promise.resolve().then(() => this.panelService.title = 'カードリスト');
      // EventSystem.register(this)
    }

    ngAfterViewInit() {

    }

    ngOnDestroy() {
      // EventSystem.unregister(this);
    }

    getCards(): Card[] {
      let cards: Card[] = [];
      cards = ObjectStore.instance.getObjects(Card);
      return cards;
    }

    trackByCard(index: number, card: Card) {
      return card ? card.identifier : index;
    }

    toggleChangeIsHide(card: Card) {
      if (card.isHide){
        card.isHide = false;
      } else if (!card.isHide){
        card.isHide = true;
      }
    }
}
