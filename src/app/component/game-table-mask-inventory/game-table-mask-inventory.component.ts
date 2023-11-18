import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { EventSystem } from '@udonarium/core/system';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { PanelService, PanelOption } from 'service/panel.service';
import { GameTableMask } from '@udonarium/game-table-mask';
import { GameTable } from '@udonarium/game-table';
import { TableSelecter } from '@udonarium/table-selecter';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';

@Component({
  selector: 'app-game-table-mask-inventory',
  templateUrl: './game-table-mask-inventory.component.html',
  styleUrls: ['./game-table-mask-inventory.component.css']
})
export class GameTableMaskInventoryComponent implements OnInit, OnDestroy, AfterViewInit{

  masks: GameTableMask[] = [];
  isHideOnlyShow: boolean = false;
  selectedTable: string = null;

  constructor(
    private panelService: PanelService,
  ) { }

  get tableSelecter(): TableSelecter { return TableSelecter.instance; }

  ngOnInit(): void {
    Promise.resolve().then(() => this.panelService.title = 'マスクインベントリ');
    this.selectedTable = this.tableSelecter.viewTable.identifier;
    this.updateFilteredMasks(this.selectedTable);
    EventSystem.register(this)
    .on('DELETE_GAME_OBJECT', event => {
      this.updateFilteredMasks(this.selectedTable);
    })
    .on('UPDATE_GAME_OBJECT', event => {
      this.updateFilteredMasks(this.selectedTable);
    });
  }

  ngAfterViewInit() { }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  getViewTable(): GameTable {
    return TableSelecter.instance.viewTable;
  }

  getGameTables(): GameTable[]{
    return ObjectStore.instance.getObjects(GameTable);
  }

  // selectGameTable(selectedTable: GameTable) {
  //   console.log(selectedTable.name);
  //   this.selectedTable = selectedTable;
  //   this.updateFilteredMasks(this.selectedTable.identifier);
  // }
  selectGameTable(identifier: string): void {
    this.updateFilteredMasks(this.getGameTables().find(gameTable => gameTable.identifier === identifier).identifier);
  }

  trackByMask(index: number, mask: GameTableMask){
    return mask ? mask.identifier : index;
  }

  toggleChangeIsHide(mask: GameTableMask) {
    mask.isHide = !mask.isHide;
  }

  toggleHideOnlyShow() {
    this.isHideOnlyShow = !this.isHideOnlyShow;
    this.updateFilteredMasks();
  }

  updateFilteredMasks(identifier?: string) {
    let masks: GameTableMask[] = [];
    // ルームに存在するマスクを取得
    masks = ObjectStore.instance.getObjects(GameTableMask);

    // 選択しているテーブルでフィルタ
    if(identifier){
      masks = masks.filter(mask => mask.parent?.identifier === identifier);
    }

    this.masks = masks;
  }

  showDetail(gameObject: GameTableMask) {
    let coordinate = {
      x: this.panelService.left,
      y: this.panelService.top
    };
    let title = 'マップマスク設定';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    let option: PanelOption = { title: title, left: coordinate.x + 10, top: coordinate.y + 20, width: 600, height: 600 };
    let component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }

  viewAll() {
    this.updateFilteredMasks();
  }


  test(mask: GameTableMask) {
    console.log(mask.gameTableId);
  }

}
