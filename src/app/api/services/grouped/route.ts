import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Map database categories to display names
const categoryDisplayNames: Record<string, string> = {
  'facials': 'Facials',
  'massages': 'Body Massages',
  'treatments': 'Body Treatments',
  'waxing': 'Waxing',
  'packages': 'Packages',
  'special': 'Special Services'
}

// Category order for display
const categoryOrder = ['facials', 'massages', 'treatments', 'waxing', 'packages', 'special']

export async function GET() {
  try {
    // Fetch all active services from database
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching services:', error)
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
    }

    // Group services by category
    const groupedServices = services?.reduce((acc: any, service) => {
      const category = service.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push({
        id: service.id,
        name: service.name,
        duration: service.duration,
        price: Number(service.price),
        description: service.description,
        requires_room_3: service.requires_room_3,
        is_couples_service: service.is_couples_service,
        allows_addons: service.allows_addons
      })
      return acc
    }, {})

    // Transform into array format with proper ordering
    const serviceCategories = categoryOrder
      .filter(cat => groupedServices?.[cat]) // Only include categories that have services
      .map(category => ({
        name: categoryDisplayNames[category] || category,
        category: category,
        services: groupedServices[category] || []
      }))

    // Add any categories not in the predefined order
    Object.keys(groupedServices || {}).forEach(category => {
      if (!categoryOrder.includes(category)) {
        serviceCategories.push({
          name: categoryDisplayNames[category] || category,
          category: category,
          services: groupedServices[category] || []
        })
      }
    })

    return NextResponse.json(serviceCategories)
  } catch (error) {
    console.error('Error in services/grouped API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}