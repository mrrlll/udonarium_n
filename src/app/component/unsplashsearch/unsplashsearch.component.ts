import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { PanelOption, PanelService } from 'service/panel.service';
import { ImageFile } from '@udonarium/core/file-storage/image-file';
import { FileArchiver } from '@udonarium/core/file-storage/file-archiver';
import { EventSystem, Network } from '@udonarium/core/system';

import { UnsplashService } from 'service/unsplash.service';

@Component({
  selector: 'app-unsplashsearch',
  templateUrl: './unsplashsearch.component.html',
  styleUrls: ['./unsplashsearch.component.css']
})
export class UnsplashsearchComponent implements OnInit {
  searchTerm: String
  photos: any[] = [];
  constructor(private changeDetector: ChangeDetectorRef, private panelService: PanelService, private unsplashService: UnsplashService) {}
  ngOnInit() {
  }

  search() {
    this.unsplashService.searchPhotos(`${this.searchTerm}`).subscribe(data => { this.photos = data.results;})
  }

  isViewFile(file: ImageFile): boolean {
    return true;
  }

  onSelectedFile(file: ImageFile) {
    console.log('onSelectedFile', file);
    EventSystem.call('SELECT_FILE', { fileIdentifier: file.identifier }, Network.peerId);
  }

  handleFileSelect(event: Event) {
    let input = <HTMLInputElement>event.target;
    let files = input.files;
    if (files.length) FileArchiver.instance.load(files);
    input.value = '';
  }
  onClick(photo) {
    console.log(photo)
    // let file = this.unsplashService.downloadImage(photo);
    this.unsplashService.downloadPhoto(photo.urls.regular, photo.id)

  }
  onDragStart(event: DragEvent, photo: any) {
    event.dataTransfer.setData('image/jpg', photo);
  }
}
