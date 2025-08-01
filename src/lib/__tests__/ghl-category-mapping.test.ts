import { getGHLServiceCategory } from '../staff-data'

describe('GHL Category Mapping', () => {
  test('should map facial services to FACE TREATMENTS', () => {
    expect(getGHLServiceCategory('Basic Facial')).toBe('FACE TREATMENTS')
    expect(getGHLServiceCategory('Deep Cleansing Facial')).toBe('FACE TREATMENTS')
    expect(getGHLServiceCategory('Placenta | Collagen Facial')).toBe('FACE TREATMENTS')
    expect(getGHLServiceCategory('Whitening Kojic Facial')).toBe('FACE TREATMENTS')
    expect(getGHLServiceCategory('Anti-Acne Facial')).toBe('FACE TREATMENTS')
    expect(getGHLServiceCategory('Microderm Facial')).toBe('FACE TREATMENTS')
    expect(getGHLServiceCategory('Vitamin C Facial with Extreme Softness')).toBe('FACE TREATMENTS')
    expect(getGHLServiceCategory('Acne Vulgaris Facial')).toBe('FACE TREATMENTS')
  })

  test('should map massage services to BODY MASSAGES', () => {
    expect(getGHLServiceCategory('Balinese Body Massage')).toBe('BODY MASSAGES')
    expect(getGHLServiceCategory('Maternity Massage')).toBe('BODY MASSAGES')
    expect(getGHLServiceCategory('Stretching Body Massage')).toBe('BODY MASSAGES')
    expect(getGHLServiceCategory('Deep Tissue Body Massage')).toBe('BODY MASSAGES')
    expect(getGHLServiceCategory('Hot Stone Massage')).toBe('BODY MASSAGES')
    expect(getGHLServiceCategory('Hot Stone Massage 90 Minutes')).toBe('BODY MASSAGES')
  })

  test('should map body treatments to BODY TREATMENTS & BOOSTERS', () => {
    expect(getGHLServiceCategory('Underarm Cleaning')).toBe('BODY TREATMENTS & BOOSTERS')
    expect(getGHLServiceCategory('Back Treatment')).toBe('BODY TREATMENTS & BOOSTERS')
    expect(getGHLServiceCategory('Chemical Peel (Body) Per Area')).toBe('BODY TREATMENTS & BOOSTERS')
    expect(getGHLServiceCategory('Underarm or Inguinal Whitening')).toBe('BODY TREATMENTS & BOOSTERS')
    expect(getGHLServiceCategory('Microdermabrasion (Body) Per Area')).toBe('BODY TREATMENTS & BOOSTERS')
    expect(getGHLServiceCategory('Deep Moisturizing Body Treatment')).toBe('BODY TREATMENTS & BOOSTERS')
    expect(getGHLServiceCategory('Dead Sea Salt Body Scrub')).toBe('BODY TREATMENTS & BOOSTERS')
    expect(getGHLServiceCategory('Dead Sea Salt Body Scrub + Deep Moisturizing')).toBe('BODY TREATMENTS & BOOSTERS')
    expect(getGHLServiceCategory('Mud Mask Body Wrap + Deep Moisturizing Body Treatment')).toBe('BODY TREATMENTS & BOOSTERS')
  })

  test('should map waxing services to Waxing Services', () => {
    expect(getGHLServiceCategory('Eyebrow Waxing')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Lip Waxing')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Half Arm Waxing')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Full Arm Waxing')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Chin Waxing')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Neck Waxing')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Lower Leg Waxing')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Full Leg Waxing')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Full Face Waxing')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Bikini Waxing')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Underarm Waxing')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Brazilian Wax (Women)')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Brazilian Waxing (Men)')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Chest Wax')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Stomach Wax')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Shoulders')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Feet')).toBe('Waxing Services')
    expect(getGHLServiceCategory('Basic Vajacial Cleaning + Brazilian Wax')).toBe('Waxing Services')
  })

  test('should map packages to FACE & BODY PACKAGES', () => {
    expect(getGHLServiceCategory('Balinese Body Massage + Basic Facial')).toBe('FACE & BODY PACKAGES')
    expect(getGHLServiceCategory('Deep Tissue Body Massage + 3Face')).toBe('FACE & BODY PACKAGES')
    expect(getGHLServiceCategory('Hot Stone Body Massage + Microderm Facial')).toBe('FACE & BODY PACKAGES')
    expect(getGHLServiceCategory('Dermal VIP Card $50 / Year')).toBe('FACE & BODY PACKAGES')
  })

  test('should handle edge cases', () => {
    expect(getGHLServiceCategory('')).toBe('unknown')
    expect(getGHLServiceCategory('Unknown Service')).toBe('unknown')
    expect(getGHLServiceCategory('Some Random Service')).toBe('unknown')
  })
}) 