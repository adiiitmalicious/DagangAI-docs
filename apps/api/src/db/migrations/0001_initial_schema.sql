-- =============================================================================
-- DagangAI V1.0 — Initial Database Schema (PostgreSQL 16+)
-- Aligned with PRD.md v1.0.0 & API-spec.md v1.0.0
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- -----------------------------------------------------------------------------
-- 1. ENUM TYPES (17 Enums)
-- -----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('business_owner', 'platform_admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended');

CREATE TYPE business_category AS ENUM (
    'fnb', 'fashion_craft', 'beauty_care', 'photo_video',
    'design_creative', 'local_service', 'other'
);

CREATE TYPE brand_tone AS ENUM (
    'friendly_casual', 'professional', 'elegant',
    'energetic_promo', 'educational', 'storytelling'
);

CREATE TYPE language_preference AS ENUM ('id', 'en', 'id_casual_mix');
CREATE TYPE product_type AS ENUM ('product', 'service');
CREATE TYPE availability_status AS ENUM ('available', 'preorder', 'unavailable');

CREATE TYPE content_type AS ENUM (
    'social_caption', 'product_description', 'slogan_headline',
    'cta', 'content_idea', 'promo_message'
);

CREATE TYPE marketing_channel AS ENUM (
    'instagram', 'tiktok', 'whatsapp', 'marketplace_catalog', 'general'
);

CREATE TYPE promo_goal AS ENUM (
    'product_intro', 'promo_discount', 'education_benefit',
    'trust_testimonial', 'seasonal_reminder'
);

CREATE TYPE content_status AS ENUM ('draft', 'planned', 'published');
CREATE TYPE content_source AS ENUM ('ai_generated', 'manual');
CREATE TYPE aspect_ratio AS ENUM ('1:1', '9:16', '16:9');
CREATE TYPE export_format AS ENUM ('png', 'jpg');
CREATE TYPE template_segment AS ENUM ('fnb', 'fashion_craft', 'local_service', 'general');

CREATE TYPE ai_feature_type AS ENUM (
    'content_generate', 'content_refine', 'design_copy_assist', 'planner_ideas'
);

CREATE TYPE ai_usage_status AS ENUM (
    'success', 'failed', 'rate_limited', 'quota_exceeded', 'policy_blocked', 'circuit_open'
);

-- -----------------------------------------------------------------------------
-- 2. AUTHENTICATION & ACCOUNTS (M1)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name         VARCHAR(100) NOT NULL CHECK (char_length(trim(full_name)) >= 2),
    email             VARCHAR(255) NOT NULL,
    password_hash     TEXT NOT NULL,
    role              user_role NOT NULL DEFAULT 'business_owner',
    status            user_status NOT NULL DEFAULT 'active',
    suspended_reason  VARCHAR(300),
    suspended_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_users_suspended_reason
        CHECK (status <> 'suspended' OR (suspended_reason IS NOT NULL AND char_length(trim(suspended_reason)) >= 5))
);

CREATE UNIQUE INDEX idx_users_email_lower ON users (LOWER(email));
CREATE INDEX idx_users_role_status ON users (role, status);

CREATE TABLE refresh_tokens (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash           CHAR(64) NOT NULL UNIQUE,
    replaced_by_token_id UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
    expires_at           TIMESTAMPTZ NOT NULL,
    revoked_at           TIMESTAMPTZ,
    user_agent           VARCHAR(300),
    ip_address           INET,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id, expires_at DESC);

CREATE TABLE password_reset_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_user ON password_reset_tokens (user_id, expires_at DESC);

