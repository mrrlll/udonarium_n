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
import { InputHandler } from 'directive/input-handler';
import { MovableOption } from 'directive/movable.directive';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
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
  get isInverse(): boolean { return this.gameCharacter.isInverse; }
  set isInverse(isInverse: boolean) { this.gameCharacter.isInverse = isInverse; }
  get isHollow(): boolean { return this.gameCharacter.isHollow; }
  set isHollow(isHollow: boolean) { this.gameCharacter.isHollow = isHollow; }
  get isBlackPaint(): boolean { return this.gameCharacter.isBlackPaint; }
  set isBlackPaint(isBlackPaint: boolean) { this.gameCharacter.isBlackPaint = isBlackPaint; }
  get aura(): number { return this.gameCharacter.aura; }
  set aura(aura: number) { this.gameCharacter.aura = aura; }

  get isNotRide(): boolean { return this.gameCharacter.isNotRide; }
  set isNotRide(isNotRide: boolean) { this.gameCharacter.isNotRide = isNotRide; }

  get isStealth(): boolean { return this.gameCharacter.isStealth; }
  set isStealth(isStealth: boolean) { this.gameCharacter.isStealth = this.isStealth; }

  get selectionState(): SelectionState { return this.selectionService.state(this.gameCharacter); }
  get isSelected(): boolean { return this.selectionState !== SelectionState.NONE; }
  get isMagnetic(): boolean { return this.selectionState === SelectionState.MAGNETIC; }

  get roomAltitude(): boolean { return this.config.roomAltitude; }

  get tableSelecter(): TableSelecter { return TableSelecter.instance; }

  get elevation(): number {
    return +((this.gameCharacter.posZ + (this.altitude * this.gridSize)) / this.gridSize).toFixed(1);
  }

  gridSize: number = 50;
  viewRotateX = 50;
  viewRotateZ = 10;
  math = Math;

  movableOption: MovableOption = {};
  rotableOption: RotableOption = {};
  rollOption: RotableOption = {};
  private input: InputHandler = null;

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
    this.input.destroy();
    EventSystem.unregister(this);
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.input = new InputHandler(this.elementRef.nativeElement);
    });
    this.input.onStart = this.onInputStart.bind(this);
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
    this.input.cancel();
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
        this.aura = -1;
        EventSystem.trigger('UPDATE_INVENTORY', null);
      },
      disabled: !this.isInverse && !this.isHollow && !this.isBlackPaint && this.aura == -1
    });

    actions.push({ name: '画像効果', action: null, subActions: subActions });
    actions.push(ContextMenuSeparator);
    if(this.roomAltitude){
      actions.push({
          name: '高さを0にする', action: () => {
            this.altitude = 0;
          },
          altitudeHande: this.gameCharacter
      })
      actions.push(
        this.isAltitudeIndicate
        ?{
          name: '☑ 高度を表示', action: () => {
            this.isAltitudeIndicate = false;
          }
        }:{
          name: '☐ 高度を表示', action: () => {
            this.isAltitudeIndicate = true;
          }
        }
      )
      actions.push(
        !this.isNotRide
        ?{
          name: '☑ 他のキャラクターに乗る', action: () => {
            this.isNotRide = true;
          },
          altitudeHande: this.gameCharacter
        }:{
          name: '☐ 他のキャラクターに乗る', action: () => {
            this.isNotRide = false;
          },
          altitudeHande: this.gameCharacter
        }
      )
      actions.push(ContextMenuSeparator);
    }
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
    actions.push(ContextMenuSeparator);
    actions.push({
      name: 'コピーを作る', action: () => {
        let cloneObject = this.gameCharacter.clone();
        cloneObject.location.x += this.gridSize;
        cloneObject.location.y += this.gridSize;
        cloneObject.update();
        SoundEffect.play(PresetSound.piecePut);
      }
    });
    actions.push(ContextMenuSeparator);
    if(this.isGM && this.isStealth){
      actions.push({
        name: '☑ ステルスモード', action: () => {
          this.gameCharacter.hideOff();
        }
      });
    }else if(this.isGM && !this.isStealth){
      actions.push({
        name: '☐ ステルスモード', action: () => {
          this.gameCharacter.hideOn();
        }
      });
    }
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

    if (key_shift) console.log("shiftキー");
    if (key_ctrl) console.log("ctrlキー");
    if (key_alt) {
      console.log("altキー");
      this.gameCharacter.targeted = this.gameCharacter.targeted ? false : true;
    }
    if (key_meta) console.log("metaキー");

    if (key_shift && key_alt) {
      console.log("shift+ALTキー");
      let objects = ObjectStore.instance.getObjects(GameCharacter);
      for (let object of objects) {
        object.targeted = false;
        EventSystem.trigger('CHK_TARGET_CHANGE', { identifier: object.identifier, className: object.aliasName });
      }
    }

    //出力
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

  private foldingBuffFlag(flag: boolean){
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
