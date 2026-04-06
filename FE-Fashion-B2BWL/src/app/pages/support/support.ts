import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiAccordion, TuiAccordionItem } from '@taiga-ui/kit';
import { StorefrontHeaderComponent } from '../../shared/components/storefront-header/storefront-header';
import { StorefrontFooterComponent } from '../../shared/components/storefront-footer/storefront-footer';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [
    CommonModule, 
    TuiButton, 
    TuiIcon, 
    TuiAccordion, 
    TuiAccordionItem, 
    StorefrontHeaderComponent, 
    StorefrontFooterComponent
  ],
  template: `
    <div class="support-page">
      <app-storefront-header></app-storefront-header>
      
      <!-- Premium Hero Section -->
      <section class="support-hero">
        <div class="glow-sphere sphere-1"></div>
        <div class="glow-sphere sphere-2"></div>
        
        <div class="hero-content">
          <span class="hero-tag">SUPPORT PORTAL</span>
          <h1>Hỗ trợ khách hàng</h1>
          <p>Chúng tôi ở đây để giúp bạn có trải nghiệm mua sắm hoàn hảo nhất</p>
          
          <div class="search-box-mock">
            <tui-icon icon="@tui.search"></tui-icon>
            <input type="text" placeholder="Tìm câu trả lời của bạn..." readonly>
          </div>
        </div>
      </section>

      <div class="support-container">
        <div class="support-grid">
          
          <!-- Left: Contact Methods (Glassmorphism) -->
          <div class="contact-info-panel">
            <div class="info-card">
              <div class="icon-wrapper phone">
                <tui-icon icon="@tui.phone-call"></tui-icon>
              </div>
              <div class="card-content">
                <h3>Hotline hỗ trợ</h3>
                <p>0906.880.960</p>
                <span>Chăm sóc khách hàng tận tâm</span>
                <button tuiButton appearance="secondary" size="s" class="action-btn">Gọi ngay</button>
              </div>
            </div>

            <div class="info-card">
              <div class="icon-wrapper email">
                <tui-icon icon="@tui.mail"></tui-icon>
              </div>
              <div class="card-content">
                <h3>Email trực tiếp</h3>
                <p>support@wsstyle.com</p>
                <span>Hỗ trợ các vấn đề kỹ thuật</span>
                <button tuiButton appearance="secondary" size="s" class="action-btn">Gửi mail</button>
              </div>
            </div>

            <div class="info-card">
              <div class="icon-wrapper chat">
                <tui-icon icon="@tui.message-circle"></tui-icon>
              </div>
              <div class="card-content">
                <h3>Chat trực tuyến</h3>
                <p>Zalo / Messenger</p>
                <span>Phản hồi cực nhanh trong 5p</span>
                <button tuiButton appearance="secondary" size="s" class="action-btn">Bắt đầu chat</button>
              </div>
            </div>
          </div>

          <!-- Right: FAQ Section (Refined UI) -->
          <div class="faq-panel">
            <div class="panel-header">
              <h2>Câu hỏi thường gặp</h2>
              <p>Lời giải đáp nhanh cho những thắc mắc phổ biến</p>
            </div>

            <tui-accordion [rounded]="false" class="custom-accordion">
              <tui-accordion-item>
                Chính sách đổi trả hàng như thế nào?
                <ng-template tuiAccordionItemContent>
                  <div class="faq-answer">
                    <p>Chúng tôi hỗ trợ đổi trả trong vòng <strong>7 ngày</strong> kể từ ngày nhận hàng với điều kiện sản phẩm còn nguyên tem mác và chưa qua sử dụng.</p>
                    <ul>
                      <li>Miễn phí đổi hàng do lỗi sản xuất</li>
                      <li>Hỗ trợ đổi size linh hoạt</li>
                      <li>Hoàn tiền nhanh chóng</li>
                    </ul>
                  </div>
                </ng-template>
              </tui-accordion-item>
              
              <tui-accordion-item>
                Thời gian giao hàng là bao lâu?
                <ng-template tuiAccordionItemContent>
                  <div class="faq-answer">
                    <p>Thời gian giao hàng ước tính dựa trên vị trí của bạn:</p>
                    <div class="stat-grid">
                      <div class="stat-item">
                        <strong>Nội thành HCM</strong>
                        <span>1 - 2 ngày</span>
                      </div>
                      <div class="stat-item">
                        <strong>Tỉnh thành khác</strong>
                        <span>3 - 5 ngày</span>
                      </div>
                    </div>
                  </div>
                </ng-template>
              </tui-accordion-item>
              
              <tui-accordion-item>
                Tôi có thể thanh toán bằng những hình thức nào?
                <ng-template tuiAccordionItemContent>
                  <div class="faq-answer">
                    <p>Bạn có thể lựa chọn phương thức thanh toán phù hợp nhất:</p>
                    <div class="payment-icons">
                      <span class="p-card">Thanh toán khi nhận hàng (COD)</span>
                      <span class="p-card">Thẻ ngân hàng / Chuyển khoản</span>
                      <span class="p-card">Ví điện tử MoMo / VNPay</span>
                    </div>
                  </div>
                </ng-template>
              </tui-accordion-item>
              
              <tui-accordion-item>
                Làm thế nào để trở thành đối tác sỉ?
                <ng-template tuiAccordionItemContent>
                  <div class="faq-answer">
                    <p>Chúng tôi luôn chào đón các đối tác kinh doanh mới. Vui lòng gửi thông tin của bạn qua mục "Trở thành đối tác" hoặc trực tiếp nhắn tin cho chúng tôi. Đội ngũ B2B sẽ phản hồi trong vòng 24 giờ làm việc.</p>
                  </div>
                </ng-template>
              </tui-accordion-item>
            </tui-accordion>

            <div class="faq-footer">
              <p>Vẫn còn thắc mắc? <a href="#">Gửi Ticket hỗ trợ</a></p>
            </div>
          </div>
        </div>
      </div>

      <app-storefront-footer></app-storefront-footer>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

    .support-page { 
      background: #f8fafc; 
      min-height: 100vh; 
      font-family: 'Outfit', sans-serif; 
      overflow-x: hidden;
    }

    /* Premium Hero with Dynamic Glows */
    .support-hero { 
      background: #0f172a; 
      padding: 140px 20px 180px; 
      text-align: center; 
      color: white;
      position: relative;
      overflow: hidden;
      
      .glow-sphere {
        position: absolute;
        width: 600px;
        height: 600px;
        border-radius: 50%;
        filter: blur(120px);
        opacity: 0.15;
        z-index: 1;
      }
      .sphere-1 { background: #6366f1; top: -200px; left: -100px; }
      .sphere-2 { background: #8b5cf6; bottom: -200px; right: -100px; }

      .hero-content {
        position: relative;
        z-index: 10;
        max-width: 800px;
        margin: 0 auto;
        animation: fadeInDown 0.8s ease-out;
      }

      .hero-tag {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 2px;
        color: #818cf8;
        display: block;
        margin-bottom: 20px;
      }

      h1 { 
        font-size: 56px; 
        font-weight: 800; 
        margin-bottom: 20px; 
        letter-spacing: -1px;
        line-height: 1.1;
        color: #ffffff; /* Explicitly set to white for maximum contrast */
      }
      
      p { 
        font-size: 20px; 
        color: #e2e8f0; /* Lighter gray for better visibility on dark bg */
        max-width: 600px; 
        margin: 0 auto 40px;
        font-weight: 400;
      }

      .search-box-mock {
        background: rgba(255,255,255,0.08);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.2);
        max-width: 480px;
        margin: 0 auto;
        padding: 16px 24px;
        border-radius: 40px;
        display: flex;
        align-items: center;
        gap: 12px;
        color: #94a3b8;
        box-shadow: 0 4px 60px rgba(0,0,0,0.4);
        
        input { 
          background: transparent; 
          border: none; 
          color: white; 
          font-size: 16px; 
          width: 100%;
          outline: none;
        }
      }
    }

    .support-container { 
      max-width: 1300px; 
      margin: -100px auto 100px; 
      padding: 0 30px; 
      position: relative; 
      z-index: 20; 
    }

    .support-grid { 
      display: grid; 
      grid-template-columns: 400px 1fr; 
      gap: 50px; 
    }
    
    /* Modern Contact Cards */
    .contact-info-panel { 
      display: flex; 
      flex-direction: column; 
      gap: 24px; 
    }

    .info-card { 
      background: rgba(255,255,255,0.8); 
      backdrop-filter: blur(10px);
      padding: 32px; 
      border-radius: 30px; 
      box-shadow: 0 20px 50px rgba(0,0,0,0.06);
      border: 1px solid rgba(255,255,255,0.5);
      display: flex;
      gap: 24px;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      cursor: default;

      &:hover {
        transform: translateY(-8px) scale(1.02);
        background: white;
        box-shadow: 0 30px 60px rgba(99, 102, 241, 0.15);
        .icon-wrapper { transform: rotate(10deg); }
      }

      .icon-wrapper {
        width: 64px;
        height: 64px;
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: transform 0.4s;
        
        tui-icon { font-size: 28px; color: white; }
        
        &.phone { background: linear-gradient(135deg, #6366f1, #4338ca); }
        &.email { background: linear-gradient(135deg, #8b5cf6, #6d28d9); }
        &.chat { background: linear-gradient(135deg, #0ea5e9, #0369a1); }
      }

      .card-content {
        h3 { font-size: 15px; font-weight: 700; color: #64748b; margin-bottom: 6px; letter-spacing: 0.5px; }
        p { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
        span { font-size: 13px; color: #94a3b8; display: block; margin-bottom: 16px; }
        .action-btn { font-weight: 600; border-radius: 12px; }
      }
    }

    /* Refined FAQ Panel */
    .faq-panel { 
      background: white; 
      padding: 60px; 
      border-radius: 40px; 
      box-shadow: 0 40px 100px rgba(0,0,0,0.03);
      border: 1px solid #f1f5f9;
      
      .panel-header {
        margin-bottom: 48px;
        h2 { font-size: 32px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
        p { font-size: 16px; color: #64748b; }
      }
    }

    .faq-answer {
      padding: 10px 0 20px;
      p { font-size: 16px; color: #475569; margin-bottom: 16px; line-height: 1.7; }
      ul { 
        padding-left: 20px; margin-bottom: 20px;
        li { color: #64748b; margin-bottom: 8px; font-size: 15px; }
      }
    }

    .stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      background: #f8fafc;
      padding: 20px;
      border-radius: 20px;
      
      .stat-item {
        strong { display: block; font-size: 14px; color: #64748b; margin-bottom: 4px; }
        span { font-size: 18px; font-weight: 700; color: #0f172a; }
      }
    }

    .payment-icons {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      .p-card { 
        background: white; 
        border: 1px solid #e2e8f0; 
        padding: 8px 16px; 
        border-radius: 10px; 
        font-size: 14px;
        font-weight: 600;
        color: #475569;
      }
    }

    .faq-footer {
      margin-top: 60px;
      padding-top: 40px;
      border-top: 1px solid #f1f5f9;
      text-align: center;
      p { font-weight: 600; color: #64748b; }
      a { color: #6366f1; text-decoration: none; border-bottom: 2px solid rgba(99, 102, 241, 0.2); padding-bottom: 2px; }
    }

    ::ng-deep {
      .custom-accordion {
        tui-accordion-item { 
          border-bottom: 1px solid #f1f5f9 !important;
          transition: background 0.3s;
          
          &:hover { background: #fafafa; }
          
          .t-header { 
            font-weight: 700 !important; 
            font-size: 18px !important; 
            padding: 28px 0 !important; 
            color: #1e293b !important;
            transition: color 0.3s !important;
          }
          
          &[data-state="open"] .t-header { color: #6366f1 !important; }
        }
      }
    }

    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 1100px) {
      .support-grid { grid-template-columns: 1fr; }
      .contact-info-panel { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
      .support-hero h1 { font-size: 42px; }
    }

    @media (max-width: 600px) {
      .faq-panel { padding: 30px; }
      .stat-grid { grid-template-columns: 1fr; }
      .support-hero { padding: 100px 20px 140px; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportComponent {}
