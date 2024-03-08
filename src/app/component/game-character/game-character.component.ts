import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { ImageFile } from '@udonarium/core/file-storage/image-file';
import { EventSystem, Network } from '@udonarium/core/system';
import { MathUtil } from '@udonarium/core/system/util/math-util';
import { GameCharacter } from '@udonarium/game-character';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { ChatPaletteComponent } from 'component/chat-palette/chat-palette.component';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
// import { InputHandler } from 'directive/input-handler';
import { MovableOption } from 'directive/movable.directive';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { ObjectInteractGesture } from 'component/game-table/object-interact-gesture';
import { RotableOption } from 'directive/rotable.directive';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from 'service/context-menu.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { SelectionState, TabletopSelectionService } from 'service/tabletop-selection.service';
import { TabletopObject } from '@udonarium/tabletop-object';
import { AppConfigCustomService } from 'service/app-config-custom.service';
import { Observable, Subscription } from 'rxjs';
import { TableSelecter } from '@udonarium/table-selecter';
import { Config } from '@udonarium/config';
import { RemoteControllerComponent } from 'component/remote-controller/remote-controller.component';
import { GameCharacterBuffViewComponent } from 'component/game-character-buff-view/game-character-buff-view.component';
import { InsaneSkillTableComponent } from 'component/insane-skill-table/insane-skill-table.component';

@Component({
  selector: 'game-character',
  templateUrl: './game-character.component.html',
  styleUrls: ['./game-character.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('bounceInOut', [
      transition('void => *', [
        animate('600ms ease', keyframes([
          style({ transform: 'scale3d(0, 0, 0)', offset: 0 }),
          style({ transform: 'scale3d(1.5, 1.5, 1.5)', offset: 0.5 }),
          style({ transform: 'scale3d(0.75, 0.75, 0.75)', offset: 0.75 }),
          style({ transform: 'scale3d(1.125, 1.125, 1.125)', offset: 0.875 }),
          style({ transform: 'scale3d(1.0, 1.0, 1.0)', offset: 1.0 })
        ]))
      ]),
      transition('* => void', [
        animate(100, style({ transform: 'scale3d(0, 0, 0)' }))
      ])
    ])
  ]
})
export class GameCharacterComponent implements OnChanges, OnDestroy {
  @Input() gameCharacter: GameCharacter = null;
  @Input() is3D: boolean = false;
  @Input() tabletopObject: TabletopObject = null;
  @ViewChild('root') rootElementRef: ElementRef<HTMLElement>;

  private foldingBuff: boolean = false;

  // GMフラグ
  obs: Observable<boolean>;
  subs: Subscription;
  isGM: boolean;

  get config(): Config { return ObjectStore.instance.get<Config>('Config')};

