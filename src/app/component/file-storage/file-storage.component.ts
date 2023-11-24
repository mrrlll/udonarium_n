import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';

import { FileArchiver } from '@udonarium/core/file-storage/file-archiver';
import { ImageFile } from '@udonarium/core/file-storage/image-file';
import { EventSystem } from '@udonarium/core/system';
import { ModalService } from 'service/modal.service';

import { PanelOption, PanelService } from 'service/panel.service';
import { UnsplashsearchComponent } from 'component/unsplashsearch/unsplashsearch.component';

import { ImageTagList } from '@udonarium/image-tag-list';
import { ImageTag } from '@udonarium/image-tag';
import { StringUtil } from '@udonarium/core/system/util/string-util';
import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import { UUID } from '@udonarium/core/system/util/uuid';
import { ConfirmationComponent, ConfirmationType } from 'component/confirmation/confirmation.component';
import { ChatMessageService } from 'service/chat-message.service';

import { AppConfigCustomService } from 'service/app-config-custom.service';



@Component({
  selector: 'file-storage',
  templateUrl: './file-storage.component.html',
  styleUrls: ['./file-storage.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('scaleInOut', [
      transition('void => *', [
        animate('200ms ease', keyframes([
          style({ transform: 'scale3d(0, 0, 0)', offset: 0 }),
          style({ transform: 'scale3d(1.0, 1.0, 1.0)', offset: 1.0 })
        ]))
      ]),
      transition('* => void', [
        animate('180ms ease', style({ transform: 'scale3d(0, 0, 0)' }))
      ])
    ]),
    trigger('fadeAndUpInOut', [
      transition('void => *', [
        animate('100ms ease-in-out', keyframes([
          style({ 'transform-origin': 'center bottom', transform: 'translateY(8px) scaleY(0)', opacity: 0.6 }),
          style({ 'transform-origin': 'center bottom', transform: 'translateY(0px) scaleY(1.0)', opacity: 1.0 })
        ]))
      ]),
      transition('* => void', [
        animate('100ms ease-in-out', style({ 'transform-origin': 'center bottom', transform: 'translateY(0px) scaleY(1.0)', opacity: 1.0 })),
        animate('100ms ease-in-out', style({ 'transform-origin': 'center bottom', transform: 'translateY(8px) scaleY(0)', opacity: 0.6 }))
      ])
    ])
  ]
})
export class FileStorageComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() isViewer: boolean;
  panelId;
  private _searchNoTagImage = true;
  serchCondIsOr = true;
  addingTagWord = '';
  searchWords: string[] = [];
  deletedWords: string[] = [];
  selectedImageFiles: ImageFile[] = [];

  isSort = true;
  static sortOrder: string[] = [];

  isShowHideImages = false;

  get images(): ImageFile[] {
    const searchResultImages = ImageTagList.searchImages(this.searchWords, (this.searchNoTagImage && this.countAllImagesHasWord(null) > 0), this.serchCondIsOr, this.isShowHideImages);
    const searchResultImageIdentifiers = searchResultImages.map(image => image.identifier);
    this.selectedImageFiles = this.selectedImageFiles.filter(image => searchResultImageIdentifiers.includes(image.identifier));
    return this.isSort ? ImageTagList.sortImagesByWords(searchResultImages, FileStorageComponent.sortOrder) : searchResultImages;
  }

  get searchNoTagImage(): boolean {
    return this._searchNoTagImage;
  }

  set searchNoTagImage(value: boolean) {
    if (value) {
      FileStorageComponent.sortOrder.unshift(null);
    } else {
      FileStorageComponent.sortOrder = FileStorageComponent.sortOrder.filter(key => key != null);
    }
    FileStorageComponent.sortOrder = Array.from(new Set(FileStorageComponent.sortOrder));
    this._searchNoTagImage = value;
    EventSystem.trigger('CHANGE_SORT_ORDER', null);
  }

  get searchAllImage(): boolean {
    if (!this.searchNoTagImage && this.countAllImagesHasWord(null) > 0) return false;
    for (const word of this.allImagesOwnWords) {
      if (!this.searchWords.includes(word)) {
        return false;
      }
    }
    return true;
  }

  get isSelected(): boolean {
    let ret = this.selectedImageFiles.length > 0;
    if (!ret) this.addingTagWord = '';
    return ret;
  }

  get selectedImagesIsHidden(): boolean {
    return ImageTagList.imagesIsHidden(this.selectedImageFiles);
  }

  get allImagesOwnWords(): string[] {
    return ImageTagList.allImagesOwnWords(this.isShowHideImages);
  }


  constructor(
    private changeDetector: ChangeDetectorRef,
    private panelService: PanelService,
    private modalService: ModalService,
    private chatMessageService: ChatMessageService,
    private appCustomService: AppConfigCustomService
  ) { }

  @Input() isViewAblePdf: boolean = true;

  isViewFile(file: ImageFile): boolean {
    if (!this.isViewAblePdf && file?.blob?.type.match(/pdf/)) {
      return false;
    }
    return true;
  }

  getFileUrl(file: ImageFile): string {
    if (file.url.length <= 0) {
      return 'assets/images/loading.gif';
    }

    if (file?.blob?.type.match(/pdf/)) {
      console.log(file.name);
      return file.thumbnail.url;
    }

    return file.url;
  }


  ngOnInit() {
    this.isViewer = this.appCustomService.dataViewer;
    this.isShowHideImages = this.isViewer;
    this.searchWords = this.allImagesOwnWords;
    this.panelId = UUID.generateUuid();
    Promise.resolve().then(() => {
      this.panelService.title = 'ファイル一覧';
      if (this.panelService?.className === 'isViewAblePdf') {
        this.isViewAblePdf = true;
      }
    });
  }

  ngAfterViewInit() {
    EventSystem.register(this)
    .on('SYNCHRONIZE_FILE_LIST', (event) => {
      if (event.isSendFromSelf) {
        this.changeDetector.markForCheck();
      }
    })
    .on('OPERATE_IMAGE_TAGS', (event) => {
      this.changeDetector.markForCheck();
    })
    .on('CHANGE_SORT_ORDER', (event) => {
      if (event.isSendFromSelf) this.changeDetector.markForCheck();
    });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  allImages(): ImageFile[] {
    return ImageTagList.allImages(this.isShowHideImages);
  }

  countAllImagesHasWord(word): number {
    return ImageTagList.countAllImagesHasWord(word, this.isShowHideImages);
  }

  countImagesHasWord(word): number {
    let count = 0;
    if (word != null && word.trim() === '') return count;
    for (const imageFile of this.images) {
      const imageTag = ImageTag.get(imageFile.identifier);
      if (word == null) {
        if (!imageTag || imageTag.tag == null || imageTag.tag.trim() == '') count++;
      } else {
        if (imageTag && imageTag.containsWords(word.trim(), false)) count++;
      }
    }
    return count;
  }

  handleFileSelect(event: Event) {
    let input = <HTMLInputElement>event.target;
    let files = input.files;
    if (files.length) FileArchiver.instance.load(files);
    input.value = '';
  }

  selected(file: ImageFile) {
    return this.selectedImageFiles.map(imageFile => imageFile.identifier).includes(file.identifier)
  }

  selectedImagesOwnWords(hasAll=false): string[] {
    return ImageTagList.imagesOwnWords(this.selectedImageFiles, hasAll);
  }

  onSelectedWord(searchWord: string) {
    //this.selectedImageFiles = [];
    if (searchWord == null || searchWord.trim() === '') return;
    if (this.searchWords.includes(searchWord)) {
      this.searchWords = this.searchWords.filter(word => searchWord !== word);
      FileStorageComponent.sortOrder = FileStorageComponent.sortOrder.filter(word => searchWord !== word);
    } else {
      this.searchWords.push(searchWord);
      FileStorageComponent.sortOrder.unshift(searchWord);
    }
    FileStorageComponent.sortOrder = Array.from(new Set(FileStorageComponent.sortOrder));
    EventSystem.trigger('CHANGE_SORT_ORDER', searchWord);
  }

  onSelectedFile(file: ImageFile) {
    if (file.url.length <= 0) return;
    if (this.selected(file)) {
      this.selectedImageFiles = this.selectedImageFiles.filter(imageFile => imageFile.identifier !== file.identifier);
    } else {
      this.selectedImageFiles.push(file);
    }
  }

  getTagWords(image: ImageFile): string[] {
    const imageTag = ImageTag.get(image.identifier);
    //console.log(imageTag ? imageTag.words : []);
    return imageTag ? imageTag.words : [];
  }

  getHidden(image: ImageFile): boolean {
    const imageTag = ImageTag.get(image.identifier);
    return imageTag ? imageTag.hide : false;
  }

  onSearchAllImage() {
    if (this.searchAllImage) {
      this.searchWords = [];
      this._searchNoTagImage = false;
    } else {
      this.searchWords = this.allImagesOwnWords;
      this._searchNoTagImage = true;
    }
  }

  onUnselect() {
    this.selectedImageFiles = [];
  }

  onShowHiddenImages($event: Event) {
    if (this.isShowHideImages) {
      this.isShowHideImages = false;
    } else {
      $event.preventDefault();
      this.modalService.open(ConfirmationComponent, {
        title: '非表示設定の画像を表示',
        text: '非表示設定の画像を表示しますか？',
        help: 'ネタバレなどにご注意ください。',
        type: ConfirmationType.OK_CANCEL,
        materialIcon: 'visibility',
        action: () => {
          this.chatMessageService.sendOperationLog('ファイル一覧 から非表示設定の画像を表示した');
          this.isShowHideImages = true;
          (<HTMLInputElement>$event.target).checked = true;
          this.changeDetector.markForCheck();
        }
      });
    }
  }

  setectedImagesToHidden(toHidden: boolean) {
    this.modalService.open(ConfirmationComponent, {
      title: toHidden ? '非表示に設定' : '非表示設定を解除',
      text: `画像${ toHidden ? 'を非表示に設定' : 'の非表示設定を解除'}しますか？`,
      help: toHidden ? '選択した画像を非表示に設定します。\nこれは「意図せずにネタバレを見てしまう」ことなどを防ぐものであり、他者から完全に隠すものではありません。' : '選択した画像の非表示設定を解除します。',
      type: ConfirmationType.OK_CANCEL,
      materialIcon: toHidden ? 'visibility_off' : 'visibility',
      action: () => {
        for (const image of this.selectedImageFiles) {
          const imageTag = ImageTag.get(image.identifier) || ImageTag.create(image.identifier);
          imageTag.hide = toHidden;
          EventSystem.call('OPERATE_IMAGE_TAGS', imageTag.identifier);
        }
      }
    });
  }

  addTagWord() {
    if (this.addingTagWord == null || this.addingTagWord.trim() == '') return;
    const words = this.addingTagWord.trim().split(/\s+/);
    this.modalService.open(ConfirmationComponent, {
      title: '画像にタグを追加',
      text: `画像にタグを追加しますか？`,
      helpHtml: '選択した画像に ' + words.map(word => `<b class="word-tag">${ StringUtil.escapeHtml(word) }</b>`).join(' ') + ' を追加します。',
      type: ConfirmationType.OK_CANCEL,
      materialIcon: 'sell',
      action: () => {
        let addedWords = null;
        for (const image of this.selectedImageFiles) {
          const imageTag = ImageTag.get(image.identifier) || ImageTag.create(image.identifier);
          //imageTag.addWords(words);
          //TODO いまのところ全部帰ってくるが実際に追加したタグだけを返して追加したい
          addedWords = imageTag.addWords(words);
        }
        if (addedWords) {
          if (this.serchCondIsOr) this.searchWords.push(...addedWords);
          FileStorageComponent.sortOrder.unshift(...addedWords);
        }
        if (this.serchCondIsOr) this.searchWords = Array.from(new Set(this.searchWords)).sort();
        FileStorageComponent.sortOrder = Array.from(new Set(FileStorageComponent.sortOrder));
        EventSystem.trigger('CHANGE_SORT_ORDER', addedWords);
        this.addingTagWord = '';
      }
    });
  }

  removeTagWord(word: string) {
    this.modalService.open(ConfirmationComponent, {
      title: '画像からタグを削除',
      text: `画像からタグを削除しますか？`,
      helpHtml: `選択した画像から <b class="word-tag">${ StringUtil.escapeHtml(word) }</b> を削除します。`,
      type: ConfirmationType.OK_CANCEL,
      materialIcon: 'sell',
      action: () => {
        if (word == null || word.trim() == '') return;
        for (const image of this.selectedImageFiles) {
          let imageTag = ImageTag.get(image.identifier);
          if (imageTag) imageTag.removeWords(word);
        }
        const allImagesOwnWords = this.allImagesOwnWords;
        this.searchWords = this.searchWords.filter(word => allImagesOwnWords.includes(word));
        this.deletedWords.push(word);
        this.deletedWords = Array.from(new Set(this.deletedWords));
        EventSystem.trigger('CHANGE_SORT_ORDER', this.deletedWords);
      }
    });
  }

  identify(index, image){
    return image.identifier;
  }

  suggestWords(): string[] {
    const selectedWords = this.selectedImagesOwnWords(true);
    return Array.from(new Set(this.allImagesOwnWords.concat(this.deletedWords))).filter(word => word.indexOf('*') !== 0 && !selectedWords.includes(word));
  }

  unsplashsearch() {
    let option: PanelOption = { width: 450, height: 600, left: 100, title: "Unsplash検索"}
    this.panelService.open<UnsplashsearchComponent>(UnsplashsearchComponent, option)
  }
}
