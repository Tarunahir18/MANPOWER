const supabase = require('./supabase');

async function check() {
    const { data, error } = await supabase.from('products').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Products in DB:', data.length);
        console.log(data);
    }
}

check();
