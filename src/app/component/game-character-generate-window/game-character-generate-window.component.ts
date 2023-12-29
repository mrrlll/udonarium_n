import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { GenerateService } from 'service/generate.service';
import { ObjectSerializer } from '@udonarium/core/synchronize-object/object-serializer';
import { XmlUtil } from '@udonarium/core/system/util/xml-util';
import { EventSystem } from '@udonarium/core/system';
import { TableSelecter } from '@udonarium/table-selecter';
import { TabletopService } from 'service/tabletop.service';

import { PanelService } from 'service/panel.service';
import { ModalService } from 'service/modal.service';

import { XMLBuilder } from 'fast-xml-parser';
import { HttpClient } from '@angular/common/http';
import { GameCharacter } from '@udonarium/game-character';

@Component({
  selector: 'app-game-character-generate-window',
  templateUrl: './game-character-generate-window.component.html',
  styleUrls: ['./game-character-generate-window.component.css']
})
export class GameCharacterGenerateWindowComponent implements OnInit, AfterViewInit {

  constructor(
    private generateService: GenerateService,
    private modalService: ModalService,
    private panelService: PanelService,
    private http: HttpClient,
    private tabletopService: TabletopService
  ){}

  @ViewChild('charactersheeturlInput', { static: false })
  charactersheeturlInput!: ElementRef;

  characterSheetUrl: string = '';
  isUnsupportedSiteSystem: boolean = false;
  isKeyNotFound: boolean = false;

  ngOnInit() {
    Promise.resolve().then(() => this.modalService.title = this.panelService.title = 'キャラ駒生成');
  }

  ngAfterViewInit() {
    // URL入力欄にフォーカス
    this.charactersheeturlInput.nativeElement.focus();
  }

  generate(){
    this.isUnsupportedSiteSystem = false;
    this.isKeyNotFound = false;

    const supportSiteSystems = {
      "character-sheets.appspot.com": {
        "tiw": this.appspot_kemono,
        "skynauts2": this.appspot_skynauts2
      }
    };

    var URL = this.characterSheetUrl;
    let site: string = ""
    let system: string = ""


    if (!supportSiteSystems[this.characterSheetUrl.split("/")[2]]) {
      this.isUnsupportedSiteSystem = true;
      return;
    } else {
      site = URL.split("/")[2];
      system = URL.split("/")[3];

      if (!supportSiteSystems[site][system]) {
        this.isUnsupportedSiteSystem = true;
        return;
      }
    }

    this.generateService.get(URL).subscribe( (data) => {
      let charadata = data;
      const generateFunc = supportSiteSystems[site][system];
      if (generateFunc) {
        generateFunc.call(this, charadata);
      }
    }, (error) => {
      this.isKeyNotFound = true;
    });
  }