-- -----------------------------------------------------------------------------
-- 3. BUSINESS & PRODUCT MANAGEMENT (M2 & M3)
-- -----------------------------------------------------------------------------
CREATE TABLE business_category_presets (
    category                     business_category PRIMARY KEY,
    label                        VARCHAR(100) NOT NULL,
    is_priority_segment          BOOLEAN NOT NULL DEFAULT FALSE,
    example_description          VARCHAR(500) NOT NULL,
    example_usps                 JSONB NOT NULL DEFAULT '[]'::jsonb,
    example_target_audience      VARCHAR(300) NOT NULL,
    recommended_tones            JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_product_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE businesses (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id               UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, -- BR-01: 1 akun = 1 bisnis
    name                        VARCHAR(100) NOT NULL CHECK (char_length(trim(name)) >= 2),
    category                    business_category NOT NULL REFERENCES business_category_presets(category),
    description                 VARCHAR(500) NOT NULL CHECK (char_length(trim(description)) >= 10),
    location                    VARCHAR(120),
    unique_selling_points       JSONB NOT NULL DEFAULT '[]'::jsonb,
    target_audience_age_range   VARCHAR(60),
    target_audience_description VARCHAR(300),
    language_preference         language_preference NOT NULL DEFAULT 'id',
    brand_tone                  brand_tone NOT NULL DEFAULT 'friendly_casual',
    avoided_words               JSONB NOT NULL DEFAULT '[]'::jsonb,
    primary_color               CHAR(7) CHECK (primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$'),
    secondary_color             CHAR(7) CHECK (secondary_color IS NULL OR secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
    logo_storage_key            VARCHAR(500),
    logo_url                    TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name                VARCHAR(120) NOT NULL CHECK (char_length(trim(name)) >= 2),
    type                product_type NOT NULL DEFAULT 'product',
    category            VARCHAR(80),
    description         VARCHAR(500) NOT NULL CHECK (char_length(trim(description)) >= 10),
    currency            CHAR(3) NOT NULL DEFAULT 'IDR',
    price_min           BIGINT CHECK (price_min IS NULL OR price_min >= 0),
    price_max           BIGINT CHECK (price_max IS NULL OR price_max >= 0),
    key_benefits        JSONB NOT NULL DEFAULT '[]'::jsonb,
    availability_status availability_status NOT NULL DEFAULT 'available',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_products_price_range
        CHECK (price_max IS NULL OR price_min IS NULL OR price_max >= price_min)
);

CREATE INDEX idx_products_biz_active
    ON products (business_id, availability_status, created_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_products_name_trgm
    ON products USING GIN (name gin_trgm_ops)
    WHERE deleted_at IS NULL;

CREATE TABLE product_images (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    storage_key     VARCHAR(500) NOT NULL,
    url             TEXT NOT NULL,
    mime_type       VARCHAR(30) NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880), -- BR-12: <= 5 MB
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      SMALLINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images (product_id, sort_order ASC);
CREATE UNIQUE INDEX idx_product_images_single_primary
    ON product_images (product_id)
    WHERE is_primary = TRUE;

-- -----------------------------------------------------------------------------
-- 4. AI CONTENT STUDIO & CONTENT LIBRARY (M4 & M5)
-- -----------------------------------------------------------------------------
CREATE TABLE ai_generations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id          UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_generation_id UUID REFERENCES ai_generations(id) ON DELETE SET NULL,
    feature              ai_feature_type NOT NULL,
    product_id           UUID REFERENCES products(id) ON DELETE SET NULL,
    content_type         content_type,
    channel              marketing_channel,
    promo_goal           promo_goal,
    input_snapshot       JSONB NOT NULL DEFAULT '{}'::jsonb,
    context_summary      JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
    warnings             JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_generations_biz_created ON ai_generations (business_id, created_at DESC);

CREATE TABLE content_items (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    product_id            UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name_snapshot VARCHAR(120), -- BR-10: nama historis jika produk dihapus
    generation_id         UUID REFERENCES ai_generations(id) ON DELETE SET NULL,
    title                 VARCHAR(150) NOT NULL CHECK (char_length(trim(title)) >= 2),
    content_type          content_type NOT NULL,
    channel               marketing_channel NOT NULL DEFAULT 'general',
    status                content_status NOT NULL DEFAULT 'draft',
    headline              VARCHAR(300),
    body                  TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
    cta                   VARCHAR(300),
    hashtags              JSONB NOT NULL DEFAULT '[]'::jsonb,
    brand_tone            brand_tone,
    source                content_source NOT NULL DEFAULT 'manual',
    deleted_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contents_biz_filter
    ON content_items (business_id, status, content_type, updated_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_contents_biz_product
    ON content_items (business_id, product_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_contents_search_trgm
    ON content_items USING GIN ((title || ' ' || body) gin_trgm_ops)
    WHERE deleted_at IS NULL;

CREATE TABLE ai_feedbacks (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generation_id    UUID REFERENCES ai_generations(id) ON DELETE SET NULL,
    content_item_id  UUID REFERENCES content_items(id) ON DELETE SET NULL,
    rating           SMALLINT CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
    is_helpful       BOOLEAN,
    is_factual_issue BOOLEAN NOT NULL DEFAULT FALSE,
    issue_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes            VARCHAR(500),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_feedback_target CHECK (generation_id IS NOT NULL OR content_item_id IS NOT NULL)
);

CREATE INDEX idx_ai_feedbacks_factual ON ai_feedbacks (is_factual_issue, created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. AI DESIGN STUDIO (M6)
-- -----------------------------------------------------------------------------
CREATE TABLE design_templates (
    id                VARCHAR(64) PRIMARY KEY,
    name              VARCHAR(100) NOT NULL,
    segment           template_segment NOT NULL DEFAULT 'general',
    aspect_ratio      aspect_ratio NOT NULL,
    width_px          INTEGER NOT NULL CHECK (width_px >= 1080),
    height_px         INTEGER NOT NULL CHECK (height_px >= 1080 OR width_px >= 1080),
    thumbnail_url     TEXT NOT NULL,
    supports_logo     BOOLEAN NOT NULL DEFAULT TRUE,
    supports_badge    BOOLEAN NOT NULL DEFAULT TRUE,
    slots_schema      JSONB NOT NULL,
    font_presets      JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_colors    JSONB NOT NULL,
    layout_definition JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order        SMALLINT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_design_templates_browse
    ON design_templates (segment, aspect_ratio, sort_order ASC)
    WHERE is_active = TRUE;

CREATE TABLE design_assets (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id               UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    template_id               VARCHAR(64) NOT NULL REFERENCES design_templates(id),
    product_id                UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name_snapshot     VARCHAR(120),
    source_content_id         UUID REFERENCES content_items(id) ON DELETE SET NULL,
    title                     VARCHAR(150) NOT NULL CHECK (char_length(trim(title)) >= 2),
    aspect_ratio              aspect_ratio NOT NULL,
    config                    JSONB NOT NULL,
    preview_storage_key       VARCHAR(500),
    preview_url               TEXT,
    last_exported_format      export_format,
    last_exported_storage_key VARCHAR(500),
    last_exported_at          TIMESTAMPTZ,
    deleted_at                TIMESTAMPTZ,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_designs_biz_updated
    ON design_assets (business_id, updated_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_designs_biz_product
    ON design_assets (business_id, product_id)
    WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 6. MARKETING PLANNER (M7)
-- -----------------------------------------------------------------------------
CREATE TABLE marketing_plan_items (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id            UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    product_id             UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name_snapshot  VARCHAR(120),
    content_item_id        UUID REFERENCES content_items(id) ON DELETE SET NULL,
    content_title_snapshot VARCHAR(150),
    design_asset_id        UUID REFERENCES design_assets(id) ON DELETE SET NULL,
    design_title_snapshot  VARCHAR(150),
    title                  VARCHAR(150) NOT NULL CHECK (char_length(trim(title)) >= 2),
    campaign_name          VARCHAR(120),
    channel                marketing_channel NOT NULL DEFAULT 'general',
    scheduled_date         DATE,
    status                 content_status NOT NULL DEFAULT 'draft',
    published_at           TIMESTAMPTZ,
    notes                  TEXT,
    deleted_at             TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- BR-09: planned wajib tanggal; published wajib timestamp
    CONSTRAINT chk_planner_planned_date
        CHECK (status <> 'planned' OR scheduled_date IS NOT NULL),
    CONSTRAINT chk_planner_published_timestamp
        CHECK (status <> 'published' OR published_at IS NOT NULL)
);

CREATE INDEX idx_planner_biz_schedule
    ON marketing_plan_items (business_id, scheduled_date ASC, status)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_planner_biz_status
    ON marketing_plan_items (business_id, status, updated_at DESC)
    WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 7. OPERATIONAL, AI QUOTA & PLATFORM ADMIN (M8 & M9)
-- -----------------------------------------------------------------------------
CREATE TABLE system_ai_configs (
    id                      SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton row
    daily_credits_limit     INTEGER NOT NULL DEFAULT 30 CHECK (daily_credits_limit >= 0),
    rate_limit_per_minute   INTEGER NOT NULL DEFAULT 5 CHECK (rate_limit_per_minute >= 1),
    credit_costs            JSONB NOT NULL DEFAULT '{"content_generate":1,"content_refine":1,"design_copy_assist":1,"planner_ideas":2}'::jsonb,
    circuit_breaker_open    BOOLEAN NOT NULL DEFAULT FALSE,
    circuit_breaker_message VARCHAR(300),
    updated_by              UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_daily_ai_quotas (
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date_wib DATE NOT NULL, -- (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE
    credits_used   INTEGER NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, usage_date_wib)
);

CREATE TABLE ai_usage_logs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id             UUID REFERENCES businesses(id) ON DELETE SET NULL,
    generation_id           UUID REFERENCES ai_generations(id) ON DELETE SET NULL,
    feature                 ai_feature_type NOT NULL,
    status                  ai_usage_status NOT NULL,
    credits_charged         SMALLINT NOT NULL DEFAULT 0 CHECK (credits_charged >= 0),
    provider_name           VARCHAR(60),
    model_name              VARCHAR(80),
    estimated_input_tokens  INTEGER CHECK (estimated_input_tokens IS NULL OR estimated_input_tokens >= 0),
    estimated_output_tokens INTEGER CHECK (estimated_output_tokens IS NULL OR estimated_output_tokens >= 0),
    latency_ms              INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
    error_code              VARCHAR(64),
    usage_date_wib          DATE NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- BR-07: Kuota hanya boleh dipotong bila permintaan sukses
    CONSTRAINT chk_ai_logs_credits_only_on_success
        CHECK (status = 'success' OR credits_charged = 0)
);

CREATE INDEX idx_ai_logs_date_status ON ai_usage_logs (usage_date_wib DESC, status, feature);
CREATE INDEX idx_ai_logs_user_created ON ai_usage_logs (user_id, created_at DESC);

CREATE TABLE ai_idempotency_keys (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(128) NOT NULL,
    endpoint        VARCHAR(120) NOT NULL,
    request_hash    CHAR(64) NOT NULL,
    response_status SMALLINT NOT NULL,
    response_body   JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, idempotency_key)
);

CREATE INDEX idx_idempotency_expires ON ai_idempotency_keys (expires_at);

CREATE TABLE admin_audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action        VARCHAR(80) NOT NULL, -- mis. 'UPDATE_AI_CONFIG', 'SUSPEND_USER', 'ACTIVATE_USER'
    target_type   VARCHAR(50) NOT NULL, -- mis. 'system_ai_configs', 'user'
    target_id     VARCHAR(80) NOT NULL,
    reason        VARCHAR(300),
    changes       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_created ON admin_audit_logs (created_at DESC);
