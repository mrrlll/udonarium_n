import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';

import { GameObject } from '@udonarium/core/synchronize-object/game-object';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem, Network } from '@udonarium/core/system';
import { DataElement } from '@udonarium/data-element';
import { SortOrder } from '@udonarium/data-summary-setting';
import { GameCharacter } from '@udonarium/game-character';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { TabletopObject } from '@udonarium/tabletop-object';

import { ChatPaletteComponent } from 'component/chat-palette/chat-palette.component';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from 'service/context-menu.service';
import { GameObjectInventoryService } from 'service/game-object-inventory.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { Config } from '@udonarium/config';

@Component({
  selector: 'game-object-inventory',
  templateUrl: './game-object-inventory.component.html',
  styleUrls: ['./game-object-inventory.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameObjectInventoryComponent implements AfterViewInit, OnInit, OnDestroy {
  inventoryTypes: string[] = ['table', 'common', 'graveyard'];

  selectTab: string = 'table';
  selectedIdentifier: string = '';
  multiMoveTargets: Set<string> = new Set();

  isEdit: boolean = false;
  disptimer = null;
  isMultiMove: boolean = false;

  isShowHideKomas: boolean = false;

  get config(): Config { return ObjectStore.instance.get<Config>('Config')};

  get sortTag(): string { return this.inventoryService.sortTag; }
  set sortTag(sortTag: string) { this.inventoryService.sortTag = sortTag; }
  get sortOrder(): SortOrder { return this.inventoryService.sortOrder; }
  set sortOrder(sortOrder: SortOrder) { this.inventoryService.sortOrder = sortOrder; }

  get sortTag2nd(): string { return this.inventoryService.sortTag2nd; }
  set sortTag2nd(sortTag: string) { this.inventoryService.sortTag2nd = sortTag; }
  get sortOrder2nd(): SortOrder { return this.inventoryService.sortOrder2nd; }
  set sortOrder2nd(sortOrder: SortOrder) { this.inventoryService.sortOrder2nd = sortOrder; }

  get dataTag(): string { return this.inventoryService.dataTag; }
  set dataTag(dataTag: string) { this.inventoryService.dataTag = dataTag; }
  get dataTags(): string[] { return this.inventoryService.dataTags; }

  get sortOrderName(): string { return this.sortOrder === SortOrder.ASC ? '昇順' : '降順'; }
  get sortOrderName2nd(): string { return this.sortOrder2nd === SortOrder.ASC ? '昇順' : '降順'; }

  get newLineString(): string { return this.inventoryService.newLineString; }

  get roomAltitude(): boolean { return this.config.roomAltitude; }

  constructor(
    private changeDetector: ChangeDetectorRef,
    private panelService: PanelService,
    private inventoryService: GameObjectInventoryService,
    private contextMenuService: ContextMenuService,
    private pointerDeviceService: PointerDeviceService
  ) { }

  ngOnInit() {
    Promise.resolve().then(() => this.panelService.title = 'インベントリ');
    EventSystem.register(this)
      .on('SELECT_TABLETOP_OBJECT', -1000, event => {
        if (ObjectStore.instance.get(event.data.identifier) instanceof TabletopObject) {
          this.selectedIdentifier = event.data.identifier;
          this.changeDetector.markForCheck();
        }
      })
      .on('SYNCHRONIZE_FILE_LIST', event => {
        if (event.isSendFromSelf) this.changeDetector.markForCheck();
      })
      .on('UPDATE_INVENTORY', event => {
        if (event.isSendFromSelf) this.changeDetector.markForCheck();
      })
      .on('OPEN_NETWORK', event => {
        this.inventoryTypes = ['table', 'common', Network.peerId, 'graveyard'];
        if (!this.inventoryTypes.includes(this.selectTab)) {
          this.selectTab = Network.peerId;
        }
      });
    this.inventoryTypes = ['table', 'common', Network.peerId, 'graveyard'];
  }

  ngAfterViewInit() {
    this.disptimer = setInterval(() => {
      this.changeDetector.detectChanges();
    }, 200 );
    //操作を検知して更新する方式に変えたい

  }

  ngOnDestroy() {
    EventSystem.unregister(this);
    this.disptimer = null;
  }

  getTabTitle(inventoryType: string) {
    switch (inventoryType) {
      case 'table':
        return 'テーブル';
      case Network.peerId:
        return '個人';
      case 'graveyard':
        return '墓場';
      default:
        return '共有';
    }
  }

  getInventory(inventoryType: string) {
    switch (inventoryType) {
      case 'table':
        return this.inventoryService.tableInventory;
      case Network.peerId:
        return this.inventoryService.privateInventory;
      case 'graveyard':
        return this.inventoryService.graveyardInventory;
      default:
        return this.inventoryService.commonInventory;
    }
  }

  getGameObjects(inventoryType: string): TabletopObject[] {
    switch (inventoryType) {
      case 'table':

        let tableCharacterList_dest = [] ;
        let tableCharacterList_scr = this.inventoryService.tableInventory.tabletopObjects;
        if(this.isShowHideKomas) return tableCharacterList_scr;
        for (let character of tableCharacterList_scr) {
          let character_ : GameCharacter = <GameCharacter>character;
          if( !character_.hideInventory) tableCharacterList_dest.push( <TabletopObject>character );
        }
        return tableCharacterList_dest;

      default:
        return this.getInventory(inventoryType).tabletopObjects;
    }
  }

  getInventoryTags(gameObject: GameCharacter): DataElement[] {
    return this.getInventory(gameObject.location.name).dataElementMap.get(gameObject.identifier);
  }

  onContextMenu(event: Event, gameObject: GameCharacter) {
    if (document.activeElement instanceof HTMLInputElement && document.activeElement.getAttribute('type') !== 'range') return;
    event.stopPropagation();
    event.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    this.selectGameObject(gameObject);

    const target = <HTMLElement>event.target;
    let position;
    if (target && target.tagName === 'BUTTON') {
      const clientRect = target.getBoundingClientRect();
      position = {
        x: window.pageXOffset + clientRect.left + target.clientWidth,
        y: window.pageYOffset + clientRect.top
      };
    } else {
      position = this.pointerDeviceService.pointers[0];
    }

    let actions: ContextMenuAction[] = [];

    actions.push({ name: '詳細を表示', action: () => { this.showDetail(gameObject); } });
    // if (gameObject.location.name !== 'graveyard') {
    actions.push({ name: 'チャットパレットを表示', action: () => { this.showChatPalette(gameObject) }, disabled: gameObject.location.name === 'graveyard' });

    actions.push(ContextMenuSeparator);
    // テーブルインベントリ非表示
    actions.push((gameObject.hideInventory
      ? {
        name: '☑ インベントリ非表示', action: () => {
          gameObject.hideInventory = false;
          EventSystem.trigger('UPDATE_INVENTORY', null);
        }
      } : {
        name: '☐ インベントリ非表示', action: () => {
          gameObject.hideInventory = true;
          EventSystem.trigger('UPDATE_INVENTORY', null);
        }
    }));
    actions.push(ContextMenuSeparator);
    actions.push({ name: '画像効果', action: null,
    subActions: [
      (gameObject.isInverse
      ? {
        name: '☑ 反転', action: () => {
          gameObject.isInverse = false;
          EventSystem.trigger('UPDATE_INVENTORY', null);
        }
      } : {
        name: '☐ 反転', action: () => {
          gameObject.isInverse = true;
          EventSystem.trigger('UPDATE_INVENTORY', null);
        }
      }),
      (gameObject.isHollow
        ? {
          name: '☑ ぼかし', action: () => {
            gameObject.isHollow = false;
            EventSystem.trigger('UPDATE_INVENTORY', null);
          }
        } : {
          name: '☐ ぼかし', action: () => {
            gameObject.isHollow = true;
            EventSystem.trigger('UPDATE_INVENTORY', null);
          }
        }),
        (gameObject.isBlackPaint
          ? {
            name: '☑ 黒塗り', action: () => {
              gameObject.isBlackPaint = false;
              EventSystem.trigger('UPDATE_INVENTORY', null);
            }
          } : {
            name: '☐ 黒塗り', action: () => {
              gameObject.isBlackPaint = true;
              EventSystem.trigger('UPDATE_INVENTORY', null);
            }
          }),
        {
          name: 'オーラ', action: null,
          subActions: [{
            name: `${gameObject.aura == -1 ? '◉' : '○'} なし`, action: () => {
              gameObject.aura = -1;
              EventSystem.trigger('UPDATE_INVENTORY', null)
            }
          }, ContextMenuSeparator]
          .concat(['ブラック', 'ブルー', 'グリーン', 'シアン', 'レッド', 'マゼンタ', 'イエロー', 'ホワイト']
          .map((color, i) => {
            return {
              name: `${gameObject.aura == i ? '◉' : '○'} ${color}`, action: () => {
                gameObject.aura = i;
                EventSystem.trigger('UPDATE_INVENTORY', null)
              }
            }
          })
        )},
        ContextMenuSeparator,
        {
          name: 'リセット', action: () => {
            gameObject.isInverse = false;
            gameObject.isHollow = false;
            gameObject.isBlackPaint = false;
            gameObject.aura = -1;
            EventSystem.trigger('UPDATE_INVENTORY', null);
          },
          disabled: !gameObject.isInverse && !gameObject.isHollow && !gameObject.isBlackPaint && gameObject.aura == -1
        }
      ]
    });
    if(this.roomAltitude){
      actions.push(
        (gameObject.isAltitudeIndicate
        ? {
          name: '☑ 高度の表示', action: () => {
            gameObject.isAltitudeIndicate = false;
            EventSystem.trigger('UPDATE_INVENTORY', null);
          }
        } : {
          name: '☐ 高度の表示', action: () => {
            gameObject.isAltitudeIndicate = true;
            EventSystem.trigger('UPDATE_INVENTORY', null);
          }
        })
      );
      actions.push(ContextMenuSeparator);
      actions.push(
      {
        name: '高度を0にする', action: () => {
          if (gameObject.altitude != 0) {
            gameObject.altitude = 0;
            if (gameObject.location.name === 'table') SoundEffect.play(PresetSound.sweep);
          }
        },
        altitudeHande: gameObject
      });
      actions.push((!gameObject.isNotRide
        ? {
          name: '☑ 他のキャラクターに乗る', action: () => {
            gameObject.isNotRide = true;
            EventSystem.trigger('UPDATE_INVENTORY', null);
          }
        } : {
          name: '☐ 他のキャラクターに乗る', action: () => {
            gameObject.isNotRide = false;
            EventSystem.trigger('UPDATE_INVENTORY', null);
          }
        }));
      actions.push(ContextMenuSeparator);
    }
    let locations = [
      { name: 'table', alias: 'テーブルに移動' },
      { name: 'common', alias: '共有イベントリに移動' },
      { name: Network.peerId, alias: '個人イベントリに移動' },
      { name: 'graveyard', alias: '墓場に移動' }
    ];
    for (let location of locations) {
      if (gameObject.location.name === location.name) continue;
      actions.push({
        name: location.alias, action: () => {
          gameObject.setLocation(location.name);
          SoundEffect.play(PresetSound.piecePut);
        }
      });
    }

    if (gameObject.location.name === 'graveyard') {
      actions.push({
        name: '削除する', action: () => {
          this.deleteGameObject(gameObject);
          SoundEffect.play(PresetSound.sweep);
        }
      });
    }
    actions.push(ContextMenuSeparator);
    actions.push({
      name: 'コピーを作る', action: () => {
        this.cloneGameObject(gameObject);
        SoundEffect.play(PresetSound.piecePut);
      }
    });

    this.contextMenuService.open(position, actions, gameObject.name);
  }

  toggleEdit() {
    this.isEdit = !this.isEdit;
  }

  toggleMultiMove() {
    if (this.isMultiMove) {
      this.multiMoveTargets.clear();
    }
    this.isMultiMove = !this.isMultiMove;
  }

  cleanInventory() {
    let tabTitle = this.getTabTitle(this.selectTab);
    let gameObjects = this.getGameObjects(this.selectTab);
    if (!confirm(`${tabTitle}に存在する${gameObjects.length}個の要素を完全に削除しますか？`)) return;
    for (const gameObject of gameObjects) {
      this.deleteGameObject(gameObject);
    }
    SoundEffect.play(PresetSound.sweep);
  }

  existsMultiMoveSelectedInTab(): boolean {
    return this.getGameObjects(this.selectTab).some(x => this.multiMoveTargets.has(x.identifier))
  }

  toggleMultiMoveTarget(e: Event, gameObject: GameCharacter) {
    if (!(e.target instanceof HTMLInputElement)) { return; }
    if (e.target.checked) {
      this.multiMoveTargets.add(gameObject.identifier);
    } else {
      this.multiMoveTargets.delete(gameObject.identifier);
    }
    console.log(`multimove selected ${[...this.multiMoveTargets]}`);
  }

  allTabBoxCheck() {
    if (this.existsMultiMoveSelectedInTab()) {
      this.getGameObjects(this.selectTab).forEach(x => this.multiMoveTargets.delete(x.identifier));
    } else {
      this.getGameObjects(this.selectTab).forEach(x => this.multiMoveTargets.add(x.identifier));
    }
  }

  onMultiMoveContextMenu() {
    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    let position = this.pointerDeviceService.pointers[0];
    let actions: ContextMenuAction[] = [];
    let locations = [
      { name: 'table', alias: 'テーブルに移動' },
      { name: 'common', alias: '共有イベントリに移動' },
      { name: Network.peerId, alias: '個人イベントリに移動' },
      { name: 'graveyard', alias: '墓場に移動' }
    ];
    for (let location of locations) {
      if (this.selectTab === location.name) continue;
      actions.push({
        name: location.alias, action: () => {
          this.multiMove(location.name);
          this.toggleMultiMove();
          SoundEffect.play(PresetSound.piecePut);
        }
      });
    }

    this.contextMenuService.open(position, actions, "一括移動");
  }

  multiMove(location: string) {
    for (const gameObjectIdentifier of this.multiMoveTargets) {
      let gameObject = ObjectStore.instance.get(gameObjectIdentifier);
      if (gameObject instanceof GameCharacter) {
        gameObject.setLocation(location);
      }
    }
  }

  multiDelete() {
    let inGraveyard: Set<GameCharacter> = new Set();
    for (const gameObjectIdentifier of this.multiMoveTargets) {
      let gameObject: GameCharacter = ObjectStore.instance.get(gameObjectIdentifier);
      if (gameObject instanceof GameCharacter && gameObject.location.name == 'graveyard') {
        inGraveyard.add(gameObject);
      }
    }
    if (inGraveyard.size < 1) return;

    if (!confirm(`選択したもののうち墓場に存在する${inGraveyard.size}個の要素を完全に削除しますか？`)) return;
    for (const gameObject of inGraveyard) {
      this.deleteGameObject(gameObject);
    }
  }

  private cloneGameObject(gameObject: TabletopObject) {
    gameObject.clone();
  }

  private showDetail(gameObject: GameCharacter) {
    EventSystem.trigger('SELECT_TABLETOP_OBJECT', { identifier: gameObject.identifier, className: gameObject.aliasName });
    let coordinate = this.pointerDeviceService.pointers[0];
    let title = 'キャラクターシート';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    let option: PanelOption = { title: title, left: coordinate.x - 800, top: coordinate.y - 300, width: 860, height: 600 };
    let component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }

  private showChatPalette(gameObject: GameCharacter) {
    let coordinate = this.pointerDeviceService.pointers[0];
    let option: PanelOption = { left: coordinate.x - 250, top: coordinate.y - 175, width: 615, height: 350 };
    let component = this.panelService.open<ChatPaletteComponent>(ChatPaletteComponent, option);
    component.character = gameObject;
  }

  private focusToObject(gameObject: GameCharacter) {
    if (gameObject.location.name != "table") { return; }
    EventSystem.trigger('FOCUS_TO_TABLETOP_COORDINATE', { x: gameObject.location.x, y: gameObject.location.y });
  }

  selectGameObject(gameObject: GameObject, e: Event=null) {
    if (e && e instanceof MouseEvent && e.ctrlKey) {
      this.isMultiMove = true;
    }
    if (this.isMultiMove) {
      if(e instanceof MouseEvent && e.shiftKey){
        let gameObjects = this.getGameObjects(this.selectTab);
        let startIndex = gameObjects.findIndex(x => x.identifier === this.selectedIdentifier);
        let endIndex = gameObjects.findIndex(x => x.identifier === gameObject.identifier);
        if (startIndex < 0 || endIndex < 0) return;
        if (startIndex > endIndex) [startIndex, endIndex] = [endIndex, startIndex];
        for (let i = startIndex; i <= endIndex; i++) {
          this.multiMoveTargets.add(gameObjects[i].identifier);
        }
      } else if (this.multiMoveTargets.has(gameObject.identifier)) {
        this.multiMoveTargets.delete(gameObject.identifier);
      } else {
        this.multiMoveTargets.add(gameObject.identifier);
      }
      console.log(`multimove selected ${[...this.multiMoveTargets]}`);
    }
    let aliasName: string = gameObject.aliasName;
    EventSystem.trigger('SELECT_TABLETOP_OBJECT', { identifier: gameObject.identifier, className: gameObject.aliasName });
    EventSystem.trigger('HIGHTLIGHT_TABLETOP_OBJECT', { identifier: gameObject.identifier });
  }

  private deleteGameObject(gameObject: GameObject) {
    gameObject.destroy();
    this.changeDetector.markForCheck();
  }

  trackByGameObject(index: number, gameObject: GameObject) {
    return gameObject ? gameObject.identifier : index;
  }
}
