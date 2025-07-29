# Dermal Skin Clinic Booking System - UI/UX Documentation

## Design Philosophy
- **Elegant & Professional**: Sophisticated spa experience
- **Mobile-First**: Optimized for mobile booking
- **Accessibility**: High contrast, clear typography
- **Calming UX**: Smooth transitions, gentle interactions

## Color Palette
```css
:root {
  --primary: #C36678;
  --primary-dark: #AA3B50;
  --background: #F8F8F8;
  --surface: #FFFFFF;
  --accent: #F6C7CF;
  --text-primary: #000000;
  --text-secondary: #AA3B50;
  --button-bg: #000000;
  --button-text: #FFFFFF;
}
```

## Typography
- **Headings**: Playfair Display (serif) - elegant, spa-like
- **Body**: Inter (sans-serif) - clean, readable
- **Sizes**: 14px base, 16px mobile
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

## Component Specifications

### 1. Service Selection Interface
**Purpose**: Allow customers to browse and select from 50+ services

**Layout**:
- Grid layout: 1 column mobile, 2 columns tablet, 3 columns desktop
- Service cards with image, name, duration, price
- Category filters at top (Facials, Massages, Treatments, Waxing, Packages)

**Service Card Design**:
```jsx
<div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg 
            transition-all duration-300 border border-transparent 
            hover:border-accent cursor-pointer">
  <div className="space-y-3">
    <h3 className="font-heading text-xl text-primary-dark">{service.name}</h3>
    <p className="text-gray-600 text-sm">{service.description}</p>
    <div className="flex justify-between items-center">
      <span className="text-2xl font-semibold text-primary">${service.price}</span>
      <span className="text-sm text-gray-500">{service.duration} mins</span>
    </div>
    <button className="w-full py-2 px-4 bg-black text-white rounded-lg 
                     hover:bg-gray-900 transition-colors">
      Select Service
    </button>
  </div>
</div>
```

### 2. Date and Time Selection
**Purpose**: Choose appointment date and available time slots

**Layout**:
- Date picker: Horizontal scroll of next 30 days
- Time slots: Grid of available times (9 AM - 7 PM)
- Show "No availability" for unavailable dates

**Date Picker**:
```jsx
<div className="flex space-x-2 overflow-x-auto pb-4">
  {dates.map(date => (
    <button
      className={`px-4 py-2 rounded-lg border transition-all min-w-[80px]
                ${date.available 
                  ? 'bg-white border-gray-200 hover:bg-accent' 
                  : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}
                ${date.selected 
                  ? 'bg-primary text-white border-primary' 
                  : ''}`}
    >
      <div className="text-sm font-medium">{date.day}</div>
      <div className="text-xs">{date.date}</div>
    </button>
  ))}
</div>
```

**Time Slots**:
```jsx
<div className="grid grid-cols-3 gap-2">
  {timeSlots.map(slot => (
    <button
      className={`p-3 rounded-lg border transition-all text-sm
                ${slot.available 
                  ? 'bg-white border-gray-200 hover:bg-accent hover:border-primary' 
                  : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}
                ${slot.selected 
                  ? 'bg-primary text-white border-primary' 
                  : ''}`}
    >
      {slot.time}
    </button>
  ))}
</div>
```

### 3. Staff Preference Selector
**Purpose**: Choose between "Any Available" or specific staff member

**Layout**:
- Radio button selection
- Staff cards with photo, name, specialties
- Show availability status

**Staff Card**:
```jsx
<div className="border rounded-lg p-4 hover:border-primary transition-colors">
  <div className="flex items-center space-x-3">
    <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
      <span className="text-primary font-semibold">{staff.initials}</span>
    </div>
    <div className="flex-1">
      <h3 className="font-medium text-primary-dark">{staff.name}</h3>
      <p className="text-sm text-gray-600">{staff.specialties}</p>
      <div className="flex items-center mt-1">
        <div className={`w-2 h-2 rounded-full mr-2 ${
          staff.available ? 'bg-green-500' : 'bg-red-500'
        }`}></div>
        <span className="text-xs text-gray-500">
          {staff.available ? 'Available' : 'Unavailable'}
        </span>
      </div>
    </div>
    <input type="radio" name="staff" value={staff.id} />
  </div>
</div>
```

