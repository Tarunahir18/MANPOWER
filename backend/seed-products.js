require('dotenv').config();
const supabase = require('./supabase');

const products = [
    {
        name: 'MANPOWER Elite Jersey',
        category: 'Jerseys',
        price: 45.99,
        image: '../assets/images/elite_jersey.png',
        description: 'Official MANPOWER team jersey with breathable fabric and moisture-wicking technology.'
    },
    {
        name: 'Pro Star Soccer Ball',
        category: 'Equipment',
        price: 29.50,
        image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop',
        description: 'FIFA quality professional soccer ball for optimal flight and control.'
    },
    {
        name: 'Whey Isolate Protein',
        category: 'Supplements',
        price: 55.00,
        image: 'https://images.unsplash.com/photo-1593090758386-bf88663806a6?q=80&w=800&auto=format&fit=crop',
        description: 'Premium quality whey isolate for fast muscle recovery after intense workouts.'
    },
    {
        name: 'GripMaster Sport Gloves',
        category: 'Equipment',
        price: 18.25,
        image: 'https://images.unsplash.com/photo-1583473848882-f9a5bc7fd2ee?q=80&w=800&auto=format&fit=crop',
        description: 'High-grip training gloves for weightlifting and functional training.'
    },
    {
        name: 'MANPOWER Speed Cleats',
        category: 'Equipment',
        price: 89.99,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop',
        description: 'Ultra-lightweight cleats designed for maximum acceleration and agility.'
    },
    {
        name: 'Recovery BCAAs Berry',
        category: 'Supplements',
        price: 32.50,
        image: 'https://images.unsplash.com/photo-1610725664285-f9af34c6786e?q=80&w=800&auto=format&fit=crop',
        description: 'Essential amino acids for endurance and reduced muscle soreness.'
    },
    {
        name: 'MANPOWER Premium Gym Bag',
        category: 'Accessories',
        price: 40.00,
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800&auto=format&fit=crop',
        description: 'Spacious and durable duffel bag with waterproof compartments and breathable shoe pocket.'
    },
    {
        name: 'Pro-Grip Basketball',
        category: 'Equipment',
        price: 35.00,
        image: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?q=80&w=800&auto=format&fit=crop',
        description: 'Indoor/outdoor multi-surface basketball with advanced composite leather grip.'
    },
    {
        name: 'Elite Training Resistance Bands',
        category: 'Equipment',
        price: 24.99,
        image: 'https://images.unsplash.com/photo-1598289431512-b97b0a150b18?q=80&w=800&auto=format&fit=crop',
        description: 'Set of 5 heavy-duty latex resistance bands ranging from 10lbs to 50lbs, including handles.'
    },
    {
        name: 'HydraFlask 32oz Insulated Bottle',
        category: 'Accessories',
        price: 28.50,
        image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=800&auto=format&fit=crop',
        description: 'Double-wall vacuum insulated stainless steel water bottle. Keeps drinks cold for 24 hours.'
    },
    {
        name: 'Pro Carbon Archery Bow',
        category: 'Equipment',
        price: 199.99,
        image: 'https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7?q=80&w=800&auto=format&fit=crop',
        description: 'Professional grade carbon fiber recurve bow. Extremely lightweight with high accuracy design for competitive archery.'
    },
    {
        name: 'Precision Target Arrows (Set of 6)',
        category: 'Accessories',
        price: 45.00,
        image: 'https://images.unsplash.com/photo-1582645607914-7221b2dd736b?q=80&w=800&auto=format&fit=crop',
        description: 'Set of 6 high-durability carbon arrows featuring aerodynamic vanes and precision stainless steel field points.'
    },
    {
        name: 'Elite Archery Target Board',
        category: 'Equipment',
        price: 85.50,
        image: 'https://images.unsplash.com/photo-1533221974955-46f90d540f2f?q=80&w=800&auto=format&fit=crop',
        description: 'Self-healing dense foam target board constructed for extreme durability and easy arrow retrieval.'
    }
];

async function seed() {
    console.log('🌱 Seeding products...');
    
    // Clear existing products (optional, but good for a fresh start)
    const { error: deleteError } = await supabase.from('products').delete().neq('id', 0);
    if (deleteError) {
        console.error('Error clearing products:', deleteError);
    }

    const { data, error } = await supabase
        .from('products')
        .insert(products)
        .select();

    if (error) {
        console.error('Error seeding products:', error);
    } else {
        console.log(`✅ Successfully seeded ${data.length} products!`);
    }
}

seed();
