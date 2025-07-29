# Supabase Setup Rule - Claude Code

You are tasked with setting up the complete Supabase database for the Dermal Skin Clinic booking system. Follow these steps:

## 1. Connect to Supabase
Use the MCP connection to access the Supabase database at:
- URL: https://doradsvnphdwotkeiylv.supabase.co
- Anon Key: [configured in mcp-config.json]
- Service Role Key: [configured in mcp-config.json]

## 2. Create Database Schema
Execute these SQL commands to create all necessary tables:

```sql
-- Services table
CREATE TABLE IF NOT EXISTS services (
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
CREATE TABLE IF NOT EXISTS staff (
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
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  capacity INTEGER NOT NULL,
  capabilities TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
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

## 3. Populate with Initial Data
Insert all the data from the business logic documentation:

### Rooms Data
```sql
INSERT INTO rooms (name, capacity, capabilities) VALUES
('Room 1', 1, ARRAY['facial', 'massage', 'waxing']),
('Room 2', 2, ARRAY['facial', 'massage', 'waxing']),
('Room 3', 2, ARRAY['facial', 'massage', 'waxing', 'body_scrub'])
ON CONFLICT DO NOTHING;
```

### Staff Data
```sql
INSERT INTO staff (name, email, phone, can_perform_services, default_room, schedule) VALUES
('Selma Villaver', 'happyskinhappyyou@gmail.com', '(671) 482-7765', ARRAY['facials'], 1, '{"mon": true, "wed": true, "fri": true, "sat": true, "sun": true}'),
('Robyn Camacho', 'robyncmcho@gmail.com', '(671) 480-7862', ARRAY['facials', 'waxing', 'body_treatments', 'massages'], 3, '{"mon": true, "tue": true, "wed": true, "thu": true, "fri": true, "sat": true, "sun": true}'),
('Tanisha Harris', 'misstanishababyy@gmail.com', '(671) 747-5728', ARRAY['facials', 'waxing'], 2, '{"mon": true, "wed": true, "fri": true, "sat": true, "sun": true}'),
('Leonel Sidon', 'sidonleonel@gmail.com', '(671) 747-1882', ARRAY['massages', 'body_treatments'], NULL, '{"sun": true}')
ON CONFLICT DO NOTHING;
```

### Services Data
Insert ALL 50+ services from the business logic documentation, including:
- All facials (Basic, Deep Cleansing, Placenta/Collagen, etc.)
- All massages (Balinese, Maternity, Deep Tissue, etc.)
- All body treatments (Underarm Cleaning, Back Treatment, etc.)
- All waxing services (Eyebrow, Lip, Brazilian, etc.)
- All packages (Balinese + Facial, Deep Tissue + 3Face, etc.)
- Special services (Vajacial + Brazilian, VIP Card)

## 4. Verify Setup
After creating and populating the database:
1. Check that all tables exist
2. Verify all data was inserted correctly
3. Test a simple query to confirm functionality

## 5. Report Results
Provide a summary of:
- Tables created
- Records inserted
- Any errors encountered
- Next steps for development

## Important Notes
- Use IF NOT EXISTS to avoid errors if tables already exist
- Use ON CONFLICT DO NOTHING for data inserts to avoid duplicates
- Reference the business logic documentation for complete service list
- Ensure all pricing and duration data matches the documentation exactly 