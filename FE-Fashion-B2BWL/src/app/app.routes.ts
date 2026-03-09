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
];
