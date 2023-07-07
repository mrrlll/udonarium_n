import { AfterViewInit, Component, NgZone, OnDestroy, OnInit, Input } from '@angular/core';
import { GenerateService } from 'service/generate.service';


@Component({
  selector: 'app-game-character-generate-window',
  templateUrl: './game-character-generate-window.component.html',
  styleUrls: ['./game-character-generate-window.component.css']
})
export class GameCharacterGenerateWindowComponent {

  constructor(
    private generateService: GenerateService,
  ){}

  charactersheeturl: string = '';
  urlerror: boolean = false;
  supporterror: boolean = false;
  keyerror: boolean = false;

  charadata: any = null;

  supportSystem: string[] = ["tiw"];

  get(){
    // エラーフラグをリセット
    this.urlerror = false;
    this.supporterror = false;
    this.keyerror = false;

    var URL = this.charactersheeturl;
    const regexp = /^(https?):\/\/[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(\/[^\s]*)?$/;

    const data = URL.split("/");
    const site: string = data[2];
    const system: string = data[3];

    // URL形式かチェック
    if (!regexp.test(URL)) {
      this.urlerror = true;
      return;
    }
    // 生成に対応しているシステムかチェック
    if (this.supportSystem.some(item => item !== system)){
      this.supporterror = true;
      return;
    };

    this.generateService.get(URL).subscribe( (entry) => {
      this.charadata = entry;
      this.generate(this.charadata, system, site);
    }, (error) => {
      console.log(error);
      this.keyerror = true;
    });
  }

  generate(charadata, system, site){
    switch (site){
      case "character-sheets.appspot.com":
        this.csappspotgenerate(charadata, system);
        break;
    }
  }

  csappspotgenerate(charadata, system){
    switch (system){
      case "tiw":
        this.appspot_kemono(charadata);
        break;
    }
  }
  appspot_kemono(charadata){
    const name = charadata['base']['handlename'];
    const size = 2
    const margin = charadata['status']['margin']['limit'];
    const yosan = charadata['status']['budget']['limit'];
    const talent = charadata['base']['talent'];


    const kemonocs = `
    <?xml version="1.0" encoding="UTF-8"?>
    <character location.name="table" location.x="100" location.y="1075" posZ="0" rotate="0" roll="0">
    <data name="character">
    <data name="image">
    <data type="image" name="imageIdentifier">testCharacter_4_image</data>
    </data>
    <data name="common">
    <data name="name">${name}</data>
    <data name="size">${size}</data>
    </data>
    <data name="detail">
    <data name="リソース">
    <data type="" currentValue="${margin}" name="余裕">${margin}</data>
    <data type="" currentValue="${yosan}" name="予算">${yosan}</data>
    </character>
    `

    }




}