### 4. Customer Information Form
**Purpose**: Collect customer details for booking

**Layout**:
- Clean form with clear labels
- Required field indicators
- Validation feedback

**Form Design**:
```jsx
<form className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Full Name *
    </label>
    <input
      type="text"
      className="w-full px-3 py-2 border border-gray-300 rounded-lg 
               focus:ring-2 focus:ring-primary focus:border-primary"
      placeholder="Enter your full name"
      required
    />
  </div>
  
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Email Address *
    </label>
    <input
      type="email"
      className="w-full px-3 py-2 border border-gray-300 rounded-lg 
               focus:ring-2 focus:ring-primary focus:border-primary"
      placeholder="your@email.com"
      required
    />
  </div>
  
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Phone Number
    </label>
    <input
      type="tel"
      className="w-full px-3 py-2 border border-gray-300 rounded-lg 
               focus:ring-2 focus:ring-primary focus:border-primary"
      placeholder="(671) 123-4567"
    />
  </div>
  
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Special Requests
    </label>
    <textarea
      className="w-full px-3 py-2 border border-gray-300 rounded-lg 
               focus:ring-2 focus:ring-primary focus:border-primary"
      rows={3}
      placeholder="Any special requests or notes..."
    />
  </div>
</form>
```

### 5. Booking Confirmation
**Purpose**: Show booking summary and confirmation

**Layout**:
- Booking details in card format
- Confirmation message
- Next steps information

**Confirmation Card**:
```jsx
<div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
  <div className="text-center mb-6">
    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h2 className="text-2xl font-heading text-primary-dark">Booking Confirmed!</h2>
    <p className="text-gray-600">Your appointment has been scheduled successfully.</p>
  </div>
  
  <div className="space-y-4 border-t pt-6">
    <div className="flex justify-between">
      <span className="text-gray-600">Service:</span>
      <span className="font-medium">{booking.service}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-gray-600">Date:</span>
      <span className="font-medium">{booking.date}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-gray-600">Time:</span>
      <span className="font-medium">{booking.time}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-gray-600">Staff:</span>
      <span className="font-medium">{booking.staff}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-gray-600">Total:</span>
      <span className="font-semibold text-primary">${booking.price}</span>
    </div>
  </div>
  
  <div className="mt-6 p-4 bg-accent rounded-lg">
    <h3 className="font-medium text-primary-dark mb-2">What's Next?</h3>
    <ul className="text-sm text-gray-700 space-y-1">
      <li>• You'll receive a confirmation email</li>
      <li>• Please arrive 10 minutes early</li>
      <li>• Call (671) 647-7546 for changes</li>
    </ul>
  </div>
</div>
```

## User Flow States

### Loading States
- **Service Loading**: Skeleton cards with shimmer effect
- **Time Slot Loading**: Grayed out time slots with spinner
- **Booking Processing**: Full-screen overlay with progress indicator

### Error States
- **Validation Errors**: Red border and error message below field
- **Network Errors**: Toast notification with retry option
- **Booking Conflicts**: Clear message about alternative times

### Success States
- **Service Selected**: Green checkmark and "Continue" button
- **Time Selected**: Highlighted time slot with confirmation
- **Booking Confirmed**: Success page with booking details

## Mobile Responsiveness

### Breakpoints
- **Mobile**: < 640px (single column, larger touch targets)
- **Tablet**: 640px - 1024px (2 columns, medium spacing)
- **Desktop**: > 1024px (3 columns, full layout)

### Mobile Optimizations
- Larger touch targets (minimum 44px)
- Simplified navigation
- Swipe gestures for date selection
- Full-width buttons
- Reduced padding and margins

## Accessibility Features
- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: WCAG AA compliant contrast ratios
- **Focus Indicators**: Clear focus states for all interactive elements
- **Alt Text**: Descriptive alt text for all images

## Animation Guidelines
- **Transitions**: 300ms ease-in-out for most interactions
- **Hover Effects**: Subtle scale (1.02) and shadow changes
- **Loading Animations**: Smooth, calming animations
- **Page Transitions**: Fade in/out between booking steps 