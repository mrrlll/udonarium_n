import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  constructor(private toastr: ToastrService) { }

  showSuccess(message: string, title: string) {
    this.toastr.success(message, title, {progressAnimation: 'increasing', closeButton: true});
  }

  showError(message: string, title: string) {
    this.toastr.error(message, title, {progressAnimation: 'increasing', closeButton: true});
  }
}
