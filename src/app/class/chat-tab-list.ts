import { ChatTab } from './chat-tab';
import { SyncObject, SyncVar } from './core/synchronize-object/decorator';
import { ObjectNode } from './core/synchronize-object/object-node';
import { InnerXml } from './core/synchronize-object/object-serializer';

import { Network } from '@udonarium/core/system';

@SyncObject('chat-tab-list')
export class ChatTabList extends ObjectNode implements InnerXml {
  @SyncVar() _systemMessageTabIndex: number = 0;
  private static _instance: ChatTabList;
  static get instance(): ChatTabList {
    if (!ChatTabList._instance) {
      ChatTabList._instance = new ChatTabList('ChatTabList');
      ChatTabList._instance.initialize();
    }
    return ChatTabList._instance;
  }

  set systemMessageTabIndex(index: number){
    this._systemMessageTabIndex = index;
  }

  get systemMessageTabIndex(): number{
    return this._systemMessageTabIndex;
  }

  get systemMessageTab(): ChatTab{
    return this.chatTabs.length > this.systemMessageTabIndex ? this.chatTabs[this.systemMessageTabIndex] : null;
  }
  
  public tachieHeightValue = 200;
  public minTachieSize = 100;
  public maxTachieSize = 500;
  public isTachieInWindow = false;
  public isKeepTachieOutWindow = false;

  get chatTabs(): ChatTab[] { return this.children as ChatTab[]; }

  //チャット簡易表示フラグ、拡張余地のため整数型
  private simpleDispFlagTime_ : number = 0;
  set simpleDispFlagTime( flag : number ){
    this.simpleDispFlagTime_ = flag;
  }
  
  get simpleDispFlagTime(): number{
    return this.simpleDispFlagTime_;
  }

  private simpleDispFlagUserId_ : number = 0;
  set simpleDispFlagUserId(flag : number){
    this.simpleDispFlagUserId_ = flag;
  }
  get simpleDispFlagUserId(): number{
    return this.simpleDispFlagUserId_;
  }

  addChatTab(chatTab: ChatTab): ChatTab
  addChatTab(tabName: string, identifier?: string): ChatTab
  addChatTab(...args: any[]): ChatTab {
    let chatTab: ChatTab = null;
    if (args[0] instanceof ChatTab) {
      chatTab = args[0];
    } else {
      let tabName: string = args[0];
      let identifier: string = args[1];
      chatTab = new ChatTab(identifier);
      chatTab.name = tabName;
      chatTab.initialize();
    }
    return this.appendChild(chatTab);
  }

  parseInnerXml(element: Element) {
    // XMLからの新規作成を許可せず、既存のオブジェクトを更新する
    for (let child of ChatTabList.instance.children) {
      child.destroy();
    }

    let context = ChatTabList.instance.toContext();
    context.syncData = this.toContext().syncData;
    ChatTabList.instance.apply(context);
    ChatTabList.instance.update();

    super.parseInnerXml.apply(ChatTabList.instance, [element]);
    this.destroy();
  }
}