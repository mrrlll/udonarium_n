import { Component, Input, OnInit, ViewChild } from '@angular/core';
import GameSystemClass from 'bcdice/lib/game_system';
import { ChatTab } from '@udonarium/chat-tab';
import { ChatPalette } from '@udonarium/chat-palette';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { DiceBot } from '@udonarium/dice-bot';
import { ChatInputComponent } from 'component/chat-input/chat-input.component';
import { ChatMessageService } from 'service/chat-message.service';
import { GameCharacter } from '@udonarium/game-character';
import { TabletopObject } from '@udonarium/tabletop-object';

import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { ChatMessage, ChatMessageContext, ChatMessageTargetContext } from '@udonarium/chat-message';

@Component({
  selector: 'insane-skill-table',
  templateUrl: './insane-skill-table.component.html',
  styleUrls: ['./insane-skill-table.component.css']
})
export class InsaneSkillTableComponent implements OnInit{
  @ViewChild('chatInput', { static: true }) chatInputComponent: ChatInputComponent;
  @Input() character: GameCharacter = null;

  get palette(): ChatPalette { return this.character.chatPalette; }

  get sendFrom(): string { return this.character.identifier; }
  set sendFrom(sendFrom: string) {
    this.onSelectedCharacter(sendFrom);
  }

  chatTabidentifier: string = '';
  gameType: string = 'Insane'
  text: string = '';
  sendTo: string = '';

  isEdit: boolean = false;
  editPalette: string = '';

  filterText: string = '';
  selectedCell: string | null = null;

  skillsTable = [
    ['暴力', 'A', '情動', 'B', '知覚', 'C', '技術', 'D', '知識', 'E', '怪異'],
    ['焼却', '', '恋', '', '痛み', '', '分解', '', '物理学', '', '時間'],
    ['拷問', '', '悦び', '', '官能', '', '電子機器', '', '数学', '', '混沌'],
    ['緊縛', '', '憂い', '', '手触り', '', '整理', '', '化学', '', '深海'],
    ['脅す', '', '恥じらい', '', 'におい', '', '薬品', '', '生物学', '', '死'],
    ['破壊', '', '笑い', '', '味', '', '効率', '', '医学', '', '霊魂'],
    ['殴打', '', '我慢', '', '物音', '', 'メディア', '', '教養', '', '魔術'],
    ['切断', '', '驚き', '', '情景', '', 'カメラ', '', '人類学', '', '暗黒'],
    ['刺す', '', '怒り', '', '追跡', '', '乗物', '', '歴史', '', '終末'],
    ['射撃', '', '恨み', '', '芸術', '', '機械', '', '民俗学', '', '夢'],
    ['戦争', '', '哀しみ', '', '第六感', '', '罠', '', '考古学', '', '地底'],
    ['埋葬', '', '愛', '', '物陰', '', '兵器', '', '天文学', '', '宇宙'],
  ];

  constructor(
    private panelService: PanelService,
    private modalService: ModalService
  ) { }

  ngOnInit(): void {
    this.character.insaneSkills
  }

  onSelectedCharacter(identifier: string) {
    let object = ObjectStore.instance.get(identifier);
    if (object instanceof GameCharacter) {
      this.character = object;
      let gameType = this.character.chatPalette ? this.character.chatPalette.dicebot : '';
      if (0 < gameType.length) this.gameType = gameType;
    }
  }

  // セルがクリックされたときの処理
  onCellClick(value: string) {
    console.log(value);
    this.selectedCell = value === this.selectedCell ? null : value;
  }

  // セルがinsaneSkillsに含まれるかどうかを判定
  isInsaneSkill(skill: string): boolean {
    return this.character.insaneSkills.includes(skill);
  }

  isFear(skill: string): boolean {
    return this.character.insaneFears.includes(skill);
  }

  // セルがinsaneCuriosityに一致するかどうかを判定
  isInsaneCuriosity(skill: string): boolean {
    return this.character.insaneCuriosity === skill;
  }

  getColumnsToHighlight(): number[] {
    const curiosityIndex = this.skillsTable[0].indexOf(this.character.insaneCuriosity);
    const adjacentIndices = [curiosityIndex - 1, curiosityIndex + 1].filter(index => index >= 0 && index < this.skillsTable[0].length);
    return [curiosityIndex, ...adjacentIndices];
  }
}
