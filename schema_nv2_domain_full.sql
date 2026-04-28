-- =============================================================================
-- schema_nv2_domain_full.sql
-- Luoc do MOI HOAN TOAN (prefix nv2_) — cung cap day du thong tin tu bang cu,
-- sap xep lai dung nghiep vu: tenant, gio hang DB, don hang + coupon FK,
-- tach thanh phan tien / rule / thanh toan.
--
-- Chay tren cung database da co bang legacy (users, orders, ...).
-- Thu tu: DROP nv2_* (neu ton tai) -> CREATE -> INSERT SELECT.
-- MySQL 8.0+ khuyen dung (JSON, CHECK).
-- =============================================================================
-- USE fashion_b2bwl;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

/* ========================= DROP (con -> cha) ========================= */
DROP TABLE IF EXISTS nv2_order_monetary_component;
DROP TABLE IF EXISTS nv2_sales_order_line;
DROP TABLE IF EXISTS nv2_sales_order;
DROP TABLE IF EXISTS nv2_payment_transaction;
DROP TABLE IF EXISTS nv2_shopping_cart_line;
DROP TABLE IF EXISTS nv2_shopping_cart;
DROP TABLE IF EXISTS nv2_wallet_transaction;
DROP TABLE IF EXISTS nv2_wallet;
DROP TABLE IF EXISTS nv2_product_review;
DROP TABLE IF EXISTS nv2_bundle_line;
DROP TABLE IF EXISTS nv2_bundle;
DROP TABLE IF EXISTS nv2_ai_product_sync;
DROP TABLE IF EXISTS nv2_translation;
DROP TABLE IF EXISTS nv2_attribute_template;
DROP TABLE IF EXISTS nv2_product_variant;
DROP TABLE IF EXISTS nv2_product;
DROP TABLE IF EXISTS nv2_category;
DROP TABLE IF EXISTS nv2_rule_product_scope;
DROP TABLE IF EXISTS nv2_rule_customer_scope;
DROP TABLE IF EXISTS nv2_sale_campaign;
DROP TABLE IF EXISTS nv2_shipping_zone;
DROP TABLE IF EXISTS nv2_rule_shipping;
DROP TABLE IF EXISTS nv2_rule_net_terms;
DROP TABLE IF EXISTS nv2_rule_tax_display;
DROP TABLE IF EXISTS nv2_rule_hide_price;
DROP TABLE IF EXISTS nv2_rule_order_limit;
DROP TABLE IF EXISTS nv2_rule_pricing;
DROP TABLE IF EXISTS nv2_coupon;
DROP TABLE IF EXISTS nv2_luxe_turn;
DROP TABLE IF EXISTS nv2_luxe_session;
DROP TABLE IF EXISTS nv2_chat_message;
DROP TABLE IF EXISTS nv2_expense;
DROP TABLE IF EXISTS nv2_home_setting;
DROP TABLE IF EXISTS nv2_password_reset_token;
DROP TABLE IF EXISTS nv2_refresh_token;
DROP TABLE IF EXISTS nv2_b2b_registration;
DROP TABLE IF EXISTS nv2_user_account;
DROP TABLE IF EXISTS nv2_customer_group;
DROP TABLE IF EXISTS nv2_app_role;
DROP TABLE IF EXISTS nv2_tenant;

SET FOREIGN_KEY_CHECKS = 1;

