-- SIT Nexus Database Migration: 001_initial_schema.sql
-- (Specification Section 9 & 45)
-- CRITICAL SECURITY RULE: Azure DevOps PAT is NEVER stored in database tables.

-- 1. MANAGERS TABLE
CREATE TABLE IF NOT EXISTS managers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'MANAGER',
    region VARCHAR(50) DEFAULT 'All',
    organization VARCHAR(255) DEFAULT 'caterpillar',
    project VARCHAR(255) DEFAULT 'CAT Digital',
    area_path VARCHAR(255) DEFAULT 'CAT Digital',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. RESOURCES TABLE (Resource Master - Zero Project Assignments)
CREATE TABLE IF NOT EXISTS resources (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    region VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    normalized_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resources_region ON resources (region);
CREATE INDEX IF NOT EXISTS idx_resources_email ON resources (normalized_email);

-- 3. PROJECT_CONFIGURATIONS TABLE (Discovered from ADO tags)
CREATE TABLE IF NOT EXISTS project_configurations (
    id VARCHAR(64) PRIMARY KEY,
    manager_id VARCHAR(64) REFERENCES managers(id),
    tag_value VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    source VARCHAR(50) NOT NULL DEFAULT 'AZURE_DEVOPS', -- 'AZURE_DEVOPS' | 'CUSTOM'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. SPRINT_CLOSURE_AUDITS TABLE (Execution logs - Zero PAT)
CREATE TABLE IF NOT EXISTS sprint_closure_audits (
    id VARCHAR(64) PRIMARY KEY,
    manager_id VARCHAR(64) REFERENCES managers(id),
    manager_name VARCHAR(255),
    sprint VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    area_path VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL DEFAULT 'CLOSE_INTERNAL_REVIEW_STORIES',
    action_type VARCHAR(100) NOT NULL DEFAULT 'Internal Review → Closed',
    requested_count INTEGER NOT NULL DEFAULT 0,
    successful_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL -- 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED'
);

CREATE INDEX IF NOT EXISTS idx_audits_sprint_region ON sprint_closure_audits (sprint, region);

-- 5. SPRINT_CLOSURE_AUDIT_DETAILS TABLE (Per-story tracking)
CREATE TABLE IF NOT EXISTS sprint_closure_audit_details (
    id VARCHAR(64) PRIMARY KEY,
    audit_id VARCHAR(64) NOT NULL REFERENCES sprint_closure_audits(id) ON DELETE CASCADE,
    story_id INTEGER NOT NULL,
    story_title VARCHAR(500),
    resource_name VARCHAR(255) NOT NULL,
    previous_state VARCHAR(50) NOT NULL,
    new_state VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'SUCCESS' | 'FAILED' | 'SKIPPED'
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_details_audit_id ON sprint_closure_audit_details (audit_id);
