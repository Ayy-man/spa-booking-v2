// Dermal Spa Services Data
const serviceCategories = {
    facials: [
        { id: 'basic_facial', name: 'Basic Facial', duration: 30, price: 65, category: 'facials' },
        { id: 'deep_cleansing_facial', name: 'Deep Cleansing Facial', duration: 60, price: 79, category: 'facials' },
        { id: 'placenta_collagen_facial', name: 'Placenta/Collagen Facial', duration: 60, price: 90, category: 'facials' },
        { id: 'whitening_kojic_facial', name: 'Whitening Kojic Facial', duration: 60, price: 90, category: 'facials' },
        { id: 'anti_acne_facial', name: 'Anti-Acne Facial', duration: 60, price: 90, category: 'facials' },
        { id: 'microderm_facial', name: 'Microderm Facial', duration: 60, price: 99, category: 'facials' },
        { id: 'vitamin_c_facial', name: 'Vitamin C Facial', duration: 60, price: 120, category: 'facials' },
        { id: 'acne_vulgaris_facial', name: 'Acne Vulgaris Facial', duration: 60, price: 120, category: 'facials' }
    ],
    massages: [
        { id: 'balinese_massage', name: 'Balinese Body Massage', duration: 60, price: 80, category: 'massages' },
        { id: 'maternity_massage', name: 'Maternity Massage', duration: 60, price: 85, category: 'massages' },
        { id: 'stretching_massage', name: 'Stretching Body Massage', duration: 60, price: 85, category: 'massages' },
        { id: 'deep_tissue_massage', name: 'Deep Tissue Body Massage', duration: 60, price: 90, category: 'massages' },
        { id: 'hot_stone_massage', name: 'Hot Stone Massage', duration: 60, price: 90, category: 'massages' },
        { id: 'hot_stone_90', name: 'Hot Stone Massage 90 Minutes', duration: 90, price: 120, category: 'massages' }
    ],
    treatments: [
        { id: 'underarm_cleaning', name: 'Underarm Cleaning', duration: 30, price: 99, category: 'treatments', requiresRoom3: true },
        { id: 'back_treatment', name: 'Back Treatment', duration: 30, price: 99, category: 'treatments', requiresRoom3: true },
        { id: 'chemical_peel_body', name: 'Chemical Peel (Body)', duration: 30, price: 85, category: 'treatments', requiresRoom3: true },
        { id: 'underarm_whitening', name: 'Underarm/Inguinal Whitening', duration: 30, price: 150, category: 'treatments', requiresRoom3: true },
        { id: 'microdermabrasion_body', name: 'Microdermabrasion (Body)', duration: 30, price: 85, category: 'treatments', requiresRoom3: true },
        { id: 'deep_moisturizing', name: 'Deep Moisturizing Body Treatment', duration: 30, price: 65, category: 'treatments', requiresRoom3: true },
        { id: 'dead_sea_scrub', name: 'Dead Sea Salt Body Scrub', duration: 30, price: 65, category: 'treatments', requiresRoom3: true },
        { id: 'mud_mask_wrap', name: 'Mud Mask Body Wrap', duration: 30, price: 65, category: 'treatments', requiresRoom3: true }
    ],
    waxing: [
        { id: 'eyebrow_waxing', name: 'Eyebrow Waxing', duration: 15, price: 20, category: 'waxing' },
        { id: 'lip_waxing', name: 'Lip Waxing', duration: 5, price: 10, category: 'waxing' },
        { id: 'half_arm_waxing', name: 'Half Arm Waxing', duration: 15, price: 40, category: 'waxing' },
        { id: 'full_arm_waxing', name: 'Full Arm Waxing', duration: 30, price: 60, category: 'waxing' },
        { id: 'chin_waxing', name: 'Chin Waxing', duration: 5, price: 12, category: 'waxing' },
        { id: 'neck_waxing', name: 'Neck Waxing', duration: 15, price: 30, category: 'waxing' },
        { id: 'lower_leg_waxing', name: 'Lower Leg Waxing', duration: 30, price: 40, category: 'waxing' },
        { id: 'full_leg_waxing', name: 'Full Leg Waxing', duration: 60, price: 80, category: 'waxing' },
        { id: 'full_face_waxing', name: 'Full Face Waxing', duration: 30, price: 60, category: 'waxing' },
        { id: 'bikini_waxing', name: 'Bikini Waxing', duration: 30, price: 35, category: 'waxing' },
        { id: 'underarm_waxing', name: 'Underarm Waxing', duration: 15, price: 20, category: 'waxing' },
        { id: 'brazilian_wax_women', name: 'Brazilian Wax (Women)', duration: 45, price: 60, category: 'waxing' },
        { id: 'brazilian_wax_men', name: 'Brazilian Waxing (Men)', duration: 45, price: 75, category: 'waxing' },
        { id: 'chest_wax', name: 'Chest Wax', duration: 30, price: 40, category: 'waxing' },
        { id: 'stomach_wax', name: 'Stomach Wax', duration: 30, price: 40, category: 'waxing' },
        { id: 'shoulders_wax', name: 'Shoulders', duration: 30, price: 30, category: 'waxing' },
        { id: 'feet_wax', name: 'Feet', duration: 5, price: 30, category: 'waxing' }
    ],
    packages: [
        { id: 'balinese_facial_package', name: 'Balinese Body Massage + Basic Facial', duration: 90, price: 130, category: 'packages', isCouples: true },
        { id: 'deep_tissue_3face', name: 'Deep Tissue Body Massage + 3Face', duration: 120, price: 180, category: 'packages', isCouples: true },
        { id: 'hot_stone_microderm', name: 'Hot Stone Body Massage + Microderm Facial', duration: 150, price: 200, category: 'packages', isCouples: true }
    ],
    special: [
        { id: 'vajacial_brazilian', name: 'Basic Vajacial Cleaning + Brazilian Wax', duration: 30, price: 90, category: 'special', requiresRoom3: true },
        { id: 'dermal_vip', name: 'Dermal VIP Card', duration: 30, price: 50, category: 'special' }
    ]
};

