import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  Input,
  OnChanges,
  OnDestroy
} from '@angular/core';
import { ImageFile } from '@udonarium/core/file-storage/image-file';
import { EventSystem, Network } from '@udonarium/core/system';
import { MathUtil } from '@udonarium/core/system/util/math-util';
import { GameCharacter } from '@udonarium/game-character';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { ChatPaletteComponent } from 'component/chat-palette/chat-palette.component';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
import { MovableOption } from 'directive/movable.directive';
import { RotableOption } from 'directive/rotable.directive';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from 'service/context-menu.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { SelectionState, TabletopSelectionService } from 'service/tabletop-selection.service';
import { TabletopObject } from '@udonarium/tabletop-object';
import { AppConfigCustomService } from 'service/app-config-custom.service';
import { Observable, Subscription } from 'rxjs';

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

  // GMフラグ
  obs: Observable<boolean>;
  subs: Subscription;
  isGM: boolean;

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

  get elevation(): number {
    return +((this.gameCharacter.posZ + (this.altitude * this.gridSize)) / this.gridSize).toFixed(1);
  }

  gridSize: number = 50;

  movableOption: MovableOption = {};
  rotableOption: RotableOption = {};
  rollOption: RotableOption = {};

  constructor(
    private contextMenuService: ContextMenuService,
    private panelService: PanelService,
    private changeDetector: ChangeDetectorRef,
    private selectionService: TabletopSelectionService,
    private pointerDeviceService: PointerDeviceService,
    private appCustomService: AppConfigCustomService
  ) { }

  viewRotateZ = 0;
  math = Math;

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
    EventSystem.unregister(this);
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
        }
      }, ContextMenuSeparator]
      .concat(['ブラック', 'ブルー', 'グリーン', 'シアン', 'レッド', 'マゼンタ', 'イエロー', 'ホワイト']
      .map((color, i) => {
        return {
          name: `${this.aura == i - 1 ? '◉' : '○'} ${color}`, action: () => {
            this.aura = i - 1;
            EventSystem.trigger('UPDATE_INVENTORY', null)
          }
        };
      })
    )});
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
    // 影を表示非表示
    actions.push(this.isDropShadow
      ? {
        name: '☑ 影を表示', action: () => {
          this.isDropShadow = false;
        }
      } : {
        name: '☐ 影を表示', action: () => {
          this.isDropShadow = true;
        }
      }
    );
    actions.push(ContextMenuSeparator);
    actions.push(
      this.altitude >= 0
      ?{
        name: '高さを0にする', action: () => {
          this.altitude = 0;
        },
        disabled: (this.altitude == 0),
        altitudeHande: this.gameCharacter
      }:{
        name: '高さを0にする', action: () => {
          this.altitude = 0;
        },
        altitudeHande: this.gameCharacter
      }
    )
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
        name: '☑ 他のコマに乗る', action: () => {
          this.isNotRide = true;
        },
        disabled: (this.isNotRide),
        altitudeHande: this.gameCharacter
      }:{
        name: '☐ 他のコマに乗る', action: () => {
          this.isNotRide = false;
        },
        altitudeHande: this.gameCharacter
      }
    )
    actions.push(ContextMenuSeparator);
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
    // ステルスモードのオンオフ
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

  private showDetail(gameObject: GameCharacter) {
    let coordinate = this.pointerDeviceService.pointers[0];
    let title = 'キャラクターシート';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    let option: PanelOption = { title: title, left: coordinate.x - 400, top: coordinate.y - 300, width: 800, height: 600 };
    let component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }

  private showChatPalette(gameObject: GameCharacter) {
    let coordinate = this.pointerDeviceService.pointers[0];
    let option: PanelOption = { left: coordinate.x - 250, top: coordinate.y - 175, width: 615, height: 350 };
    let component = this.panelService.open<ChatPaletteComponent>(ChatPaletteComponent, option);
    component.character = gameObject;
  }
}
