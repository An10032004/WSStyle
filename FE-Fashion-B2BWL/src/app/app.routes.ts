import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'categories', pathMatch: 'full' },
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
    path: 'plans',
    loadComponent: () => import('./pages/plans/plans').then(m => m.PlansComponent)
  },
  {
    path: 'shops',
    loadComponent: () => import('./pages/shops/shops').then(m => m.ShopsComponent)
  },
  {
    path: 'ai-sync',
    loadComponent: () => import('./pages/ai-sync/ai-sync').then(m => m.AiSyncComponent)
  },
  { path: '**', redirectTo: 'categories' }
];
