import { GamePanel } from '@udonarium/game-panel';
import { saveAs } from 'file-saver';
import * as JSZip from 'jszip';
import { ObjectStore } from '../synchronize-object/object-store';

import { EventSystem } from '../system';
import { XmlUtil } from '../system/util/xml-util';
import { AudioStorage } from './audio-storage';
import { FileReaderUtil } from './file-reader-util';
import { ImageFile } from './image-file';
import { ImageStorage } from './image-storage';
import { MimeType } from './mime-type';

import { XMLParser, XMLBuilder } from 'fast-xml-parser';

type MetaData = { percent: number; currentFile: string };
type UpdateCallback = (metadata: MetaData) => void;

const MEGA_BYTE = 1024 * 1024;

export class FileArchiver {
  private static _instance: FileArchiver;
  static get instance(): FileArchiver {
    if (!FileArchiver._instance) FileArchiver._instance = new FileArchiver();
    return FileArchiver._instance;
  }

  private maxImageSize = 2 * MEGA_BYTE;
  private maxAudioeSize = 10 * MEGA_BYTE;
  private maxPdfSize = 100 * MEGA_BYTE;

  private callbackOnDragEnter;
  private callbackOnDragOver;
  private callbackOnDrop;
  private isFirstDrop: boolean;

  private constructor() {
    console.log('FileArchiver ready...');
  }

  initialize() {
    this.destroy();
    this.addEventListeners();
  }

  private destroy() {
    this.removeEventListeners();
  }

  private addEventListeners() {
    this.removeEventListeners();
    this.callbackOnDragEnter = (e) => this.onDragEnter(e);
    this.callbackOnDragOver = (e) => this.onDragOver(e);
    this.callbackOnDrop = (e) => this.onDrop(e);
    document.body.addEventListener('dragenter', this.callbackOnDragEnter, false);
    document.body.addEventListener('dragover', this.callbackOnDragOver, false);
    document.body.addEventListener('drop', this.callbackOnDrop, false);
  }

  private removeEventListeners() {
    document.body.removeEventListener('dragenter', this.callbackOnDragEnter, false);
    document.body.removeEventListener('dragover', this.callbackOnDragOver, false);
    document.body.removeEventListener('drop', this.callbackOnDrop, false);
    this.callbackOnDragEnter = null;
    this.callbackOnDragOver = null;
    this.callbackOnDrop = null;
  }

  private onDragEnter(event: DragEvent) {
    event.preventDefault();
  }

  private onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  private onDrop(event: DragEvent) {
    event.preventDefault();

    console.log('onDrop', event.dataTransfer);
    let files = event.dataTransfer.files;
    this.isFirstDrop = true;
    this.load(files);
  }

  async load(files: File[]): Promise<void>;
  async load(files: FileList): Promise<void>;
  async load(files: any): Promise<void> {

    let loadFiles: File[] = files instanceof FileList ? toArrayOfFileList(files) : files;
    console.log(files)
    for (let file of loadFiles) {
      console.log(file.type)
      await this.handleImage(file);
      const filename: string = file.name;
      const pdfFile: ImageFile = await this.handlePdf(file);
      await this.handleAudio(file);
      await this.handleText(file);
      await this.handleZip(file);
      // await this.handleUnsplash(file);
      EventSystem.trigger('FILE_LOADED', { file: file });

      // pdfFileに該当するパネル追加
      if (this.isFirstDrop && pdfFile) {
        let gamePanel = new GamePanel();
        gamePanel.title = filename;
        gamePanel.imageIdentifier = pdfFile.identifier;
        gamePanel.initialize();
        ObjectStore.instance.add(gamePanel);
      }
    }
  }

