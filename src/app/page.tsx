'use client'

import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function Home() {
  return (
    <main className="min-h-screen bg-background dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="mb-4 flex justify-between items-center">
            <a 
              href="https://demo-spa.com" 
              className="text-sm text-primary dark:text-primary-light hover:text-primary-dark dark:hover:text-primary transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              🌐 Visit Our Main Website
            </a>
            <ThemeToggle />
          </div>
          <h1 className="text-4xl md:text-6xl font-heading text-primary-dark dark:text-primary-light mb-4">
            Dermal Skin Clinic and Spa Guam
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Professional spa services in a relaxing environment
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a 
              href="/booking" 
              className="btn-primary text-center w-full sm:w-auto"
            >
              Book Your Appointment
            </a>
            <a 
              href="tel:(671) 647-7546" 
              className="btn-secondary text-center w-auto sm:w-auto"
            >
              Call (671) 647-7546
            </a>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="card dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-xl font-heading text-primary-dark dark:text-primary-light mb-2">Facials</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Rejuvenating facial treatments for all skin types</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Starting at $65</p>
          </div>
          
          <div className="card dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-xl font-heading text-primary-dark dark:text-primary-light mb-2">Massages</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Relaxing body massages and therapeutic treatments</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Starting at $80</p>
          </div>
          
          <div className="card dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-xl font-heading text-primary-dark dark:text-primary-light mb-2">Waxing</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Professional waxing services for smooth skin</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Starting at $10</p>
          </div>
        </div>
        
        <div className="text-center">
          <h2 className="text-2xl font-heading text-primary-dark dark:text-primary-light mb-4">
            Ready to Relax?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Book your appointment online or call us directly
          </p>
          <a 
            href="/booking" 
            className="btn-primary inline-block"
          >
            Start Booking
          </a>
        </div>
      </div>
    </main>
  )
} 