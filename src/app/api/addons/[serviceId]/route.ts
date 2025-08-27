import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { serviceId: string } }
) {
  try {
    const { serviceId } = params

    // First check if the service allows add-ons
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, allows_addons')
      .eq('id', serviceId)
      .single()

    if (serviceError || !service) {
      console.error('Service not found:', serviceError)
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    if (!service.allows_addons) {
      return NextResponse.json({ addons: [] })
    }

    // Call the database function to get available add-ons
    const { data: addons, error: addonsError } = await supabase
      .rpc('get_available_addons', { p_service_id: serviceId })

    if (addonsError) {
      console.error('Error fetching add-ons:', addonsError)
      return NextResponse.json({ error: 'Failed to fetch add-ons' }, { status: 500 })
    }

    // Format the response
    const formattedAddons = (addons || []).map((addon: any) => ({
      id: addon.id,
      name: addon.name,
      description: addon.description,
      price: Number(addon.price),
      duration: addon.duration,
      category: addon.category,
      maxQuantity: addon.max_quantity || 1
    }))

    return NextResponse.json({ 
      serviceName: service.name,
      addons: formattedAddons 
    })
  } catch (error) {
    console.error('Error in add-ons API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}