import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    data: { expectedRoles: ['ADMIN', 'STAFF'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then(m => m.DashboardComponent),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./pages/category-list/category-list').then(m => m.CategoryListComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/product-list/product-list').then(m => m.ProductListComponent),
      },
      {
        path: 'product-variants',
        loadComponent: () =>
          import('./pages/variant-list/variant-list').then(m => m.VariantListComponent),
      },
      {
        path: 'rule-engine',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN'] },
        loadComponent: () =>
          import('./pages/rule-engine/rule-engine').then(m => m.RuleEngineComponent),
      },
      {
        path: 'users',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN'] },
        loadComponent: () =>
          import('./pages/users/users').then(m => m.UsersComponent),
      },
      {
        path: 'customer-groups',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN'] },
        loadComponent: () =>
          import('./pages/customer-groups/customer-groups').then(m => m.CustomerGroupsComponent),
      },
      {
        path: 'registration-forms',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN'] },
        loadComponent: () =>
          import('./pages/registration-forms/registration-forms').then(m => m.RegistrationFormsComponent),
      },
      {
        path: 'orders',
        loadComponent: () => import('./pages/orders/orders').then(m => m.OrdersComponent)
      },
      {
        path: 'ai-sync',
        loadComponent: () => import('./pages/ai-sync/ai-sync').then(m => m.AiSyncComponent)
      },
      {
        path: 'staff',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN'] },
        loadComponent: () => import('./pages/staff/staff').then(m => m.StaffComponent)
      },
      {
        path: 'banner-manager',
        loadComponent: () => import('./pages/banner-manager/banner-manager').then(m => m.BannerManagerComponent)
      },
      {
        path: 'coupons',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN'] },
        loadComponent: () => import('./pages/coupons/coupons').then(m => m.CouponsComponent)
      },
      {
        path: 'sale-campaigns',
        loadComponent: () => import('./pages/sale-campaigns/sale-campaigns').then(m => m.SaleCampaignsComponent)
      },
      {
        path: 'wallets',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN'] },
        loadComponent: () => import('./pages/wallets/wallets').then(m => m.WalletsComponent)
      },
      {
        path: 'advanced-reports',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN'] },
        loadComponent: () => import('./pages/advanced-reports/advanced-reports').then(m => m.AdvancedReportsComponent)
      },
      {
        path: 'messages',
        loadComponent: () => import('./pages/messages/messages').then(m => m.MessagesComponent)
      },
      {
        path: 'reviews',
        loadComponent: () => import('./pages/reviews/reviews').then(m => m.ReviewsComponent)
      },
      {
        path: 'permissions',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN'] },
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
  { path: '**', redirectTo: 'storefront' }
];
