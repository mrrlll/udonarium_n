import { AfterViewInit, Component, NgZone, OnDestroy, OnInit, Input } from '@angular/core';
import { GenerateService } from 'service/generate.service';
import { XmlUtil } from '@udonarium/core/system/util/xml-util';
import { FileReaderUtil } from '@udonarium/core/file-storage/file-reader-util';
import { EventSystem } from '@udonarium/core/system';

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
    const size = 3
    const margin = charadata['status']['margin']['limit'];
    const yosan = charadata['status']['budget']['limit'];
    let bouryoku = "";
    let joutaiijou = charadata['status']['bad']['value'];


    if (charadata['status']['bad']['value'] === null){
      joutaiijou = "";
    };
    
    for (let val of charadata['facepower']){
      bouryoku += `${val['name']} `;
    };


    const kemonocs = `
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
    <data name="特性①" type="">${charadata['base']['talent']['name1']}</data>
    <data name="特性②" type="">${charadata['base']['talent']['name2']}</data>
    <data name="獸憑き" type="">${charadata['beastpoint']['value']}</data>
    <data name="状態異常"></data>
    </data>
    <data name="情報">
    <data type="note" name="設定">本名:${charadata['base']['name']}
性別:${charadata['base']['sex']}　年齢:${charadata['base']['age']}
仮面:${charadata['base']['face']}
貌力:${bouryoku}
雰囲気:${charadata['base']['atmosphere']}
動機:${charadata['base']['motivation']}
    </data>
    <data name="貌力の強度" type="">${Object.keys(charadata['facepower']).length}</data>
    <data type="" name="武器">「」(威力:)(特殊効果:)</data>
    <data name="防具">「」(軽減値:)(特殊効果:)</data>
    <data name="小道具">「」(特殊効果:)</data>
    <data name="持ち物" type="note">1.
2.
3.
4.
5.
6.
7.
8.
</data>
    </data>
    <data name="能力">
    <data name="移動">${charadata['base']['ability']['move']}</data>
    <data name="格闘">${charadata['base']['ability']['fight']}</data>
    <data name="射撃">${charadata['base']['ability']['shooting']}</data>
    <data name="製作">${charadata['base']['ability']['create']}</data>
    <data name="察知">${charadata['base']['ability']['awareness']}</data>
    <data name="自制">${charadata['base']['ability']['restraint']}</data>
    </data>
    <data name="絆">
    <data name="${charadata['days'][0]['name']}" type="numberResource" currentValue="${charadata['days'][0]['current']}">${charadata['days'][0]['level']}</data>
    <data name="${charadata['days'][1]['name']}" type="numberResource" currentValue="${charadata['days'][1]['current']}">${charadata['days'][1]['level']}</data>
    <data name="${charadata['days'][2]['name']}" type="numberResource" currentValue="${charadata['days'][2]['current']}">${charadata['days'][2]['level']}</data>
    <data name="${charadata['friends'][0]['name']}" type="numberResource" currentValue="${charadata['friends'][0]['current']}">${charadata['friends'][0]['level']}</data>
    <data name="${charadata['friends'][1]['name']}" type="numberResource" currentValue="${charadata['friends'][0]['current']}">${charadata['friends'][0]['level']}</data>
    <data name="${charadata['friends'][2]['name']}" type="numberResource" currentValue="${charadata['friends'][0]['current']}">${charadata['friends'][0]['level']}</data>
    </data>
    </data>
    </data>
    <chat-palette dicebot="KemonoNoMori">1d12
KC
KA{移動}  判定:移動
KA{格闘}  判定:格闘
KA{射撃}  判定:射撃
KA{製作}  判定:製作
KA{察知}  判定:察知
KA{自制}  判定:自制
1d12+{移動}  先制値決定:移動
1d12+{察知}  先制値決定:察知
1d12+{自制}  先制値決定:自制
KA10-{負傷}  復帰判定
FT 大失敗表</chat-palette>
    </character>
    `
    console.log(kemonocs)

    let xmlElement: Element = XmlUtil.xml2element(kemonocs);
    if (xmlElement) EventSystem.trigger('XML_LOADED', { xmlElement: xmlElement });
    };
}
