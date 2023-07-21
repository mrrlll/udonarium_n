import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { saveAs } from 'file-saver';
import { EventSystem, Network } from '@udonarium/core/system';

@Injectable({
  providedIn: 'root'
})
export class UnsplashService {
  private apiUrl = 'https://api.unsplash.com';
  private accessKey = 'bWI8fdsKw0MiDGAPAHyraLZPj6hjHbUyO72k-1fXhCI';

  constructor(private http: HttpClient) { }

  searchPhotos(query: string): Observable<any> {
    const url = `${this.apiUrl}/search/photos?query=${query}&per_page=30&client_id=${this.accessKey}`;
    return this.http.get<any>(url);
  }

  downloadImage(photo: any) {
    const url = photo.urls.raw + '&auto=format&q=80&w=1080';

    this.http.get(url, { responseType: 'blob' })
      .subscribe((blob: Blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const imageDataUrl = reader.result as string;
          const imageBlob = this.dataURItoBlob(imageDataUrl);
          const filename = `${photo.id}.${photo.file_type}`;
          console.log(imageBlob.type);
          // 変数に格納された Blob オブジェクトを使って処理を続ける
        };
        reader.readAsDataURL(blob);
      });
  }

  private dataURItoBlob(dataURI: string): Blob {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }

  downloadPhoto(photoUrl: string, fileName: string){
    return this.http.get(photoUrl, { responseType: 'blob' }).subscribe((blob: Blob) => {
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    });
  }
}
