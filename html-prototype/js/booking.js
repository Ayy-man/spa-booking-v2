// Booking System JavaScript
let selectedService = null;
let selectedDate = null;
let selectedTime = null;
let selectedStaff = null;
let customerInfo = null;

// Initialize booking system
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('service-categories')) {
        initializeServiceSelection();
    }
    if (document.getElementById('date-grid')) {
        initializeDateTimeSelection();
    }
    if (document.getElementById('staff-selection')) {
        initializeStaffSelection();
    }
    if (document.getElementById('customer-form')) {
        initializeCustomerForm();
    }
    if (document.getElementById('booking-confirmation')) {
        initializeConfirmation();
    }
});

// Service Selection Page
function initializeServiceSelection() {
    populateServices();
    
    // Continue button functionality
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
        continueBtn.addEventListener('click', function() {
            if (selectedService) {
                localStorage.setItem('selectedService', JSON.stringify(selectedService));
                window.location.href = 'date-time.html';
            }
        });
    }
}

async function populateServices() {
    try {
        // Show loading state
        const categories = ['facials', 'massages', 'treatments', 'waxing', 'packages', 'special'];
        categories.forEach(category => {
            const gridId = getGridId(category);
            const grid = document.getElementById(gridId);
            if (grid) {
                grid.innerHTML = '<div style="padding: 2rem; text-align: center; color: #6B7280;">Loading services...</div>';
            }
        });

        // Fetch services from database
        const services = await SupabaseAPI.getServices();
        console.log('Loaded services from database:', services.length);
        
        // Group services by category
        const servicesByCategory = {
            facials: [],
            massages: [],
            treatments: [],
            waxing: [],
            packages: [],
            special: []
        };
        
        services.forEach(service => {
            if (servicesByCategory[service.category]) {
                servicesByCategory[service.category].push(service);
            }
        });

        // Populate each category grid
        Object.keys(servicesByCategory).forEach(categoryKey => {
            const gridId = getGridId(categoryKey);
            const grid = document.getElementById(gridId);
            
            if (grid) {
                grid.innerHTML = ''; // Clear loading message
                servicesByCategory[categoryKey].forEach(service => {
                    const serviceCard = createServiceCard(service);
                    grid.appendChild(serviceCard);
                });
                
                // Show message if no services in category
                if (servicesByCategory[categoryKey].length === 0) {
                    grid.innerHTML = '<div style="padding: 1rem; text-align: center; color: #9CA3AF;">No services available in this category</div>';
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading services:', error);
        // Show error message in all grids
        const categories = ['facials', 'massages', 'treatments', 'waxing', 'packages', 'special'];
        categories.forEach(category => {
            const gridId = getGridId(category);
            const grid = document.getElementById(gridId);
            if (grid) {
                grid.innerHTML = '<div style="padding: 2rem; text-align: center; color: #DC2626;">Error loading services. Please refresh the page.</div>';
            }
        });
    }
}

function getGridId(categoryKey) {
    const gridMap = {
        'facials': 'facials-grid',
        'massages': 'massages-grid',
        'treatments': 'treatments-grid',
        'waxing': 'waxing-grid',
        'packages': 'packages-grid',
        'special': 'special-grid'
    };
    return gridMap[categoryKey];
}

function createServiceCard(service) {
    const card = document.createElement('div');
    card.className = 'card cursor-pointer transition-all';
    card.style.cssText = `
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    
    card.innerHTML = `
        <h3 class="text-lg font-medium text-primary-dark mb-2">${service.name}</h3>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 1.5rem; font-weight: 600; color: var(--primary);">$${service.price}</span>
            <span style="font-size: 0.875rem; color: #6B7280;">${service.duration} mins</span>
        </div>
        <button class="w-full py-2 px-4 rounded-lg transition-colors font-medium" 
                style="background-color: #000000; color: white; border: none; cursor: pointer; min-height: 44px;"
                onmouseover="this.style.backgroundColor='#1f2937'"
                onmouseout="this.style.backgroundColor='#000000'">
            Select
        </button>
    `;
    
    card.addEventListener('click', function() {
        selectService(service, card);
    });
    
    return card;
}

function selectService(service, cardElement) {
    // Remove previous selection
    document.querySelectorAll('.card').forEach(card => {
        card.style.border = '2px solid transparent';
        const button = card.querySelector('button');
        if (button) {
            button.textContent = 'Select';
            button.style.backgroundColor = '#000000';
        }
    });
    
    // Mark as selected
    selectedService = service;
    cardElement.style.border = '2px solid var(--primary)';
    const button = cardElement.querySelector('button');
    if (button) {
        button.textContent = 'Selected';
        button.style.backgroundColor = 'var(--primary)';
    }
    
    // Show continue button with loading state
    const continueSection = document.getElementById('continue-section');
    const continueBtn = document.getElementById('continue-btn');
    if (continueSection) {
        continueSection.style.display = 'block';
    }
    
    // Update button text and auto-advance
    if (continueBtn) {
        continueBtn.innerHTML = 'Continuing to Date & Time Selection';
        continueBtn.classList.add('auto-navigating');
    }
    
    setTimeout(() => {
        localStorage.setItem('selectedService', JSON.stringify(selectedService));
        window.location.href = 'date-time.html';
    }, 800);
}

// Date and Time Selection
function initializeDateTimeSelection() {
    // Load selected service
    const serviceData = localStorage.getItem('selectedService');
    if (serviceData) {
        selectedService = JSON.parse(serviceData);
        displayServiceContext();
    }
    
    generateAvailableDates();
}

function displayServiceContext() {
    const contextDiv = document.getElementById('service-context');
    if (contextDiv && selectedService) {
        contextDiv.innerHTML = `
            <p style="font-size: 0.875rem; color: #6B7280;">Booking for:</p>
            <p style="font-size: 1.125rem; font-weight: 600; color: var(--primary-dark);">${selectedService.name}</p>
            <p style="font-size: 0.875rem; color: #6B7280;">${selectedService.duration} minutes • $${selectedService.price}</p>
        `;
    }
}

function generateAvailableDates() {
    console.log('generateAvailableDates called');
    const dateGrid = document.getElementById('date-grid');
    console.log('dateGrid element:', dateGrid);
    
    if (!dateGrid) {
        console.error('date-grid element not found');
        return;
    }
    
    // Clear existing dates first
    dateGrid.innerHTML = '';
    
    const dates = [];
    const today = new Date();
    
    // Generate next 30 available dates
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Skip Tuesdays and Thursdays (when Selma/Tanisha are off)
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 2 && dayOfWeek !== 4) {
            dates.push(date);
        }
    }
    
    console.log('Generated dates:', dates.length);
    
    // Add dates to grid with proper error handling
    dates.forEach((date, index) => {
        try {
            const dateButton = createDateButton(date);
            if (dateButton) {
                dateGrid.appendChild(dateButton);
                console.log(`Added date button ${index + 1}:`, date.toLocaleDateString());
            }
        } catch (error) {
            console.error('Error creating date button for:', date, error);
        }
    });
    
    console.log('Date buttons added to grid. Grid children count:', dateGrid.children.length);
    
    // Verify the grid has content
    if (dateGrid.children.length === 0) {
        console.error('No date buttons were added to the grid');
        // Add a fallback message
        dateGrid.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Unable to load available dates. Please refresh the page.</div>';
    }
}

function createDateButton(date) {
    try {
        const button = document.createElement('button');
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        
        // Apply CSS classes
        button.className = `date-button-available ${isWeekend ? 'date-button-weekend' : ''}`;
        
        // Store date data for selection logic
        button.dataset.date = date.toISOString();
        
        // Add inline styles to ensure visibility
        button.style.cssText = `
            min-width: 70px;
            min-height: 60px;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 8px 12px;
            margin: 0;
            border: 2px solid #9CA3AF;
            border-radius: 8px;
            background-color: white;
            color: #374151;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: inherit;
        `;
        
        // Weekend styling is handled by CSS classes, no inline styles needed
        
        // Create content
        const dayDiv = document.createElement('div');
        dayDiv.style.cssText = 'font-size: 0.75rem; font-weight: 500; line-height: 1;';
        dayDiv.textContent = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const dateDiv = document.createElement('div');
        dateDiv.style.cssText = 'font-size: 0.875rem; font-weight: 600; line-height: 1; margin-top: 2px;';
        dateDiv.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        button.appendChild(dayDiv);
        button.appendChild(dateDiv);
        
        // Add click handler
        button.addEventListener('click', function(e) {
            e.preventDefault();
            selectDate(date, button);
        });
        
        // Hover effects are handled by CSS classes
        
        return button;
    } catch (error) {
        console.error('Error in createDateButton:', error);
        return null;
    }
}

function selectDate(date, buttonElement) {
    // Remove previous selection from all date buttons
    document.querySelectorAll('.date-button-available, .date-button-selected').forEach(btn => {
        // Reset to available state
        btn.classList.remove('date-button-selected');
        btn.classList.add('date-button-available');
        
        // Restore weekend styling if needed
        const btnDate = new Date(btn.dataset.date);
        if (btnDate.getDay() === 0 || btnDate.getDay() === 6) {
            btn.classList.add('date-button-weekend');
        }
        
        // Reset inline styles that might override CSS
        btn.style.backgroundColor = '';
        btn.style.borderColor = '';
        btn.style.color = '';
    });
    
    // Mark selected button as selected
    selectedDate = date;
    buttonElement.classList.remove('date-button-available');
    buttonElement.classList.add('date-button-selected');
    
    // Save to localStorage
    localStorage.setItem('selectedDate', date.toISOString());
    
    // Generate time slots
    generateTimeSlots();
}

function generateTimeSlots() {
    const timeGrid = document.getElementById('time-grid');
    if (!timeGrid || !selectedDate) return;
    
    timeGrid.innerHTML = '';
    
    // Generate times from 9 AM to 7 PM
    const times = [];
    for (let hour = 9; hour <= 19; hour++) {
        times.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    times.forEach(time => {
        const timeButton = createTimeButton(time);
        timeGrid.appendChild(timeButton);
    });
    
    // Show time selection section
    const timeSection = document.getElementById('time-selection');
    if (timeSection) {
        timeSection.style.display = 'block';
    }
}

function createTimeButton(time) {
    const button = document.createElement('button');
    button.className = 'time-slot-available';
    button.textContent = time;
    
    button.addEventListener('click', function() {
        selectTime(time, button);
    });
    
    return button;
}

function selectTime(time, buttonElement) {
    // Remove previous selection
    document.querySelectorAll('.time-slot-available, .time-slot-selected').forEach(btn => {
        btn.className = 'time-slot-available';
    });
    
    // Mark as selected
    selectedTime = time;
    buttonElement.className = 'time-slot-selected';
    
    // Save to localStorage
    localStorage.setItem('selectedTime', time);
    
    // Show continue button with loading state
    const continueSection = document.getElementById('continue-section');
    const continueBtn = document.getElementById('continue-btn');
    if (continueSection) {
        continueSection.style.display = 'block';
    }
    
    // Update button text and auto-advance
    if (continueBtn) {
        continueBtn.innerHTML = 'Continuing to Staff Selection';
        continueBtn.classList.add('auto-navigating');
    }
    
    setTimeout(() => {
        window.location.href = 'staff.html';
    }, 800);
}

// Staff Selection
function initializeStaffSelection() {
    // Load booking data
    loadBookingData();
    displayBookingSummary();
    populateAvailableStaff();
}

function loadBookingData() {
    console.log('loadBookingData called');
    const serviceData = localStorage.getItem('selectedService');
    const dateData = localStorage.getItem('selectedDate');
    const timeData = localStorage.getItem('selectedTime');
    
    console.log('localStorage data:');
    console.log('- service:', serviceData);
    console.log('- date:', dateData);
    console.log('- time:', timeData);
    
    if (serviceData) {
        selectedService = JSON.parse(serviceData);
        console.log('Parsed selectedService:', selectedService);
    }
    if (dateData) {
        selectedDate = new Date(dateData);
        console.log('Parsed selectedDate:', selectedDate);
    }
    if (timeData) {
        selectedTime = timeData;
        console.log('Loaded selectedTime:', selectedTime);
    }
}

function displayBookingSummary() {
    const summaryDiv = document.getElementById('booking-summary');
    if (summaryDiv && selectedService && selectedDate && selectedTime) {
        summaryDiv.innerHTML = `
            <h2 style="font-size: 1.25rem; font-weight: 600; color: var(--primary-dark); margin-bottom: 1rem;">Booking Summary</h2>
            <div style="color: #6B7280; line-height: 1.6;">
                <div><span style="font-weight: 500;">Service:</span> ${selectedService.name}</div>
                <div><span style="font-weight: 500;">Date:</span> ${selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div><span style="font-weight: 500;">Time:</span> ${selectedTime}</div>
                <div><span style="font-weight: 500;">Price:</span> $${selectedService.price}</div>
            </div>
        `;
    }
}

async function populateAvailableStaff() {
    console.log('populateAvailableStaff called');
    const staffGrid = document.getElementById('staff-grid');
    console.log('staffGrid element:', staffGrid);
    console.log('selectedService:', selectedService);
    console.log('selectedDate:', selectedDate);
    
    if (!staffGrid) {
        console.error('staff-grid element not found');
        return;
    }
    
    if (!selectedService) {
        console.error('No service selected');
        staffGrid.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #6B7280;">
                <p style="font-size: 1.125rem; margin-bottom: 0.5rem;">⚠️ No service selected</p>
                <p>Please go back and select a service first.</p>
                <a href="booking.html" style="color: var(--primary); text-decoration: none;">← Select Service</a>
            </div>
        `;
        return;
    }
    
    if (!selectedDate) {
        console.error('No date selected');
        staffGrid.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #6B7280;">
                <p style="font-size: 1.125rem; margin-bottom: 0.5rem;">⚠️ No date selected</p>
                <p>Please go back and select a date first.</p>
                <a href="date-time.html" style="color: var(--primary); text-decoration: none;">← Select Date</a>
            </div>
        `;
        return;
    }
    
    // Show loading state
    staffGrid.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #6B7280;">
            <p>Loading available staff...</p>
        </div>
    `;
    
    try {
        const availableStaff = await getAvailableStaff();
        console.log('Available staff:', availableStaff);
        
        // Clear loading message
        staffGrid.innerHTML = '';
        
        if (availableStaff.length === 0) {
            staffGrid.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #6B7280;">
                    <p style="font-size: 1.125rem; margin-bottom: 0.5rem;">😔 No staff available</p>
                    <p>No staff available for ${selectedService.name} on this date.</p>
                    <a href="date-time.html" style="color: var(--primary); text-decoration: none;">← Choose a different date</a>
                </div>
            `;
            return;
        }
        
        availableStaff.forEach(staff => {
            console.log('Creating staff card for:', staff.name);
            const staffCard = createStaffCard(staff);
            if (staffCard) {
                staffGrid.appendChild(staffCard);
            }
        });
        
        console.log('Staff cards added. Total staff cards:', staffGrid.children.length);
        
        // Auto-select and advance if only one staff member available
        if (availableStaff.length === 1) {
            const onlyStaff = availableStaff[0];
            selectedStaff = onlyStaff.id;
            localStorage.setItem('selectedStaff', onlyStaff.id);
            
            // Add visual feedback that staff was auto-selected
            const staffCard = staffGrid.children[0];
            if (staffCard) {
                staffCard.classList.add('selected');
                const radio = staffCard.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            }
            
            // Show message and auto-advance
            const autoMessage = document.createElement('div');
            autoMessage.style.cssText = `
                margin-top: 16px;
                padding: 12px;
                background-color: rgba(16, 185, 129, 0.1);
                border: 1px solid rgba(16, 185, 129, 0.3);
                border-radius: 8px;
                color: #065F46;
                font-size: 0.875rem;
                text-align: center;
            `;
            autoMessage.innerHTML = `✓ ${onlyStaff.name} automatically selected (only available staff) • Continuing...`;
            staffGrid.appendChild(autoMessage);
            
            setTimeout(() => {
                window.location.href = 'customer-info.html';
            }, 2000);
        }
    } catch (error) {
        console.error('Error loading staff:', error);
        staffGrid.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #DC2626;">
                <p style="font-size: 1.125rem; margin-bottom: 0.5rem;">❌ Error loading staff</p>
                <p>Please refresh the page and try again.</p>
            </div>
        `;
    }
}

async function getAvailableStaff() {
    try {
        if (!selectedService || !selectedDate) {
            console.log('Missing selectedService or selectedDate');
            return [];
        }

        const dayOfWeek = selectedDate.getDay();
        console.log('Getting available staff for:', selectedService.category, 'on day:', dayOfWeek);
        
        // Use the optimized staff availability query with enhanced error handling
        let availableStaff = [];
        
        try {
            // First try the optimized method with conflict checking if time is selected
            if (selectedTime) {
                // Calculate end time based on service duration
                const startTime = selectedTime;
                const [hours, minutes] = startTime.split(':').map(Number);
                const startMinutes = hours * 60 + minutes;
                const endMinutes = startMinutes + selectedService.duration;
                const endHours = Math.floor(endMinutes / 60);
                const endMins = endMinutes % 60;
                const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
                
                console.log('Checking availability with time constraints:', startTime, 'to', endTime);
                availableStaff = await SupabaseAPI.getAvailableStaffOptimized(
                    selectedService.category, 
                    selectedDate.toISOString().split('T')[0], 
                    startTime, 
                    endTime
                );
            } else {
                // Just check basic availability without time constraints
                availableStaff = await SupabaseAPI.getAvailableStaffOptimized(
                    selectedService.category, 
                    selectedDate.toISOString().split('T')[0]
                );
            }
            
            console.log('Available staff from optimized query:', availableStaff);
        } catch (optimizedError) {
            console.warn('Optimized query failed, falling back to original method:', optimizedError);
            
            // Fallback to original method
            availableStaff = await SupabaseAPI.getAvailableStaff(selectedService.category, selectedDate);
            console.log('Available staff from fallback query:', availableStaff);
        }
        
        // Additional client-side validation to ensure staff can perform the service
        const validatedStaff = availableStaff.filter(staff => {
            // Check if staff has the required capability
            const hasCapability = staff.capabilities && 
                (staff.capabilities.includes(selectedService.category) || staff.id === 'any');
            
            // Check if staff works on the selected day
            const worksOnDay = staff.work_days && staff.work_days.includes(dayOfWeek);
            
            const isValid = hasCapability && worksOnDay;
            
            if (!isValid) {
                console.log(`Staff ${staff.name} filtered out: hasCapability=${hasCapability}, worksOnDay=${worksOnDay}`);
            }
            
            return isValid;
        });
        
        console.log('Final validated staff:', validatedStaff);
        return validatedStaff;
        
    } catch (error) {
        console.error('Error getting available staff:', error);
        
        // Enhanced error logging for debugging
        console.error('Error details:', {
            selectedService: selectedService,
            selectedDate: selectedDate,
            selectedTime: selectedTime,
            error: error.message,
            stack: error.stack
        });
        
        return [];
    }
}

function createStaffCard(staff) {
    const card = document.createElement('div');
    card.className = 'staff-card';
    
    const isAvailable = true; // For demo purposes
    
    card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 48px; height: 48px; background-color: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="color: var(--primary); font-weight: 600;">${staff.initials}</span>
            </div>
            <div style="flex: 1;">
                <h3 style="font-weight: 500; color: var(--primary-dark); margin-bottom: 4px;">${staff.name}</h3>
                <p style="font-size: 0.875rem; color: #6B7280; margin-bottom: 4px;">${staff.specialties}</p>
                ${staff.phone ? `<p style="font-size: 0.75rem; color: #9CA3AF;">${staff.phone}</p>` : ''}
                <div style="display: flex; align-items: center; margin-top: 4px;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; background-color: ${isAvailable ? '#10B981' : '#EF4444'};"></div>
                    <span style="font-size: 0.75rem; color: #9CA3AF;">${isAvailable ? 'Available' : 'Unavailable'}</span>
                </div>
            </div>
            <input type="radio" name="staff" value="${staff.id}" style="width: 16px; height: 16px;">
        </div>
    `;
    
    card.addEventListener('click', function() {
        selectStaff(staff.id, card);
    });
    
    return card;
}

function selectStaff(staffId, cardElement) {
    // Remove previous selection
    document.querySelectorAll('.staff-card').forEach(card => {
        card.classList.remove('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = false;
    });
    
    // Mark as selected
    selectedStaff = staffId;
    cardElement.classList.add('selected');
    const radio = cardElement.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
    
    // Save to localStorage
    localStorage.setItem('selectedStaff', staffId);
    
    // Show continue button with loading state
    const continueSection = document.getElementById('continue-section');
    const continueBtn = document.getElementById('continue-btn');
    if (continueSection) {
        continueSection.style.display = 'block';
    }
    
    // Update button text and auto-advance
    if (continueBtn) {
        continueBtn.innerHTML = 'Continuing to Customer Information';
        continueBtn.classList.add('auto-navigating');
    }
    
    setTimeout(() => {
        window.location.href = 'customer-info.html';
    }, 800);
}

// Storage helpers
function saveBookingData() {
    if (selectedService) localStorage.setItem('selectedService', JSON.stringify(selectedService));
    if (selectedDate) localStorage.setItem('selectedDate', selectedDate.toISOString());
    if (selectedTime) localStorage.setItem('selectedTime', selectedTime);
    if (selectedStaff) localStorage.setItem('selectedStaff', selectedStaff);
    if (customerInfo) localStorage.setItem('customerInfo', JSON.stringify(customerInfo));
}

function clearBookingData() {
    localStorage.removeItem('selectedService');
    localStorage.removeItem('selectedDate');
    localStorage.removeItem('selectedTime');
    localStorage.removeItem('selectedStaff');
    localStorage.removeItem('customerInfo');
}

// Navigation helpers
function goToNextStep(nextPage) {
    saveBookingData();
    window.location.href = nextPage;
}

function goToPreviousStep(previousPage) {
    window.location.href = previousPage;
}