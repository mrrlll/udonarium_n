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

  showInfo(message: string, title: string) {
    this.toastr.info(message, title, {progressAnimation: 'increasing', closeButton: true});
  }

  showWarning(message: string, title: string) {
    this.toastr.warning(message, title, {progressAnimation: 'increasing', closeButton: true});
  }
}