  get name(): string { return this.gameCharacter.name; }
  get size(): number { return MathUtil.clampMin(this.gameCharacter.size); }
  get altitude(): number { return this.gameCharacter.altitude; }
  set altitude(altitude: number) { this.gameCharacter.altitude = altitude; }
  get imageFile(): ImageFile { return this.gameCharacter.imageFile; }
  get rotate(): number { return this.gameCharacter.rotate; }
  set rotate(rotate: number) { this.gameCharacter.rotate = rotate; }
  get roll(): number { return this.gameCharacter.roll; }
  set roll(roll: number) { this.gameCharacter.roll = roll; }
  get isDropShadow(): boolean { return this.gameCharacter.isDropShadow; }
  set isDropShadow(isDropShadow: boolean) { this.gameCharacter.isDropShadow = isDropShadow; }
  get isAltitudeIndicate(): boolean { return this.gameCharacter.isAltitudeIndicate; }
  set isAltitudeIndicate(isAltitudeIndicate: boolean) { this.gameCharacter.isAltitudeIndicate = isAltitudeIndicate; }
  get isLock(): boolean { return this.gameCharacter.isLock; }
  set isLock(isLock: boolean) { this.gameCharacter.isLock = isLock; }
  get isRotate(): boolean { return this.gameCharacter.isRotate; }
  set isRotate(isRotate: boolean) { this.gameCharacter.isRotate = isRotate; }
  get isInverse(): boolean { return this.gameCharacter.isInverse; }
  set isInverse(isInverse: boolean) { this.gameCharacter.isInverse = isInverse; }
  get isHollow(): boolean { return this.gameCharacter.isHollow; }
  set isHollow(isHollow: boolean) { this.gameCharacter.isHollow = isHollow; }
  get isBlackPaint(): boolean { return this.gameCharacter.isBlackPaint; }
  set isBlackPaint(isBlackPaint: boolean) { this.gameCharacter.isBlackPaint = isBlackPaint; }
  get isInvertColor(): boolean { return this.gameCharacter.isInvertColor; }
  set isInvertColor(isInvertColor: boolean) { this.gameCharacter.isInvertColor = isInvertColor; }
  get aura(): number { return this.gameCharacter.aura; }
  set aura(aura: number) { this.gameCharacter.aura = aura; }
  get isNotRide(): boolean { return this.gameCharacter.isNotRide; }
  set isNotRide(isNotRide: boolean) { this.gameCharacter.isNotRide = isNotRide; }
  get isStealth(): boolean { return this.gameCharacter.isStealth; }
  set isStealth(isStealth: boolean) { this.gameCharacter.isStealth = isStealth; }
  get isHideKomaWaku(): boolean { return this.gameCharacter.isHideKomaWaku; }
  set isHideKomaWaku(isHideKomaWaku: boolean) { this.gameCharacter.isHideKomaWaku = isHideKomaWaku; }
  get selectionState(): SelectionState { return this.selectionService.state(this.gameCharacter); }
  get isSelected(): boolean { return this.selectionState !== SelectionState.NONE; }
  get isMagnetic(): boolean { return this.selectionState === SelectionState.MAGNETIC; }
  get roomAltitude(): boolean { return this.config.roomAltitude; }
  get tableSelecter(): TableSelecter { return TableSelecter.instance; }
  get insaneSkills(): string[] { return this.gameCharacter.insaneSkills; }
  get insaneFears(): string[] { return this.gameCharacter.insaneFears; }
  get insaneCuriosity(): string { return this.gameCharacter.insaneCuriosity; }
  get elevation(): number {
    return +((this.gameCharacter.posZ + (this.altitude * this.gridSize)) / this.gridSize).toFixed(1);
  }
  get dbclickActionNum(): number { return this.gameCharacter.dbclickActionNum; }
  set dbclickActionNum(dbclickActionNum: number) { this.gameCharacter.dbclickActionNum = dbclickActionNum; }

  gridSize: number = 50;
  viewRotateX = 50;
  viewRotateZ = 10;
  math = Math;

  movableOption: MovableOption = {};
  rotableOption: RotableOption = {};
  rollOption: RotableOption = {};
  // private input: InputHandler = null;
  private interactGesture: ObjectInteractGesture = null;

  private highlightTimer: NodeJS.Timeout;
  private unhighlightTimer: NodeJS.Timeout;

  constructor(
    private contextMenuService: ContextMenuService,
    private elementRef: ElementRef<HTMLElement>,
    private panelService: PanelService,
    private changeDetector: ChangeDetectorRef,
    private selectionService: TabletopSelectionService,
    private pointerDeviceService: PointerDeviceService,
    private appCustomService: AppConfigCustomService,
    private ngZone: NgZone
  ) { }

