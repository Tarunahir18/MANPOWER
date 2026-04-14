require('dotenv').config();
const supabase = require('./supabase');

const products = [
    {
        name: 'MANPOWER Elite Jersey',
        category: 'Jerseys',
        price: 45.99,
        image: 'https://images.unsplash.com/photo-1580087444694-ec69fac42eeb?q=80&w=800&auto=format&fit=crop',
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
