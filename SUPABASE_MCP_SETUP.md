# Supabase MCP Setup for Claude Code

## 🚀 **Step-by-Step Setup Guide**

### **Step 1: Get Your Supabase Credentials**

1. **Go to your Supabase project**: https://supabase.com/dashboard
2. **Navigate to Settings → API**
3. **Copy these values**:
   - **Project URL** (looks like: `https://your-project.supabase.co`)
   - **anon public key** (starts with `eyJ...`)
   - **service_role secret key** (starts with `eyJ...`)

### **Step 2: Update MCP Configuration**

Edit the `mcp-config.json` file and replace the placeholder values:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["mcp-supabase"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
  }
}
```

### **Step 3: Create Your Supabase Database Tables**

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Services table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR NOT NULL,
  requires_couples_room BOOLEAN DEFAULT FALSE,
  requires_body_scrub_room BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Staff table
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  phone VARCHAR,
  can_perform_services TEXT[],
  default_room INTEGER,
  schedule JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  capacity INTEGER NOT NULL,
  capabilities TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id),
  staff_id UUID REFERENCES staff(id),
  room_id UUID REFERENCES rooms(id),
  customer_name VARCHAR NOT NULL,
  customer_email VARCHAR NOT NULL,
  customer_phone VARCHAR,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR DEFAULT 'confirmed',
  special_requests TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Step 4: Insert Initial Data**

```sql
-- Insert rooms
INSERT INTO rooms (name, capacity, capabilities) VALUES
('Room 1', 1, ARRAY['facial', 'massage', 'waxing']),
('Room 2', 2, ARRAY['facial', 'massage', 'waxing']),
('Room 3', 2, ARRAY['facial', 'massage', 'waxing', 'body_scrub']);

-- Insert staff
INSERT INTO staff (name, email, phone, can_perform_services, default_room, schedule) VALUES
('Selma Villaver', 'happyskinhappyyou@gmail.com', '(671) 482-7765', ARRAY['facials'], 1, '{"mon": true, "wed": true, "fri": true, "sat": true, "sun": true}'),
('Robyn Camacho', 'robyncmcho@gmail.com', '(671) 480-7862', ARRAY['facials', 'waxing', 'body_treatments', 'massages'], 3, '{"mon": true, "tue": true, "wed": true, "thu": true, "fri": true, "sat": true, "sun": true}'),
('Tanisha Harris', 'misstanishababyy@gmail.com', '(671) 747-5728', ARRAY['facials', 'waxing'], 2, '{"mon": true, "wed": true, "fri": true, "sat": true, "sun": true}'),
('Leonel Sidon', 'sidonleonel@gmail.com', '(671) 747-1882', ARRAY['massages', 'body_treatments'], NULL, '{"sun": true}');

-- Insert services (sample)
INSERT INTO services (name, description, duration, price, category, requires_couples_room, requires_body_scrub_room) VALUES
('Basic Facial', 'Rejuvenating facial treatment for all skin types', 30, 65.00, 'facial', FALSE, FALSE),
('Deep Cleansing Facial', 'Deep cleansing and hydration treatment', 60, 79.00, 'facial', FALSE, FALSE),
('Balinese Body Massage', 'Relaxing body massage', 60, 80.00, 'massage', FALSE, FALSE),
('Dead Sea Salt Body Scrub', 'Exfoliating body scrub treatment', 30, 65.00, 'body_treatment', FALSE, TRUE);
```

### **Step 5: Start Claude Code with MCP**

1. **Open Claude Code** in your project directory
2. **The MCP server should automatically connect** if the config is correct
3. **Test the connection** by asking Claude Code:
   ```
   Can you show me the services table from Supabase?
   ```

### **Step 6: What Claude Code Can Do with Supabase MCP**

- **Query data**: "Show me all available services"
- **Insert bookings**: "Create a new booking for a basic facial"
- **Check availability**: "Check room availability for tomorrow"
- **Update records**: "Update the booking status to confirmed"
- **Complex queries**: "Find all bookings for Selma this week"

### **Step 7: Environment Variables**

Also update your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Troubleshooting**

- **MCP not connecting**: Check your Supabase credentials in `mcp-config.json`
- **Permission errors**: Make sure your Supabase keys have the right permissions
- **Table not found**: Run the SQL commands in Supabase SQL Editor first

### **Next Steps**

Once MCP is connected, you can tell Claude Code:
```
"Create the database schema for the Dermal booking system and populate it with all the services, staff, and rooms data from our business logic documentation."
```

This will give Claude Code direct access to your Supabase database for building the booking system! 