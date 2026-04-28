-- =============================================================================
-- schema_business_display.sql
-- Muc dich: bang "biz_*" GIA / hien thi dung nghiep vu (cart server-side,
-- tach dong giam gia / rule tren don) — KHONG thay the bang hien co.
-- Chay tren DB da co schema Fashion-B2BWL (users, orders, product_variants, ...).
-- =============================================================================
-- SET NAMES utf8mb4;
-- USE fashion_b2bwl;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS biz_order_price_adjustment;
DROP TABLE IF EXISTS biz_rule_product_scope_row;
DROP TABLE IF EXISTS biz_rule_customer_scope_row;
DROP TABLE IF EXISTS biz_shopping_cart_item;
DROP TABLE IF EXISTS biz_shopping_cart;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1) Gio hang (nghiep vu: khach + variant + so luong + snapshot gia hien thi)
--    Hien tai FE dung localStorage — bang nay de ERD / bao cao / roadmap server cart.
-- -----------------------------------------------------------------------------
CREATE TABLE biz_shopping_cart (
  id              BIGINT NOT NULL AUTO_INCREMENT,
  shop_id         INT NULL,
  user_id         INT NULL COMMENT 'Dang nhap: FK users.id; khach: NULL',
  guest_token     CHAR(36) NULL COMMENT 'UUID khach, duy nhat khi user_id NULL',
  currency        VARCHAR(10) NOT NULL DEFAULT 'VND',
  created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  CONSTRAINT chk_biz_cart_identity CHECK (
    (user_id IS NOT NULL AND guest_token IS NULL)
    OR (user_id IS NULL AND guest_token IS NOT NULL)
  ),
  UNIQUE KEY uk_biz_cart_guest (guest_token),
  KEY idx_biz_cart_shop_user (shop_id, user_id),
  CONSTRAINT fk_biz_cart_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Gio hang logic: 1 user/shop hoac 1 guest_token. CHECK: can bo neu MySQL < 8.0.16';

CREATE TABLE biz_shopping_cart_item (
  id                    BIGINT NOT NULL AUTO_INCREMENT,
  cart_id               BIGINT NOT NULL,
  variant_id           INT NOT NULL,
  quantity             INT NOT NULL DEFAULT 1,
  unit_price_snapshot  DECIMAL(15,2) NOT NULL COMMENT 'Gia hien thi tai thoi diem them (FE tinh rule)',
  pricing_note         TEXT NULL COMMENT 'Ghi chu uu dai / rule preview',
  created_at           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_biz_cart_variant (cart_id, variant_id),
  CONSTRAINT fk_biz_cart_item_cart FOREIGN KEY (cart_id) REFERENCES biz_shopping_cart (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_biz_cart_item_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Dong gio: FK ro rang toi variant';

-- -----------------------------------------------------------------------------
-- 2) Pham vi rule — "mo" JSON apply_* thanh hang de ve ERD / import du lieu fake
--    Khong thay the bang rule goc; co the dong bo tu admin hoac de trong.
-- -----------------------------------------------------------------------------
CREATE TABLE biz_rule_customer_scope_row (
  id               BIGINT NOT NULL AUTO_INCREMENT,
  shop_id          INT NULL,
  rule_domain      VARCHAR(40) NOT NULL COMMENT 'PRICING_RULE, ORDER_LIMIT, HIDE_PRICE, TAX_DISPLAY, NET_TERMS, SHIPPING_RULE, COUPON, SALE_CAMPAIGN',
  rule_id          INT NOT NULL COMMENT 'Khoa logic toi bang rule tuong ung (khong FK da hinh)',
  scope_kind       VARCHAR(24) NOT NULL COMMENT 'ALL | USER | CUSTOMER_GROUP | ROLE | TAGS_JSON',
  ref_user_id      INT NULL,
  ref_group_id     INT NULL,
  role_code        VARCHAR(32) NULL,
  tags_criteria    JSON NULL,
  PRIMARY KEY (id),
  KEY idx_biz_rule_cust_domain (rule_domain, rule_id),
  KEY idx_biz_rule_cust_shop (shop_id),
  CONSTRAINT fk_biz_rule_cust_user FOREIGN KEY (ref_user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_biz_rule_cust_group FOREIGN KEY (ref_group_id) REFERENCES customer_groups (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Pham vi khach cua rule: tuong unh apply_customer_* trong code';

CREATE TABLE biz_rule_product_scope_row (
  id               BIGINT NOT NULL AUTO_INCREMENT,
  shop_id          INT NULL,
  rule_domain      VARCHAR(40) NOT NULL,
  rule_id          INT NOT NULL,
  scope_kind       VARCHAR(24) NOT NULL COMMENT 'ALL | CATEGORY | PRODUCT | VARIANT',
  ref_category_id  INT NULL,
  ref_product_id   INT NULL,
  ref_variant_id   INT NULL,
  PRIMARY KEY (id),
  KEY idx_biz_rule_prod_domain (rule_domain, rule_id),
  KEY idx_biz_rule_prod_shop (shop_id),
  CONSTRAINT fk_biz_rule_prod_category FOREIGN KEY (ref_category_id) REFERENCES categories (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_biz_rule_prod_product FOREIGN KEY (ref_product_id) REFERENCES products (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_biz_rule_prod_variant FOREIGN KEY (ref_variant_id) REFERENCES product_variants (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Pham vi san pham cua rule: tuong ung apply_product_*';

-- -----------------------------------------------------------------------------
-- 3) Dong dieu chinh gia tren don (nghiep vu: tach coupon / pricing_rule / ship / thue)
--    orders.order_items da co unit_price, applied_rule_id — bang nay mo rong lich su hien thi.
-- -----------------------------------------------------------------------------
CREATE TABLE biz_order_price_adjustment (
  id                 BIGINT NOT NULL AUTO_INCREMENT,
  order_id           INT NOT NULL,
  order_item_id      INT NULL COMMENT 'NULL = dieu chinh cap don (coupon tong, ship...)',
  adjustment_type    VARCHAR(32) NOT NULL COMMENT 'COUPON | PRICING_RULE | SALE_CAMPAIGN | SHIPPING | TAX | MANUAL',
  ref_rule_domain    VARCHAR(40) NULL COMMENT 'Ten bang rule hoac COUPONS',
  ref_rule_id        INT NULL,
  coupon_code        VARCHAR(50) NULL COMMENT 'Trung orders.coupon_code khi type=COUPON',
  amount             DECIMAL(15,2) NOT NULL COMMENT 'Duong = giam, am = tang (hiem)',
  description        VARCHAR(512) NULL,
  created_at         DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_biz_adj_order (order_id),
  KEY idx_biz_adj_item (order_item_id),
  CONSTRAINT fk_biz_adj_order FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_biz_adj_order_item FOREIGN KEY (order_item_id) REFERENCES order_items (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Pha vo monolith gia: moi dong giam/gia cong de bao cao & ERD';

-- =============================================================================
-- Du lieu fake mau (comment — bo comment de chay sau khi DB da co user/variant)
-- =============================================================================
/*
INSERT INTO biz_shopping_cart (shop_id, user_id, guest_token, currency)
VALUES (1, 1, NULL, 'VND');

INSERT INTO biz_shopping_cart_item (cart_id, variant_id, quantity, unit_price_snapshot, pricing_note)
VALUES (1, 1, 2, 199000.00, 'Gia sau pricing rule demo');

INSERT INTO biz_rule_customer_scope_row (shop_id, rule_domain, rule_id, scope_kind, ref_group_id)
VALUES (1, 'PRICING_RULE', 1, 'CUSTOMER_GROUP', 1);

INSERT INTO biz_rule_product_scope_row (shop_id, rule_domain, rule_id, scope_kind, ref_category_id)
VALUES (1, 'PRICING_RULE', 1, 'CATEGORY', 1);

INSERT INTO biz_order_price_adjustment (order_id, order_item_id, adjustment_type, ref_rule_domain, ref_rule_id, coupon_code, amount, description)
VALUES (1, NULL, 'COUPON', 'coupons', NULL, 'WELCOME10', -50000.00, 'Giam ma WELCOME10');
*/
