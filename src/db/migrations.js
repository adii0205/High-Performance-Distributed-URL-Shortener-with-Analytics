const { query } = require('./pool');

async function runMigrations() {
  console.log('Running database migrations...');

  try {
    // Create users table (v2.0 with JWT authentication)
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created/Updated users table');

    // Create URLs table
    await query(`
      CREATE TABLE IF NOT EXISTS urls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        short_code VARCHAR(10) UNIQUE NOT NULL,
        original_url TEXT NOT NULL,
        custom_alias VARCHAR(255) UNIQUE,
        title VARCHAR(255),
        description TEXT,
        custom_domain VARCHAR(255),
        click_count INTEGER DEFAULT 0,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        visibility VARCHAR(50) DEFAULT 'public', -- public, private, analytics-only
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created/Updated urls table');

    // Create analytics table
    await query(`
      CREATE TABLE IF NOT EXISTS analytics (
        id BIGSERIAL PRIMARY KEY,
        url_id UUID REFERENCES urls(id) ON DELETE CASCADE,
        short_code VARCHAR(10),
        ip_address INET,
        country_code VARCHAR(2),
        country_name VARCHAR(255),
        city VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        device_type VARCHAR(50),
        browser VARCHAR(255),
        browser_version VARCHAR(50),
        os VARCHAR(255),
        os_version VARCHAR(50),
        referrer TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created/Updated analytics table');

    // Create analytics summary table (for aggregated metrics)
    await query(`
      CREATE TABLE IF NOT EXISTS analytics_summary (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url_id UUID REFERENCES urls(id) ON DELETE CASCADE,
        short_code VARCHAR(10),
        click_count BIGINT DEFAULT 0,
        unique_ips BIGINT DEFAULT 0,
        last_click_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created/Updated analytics_summary table');

    // Create rate_limit_logs table
    await query(`
      CREATE TABLE IF NOT EXISTS rate_limit_logs (
        id SERIAL PRIMARY KEY,
        ip_address INET NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        request_count INTEGER DEFAULT 1,
        window_start TIMESTAMP NOT NULL,
        window_end TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created rate_limit_logs table');

    // Create indexes - PHASE 5 OPTIMIZATION
    // Primary lookup index (most critical)
    await query(`
      CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);
    `);

    // User-related indexes (for dashboard/user-specific queries)
    await query(`
      CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id);
      CREATE INDEX IF NOT EXISTS idx_urls_user_created 
        ON urls(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_urls_user_active 
        ON urls(user_id, is_active) WHERE is_active = TRUE;
    `);

    // Custom alias lookup
    await query(`
      CREATE INDEX IF NOT EXISTS idx_urls_custom_alias ON urls(custom_alias);
    `);

    // Active URLs filter (partial index - more efficient)
    await query(`
      CREATE INDEX IF NOT EXISTS idx_urls_active 
        ON urls(is_active) WHERE is_active = TRUE;
      
      CREATE INDEX IF NOT EXISTS idx_urls_active_created 
        ON urls(created_at DESC) WHERE is_active = TRUE;
    `);

    // Analytics indexes - optimized for time-series queries
    // Single column for quick lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_short_code ON analytics(short_code);
    `);

    // Time-based queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_timestamp 
        ON analytics(created_at DESC);
    `);

    // Composite indexes for common query patterns
    // Most common: get analytics for a specific URL in time range
    await query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_shortcode_timestamp 
        ON analytics(short_code, created_at DESC);
    `);

    // For geographic breakdown queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_country 
        ON analytics(country_code);
      
      CREATE INDEX IF NOT EXISTS idx_analytics_country_short 
        ON analytics(short_code, country_code);
    `);

    // For device breakdown queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_device ON analytics(device_type);
      
      CREATE INDEX IF NOT EXISTS idx_analytics_device_short 
        ON analytics(short_code, device_type);
    `);

    // For browser analysis
    await query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_browser ON analytics(browser);
      
      CREATE INDEX IF NOT EXISTS idx_analytics_browser_short 
        ON analytics(short_code, browser);
    `);

    // IP-based indexes (for unique visitor tracking)
    await query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_ip ON analytics(ip_address);
      
      CREATE INDEX IF NOT EXISTS idx_analytics_ip_short 
        ON analytics(short_code, ip_address);
    `);

    // Covering index for common analytics queries
    // Includes all columns needed for breakdown queries (avoid table scan)
    await query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_covering 
        ON analytics(short_code, created_at) 
        INCLUDE (country_code, device_type, browser, ip_address);
    `);

    // Analytics summary indexes
    try {
      await query(`
        CREATE INDEX IF NOT EXISTS idx_analytics_summary_short_code 
          ON analytics_summary(short_code);
        
        CREATE INDEX IF NOT EXISTS idx_analytics_summary_clicks 
          ON analytics_summary(click_count DESC);
      `);
      
      // Try to add url_id column if it doesn't exist
      try {
        await query(`ALTER TABLE analytics_summary ADD COLUMN url_id UUID REFERENCES urls(id) ON DELETE CASCADE;`);
      } catch (e) {
        // Column may already exist, ignore
      }
      
      // Now create the index
      await query(`
        CREATE INDEX IF NOT EXISTS idx_analytics_summary_url_id 
          ON analytics_summary(url_id);
      `);
    } catch (e) {
      console.warn('⚠️  Could not create all analytics_summary indexes:', e.message);
    }

    // Rate limit indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_ip_endpoint 
        ON rate_limit_logs(ip_address, endpoint, window_start);
      
      CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_window 
        ON rate_limit_logs(window_end);
    `);

    console.log('✓ Created all indexes (Phase 5 optimization)');

    console.log('✓ All migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

// Run migrations if called directly
if (require.main === module) {
  const { initDatabase } = require('./pool');
  
  (async () => {
    try {
      await initDatabase();
      await runMigrations();
      process.exit(0);
    } catch (error) {
      console.error('Failed to run migrations:', error);
      process.exit(1);
    }
  })();
}

module.exports = { runMigrations };
