import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UnsplashService {
  private apiUrl = 'https://api.unsplash.com';
  private accessKey = 'bWI8fdsKw0MiDGAPAHyraLZPj6hjHbUyO72k-1fXhCI';

  constructor(private http: HttpClient) { }

  searchPhotos(query: string): Observable<any> {
    // const url = `${this.apiUrl}/search/photos?query=${query}&per_page=30&client_id=${this.accessKey}`;
    const url = `${this.apiUrl}/search/photos?query=cat&per_page=30&client_id=${this.accessKey}`;
    return this.http.get<any>(url);
  }
}
