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
  OnDestroy,
  OnInit,
} from '@angular/core';
import { animate, keyframes, state, style, transition, trigger } from '@angular/animations';
import { Card, CardState } from '@udonarium/card';
import { CardStack } from '@udonarium/card-stack';
import { ImageFile } from '@udonarium/core/file-storage/image-file';
import { ObjectNode } from '@udonarium/core/synchronize-object/object-node';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem, Network } from '@udonarium/core/system';
import { PeerCursor } from '@udonarium/peer-cursor';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
import { ObjectInteractGesture } from 'component/game-table/object-interact-gesture';
import { MovableOption } from 'directive/movable.directive';
import { RotableOption } from 'directive/rotable.directive';
import { Observable, Subscription } from 'rxjs';
import { AppConfigCustomService } from 'service/app-config-custom.service';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from 'service/context-menu.service';
import { ImageService } from 'service/image.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { SelectionState, TabletopSelectionService } from 'service/tabletop-selection.service';
import { TabletopService } from 'service/tabletop.service';

@Component({
  selector: 'card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('inverse', [
      state('inverse', style({ transform: '' })),
      transition(':increment, :decrement', [
        animate('200ms ease', keyframes([
          style({ transform: 'scale3d(1.0, 1.0, 1.0)', offset: 0 }),
          style({ transform: 'scale3d(0.6, 1.2, 1.2)', offset: 0.5 }),
          style({ transform: 'scale3d(0, 0.75, 0.75)', offset: 0.75 }),
          style({ transform: 'scale3d(0.5, 1.125, 1.125)', offset: 0.875 }),
          style({ transform: 'scale3d(1.0, 1.0, 1.0)', offset: 1.0 })
        ]))
      ])
    ]),
    trigger('flipOpen', [
      transition(':enter', [
        animate('200ms ease', keyframes([
          style({ transform: 'scale3d(0, 1.0, 1.0)', offset: 0 }),
          style({ transform: 'scale3d(0, 1.2, 1.2)', offset: 0.5 }),
          style({ transform: 'scale3d(0, 0.75, 0.75)', offset: 0.75 }),
          style({ transform: 'scale3d(0.5, 1.125, 1.125)', offset: 0.875 }),
          style({ transform: 'scale3d(1.0, 1.0, 1.0)', offset: 1.0 })
        ]))
      ])
    ]),
    trigger('slidInOut', [
      transition('void => *', [
        animate('200ms ease', keyframes([
          style({ 'transform-origin': 'left center', transform: 'scale3d(0, 1.0, 1.0)', offset: 0 }),
          style({ 'transform-origin': 'left center', transform: 'scale3d(1.0, 1.0, 1.0)', offset: 1.0 })
        ]))
      ]),
      transition('* => void', [
        animate(100, style({ 'transform-origin': 'left center', transform: 'scale3d(0, 1.0, 1.0)' }))
      ])
    ])
  ]
})
export class CardComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @Input() card: Card = null;
  @Input() is3D: boolean = false;

  // GMフラグ
  obs: Observable<boolean>;
  subs: Subscription;
  isGM: boolean;

  get name(): string { return this.card.name; }
  get state(): CardState { return this.card.state; }
  set state(state: CardState) { this.card.state = state; }
  get rotate(): number { return this.card.rotate; }
  set rotate(rotate: number) { this.card.rotate = rotate; }
  get owners(): Array<string> { return this.card.owners; }
  set owners(owners: Array<string>) { this.card.owners = owners; }
  get zindex(): number { return this.card.zindex; }
  get size(): number { return this.adjustMinBounds(this.card.size); }

  get isHand(): boolean { return this.card.isHand; }
  get isFront(): boolean { return this.card.isFront; }
  get isVisible(): boolean { return this.card.isVisible; }
  get hasOwner(): boolean { return this.card.hasOwner; }
  get ownerName(): string { return this.card.ownerName; }

  get isRotate(): boolean { return this.card.isRotate; }
  set isRotate(isRotate: boolean) { this.card.isRotate = isRotate; }

  get isHide(): boolean { return this.card.isHide; }
  set isHide(isHide: boolean) { this.card.isHide = isHide; }

  get imageFile(): ImageFile { return this.imageService.getSkeletonOr(this.card.imageFile); }
  get frontImage(): ImageFile { return this.imageService.getSkeletonOr(this.card.frontImage); }
  get backImage(): ImageFile { return this.imageService.getSkeletonOr(this.card.backImage); }

  get selectionState(): SelectionState { return this.selectionService.state(this.card); }
  get isSelected(): boolean { return this.selectionState !== SelectionState.NONE; }
  get isMagnetic(): boolean { return this.selectionState === SelectionState.MAGNETIC; }

  private iconHiddenTimer: NodeJS.Timer = null;
  get isIconHidden(): boolean { return this.iconHiddenTimer != null };

  get isLocked(): boolean { return this.card ? this.card.isLocked : false; }
  set isLocked(isLocked: boolean) { if (this.card) this.card.isLocked = isLocked; }

  gridSize: number = 50;

  movableOption: MovableOption = {};
  rotableOption: RotableOption = {};

  private interactGesture: ObjectInteractGesture = null;

  constructor(
    private ngZone: NgZone,
    private contextMenuService: ContextMenuService,
    private panelService: PanelService,
    private elementRef: ElementRef<HTMLElement>,
    private changeDetector: ChangeDetectorRef,
    private tabletopService: TabletopService,
    private imageService: ImageService,
    private selectionService: TabletopSelectionService,
    private pointerDeviceService: PointerDeviceService,
    private appCustomService: AppConfigCustomService
  ) { }

  ngOnInit() {
    //GMフラグ管理
    this.obs = this.appCustomService.isViewer$;
    this.subs = this.obs.subscribe((flg) => {
      this.isGM = flg;
      // 同期をする
      this.changeDetector.markForCheck();
    });
    this.isGM = this.appCustomService.dataViewer;
  }

  ngOnChanges(): void {
    EventSystem.unregister(this);
    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', -1000, event => {
        let object = ObjectStore.instance.get(event.data.identifier);
        if (!this.card || !object) return;
        if ((this.card === object) || (object instanceof ObjectNode && this.card.contains(object)) || (object instanceof PeerCursor && this.card.owners.includes(object.userId))) {
          this.changeDetector.markForCheck();
        }
      })
      .on(`UPDATE_GAME_OBJECT/aliasName/${PeerCursor.aliasName}`, event => {
        let object = ObjectStore.instance.get(event.data.identifier);
        if (!this.card || !object) return;
        if ((this.card === object) || (object instanceof ObjectNode && this.card.contains(object)) || (object instanceof PeerCursor && this.card.owners.includes(object.userId))) {
          this.changeDetector.markForCheck();
        }
      })
      .on('SYNCHRONIZE_FILE_LIST', event => {
        this.changeDetector.markForCheck();
      })
      .on('UPDATE_FILE_RESOURE', -1000, event => {
        this.changeDetector.markForCheck();
      })
      .on(`UPDATE_SELECTION/identifier/${this.card?.identifier}`, event => {
        this.changeDetector.markForCheck();
      })
      .on('DISCONNECT_PEER', event => {
        let cursor = PeerCursor.findByPeerId(event.data.peerId);
        if (!cursor || this.card.owners.includes(cursor.userId)) this.changeDetector.markForCheck();
      });
    this.movableOption = {
      tabletopObject: this.card,
      transformCssOffset: 'translateZ(0.15px)',
      colideLayers: ['terrain']
    };
    this.rotableOption = {
      tabletopObject: this.card
    };
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.interactGesture = new ObjectInteractGesture(this.elementRef.nativeElement);
    });

    this.interactGesture.onstart = this.onInputStart.bind(this);
    this.interactGesture.oninteract = this.onDoubleClick.bind(this);
  }

  ngOnDestroy() {
    if (this.subs) {
      this.subs.unsubscribe();
    }
    this.interactGesture.destroy();
    EventSystem.unregister(this);
  }

  @HostListener('carddrop', ['$event'])
  onCardDrop(e) {
    if (this.card === e.detail || (e.detail instanceof Card === false && e.detail instanceof CardStack === false)) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();

    if (e.detail instanceof CardStack) {
      if (this.isLocked) return;
      let cardStack: CardStack = e.detail;
      let distance: number = (cardStack.location.x - this.card.location.x) ** 2 + (cardStack.location.y - this.card.location.y) ** 2 + (cardStack.posZ - this.card.posZ) ** 2;
      if (distance < 25 ** 2) {
        cardStack.location.x = this.card.location.x;
        cardStack.location.y = this.card.location.y;
        cardStack.posZ = this.card.posZ;
        cardStack.putOnBottom(this.card);
        this.isLocked = false;
      }
    }
  }

  onDoubleClick() {
    if (!this.isHand) return;
    this.ngZone.run(() => {
      this.state = this.isVisible && !this.isHand ? CardState.BACK : CardState.FRONT;
      this.owners = [];
      if (!this.isHide) SoundEffect.play(PresetSound.cardDraw);
    });
  }

  @HostListener('dragstart', ['$event'])
  onDragstart(e) {
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(e: MouseEvent | TouchEvent) {
    this.ngZone.run(() => {
      this.card.toTopmost();
      this.startIconHiddenTimer();
    });

    // TODO:もっと良い方法考える
    if (this.isLocked) {
      EventSystem.trigger('DRAG_LOCKED_OBJECT', {});
    }
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

    this.contextMenuService.open(position, menuActions, this.isVisible ? this.name : 'カード');
  }

  onMove() {
    this.contextMenuService.close();
    if (!this.isHide) SoundEffect.play(PresetSound.cardPick);
  }

  onMoved() {
    if (!this.isHide) SoundEffect.play(PresetSound.cardPut);
    this.ngZone.run(() => this.dispatchCardDropEvent());
  }

  private createStack() {
    let cards: Card[] = this.tabletopService.cards.filter(card => {
      let distance: number = (card.location.x - this.card.location.x) ** 2 + (card.location.y - this.card.location.y) ** 2 + (card.posZ - this.card.posZ) ** 2;
      return distance < 100 ** 2 && !card.isLocked;
    });

    if (cards.length == 0) return;
    let cardStack = CardStack.create('山札');
    cardStack.location.x = this.card.location.x;
    cardStack.location.y = this.card.location.y;
    cardStack.posZ = this.card.posZ;
    cardStack.location.name = this.card.location.name;
    cardStack.rotate = this.rotate;
    cardStack.zindex = this.card.zindex;

    cards.sort((a, b) => {
      if (a.zindex < b.zindex) return 1;
      if (a.zindex > b.zindex) return -1;
      return 0;
    });

    for (let card of cards) {
      cardStack.putOnBottom(card);
    }
  }

  private dispatchCardDropEvent() {
    let element: HTMLElement = this.elementRef.nativeElement;
    let parent = element.parentElement;
    let children = parent.children;
    let event = new CustomEvent('carddrop', { detail: this.card, bubbles: true });
    for (let i = 0; i < children.length; i++) {
      children[i].dispatchEvent(event);
    }
  }

  private makeSelectionContextMenu(): ContextMenuAction[] {
    if (this.selectionService.objects.length < 1) return [];

    let actions: ContextMenuAction[] = [];

    let objectPosition = {
      x: this.card.location.x + (this.card.size * this.gridSize) / 2,
      y: this.card.location.y + (this.card.size * this.gridSize) / 2,
      z: this.card.posZ
    };
    actions.push({ name: 'ここに集める', action: () => this.selectionService.congregate(objectPosition) });

    if (this.isSelected) {
      let selectedCards = () => this.selectionService.objects.filter(object => object.aliasName === this.card.aliasName) as Card[];
      let subActions: ContextMenuAction[] = [];
      subActions.push({
        name: 'すべて表にする', action: () => {
          selectedCards().forEach(card => card.faceUp());
          SoundEffect.play(PresetSound.cardDraw);
        }
      });
      subActions.push({
        name: 'すべて裏にする', action: () => {
          selectedCards().forEach(card => card.faceDown());
          SoundEffect.play(PresetSound.cardDraw);
        }
      });
      subActions.push({
        name: 'すべて自分だけで見る', action: () => {
          selectedCards().forEach(card => {
            card.faceDown();
            card.owners = [Network.peer.userId];
          });
          SoundEffect.play(PresetSound.cardDraw);
        }
      });
      subActions.push({
        name: 'すべて自分も見る', action: () => {
          selectedCards().forEach(card => {
            let newOwners = card.owners.concat(Network.peer.userId);
            card.faceDown();
            card.owners = newOwners;
          });
          SoundEffect.play(PresetSound.cardDraw);
        }
      });
      subActions.push({
        name: 'すべて見るのをやめる', action: () => {
          selectedCards().forEach(card => card.owners = []);
          SoundEffect.play(PresetSound.cardDraw);
        }
      });
      subActions.push(ContextMenuSeparator);
      subActions.push({
        name: this.isRotate ? '回転をオフ' : '回転をオン', action: () => {
          selectedCards().forEach(card => card.toggleRotate());
        }
      });
      // すべてカードを表示/非表示
      if(this.isGM){
        subActions.push({
          name: this.isHide ? 'すべて表示する' : 'すべて非表示にする', action: () => {
            selectedCards().forEach(card => card.toggleHide());
          }
        });
      }
      subActions.push(ContextMenuSeparator);
      subActions.push({
        name: 'すべて削除する', action: () => {
          selectedCards().forEach(card => card.destroy());
          SoundEffect.play(PresetSound.sweep);
        }
      });
      actions.push({
        name: '選択したカード', action: null, subActions: subActions
      });
    }

    actions.push(ContextMenuSeparator);
    return actions;
  }

  private makeContextMenu(): ContextMenuAction[] {
    let actions: ContextMenuAction[] = [];

    actions.push(!this.isVisible || this.isHand
      ? {
        name: '表にする', action: () => {
          this.card.faceUp();
          SoundEffect.play(PresetSound.cardDraw);
        }
      }
      : {
        name: '裏にする', action: () => {
          this.card.faceDown();
          SoundEffect.play(PresetSound.cardDraw);
        }
      });
    actions.push(this.isHand
      ? {
        name: '見るのをやめる', action: () => {
          this.owners = this.owners.filter(owner => owner !== Network.peer.userId);
          SoundEffect.play(PresetSound.cardDraw);
        }
      }
      : {
        name: '自分だけで見る', action: () => {
          if (!this.isHide) SoundEffect.play(PresetSound.cardDraw);
          this.card.faceDown();
          this.owners = [Network.peer.userId];
        }
      });
    actions.push(!this.isHand && this.hasOwner
      ? {
        name: '自分も見る', action: () => {
          if (!this.isHide) SoundEffect.play(PresetSound.cardDraw);
          let newOwners = this.owners.concat(Network.peer.userId);
          this.card.faceDown();
          this.owners = newOwners;
        }
      }
      : { name: null, enabled: false }
    );
    actions.push(ContextMenuSeparator);
    actions.push({
      name: '重なったカードで山札を作る', action: () => {
        this.createStack();
        SoundEffect.play(PresetSound.cardPut);
      }
    });
    actions.push(ContextMenuSeparator);
    actions.push({ name: 'カードを編集', action: () => { this.showDetail(this.card); } });
    actions.push({
      name: 'コピーを作る', action: () => {
        let cloneObject = this.card.clone();
        cloneObject.location.x += this.gridSize;
        cloneObject.location.y += this.gridSize;
        cloneObject.toTopmost();
        SoundEffect.play(PresetSound.cardPut);
      }
    });
    actions.push({
      name: '削除する', action: () => {
        this.card.destroy();
        SoundEffect.play(PresetSound.sweep);
      }
    });
    actions.push(ContextMenuSeparator);
    actions.push({
      name: this.isRotate ? '回転をオフ' : '回転をオン', action: () => {
        this.card.toggleRotate();
      }
    });
    actions.push({
      name: this.isGM && this.isHide ? '表示する' : '非表示にする', action: () => {
        this.card.toggleHide();
      }
    });
    return actions;
  }

  private startIconHiddenTimer() {
    clearTimeout(this.iconHiddenTimer);
    this.iconHiddenTimer = setTimeout(() => {
      this.iconHiddenTimer = null;
      this.changeDetector.markForCheck();
    }, 300);
    this.changeDetector.markForCheck();
  }

  private adjustMinBounds(value: number, min: number = 0): number {
    return value < min ? min : value;
  }

  vertical() {
    if (!this.card.isVisible || this.card.rotate == 0) return;
    this.card.rotate = 0;
    if (!this.isHide) SoundEffect.play(PresetSound.cardPut);
  }

  horizontal() {
    if (!this.card.isVisible || this.card.rotate == 90) return;
    this.card.rotate = 90;
    if (!this.isHide) SoundEffect.play(PresetSound.cardPut);
  }

  turnRight() {
    this.card.rotate += 45;
    if (!this.isHide) SoundEffect.play(PresetSound.cardPut);
  }

  turnLeft() {
    this.card.rotate -= 45;
    if (!this.isHide) SoundEffect.play(PresetSound.cardPut);
  }

  private showDetail(gameObject: Card) {
    EventSystem.trigger('SELECT_TABLETOP_OBJECT', { identifier: gameObject.identifier, className: gameObject.aliasName });
    let coordinate = this.pointerDeviceService.pointers[0];
    let title = 'カード設定';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    let option: PanelOption = { title: title, left: coordinate.x - 300, top: coordinate.y - 300, width: 600, height: 600 };
    let component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }
}