  ngOnChanges(): void {
    EventSystem.unregister(this);
    EventSystem.register(this)
      .on(`UPDATE_GAME_OBJECT/identifier/${this.gameCharacter?.identifier}`, event => {
        this.changeDetector.markForCheck();
      })
      .on(`UPDATE_OBJECT_CHILDREN/identifier/${this.gameCharacter?.identifier}`, event => {
        this.changeDetector.markForCheck();
      })
      .on('SYNCHRONIZE_FILE_LIST', event => {
        this.changeDetector.markForCheck();
      })
      .on('UPDATE_FILE_RESOURE', -1000, event => {
        this.changeDetector.markForCheck();
      })
      .on('NO_ROOM_ALTITUDE', event => {
        this.gameCharacter.altitude = 0;
      })
      .on('CHK_TARGET_CHANGE', -1000, event => {
        let objct = ObjectStore.instance.get(event.data.identifier);
        if (objct == this.gameCharacter) {
          this.changeDetector.detectChanges();
        }
      })
      .on('HIGHTLIGHT_TABLETOP_OBJECT', event => {
        if (this.gameCharacter.identifier !== event.data.identifier) { return; }
        if (this.gameCharacter.location.name != "table") { return; }

        console.log(`recv focus event to ${this.gameCharacter.name}`);
        // アニメーション開始のタイマーが既にあってアニメーション開始前（ごくわずかな間）ならば何もしない
        if (this.highlightTimer != null) { return; }

        // アニメーション中であればアニメーションを初期化
        if (this.rootElementRef.nativeElement.classList.contains('focused')) {
          clearTimeout(this.unhighlightTimer);
          this.rootElementRef.nativeElement.classList.remove('focused');
        }

        // アニメーション開始処理タイマー
        this.highlightTimer = setTimeout(() => {
          this.highlightTimer = null;
          this.rootElementRef.nativeElement.classList.add('focused');
        }, 0);
        // アニメーション終了処理タイマー
        this.unhighlightTimer = setTimeout(() => {
          this.unhighlightTimer = null;
          this.rootElementRef.nativeElement.classList.remove('focused');
        }, 1010);
      })
      .on<object>('TABLE_VIEW_ROTATE', -1000, event => {
        this.ngZone.run(() => {
          this.viewRotateX = event.data['x'];
          this.viewRotateZ = event.data['z'];
          this.changeDetector.markForCheck();
        });
      })
      .on(`UPDATE_SELECTION/identifier/${this.gameCharacter?.identifier}`, event => {
        this.changeDetector.markForCheck();
      });
    this.movableOption = {
      tabletopObject: this.gameCharacter,
      transformCssOffset: 'translateZ(1.0px)',
      colideLayers: ['terrain', 'text-note', 'character']
    };
    this.rotableOption = {
      tabletopObject: this.gameCharacter
    };
    this.rollOption = {
      tabletopObject: this.gameCharacter,
      targetPropertyName: 'roll',
    };
    //GMフラグ管理
    this.obs = this.appCustomService.isViewer$;
    this.subs = this.obs.subscribe((flg) => {
      this.isGM = flg;
      // 同期をする
      this.changeDetector.markForCheck();
    });
    this.isGM = this.appCustomService.dataViewer;
  }

