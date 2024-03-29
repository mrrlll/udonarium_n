import { ImageFile } from './core/file-storage/image-file';
import { SyncObject, SyncVar } from './core/synchronize-object/decorator';
import { Network } from './core/system';
import { DataElement } from './data-element';
import { PeerCursor } from './peer-cursor';
import { TabletopObject } from './tabletop-object';
import { moveToBackmost, moveToTopmost } from './tabletop-object-util';

export enum CardState {
  FRONT,
  BACK,
}

@SyncObject('card')
export class Card extends TabletopObject {
  @SyncVar() state: CardState = CardState.FRONT;
  @SyncVar() rotate: number = 0;
  @SyncVar() owners: Array<string> = [];
  @SyncVar() zindex: number = 0;
  @SyncVar() isLocked: boolean = false;
  @SyncVar() isHide: boolean = false;
  @SyncVar() isRotate: boolean = true;

  get isVisibleOnTable(): boolean { return this.location.name === 'table' && (!this.parentIsAssigned || this.parentIsDestroyed); }

  get name(): string { return this.getCommonValue('name', ''); }
  set name(name: string) { this.setCommonValue('name', name); }
  get size(): number { return this.getCommonValue('size', 2); }
  set size(size: number) { this.setCommonValue('size', size); }
  get frontImage(): ImageFile { return this.getImageFile('front'); }
  get backImage(): ImageFile { return this.getImageFile('back'); }

  get imageFile(): ImageFile { return this.isVisible ? this.frontImage : this.backImage; }

  get ownerName(): string {
    return this.owners.map(owner => PeerCursor.findByUserId(owner))
      .filter(peerCursor => peerCursor)
      .map(peerCursor => peerCursor.name)
      .join(', ');
  }

  get hasOwner(): boolean { return 0 < this.owners.length; }
  get isHand(): boolean { return this.owners.includes(Network.peer.userId); }
  get isFront(): boolean { return this.state === CardState.FRONT; }
  get isVisible(): boolean { return this.isHand || this.isFront; }

  complement(): void {
    let element = this.getElement('fontsize', this.commonDataElement);
    if (!element && this.commonDataElement) {
      this.commonDataElement.appendChild(DataElement.create('fontsize', 18, { }, 'fontsize_' + this.identifier));
    }
    element = this.getElement('text', this.commonDataElement);
    if (!element && this.commonDataElement) {
      this.commonDataElement.appendChild(DataElement.create('text', '', { type: 'note', currentValue: '' }, 'text_' + this.identifier));
    }
    element = this.getElement('color', this.commonDataElement);
    if (!element && this.commonDataElement) {
      this.commonDataElement.appendChild(DataElement.create('color', "#555555", { type: 'color' }, 'color_' + this.identifier));
    }
  }

  faceUp() {
    this.state = CardState.FRONT;
    this.owners = [];
  }

  faceDown() {
    this.state = CardState.BACK;
    this.owners = [];
  }

  toggleHide() {
    this.isHide = !this.isHide;
  }

  toggleRotate() {
    this.isRotate = !this.isRotate;
  }

  toTopmost() {
    moveToTopmost(this, ['card-stack']);
  }

  toBackmost() {
    moveToBackmost(this, ['card-stack']);
  }

  static create(name: string, fornt: string, back: string, size: number = 2, identifier?: string): Card {
    let object: Card = null;

    if (identifier) {
      object = new Card(identifier);
    } else {
      object = new Card();
    }
    object.createDataElements();

    object.commonDataElement.appendChild(DataElement.create('name', name, {}, 'name_' + object.identifier));
    object.commonDataElement.appendChild(DataElement.create('size', size, {}, 'size_' + object.identifier));
    object.imageDataElement.appendChild(DataElement.create('front', fornt, { type: 'image' }, 'front_' + object.identifier));
    object.imageDataElement.appendChild(DataElement.create('back', back, { type: 'image' }, 'back_' + object.identifier));
    object.initialize();

    return object;
  }
}