// Staff data with capabilities and schedules
const staffMembers = [
    {
        id: 'any',
        name: 'Any Available Staff',
        email: '',
        phone: '',
        specialties: 'Any qualified staff member',
        capabilities: ['facials', 'massages', 'treatments', 'waxing', 'packages', 'special'],
        workDays: [0, 1, 2, 3, 4, 5, 6], // All days
        defaultRoom: null,
        initials: 'AA'
    },
    {
        id: 'selma',
        name: 'Selma Villaver',
        email: 'happyskinhappyyou@gmail.com',
        phone: '(671) 482-7765',
        specialties: 'All Facials (except dermaplaning)',
        capabilities: ['facials'],
        workDays: [1, 3, 5, 6, 0], // Mon, Wed, Fri, Sat, Sun
        defaultRoom: 1,
        initials: 'SV'
    },
    {
        id: 'robyn',
        name: 'Robyn Camacho',
        email: 'robyncmcho@gmail.com',
        phone: '(671) 480-7862',
        specialties: 'Facials, Waxing, Body Treatments, Massages',
        capabilities: ['facials', 'waxing', 'treatments', 'massages', 'packages', 'special'],
        workDays: [0, 1, 2, 3, 4, 5, 6], // All days
        defaultRoom: 3,
        initials: 'RC'
    },
    {
        id: 'tanisha',
        name: 'Tanisha Harris',
        email: 'misstanishababyy@gmail.com',
        phone: '(671) 747-5728',
        specialties: 'Facials and Waxing',
        capabilities: ['facials', 'waxing'],
        workDays: [1, 3, 5, 6, 0], // Mon, Wed, Fri, Sat, Sun (off Tue/Thu)
        defaultRoom: 2,
        initials: 'TH'
    },
    {
        id: 'leonel',
        name: 'Leonel Sidon',
        email: 'sidonleonel@gmail.com',
        phone: '(671) 747-1882',
        specialties: 'Body Massages and Treatments (Sundays only)',
        capabilities: ['massages', 'treatments'],
        workDays: [0], // Sunday only
        defaultRoom: null, // Assists in any room
        initials: 'LS'
    }
];

// Room data
const rooms = [
    { id: 1, name: 'Room 1', capacity: 1, capabilities: ['facials', 'waxing'] },
    { id: 2, name: 'Room 2', capacity: 2, capabilities: ['facials', 'waxing', 'massages', 'packages'] },
    { id: 3, name: 'Room 3', capacity: 2, capabilities: ['facials', 'waxing', 'massages', 'treatments', 'packages', 'special'] }
];