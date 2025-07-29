# Dermal Skin Clinic Design System

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

## Component Styles

### Service Card
```jsx
className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg 
          transition-all duration-300 border border-transparent 
          hover:border-accent cursor-pointer"
```

### Time Slot Button
```jsx
// Available
className="px-4 py-3 rounded-lg bg-white border border-gray-200 
          hover:bg-accent hover:border-primary transition-all"

// Selected
className="px-4 py-3 rounded-lg bg-primary text-white 
          border border-primary"

// Unavailable
className="px-4 py-3 rounded-lg bg-gray-100 text-gray-400 
          cursor-not-allowed"
```

### Primary Button (Book Now)
```jsx
className="w-full py-3 px-6 bg-black text-white rounded-lg 
          hover:bg-gray-900 transition-colors font-medium"
```

## Typography
- **Headings**: Playfair Display (serif)
- **Body**: Inter (sans-serif)
- **Sizes**: 14px base, 16px mobile
- **Spacing**: 1rem base unit

## Mobile Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## Design Principles
1. **Elegant & Professional**: Sophisticated spa experience
2. **Mobile-First**: Optimized for mobile booking
3. **Accessibility**: High contrast, clear typography
4. **Calming UX**: Smooth transitions, gentle interactions

## Component Library
- Use rounded corners (0.5-0.75rem) for friendly, approachable feel
- Maintain consistent spacing (1rem base unit)
- Add subtle shadows for depth without harshness
- Hover states should feel responsive but not jarring

## Color Usage Guidelines
- **Primary (#C36678)**: Main CTAs, selected states, brand elements
- **Primary Dark (#AA3B50)**: Hover states, important text, headers
- **Accent (#F6C7CF)**: Highlights, hover backgrounds, subtle emphasis
- **Black/White**: High contrast for critical actions (Book Now buttons)

## Spacing System
- **xs**: 0.25rem (4px)
- **sm**: 0.5rem (8px)
- **md**: 1rem (16px)
- **lg**: 1.5rem (24px)
- **xl**: 2rem (32px)
- **2xl**: 3rem (48px)

## Border Radius
- **sm**: 0.25rem (4px)
- **md**: 0.5rem (8px)
- **lg**: 0.75rem (12px)
- **xl**: 1rem (16px)

## Shadows
- **sm**: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
- **md**: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
- **lg**: 0 10px 15px -3px rgba(0, 0, 0, 0.1)

## Transitions
- **fast**: 150ms ease-in-out
- **base**: 300ms ease-in-out
- **slow**: 500ms ease-in-out

## Form Elements
### Input Fields
```jsx
className="w-full px-3 py-2 border border-gray-300 rounded-lg 
          focus:ring-2 focus:ring-primary focus:border-primary 
          transition-colors"
```

### Labels
```jsx
className="block text-sm font-medium text-gray-700 mb-1"
```

### Error States
```jsx
className="w-full px-3 py-2 border border-red-300 rounded-lg 
          focus:ring-2 focus:ring-red-500 focus:border-red-500"
```

## Loading States
### Skeleton Loading
```jsx
className="animate-pulse bg-gray-200 rounded-lg h-4"
```

### Spinner
```jsx
className="w-6 h-6 border-2 border-primary border-t-transparent 
          rounded-full animate-spin"
```

## Success States
### Checkmark Icon
```jsx
className="w-6 h-6 text-green-600"
```

### Success Message
```jsx
className="text-green-600 bg-green-50 border border-green-200 
          rounded-lg p-4"
```

## Error States
### Error Message
```jsx
className="text-red-600 bg-red-50 border border-red-200 
          rounded-lg p-4"
```

## Navigation
### Active Link
```jsx
className="text-primary-dark font-medium border-b-2 
          border-primary-dark"
```

### Inactive Link
```jsx
className="text-gray-600 hover:text-primary-dark 
          transition-colors"
```

## Card Components
### Service Card
```jsx
<div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg 
            transition-all duration-300 border border-transparent 
            hover:border-accent">
  <h3 className="font-heading text-xl text-primary-dark mb-2">
    {service.name}
  </h3>
  <p className="text-gray-600 mb-4">{service.description}</p>
  <div className="flex justify-between items-center">
    <span className="text-2xl font-semibold text-primary-dark">
      ${service.price}
    </span>
    <button className="bg-black text-white px-6 py-2 rounded-lg 
                     hover:bg-gray-900 transition-colors">
      Book Now
    </button>
  </div>
</div>
```

### Booking Summary Card
```jsx
<div className="bg-white rounded-xl shadow-lg p-6">
  <h2 className="text-2xl font-heading text-primary-dark mb-4">
    Booking Summary
  </h2>
  <div className="space-y-3">
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
    <div className="flex justify-between border-t pt-3">
      <span className="text-gray-600 font-medium">Total:</span>
      <span className="text-xl font-semibold text-primary-dark">
        ${booking.price}
      </span>
    </div>
  </div>
</div>
```

## Responsive Design
### Mobile (< 640px)
- Single column layouts
- Larger touch targets (44px minimum)
- Reduced padding and margins
- Full-width buttons

### Tablet (640px - 1024px)
- Two-column layouts where appropriate
- Medium spacing
- Balanced touch targets

### Desktop (> 1024px)
- Multi-column layouts
- Full spacing
- Hover effects
- Detailed interactions

## Accessibility
- **Color Contrast**: WCAG AA compliant
- **Focus Indicators**: Clear focus states
- **Touch Targets**: Minimum 44px for mobile
- **Typography**: Readable font sizes and line heights
- **Semantic HTML**: Proper heading hierarchy and landmarks 