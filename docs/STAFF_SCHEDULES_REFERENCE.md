# Staff Work Schedules Reference

Based on the latest database migrations (019_update_staff_schedules_and_exclusions_fixed.sql):

## Work Days (0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday)

### Selma Villaver
- **Work Days**: `[0,1,2,3,4,5,6]` - **WORKS ALL 7 DAYS**
- **Schedule**: Sunday through Saturday (EVERY DAY)
- **Services**: Facials only
- **Exclusions**: Dermaplaning

### Robyn Camacho  
- **Work Days**: `[0,3,4,5,6]` - OFF Monday & Tuesday
- **Schedule**: Sunday, Wednesday, Thursday, Friday, Saturday
- **Services**: Facial, massage, waxing, body treatment, body scrub
- **Exclusions**: Various facial treatments

### Tanisha Harris
- **Work Days**: `[0,1,3,5,6]` - OFF Tuesday & Thursday  
- **Schedule**: Sunday, Monday, Wednesday, Friday, Saturday
- **Services**: Facial, waxing
- **Exclusions**: Radio frequency, nano microneedling, derma roller

### Leonel Sidon
- **Work Days**: `[0,3,4,5,6]` - OFF Monday & Tuesday (same as Robyn)
- **Schedule**: Sunday, Wednesday, Thursday, Friday, Saturday
- **Services**: Massage, body treatment
- **Exclusions**: None

## Important Notes:
- The StaffScheduleView component correctly reads these work_days from the database
- The `isStaffWorking()` function checks if the current day is in the staff member's work_days array
- Days when staff are off show as "Off today" in the header and cells are grayed out