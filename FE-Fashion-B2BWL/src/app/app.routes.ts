import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
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
        loadComponent: () =>
          import('./pages/rule-engine/rule-engine').then(m => m.RuleEngineComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/users/users').then(m => m.UsersComponent),
      },
      {
        path: 'customer-groups',
        loadComponent: () =>
          import('./pages/customer-groups/customer-groups').then(m => m.CustomerGroupsComponent),
      },
      {
        path: 'registration-forms',
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
        loadComponent: () => import('./pages/staff/staff').then(m => m.StaffComponent)
      },
      {
        path: 'banner-manager',
        loadComponent: () => import('./pages/banner-manager/banner-manager').then(m => m.BannerManagerComponent)
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
  { path: '**', redirectTo: 'storefront' }
];
