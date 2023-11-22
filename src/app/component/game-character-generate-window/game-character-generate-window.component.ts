import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { GenerateService } from 'service/generate.service';
import { XmlUtil } from '@udonarium/core/system/util/xml-util';
import { EventSystem } from '@udonarium/core/system';
import * as JSZip from 'jszip';

import { PanelService } from 'service/panel.service';
import { ModalService } from 'service/modal.service';

import { XMLBuilder } from 'fast-xml-parser';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

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

  private subscription: Subscription;

  @ViewChild('charactersheeturlInput', { static: false })
  charactersheeturlInput!: ElementRef;

  charactersheeturl: string = '';
  urlerror: boolean = false;
  supporterror: boolean = false;
  keyerror: boolean = false;

  supportSystem: string[] = ["tiw", "skynauts2"];

  ngOnInit() {
    Promise.resolve().then(() => this.modalService.title = this.panelService.title = 'キャラ駒生成');
  }

  ngAfterViewInit() {
    this.charactersheeturlInput.nativeElement.focus();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
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

    this.subscription = this.generateService.get(URL).subscribe( (entry) => {
      let charadata = entry;
      this.generate(charadata, system, site, download_flg);
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
    this.http.get('assets/skynauts2sheet.json').subscribe(data => {
      skynauts2sheet = data;

      let name = charadata['base']['name'];
      let move = charadata['base']['move'];
      let hp = charadata['hitpoint']['max'];
      let ability = {
        "body": null,
        "culture": null,
        "sense": null,
        "technic": null,
      };
      let relations: String[] = [];
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
      skynauts2sheet['character']['data']['data'][2]['data'][1]['data'][0]['#text'] = move;
      skynauts2sheet['character']['data']['data'][2]['data'][0]['data'][0]['@_currentValue'] = hp;
      skynauts2sheet['character']['data']['data'][2]['data'][0]['data'][0]['#text'] = hp;
      skynauts2sheet['character']['data']['data'][2]['data'][1]['data'][1]['#text'] = ability.technic;
      skynauts2sheet['character']['data']['data'][2]['data'][1]['data'][2]['#text'] = ability.sense;
      skynauts2sheet['character']['data']['data'][2]['data'][1]['data'][3]['#text'] = ability.culture;
      skynauts2sheet['character']['data']['data'][2]['data'][1]['data'][4]['#text'] = ability.body;
      skynauts2sheet.character.data.data[1].data[0]["#text"] = name;

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
      chatpalatte = `${chatpalatte}D/3 ダメージチェック\nNV 航行表\nNEN 航行イベント(航行系)\nNEE 航行イベント(遭遇系)\nNEO 航行イベント(船内系)\nNEH 航行イベント(困難系)\nNEL 航行イベント(長旅系)\nFT ファンブル表\n`;
      skynauts2sheet['character']['chat-palette']['#text'] = chatpalatte;
      let summary = `<?xml version="1.0" encoding="UTF-8"?>
      <summary-setting sortTag="name" sortOrder="ASC" dataTag="生命点　移動力　技術　感覚　教養　身体　キズナ①　キズナ②　キズナ③　キズナ④　キズナ⑤　キズナ⑥　キズナ⑦　キズナ⑧　キズナ⑨　キズナ⑩　デバフ"></summary-setting>
      `

      this.generateKoma(name, skynauts2sheet, summary, download_flg);
    });
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
    let ability1_text: string = "";
    let ability2_text: string = "";
    let dice: number = 2;
    let fumble: number = 1;

    // ability1と2に得意があるかどうかを判定
    if (ability1 === "得意" || ability2 === "得意") dice++;
    if (ability1 === "苦手" || ability2 === "苦手") fumble++;

    // ability1が得意な場合[得意]、苦手な場合は[苦手]を追加
    if (ability1 === "得意") ability1_text = "　[得意]";
    if (ability1 === "苦手") ability1_text = "　[苦手]";

    // ability2が得意な場合[得意]、苦手な場合は[苦手]を追加
    if (ability2 === "得意") ability2_text = "　[得意]";
    if (ability2 === "苦手") ability2_text = "　[苦手]";

    // ability1と2に得意があるかどうかを判定
    return `${dice}SN7#${fumble} ${actionName}　${actionDescription}${ability1_text}${ability2_text}\n`;
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
