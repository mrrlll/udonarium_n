import { Component, OnInit } from '@angular/core';
import { EventSystem } from '@udonarium/core/system';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { PanelService, PanelOption } from 'service/panel.service';
import { ContextMenuService } from 'service/context-menu.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { Card } from '@udonarium/card';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';


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
      .on('CREATE_CARD_OBJECT', event => {
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
      this.updateFilteredCards();
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

    showDetail(gameObject: Card) {
      let coordinate = {
        x: this.panelService.left,
        y: this.panelService.top
      };
      let title = 'カード設定';
      if (gameObject.name.length) title += ' - ' + gameObject.name;
      let option: PanelOption = { title: title, left: coordinate.x + 10, top: coordinate.y + 20, width: 600, height: 600 };
      let component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
      component.tabletopObject = gameObject;
    }
}