/* ========================= 0. Tenant (shop_id -> thuc the) ========================= */
CREATE TABLE nv2_tenant (
  id            INT NOT NULL,
  display_name  VARCHAR(255) NOT NULL,
  created_at    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Gom shop_id rac roi tren bang cu thanh FK ro rang';

/* ========================= Nhom & nguoi dung ========================= */
CREATE TABLE nv2_app_role (
  id                 INT NOT NULL AUTO_INCREMENT,
  name               VARCHAR(50) NOT NULL,
  description        VARCHAR(512) NULL,
  is_admin           TINYINT(1) NULL,
  permissions_json   JSON NULL,
  created_at         DATETIME(6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_nv2_role_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_customer_group (
  id                      INT NOT NULL AUTO_INCREMENT,
  tenant_id               INT NOT NULL,
  name                    VARCHAR(255) NOT NULL,
  default_discount_rate   DECIMAL(5,2) NULL,
  PRIMARY KEY (id),
  KEY idx_nv2_cg_tenant (tenant_id),
  CONSTRAINT fk_nv2_cg_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_user_account (
  id                      INT NOT NULL AUTO_INCREMENT,
  tenant_id               INT NULL,
  email                   VARCHAR(255) NOT NULL,
  password_hash           VARCHAR(255) NOT NULL,
  full_name               VARCHAR(255) NULL,
  phone                   VARCHAR(64) NULL,
  role                    VARCHAR(20) NULL,
  customer_group_id       INT NULL,
  tags                    TEXT NULL COMMENT 'JSON string nhu bang users cu',
  registration_status     VARCHAR(20) NULL,
  company_name            VARCHAR(255) NULL,
  tax_code                VARCHAR(64) NULL,
  active                  TINYINT(1) NOT NULL DEFAULT 1,
  account_status          VARCHAR(20) NULL,
  deleted_at              DATETIME(6) NULL,
  shipping_address_json   TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_nv2_user_email (email),
  KEY idx_nv2_user_tenant (tenant_id),
  KEY idx_nv2_user_group (customer_group_id),
  CONSTRAINT fk_nv2_user_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_nv2_user_cg FOREIGN KEY (customer_group_id) REFERENCES nv2_customer_group (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_refresh_token (
  id           INT NOT NULL AUTO_INCREMENT,
  user_id      INT NOT NULL,
  token        VARCHAR(512) NOT NULL,
  expiry_date  DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_nv2_rt_token (token),
  CONSTRAINT fk_nv2_rt_user FOREIGN KEY (user_id) REFERENCES nv2_user_account (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_password_reset_token (
  id          BIGINT NOT NULL AUTO_INCREMENT,
  user_id     INT NOT NULL,
  token       VARCHAR(128) NOT NULL,
  expires_at  DATETIME(6) NOT NULL,
  used_at     DATETIME(6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_nv2_prt_token (token),
  CONSTRAINT fk_nv2_prt_user FOREIGN KEY (user_id) REFERENCES nv2_user_account (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_b2b_registration (
  id          INT NOT NULL AUTO_INCREMENT,
  tenant_id   INT NULL,
  user_id     INT NOT NULL,
  form_data   TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_nv2_b2b_user (user_id),
  CONSTRAINT fk_nv2_b2b_user FOREIGN KEY (user_id) REFERENCES nv2_user_account (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_nv2_b2b_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ========================= Danh muc & san pham ========================= */
CREATE TABLE nv2_category (
  id          INT NOT NULL AUTO_INCREMENT,
  tenant_id   INT NULL,
  parent_id   INT NULL,
  name        VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_nv2_cat_parent (parent_id),
  KEY idx_nv2_cat_tenant (tenant_id),
  CONSTRAINT fk_nv2_cat_parent FOREIGN KEY (parent_id) REFERENCES nv2_category (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_nv2_cat_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_product (
  id                        INT NOT NULL AUTO_INCREMENT,
  tenant_id                 INT NULL,
  category_id               INT NOT NULL,
  product_code              VARCHAR(128) NOT NULL,
  name                      VARCHAR(512) NOT NULL,
  base_price                DECIMAL(15,2) NULL,
  image_url                 VARCHAR(1024) NULL,
  image_urls                TEXT NULL,
  brand                     VARCHAR(255) NULL,
  material                  VARCHAR(255) NULL,
  origin                    VARCHAR(255) NULL,
  is_sale                   TINYINT(1) NOT NULL DEFAULT 0,
  variant_dimension_labels  TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_nv2_prod_code (product_code),
  KEY idx_nv2_prod_cat (category_id),
  CONSTRAINT fk_nv2_prod_cat FOREIGN KEY (category_id) REFERENCES nv2_category (id),
  CONSTRAINT fk_nv2_prod_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_product_variant (
  id                 INT NOT NULL AUTO_INCREMENT,
  tenant_id          INT NULL,
  product_id         INT NOT NULL,
  sku                VARCHAR(128) NOT NULL,
  stock_quantity     INT NOT NULL,
  price_adjustment   DECIMAL(15,2) NULL,
  image_url          VARCHAR(1024) NULL,
  image_urls         TEXT NULL,
  color              VARCHAR(128) NULL,
  size               VARCHAR(128) NULL,
  weight             VARCHAR(64) NULL,
  length_val         DECIMAL(15,4) NULL,
  width_val          DECIMAL(15,4) NULL,
  height_val         DECIMAL(15,4) NULL,
  cost_price         DECIMAL(15,2) NULL,
  price              DECIMAL(15,2) NULL,
  discount_price     DECIMAL(15,2) NULL,
  status               VARCHAR(32) NULL,
  barcode            VARCHAR(128) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_nv2_variant_sku (sku),
  KEY idx_nv2_var_product (product_id),
  CONSTRAINT fk_nv2_var_product FOREIGN KEY (product_id) REFERENCES nv2_product (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_nv2_var_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_attribute_template (
  id                    INT NOT NULL AUTO_INCREMENT,
  tenant_id             INT NULL,
  category_id           INT NOT NULL,
  required_attributes   JSON NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_nv2_at_cat FOREIGN KEY (category_id) REFERENCES nv2_category (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_nv2_at_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_translation (
  id                       INT NOT NULL AUTO_INCREMENT,
  tenant_id                INT NULL,
  resource_id              INT NOT NULL,
  resource_type            VARCHAR(50) NOT NULL,
  language_code            VARCHAR(10) NOT NULL,
  translated_name          TEXT NULL,
  translated_description   TEXT NULL,
  translated_data          TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_nv2_tr_res (resource_type, resource_id),
  CONSTRAINT fk_nv2_tr_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_ai_product_sync (
  id              INT NOT NULL AUTO_INCREMENT,
  tenant_id       INT NULL,
  product_id      INT NOT NULL,
  content         TEXT NULL,
  vector_id       VARCHAR(255) NULL,
  last_synced_at  DATETIME(6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_nv2_ai_prod (product_id),
  CONSTRAINT fk_nv2_ai_prod FOREIGN KEY (product_id) REFERENCES nv2_product (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_nv2_ai_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_product_review (
  id             INT NOT NULL AUTO_INCREMENT,
  product_id     INT NOT NULL,
  user_id        INT NOT NULL,
  rating         INT NOT NULL,
  comment        TEXT NULL,
  reply_message  TEXT NULL,
  is_pinned      TINYINT(1) NOT NULL DEFAULT 0,
  created_at     DATETIME(6) NULL,
  PRIMARY KEY (id),
  KEY idx_nv2_rev_prod (product_id),
  CONSTRAINT fk_nv2_rev_prod FOREIGN KEY (product_id) REFERENCES nv2_product (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_nv2_rev_user FOREIGN KEY (user_id) REFERENCES nv2_user_account (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_bundle (
  id             BIGINT NOT NULL AUTO_INCREMENT,
  image_url      VARCHAR(1024) NULL,
  name           VARCHAR(255) NOT NULL,
  status         VARCHAR(20) NOT NULL,
  discount_type  VARCHAR(20) NULL,
  discount_value DECIMAL(15,2) NULL,
  old_price      DECIMAL(15,2) NULL,
  new_price      DECIMAL(15,2) NULL,
  customer_type  VARCHAR(64) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_bundle_line (
  id          BIGINT NOT NULL AUTO_INCREMENT,
  bundle_id   BIGINT NOT NULL,
  variant_id  INT NOT NULL,
  quantity    INT NULL,
  PRIMARY KEY (id),
  KEY idx_nv2_bl_bundle (bundle_id),
  CONSTRAINT fk_nv2_bl_bundle FOREIGN KEY (bundle_id) REFERENCES nv2_bundle (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_nv2_bl_var FOREIGN KEY (variant_id) REFERENCES nv2_product_variant (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ========================= Uu dai & rule (giu nguyen cot JSON + FK tenant) ========================= */
CREATE TABLE nv2_coupon (
  id                      INT NOT NULL AUTO_INCREMENT,
  tenant_id               INT NOT NULL,
  code                    VARCHAR(64) NOT NULL,
  discount_type           VARCHAR(32) NOT NULL,
  discount_value          DECIMAL(15,2) NOT NULL,
  start_date              DATETIME(6) NULL,
  end_date                DATETIME(6) NULL,
  used_count              INT NULL DEFAULT 0,
  status                  VARCHAR(20) NULL,
  apply_product_type      VARCHAR(50) NULL,
  apply_product_value     TEXT NULL,
  apply_customer_type     VARCHAR(50) NULL,
  apply_customer_value    TEXT NULL,
  priority                INT NULL DEFAULT 99,
  minimum_prior_orders    INT NULL DEFAULT 0,
  created_at                DATETIME(6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_nv2_coupon_code (code),
  KEY idx_nv2_coupon_tenant (tenant_id),
  CONSTRAINT fk_nv2_coupon_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_rule_pricing (
  id                        INT NOT NULL AUTO_INCREMENT,
  tenant_id                 INT NULL,
  name                      VARCHAR(255) NOT NULL,
  priority                  INT NOT NULL,
  status                    VARCHAR(32) NOT NULL,
  rule_type                 VARCHAR(50) NOT NULL,
  apply_customer_type       VARCHAR(64) NULL,
  apply_customer_value      TEXT NULL,
  exclude_customer_option   VARCHAR(64) NULL,
  exclude_customer_value    TEXT NULL,
  apply_product_type        VARCHAR(64) NULL,
  apply_product_value       TEXT NULL,
  exclude_product_option    VARCHAR(64) NULL,
  exclude_product_value     TEXT NULL,
  discount_value            DECIMAL(15,2) NULL,
  discount_type             VARCHAR(32) NULL,
  action_config               TEXT NULL,
  start_date                DATETIME(6) NULL,
  end_date                  DATETIME(6) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_nv2_pr_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_rule_order_limit (
  id                        INT NOT NULL AUTO_INCREMENT,
  tenant_id                 INT NULL,
  name                      VARCHAR(255) NOT NULL,
  priority                  INT NOT NULL,
  status                    VARCHAR(32) NOT NULL,
  limit_level               VARCHAR(50) NOT NULL,
  limit_type                VARCHAR(50) NOT NULL,
  limit_value               DECIMAL(15,2) NOT NULL,
  apply_customer_type       VARCHAR(64) NULL,
  apply_customer_value      TEXT NULL,
  exclude_customer_option   VARCHAR(64) NULL,
  exclude_customer_value    TEXT NULL,
  apply_product_type        VARCHAR(64) NULL,
  apply_product_value       TEXT NULL,
  exclude_product_option    VARCHAR(64) NULL,
  exclude_product_value     TEXT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_nv2_ol_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_rule_hide_price (
  id                    INT NOT NULL AUTO_INCREMENT,
  tenant_id             INT NULL,
  name                  VARCHAR(255) NOT NULL,
  priority              INT NOT NULL,
  status                VARCHAR(32) NOT NULL,
  hide_price            TINYINT(1) NULL,
  hide_add_to_cart      TINYINT(1) NULL,
  replacement_text      VARCHAR(512) NULL,
  apply_customer_type   VARCHAR(64) NULL,
  apply_customer_value  JSON NULL,
  apply_product_type    VARCHAR(64) NULL,
  apply_product_value   JSON NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_nv2_hpr_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_rule_tax_display (
  id                   INT NOT NULL AUTO_INCREMENT,
  tenant_id            INT NOT NULL DEFAULT 1,
  priority             INT NOT NULL DEFAULT 0,
  name                 VARCHAR(255) NOT NULL,
  status               VARCHAR(32) NOT NULL,
  tax_display_type     VARCHAR(50) NOT NULL,
  display_type         VARCHAR(50) NOT NULL,
  design_config        JSON NULL,
  apply_customer_type  VARCHAR(64) NULL,
  apply_customer_value JSON NULL,
  apply_product_type   VARCHAR(64) NULL,
  apply_product_value  JSON NULL,
  discount_rate        DOUBLE NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_nv2_tdr_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_rule_net_terms (
  id                    INT NOT NULL AUTO_INCREMENT,
  tenant_id             INT NULL,
  name                  VARCHAR(255) NOT NULL,
  priority              INT NOT NULL,
  status                VARCHAR(32) NOT NULL,
  apply_customer_type   VARCHAR(64) NULL,
  apply_customer_value  JSON NULL,
  condition_type        VARCHAR(50) NULL,
  net_term_days         INT NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_nv2_ntr_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_rule_shipping (
  id                    INT NOT NULL AUTO_INCREMENT,
  tenant_id             INT NULL,
  name                  VARCHAR(255) NOT NULL,
  priority              INT NOT NULL,
  status                VARCHAR(32) NOT NULL,
  base_on               VARCHAR(50) NOT NULL,
  rate_ranges           TEXT NULL,
  apply_customer_type   VARCHAR(50) NULL,
  apply_customer_value  TEXT NULL,
  apply_product_type    VARCHAR(50) NULL,
  apply_product_value   TEXT NULL,
  discount_type         VARCHAR(50) NULL,
  discount_value        DOUBLE NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_nv2_sr_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_shipping_zone (
  id              INT NOT NULL AUTO_INCREMENT,
  tenant_id       INT NULL,
  name            VARCHAR(255) NOT NULL,
  priority        INT NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL,
  province_codes  TEXT NOT NULL,
  standard_fee    DECIMAL(15,2) NOT NULL,
  express_fee     DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_nv2_sz_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_sale_campaign (
  id                      INT NOT NULL AUTO_INCREMENT,
  tenant_id               INT NOT NULL DEFAULT 1,
  name                    VARCHAR(255) NOT NULL,
  description             TEXT NULL,
  banner_url              TEXT NULL,
  discount_percentage     INT NULL,
  start_date              DATETIME(6) NULL,
  end_date                DATETIME(6) NULL,
  is_active               TINYINT(1) NULL,
  priority                INT NULL,
  status                  VARCHAR(20) NULL,
  apply_product_type      VARCHAR(50) NULL,
  apply_product_value     TEXT NULL,
  apply_customer_type     VARCHAR(50) NULL,
  apply_customer_value    TEXT NULL,
  created_at              DATETIME(6) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_nv2_sc_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* Bang mo rong: gan rule -> user/group/category... (du lieu dien bang job/ETL tu JSON cu) */
CREATE TABLE nv2_rule_customer_scope (
  id              BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id       INT NULL,
  rule_kind       VARCHAR(40) NOT NULL COMMENT 'PRICING, ORDER_LIMIT, HIDE_PRICE, TAX_DISPLAY, NET_TERMS, SHIPPING, COUPON, SALE',
  rule_row_id     INT NOT NULL,
  match_kind      VARCHAR(24) NOT NULL,
  user_id         INT NULL,
  customer_group_id INT NULL,
  role_code       VARCHAR(32) NULL,
  tags_snapshot   JSON NULL,
  PRIMARY KEY (id),
  KEY idx_nv2_rcs (rule_kind, rule_row_id),
  CONSTRAINT fk_nv2_rcs_user FOREIGN KEY (user_id) REFERENCES nv2_user_account (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_nv2_rcs_cg FOREIGN KEY (customer_group_id) REFERENCES nv2_customer_group (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_nv2_rcs_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_rule_product_scope (
  id              BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id       INT NULL,
  rule_kind       VARCHAR(40) NOT NULL,
  rule_row_id     INT NOT NULL,
  match_kind      VARCHAR(24) NOT NULL,
  category_id     INT NULL,
  product_id      INT NULL,
  variant_id      INT NULL,
  PRIMARY KEY (id),
  KEY idx_nv2_rps (rule_kind, rule_row_id),
  CONSTRAINT fk_nv2_rps_cat FOREIGN KEY (category_id) REFERENCES nv2_category (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_nv2_rps_prod FOREIGN KEY (product_id) REFERENCES nv2_product (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_nv2_rps_var FOREIGN KEY (variant_id) REFERENCES nv2_product_variant (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_nv2_rps_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ========================= Gio hang (nghiep vu: thay localStorage) ========================= */
CREATE TABLE nv2_shopping_cart (
  id            BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id     INT NULL,
  user_id       INT NULL,
  guest_token   CHAR(36) NULL,
  currency      VARCHAR(10) NOT NULL DEFAULT 'VND',
  created_at    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_nv2_sc_guest (guest_token),
  KEY idx_nv2_sc_user (tenant_id, user_id),
  CONSTRAINT chk_nv2_sc_identity CHECK (
    (user_id IS NOT NULL AND guest_token IS NULL)
    OR (user_id IS NULL AND guest_token IS NOT NULL)
  ),
  CONSTRAINT fk_nv2_sc_user FOREIGN KEY (user_id) REFERENCES nv2_user_account (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_nv2_sc_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_shopping_cart_line (
  id                   BIGINT NOT NULL AUTO_INCREMENT,
  cart_id              BIGINT NOT NULL,
  variant_id           INT NOT NULL,
  quantity             INT NOT NULL DEFAULT 1,
  unit_price_snapshot  DECIMAL(15,2) NOT NULL,
  pricing_note         TEXT NULL,
  created_at           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_nv2_scl_cart_var (cart_id, variant_id),
  CONSTRAINT fk_nv2_scl_cart FOREIGN KEY (cart_id) REFERENCES nv2_shopping_cart (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_nv2_scl_var FOREIGN KEY (variant_id) REFERENCES nv2_product_variant (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ========================= Don hang & tien ========================= */
CREATE TABLE nv2_sales_order (
  id                              INT NOT NULL,
  tenant_id                       INT NULL,
  user_id                         INT NOT NULL,
  order_type                      VARCHAR(50) NOT NULL,
  status                          VARCHAR(50) NOT NULL,
  payment_method                  VARCHAR(50) NOT NULL,
  payment_status                  VARCHAR(50) NOT NULL,
  total_amount                    DECIMAL(15,2) NOT NULL,
  shipping_fee                    DECIMAL(15,2) NULL,
  tax_amount                      DECIMAL(15,2) NULL,
  paid_amount                     DECIMAL(15,2) NULL,
  debt_amount                     DECIMAL(15,2) NULL,
  due_date                        DATETIME(6) NULL,
  full_name                       VARCHAR(255) NULL,
  phone                           VARCHAR(20) NULL,
  shipping_address                TEXT NULL,
  shipping_selection              VARCHAR(20) NULL,
  shipping_province_code          VARCHAR(32) NULL,
  note                            TEXT NULL,
  coupon_code                     VARCHAR(50) NULL COMMENT 'Giu audit tu bang cu',
  coupon_id                       INT NULL COMMENT 'FK nghiep vu: giai quyet ma roi',
  discount_amount                 DECIMAL(15,2) NULL,
  created_at                      DATETIME(6) NULL,
  stock_reduced                   TINYINT(1) NULL,
  refund_processed_at             DATETIME(6) NULL,
  refund_confirmed_by_customer_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  KEY idx_nv2_so_user (user_id),
  KEY idx_nv2_so_tenant (tenant_id),
  CONSTRAINT fk_nv2_so_user FOREIGN KEY (user_id) REFERENCES nv2_user_account (id),
  CONSTRAINT fk_nv2_so_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_nv2_so_coupon FOREIGN KEY (coupon_id) REFERENCES nv2_coupon (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_sales_order_line (
  id                 INT NOT NULL,
  tenant_id          INT NULL,
  order_id           INT NOT NULL,
  variant_id         INT NOT NULL,
  quantity           INT NOT NULL,
  unit_price         DECIMAL(15,2) NOT NULL,
  applied_rule_id    INT NULL,
  applied_rule_kind  VARCHAR(24) NULL DEFAULT 'PRICING' COMMENT 'Rang buoc nghiep vu: rule pricing',
  pricing_note       TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_nv2_sol_order (order_id),
  CONSTRAINT fk_nv2_sol_order FOREIGN KEY (order_id) REFERENCES nv2_sales_order (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_nv2_sol_var FOREIGN KEY (variant_id) REFERENCES nv2_product_variant (id),
  CONSTRAINT fk_nv2_sol_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_order_monetary_component (
  id               BIGINT NOT NULL AUTO_INCREMENT,
  order_id         INT NOT NULL,
  order_line_id    INT NULL,
  component_type   VARCHAR(32) NOT NULL COMMENT 'COUPON, PRICING_RULE, SHIPPING, TAX, SALE_CAMPAIGN, MANUAL',
  reference_kind   VARCHAR(40) NULL,
  reference_id     INT NULL,
  amount           DECIMAL(15,2) NOT NULL,
  description      VARCHAR(512) NULL,
  created_at       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_nv2_omc_order (order_id),
  CONSTRAINT fk_nv2_omc_order FOREIGN KEY (order_id) REFERENCES nv2_sales_order (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_nv2_omc_line FOREIGN KEY (order_line_id) REFERENCES nv2_sales_order_line (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_payment_transaction (
  id                        INT NOT NULL,
  tenant_id                 INT NULL,
  order_id                  INT NOT NULL,
  provider                  VARCHAR(50) NOT NULL,
  transaction_reference     VARCHAR(100) NULL,
  provider_transaction_no   VARCHAR(100) NULL,
  amount                    DECIMAL(15,2) NOT NULL,
  bank_code                 VARCHAR(50) NULL,
  response_code             VARCHAR(10) NULL,
  status                    VARCHAR(20) NOT NULL,
  pay_date                  DATETIME(6) NULL,
  PRIMARY KEY (id),
  KEY idx_nv2_pt_order (order_id),
  CONSTRAINT fk_nv2_pt_order FOREIGN KEY (order_id) REFERENCES nv2_sales_order (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_nv2_pt_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_wallet (
  id          INT NOT NULL AUTO_INCREMENT,
  user_id     INT NOT NULL,
  balance     DECIMAL(15,2) NULL,
  currency    VARCHAR(10) NULL,
  updated_at  DATETIME(6) NULL,
  status      VARCHAR(20) NULL,
  metadata    TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_nv2_w_user (user_id),
  CONSTRAINT fk_nv2_w_user FOREIGN KEY (user_id) REFERENCES nv2_user_account (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_wallet_transaction (
  id           INT NOT NULL AUTO_INCREMENT,
  wallet_id    INT NOT NULL,
  amount       DECIMAL(15,2) NOT NULL,
  type         VARCHAR(20) NOT NULL,
  description  TEXT NULL,
  created_at   DATETIME(6) NULL,
  PRIMARY KEY (id),
  KEY idx_nv2_wt_wallet (wallet_id),
  CONSTRAINT fk_nv2_wt_wallet FOREIGN KEY (wallet_id) REFERENCES nv2_wallet (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ========================= Khac ========================= */
CREATE TABLE nv2_chat_message (
  id           INT NOT NULL AUTO_INCREMENT,
  sender_id    INT NOT NULL,
  receiver_id  INT NOT NULL,
  message      TEXT NOT NULL,
  is_read      TINYINT(1) NOT NULL DEFAULT 0,
  created_at   DATETIME(6) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_nv2_cm_sender FOREIGN KEY (sender_id) REFERENCES nv2_user_account (id),
  CONSTRAINT fk_nv2_cm_recv FOREIGN KEY (receiver_id) REFERENCES nv2_user_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_expense (
  id           BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id    INT NULL,
  category     VARCHAR(32) NOT NULL,
  amount       DECIMAL(15,2) NULL,
  date         DATETIME(6) NULL,
  description  VARCHAR(512) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_nv2_exp_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_home_setting (
  id            INT NOT NULL AUTO_INCREMENT,
  tenant_id     INT NULL,
  setting_key   VARCHAR(128) NOT NULL,
  setting_value TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_nv2_hs_key (setting_key),
  CONSTRAINT fk_nv2_hs_tenant FOREIGN KEY (tenant_id) REFERENCES nv2_tenant (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_luxe_session (
  id          BIGINT NOT NULL AUTO_INCREMENT,
  user_id     INT NOT NULL,
  title       VARCHAR(220) NULL,
  created_at  DATETIME(6) NULL,
  updated_at  DATETIME(6) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_nv2_lux_s_user FOREIGN KEY (user_id) REFERENCES nv2_user_account (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nv2_luxe_turn (
  id                BIGINT NOT NULL AUTO_INCREMENT,
  session_id        BIGINT NOT NULL,
  role              VARCHAR(20) NOT NULL,
  content           TEXT NOT NULL,
  product_ids_json  TEXT NULL,
  created_at        DATETIME(6) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_nv2_lux_t_sess FOREIGN KEY (session_id) REFERENCES nv2_luxe_session (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 0;

/* ========================= SEED tenant ========================= */
INSERT INTO nv2_tenant (id, display_name)
SELECT DISTINCT s.shop_id, CONCAT('Tenant ', s.shop_id)
FROM (
  SELECT shop_id FROM customer_groups WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM users WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM categories WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM products WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM product_variants WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM orders WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM order_items WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM coupons
  UNION SELECT shop_id FROM pricing_rules WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM order_limits WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM hide_price_rules WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM tax_display_rules WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM net_terms_rules WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM shipping_rules WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM shipping_zones WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM sale_campaigns
  UNION SELECT shop_id FROM payment_transactions WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM attribute_templates WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM translations WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM ai_product_sync WHERE shop_id IS NOT NULL
  UNION SELECT shop_id FROM b2b_registration_forms WHERE shop_id IS NOT NULL
) AS s(shop_id)
WHERE s.shop_id IS NOT NULL;

INSERT IGNORE INTO nv2_tenant (id, display_name) VALUES (1, 'Default tenant');

/* ========================= COPY du lieu (giu id) ========================= */
INSERT INTO nv2_app_role (id, name, description, is_admin, permissions_json, created_at)
SELECT id, name, description, is_admin, permissions_json, created_at FROM app_roles;

INSERT INTO nv2_customer_group (id, tenant_id, name, default_discount_rate)
SELECT id, COALESCE(shop_id, 1), name, default_discount_rate FROM customer_groups;

INSERT INTO nv2_user_account (
  id, tenant_id, email, password_hash, full_name, phone, role, customer_group_id,
  tags, registration_status, company_name, tax_code, active, account_status, deleted_at, shipping_address_json
)
SELECT
  id,
  COALESCE(shop_id, 1),
  email,
  password_hash,
  full_name,
  phone,
  role,
  customer_group_id,
  tags,
  registration_status,
  company_name,
  tax_code,
  active,
  account_status,
  deleted_at,
  shipping_address_json
FROM users;

INSERT INTO nv2_refresh_token (id, user_id, token, expiry_date)
SELECT id, user_id, token, expiry_date FROM refresh_tokens;

INSERT INTO nv2_password_reset_token (id, user_id, token, expires_at, used_at)
SELECT id, user_id, token, expires_at, used_at FROM password_reset_tokens;

INSERT INTO nv2_b2b_registration (id, tenant_id, user_id, form_data)
SELECT id, COALESCE(shop_id, 1), user_id, form_data FROM b2b_registration_forms;

INSERT INTO nv2_category (id, tenant_id, parent_id, name)
SELECT id, COALESCE(shop_id, 1), parent_id, name FROM categories;

INSERT INTO nv2_product (
  id, tenant_id, category_id, product_code, name, base_price, image_url, image_urls,
  brand, material, origin, is_sale, variant_dimension_labels
)
SELECT
  id, COALESCE(shop_id, 1), category_id, product_code, name, base_price, image_url, image_urls,
  brand, material, origin, is_sale, variant_dimension_labels
FROM products;

INSERT INTO nv2_product_variant (
  id, tenant_id, product_id, sku, stock_quantity, price_adjustment, image_url, image_urls,
  color, size, weight, length, width, height, cost_price, price, discount_price, status, barcode
)
SELECT
  id, COALESCE(shop_id, 1), product_id, sku, stock_quantity, price_adjustment, image_url, image_urls,
  color, size, weight, length, width, height, cost_price, price, discount_price, status, barcode
FROM product_variants;

INSERT INTO nv2_attribute_template (id, tenant_id, category_id, required_attributes)
SELECT id, COALESCE(shop_id, 1), category_id, required_attributes FROM attribute_templates;

INSERT INTO nv2_translation (
  id, tenant_id, resource_id, resource_type, language_code,
  translated_name, translated_description, translated_data
)
SELECT
  id, COALESCE(shop_id, 1), resource_id, resource_type, language_code,
  translated_name, translated_description, translated_data
FROM translations;

INSERT INTO nv2_ai_product_sync (id, tenant_id, product_id, content, vector_id, last_synced_at)
SELECT id, COALESCE(shop_id, 1), product_id, content, vector_id, last_synced_at FROM ai_product_sync;

INSERT INTO nv2_product_review (id, product_id, user_id, rating, comment, reply_message, is_pinned, created_at)
SELECT id, product_id, user_id, rating, comment, reply_message, COALESCE(is_pinned,0), created_at FROM product_reviews;

INSERT INTO nv2_bundle (id, image_url, name, status, discount_type, discount_value, old_price, new_price, customer_type)
SELECT id, image_url, name, status, discount_type, discount_value, old_price, new_price, customer_type FROM bundles;

INSERT INTO nv2_bundle_line (id, bundle_id, variant_id, quantity)
SELECT id, bundle_id, variant_id, quantity FROM bundle_items;

INSERT INTO nv2_coupon (
  id, tenant_id, code, discount_type, discount_value, start_date, end_date, used_count, status,
  apply_product_type, apply_product_value, apply_customer_type, apply_customer_value,
  priority, minimum_prior_orders, created_at
)
SELECT
  id, COALESCE(shop_id, 1), code, discount_type, discount_value, start_date, end_date, used_count, status,
  apply_product_type, apply_product_value, apply_customer_type, apply_customer_value,
  priority, minimum_prior_orders, created_at
FROM coupons;

INSERT INTO nv2_rule_pricing (
  id, tenant_id, name, priority, status, rule_type,
  apply_customer_type, apply_customer_value, exclude_customer_option, exclude_customer_value,
  apply_product_type, apply_product_value, exclude_product_option, exclude_product_value,
  discount_value, discount_type, action_config, start_date, end_date
)
SELECT
  id, shop_id, name, priority, status, rule_type,
  apply_customer_type, apply_customer_value, exclude_customer_option, exclude_customer_value,
  apply_product_type, apply_product_value, exclude_product_option, exclude_product_value,
  discount_value, discount_type, action_config, start_date, end_date
FROM pricing_rules;

INSERT INTO nv2_rule_order_limit (
  id, tenant_id, name, priority, status, limit_level, limit_type, limit_value,
  apply_customer_type, apply_customer_value, exclude_customer_option, exclude_customer_value,
  apply_product_type, apply_product_value, exclude_product_option, exclude_product_value
)
SELECT
  id, shop_id, name, priority, status, limit_level, limit_type, limit_value,
  apply_customer_type, apply_customer_value, exclude_customer_option, exclude_customer_value,
  apply_product_type, apply_product_value, exclude_product_option, exclude_product_value
FROM order_limits;

INSERT INTO nv2_rule_hide_price (
  id, tenant_id, name, priority, status, hide_price, hide_add_to_cart, replacement_text,
  apply_customer_type, apply_customer_value, apply_product_type, apply_product_value
)
SELECT
  id, shop_id, name, priority, status, hide_price, hide_add_to_cart, replacement_text,
  apply_customer_type, apply_customer_value, apply_product_type, apply_product_value
FROM hide_price_rules;

INSERT INTO nv2_rule_tax_display (
  id, tenant_id, priority, name, status, tax_display_type, display_type, design_config,
  apply_customer_type, apply_customer_value, apply_product_type, apply_product_value, discount_rate
)
SELECT
  id, COALESCE(shop_id, 1), priority, name, status, tax_display_type, display_type, design_config,
  apply_customer_type, apply_customer_value, apply_product_type, apply_product_value, discount_rate
FROM tax_display_rules;

INSERT INTO nv2_rule_net_terms (
  id, tenant_id, name, priority, status, apply_customer_type, apply_customer_value, condition_type, net_term_days
)
SELECT
  id, shop_id, name, priority, status, apply_customer_type, apply_customer_value, condition_type, net_term_days
FROM net_terms_rules;

INSERT INTO nv2_rule_shipping (
  id, tenant_id, name, priority, status, base_on, rate_ranges,
  apply_customer_type, apply_customer_value, apply_product_type, apply_product_value,
  discount_type, discount_value
)
SELECT
  id, shop_id, name, priority, status, base_on, rate_ranges,
  apply_customer_type, apply_customer_value, apply_product_type, apply_product_value,
  discount_type, discount_value
FROM shipping_rules;

INSERT INTO nv2_shipping_zone (id, tenant_id, name, priority, status, province_codes, standard_fee, express_fee)
SELECT id, COALESCE(shop_id, 1), name, priority, status, province_codes, standard_fee, express_fee FROM shipping_zones;

INSERT INTO nv2_sale_campaign (
  id, tenant_id, name, description, banner_url, discount_percentage, start_date, end_date,
  is_active, priority, status, apply_product_type, apply_product_value, apply_customer_type, apply_customer_value, created_at
)
SELECT
  id, COALESCE(shop_id, 1), name, description, banner_url, discount_percentage, start_date, end_date,
  is_active, priority, status, apply_product_type, apply_product_value, apply_customer_type, apply_customer_value, created_at
FROM sale_campaigns;

INSERT INTO nv2_sales_order (
  id, tenant_id, user_id, order_type, status, payment_method, payment_status,
  total_amount, shipping_fee, tax_amount, paid_amount, debt_amount, due_date,
  full_name, phone, shipping_address, shipping_selection, shipping_province_code, note,
  coupon_code, coupon_id, discount_amount, created_at, stock_reduced,
  refund_processed_at, refund_confirmed_by_customer_at
)
SELECT
  o.id, COALESCE(o.shop_id, 1), o.user_id, o.order_type, o.status, o.payment_method, o.payment_status,
  o.total_amount, o.shipping_fee, o.tax_amount, o.paid_amount, o.debt_amount, o.due_date,
  o.full_name, o.phone, o.shipping_address, o.shipping_selection, o.shipping_province_code, o.note,
  o.coupon_code,
  (SELECT c.id FROM nv2_coupon c WHERE c.code = o.coupon_code ORDER BY c.id LIMIT 1),
  o.discount_amount, o.created_at, o.stock_reduced,
  o.refund_processed_at, o.refund_confirmed_by_customer_at
FROM orders o;

INSERT INTO nv2_sales_order_line (
  id, tenant_id, order_id, variant_id, quantity, unit_price, applied_rule_id, applied_rule_kind, pricing_note
)
SELECT
  oi.id, COALESCE(oi.shop_id, 1), oi.order_id, oi.variant_id, oi.quantity, oi.unit_price, oi.applied_rule_id, 'PRICING', oi.pricing_note
FROM order_items oi;

INSERT INTO nv2_payment_transaction (
  id, tenant_id, order_id, provider, transaction_reference, provider_transaction_no,
  amount, bank_code, response_code, status, pay_date
)
SELECT
  id, COALESCE(shop_id, 1), order_id, provider, transaction_reference, provider_transaction_no,
  amount, bank_code, response_code, status, pay_date
FROM payment_transactions;

INSERT INTO nv2_wallet (id, user_id, balance, currency, updated_at, status, metadata)
SELECT id, user_id, balance, currency, updated_at, status, metadata FROM wallets;

INSERT INTO nv2_wallet_transaction (id, wallet_id, amount, type, description, created_at)
SELECT id, wallet_id, amount, type, description, created_at FROM wallet_transactions;

INSERT INTO nv2_chat_message (id, sender_id, receiver_id, message, is_read, created_at)
SELECT id, sender_id, receiver_id, message, is_read, created_at FROM chat_messages;

INSERT INTO nv2_expense (id, tenant_id, category, amount, date, description)
SELECT id, COALESCE(shop_id, 1), category, amount, date, description FROM expenses;

INSERT INTO nv2_home_setting (id, tenant_id, setting_key, setting_value)
SELECT id, COALESCE(shop_id, 1), setting_key, setting_value FROM home_settings;

INSERT INTO nv2_luxe_session (id, user_id, title, created_at, updated_at)
SELECT id, user_id, title, created_at, updated_at FROM luxe_assistant_sessions;

INSERT INTO nv2_luxe_turn (id, session_id, role, content, product_ids_json, created_at)
SELECT id, session_id, role, content, product_ids_json, created_at FROM luxe_assistant_turns;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- Ghi chu sau khi chay:
-- 1) categories parent_id: neu loi FK, tam SET FOREIGN_KEY_CHECKS=0 khi INSERT categories.
-- 2) refresh_tokens / password_reset / users.deleted_at: neu cot BIGINT epoch, doi SELECT.
-- 3) nv2_sales_order_line.applied_rule_id: khong FK (tranh id khong ton tai trong pricing_rules).
-- 4) nv2_order_monetary_component: dien bang job (tach discount_amount, tax, ship).
-- 5) nv2_rule_customer_scope / nv2_rule_product_scope: ETL tu JSON bang job.
-- 6) Sau import: cap nhat AUTO_INCREMENT tung bang (MAX(id)+1).
-- -----------------------------------------------------------------------------
