import { Component, OnInit } from '@angular/core';
import { EventSystem, Network } from '@udonarium/core/system';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { PanelService } from 'service/panel.service';
import { ContextMenuService } from 'service/context-menu.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { Card } from '@udonarium/card';


@Component({
  selector: 'app-cards-list-window',
  templateUrl: './cards-list-window.component.html',
  styleUrls: ['./cards-list-window.component.css']
})
export class CardsListWindowComponent implements OnInit{

  searchText: string = '';
  cards: Card[] = [];
  isHideOnlyShow: boolean = false;


  constructor(
    private panelService: PanelService,
    private contextMenuService: ContextMenuService,
    private pointerDeviceService: PointerDeviceService
  ) { }

    ngOnInit(): void {
      Promise.resolve().then(() => this.panelService.title = 'カードリスト');
      this.updateFilteredCards();
      EventSystem.register(this)
      .on('DELETE_GAME_OBJECT', event => {
        this.updateFilteredCards();
      })
      .on('UPDATE_GAME_OBJECT', event => {
        this.updateFilteredCards();
      });
    }

    private getCards(): Card[] {
      this.cards = ObjectStore.instance.getObjects(Card);
      return this.cards;
    }

    trackByCard(index: number, card: Card){
      return card ? card.identifier : index;
    }

    toggleChangeIsHide(card: Card) {
      card.isHide = !card.isHide;
    }

    toggleHideOnlyShow() {
      this.isHideOnlyShow = !this.isHideOnlyShow;
      this.updateFilteredCards();
    }

    updateFilteredCards() {
      // ルームに存在するカードを取得
      this.cards = this.getCards();

      // 検索ワードが空の場合は全てのカードを表示
      if (!this.searchText) {
        // 非表示のカードのみ表示する場合の絞り込み
        if (this.isHideOnlyShow) this.cards = this.cards.filter(card => card.isHide);
      } else {
        // 非表示のカードのみ表示する場合の絞り込み
        if (this.isHideOnlyShow) this.cards = this.cards.filter(card => card.isHide);

        // 検索ワードが入力されている場合は検索ワードにマッチするカードのみ表示
        this.cards = this.cards.filter(card => card.name.indexOf(this.searchText) !== -1);
      }
    }

    test() {
      this.cards = this.getCards();
      if(this.cards) console.log(this.cards);
    }
}