  ngOnDestroy() {
    if (this.subs) {
      this.subs.unsubscribe();
    }
    this.interactGesture.destroy();
    EventSystem.unregister(this);
  }
  // マウスホイールクリックイベント
  @HostListener('mousedown', ['$event'])
  onMousedown(e: any) {
    if (e.button === 1) {
      console.log('マウスホイールクリック');
    }
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.interactGesture = new ObjectInteractGesture(this.elementRef.nativeElement);
    });
    this.interactGesture.onstart = this.onInputStart.bind(this);
    this.interactGesture.oninteract = this.onDoubleClick.bind(this);
  }

  @HostListener('dragstart', ['$event'])
  onDragstart(e: any) {
    e.stopPropagation();
    e.preventDefault();
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    let position = this.pointerDeviceService.pointers[0];

    let menuActions: ContextMenuAction[] = [];
    menuActions = menuActions.concat(this.makeSelectionContextMenu());
    menuActions = menuActions.concat(this.makeContextMenu());
    this.contextMenuService.open(position, menuActions, this.name);
  }

  onMove() {
    this.contextMenuService.close();
    SoundEffect.play(PresetSound.piecePick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.piecePut);
  }

  onInputStart(e: any) {
    if (this.isLock) {
      EventSystem.trigger('DRAG_LOCKED_OBJECT', {});
    }
  }

  onDoubleClick() {
    this.ngZone.run(() => {
      this.dbclickAction(this.gameCharacter);
    });
  }

  private makeSelectionContextMenu(): ContextMenuAction[] {
    if (this.selectionService.objects.length < 1) return [];

    let actions: ContextMenuAction[] = [];

    let objectPosition = {
      x: this.gameCharacter.location.x + (this.gameCharacter.size * this.gridSize) / 2,
      y: this.gameCharacter.location.y + (this.gameCharacter.size * this.gridSize) / 2,
      z: this.gameCharacter.posZ
    };
    actions.push({ name: 'ここに集める', action: () => this.selectionService.congregate(objectPosition) });

    if (this.isSelected) {
      let selectedCharacter = () => this.selectionService.objects.filter(object => object.aliasName === this.gameCharacter.aliasName) as GameCharacter[];
      let subActions: ContextMenuAction[] = [];

      subActions.push({
        name: 'すべて共有イベントリに移動', action: () => {
          selectedCharacter().forEach(gameCharacter => {
            gameCharacter.setLocation('common')
            this.selectionService.remove(gameCharacter);
          });
          SoundEffect.play(PresetSound.piecePut);
        }
      });
      subActions.push({
        name: 'すべて個人イベントリに移動', action: () => {
          selectedCharacter().forEach(gameCharacter => {
            gameCharacter.setLocation(Network.peerId);
            this.selectionService.remove(gameCharacter);
          });
          SoundEffect.play(PresetSound.piecePut);
        }
      });
      subActions.push({
        name: 'すべて墓場に移動', action: () => {
          selectedCharacter().forEach(gameCharacter => {
            gameCharacter.setLocation('graveyard');
            this.selectionService.remove(gameCharacter);
          });
          SoundEffect.play(PresetSound.sweep);
        }
      });
      if(this.isGM){
        subActions.push({
          name: 'すべてステルスモードを無効', action: () => {
            selectedCharacter().forEach(gameCharacter => {
              gameCharacter.hideOff();
              this.selectionService.remove(gameCharacter);
            });
          }
        });
        subActions.push({
          name: 'すべてステルスモードを有効', action: () => {
            selectedCharacter().forEach(gameCharacter => {
              gameCharacter.hideOn();
              this.selectionService.remove(gameCharacter);
            });
          }
        });
      }
      actions.push(
        {
          name: '選択したキャラクター', action: null, subActions: subActions
        }
      );
    }

    actions.push(ContextMenuSeparator);
    return actions;
  }

  private makeContextMenu(): ContextMenuAction[] {
    let actions: ContextMenuAction[] = [];
    let subActions: ContextMenuAction[] = [];

    actions.push({ name: '詳細を表示', action: () => { this.showDetail(this.gameCharacter); } });
    actions.push({ name: 'チャットパレットを表示', action: () => { this.showChatPalette(this.gameCharacter) } });
    if(this.gameCharacter.chatPalette.dicebot === 'Insane'){
      actions.push({ name: '特技表を表示(WIP)', action: () => { this.showInsaneSkillTable(this.gameCharacter) } });
    }
    actions.push({ name: 'リモコンを表示', action: () => { this.showRemoteController(this.gameCharacter) } });
    actions.push({ name: 'バフ編集', action: () => { this.showBuffEdit(this.gameCharacter) } });
    actions.push(ContextMenuSeparator);
    subActions.push(
      this.isInverse
        ? {
          name: '☑ 反転', action: () => {
            this.isInverse = false;
            EventSystem.trigger('UPDATE_INVENTORY', null);
          }
        } : {
          name: '☐ 反転', action: () => {
            this.isInverse = true;
            EventSystem.trigger('UPDATE_INVENTORY', null);
          }
        }
    );
    subActions.push(
      this.isHollow
        ? {
          name: '☑ ぼかし', action: () => {
            this.isHollow = false;
            EventSystem.trigger('UPDATE_INVENTORY', null);
          }
        } : {
          name: '☐ ぼかし', action: () => {
            this.isHollow = true;
            EventSystem.trigger('UPDATE_INVENTORY', null);
          }
        }
    );
    subActions.push(
      this.isBlackPaint
        ? {
          name: '☑ 黒塗り', action: () => {
            this.isBlackPaint = false;
            EventSystem.trigger('UPDATE_INVENTORY', null);
          }
        } : {
          name: '☐ 黒塗り', action: () => {
            this.isBlackPaint = true;
            EventSystem.trigger('UPDATE_INVENTORY', null);
          }
        }
    );
    subActions.push(
      this.isInvertColor
        ? {
          name: '☑ 色を反転', action: () => {
            this.isInvertColor = false;
            EventSystem.trigger('UPDATE_INVENTORY', null);
          }
        } : {
          name: '☐ 色を反転', action: () => {
            this.isInvertColor = true;
            EventSystem.trigger('UPDATE_INVENTORY', null);
          }
        }
    );
    subActions.push({
      name: 'オーラ', action: null,
      subActions: [{
        name: `${this.aura == -1 ? '◉' : '○'} なし`, action: () => {
          this.aura = -1;
          EventSystem.trigger('UPDATE_INVENTORY', null)
        }}, ContextMenuSeparator]
        .concat(['ブラック', 'ブルー', 'グリーン', 'シアン', 'レッド', 'マゼンタ', 'イエロー', 'ホワイト']
        .map((color, i) => {
          return {
            name: `${this.aura == i ? '◉' : '○'} ${color}`, colorSample: true, action: () => {
              this.aura = i;
              EventSystem.trigger('UPDATE_INVENTORY', null)
            }
          };
      }))
    }),
    subActions.push(ContextMenuSeparator);
    subActions.push({
      name: 'リセット', action: () => {
        this.isInverse = false;
        this.isHollow = false;
        this.isBlackPaint = false;
        this.isInvertColor = false;
        this.aura = -1;
        EventSystem.trigger('UPDATE_INVENTORY', null);
      },
      disabled: !this.isInverse && !this.isHollow && !this.isBlackPaint && this.aura == -1 && !this.isInvertColor
    });
    actions.push(
      this.isLock
      ?{
        name: '☑ 固定する', action: () => {
          this.isLock = false;
          SoundEffect.play(PresetSound.unlock);
        }
      }:{
        name: '☐ 固定する', action: () => {
          this.isLock = true;
          SoundEffect.play(PresetSound.lock);
        }
      }
    )
    actions.push({
      name: this.isRotate
      ? '☑ 回転'
      : '☐ 回転',
      action: () => {
        this.isRotate = !this.isRotate;
      }
    })
    actions.push({
      name: !this.isHideKomaWaku
      ? '☑ コマ枠を表示'
      : '☐ コマ枠を表示',
      action: () => {
        this.isHideKomaWaku = !this.isHideKomaWaku;
      }
    })
    actions.push(ContextMenuSeparator);
    actions.push({ name: '画像効果', action: null, subActions: subActions });
    let dbActionList: ContextMenuAction[] = [];
    dbActionList.push({
      name: this.dbclickActionNum === 99
      ? '◉ 無効'
      : '○ 無効',
      action: () => {
        this.dbclickActionNum = 99;
      }
    });
    dbActionList.push({
      name: this.dbclickActionNum === 0
      ? '◉ 詳細を表示'
      : '○ 詳細を表示',
      action: () => {
        this.dbclickActionNum = 0;
      }
    });
    dbActionList.push({
      name: this.dbclickActionNum === 1
      ? '◉ チャットパレットを表示'
      : '○ チャットパレットを表示',
      action: () => {
        this.dbclickActionNum = 1;
      }
    });
    dbActionList.push({
      name: this.dbclickActionNum === 2
      ? '◉ リモコンを表示'
      : '○ リモコンを表示',
      action: () => {
        this.dbclickActionNum = 2;
      }
    });
    dbActionList.push({
      name: this.dbclickActionNum === 3
      ? '◉ 固定切り替え'
      : '○ 固定切り替え',
      action: () => {
        this.dbclickActionNum = 3;
      }
    });
    dbActionList.push({
      name: this.dbclickActionNum === 4
      ? '◉ ステルス切り替え(要GM権限)'
      : '○ ステルス切り替え(要GM権限)',
      action: () => {
        this.dbclickActionNum = 4;
      },
      disabled: !this.isGM
    });

    actions.push({ name: 'ダブルクリックアクション', action: null, subActions: dbActionList})
    actions.push(ContextMenuSeparator);
    actions.push({
      name: 'コピーを作る', action: () => {
        let cloneObject = this.gameCharacter.clone();
        cloneObject.location.x += this.gridSize;
        cloneObject.location.y += this.gridSize;
        cloneObject.isLock = false;
        cloneObject.update();
        SoundEffect.play(PresetSound.piecePut);
      }
    });
    actions.push({
      name: '共有イベントリに移動', action: () => {
        this.gameCharacter.setLocation('common');
        SoundEffect.play(PresetSound.piecePut);
      }
    });
    actions.push({
      name: '個人イベントリに移動', action: () => {
        this.gameCharacter.setLocation(Network.peerId);
        SoundEffect.play(PresetSound.piecePut);
      }
    });
    actions.push({
      name: '墓場に移動', action: () => {
        this.gameCharacter.setLocation('graveyard');
        SoundEffect.play(PresetSound.sweep);
      }
    });
    if(this.isGM){
      actions.push(ContextMenuSeparator);
    }
    actions.push({
      name: this.isStealth
      ? '☑ ステルスモード'
      : '☐ ステルスモード',
      action: () => {
        this.gameCharacter.isStealth = !this.gameCharacter.isStealth;
      },
      disabled: !this.isGM
    });
    return actions;
  }

  checkKey(event) {
    //イベント処理
    let key_event = event || window.event;
    let key_shift = (key_event.shiftKey);
    let key_ctrl = (key_event.ctrlKey);
    let key_alt = (key_event.altKey);
    let key_meta = (key_event.metaKey);
    //キーに対応した処理

    if (key_alt) {
      this.gameCharacter.targeted = this.gameCharacter.targeted ? false : true;
    }

    if (key_shift && key_alt) {
      let objects = ObjectStore.instance.getObjects(GameCharacter);
      for (let object of objects) {
        object.targeted = false;
        EventSystem.trigger('CHK_TARGET_CHANGE', { identifier: object.identifier, className: object.aliasName });
      }
    }

    //出力
  }

  dbclickAction(gameCharacter: GameCharacter) {
    switch (gameCharacter.dbclickActionNum) {
      case 0:
        this.showDetail(gameCharacter);
        break;
      case 1:
        this.showChatPalette(gameCharacter);
        break;
      case 2:
        this.showRemoteController(gameCharacter);
        break;
      case 3:
        this.isLock = !this.isLock;
        break;
      case 4:
        if(this.isGM) this.isStealth = !this.isStealth;
        break;
      case 99:
        break;
    }
  }

  private showDetail(gameObject: GameCharacter) {
    let coordinate = this.pointerDeviceService.pointers[0];
    let title = 'キャラクターシート';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    let option: PanelOption = { title: title, left: coordinate.x - 400, top: coordinate.y - 300, width: 860, height: 650 };
    let component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }

  private showChatPalette(gameObject: GameCharacter) {
    let coordinate = this.pointerDeviceService.pointers[0];
    let option: PanelOption = { left: coordinate.x - 250, top: coordinate.y - 175, width: 615, height: 350 };
    let component = this.panelService.open<ChatPaletteComponent>(ChatPaletteComponent, option);
    component.character = gameObject;
  }

  private showRemoteController(gameObject: GameCharacter) {
    let coordinate = this.pointerDeviceService.pointers[0];
    let option: PanelOption = { left: coordinate.x - 250, top: coordinate.y - 175, width: 700, height: 625 };
    let component = this.panelService.open<RemoteControllerComponent>(RemoteControllerComponent, option);
    component.character = gameObject;
  }

  private showBuffEdit(gameObject: GameCharacter) {
    let coordinate = this.pointerDeviceService.pointers[0];
    let option: PanelOption = { left: coordinate.x, top: coordinate.y, width: 420, height: 300 };
    option.title = gameObject.name + 'のバフ編集';
    let component = this.panelService.open<GameCharacterBuffViewComponent>(GameCharacterBuffViewComponent, option);
    component.character = gameObject;
  }

  private showInsaneSkillTable(gameObject: GameCharacter) {
    let coordinate = this.pointerDeviceService.pointer[0];
    let option: PanelOption = { width: 815, height: 550 };
    let component = this.panelService.open<InsaneSkillTableComponent>(InsaneSkillTableComponent, option);
    component.character = gameObject;
  }

  foldingBuffFlag(flag: boolean){
    console.log('private foldingBuffFlag');
    this.foldingBuff = flag;
  }

  get buffNum(): number{
    if ( this.gameCharacter.buffDataElement.children.length == 0){
      return 0;
    }
    return this.gameCharacter.buffDataElement.children[0].children.length;
  }
}
