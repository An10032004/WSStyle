import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map, shareReplay, tap } from 'rxjs';
import { 
  ApiService, 
  PricingRule, 
  ShippingRule, 
  OrderLimit, 
  User, 
  Category, 
  Product, 
  CustomerGroup 
} from '../services/api.service';

@Injectable({
  providedIn: 'root'
})
export class AdminFacade {
  private readonly api = inject(ApiService);

  // --- State Subjects ---
  private readonly pricingRulesSubject = new BehaviorSubject<PricingRule[]>([]);
  private readonly shippingRulesSubject = new BehaviorSubject<ShippingRule[]>([]);
  private readonly orderLimitsSubject = new BehaviorSubject<OrderLimit[]>([]);
  private readonly usersSubject = new BehaviorSubject<User[]>([]);

  private readonly categoriesSubject = new BehaviorSubject<Category[]>([]);
  private readonly productsSubject = new BehaviorSubject<Product[]>([]);
  private readonly customerGroupsSubject = new BehaviorSubject<CustomerGroup[]>([]);

  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  // --- Observables (Streams) ---
  readonly pricingRules$ = this.pricingRulesSubject.asObservable();
  readonly shippingRules$ = this.shippingRulesSubject.asObservable();
  readonly orderLimits$ = this.orderLimitsSubject.asObservable();
  readonly users$ = this.usersSubject.asObservable();

  readonly categories$ = this.categoriesSubject.asObservable().pipe(shareReplay(1));
  readonly products$ = this.productsSubject.asObservable().pipe(shareReplay(1));
  readonly customerGroups$ = this.customerGroupsSubject.asObservable().pipe(shareReplay(1));

  readonly loading$ = this.loadingSubject.asObservable();

  constructor() {
    // Eager loading of shared base data
    this.refreshCommonData();
  }

  // --- Data Loading Actions ---

  refreshCommonData(): void {
    this.api.getCategories().subscribe(data => this.categoriesSubject.next(data));
    this.api.getProducts().subscribe(data => this.productsSubject.next(data));
    this.api.getCustomerGroups().subscribe(data => this.customerGroupsSubject.next(data));
  }

  loadPricingRules(): void {
    this.loadingSubject.next(true);
    this.api.getPricingRules().subscribe({
      next: (data) => {
        this.pricingRulesSubject.next(data);
        this.loadingSubject.next(false);
      },
      error: () => this.loadingSubject.next(false)
    });
  }

  loadShippingRules(): void {
    this.loadingSubject.next(true);
    this.api.getShippingRules().subscribe({
      next: (data) => {
        this.shippingRulesSubject.next(data);
        this.loadingSubject.next(false);
      },
      error: () => this.loadingSubject.next(false)
    });
  }

  loadOrderLimits(): void {
    this.loadingSubject.next(true);
    this.api.getOrderLimits().subscribe({
      next: (data) => {
        this.orderLimitsSubject.next(data);
        this.loadingSubject.next(false);
      },
      error: () => this.loadingSubject.next(false)
    });
  }

  loadUsers(): void {
    this.loadingSubject.next(true);
    this.api.getUsers().subscribe({
      next: (data) => {
        this.usersSubject.next(data);
        this.loadingSubject.next(false);
      },
      error: () => this.loadingSubject.next(false)
    });
  }

  // --- Mutation Actions (C.U.D) ---

  savePricingRule(rule: Partial<PricingRule>, id?: number | null): Observable<PricingRule> {
    const action = id ? this.api.updatePricingRule(id, rule) : this.api.createPricingRule(rule);
    return action.pipe(tap(() => this.loadPricingRules()));
  }

  deletePricingRule(id: number): Observable<void> {
    return this.api.deletePricingRule(id).pipe(tap(() => this.loadPricingRules()));
  }

  saveShippingRule(rule: Partial<ShippingRule>, id?: number | null): Observable<ShippingRule> {
    const action = id ? this.api.updateShippingRule(id, rule) : this.api.createShippingRule(rule);
    return action.pipe(tap(() => this.loadShippingRules()));
  }

  deleteShippingRule(id: number): Observable<void> {
    return this.api.deleteShippingRule(id).pipe(tap(() => this.loadShippingRules()));
  }

  saveOrderLimit(rule: Partial<OrderLimit>, id?: number | null): Observable<OrderLimit> {
    const action = id ? this.api.updateOrderLimit(id, rule) : this.api.createOrderLimit(rule);
    return action.pipe(tap(() => this.loadOrderLimits()));
  }

  deleteOrderLimit(id: number): Observable<void> {
    return this.api.deleteOrderLimit(id).pipe(tap(() => this.loadOrderLimits()));
  }

  saveUser(user: any, id?: number | null): Observable<User> {
    const action = id ? this.api.updateUser(id, user) : this.api.createUser(user);
    return action.pipe(tap(() => this.loadUsers()));
  }

  deleteUser(id: number): Observable<void> {
    return this.api.deleteUser(id).pipe(tap(() => this.loadUsers()));
  }

  checkRuleConflicts(type: 'PRICING' | 'SHIPPING', target: any): Observable<string[]> {
    return this.api.checkRuleConflicts(type, target);
  }
}