  appspot_skynauts2(charadata){
    let skynauts2sheet = null;
    this.http.get('assets/skynauts2sheet.json').subscribe(data => {
      skynauts2sheet = data;

      let ability = { "body": null, "culture": null, "sense": null, "technic": null };
      let count: number = 1;
      let countnumber = {
        "1": "①",
        "2": "②",
        "3": "③",
        "4": "④",
        "5": "⑤",
        "6": "⑥",
        "7": "⑦",
        "8": "⑧",
        "9": "⑨",
        "10": "⑩",
      };

      // もしcharadata['relation']の１つ目のnameがnullならば、キズナ①を追加
      if (charadata['relation'][0]['name'] === null) {
        charadata['relation'][0]['name'] = `仲間のキャラクター名`;
      } else {
        for (let relation of charadata['relation']){
          let name = relation['name'];
          data = {
            "#text": name,
            "@_type": "check",
            "@_name": `キズナ${countnumber[count]}`
          }
          skynauts2sheet['character']['data']['data'][2]['data'][0]['data'][0+count] = data;
          count++;
        };
      }

      const abilityTypes = ["body", "culture", "sense", "technic"];
      for (const type of abilityTypes) {
        const value = charadata.ability[type].value;
        switch (value) {
          case "good":
            ability[type] = "得意";
            break;
          case "week":
            ability[type] = "苦手";
            break;
          default:
            ability[type] = "－";
            break;
        }
      }
      skynauts2sheet['character']['data']['data'][2]['data'][1]['data'][0]['#text'] = charadata['base']['move'];
      skynauts2sheet['character']['data']['data'][2]['data'][0]['data'][0]['@_currentValue'] = charadata['hitpoint']['max'];
      skynauts2sheet['character']['data']['data'][2]['data'][0]['data'][0]['#text'] = charadata['hitpoint']['max'];
      skynauts2sheet['character']['data']['data'][2]['data'][1]['data'][1]['#text'] = ability.technic;
      skynauts2sheet['character']['data']['data'][2]['data'][1]['data'][2]['#text'] = ability.sense;
      skynauts2sheet['character']['data']['data'][2]['data'][1]['data'][3]['#text'] = ability.culture;
      skynauts2sheet['character']['data']['data'][2]['data'][1]['data'][4]['#text'] = ability.body;
      skynauts2sheet.character.data.data[1].data[0]["#text"] = charadata['base']['name'];

      let chatpalatte = this.skynautsChatPaletteGen(ability);

      skynauts2sheet['character']['chat-palette']['#text'] = chatpalatte;
      let summary = `<?xml version="1.0" encoding="UTF-8"?>
      <summary-setting sortTag="name" sortOrder="ASC" dataTag="生命点　移動力　技術　感覚　教養　身体　キズナ①　キズナ②　キズナ③　キズナ④　キズナ⑤　キズナ⑥　キズナ⑦　キズナ⑧　キズナ⑨　キズナ⑩　デバフ"></summary-setting>
      `

      this.generateKoma(skynauts2sheet, summary, 'skynauts2');
      return;
    });
  }

  skynautsChatPaletteGen(ability): String {
    let chatpalatte: null|String = "";
    chatpalatte += this.skynautsChatPaletteS(ability.technic, "「技術」判定");
    chatpalatte += this.skynautsChatPaletteS(ability.sense, "「感覚」判定");
    chatpalatte += this.skynautsChatPaletteS(ability.culture, "「教養」判定");
    chatpalatte += this.skynautsChatPaletteS(ability.body, "「身体」判定");
    chatpalatte += this.skynautsChatPaletteD(ability.technic, ability.culture, "修理判定", "「技術」+「教養」");
    chatpalatte += this.skynautsChatPaletteD(ability.sense, ability.culture, "操舵判定", "「感覚」+「教養」");
    chatpalatte += this.skynautsChatPaletteD(ability.body, ability.technic, "白兵判定/侵入判定", "「身体」+「技術」");
    chatpalatte += this.skynautsChatPaletteD(ability.body, ability.sense, "偵察判定/大揺れ判定", "「身体」+「感覚」");
    chatpalatte += this.skynautsChatPaletteD(ability.body, ability.culture, "消火判定", "「身体」+「教養」");
    chatpalatte += this.skynautsChatPaletteD(ability.technic, ability.sense, "砲撃判定", "「技術」+「感覚」");
    chatpalatte += `${chatpalatte}D/3 ダメージチェック\nNV 航行表\nNEN 航行イベント(航行系)\nNEE 航行イベント(遭遇系)\nNEO 航行イベント(船内系)\nNEH 航行イベント(困難系)\nNEL 航行イベント(長旅系)\nFT ファンブル表\n`;

    return chatpalatte;
  }

  skynautsChatPaletteS(ability, actionDescription) {
    let ability_good: boolean = false;
    let ability_bad: boolean = false;
    let dice: number = 2;
    let fumble: number = 1;

    // abilityに得意があるかどうかを判定
    if (ability === "得意") dice++;
    if (ability === "苦手") fumble++;

    return `${dice}SN7#${fumble} ${actionDescription}${ability_good ? "　[得意]" : ""}${ability_bad ? "　[苦手]" : ""}\n`;
  }

