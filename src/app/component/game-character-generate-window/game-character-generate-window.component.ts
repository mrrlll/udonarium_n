import { AfterViewInit, Component, NgZone, OnDestroy, ElementRef, OnInit, Input, ViewChild } from '@angular/core';
import { GenerateService } from 'service/generate.service';
import { XmlUtil } from '@udonarium/core/system/util/xml-util';
import { FileReaderUtil } from '@udonarium/core/file-storage/file-reader-util';
import { EventSystem } from '@udonarium/core/system';
import * as JSZip from 'jszip';


import { PanelOption, PanelService } from 'service/panel.service';
import { ModalService } from 'service/modal.service';

import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-game-character-generate-window',
  templateUrl: './game-character-generate-window.component.html',
  styleUrls: ['./game-character-generate-window.component.css']
})
export class GameCharacterGenerateWindowComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(
    private generateService: GenerateService,
    private modalService: ModalService,
    private panelService: PanelService,
    private http: HttpClient,
  ){}

  @ViewChild('charactersheeturlInput', { static: false })
  charactersheeturlInput!: ElementRef;

  charactersheeturl: string = '';
  urlerror: boolean = false;
  supporterror: boolean = false;
  keyerror: boolean = false;

  charadata: any = null;

  supportSystem: string[] = ["tiw", "skynauts2"];

  ngOnInit() {
    Promise.resolve().then(() => this.modalService.title = this.panelService.title = 'キャラ駒生成');
  }
  ngAfterViewInit() {
    this.charactersheeturlInput.nativeElement.focus();
  }
  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  get(download_flg){
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
    if (!this.supportSystem.includes(system)) {
      this.supporterror = true;
      return;
    }

    this.generateService.get(URL).subscribe( (entry) => {
      this.charadata = entry;
      this.generate(this.charadata, system, site, download_flg);
    }, (error) => {
      console.log(error);
      this.keyerror = true;
    });
  }

  generate(charadata, system, site, download_flg){
    switch (site){
      case "character-sheets.appspot.com":
        this.csappspotgenerate(charadata, system, download_flg);
        break;
    }
  }

  csappspotgenerate(charadata, system, download_flg){
    switch (system){
      case "tiw":
        this.appspot_kemono(charadata, download_flg);
        break;
      case "skynauts2":
        this.appspot_skynauts2(charadata, download_flg);
    }
  }

  appspot_skynauts2(charadata, download_flg){
    let skynauts2sheet = null;
    skynauts2sheet = {
      "character": {
        "data": {
          "data": [
            {
              "data": {
                "#text": "testCharacter_4_image",
                "@_type": "image",
                "@_name": "imageIdentifier"
              },
              "@_name": "image"
            },
            {
              "data": [
                {
                    "#text": "名前",
                    "@_name": "name"
                },
                {
                    "#text": 2,
                    "@_name": "size"
                }
              ],
              "@_name": "common"
            },
            {
              "data": [
                {
                  "data": [
                    {
                      "#text": 20,
                      "@_type": "numberResource",
                      "@_currentValue": "10",
                      "@_name": "生命点"
                    },
                    {
                      "#text": 1,
                      "@_type": "numberResource",
                      "@_currentValue": "0",
                      "@_name": "PC1"
                    },
                    {
                      "#text": 1,
                      "@_type": "numberResource",
                      "@_currentValue": "0",
                      "@_name": "PC2"
                    },
                    {
                      "#text": 1,
                      "@_type": "numberResource",
                      "@_currentValue": "0",
                      "@_name": "PC3"
                    },
                    {
                      "#text": 1,
                      "@_type": "numberResource",
                      "@_currentValue": "0",
                      "@_name": "PC4"
                    },
                  ],
                  "@_name": "リソース"
                },
                {
                  "data": [
                    {
                      "#text": "",
                      "@_name": "移動力"
                    },
                    {
                      "#text": "－",
                      "@_name": "技術"
                    },
                    {
                      "#text": "－",
                      "@_name": "感覚"
                    },
                    {
                      "#text": "－",
                      "@_name": "教養"
                    },
                    {
                      "#text": "－",
                      "@_name": "身体"
                    },
                  ],
                  "@_name": "能力値"
                },
                {
                  "data": [

                  ],
                  "@_name": "スキル"
                },
                {
                  "data": [
                    {
                      "#text": "性別・年齢・設定など",
                      "@_name": "キャラクター設定",
                      "@_type": "note",
                    },
                  ],
                  "@_name": "キャラクター情報"
                },
                {
                  "data": [
                    {
                      "#text": "",
                      "@_name": "ICON",
                      "@_type": "numberResource",
                      "@_currentValue": "0"
                    },
                  ],
                  "@_name": "コマ画像"
                },
              ],
              "@_name": "detail"
            }
          ],
          "@_name": "character"
        },
        "chat-palette": {
          "#text": "1d12\nKC\nKA{移動}  判定:移動\nKA{格闘}  判定:格闘\nKA{射撃}  判定:射撃\nKA{製作}  判定:製作\nKA{察知}  判定:察知\nKA{自制}  判定:自制\n1d12+{移動}  先制値決定:移動\n1d12+{察知}  先制値決定:察知\n1d12+{自制}  先制値決定:自制\nKA10-{負傷}  復帰判定\nFT 大失敗表",
          "@_dicebot": "KemonoNoMori"
        },
        "@_location.name": "table"
      }
    };

    let name = charadata.base.name;
    let ability = {
      "body": null,
      "culture": null,
      "sense": null,
      "technic": null,
    };

    const abilityTypes = ["body", "culture", "sense", "technic"];
    for (const type of abilityTypes) {
      const value = charadata.ability[type].value;
      switch (value) {
        case "good":
          ability[type] = "○";
          break;
        case "week":
          ability[type] = "×";
          break;
        default:
          ability[type] = "－";
          break;
      }
    }

    skynauts2sheet.character.data.data[1].data[0]["#text"] = name;

    let summary = `<?xml version="1.0" encoding="UTF-8"?>
    <summary-setting sortTag="name" sortOrder="ASC" dataTag="移動力　生命点　探空士スキル 技術　感覚　教養　身体　PC1　PC2　PC3　PC4　キズナ４"></summary-setting>
    `

    this.generateKoma(name, skynauts2sheet, summary, download_flg);
  }

  appspot_kemono(charadata, download_flg){
    let kemonosheet = null;
    this.http.get('assets/kemonosheet.json').subscribe(data => {
      kemonosheet = data;
      const handlename: string = charadata.base.handlename;

      /// 使用する特性を確認 ///
      const talent: any = charadata.base.talent
      const useTalent = [];
      let anyChecked: boolean = false;
      for (let i = 1; i <= 6; i++) {
        const nameKey = `name${i}`;
        const useKey = `use${i}`;

        if (talent[useKey] === "on") {
          useTalent.push(talent[nameKey]);
          anyChecked = true;
        }
      }
      if (!anyChecked) {
        useTalent.push(talent.name1, talent.name2);
      }
      /// ここまで ///

      /// キャラノート ///
      let character_note: string = "";
      let facepower: string = "";
      const truename: string = charadata.base.name;
      const sex: string = charadata.base.sex;
      const age: string = charadata.base.age;
      const face: string = charadata.base.face;
      const atmosphere: string = charadata.base.atmosphere;
      const motivation: string = charadata.base.motivation;

      for (let val of charadata.facepower){
        facepower += `${val.name} `;
      };

      character_note = `本名:${truename}
性別:${sex}　年齢:${age}
仮面:${face}
貌力:${facepower}
雰囲気:${atmosphere}
動機:${motivation}`;
      /// ここまで ///

      let debuff = "";
      if (charadata.status.bad.value !== null){
        debuff = charadata.status.bad.value;
      };

      /// 装備中の武器を取得 ///
      let weapons = charadata.weapons;

      let weaponName: string | null = null;
      let weaponDamage: string | null = null;
      let weaponRange: string | null = null;
      let weaponExplain: string = "";

      let equipmentWeapon: string | null = null;

      for (const weapon of weapons) {
        if (weapon.equipment === "装備") {
          weaponName = weapon.name;
          weaponDamage = weapon.damage;
          weaponRange = weapon.range;
          if (weapon.damage === null){
            weaponDamage = "";
          } else {
            weaponDamage = weapon.damage;
          }
          if (weapon.explain == null){
            weaponExplain = "";
          } else {
            weaponExplain = weapon.explain;
          }
          break; // 一つ取り出した時点で処理を終了
        };
      };
      equipmentWeapon = `「${weaponName}」(威力:${weaponDamage})(特殊効果:${weaponExplain})`;
      /// ここまで ///

      /// 装備中の防具を取得 ///
      let armors = charadata.armors;

      let armorName: string | null = null;
      let armorMitigation: string | null = null;
      let armorExplain: string | null = null;

      let equipmentArmor: string = `「${armorName}」(軽減値:${armorMitigation})(特殊効果:${armorExplain})`;

      for (const armor of armors) {
        if (armor.equipment === "装備") {
          armorName = armor.name;
          armorMitigation = armor.damage;
          if (armor.explain == null){
            armorExplain = "";
          } else {
            armorExplain = armor.explain;
          }
          break; // 一つ取り出した時点で処理を終了
        }
      }
      equipmentArmor = `「${armorName}」(軽減値:${armorMitigation})(特殊効果:${armorExplain})`;
      /// ここまで ///

      /// 装備中の小道具を取得 ///
      let accessories = charadata.accessories;
      const equipmentAccessories: { name: string; explain: string | null }[] = [];
      for (const accessory of accessories) {
        if (accessory.equipment === "装備") {
          if (accessory.explain == null){
            accessory.explain = "";
          }
          equipmentAccessories.push({
            name: accessory.name,
            explain: accessory.explain,
          });
          if (equipmentAccessories.length >= 2) {
            break; // 最大２つ取得したらループを終了
          }
        }
      };
      /// ここまで ///

      // 仮名
      kemonosheet.character.data.data[1].data[0]["#text"] = handlename;
      // 余裕
      kemonosheet.character.data.data[2].data[0].data[0]["#text"] = charadata.status.margin.limit;
      kemonosheet.character.data.data[2].data[0].data[0]["@_currentValue"] = charadata.status.margin.limit;
      // 予算
      if(charadata.status.budget.limit === null) charadata.status.budget.limit = 0;
      kemonosheet.character.data.data[2].data[0].data[3]["#text"] = charadata.status.budget.limit;
      kemonosheet.character.data.data[2].data[0].data[3]["@_currentValue"] = charadata.status.budget.limit;
      // 特性
      kemonosheet.character.data.data[2].data[0].data[4]["#text"] = useTalent[0]; // 特性①
      kemonosheet.character.data.data[2].data[0].data[5]["#text"] = useTalent[1]; // 特性②
      // 獣憑き
      if (charadata.beastpoint.value === null) charadata.beastpoint.value = 0;
      kemonosheet.character.data.data[2].data[0].data[6]["#text"] = charadata.beastpoint.value;
      // 状態異常
      kemonosheet.character.data.data[2].data[0].data[7]["#text"] = debuff;
      // キャラノート
      kemonosheet.character.data.data[2].data[1].data[0]["#text"] = character_note;
      // 貌力の強度
      kemonosheet.character.data.data[2].data[1].data[1]["#text"] = Object.keys(charadata.facepower).length;
      // 武器
      kemonosheet.character.data.data[2].data[1].data[2]["#text"] = equipmentWeapon;
      // 防具
      kemonosheet.character.data.data[2].data[1].data[3]["#text"] = equipmentArmor;
      // 小道具
      for (let i = 0; i <= 1; i++) {
        if(equipmentAccessories[i]){
          kemonosheet.character.data.data[2].data[1].data[i+4]["#text"] = `「${equipmentAccessories[i].name}」(特殊効果:${equipmentAccessories[i].explain})`;
        }
      };
      /// 能力値
      let ability = charadata.base.ability;
      // 移動
      kemonosheet.character.data.data[2].data[2].data[0]['#text'] = ability.move;
      // 格闘
      kemonosheet.character.data.data[2].data[2].data[1]['#text'] = ability.fight;
      // 射撃
      kemonosheet.character.data.data[2].data[2].data[2]['#text'] = ability.shooting;
      // 製作
      kemonosheet.character.data.data[2].data[2].data[3]['#text'] = ability.create;
      // 察知
      kemonosheet.character.data.data[2].data[2].data[4]['#text'] = ability.awareness;
      // 自制
      kemonosheet.character.data.data[2].data[2].data[5]['#text'] = ability.restraint;
      // 日常
      for (let i = 0; i <= 2; i++){
        kemonosheet.character.data.data[2].data[3].data[i]["@_name"] = charadata.days[i].name;
        kemonosheet.character.data.data[2].data[3].data[i]["#text"] = charadata.days[i].level;
        if (charadata.days[i].current) {
          kemonosheet.character.data.data[2].data[3].data[i]["@_currentValue"] = charadata.days[i].current;
        } else {
          kemonosheet.character.data.data[2].data[3].data[i]["@_currentValue"] = charadata.days[i].level;
        }
      }
      // 仲間
      let friends = charadata.friends;
      for (let friend of friends) {
        if (friend.name === null) break;
        if (friend.current === null) friend.current = friend.level
        let data = {
          "@_name": friend.name,
          "#text": friend.level,
          "@_type": "numberResource",
          "@_currentValue": friend.current
        };
        kemonosheet.character.data.data[2].data[3].data.push(data);
      };

      let summary = `<?xml version="1.0" encoding="UTF-8"?>
      <summary-setting sortTag="name" sortOrder="ASC" dataTag="開始条件　展開 耐久度　余裕　食事　水分　予算　威力　軽減値 特性①　特性② 　特殊効果　異形　獸憑き　状態異常 　移動　格闘　射撃　製作　察知　自制　 貌力　装備 武器　防具　小道具　持ち物 ICON"></summary-setting>
      `
      this.generateKoma(handlename, kemonosheet, summary, download_flg);
    });
  };

  generateKoma(name, sheetdata, summary, download_flg){
    const xb = new XMLBuilder({
      ignoreAttributes: false,
      textNodeName: "#text",
      attributeNamePrefix: "@_",
      format: true,
      cdataPropName: "__cdata",
    });

    const xmlContent = xb.build(sheetdata);
    // console.log(xmlContent)

    switch(download_flg){
      case false:
        let xmlElement: Element = XmlUtil.xml2element(summary);
        if (xmlElement) EventSystem.trigger('XML_LOADED', { xmlElement: xmlElement });
        xmlElement = XmlUtil.xml2element(xmlContent);
        if (xmlElement) EventSystem.trigger('XML_LOADED', { xmlElement: xmlElement });
        break;
      case true:
        const zip = new JSZip();
        zip.file(`${name}.xml`, xmlContent);
        zip.file('summary.xml', summary);
        zip.generateAsync({ type: 'blob' }).then((blob) => {
          const downloadLink = document.createElement('a');
          downloadLink.href = URL.createObjectURL(blob);
          downloadLink.download = `${name}.zip`;
          downloadLink.click();
        });
        break;
    };
  }
}
