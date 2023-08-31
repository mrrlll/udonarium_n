import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ImageFile } from '@udonarium/core/file-storage/image-file';
import { ObjectNode } from '@udonarium/core/synchronize-object/object-node';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem, Network } from '@udonarium/core/system';
import { GameCharacter } from '@udonarium/game-character';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { ChatPaletteComponent } from 'component/chat-palette/chat-palette.component';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
import { MovableOption } from 'directive/movable.directive';
import { RotableOption } from 'directive/rotable.directive';
import { ContextMenuSeparator, ContextMenuService } from 'service/context-menu.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';
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
export class GameCharacterComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() gameCharacter: GameCharacter = null;
  @Input() is3D: boolean = false;
  @Input() tabletopObject: TabletopObject = null;

  // GMフラグ
  obs: Observable<boolean>;
  subs: Subscription;
  isGM: boolean;

  get name(): string { return this.gameCharacter.name; }
  get size(): number { return this.adjustMinBounds(this.gameCharacter.size); }
  get imageFile(): ImageFile { return this.gameCharacter.imageFile; }
  get rotate(): number { return this.gameCharacter.rotate; }
  set rotate(rotate: number) { this.gameCharacter.rotate = rotate; }
  get roll(): number { return this.gameCharacter.roll; }
  set roll(roll: number) { this.gameCharacter.roll = roll; }
  get isAltitudeIndicate(): boolean { return this.gameCharacter.isAltitudeIndicate; }
  set isAltitudeIndicate(isAltitudeIndicate: boolean) { this.gameCharacter.isAltitudeIndicate = isAltitudeIndicate; }
  get isHide(): boolean { return this.gameCharacter.isHide; }
  set isHide(isHide: boolean) { this.gameCharacter.isHide = isHide; }


  gridSize: number = 50;

  movableOption: MovableOption = {};
  rotableOption: RotableOption = {};

  constructor(
    private contextMenuService: ContextMenuService,
    private panelService: PanelService,
    private changeDetector: ChangeDetectorRef,
    private pointerDeviceService: PointerDeviceService,
    private appCustomService: AppConfigCustomService
  ) { }

  ngOnInit() {
    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', -1000, event => {
        let object = ObjectStore.instance.get(event.data.identifier);
        if (!this.gameCharacter || !object) return;
        if (this.gameCharacter === object || (object instanceof ObjectNode && this.gameCharacter.contains(object))) {
          this.changeDetector.markForCheck();
        }
      })
      .on('SYNCHRONIZE_FILE_LIST', event => {
        this.changeDetector.markForCheck();
      })
      .on('UPDATE_FILE_RESOURE', -1000, event => {
        this.changeDetector.markForCheck();
      });
    this.movableOption = {
      tabletopObject: this.gameCharacter,
      transformCssOffset: 'translateZ(1.0px)',
      colideLayers: ['terrain']
    };
    this.rotableOption = {
      tabletopObject: this.gameCharacter
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

  ngAfterViewInit() { }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  @HostListener('dragstart', ['$event'])
  onDragstart(e: any) {
    console.log('Dragstart Cancel !!!!');
    e.stopPropagation();
    e.preventDefault();
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    let position = this.pointerDeviceService.pointers[0];
    this.contextMenuService.open(position, [
      { name: '詳細を表示', action: () => { this.showDetail(this.gameCharacter); } },
      { name: 'チャットパレットを表示', action: () => { this.showChatPalette(this.gameCharacter) } },
      ContextMenuSeparator,
      {
        name: '共有イベントリに移動', action: () => {
          this.gameCharacter.setLocation('common');
          SoundEffect.play(PresetSound.piecePut);
        }
      },
      {
        name: '個人イベントリに移動', action: () => {
          this.gameCharacter.setLocation(Network.peerId);
          SoundEffect.play(PresetSound.piecePut);
        }
      },
      {
        name: '墓場に移動', action: () => {
          this.gameCharacter.setLocation('graveyard');
          SoundEffect.play(PresetSound.sweep);
        }
      },
      ContextMenuSeparator,
      {
        name: 'コピーを作る', action: () => {
          let cloneObject = this.gameCharacter.clone();
          cloneObject.location.x += this.gridSize;
          cloneObject.location.y += this.gridSize;
          cloneObject.update();
          SoundEffect.play(PresetSound.piecePut);
        }
      },
      (this.isGM && this.isHide
        ? {
          name: '表示する', action: () => {
            this.gameCharacter.hideOff();
          }
        }: {name : null, enabled: false}
      ),
      (this.isGM && !this.isHide
        ? {
          name: '非表示にする', action: () => {
            this.gameCharacter.hideOn();
          }
        }: {name : null, enabled: false}
      ),
    ], this.name);
  }

  onMove() {
    SoundEffect.play(PresetSound.piecePick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.piecePut);
  }

  private adjustMinBounds(value: number, min: number = 0): number {
    return value < min ? min : value;
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