  skynautsChatPaletteD(ability1, ability2, actionName, actionDescription) {
    let dice: number = 2;
    let fumble: number = 1;

    const checkAbility = (ability) => {
        let text = "";
        if (ability === "得意") {
            dice++;
            text = "　[得意]";
        } else if (ability === "苦手") {
            fumble++;
            text = "　[苦手]";
        }
        return text;
    }

    const ability1_text = checkAbility(ability1);
    const ability2_text = checkAbility(ability2);

    return `${dice}SN7#${fumble} ${actionName}　${actionDescription}${ability1_text}${ability2_text}\n`;
  }

  appspot_kemono(charadata){
    let kemonosheet = null;
    this.http.get('assets/kemonosheet.json').subscribe(data => {
      kemonosheet = data;
      const handlename: string = charadata.base.handlename;

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

      let debuff = "";
      if (charadata.status.bad.value !== null){
        debuff = charadata.status.bad.value;
      };

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
          break;
        };
      };
      equipmentWeapon = `「${weaponName}」(威力:${weaponDamage})(特殊効果:${weaponExplain})`;

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
          break;
        }
      }
      equipmentArmor = `「${armorName}」(軽減値:${armorMitigation})(特殊効果:${armorExplain})`;

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
            break;
          }
        }
      };

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
      // 獸憑き
      if (charadata.beastpoint.value === null) charadata.beastpoint.value = 0;
      kemonosheet.character.data.data[2].data[0].data[6]["#text"] = charadata.beastpoint.value;
      // 状態異常
      kemonosheet.character.data.data[2].data[0].data[7]["#text"] = debuff;
      // キャラノート
      kemonosheet.character.data.data[1].data[4]['#text'] = character_note;
      // 貌力の強度
      kemonosheet.character.data.data[1].data[3]['#text'] = Object.keys(charadata.facepower).length;
      // 武器
      kemonosheet.character.data.data[2].data[1].data[0]["#text"] = equipmentWeapon;
      // 防具
      kemonosheet.character.data.data[2].data[1].data[1]["#text"] = equipmentArmor;
      // 小道具
      for (let i = 0; i <= 1; i++) {
        if(equipmentAccessories[i]){
          kemonosheet.character.data.data[2].data[1].data[i+2]["#text"] = `「${equipmentAccessories[i].name}」(特殊効果:${equipmentAccessories[i].explain})`;
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
      <summary-setting sortTag="先制値" sortOrder="ASC" dataTag="先制値 開始条件 展開 耐久度 余裕 食事 水分 予算 威力 軽減値 特性① 特性② 特性③ 特殊効果 異形 獸憑き 状態異常 移動 格闘 射撃 製作 察知 自制 貌力 装備 武器 防具 小道具① 小道具② 持ち物 情報 絆"></summary-setting>
      `
      this.generateKoma(kemonosheet, summary, 'kemono');
      return;
    });
  };

  generateKoma(sheetdata, summary, system){
    const xb = new XMLBuilder({
      ignoreAttributes: false,
      textNodeName: "#text",
      attributeNamePrefix: "@_",
      format: true,
      cdataPropName: "__cdata",
    });

    const xmlContent = xb.build(sheetdata);

    // インベントリ表示項目の設定
    let summaryElement: Element = XmlUtil.xml2element(summary);
    ObjectSerializer.instance.parseXml(summaryElement);

    // キャラクターのコマ
    let gameCharacterElement = XmlUtil.xml2element(xmlContent);
    if (gameCharacterElement) {
      let gameCharacter = ObjectSerializer.instance.parseXml(gameCharacterElement) as GameCharacter;
      gameCharacter.addExtendData();
      let viewTable = TableSelecter.instance.viewTable;
      gameCharacter.location.x = viewTable.width * 20;
      gameCharacter.location.y = viewTable.height * 20;
      gameCharacter.posZ = 0;
      if(system === 'kemono'){

        gameCharacter.overViewMaxHeight = 400;
        gameCharacter.overViewWidth = 300;
      }
      this.tabletopService.placeToTabletop(gameCharacter);
    }

    return;
  };
}
