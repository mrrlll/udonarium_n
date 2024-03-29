import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  NgZone,
  OnChanges,
  OnDestroy
} from '@angular/core';
import { ImageFile } from '@udonarium/core/file-storage/image-file';
import { EventSystem } from '@udonarium/core/system';
import { MathUtil } from '@udonarium/core/system/util/math-util';
import { GameTableMask } from '@udonarium/game-table-mask';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
import { InputHandler } from 'directive/input-handler';
import { MovableOption } from 'directive/movable.directive';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from 'service/context-menu.service';
import { CoordinateService } from 'service/coordinate.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { TabletopActionService } from 'service/tabletop-action.service';
import { TabletopService } from 'service/tabletop.service';
import { SelectionState, TabletopSelectionService } from 'service/tabletop-selection.service';
import { AppConfigCustomService } from 'service/app-config-custom.service';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'game-table-mask',
  templateUrl: './game-table-mask.component.html',
  styleUrls: ['./game-table-mask.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameTableMaskComponent implements OnChanges, OnDestroy, AfterViewInit {
  @Input() gameTableMask: GameTableMask = null;
  @Input() is3D: boolean = false;

  // GMフラグ
  obs: Observable<boolean>;
  subs: Subscription;
  isGM: boolean;

  get name(): string { return this.gameTableMask.name; }
  get width(): number { return MathUtil.clampMin(this.gameTableMask.width); }
  get height(): number { return MathUtil.clampMin(this.gameTableMask.height); }
  get opacity(): number { return this.gameTableMask.opacity; }
  get imageFile(): ImageFile { return this.gameTableMask.imageFile; }
  get isLock(): boolean { return this.gameTableMask.isLock; }
  set isLock(isLock: boolean) { this.gameTableMask.isLock = isLock; }
  get maskborder(): boolean { return this.gameTableMask.maskborder; }
  set maskborder(maskborder: boolean) { this.gameTableMask.maskborder = maskborder; }
  get isHide(): boolean { return this.gameTableMask.isHide; }
  set isHide(isHide: boolean) { this.gameTableMask.isHide = isHide; }
  get tableMasks(): GameTableMask[] { return this.tabletopService.tableMasks; }
  get isLockIcon(): boolean { return this.gameTableMask.isLockIcon; }
  set isLockIcon(isLockIcon: boolean) { this.gameTableMask.isLockIcon = isLockIcon; }

  get selectionState(): SelectionState { return this.selectionService.state(this.gameTableMask); }
  get isSelected(): boolean { return this.selectionState !== SelectionState.NONE; }
  get isMagnetic(): boolean { return this.selectionState === SelectionState.MAGNETIC; }

  gridSize: number = 50;
  masks: GameTableMask[] = [];

  movableOption: MovableOption = {};

  private input: InputHandler = null;

  constructor(
    private ngZone: NgZone,
    private tabletopActionService: TabletopActionService,
    private contextMenuService: ContextMenuService,
    private elementRef: ElementRef<HTMLElement>,
    private panelService: PanelService,
    private changeDetector: ChangeDetectorRef,
    private selectionService: TabletopSelectionService,
    private pointerDeviceService: PointerDeviceService,
    private tabletopService: TabletopService,
    private coordinateService: CoordinateService,
    private appCustomService: AppConfigCustomService
  ) { }

  ngOnChanges(): void {
    EventSystem.register(this)
      .on(`UPDATE_GAME_OBJECT/identifier/${this.gameTableMask?.identifier}`, event => {
        this.changeDetector.markForCheck();
      })
      .on(`UPDATE_OBJECT_CHILDREN/identifier/${this.gameTableMask?.identifier}`, event => {
        this.changeDetector.markForCheck();
      })
      .on('SYNCHRONIZE_FILE_LIST', event => {
        this.changeDetector.markForCheck();
      })
      .on('UPDATE_FILE_RESOURE', -1000, event => {
        this.changeDetector.markForCheck();
      })
      .on(`UPDATE_SELECTION/identifier/${this.gameTableMask?.identifier}`, event => {
        this.changeDetector.markForCheck();
      });
    this.movableOption = {
      tabletopObject: this.gameTableMask,
      transformCssOffset: 'translateZ(0.15px)',
      colideLayers: ['terrain', 'text-note']
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

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.input = new InputHandler(this.elementRef.nativeElement);
    });
    this.input.onStart = this.onInputStart.bind(this);
  }

  ngOnDestroy() {
    this.input.destroy();
    EventSystem.unregister(this);
  }

  @HostListener('dragstart', ['$event'])
  onDragstart(e) {
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(e: any) {
    this.input.cancel();

    // TODO:もっと良い方法考える
    if (this.isLock) {
      EventSystem.trigger('DRAG_LOCKED_OBJECT', { srcEvent: e });
    }
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    let menuPosition = this.pointerDeviceService.pointers[0];

    let menuActions: ContextMenuAction[] = [];
    menuActions = menuActions.concat(this.makeSelectionContextMenu());
    menuActions = menuActions.concat(this.makeContextMenu());

    this.contextMenuService.open(menuPosition, menuActions, this.name);
  }

  onMove() {
    this.contextMenuService.close();
    SoundEffect.play(PresetSound.cardPick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.cardPut);
  }

  private makeSelectionContextMenu(): ContextMenuAction[] {
    if (this.selectionService.objects.length < 1) return [];

    let actions: ContextMenuAction[] = [];

    let objectPosition = this.coordinateService.calcTabletopLocalCoordinate();
    actions.push({ name: 'ここに集める', action: () => this.selectionService.congregate(objectPosition) });

    if (this.isSelected) {
      let selectedGameTableMasks = () => this.selectionService.objects.filter(object => object.aliasName === this.gameTableMask.aliasName) as GameTableMask[];
      let subActions: ContextMenuAction[] = [];

      subActions.push({
        name: '☑ すべてボーダーを表示', action: () => {
          selectedGameTableMasks().forEach(gameTableMask => gameTableMask.maskborder = true);
        }
      });
      subActions.push({
        name: '☐ すべてボーダーを非表示', action: () => {
          selectedGameTableMasks().forEach(gameTableMask => gameTableMask.maskborder = false);
        }
      });
      subActions.push({
        name: '☑ すべて固定', action: () => {
          selectedGameTableMasks().forEach(gameTableMask => gameTableMask.isLock = true);
          SoundEffect.play(PresetSound.lock);
        }
      });
      subActions.push({
        name: '☐ すべて固定', action: () => {
          selectedGameTableMasks().forEach(gameTableMask => gameTableMask.isLock = false);
          SoundEffect.play(PresetSound.unlock);
        }
      });
      subActions.push({
        name: 'すべてのコピーを作る', action: () => {
          selectedGameTableMasks().forEach(gameTableMask => {
            let cloneObject = gameTableMask.clone();
            cloneObject.location.x += this.gridSize;
            cloneObject.location.y += this.gridSize;
            cloneObject.isLock = false;
            if (gameTableMask.parent) gameTableMask.parent.appendChild(cloneObject);
          });
          SoundEffect.play(PresetSound.cardPut);
        }
      });
      if(this.isGM) {
        subActions.push(ContextMenuSeparator);
        subActions.push({
          name: 'すべてインベントリにしまう', action: () => {
            selectedGameTableMasks().forEach(gameTableMask => gameTableMask.toInventory(gameTableMask));
            SoundEffect.play(PresetSound.sweep);
          }
        });
      }
      subActions.push(ContextMenuSeparator);
      subActions.push({
        name: 'すべて削除する', action: () => {
          selectedGameTableMasks().forEach(gameTableMask => gameTableMask.destroy());
          SoundEffect.play(PresetSound.sweep);
        }
      });
      // this.isGMがtrueの時だけ表示する
      // すべてインベントリにしまう


      actions.push(
        {
          name: '選択したマップマスク', action: null, subActions: subActions
        }
      );
    }

    actions.push(ContextMenuSeparator);
    return actions;
  }

  private makeContextMenu(): ContextMenuAction[] {
    let objectPosition = this.coordinateService.calcTabletopLocalCoordinate();
    let actions: ContextMenuAction[] = [];

    actions.push({ name: 'マップマスクを編集', action: () => { this.showDetail(this.gameTableMask); } });
    actions.push(ContextMenuSeparator);
    actions.push({
      name: this.isLock
      ? '☑ 固定'
      : '☐ 固定',
      action: () => {
        this.isLock = !this.isLock;
        if (!this.isLock) SoundEffect.play(PresetSound.unlock);
        else SoundEffect.play(PresetSound.lock);
      }
    });
    actions.push({
      name: this.isLockIcon
      ? '☑ 固定マークを表示'
      : '☐ 固定マークを表示',
      action: () => {
        this.isLockIcon = !this.isLockIcon;
      }
    });
    actions.push({
      name: this.maskborder
      ? '☑ ボーダーを表示'
      : '☐ ボーダーを表示',
      action: () => {
        this.maskborder = !this.maskborder;
      }
    });
    actions.push(ContextMenuSeparator);
    actions.push({
      name: 'コピーを作る', action: () => {
        let cloneObject = this.gameTableMask.clone();
        cloneObject.location.x += this.gridSize;
        cloneObject.location.y += this.gridSize;
        cloneObject.isLock = false;
        if (this.gameTableMask.parent) this.gameTableMask.parent.appendChild(cloneObject);
        SoundEffect.play(PresetSound.cardPut);
      }
    });
    actions.push({
      name: 'インベントリにしまう', action: () => {
        this.gameTableMask.toInventory(this.gameTableMask);
        SoundEffect.play(PresetSound.sweep);
      },
      disabled: !this.isGM
    });
    actions.push(ContextMenuSeparator);
    actions.push({
      name: '削除する', action: () => {
        this.gameTableMask.destroy();
        SoundEffect.play(PresetSound.sweep);
      }
    });
    actions.push(ContextMenuSeparator);
    actions.push({ name: 'オブジェクト作成', action: null, subActions: this.tabletopActionService.makeDefaultContextMenuActions(objectPosition) });
    return actions;
  }

  private showDetail(gameObject: GameTableMask) {
    let coordinate = this.pointerDeviceService.pointers[0];
    let title = 'マップマスク設定';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    let option: PanelOption = { title: title, left: coordinate.x - 200, top: coordinate.y - 150, width: 600, height: 380 };
    let component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }
}
