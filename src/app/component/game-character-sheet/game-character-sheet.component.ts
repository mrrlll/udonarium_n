import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';

import { EventSystem, Network } from '@udonarium/core/system';
import { DataElement } from '@udonarium/data-element';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { TabletopObject } from '@udonarium/tabletop-object';

import { FileSelecterComponent } from 'component/file-selecter/file-selecter.component';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { SaveDataService } from 'service/save-data.service';

import { GameCharacter } from '@udonarium/game-character';
import { CardStack } from '@udonarium/card-stack';
import { Card } from '@udonarium/card';
import { DiceSymbol } from '@udonarium/dice-symbol';
import { RangeArea } from '@udonarium/range';

@Component({
  selector: 'game-character-sheet',
  templateUrl: './game-character-sheet.component.html',
  styleUrls: ['./game-character-sheet.component.css'],
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
    ]),
  ]
})
export class GameCharacterSheetComponent implements OnInit, OnDestroy {

  @Input() tabletopObject: TabletopObject = null;
  isEdit: boolean = false;

  networkService = Network;

  isSaveing: boolean = false;
  progresPercent: number = 0;

  constructor(
    private saveDataService: SaveDataService,
    private panelService: PanelService,
    private modalService: ModalService
  ) { }

  ngOnInit() {
    EventSystem.register(this)
      .on('DELETE_GAME_OBJECT', -1000, event => {
        if (this.tabletopObject && this.tabletopObject.identifier === event.data.identifier) {
          this.panelService.close();
        }
      });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  toggleEditMode() {
    this.isEdit = this.isEdit ? false : true;
  }

  addDataElement() {
    if (this.tabletopObject.detailDataElement) {
      let title = DataElement.create('見出し', '', {});
      let tag = DataElement.create('タグ', '', {});
      title.appendChild(tag);
      this.tabletopObject.detailDataElement.appendChild(title);
    }
  }

  clone() {
    let cloneObject = this.tabletopObject.clone();
    cloneObject.location.x += 50;
    cloneObject.location.y += 50;
    if (this.tabletopObject.parent) this.tabletopObject.parent.appendChild(cloneObject);
    cloneObject.update();
    switch (this.tabletopObject.aliasName) {
      case 'terrain':
        SoundEffect.play(PresetSound.blockPut);
        (cloneObject as any).isLocked = false;
        break;
      case 'card':
      case 'card-stack':
        (cloneObject as any).owner = '';
        (cloneObject as any).toTopmost();
      case 'table-mask':
        (cloneObject as any).isLock = false;
        SoundEffect.play(PresetSound.cardPut);
        break;
      case 'text-note':
        (cloneObject as any).toTopmost();
        SoundEffect.play(PresetSound.cardPut);
        break;
      case 'dice-symbol':
        SoundEffect.play(PresetSound.dicePut);
      default:
        SoundEffect.play(PresetSound.piecePut);
        break;
    }
  }

  get descriptionType():string {
    if (this.tabletopObject instanceof RangeArea && !this.tabletopObject.isApplyWidth) return 'range-not-width';
    return this.tabletopObject.aliasName;
  }

  async saveToXML() {
    if (!this.tabletopObject || this.isSaveing) return;
    this.isSaveing = true;
    this.progresPercent = 0;

    let element = this.tabletopObject.commonDataElement.getFirstElementByName('name');
    let objectName: string = element ? <string>element.value : '';

    await this.saveDataService.saveGameObjectAsync(this.tabletopObject, 'xml_' + objectName, percent => {
      this.progresPercent = percent;
    });

    setTimeout(() => {
      this.isSaveing = false;
      this.progresPercent = 0;
    }, 500);
  }

  setLocation(locationName: string) {
    this.tabletopObject.setLocation(locationName);
  }

  openModal(name: string = '', isAllowedEmpty: boolean = false) {
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: isAllowedEmpty }).then(value => {
      if (!this.tabletopObject || !this.tabletopObject.imageDataElement || !value) return;
      let element = this.tabletopObject.imageDataElement.getFirstElementByName(name);
      if (!element) return;
      element.value = value;
    });
  }

  clickHide(){
  }

  chkKomaSize( height ){
    let character = <GameCharacter>this.tabletopObject;
    if( height < 50 )
      height = 50 ;
    if( height > 750 )
      height = 750 ;
    character.komaImageHeignt = height;
  }

  clickImageFlag(){
    let character = <GameCharacter>this.tabletopObject;
    character.specifyKomaImageFlag = !character.specifyKomaImageFlag;
  }

  openMainImageModal(tabletopObject: TabletopObject) {
    if (tabletopObject instanceof CardStack) {
      return;
    } else if (tabletopObject instanceof Card) {
      this.openModal(tabletopObject.isVisible ? 'front' : 'back');
    } else if (tabletopObject instanceof DiceSymbol) {
      this.openModal(tabletopObject['face']);
    } else  {
      this.openModal('imageIdentifier', true)
    }
  }

  resetPopSize(){
    let character = <GameCharacter>this.tabletopObject;
    character.overViewMaxHeight = 250;
    character.overViewWidth = 270;
  }

  chkPopWidth( width ){
    let character = <GameCharacter>this.tabletopObject;
    if( width < 270 )
      width = 270 ;
    if( width > 800 )
      width = 800 ;
    character.overViewWidth = width;
  }

  chkPopMaxHeight( maxHeight ){
    let character = <GameCharacter>this.tabletopObject;
    if( maxHeight < 250 )
      maxHeight = 250 ;
    if( maxHeight > 1000 )
      maxHeight = 1000 ;
    character.overViewMaxHeight = maxHeight;
  }
}