  private async handleImage(file: File) {
    if (file.type.indexOf('image/') < 0) return;
    if (this.maxImageSize < file.size) {
      console.warn(`File size limit exceeded. -> ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }
    console.log(file.name + ' type:' + file.type);
    await ImageStorage.instance.addAsync(file);
  }

  private async handleUnsplash(file: File) {
    if (file.type.indexOf('image/') < 0) return;
    if (this.maxImageSize < file.size) {
      console.warn(`File size limit exceeded. -> ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }
    console.log(file.name + ' type:' + file.type);
    await ImageStorage.instance.addAsync(file);
  }

  private async handleAudio(file: File) {
    if (file.type.indexOf('audio/') < 0) return;
    if (this.maxAudioeSize < file.size) {
      console.warn(`File size limit exceeded. -> ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }
    console.log(file.name + ' type:' + file.type);
    await AudioStorage.instance.addAsync(file);
  }

  private async handleText(file: File): Promise<void> {
    if (file.type.indexOf('text/xml') === 0){
      try {
        let xmlElement: Element = XmlUtil.xml2element(await FileReaderUtil.readAsTextAsync(file));
        if (xmlElement) EventSystem.trigger('XML_LOADED', { xmlElement: xmlElement });
      } catch (reason) {
        console.warn(reason);
      }
    }
    if (file.type.indexOf('text/plain') === 0){
      if (file) {
        this.readFileContents(file);
      }
    }
  }

  private readFileContents(file: File) {
    const xb = new XMLBuilder({
      ignoreAttributes: false,
      textNodeName: "#text",
      attributeNamePrefix: "@_",
      format: true,
      cdataPropName: "__cdata",
    });
    const reader = new FileReader();
    reader.onload = (event: any) => {
      const fileContents = event.target.result;
      // console.log(fileContents);
      let json = {
        "text-note": {
          "data": {
            "data": {
              "data": [
                {
                  "#text": 10,
                  "@_name": "width"
                },
                {
                  "#text": 3,
                  "@_name": "height"
                },
                {
                  "#text": 5,
                  "@_name": "fontsize"
                },
                {
                  "#text": `${file.name}`,
                  "@_name": "title"
                },
                {
                  "#text": `${fileContents}`,
                  "@_type": "note",
                  "@_name": "text"
                },
              ],
              "@_name": "common",
            },
            "@_name": "text-note"
          },
          "@_location.name": "table"
        },
      }
      const xmlContent = xb.build(json);
      console.log(xmlContent)
      let xmlElement = XmlUtil.xml2element(xmlContent);
      if (xmlElement) EventSystem.trigger('XML_LOADED', { xmlElement: xmlElement });
    };
    reader.readAsText(file);
  }

  private async handlePdf(file: File): Promise<ImageFile> {
    if (file.type.indexOf('application/pdf') < 0) return;
    if (this.maxPdfSize < file.size) {
      alert('ファイルサイズが100Mb以上のものはアップロードできません');
      return;
    }
    console.log(file.name + ' type:' + file.type);
    return await ImageStorage.instance.addAsync(file);
  }

  private async handleZip(file: File) {
    if (!(0 <= file.type.indexOf('application/') || file.type.length < 1)) return;
    if (file.type.indexOf('application/pdf') >= 0) return;
    this.isFirstDrop = false;

    let zip = new JSZip();
    try {
      zip = await zip.loadAsync(file);
    } catch (reason) {
      console.warn(reason);
      return;
    }
    let zipEntries: JSZip.JSZipObject[] = [];
    zip.forEach((relativePath, zipEntry) => zipEntries.push(zipEntry));
    for (let zipEntry of zipEntries) {
      try {
        let arraybuffer = await zipEntry.async('arraybuffer');
        console.log(zipEntry.name + ' 解凍...');
        await this.load([new File([arraybuffer], zipEntry.name, { type: MimeType.type(zipEntry.name) })]);
      } catch (reason) {
        console.warn(reason);
      }
    }
  }
  async saveAsync(files: File[], zipName: string, updateCallback?: UpdateCallback): Promise<void>;
  async saveAsync(files: FileList, zipName: string, updateCallback?: UpdateCallback): Promise<void>;
  async saveAsync(files: any, zipName: string, updateCallback?: UpdateCallback): Promise<void> {
    if (!files) return;
    let saveFiles: File[] = files instanceof FileList ? toArrayOfFileList(files) : files;

    let zip = new JSZip();
    for (let file of saveFiles) {
      zip.file(file.name, file);
    }

    let blob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6,
        },
      },
      updateCallback
    );
    saveAs(blob, zipName + '.zip');
  }
}

function toArrayOfFileList(fileList: FileList): File[] {
  let files: File[] = [];
  let length = fileList.length;
  for (let i = 0; i < length; i++) {
    files.push(fileList[i]);
  }
  return files;
}
