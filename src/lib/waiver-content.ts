export type WaiverType = 'radio_frequency' | 'chemical_peel' | 'waxing' | 'microdermabrasion'

export interface WaiverContent {
  title: string
  sections: WaiverSection[]
  requiresInitials: boolean
  requiresSignature: boolean
}

export interface WaiverSection {
  type: 'text' | 'checkboxes' | 'initials' | 'signature' | 'form_fields'
  title?: string
  content?: string
  items?: CheckboxItem[] | InitialItem[]
  fields?: FormField[]
}

export interface CheckboxItem {
  id: string
  label: string
  required?: boolean
}

export interface InitialItem {
  id: string
  text: string
  required: boolean
}

export interface FormField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'checkbox'
  required?: boolean
  placeholder?: string
}

// Helper function to determine waiver requirement
export function requiresWaiver(serviceName: string): WaiverType | null {
  if (!serviceName) return null
  
  const name = serviceName.toLowerCase()
  
  if (name.includes('radio frequency')) return 'radio_frequency'
  if (name.includes('chemical peel')) return 'chemical_peel'
  if (name.includes('microderm')) return 'microdermabrasion'
  if (name.includes('wax') || name.includes('brazilian') || name.includes('bikini') || 
      name.includes('eyebrow') || name.includes('lip') || name.includes('chin') || 
      name.includes('leg') || name.includes('underarm') || name.includes('chest')) {
    return 'waxing'
  }
  
  return null
}

