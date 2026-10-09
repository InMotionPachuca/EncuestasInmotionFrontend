import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { NotificationService, ToastMessage } from '../../services/notification.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-container" *ngIf="message" [class.toast-fadeout]="isClosing">
      <div class="toast-card" [class]="'toast-' + type">
        <div class="toast-icon-wrapper">
          <i [class]="getIconClass()"></i>
        </div>
        <div class="toast-content">
          <span class="toast-title">{{ getTitle() }}</span>
          <span class="toast-text">{{ message }}</span>
        </div>
        <button class="toast-close-btn" (click)="close()" title="Cerrar">
          <i class="fas fa-times"></i>
        </button>
        <div class="toast-progress-bar">
          <div class="toast-progress-fill" [class]="'fill-' + type"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 99999;
      max-width: 420px;
      animation: toastEntrance 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .toast-fadeout {
      animation: toastExit 0.3s ease forwards;
    }

    .toast-card {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 16px 18px 18px;
      background: rgba(22, 23, 27, 0.96);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      color: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 10px 35px rgba(0, 0, 0, 0.35), 0 0 1px rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.08);
      overflow: hidden;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .toast-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
    }

    /* Icon badge with soft radial glow */
    .toast-icon-wrapper {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .toast-success .toast-icon-wrapper {
      background: rgba(46, 204, 113, 0.18);
      color: #2ECC71;
      border: 1px solid rgba(46, 204, 113, 0.3);
      box-shadow: 0 0 12px rgba(46, 204, 113, 0.2);
    }

    .toast-error .toast-icon-wrapper {
      background: rgba(231, 76, 60, 0.18);
      color: #E74C3C;
      border: 1px solid rgba(231, 76, 60, 0.3);
      box-shadow: 0 0 12px rgba(231, 76, 60, 0.2);
    }

    .toast-warning .toast-icon-wrapper {
      background: rgba(243, 156, 18, 0.18);
      color: #F39C12;
      border: 1px solid rgba(243, 156, 18, 0.3);
      box-shadow: 0 0 12px rgba(243, 156, 18, 0.2);
    }

    .toast-info .toast-icon-wrapper {
      background: rgba(197, 160, 89, 0.2);
      color: #C5A059;
      border: 1px solid rgba(197, 160, 89, 0.35);
      box-shadow: 0 0 12px rgba(197, 160, 89, 0.25);
    }

    /* Card accent border */
    .toast-success { border-left: 4px solid #2ECC71; }
    .toast-error   { border-left: 4px solid #E74C3C; }
    .toast-warning { border-left: 4px solid #F39C12; }
    .toast-info    { border-left: 4px solid #C5A059; }

    .toast-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .toast-title {
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      color: #E0E0E0;
    }

    .toast-text {
      font-size: 0.88rem;
      line-height: 1.45;
      color: #D1D5DB;
      font-weight: 400;
    }

    .toast-close-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.45);
      font-size: 0.95rem;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      transition: all 0.2s;
      margin-top: -2px;
    }

    .toast-close-btn:hover {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.1);
    }

    /* Progress bar timer */
    .toast-progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(255, 255, 255, 0.08);
    }

    .toast-progress-fill {
      height: 100%;
      width: 100%;
      animation: toastProgress 4s linear forwards;
    }

    .fill-success { background: #2ECC71; }
    .fill-error   { background: #E74C3C; }
    .fill-warning { background: #F39C12; }
    .fill-info    { background: #C5A059; }

    @keyframes toastProgress {
      from { width: 100%; }
      to   { width: 0%; }
    }

    @keyframes toastEntrance {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.94);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes toastExit {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(-15px) scale(0.94);
      }
    }

    @media (max-width: 768px) {
      .toast-container {
        top: 14px;
        right: 14px;
        left: 14px;
        max-width: none;
      }
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  message: string = '';
  type: 'success' | 'error' | 'info' | 'warning' = 'info';
  isClosing: boolean = false;
  private subscription: Subscription | null = null;
  private timeoutId: any = null;

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.subscription = this.notificationService.toast$.subscribe((toast: ToastMessage | null) => {
      if (toast) {
        this.isClosing = false;
        this.message = toast.message;
        this.type = toast.type;

        if (this.timeoutId) clearTimeout(this.timeoutId);
        // Start fadeout 300ms before clearing
        this.timeoutId = setTimeout(() => {
          this.isClosing = true;
        }, 3700);
      } else {
        this.message = '';
        this.isClosing = false;
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  getIconClass(): string {
    switch (this.type) {
      case 'success': return 'fas fa-check-circle';
      case 'error':   return 'fas fa-exclamation-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      default:        return 'fas fa-info-circle';
    }
  }

  getTitle(): string {
    switch (this.type) {
      case 'success': return 'Éxito';
      case 'error':   return 'Atención';
      case 'warning': return 'Advertencia';
      default:        return 'Notificación';
    }
  }

  close() {
    this.isClosing = true;
    setTimeout(() => {
      this.notificationService.clear();
      this.isClosing = false;
    }, 250);
  }
}