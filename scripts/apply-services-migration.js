#!/usr/bin/env node

/**
 * Script to verify and apply the new services and add-ons migration
 * Run this after applying the SQL migration to verify everything worked
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Please check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  console.log('🔍 Verifying Services and Add-ons Migration...\n');

  try {
    // 1. Check if new tables exist
    console.log('1️⃣ Checking for new tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('service_addons')
      .select('id')
      .limit(1);

    if (tablesError && tablesError.message.includes('relation')) {
      console.error('❌ service_addons table not found. Please run the migration first.');
      console.log('\n📝 To apply migration:');
      console.log('1. Go to Supabase SQL Editor');
      console.log('2. Copy contents of: /supabase/migrations/053_add_services_and_addons.sql');
      console.log('3. Run the SQL');
      return false;
    }
    console.log('✅ Add-on tables exist');

    // 2. Count new services
    console.log('\n2️⃣ Counting services...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, allows_addons');

    if (servicesError) {
      console.error('❌ Error querying services:', servicesError);
      return false;
    }

    const totalServices = services.length;
    const servicesWithAddons = services.filter(s => s.allows_addons).length;
    
    console.log(`✅ Total services: ${totalServices}`);
    console.log(`✅ Services allowing add-ons: ${servicesWithAddons}`);

    // 3. Check for specific new services
    console.log('\n3️⃣ Checking for new services...');
    const newServiceIds = ['consultation', '3face_basic_micro', 'sideburns_wax', 'vitamin_c_treatment'];
    const foundServices = services.filter(s => newServiceIds.includes(s.id));
    
    if (foundServices.length === newServiceIds.length) {
      console.log('✅ All sample new services found');
      foundServices.forEach(s => console.log(`   - ${s.name}`));
    } else {
      console.log(`⚠️ Only ${foundServices.length}/${newServiceIds.length} sample services found`);
      const missing = newServiceIds.filter(id => !foundServices.find(s => s.id === id));
      console.log('   Missing:', missing.join(', '));
    }

    // 4. Count add-ons
    console.log('\n4️⃣ Counting add-ons...');
    const { data: addons, error: addonsError } = await supabase
      .from('service_addons')
      .select('id, name, category, price');

    if (addonsError) {
      console.error('❌ Error querying add-ons:', addonsError);
      return false;
    }

    console.log(`✅ Total add-ons: ${addons.length}`);
    
    // Group add-ons by category
    const addonsByCategory = {};
    addons.forEach(addon => {
      if (!addonsByCategory[addon.category]) {
        addonsByCategory[addon.category] = [];
      }
      addonsByCategory[addon.category].push(addon);
    });

    Object.keys(addonsByCategory).forEach(category => {
      console.log(`   ${category}: ${addonsByCategory[category].length} add-ons`);
    });

    // 5. Test helper functions
    console.log('\n5️⃣ Testing helper functions...');
    const { data: massageAddons, error: functionError } = await supabase
      .rpc('get_available_addons', { service_id_param: 'balinese_massage' });

    if (functionError) {
      console.log('⚠️ Helper function not working:', functionError.message);
    } else {
      console.log(`✅ Helper functions working (found ${massageAddons?.length || 0} add-ons for massage)`);
    }

    // 6. Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Services: ${totalServices} total (${totalServices > 100 ? '✅' : '⚠️'} Expected 150+)`);
    console.log(`Add-ons: ${addons.length} total (${addons.length >= 20 ? '✅' : '⚠️'} Expected 25+)`);
    console.log(`Services with add-ons: ${servicesWithAddons}`);
    console.log('='.repeat(50));

    if (totalServices > 100 && addons.length >= 20) {
      console.log('\n✅ Migration successfully applied!');
      return true;
    } else {
      console.log('\n⚠️ Migration may be incomplete. Please check the numbers above.');
      return false;
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

async function listServiceCategories() {
  console.log('\n📋 Service Categories:');
  
  const { data: services } = await supabase
    .from('services')
    .select('category, ghl_category')
    .order('category');

  const categories = {};
  services?.forEach(s => {
    if (!categories[s.category]) {
      categories[s.category] = { count: 0, ghl: s.ghl_category };
    }
    categories[s.category].count++;
  });

  Object.entries(categories).forEach(([cat, info]) => {
    console.log(`   ${cat}: ${info.count} services → GHL: ${info.ghl}`);
  });
}

// Run verification
(async () => {
  console.log('🚀 Services & Add-ons Migration Verification\n');
  console.log('Database:', supabaseUrl);
  console.log('Time:', new Date().toISOString());
  console.log('='.repeat(50));

  const success = await verifyMigration();
  
  if (success) {
    await listServiceCategories();
    
    console.log('\n✨ Next Steps:');
    console.log('1. Test booking a service with add-ons');
    console.log('2. Check admin panel displays new services');
    console.log('3. Verify waivers trigger for waxing services');
    console.log('4. Implement UI for add-on selection');
  }
  
  process.exit(success ? 0 : 1);
})();