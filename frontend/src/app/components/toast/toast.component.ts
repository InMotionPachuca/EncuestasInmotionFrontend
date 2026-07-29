import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { NotificationService, ToastMessage } from '../../services/notification.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-container" *ngIf="message">
      <div class="toast-message" [class]="'toast-' + type">
        <span class="toast-icon">{{ getIcon() }}</span>
        <span class="toast-text">{{ message }}</span>
        <button class="toast-close" (click)="close()">×</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      animation: slideIn 0.3s ease;
    }

    .toast-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: #1A1A1A;
      color: white;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.25);
      border-left: 4px solid #EB0A1E;
    }

    .toast-success {
      border-left-color: #2E7D32;
    }
    .toast-error {
      border-left-color: #EB0A1E;
    }
    .toast-warning {
      border-left-color: #F57F17;
    }
    .toast-info {
      border-left-color: #1565C0;
    }

    .toast-icon {
      font-size: 1.4rem;
      font-weight: 700;
    }

    .toast-text {
      flex: 1;
      font-size: 0.95rem;
      font-weight: 500;
    }

    .toast-close {
      background: none;
      border: none;
      color: rgba(255,255,255,0.5);
      font-size: 1.4rem;
      cursor: pointer;
      padding: 0 4px;
      transition: color 0.2s;
    }

    .toast-close:hover {
      color: white;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @media (max-width: 768px) {
      .toast-container {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  message: string = '';
  type: 'success' | 'error' | 'info' | 'warning' = 'info';
  private subscription: Subscription | null = null;

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.subscription = this.notificationService.toast$.subscribe((toast: ToastMessage | null) => {
      if (toast) {
        this.message = toast.message;
        this.type = toast.type;
      } else {
        this.message = '';
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  getIcon(): string {
    switch (this.type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  }

  close() {
    this.notificationService.clear();
  }
}