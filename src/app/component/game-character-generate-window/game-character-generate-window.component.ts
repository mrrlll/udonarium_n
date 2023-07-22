import { AfterViewInit, Component, NgZone, OnDestroy, OnInit, Input } from '@angular/core';
import { GenerateService } from 'service/generate.service';
import { XmlUtil } from '@udonarium/core/system/util/xml-util';
import { FileReaderUtil } from '@udonarium/core/file-storage/file-reader-util';
import { EventSystem } from '@udonarium/core/system';
import * as JSZip from 'jszip';


import { PanelOption, PanelService } from 'service/panel.service';
import { ModalService } from 'service/modal.service';

import { XMLParser, XMLBuilder } from 'fast-xml-parser';

@Component({
  selector: 'app-game-character-generate-window',
  templateUrl: './game-character-generate-window.component.html',
  styleUrls: ['./game-character-generate-window.component.css']
})
export class GameCharacterGenerateWindowComponent {

  constructor(
    private generateService: GenerateService,
    private modalService: ModalService,
    private panelService: PanelService,
  ){}

  charactersheeturl: string = '';
  urlerror: boolean = false;
  supporterror: boolean = false;
  keyerror: boolean = false;

  charadata: any = null;

  supportSystem: string[] = ["tiw"];


  ngOnInit() {
    Promise.resolve().then(() => this.modalService.title = this.panelService.title = 'キャラ駒生成');
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
    if (this.supportSystem.some(item => item !== system)){
      this.supporterror = true;
      return;
    };

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
    }
  }
  appspot_kemono(charadata, download_flg){
    let kemonosheet = null;
    kemonosheet = {
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
                    "#text": "仮名",
                    "@_name": "name"
                },
                {
                    "#text": 3,
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
                      "#text": 10,
                      "@_type": "numberResource",
                      "@_currentValue": "10",
                      "@_name": "余裕"
                    },
                    {
                      "#text": 2,
                      "@_type": "",
                      "@_currentValue": "2",
                      "@_name": "予算"
                    },
                    {
                      "#text": "特性名",
                      "@_name": "特性①",
                      "@_type": ""
                    },
                    {
                      "#text": "特性名",
                      "@_name": "特性②",
                      "@_type": ""
                    },
                    {
                      "#text": 0,
                      "@_name": "獸憑き",
                      "@_type": ""
                    },
                    {
                      "#text": "",
                      "@_name": "状態異常"
                    }
                  ],
                  "@_name": "リソース"
                },
                {
                  "data": [
                    {
                      "#text": "本名:\n性別:　年齢:\n仮面:\n貌力:\n雰囲気:\n動機:",
                      "@_type": "note",
                      "@_name": "設定"
                    },
                    {
                      "#text": 3,
                      "@_name": "貌力の強度",
                      "@_type": ""
                    },
                    {
                      "#text": "「」(威力:)(特殊効果:)",
                      "@_type": "",
                      "@_name": "武器"
                    },
                    {
                      "#text": "「」(軽減値:)(特殊効果:)",
                      "@_name": "防具"
                    },
                    {
                      "#text": "「」(特殊効果:)",
                      "@_name": "小道具１"
                    },
                    {
                      "#text": "「」(特殊効果:)",
                      "@_name": "小道具２"
                    },
                    {
                      "#text": "1.\n2.\n3.\n4.\n5.\n6.\n7.\n8.",
                      "@_name": "持ち物",
                      "@_type": "note"
                    }
                  ],
                  "@_name": "情報"
                },
                {
                  "data": [
                    {
                      "#text": 7,
                      "@_name": "移動"
                    },
                    {
                      "#text": 7,
                      "@_name": "格闘"
                    },
                    {
                      "#text": 7,
                      "@_name": "射撃"
                    },
                    {
                      "#text": 7,
                      "@_name": "製作"
                    },
                    {
                      "#text": 7,
                      "@_name": "察知"
                    },
                    {
                      "#text": 7,
                      "@_name": "自制"
                    }
                  ],
                  "@_name": "能力"
                },
                {
                  "data": [
                    {
                      "#text": 5,
                      "@_name": "日常",
                      "@_type": "numberResource",
                      "@_currentValue": "5"
                    },
                    {
                      "#text": 5,
                      "@_name": "日常",
                      "@_type": "numberResource",
                      "@_currentValue": "2"
                    },
                    {
                      "#text": 5,
                      "@_name": "日常",
                      "@_type": "numberResource",
                      "@_currentValue": "5"
                    }
                  ],
                  "@_name": "絆"
                }
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


    let handlename = charadata.base.handlename;

    /// 使用する特性を確認 ///
    let talent = charadata.base.talent
    const useTalent = [];
    let anyChecked = false;
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
    let truename: string = charadata.base.name;
    let sex: string = charadata.base.sex;
    let age: string = charadata.base.age;
    let face: string = charadata.base.face;
    let atmosphere: string = charadata.base.atmosphere;
    let motivation: string = charadata.base.motivation;

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
    kemonosheet.character.data.data[2].data[0].data[1]["#text"] = charadata.status.budget.limit;
    kemonosheet.character.data.data[2].data[0].data[1]["@_currentValue"] = charadata.status.budget.limit;
    // 特性
    kemonosheet.character.data.data[2].data[0].data[2]["#text"] = useTalent[0]; // 特性①
    kemonosheet.character.data.data[2].data[0].data[3]["#text"] = useTalent[1]; // 特性②
    // 獣憑き
    kemonosheet.character.data.data[2].data[0].data[4]["#text"] = charadata.beastpoint.value;
    // 状態異常
    kemonosheet.character.data.data[2].data[0].data[5]["#text"] = debuff;
    // キャラノート
    kemonosheet.character.data.data[2].data[1].data[0]["#text"] = character_note;
    // 貌力の強度
    kemonosheet.character.data.data[2].data[1].data[1]["@_name"] = Object.keys(charadata.facepower).length;
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
      kemonosheet.character.data.data[2].data[3].data[i]["@_currentValue"] = charadata.days[i].current;
    }
    // 仲間
    let friends = charadata.friends;
    for (let friend of friends) {
      let data = {
        "@_name": friend.name,
        "#text": friend.level,
        "@_type": "numberResource",
        "@_currentValue": friend.current
      };
      kemonosheet.character.data.data[2].data[3].data.push(data);
    };

    let summary = `<?xml version="1.0" encoding="UTF-8"?>
    <summary-setting sortTag="name" sortOrder="ASC" dataTag="開始条件　展開 耐久度　余裕　予算　威力　軽減値 特性①　特性② 　特殊効果　異形　獸憑き　状態異常 　移動　格闘　射撃　製作　察知　自制　 貌力　装備 武器　防具　小道具　持ち物"></summary-setting>
    `

    const xb = new XMLBuilder({
      ignoreAttributes: false,
      textNodeName: "#text",
      attributeNamePrefix: "@_",
      format: true,
      cdataPropName: "__cdata",
    });

    const xmlContent = xb.build(kemonosheet);
    console.log(xmlContent)

    switch(download_flg){
      case false:
        let xmlElement: Element = XmlUtil.xml2element(summary);
        if (xmlElement) EventSystem.trigger('XML_LOADED', { xmlElement: xmlElement });
        xmlElement = XmlUtil.xml2element(xmlContent);
        if (xmlElement) EventSystem.trigger('XML_LOADED', { xmlElement: xmlElement });
        break;
      case true:
        const zip = new JSZip();
        zip.file(`${handlename}.xml`, xmlContent);
        zip.file('summary.xml', summary);
        zip.generateAsync({ type: 'blob' }).then((blob) => {
          const downloadLink = document.createElement('a');
          downloadLink.href = URL.createObjectURL(blob);
          downloadLink.download = `${handlename}.zip`;
          downloadLink.click();
        });
        break;
    };
  };
}
