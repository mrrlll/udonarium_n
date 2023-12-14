import { SyncObject, SyncVar } from './core/synchronize-object/decorator';
import { GameObject } from './core/synchronize-object/game-object';
import { EventSystem } from './core/system';

@SyncObject('room-setting')
export class RoomSetting extends GameObject {
  @SyncVar() peerMenuAuthority: boolean = true;
  @SyncVar() chatWindowAuthority: boolean = true;
  @SyncVar() gameTableSettingAuthority: boolean = false;
  @SyncVar() fileStorageAuthority: boolean = false;
  @SyncVar() jukeboxAuthority: boolean = true;
  @SyncVar() gameObjectInventoryAuthority: boolean = false;
  @SyncVar() fileSelectAuthority: boolean = false;
  @SyncVar() fileSaveAuthority: boolean = false;
  @SyncVar() timerAuthority: boolean = true;
  @SyncVar() cutinAuthority: boolean = false;
  @SyncVar() gamePanelSettingAuthority: boolean = false;
  @SyncVar() overViewPanelAuthority: boolean = false;
  @SyncVar() isRoomAltitude: boolean = true;

  getMenuHeight(): number {
    let count = 0;
    if (this.peerMenuAuthority) count++;
    if (this.chatWindowAuthority) count++;
    if (this.gameTableSettingAuthority) count++;
    if (this.fileStorageAuthority) count++;
    if (this.jukeboxAuthority) count++;
    if (this.gameObjectInventoryAuthority) count++;
    if (this.fileSelectAuthority) count++;
    if (this.fileSaveAuthority) count++;
    if (this.timerAuthority) count++;
    if (this.cutinAuthority) count++;
    if (this.gamePanelSettingAuthority) count++;
    return 155 + count * 50;
  }

  onStoreAdded() {
    super.onStoreAdded();
  }

  onStoreRemoved() {
    super.onStoreRemoved();
    EventSystem.unregister(this);
  }
}
