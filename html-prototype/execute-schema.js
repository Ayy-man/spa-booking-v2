// Execute Supabase Schema Script
// This script executes the corrected schema in the Supabase database

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const SUPABASE_URL = 'https://doradsvnphdwotkeiylv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE'; // Replace with actual service role key

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function executeSchema() {
    try {
        console.log('🚀 Starting schema execution for Dermal Skin Clinic...');
        
        // Read the corrected schema file
        const schemaPath = path.join(__dirname, 'supabase-schema-fixed.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Split the schema into individual statements
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📝 Found ${statements.length} SQL statements to execute`);
        
        // Execute statements one by one
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i] + ';';
            
            try {
                // Skip comment-only statements
                if (statement.trim().startsWith('--') || statement.trim() === ';') {
                    continue;
                }
                
                console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
                
                const { data, error } = await supabase.rpc('exec_sql', {
                    sql: statement
                });
                
                if (error) {
                    console.error(`❌ Error in statement ${i + 1}:`, error.message);
                    console.error(`Statement: ${statement.substring(0, 100)}...`);
                    errorCount++;
                } else {
                    successCount++;
                    console.log(`✅ Statement ${i + 1} executed successfully`);
                }
                
                // Add small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (err) {
                console.error(`❌ Exception in statement ${i + 1}:`, err.message);
                errorCount++;
            }
        }
        
        console.log('\n📊 Execution Summary:');
        console.log(`✅ Successful statements: ${successCount}`);
        console.log(`❌ Failed statements: ${errorCount}`);
        
        if (errorCount === 0) {
            console.log('🎉 Schema executed successfully!');
            await verifySchemaCreation();
        } else {
            console.log('⚠️  Schema execution completed with some errors. Please review the error messages above.');
        }
        
    } catch (error) {
        console.error('💥 Fatal error during schema execution:', error);
    }
}

async function verifySchemaCreation() {
    console.log('\n🔍 Verifying schema creation...');
    
    try {
        // Check if tables were created
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .in('table_name', ['services', 'staff', 'customers', 'bookings', 'rooms']);
        
        if (tablesError) {
            console.error('❌ Error checking tables:', tablesError);
            return;
        }
        
        console.log(`✅ Found ${tables?.length || 0} core tables`);
        
        // Check services count
        const { count: servicesCount, error: servicesError } = await supabase
            .from('services')
            .select('*', { count: 'exact', head: true });
        
        if (servicesError) {
            console.error('❌ Error checking services:', servicesError);
        } else {
            console.log(`✅ Services table has ${servicesCount} records`);
        }
        
        // Check staff count
        const { count: staffCount, error: staffError } = await supabase
            .from('staff')
            .select('*', { count: 'exact', head: true });
        
        if (staffError) {
            console.error('❌ Error checking staff:', staffError);
        } else {
            console.log(`✅ Staff table has ${staffCount} records`);
        }
        
        // Check rooms count
        const { count: roomsCount, error: roomsError } = await supabase
            .from('rooms')
            .select('*', { count: 'exact', head: true });
        
        if (roomsError) {
            console.error('❌ Error checking rooms:', roomsError);
        } else {
            console.log(`✅ Rooms table has ${roomsCount} records`);
        }
        
        console.log('\n🎉 Schema verification completed!');
        console.log('🌐 Your Dermal Skin Clinic database is ready to use.');
        
    } catch (error) {
        console.error('💥 Error during verification:', error);
    }
}

// Alternative method using direct SQL execution if RPC is not available
async function executeSchemaDirectly() {
    console.log('🔄 Attempting direct SQL execution...');
    
    try {
        const schemaPath = path.join(__dirname, 'supabase-schema-fixed.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute the entire schema as one transaction
        const { data, error } = await supabase.rpc('execute_sql', {
            query: schemaSQL
        });
        
        if (error) {
            console.error('❌ Error executing schema:', error);
            
            // Try alternative method: execute in smaller chunks
            console.log('🔄 Trying chunked execution...');
            await executeSchemaInChunks();
        } else {
            console.log('✅ Schema executed successfully!');
            await verifySchemaCreation();
        }
        
    } catch (error) {
        console.error('💥 Error in direct execution:', error);
        console.log('📝 Please manually execute the schema file in Supabase SQL Editor');
    }
}

async function executeSchemaInChunks() {
    const schemaPath = path.join(__dirname, 'supabase-schema-fixed.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Split into logical chunks (by sections)
    const chunks = schemaSQL.split('-- ========================================');
    
    for (let i = 0; i < chunks.length; i++) {
        if (chunks[i].trim()) {
            console.log(`⏳ Executing chunk ${i + 1}/${chunks.length}...`);
            
            try {
                const { error } = await supabase.rpc('execute_sql', {
                    query: chunks[i]
                });
                
                if (error) {
                    console.error(`❌ Error in chunk ${i + 1}:`, error.message);
                } else {
                    console.log(`✅ Chunk ${i + 1} executed successfully`);
                }
                
                // Add delay between chunks
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (err) {
                console.error(`❌ Exception in chunk ${i + 1}:`, err.message);
            }
        }
    }
}

// Main execution
if (require.main === module) {
    console.log('🏥 Dermal Skin Clinic - Database Schema Setup');
    console.log('='.repeat(50));
    
    if (SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
        console.error('❌ Please update the SUPABASE_SERVICE_ROLE_KEY in this file before running.');
        console.error('📖 You can find your service role key in the Supabase dashboard under Settings > API');
        process.exit(1);
    }
    
    executeSchema();
}

module.exports = {
    executeSchema,
    verifySchemaCreation
};