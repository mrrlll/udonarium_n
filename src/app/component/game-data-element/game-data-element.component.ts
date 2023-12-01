import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { ImageFile } from '@udonarium/core/file-storage/image-file';
import { ImageStorage } from '@udonarium/core/file-storage/image-storage';
import { FileSelecterComponent } from 'component/file-selecter/file-selecter.component';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { EventSystem } from '@udonarium/core/system';
import { DataElement } from '@udonarium/data-element';
import { RangeArea } from '@udonarium/range';

@Component({
  selector: 'game-data-element, [game-data-element]',
  templateUrl: './game-data-element.component.html',
  styleUrls: ['./game-data-element.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameDataElementComponent implements OnInit, OnChanges, OnDestroy {
  @Input() gameDataElement: DataElement = null;
  @Input() isEdit: boolean = false;
  @Input() isTagLocked: boolean = false;
  @Input() isValueLocked: boolean = false;

  @Input() isImage: boolean = false;
  @Input() indexNum: number = 0;

  @Input() descriptionType: string;

  private _name: string = '';
  get name(): string { return this._name; }
  set name(name: string) { this._name = name; this.setUpdateTimer(); }

  private _value: number | string = 0;
  get value(): number | string { return this._value; }
  set value(value: number | string) { this._value = value; this.setUpdateTimer(); }

  private _check: number | string = 0;
  get check(): number | string { return this._check; }
  set check(check: number | string) { this._check = check; this.setUpdateTimer(); }

  private _currentValue: number | string = 0;
  get currentValue(): number | string { return this._currentValue; }
  set currentValue(currentValue: number | string) { this._currentValue = currentValue; this.setUpdateTimer(); }

  private updateTimer: NodeJS.Timer = null;

  constructor(
    private changeDetector: ChangeDetectorRef,
    private panelService: PanelService,
    private modalService: ModalService,
  ) { }

  ngOnInit() {
    if (this.gameDataElement) this.setValues(this.gameDataElement);
  }

  ngOnChanges(): void {
    EventSystem.unregister(this);
    EventSystem.register(this)
      .on(`UPDATE_GAME_OBJECT/identifier/${this.gameDataElement?.identifier}`, event => {
        this.setValues(this.gameDataElement);
        this.changeDetector.markForCheck();
      })
      .on('DELETE_GAME_OBJECT', -1000, event => {
        if (this.gameDataElement && this.gameDataElement.identifier === event.data.identifier) {
          this.changeDetector.markForCheck();
        }
      });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  addElement() {
    this.gameDataElement.appendChild(DataElement.create('タグ', '', {}));
  }

  deleteElement() {
    this.gameDataElement.destroy();
  }

  upElement() {
    let parentElement = this.gameDataElement.parent;
    let index: number = parentElement.children.indexOf(this.gameDataElement);
    if (0 < index) {
      let prevElement = parentElement.children[index - 1];
      parentElement.insertBefore(this.gameDataElement, prevElement);
    }
  }

  downElement() {
    let parentElement = this.gameDataElement.parent;
    let index: number = parentElement.children.indexOf(this.gameDataElement);
    if (index < parentElement.children.length - 1) {
      let nextElement = parentElement.children[index + 1];
      parentElement.insertBefore(nextElement, this.gameDataElement);
    }
  }

  setElementType(type: string) {
    this.gameDataElement.setAttribute('type', type);
  }

  private setValues(object: DataElement) {
    this._name = object.name;
    this._currentValue = object.currentValue;
    this._value = object.value;
    this._check = object.check;
  }

  private setUpdateTimer() {
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => {
      if (this.gameDataElement.name !== this.name) this.gameDataElement.name = this.name;
      if (this.gameDataElement.currentValue !== this.currentValue) this.gameDataElement.currentValue = this.currentValue;
      if (this.gameDataElement.value !== this.value) this.gameDataElement.value = this.value;
      if (this.gameDataElement.check !== this.check) this.gameDataElement.check = this.check;
      this.updateTimer = null;
    }, 66);
  }

  get imageFileUrl(): string {
    let image:ImageFile = ImageStorage.instance.get(<string>this.gameDataElement.value);
    if (image) return image.url;
    return '';
  }

  openModal(name: string = '', isAllowedEmpty: boolean = false) {
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: isAllowedEmpty }).then(value => {
      if (!value) return;
      let element = this.gameDataElement;
      if (!element) return;
      element.value = value;
    });
  }

  updateKomaIconMaxValue(root: DataElement){
    let image = root.getFirstElementByName('image');
    let icon = root.getElementsByName('ICON');
    if(icon){
      icon[0].value = image.children.length - 1;
      if(typeof icon[0].currentValue === "number"){
        if(icon[0].currentValue > icon[0].value ) icon[0].currentValue = icon[0].value;
      };
    };
  };

  addImageElement() {
    this.gameDataElement.appendChild(DataElement.create('imageIdentifier', '', { type: 'image' }));
    const root: DataElement = <DataElement>this.gameDataElement.parent;
    this.updateKomaIconMaxValue(root);
  };
  deleteImageElement() {
    if( this.gameDataElement.parent.children[0] != this.gameDataElement)    this.gameDataElement.destroy();
  };

  get isCommonValue(): boolean {
    if (this.gameDataElement) {
      return this.isTagLocked && (this.gameDataElement.name === 'size'
        || this.gameDataElement.name === 'width'
        || this.gameDataElement.name === 'height'
        || this.gameDataElement.name === 'depth'
        || this.gameDataElement.name === 'length'
        || this.gameDataElement.name === 'fontsize'
        || this.gameDataElement.name === 'altitude'
        || this.gameDataElement.name === 'color');
    }
    return false;
  }

  get isNotApplicable(): boolean {
    return this.isCommonValue && this.descriptionType === 'range-not-width' && this.gameDataElement.name === 'width';
  }
};
