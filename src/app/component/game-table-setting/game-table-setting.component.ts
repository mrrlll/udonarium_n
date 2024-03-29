import { Component, OnDestroy, OnInit, Input, Output, EventEmitter } from '@angular/core';

import { ImageFile } from '@udonarium/core/file-storage/image-file';
import { ObjectSerializer } from '@udonarium/core/synchronize-object/object-serializer';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem, Network } from '@udonarium/core/system';
import { FilterType, GameTable, GridType } from '@udonarium/game-table';
import { TableSelecter } from '@udonarium/table-selecter';

import { FileSelecterComponent } from 'component/file-selecter/file-selecter.component';
import { ImageService } from 'service/image.service';
import { ImageTag } from '@udonarium/image-tag';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { SaveDataService } from 'service/save-data.service';
import { Config } from '@udonarium/config';
import { DiceBot } from '@udonarium/dice-bot';

@Component({
  selector: 'game-table-setting',
  templateUrl: './game-table-setting.component.html',
  styleUrls: ['./game-table-setting.component.css']
})
export class GameTableSettingComponent implements OnInit, OnDestroy {
  minSize: number = 1;
  maxSize: number = 100;

  @Input('gameType') _gameType: string = '';
  @Output() gameTypeChange = new EventEmitter<string>();
//  get gameType(): string { return this._gameType };
  get gameType(): string { return this.config.defaultDiceBot };
  set gameType(gameType: string) { this.config.defaultDiceBot = gameType; }
// this.gameTypeChange.emit(gameType);
  loadDiceBot(gameType: string) {
    DiceBot.getHelpMessage(gameType).then(help => {
      console.log('onChangeGameType done\n' + help);
    });
  }

  get diceBotInfos() { return DiceBot.diceBotInfos }

  get config(): Config { return ObjectStore.instance.get<Config>('Config')};
  get tableBackgroundImage(): ImageFile {
    return this.imageService.getEmptyOr(this.selectedTable ? this.selectedTable.imageIdentifier : null);
  }

  get tableDistanceviewImage(): ImageFile {
    return this.imageService.getEmptyOr(this.selectedTable ? this.selectedTable.backgroundImageIdentifier : null);
  }
  get tableDistanceviewImage2(): ImageFile {
    return this.imageService.getEmptyOr(this.selectedTable ? this.selectedTable.backgroundImageIdentifier2 : null);
  }

  get tableName(): string { return this.selectedTable.name; }
  set tableName(tableName: string) { if (this.isEditable) this.selectedTable.name = tableName; }

  get tableWidth(): number { return this.selectedTable.width; }
  set tableWidth(tableWidth: number) { if (this.isEditable) this.selectedTable.width = tableWidth; }

  get tableHeight(): number { return this.selectedTable.height; }
  set tableHeight(tableHeight: number) { if (this.isEditable) this.selectedTable.height = tableHeight; }

  get tableGridColor(): string { return this.selectedTable.gridColor; }
  set tableGridColor(tableGridColor: string) { if (this.isEditable) this.selectedTable.gridColor = tableGridColor; }

  get tableGridShow(): boolean { return this.tableSelecter.gridShow; }
  set tableGridShow(tableGridShow: boolean) {
    this.tableSelecter.gridShow = tableGridShow;
    EventSystem.trigger('UPDATE_GAME_OBJECT', this.tableSelecter.toContext()); // 自分にだけイベントを発行してグリッド更新を誘発
  }

  get tableGridSnap(): boolean { return this.tableSelecter.gridSnap; }
  set tableGridSnap(tableGridSnap: boolean) {
    this.tableSelecter.gridSnap = tableGridSnap;
  }

  get roomAltitude(): boolean { return this.config._roomAltitude }
  set roomAltitude(roomAltitude: boolean) { this.config._roomAltitude = roomAltitude; }

  get tableGridType(): GridType { return this.selectedTable.gridType; }
  set tableGridType(gridType: GridType) { if (this.isEditable) this.selectedTable.gridType = Number(gridType); }

  get tableDistanceviewFilter(): FilterType { return this.selectedTable.backgroundFilterType; }
  set tableDistanceviewFilter(filterType: FilterType) { if (this.isEditable) this.selectedTable.backgroundFilterType = filterType; }

  get tableSelecter(): TableSelecter { return TableSelecter.instance; }

