import { SyncObject, SyncVar } from './core/synchronize-object/decorator';
import { DataElement } from './data-element';
import { TabletopObject } from './tabletop-object';

@SyncObject('table-mask')
export class GameTableMask extends TabletopObject {
  @SyncVar() isLock: boolean = false;
  @SyncVar() maskborder: boolean = true;
  @SyncVar() isHide: boolean = false;
  @SyncVar() isOverviewOnlyGMShow: boolean = false;
  @SyncVar() isLockIcon: boolean = true;

  get name(): string { return this.getCommonValue('name', ''); }
  set name(name: string) { this.setCommonValue('name', name); }
  get width(): number { return this.getCommonValue('width', 1); }
  get height(): number { return this.getCommonValue('height', 1); }
  get opacity(): number {
    let element = this.getElement('opacity', this.commonDataElement);
    let num = element ? <number>element.currentValue / <number>element.value : 1;
    return Number.isNaN(num) ? 1 : num;
  }
  get text(): string { return this.getCommonValue('text', ''); }
  set text(text: string) { this.setCommonValue('text', text); }

  toInventory(gameTableMask: GameTableMask){
    gameTableMask.isHide = !gameTableMask.isHide;
  }

  toggleLock() {
    this.isLock = !this.isLock;
  }

  complement(): void {
    let element = this.getElement('fontsize', this.commonDataElement);
    element = this.getElement('text', this.commonDataElement);
    if (!element && this.commonDataElement) {
      this.commonDataElement.appendChild(DataElement.create('text', '', { type: 'note', currentValue: '' }, 'text_' + this.identifier));
    }
  }

  static create(name: string, width: number, height: number, opacity: number, identifier?: string, text?: string): GameTableMask {
    let object: GameTableMask = null;

    if (identifier) {
      object = new GameTableMask(identifier);
    } else {
      object = new GameTableMask();
    }
    object.createDataElements();

    object.commonDataElement.appendChild(DataElement.create('name', name, {}, 'name_' + object.identifier));
    object.commonDataElement.appendChild(DataElement.create('width', width, {}, 'width_' + object.identifier));
    object.commonDataElement.appendChild(DataElement.create('height', height, {}, 'height_' + object.identifier));
    object.commonDataElement.appendChild(DataElement.create('opacity', opacity, { type: 'numberResource', currentValue: opacity }, 'opacity_' + object.identifier));
    object.commonDataElement.appendChild(DataElement.create('text', "", { type: 'note', currentValue: text }, 'text_' + object.identifier));
    object.initialize();

    return object;
  }
}
