import { AfterViewInit, Component, NgZone, OnDestroy, OnInit, Input } from '@angular/core';
import { GenerateService } from 'service/generate.service';
import { XmlUtil } from '@udonarium/core/system/util/xml-util';
import { FileReaderUtil } from '@udonarium/core/file-storage/file-reader-util';
import { EventSystem } from '@udonarium/core/system';
import * as JSZip from 'jszip';


import { PanelOption, PanelService } from 'service/panel.service';
import { ModalService } from 'service/modal.service';

import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import * as KemonoSample from '../../../assets/cs/kemono_example.json'

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
    let kemonosheet = KemonoSample;

    let bouryoku = "";

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

    let joutaiijou = "";
    if (charadata.status.bad.value !== null){
      joutaiijou = charadata.status.bad.value;
    };

    // 仮名
    kemonosheet.character.data.data[1].data[0]["#text"] = charadata.base.handlename;
    // 余裕
    kemonosheet.character.data.data[2].data[0]["#text"] = charadata.status.margin.limit;
    kemonosheet.character.data.data[2].data[0]["@_currentValue"] = charadata.status.margin.limit;
    // 予算
    kemonosheet.character.data.data[2].data[1]["#text"] = charadata.status.budget.limit;
    kemonosheet.character.data.data[2].data[1]["@_currentValue"] = charadata.status.budget.limit;
    // 特性
    kemonosheet.character.data.data[2].data[2]["#text"] = useTalent[0]; // 特性①
    kemonosheet.character.data.data[2].data[3]["#text"] = useTalent[1]; // 特性②
    // 獣憑き
    kemonosheet.character.data.data[2].data[4]["#text"] = charadata.beastpoint.value;
    






    for (let val of charadata.facepower){
      bouryoku += `${val.name} `;
    };



    let summary = `<?xml version="1.0" encoding="UTF-8"?>
    <summary-setting sortTag="name" sortOrder="ASC" dataTag="開始条件　展開 耐久度　余裕　予算　威力　軽減値 特性①　特性② 　特殊効果　異形　獸憑き　状態異常 　移動　格闘　射撃　製作　察知　自制　 貌力　装備 武器　防具　小道具　持ち物"></summary-setting>
    `



    switch(download_flg){
      case false:
        // let xmlElement: Element = XmlUtil.xml2element(summary);
        // if (xmlElement) EventSystem.trigger('XML_LOADED', { xmlElement: xmlElement });
        // xmlElement = XmlUtil.xml2element(kemonocs);
        // if (xmlElement) EventSystem.trigger('XML_LOADED', { xmlElement: xmlElement });
        break;
      case true:
        // const zip = new JSZip();
        // zip.file(`${name}.xml`, kemonocs);
        // zip.file('summary.xml', summary);
        // zip.generateAsync({ type: 'blob' }).then((blob) => {
        //   const downloadLink = document.createElement('a');
        //   downloadLink.href = URL.createObjectURL(blob);
        //   downloadLink.download = `${name}.zip`;
        //   downloadLink.click();
        // });
        break;
    };
  };
}
