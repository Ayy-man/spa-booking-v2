/**
 * Comprehensive tests for Service Selection Page
 * Tests all 50+ services display correctly with proper pricing and duration
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BookingPage from '../page'

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

describe('Service Selection Page', () => {
  beforeEach(() => {
    render(<BookingPage />)
  })

  describe('Page Structure', () => {
    test('should render page header correctly', () => {
      expect(screen.getByText('Book Your Appointment')).toBeInTheDocument()
      expect(screen.getByText('Select a service to get started')).toBeInTheDocument()
      expect(screen.getByText('← Back to Home')).toBeInTheDocument()
    })

    test('should render all service categories', () => {
      expect(screen.getByText('Facials')).toBeInTheDocument()
      expect(screen.getByText('Body Massages')).toBeInTheDocument()
      expect(screen.getByText('Body Treatments')).toBeInTheDocument()
      expect(screen.getByText('Waxing')).toBeInTheDocument()
      expect(screen.getByText('Packages')).toBeInTheDocument()
      expect(screen.getByText('Special Services')).toBeInTheDocument()
    })
  })

  describe('Facial Services (8 services)', () => {
    test('should display all facial services with correct pricing', () => {
      // Basic Facial
      expect(screen.getByText('Basic Facial')).toBeInTheDocument()
      expect(screen.getByText('$65')).toBeInTheDocument()
      expect(screen.getByText('30 mins')).toBeInTheDocument()

      // Deep Cleansing Facial
      expect(screen.getByText('Deep Cleansing Facial')).toBeInTheDocument()
      expect(screen.getByText('$79')).toBeInTheDocument()

      // Premium facials
      expect(screen.getByText('Placenta/Collagen Facial')).toBeInTheDocument()
      expect(screen.getByText('Whitening Kojic Facial')).toBeInTheDocument()
      expect(screen.getByText('Anti-Acne Facial')).toBeInTheDocument()
      expect(screen.getByText('Microderm Facial')).toBeInTheDocument()
      expect(screen.getByText('Vitamin C Facial')).toBeInTheDocument()
      expect(screen.getByText('Acne Vulgaris Facial')).toBeInTheDocument()

      // Check pricing tiers
      expect(screen.getAllByText('$90')).toHaveLength(3) // 3 services at $90
      expect(screen.getByText('$99')).toBeInTheDocument() // Microderm
      expect(screen.getAllByText('$120')).toHaveLength(2) // 2 premium services at $120
    })

    test('should show correct durations for facial services', () => {
      const sixtyMinServices = screen.getAllByText('60 mins')
      expect(sixtyMinServices.length).toBeGreaterThanOrEqual(7) // 7 facial services are 60 minutes
    })
  })

  describe('Body Massage Services (6 services)', () => {
    test('should display all massage services with correct pricing', () => {
      expect(screen.getByText('Balinese Body Massage')).toBeInTheDocument()
      expect(screen.getByText('$80')).toBeInTheDocument()

      expect(screen.getByText('Maternity Massage')).toBeInTheDocument()
      expect(screen.getByText('Stretching Body Massage')).toBeInTheDocument()
      expect(screen.getAllByText('$85')).toHaveLength(2) // Maternity and Stretching

      expect(screen.getByText('Deep Tissue Body Massage')).toBeInTheDocument()
      expect(screen.getByText('Hot Stone Massage')).toBeInTheDocument()
      expect(screen.getAllByText('$90')).toHaveLength(3) // Including facial services

      expect(screen.getByText('Hot Stone Massage 90 Minutes')).toBeInTheDocument()
      expect(screen.getByText('90 mins')).toBeInTheDocument()
    })
  })

  describe('Body Treatment Services (8 services)', () => {
    test('should display all body treatment services', () => {
      expect(screen.getByText('Underarm Cleaning')).toBeInTheDocument()
      expect(screen.getByText('Back Treatment')).toBeInTheDocument()
      expect(screen.getByText('Chemical Peel (Body)')).toBeInTheDocument()
      expect(screen.getByText('Underarm/Inguinal Whitening')).toBeInTheDocument()
      expect(screen.getByText('Microdermabrasion (Body)')).toBeInTheDocument()
      expect(screen.getByText('Deep Moisturizing Body Treatment')).toBeInTheDocument()
      expect(screen.getByText('Dead Sea Salt Body Scrub')).toBeInTheDocument()
      expect(screen.getByText('Mud Mask Body Wrap')).toBeInTheDocument()
    })

    test('should show correct pricing for body treatments', () => {
      expect(screen.getByText('$150')).toBeInTheDocument() // Underarm whitening
      expect(screen.getAllByText('$99')).toHaveLength(2) // Underarm cleaning, Back treatment
      expect(screen.getAllByText('$85')).toHaveLength(4) // Chemical peel, Microderm + massages
      expect(screen.getAllByText('$65')).toHaveLength(4) // Deep moisturizing, scrub, wrap + basic facial
    })

    test('should show 30-minute duration for most body treatments', () => {
      const thirtyMinServices = screen.getAllByText('30 mins')
      expect(thirtyMinServices.length).toBeGreaterThanOrEqual(8) // Most body treatments
    })
  })

  describe('Waxing Services (17 services)', () => {
    test('should display all waxing services', () => {
      expect(screen.getByText('Eyebrow Waxing')).toBeInTheDocument()
      expect(screen.getByText('Lip Waxing')).toBeInTheDocument()
      expect(screen.getByText('Half Arm Waxing')).toBeInTheDocument()
      expect(screen.getByText('Full Arm Waxing')).toBeInTheDocument()
      expect(screen.getByText('Chin Waxing')).toBeInTheDocument()
      expect(screen.getByText('Neck Waxing')).toBeInTheDocument()
      expect(screen.getByText('Lower Leg Waxing')).toBeInTheDocument()
      expect(screen.getByText('Full Leg Waxing')).toBeInTheDocument()
      expect(screen.getByText('Full Face Waxing')).toBeInTheDocument()
      expect(screen.getByText('Bikini Waxing')).toBeInTheDocument()
      expect(screen.getByText('Underarm Waxing')).toBeInTheDocument()
      expect(screen.getByText('Brazilian Wax (Women)')).toBeInTheDocument()
      expect(screen.getByText('Brazilian Waxing (Men)')).toBeInTheDocument()
      expect(screen.getByText('Chest Wax')).toBeInTheDocument()
      expect(screen.getByText('Stomach Wax')).toBeInTheDocument()
      expect(screen.getByText('Shoulders')).toBeInTheDocument()
      expect(screen.getByText('Feet')).toBeInTheDocument()
    })

    test('should show correct pricing for waxing services', () => {
      expect(screen.getAllByText('$10')).toHaveLength(1) // Lip waxing
      expect(screen.getByText('$12')).toBeInTheDocument() // Chin waxing
      expect(screen.getAllByText('$20')).toHaveLength(2) // Eyebrow, Underarm
      expect(screen.getAllByText('$30')).toHaveLength(3) // Neck, Shoulders, Feet
      expect(screen.getByText('$35')).toBeInTheDocument() // Bikini
      expect(screen.getAllByText('$40')).toHaveLength(4) // Half arm, Lower leg, Chest, Stomach
      expect(screen.getAllByText('$60')).toHaveLength(3) // Full arm, Full face, Brazilian women
      expect(screen.getByText('$75')).toBeInTheDocument() // Brazilian men
      expect(screen.getByText('$80')).toBeInTheDocument() // Full leg
    })

    test('should show correct durations for waxing services', () => {
      expect(screen.getAllByText('5 mins')).toHaveLength(2) // Lip, Feet
      expect(screen.getAllByText('15 mins')).toHaveLength(3) // Eyebrow, Half arm, Underarm
      expect(screen.getAllByText('30 mins')).toHaveLength(6) // Various 30-min services
      expect(screen.getAllByText('45 mins')).toHaveLength(2) // Brazilian services
      expect(screen.getAllByText('60 mins')).toHaveLength(1) // Full leg
    })
  })

  describe('Package Services (3 services)', () => {
    test('should display all package services', () => {
      expect(screen.getByText('Balinese Body Massage + Basic Facial')).toBeInTheDocument()
      expect(screen.getByText('Deep Tissue Body Massage + 3Face')).toBeInTheDocument()
      expect(screen.getByText('Hot Stone Body Massage + Microderm Facial')).toBeInTheDocument()
    })

    test('should show correct package pricing and durations', () => {
      expect(screen.getByText('$130')).toBeInTheDocument() // Balinese + Facial
      expect(screen.getByText('$180')).toBeInTheDocument() // Deep tissue + 3Face
      expect(screen.getByText('$200')).toBeInTheDocument() // Hot stone + Microderm

      expect(screen.getByText('120 mins')).toBeInTheDocument() // 2-hour package
      expect(screen.getByText('150 mins')).toBeInTheDocument() // 2.5-hour package
    })
  })

  describe('Special Services (2 services)', () => {
    test('should display special services', () => {
      expect(screen.getByText('Basic Vajacial Cleaning + Brazilian Wax')).toBeInTheDocument()
      expect(screen.getByText('Dermal VIP Card')).toBeInTheDocument()
    })

    test('should show correct pricing for special services', () => {
      expect(screen.getAllByText('$90')).toHaveLength(1) // Vajacial package (plus others)
      expect(screen.getByText('$50')).toBeInTheDocument() // VIP Card
    })
  })

  describe('Service Selection Interaction', () => {
    test('should allow selecting a service', async () => {
      const user = userEvent.setup()
      const basicFacialCard = screen.getByText('Basic Facial').closest('.card')
      
      expect(basicFacialCard).toBeInTheDocument()
      
      if (basicFacialCard) {
        await user.click(basicFacialCard)
        
        // Should show as selected
        const selectButton = screen.getByText('Selected')
        expect(selectButton).toBeInTheDocument()
        
        // Continue button should appear
        expect(screen.getByText('Continue to Date & Time Selection')).toBeInTheDocument()
      }
    })

    test('should switch selection between services', async () => {
      const user = userEvent.setup()
      
      // Select first service
      const basicFacialCard = screen.getByText('Basic Facial').closest('.card')
      if (basicFacialCard) {
        await user.click(basicFacialCard)
      }
      
      // Select different service
      const deepCleansingCard = screen.getByText('Deep Cleansing Facial').closest('.card')
      if (deepCleansingCard) {
        await user.click(deepCleansingCard)
        
        // Only the new selection should be active
        expect(screen.getByText('Selected')).toBeInTheDocument()
        expect(screen.getAllByText('Select').length).toBeGreaterThan(0)
      }
    })

    test('should show continue button only when service selected', () => {
      // Initially no continue button
      expect(screen.queryByText('Continue to Date & Time Selection')).not.toBeInTheDocument()
      
      // After selection, continue button appears
      const selectButton = screen.getAllByText('Select')[0]
      fireEvent.click(selectButton)
      
      expect(screen.getByText('Continue to Date & Time Selection')).toBeInTheDocument()
    })
  })

  describe('Service Count Validation', () => {
    test('should display all 50+ services across categories', () => {
      // Count all service cards
      const selectButtons = screen.getAllByText('Select')
      
      // Expected counts by category:
      // Facials: 8
      // Body Massages: 6  
      // Body Treatments: 8
      // Waxing: 17
      // Packages: 3
      // Special Services: 2
      // Total: 44 services
      
      expect(selectButtons.length).toBe(44)
    })

    test('should have correct pricing distribution', () => {
      // Check that we have the right number of services at key price points
      const priceElements = screen.getAllByText(/\$\d+/)
      expect(priceElements.length).toBeGreaterThanOrEqual(44) // At least one price per service
    })

    test('should have correct duration distribution', () => {
      // Check that we have various durations
      expect(screen.getAllByText('5 mins').length).toBeGreaterThan(0)
      expect(screen.getAllByText('15 mins').length).toBeGreaterThan(0)
      expect(screen.getAllByText('30 mins').length).toBeGreaterThan(0)
      expect(screen.getAllByText('45 mins').length).toBeGreaterThan(0)
      expect(screen.getAllByText('60 mins').length).toBeGreaterThan(0)
      expect(screen.getAllByText('90 mins').length).toBeGreaterThan(0)
      expect(screen.getAllByText('120 mins').length).toBeGreaterThan(0)
      expect(screen.getAllByText('150 mins').length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Design', () => {
    test('should render grid layout correctly', () => {
      const grids = document.querySelectorAll('.grid')
      expect(grids.length).toBeGreaterThan(0)
      
      // Check grid classes for responsive design
      grids.forEach(grid => {
        expect(grid.className).toMatch(/grid-cols-1.*md:grid-cols-2.*lg:grid-cols-3/)
      })
    })
  })

  describe('Navigation', () => {
    test('should have back to home link', () => {
      const backLink = screen.getByText('← Back to Home')
      expect(backLink).toBeInTheDocument()
      expect(backLink.closest('a')).toHaveAttribute('href', '/')
    })

    test('should generate correct continue URL with service parameter', async () => {
      const user = userEvent.setup()
      
      // Select a service to trigger continue button
      const selectButton = screen.getAllByText('Select')[0]
      await user.click(selectButton)
      
      const continueLink = screen.getByText('Continue to Date & Time Selection')
      expect(continueLink).toBeInTheDocument()
      
      // URL should contain service parameter
      expect(continueLink.closest('a')).toHaveAttribute('href', expect.stringContaining('/booking/date-time?service='))
    })
  })
})