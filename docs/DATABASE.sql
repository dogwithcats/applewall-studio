-- =============================================================================
-- 果壁 Studio (AppleWall Studio) 数据库设计 (PostgreSQL 15+)
-- 设计原则：
--   1. 面向免费开放阶段：无复杂计费账本，专注作品沉淀、防刷限流与用户反馈收集
--   2. 支持游客无缝体验 (visitor_fingerprint) + 轻量登录用户 (users) 平滑升级
--   3. 支持「单图多端套图」(1 个创作项目 -> iPhone / iPad / Mac 多个导出变体)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. 用户表 (支持极简登录，初期允许匿名使用，登录后绑定历史记录)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nickname        VARCHAR(64) NOT NULL DEFAULT '果粉创作者',
    avatar_url      TEXT,
    email           VARCHAR(128) UNIQUE,
    wechat_openid   VARCHAR(128) UNIQUE,         -- 国内微信扫码/公众号登录预留
    apple_sub       VARCHAR(128) UNIQUE,         -- Sign in with Apple 预留
    daily_quota     INT NOT NULL DEFAULT 15,     -- 每日免费云端 AI 次数
    is_banned       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. AI 风格预设表 (可后台动态热更新，不改代码即可上新热门风格)
-- -----------------------------------------------------------------------------
CREATE TABLE style_presets (
    id                  VARCHAR(64) PRIMARY KEY, -- 如 'portrait-studio-light', 'art-shinkai'
    name                VARCHAR(64) NOT NULL,    -- 中文展示名
    subtitle            VARCHAR(128) NOT NULL,   -- 一句话亮点
    scenario            VARCHAR(32) NOT NULL CHECK (scenario IN ('portrait_pet', 'scenery_art')),
    badge               VARCHAR(32),             -- 如 '保真推荐', '小红书热门', 'OLED 省电'
    prompt_template     TEXT NOT NULL,           -- 发送给 AI 的标准提示词模板
    negative_prompt     TEXT,                    -- 反向提示词
    default_strength    NUMERIC(3,2) NOT NULL DEFAULT 0.35, -- 0.2~0.4 保真; 0.55~0.8 艺术二创
    preferred_provider  VARCHAR(32) NOT NULL DEFAULT 'volcengine',
    cover_image_url     TEXT,
    sort_order          INT NOT NULL DEFAULT 100,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    usage_count         BIGINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_style_presets_scenario_active ON style_presets(scenario, is_active, sort_order);

-- -----------------------------------------------------------------------------
-- 3. 原图与壁纸项目主表 (记录一次上传与美化上下文)
-- -----------------------------------------------------------------------------
CREATE TABLE wallpaper_projects (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    visitor_id          VARCHAR(64),             -- 游客本地持久化标识，方便登录后认领
    title               VARCHAR(128),
    scenario            VARCHAR(32) NOT NULL CHECK (scenario IN ('portrait_pet', 'scenery_art')),
    preset_id           VARCHAR(64) REFERENCES style_presets(id) ON DELETE SET NULL,
    custom_prompt       TEXT,
    -- 原图存储 Key (生产环境建议 OSS 配置 24h 自动过期以保护人像隐私)
    source_image_key    TEXT NOT NULL,
    source_width        INT NOT NULL,
    source_height       INT NOT NULL,
    -- AI 美化后的主母版图
    master_image_key    TEXT,
    foreground_mask_key TEXT,                    -- 景深主体透明通道 (可选，用于 iOS 景深预览)
    dominant_color      VARCHAR(16),             -- 提取主色，用于 UI 氛围光与主屏配对
    -- 社区广场控制 (默认仅自己可见，用户主动勾选才公开到“灵感广场”)
    is_public           BOOLEAN NOT NULL DEFAULT FALSE,
    allow_remix         BOOLEAN NOT NULL DEFAULT TRUE, -- 允许他人点击“做同款”
    like_count          INT NOT NULL DEFAULT 0,
    remix_count         INT NOT NULL DEFAULT 0,
    safety_status       VARCHAR(24) NOT NULL DEFAULT 'pending'
                        CHECK (safety_status IN ('pending', 'passed', 'rejected')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user ON wallpaper_projects(user_id, created_at DESC);
CREATE INDEX idx_projects_visitor ON wallpaper_projects(visitor_id, created_at DESC);
CREATE INDEX idx_projects_public_gallery ON wallpaper_projects(is_public, safety_status, like_count DESC)
    WHERE is_public = TRUE;

-- -----------------------------------------------------------------------------
-- 4. 多端设备适配产物表 (一个项目对应 iPhone / iPad / Mac / 主屏配对等多张成品)
-- -----------------------------------------------------------------------------
CREATE TABLE device_exports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES wallpaper_projects(id) ON DELETE CASCADE,
    device_family       VARCHAR(24) NOT NULL CHECK (device_family IN ('iphone', 'ipad', 'mac')),
    device_model_id     VARCHAR(64) NOT NULL,    -- 如 'iphone-16-pro-max', 'macbook-pro-16'
    variant_type        VARCHAR(24) NOT NULL DEFAULT 'lockscreen'
                        CHECK (variant_type IN ('lockscreen', 'homescreen_blur', 'desktop', 'poster')),
    target_width        INT NOT NULL,
    target_height       INT NOT NULL,
    -- 构图与安全区微调参数 (JSON 保存，方便二次打开继续调)
    framing_config      JSONB NOT NULL DEFAULT '{}'::jsonb,
    image_key           TEXT NOT NULL,
    file_size_bytes     BIGINT,
    is_upscaled_hd      BOOLEAN NOT NULL DEFAULT FALSE, -- 是否已触发 4K/5K 超分
    download_count      INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exports_project ON device_exports(project_id, device_family);

-- -----------------------------------------------------------------------------
-- 5. AI 异步生成任务表 (追踪队列状态、耗时、厂商与成本估算)
-- -----------------------------------------------------------------------------
CREATE TABLE generation_jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES wallpaper_projects(id) ON DELETE CASCADE,
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    visitor_ip_hash     VARCHAR(64) NOT NULL,    -- 脱敏 IP 哈希，用于免费额度限流
    job_type            VARCHAR(32) NOT NULL
                        CHECK (job_type IN ('beautify', 'outpaint', 'upscale_hd', 'depth_mask', 'suite_pack')),
    provider            VARCHAR(32) NOT NULL,    -- 'volcengine' | 'dashscope' | 'siliconflow' | 'gemini' | 'local'
    model_name          VARCHAR(128) NOT NULL,
    status              VARCHAR(24) NOT NULL DEFAULT 'queued'
                        CHECK (status IN ('queued', 'processing', 'succeeded', 'failed', 'cancelled')),
    request_payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message       TEXT,
    duration_ms         INT,
    estimated_cost_fen  INT NOT NULL DEFAULT 0,  -- 成本监控(单位: 分)，方便观察免费阶段烧钱速度
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_jobs_status ON generation_jobs(status, created_at);
CREATE INDEX idx_jobs_rate_limit ON generation_jobs(visitor_ip_hash, created_at DESC);

-- -----------------------------------------------------------------------------
-- 6. 免费额度每日用量表 (高效限流，避免扫描大表)
-- -----------------------------------------------------------------------------
CREATE TABLE daily_usage_quotas (
    quota_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    subject_key         VARCHAR(128) NOT NULL,   -- 'user:<uuid>' 或 'ip:<sha256>'
    used_cloud_count    INT NOT NULL DEFAULT 0,
    used_upscale_count  INT NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (quota_date, subject_key)
);

-- -----------------------------------------------------------------------------
-- 7. 灵感广场点赞表
-- -----------------------------------------------------------------------------
CREATE TABLE gallery_likes (
    project_id          UUID NOT NULL REFERENCES wallpaper_projects(id) ON DELETE CASCADE,
    subject_key         VARCHAR(128) NOT NULL,   -- 登录用户或游客指纹
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, subject_key)
);

-- -----------------------------------------------------------------------------
-- 8. 用户反馈与愿望单表 (免费阶段最核心资产：收集改进意见与新风格投票)
-- -----------------------------------------------------------------------------
CREATE TABLE user_feedbacks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    visitor_id          VARCHAR(64),
    category            VARCHAR(32) NOT NULL
                        CHECK (category IN ('style_request', 'device_bug', 'effect_quality', 'ux_idea', 'other')),
    device_context      VARCHAR(64),             -- 用户当前选择的机型，方便复现问题
    preset_context      VARCHAR(64),             -- 用户当前使用的风格
    rating              SMALLINT CHECK (rating BETWEEN 1 AND 5),
    content             TEXT NOT NULL,
    contact             VARCHAR(128),            -- 可选微信/邮箱，方便回访热心用户
    status              VARCHAR(24) NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new', 'reviewed', 'planned', 'shipped')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedbacks_status_created ON user_feedbacks(status, created_at DESC);