// Waiver content definitions
export const WAIVER_CONTENT: Record<WaiverType, WaiverContent> = {
  radio_frequency: {
    title: 'RADIO FREQUENCY for Face or Body — Treatment Consent Form',
    requiresInitials: true,
    requiresSignature: true,
    sections: [
      {
        type: 'form_fields',
        title: 'Personal Information',
        fields: [
          { id: 'name', label: 'Name', type: 'text', required: true },
          { id: 'dob', label: 'Date of Birth', type: 'text', required: true },
          { id: 'phone', label: 'Phone', type: 'text', required: true },
          { id: 'email', label: 'Email', type: 'text', required: true }
        ]
      },
      {
        type: 'checkboxes',
        title: 'Area of Treatment',
        items: [
          { id: 'face', label: 'Face' },
          { id: 'body', label: 'Body' }
        ]
      },
      {
        type: 'checkboxes',
        title: 'Medical History (please check all that apply)',
        items: [
          { id: 'pregnancy', label: 'Pregnancy or nursing (current only)' },
          { id: 'pacemaker', label: 'Pacemaker, defibrillator, implanted neuro‑stimulator or other internal electric device' },
          { id: 'cancer_history', label: 'Current/history of cancer (especially skin cancer or pre‑malignant moles in treatment area)' },
          { id: 'diabetes', label: 'Diabetes or immunosuppressive diseases (e.g. AIDS, HIV)' },
          { id: 'immune_meds', label: 'Immune‑suppressive medications' },
          { id: 'cardiac', label: 'Cardiac disorders or epilepsy' },
          { id: 'heat_condition', label: 'Condition adversely affected by heat' },
          { id: 'heat_disease', label: 'History of heat‑stimulated disease (e.g. recurrent Herpes Simplex in treatment area)' },
          { id: 'chemical_sensitivity', label: 'Chemical sensitivities (cosmetics, perfumes)' },
          { id: 'skin_disorders', label: 'History of skin disorders (e.g. keloid scarring, brittle skin)' },
          { id: 'recent_procedure', label: 'Recent invasive or ablative procedure in the treatment area' },
          { id: 'healing_impair', label: 'Any condition that may impair skin healing' },
          { id: 'sensory_impair', label: 'Sensory impairment (nerve lesions, neuropathy)' },
          { id: 'active_issues', label: 'Active issues in treatment area: sores, psoriasis, eczema, rash, fresh tan' }
        ]
      },
      {
        type: 'checkboxes',
        title: 'If treating FACE',
        items: [
          { id: 'dental_implants', label: 'Dental implants, braces, metal fillings (amalgams, gold)' },
          { id: 'botox_fillers', label: 'Botox or fillers in treatment area' },
          { id: 'active_acne', label: 'Active weeping acne' },
          { id: 'retin_a', label: 'Use of Retin‑A, retinol or Vitamin‑A derivatives' },
          { id: 'active_herpes', label: 'Active Herpes' }
        ]
      },
      {
        type: 'checkboxes',
        title: 'If treating BODY',
        items: [
          { id: 'heavy_menses', label: 'Heavy menses/bleeding' },
          { id: 'metal_implants', label: 'Metal or other implants (IUD, screws, plates)' },
          { id: 'varicose_veins', label: 'Varicose veins in treatment area' }
        ]
      },
      {
        type: 'form_fields',
        title: 'Additional Information',
        fields: [
          { id: 'medical_explanation', label: 'If you answered YES to any above, please explain', type: 'textarea' },
          { id: 'current_medications', label: 'Medications currently taking', type: 'textarea' }
        ]
      },
      {
        type: 'checkboxes',
        title: 'Disqualifying Conditions for Multipolar Radio Frequency Treatments (Check "NO" if not applicable)',
        items: [
          { id: 'implants_disq', label: 'Implants: pacemaker, braces, cochlear implants' },
          { id: 'coagulation', label: 'Coagulation dysfunction or bleeding disorders' },
          { id: 'organ_transplant', label: 'Organ transplants' },
          { id: 'pregnancy_disq', label: 'Pregnancy / lactation' },
          { id: 'hernia', label: 'Acute hernia, discopathy, spondylosis' },
          { id: 'migraines', label: 'Migraines or epilepsy' },
          { id: 'tuberculosis', label: 'Tuberculosis' },
          { id: 'malignant_tumors', label: 'Malignant tumors' },
          { id: 'thermal_changes', label: 'Not feeling thermal changes' },
          { id: 'acute_infections', label: 'Acute infections or inflammations' },
          { id: 'burn_care', label: 'A burn or recent burn care' },
          { id: 'active_cancer', label: 'Active cancer' },
          { id: 'botox_filler_disq', label: 'Botox or filler in treatment area' },
          { id: 'cardiovascular', label: 'Severe cardiovascular/ circulatory disease' },
          { id: 'accutane', label: 'Use of Accutane or retinol' },
          { id: 'suppuration', label: 'Suppuration of soft tissues' },
          { id: 'severe_arthritis', label: 'Severe arthritis' },
          { id: 'gout', label: 'Active gout or kidney stones' },
          { id: 'active_condition', label: 'Any active condition in treatment area (e.g. thrombus, sclerosis, herpes, eczema, rash)' }
        ]
      },
      {
        type: 'initials',
        title: 'Initial the following statements',
        items: [
          { id: 'treatment_choice', text: 'I understand that treatment is my choice and I may withdraw anytime.', required: true },
          { id: 'side_effects', text: 'I\'ve been informed about possible side effects: skin redness, warmth.', required: true },
          { id: 'rare_temporary', text: 'I understand these effects are rare and temporary; any adverse reactions should be reported.', required: true },
          { id: 'candidate_vary', text: 'I know not everyone is a candidate; results may vary.', required: true },
          { id: 'voluntary', text: 'I confirm I\'ve read and understood and am undergoing voluntarily.', required: true },
          { id: 'informed_nature', text: 'I certify I\'ve been fully informed of nature, purpose, outcomes and complications; no guarantee of final result.', required: true },
          { id: 'adequate_knowledge', text: 'I believe I have adequate knowledge for informed consent.', required: true },
          { id: 'financial', text: 'FINANCIAL: I know payment is due at time of service; full package must be paid prior.', required: true },
          { id: 'cancellation', text: 'CANCELLATION/RESCHEDULING POLICY: 24‑hour notice required, or treatment deducted without refund. Treatment date changes are subject to availability.', required: true },
          { id: 'appointments', text: 'I understand appointments follow initial consultation due to demand.', required: true },
          { id: 'photos', text: 'I authorize pre/during/post photos for my patient profile.', required: true },
          { id: 'responsibility', text: 'I understand it\'s my responsibility to report changes to medical history; I certify I had opportunity to ask questions and I fully understand this form.', required: true }
        ]
      },
      {
        type: 'signature',
        title: 'Client Signature and Confirmation'
      }
    ]
  },

  chemical_peel: {
    title: 'Chemical Peel Treatment Consent',
    requiresInitials: false,
    requiresSignature: true,
    sections: [
      {
        type: 'text',
        title: 'Pre-Chemical Peel Instructions',
        content: `**Before Chemical Peel:**

• Not pregnant or nursing.
• If taken Accutane, chemotherapy or radiation in past year, need physician approval.
• Clients with vitiligo or pigment loss patches are not eligible.
• Stop Retin‑A (Tretinoin, Tazorac, Differin, Triluma, Renova) **2 days** before.
• Wait 1 week before or after facial hair removal (wax, laser, electrolysis).
• Report any skin conditions (psoriasis, eczema, rosacea).
• No chemical peel within **2 weeks** of major events (wedding, etc.).
• **No Aspirin or similar meds for 2 weeks prior.**`
      },
      {
        type: 'text',
        title: 'Post-Chemical Peel Instructions',
        content: `**After Chemical Peel:**

• Use **SPF 30+**, wear wide‑brim hat (no visor/cap) to avoid UVA/UVB.
• **No face washing** the night of treatment.
• No scrubs or exfoliants, AHA, Retin‑A, Benzoyl peroxide for 1 week.
• Pat skin dry—don't rub.
• **Do not pick or pull skin**—scarring or hyperpigmentation may occur.
• Use OTC hydrocortisone cream free of fragrance to reduce redness, itching, irritation.
• Avoid makeup for 3 days.
• No strenuous exercise (hot yoga, sauna, gym) until healed; sweat may trap and cause infection.
• No other facial procedures for 1 week or until flaking stops.

**Note:**
Not all clients peel visibly, but benefits still apply: collagen stimulation, improved tone/texture, reduced lines & pigmentation.`
      },
      {
        type: 'checkboxes',
        title: 'Client Acknowledgment',
        items: [
          { id: 'read_instructions', label: 'I have read and understood all pre and post-treatment instructions', required: true },
          { id: 'no_conditions', label: 'I confirm I do not have any of the disqualifying conditions mentioned', required: true },
          { id: 'follow_care', label: 'I agree to follow all post-treatment care instructions', required: true },
          { id: 'report_reactions', label: 'I will report any adverse reactions immediately', required: true }
        ]
      },
      {
        type: 'signature',
        title: 'Client Consent and Signature'
      }
    ]
  },

  waxing: {
    title: 'Post‑Treatment Waxing Guidelines and Consent',
    requiresInitials: false,
    requiresSignature: true,
    sections: [
      {
        type: 'form_fields',
        title: 'Contact Information',
        fields: [
          { id: 'name', label: 'Name', type: 'text', required: true },
          { id: 'mobile', label: 'Mobile', type: 'text', required: true },
          { id: 'home', label: 'Home', type: 'text' },
          { id: 'email', label: 'Email', type: 'text', required: true },
          { id: 'referral', label: 'How did you hear about us?', type: 'text' }
        ]
      },
      {
        type: 'text',
        title: 'Post‑Treatment Waxing Guidelines',
        content: `• No heat (baths, sauna, steam) to waxed area for 12–24 hours.
• Use anti‑acne lotion on treated areas until breakouts clear.
• Only use skincare products recommended by therapist.
• Avoid tanning (sun or UV bed) for 12–24 hours.
• Do not apply fragranced products (perfume, cosmetics) to waxed area for 12–24 hours.
• Avoid harsh abrasive or exfoliants short‑term—if prone to ingrowns, gently loofah after 24 hours.
• Don't use high‑SPF sunscreen on waxed area for 12–24 hours—chemicals may irritate.
• Any pinkness should fade in 6–8 hours; it's normal, shows hair was removed from the root.

**Follow‑Up:**
Wax every 4–6 weeks depending on area and growth rate.`
      },
      {
        type: 'checkboxes',
        title: 'Client Acknowledgment',
        items: [
          { id: 'read_guidelines', label: 'I have read and understood all post-treatment guidelines', required: true },
          { id: 'follow_instructions', label: 'I agree to follow all post-waxing care instructions', required: true },
          { id: 'no_contraindications', label: 'I confirm I have no contraindications for waxing services', required: true },
          { id: 'waive_liability', label: 'I waive liability for injury due to misrepresentation of my health', required: true }
        ]
      },
      {
        type: 'text',
        content: `**Consent:**
I authorize the esthetician to perform the waxing procedure after being informed of its risks and benefits. I understand the contraindications and confirm I don't have any disqualifying condition. I agree to notify the esthetician of any discomfort during treatment and waive liability for injury due to misrepresentation of my health.

**Esthetician Contact:**
Dermal Skin Care and Spa | 489‑0327 / 647‑7546 | dermalskincareandspa@gmail.com`
      },
      {
        type: 'signature',
        title: 'Client Signature and Date'
      }
    ]
  },

  microdermabrasion: {
    title: 'Microdermabrasion Treatment Consent',
    requiresInitials: false,
    requiresSignature: true,
    sections: [
      {
        type: 'text',
        title: 'About Microdermabrasion',
        content: `Microdermabrasion is a non-invasive cosmetic procedure that uses fine crystals or a diamond-tipped wand to gently exfoliate the outermost layer of dead skin cells. This treatment helps improve skin texture, reduce fine lines, minimize pores, and promote new cell growth.`
      },
      {
        type: 'text',
        title: 'Pre-Treatment Instructions',
        content: `• Avoid sun exposure and tanning for 48 hours before treatment
• Do not use retinoids, AHA, or BHA products for 2-3 days prior
• Avoid waxing or hair removal in treatment area for 48 hours
• Do not use harsh scrubs or exfoliants for 3 days before
• Inform us of any recent cosmetic procedures or injections`
      },
      {
        type: 'text',
        title: 'Post-Treatment Care',
        content: `• Apply SPF 30+ sunscreen daily for at least 1 week
• Keep skin moisturized with gentle, fragrance-free products
• Avoid direct sun exposure for 48-72 hours
• Do not pick, scratch, or rub the treated area
• Avoid harsh products, scrubs, or exfoliants for 3-5 days
• No swimming in chlorinated pools for 24 hours
• Avoid makeup for 4-6 hours post-treatment if possible`
      },
      {
        type: 'checkboxes',
        title: 'Medical History and Contraindications',
        items: [
          { id: 'no_pregnancy', label: 'I am not pregnant or nursing' },
          { id: 'no_active_acne', label: 'I do not have active cystic acne in treatment area' },
          { id: 'no_rosacea', label: 'I do not have severe rosacea or sensitive skin conditions' },
          { id: 'no_recent_procedures', label: 'I have not had chemical peels, laser treatments, or injections in past 2 weeks' },
          { id: 'no_autoimmune', label: 'I do not have autoimmune conditions affecting skin healing' },
          { id: 'no_medications', label: 'I am not taking medications that increase photosensitivity' }
        ]
      },
      {
        type: 'checkboxes',
        title: 'Client Consent',
        items: [
          { id: 'understand_procedure', label: 'I understand the microdermabrasion procedure and expected results', required: true },
          { id: 'understand_risks', label: 'I understand potential risks: temporary redness, sensitivity, minor irritation', required: true },
          { id: 'follow_care', label: 'I agree to follow all pre and post-treatment instructions', required: true },
          { id: 'realistic_expectations', label: 'I have realistic expectations and understand results may vary', required: true },
          { id: 'no_guarantee', label: 'I understand there is no guarantee of specific results', required: true },
          { id: 'authorize_treatment', label: 'I authorize the treatment and waive claims for complications from undisclosed medical conditions', required: true }
        ]
      },
      {
        type: 'signature',
        title: 'Client Acknowledgment and Signature'
      }
    ]
  }
}