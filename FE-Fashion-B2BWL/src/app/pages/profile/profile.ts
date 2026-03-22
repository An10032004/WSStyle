import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-container">
      <h1>My Profile</h1>
      <div class="profile-card" *ngIf="user$ | async as user">
        <div class="profile-header">
          <div class="avatar">{{ user.fullName?.charAt(0) }}</div>
          <h2>{{ user.fullName }}</h2>
          <span class="role-badge">{{ user.role }}</span>
        </div>
        <div class="profile-details">
          <div class="detail-item">
            <label>Email</label>
            <p>{{ user.email }}</p>
          </div>
          <div class="detail-item">
            <label>Phone</label>
            <p>{{ user.phone || 'Not provided' }}</p>
          </div>
          <div class="detail-item">
            <label>Company</label>
            <p>{{ user.companyName || 'Personal Account' }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      font-family: 'Inter', sans-serif;
    }
    .profile-card {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.05);
      border: 1px solid #f0f0f0;
    }
    .profile-header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 1px solid #f0f0f0;
      padding-bottom: 20px;
    }
    .avatar {
      width: 80px;
      height: 80px;
      background: #000;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 700;
      margin: 0 auto 15px;
    }
    .role-badge {
      display: inline-block;
      padding: 4px 12px;
      background: #f0f0f0;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 8px;
    }
    .detail-item {
      margin-bottom: 20px;
      label {
        font-size: 12px;
        color: #888;
        text-transform: uppercase;
        font-weight: 700;
        display: block;
        margin-bottom: 4px;
      }
      p {
        font-size: 16px;
        color: #333;
        margin: 0;
        font-weight: 500;
      }
    }
  `]
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  user$ = this.auth.user$;
}
