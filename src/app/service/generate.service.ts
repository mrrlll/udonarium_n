import {Injectable} from '@angular/core';
import {HttpClient, HttpClientJsonpModule } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GenerateService {

  constructor(private http: HttpClient) { }

  get(URL: string){
    const data = URL.split("/");
    const site: string = data[2];
    const system: string = data[3];
    const key: string = data[4].split("key=")[1];

    switch (site){
      case "character-sheets.appspot.com":
        URL = `https://${site}/${system}/display?ajax=1&key=${key}`;
        console.log(URL)
        return this.http.jsonp<any>(URL, 'callback');
    }
  }
}