  selectedTable: GameTable = null;
  selectedTableXml: string = '';

  get isEmpty(): boolean { return this.tableSelecter ? (this.tableSelecter.viewTable ? false : true) : true; }
  get isDeleted(): boolean {
    if (!this.selectedTable) return true;
    return ObjectStore.instance.get<GameTable>(this.selectedTable.identifier) == null;
  }
  get isEditable(): boolean {
    return !this.isEmpty && !this.isDeleted;
  }

  isSaveing: boolean = false;
  progresPercent: number = 0;

  constructor(
    private modalService: ModalService,
    private saveDataService: SaveDataService,
    private imageService: ImageService,
    private panelService: PanelService
  ) { }

  ngOnInit() {
    Promise.resolve().then(() => this.modalService.title = this.panelService.title = 'テーブル設定');
    this.selectedTable = this.tableSelecter.viewTable;
    EventSystem.register(this)
      .on('DELETE_GAME_OBJECT', 1000, event => {
        if (!this.selectedTable || event.data.identifier !== this.selectedTable.identifier) return;
        let object = ObjectStore.instance.get(event.data.identifier);
        if (object !== null) {
          this.selectedTableXml = object.toXml();
        }
      });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  selectGameTable(identifier: string) {
    EventSystem.call('SELECT_GAME_TABLE', { identifier: identifier }, Network.peerId);
    this.selectedTable = ObjectStore.instance.get<GameTable>(identifier);
    this.selectedTableXml = '';
  }

  getGameTables(): GameTable[] {
    return ObjectStore.instance.getObjects(GameTable);
  }

  createGameTable() {
    let gameTable = new GameTable();
    gameTable.name = '白紙のテーブル';
    gameTable.imageIdentifier = 'testTableBackgroundImage_image';
    gameTable.initialize();
    this.selectGameTable(gameTable.identifier);
  }

  async save() {
    if (!this.selectedTable || this.isSaveing) return;
    this.isSaveing = true;
    this.progresPercent = 0;

    this.selectedTable.selected = true;
    await this.saveDataService.saveGameObjectAsync(this.selectedTable, 'map_' + this.selectedTable.name, percent => {
      this.progresPercent = percent;
    });

    setTimeout(() => {
      this.isSaveing = false;
      this.progresPercent = 0;
    }, 500);
  }

  delete() {
    if (!this.isEmpty && this.selectedTable) {
      this.selectedTableXml = this.selectedTable.toXml();
      this.selectedTable.destroy();
    }
  }

  restore() {
    if (this.selectedTable && this.selectedTableXml) {
      let restoreTable = ObjectSerializer.instance.parseXml(this.selectedTableXml);
      this.selectGameTable(restoreTable.identifier);
      this.selectedTableXml = '';
    }
  }

  getHidden(image: ImageFile): boolean {
    const imageTag = ImageTag.get(image.identifier);
    return imageTag ? imageTag.hide : false;
  }

  openBgImageModal() {
    if (this.isDeleted) return;
    this.modalService.open<string>(FileSelecterComponent).then(value => {
      if (!this.selectedTable || !value) return;
      this.selectedTable.imageIdentifier = value;
    });
  }

  openDistanceViewImageModal2() {
    if (this.isDeleted) return;
    let currentImageIdentifires: string[] = [];
    if (this.selectedTable && this.selectedTable.backgroundImageIdentifier2) currentImageIdentifires = [this.selectedTable.backgroundImageIdentifier2];
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: true, currentImageIdentifires: currentImageIdentifires }).then(value => {
      if (!this.selectedTable || !value) return;
      this.selectedTable.backgroundImageIdentifier2 = value;
    });
  }

  openDistanceViewImageModal() {
    if (this.isDeleted) return;
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: true }).then(value => {
      if (!this.selectedTable || !value) return;
      this.selectedTable.backgroundImageIdentifier = value;
    });
  }

  cloneGameTable() {
    let xmlString = ObjectSerializer.instance.toXml(this.selectedTable);
    return ObjectSerializer.instance.parseXml(xmlString);
  }

  roomAltitudeChange() {
    if(!this.roomAltitude){
      EventSystem.trigger('NO_ROOM_ALTITUDE', null);
    }
  }

  shouldDisableDelete(): boolean {
    return this.getGameTables().length <= 1;
  }
}
