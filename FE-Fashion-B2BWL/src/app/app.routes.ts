import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    data: { expectedRoles: ['ADMIN', 'Administrator', 'STAFF'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        data: { module: 'dashboard' },
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then(m => m.DashboardComponent),
      },
      {
        path: 'categories',
        data: { module: 'categories' },
        loadComponent: () =>
          import('./pages/category-list/category-list').then(m => m.CategoryListComponent),
      },
      {
        path: 'products',
        data: { module: 'products' },
        loadComponent: () =>
          import('./pages/product-list/product-list').then(m => m.ProductListComponent),
      },
      {
        path: 'product-variants',
        data: { module: 'variants' },
        loadComponent: () =>
          import('./pages/variant-list/variant-list').then(m => m.VariantListComponent),
      },
      {
        path: 'rule-engine',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN', 'Administrator'], module: 'rule-engine' },
        loadComponent: () =>
          import('./pages/rule-engine/rule-engine').then(m => m.RuleEngineComponent),
      },
      {
        path: 'users',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN', 'Administrator'], module: 'users' },
        loadComponent: () =>
          import('./pages/users/users').then(m => m.UsersComponent),
      },
      {
        path: 'customer-groups',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN', 'Administrator'], module: 'customer-groups' },
        loadComponent: () =>
          import('./pages/customer-groups/customer-groups').then(m => m.CustomerGroupsComponent),
      },
      {
        path: 'registration-forms',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN', 'Administrator'], module: 'registration-forms' },
        loadComponent: () =>
          import('./pages/registration-forms/registration-forms').then(m => m.RegistrationFormsComponent),
      },
      {
        path: 'orders',
        data: { module: 'orders' },
        loadComponent: () => import('./pages/orders/orders').then(m => m.OrdersComponent)
      },
      {
        path: 'ai-sync',
        data: { module: 'ai-sync' },
        loadComponent: () => import('./pages/ai-sync/ai-sync').then(m => m.AiSyncComponent)
      },
      {
        path: 'staff',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN', 'Administrator'], module: 'staff' },
        loadComponent: () => import('./pages/staff/staff').then(m => m.StaffComponent)
      },
      {
        path: 'banner-manager',
        data: { module: 'home-settings' },
        loadComponent: () => import('./pages/banner-manager/banner-manager').then(m => m.BannerManagerComponent)
      },
      {
        path: 'coupons',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN', 'Administrator'], module: 'coupons' },
        loadComponent: () => import('./pages/coupons/coupons').then(m => m.CouponsComponent)
      },
      {
        path: 'sale-campaigns',
        data: { module: 'sale-campaigns' },
        loadComponent: () => import('./pages/sale-campaigns/sale-campaigns').then(m => m.SaleCampaignsComponent)
      },
      {
        path: 'wallets',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN', 'Administrator'], module: 'wallets' },
        loadComponent: () => import('./pages/wallets/wallets').then(m => m.WalletsComponent)
      },
      {
        path: 'advanced-reports',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN', 'Administrator'], module: 'advanced-reports' },
        loadComponent: () => import('./pages/advanced-reports/advanced-reports').then(m => m.AdvancedReportsComponent)
      },
      {
        path: 'messages',
        data: { module: 'messages' },
        loadComponent: () => import('./pages/messages/messages').then(m => m.MessagesComponent)
      },
      {
        path: 'reviews',
        data: { module: 'reviews' },
        loadComponent: () => import('./pages/reviews/reviews').then(m => m.ReviewsComponent)
      },
      {
        path: 'permissions',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN', 'Administrator'], module: 'permissions' },
        loadComponent: () => import('./pages/permissions/permissions').then(m => m.PermissionsComponent)
      },
    ]
  },
  {
    path: 'product/:id',
    loadComponent: () => import('./pages/product-detail/product-detail').then(m => m.ProductDetailComponent)
  },
  {
    path: 'storefront',
    loadComponent: () => import('./pages/storefront/storefront').then(m => m.StorefrontComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.RegisterComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent)
  },
  {
    path: 'shop',
    loadComponent: () => import('./pages/shop/shop').then(m => m.ShopComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./pages/cart/cart').then(m => m.CartComponent)
  },
  {
    path: 'checkout',
    loadComponent: () => import('./pages/checkout/checkout').then(m => m.CheckoutComponent)
  },
  {
    path: 'quick-order',
    loadComponent: () => import('./pages/quick-order-form/quick-order-form').then(m => m.QuickOrderFormComponent)
  },
  {
    path: 'shop/category/:id',
    loadComponent: () => import('./pages/shop/shop').then(m => m.ShopComponent)
  },
  {
    path: 'become-a-partner',
    loadComponent: () => import('./pages/register/b2b-register').then(m => m.B2BRegisterComponent)
  },
  {
    path: 'support',
    loadComponent: () => import('./pages/support/support').then(m => m.SupportComponent)
  },
  {
    path: 'customer-reviews',
    loadComponent: () => import('./pages/reviews/reviews').then(m => m.ReviewsComponent)
  },
  { path: '**', redirectTo: 'storefront' }
];
