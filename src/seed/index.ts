import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Room } from '../models/Room.js';
import { MenuItem } from '../models/MenuItem.js';
import { Staff } from '../models/Staff.js';
import { Guest } from '../models/Guest.js';
import connectDB from '../config/db.js';

dotenv.config();

connectDB();

const importData = async () => {
    try {
        await Room.deleteMany();
        await MenuItem.deleteMany();
        await Staff.deleteMany();
        await Guest.deleteMany();

        // STAFF
        const staffMembers = [
            { name: 'Admin User', email: 'admin@smana.com', password: 'password123', role: 'Admin', isOnline: false },
            { name: 'Receptionist User', email: 'reception@smana.com', password: 'password123', role: 'Receptionist', isOnline: false },
            { name: 'Chef Gordon', email: 'chef@smana.com', password: 'password123', role: 'Chef', isOnline: false },
            { name: 'Housekeeper Anna', email: 'housekeeping@smana.com', password: 'password123', role: 'Housekeeping', isOnline: false },
            { name: 'Manager John', email: 'manager@smana.com', password: 'password123', role: 'Manager', isOnline: false },
        ];
        await Staff.create(staffMembers);
        console.log('Staff imported!');

        // ROOMS
        const rooms = [];
        const roomTypes: any = ['Standard', 'Deluxe', 'Suite', 'Royal'];
        // 5 floors, 20 rooms each = 100 rooms
        for (let floor = 1; floor <= 5; floor++) {
            for (let r = 1; r <= 20; r++) {
                const roomNum = floor * 100 + r;
                const typeIndex = Math.floor(Math.random() * roomTypes.length);
                rooms.push({
                    roomNumber: roomNum.toString(),
                    type: roomTypes[typeIndex],
                    floor: floor,
                    status: 'Available'
                });
            }
        }
        await Room.create(rooms);
        console.log('Rooms imported!');

        // MENU ITEMS
        const luxuryDishes = [
            { name: "Wagyu Beef Carpaccio", description: "Thinly sliced A5 Wagyu beef with truffle oil.", price: 120, category: "Appetizer" },
            { name: "Lobster Bisque", description: "Rich and creamy soup with fresh lobster chunks.", price: 95, category: "Appetizer" },
            { name: "Foie Gras Terrine", description: "Served with fig jam and brioche toast.", price: 110, category: "Appetizer" },
            { name: "Saffron Risotto", description: "Creamy arborio rice with Iranian saffron.", price: 85, category: "Appetizer" },
            { name: "Oysters Rockefeller", description: "Fresh oysters baked with spinach and herbs.", price: 100, category: "Appetizer" },
            { name: "Truffle Mushroom Bruschetta", description: "Toasted baguette topped with truffle mushrooms.", price: 75, category: "Appetizer" },
            { name: "Scallop Ceviche", description: "Cured scallops with citrus and chili.", price: 90, category: "Appetizer" },

            { name: "Grilled Ribeye Steak", description: "Premium ribeye served with roasted vegetables.", price: 250, category: "Main Course" },
            { name: "Pan-Seared Sea Bass", description: "Wild-caught sea bass with lemon butter sauce.", price: 220, category: "Main Course" },
            { name: "Duck Confit", description: "Slow-cooked duck leg with potato gratin.", price: 180, category: "Main Course" },
            { name: "Lamb Chops", description: "Herb-crusted lamb chops with mint chimichurri.", price: 240, category: "Main Course" },
            { name: "Lobster Thermidor", description: "Whole lobster gratinated with mustard sauce.", price: 320, category: "Main Course" },
            { name: "Black Truffle Pasta", description: "Homemade tagliatelle with fresh black truffles.", price: 190, category: "Main Course" },
            { name: "Filet Mignon", description: "Tender beef filet with red wine reduction.", price: 280, category: "Main Course" },
            { name: "King Prawn Curry", description: "Spicy coconut curry with giant tiger prawns.", price: 210, category: "Main Course" },

            { name: "Gold Leaf Chocolate Cake", description: "Decadent dark chocolate cake with 24k gold leaf.", price: 80, category: "Dessert" },
            { name: "Tiramisu Classico", description: "Traditional Italian recipe with mascarpone.", price: 65, category: "Dessert" },
            { name: "Vanilla Bean Panna Cotta", description: "Silky panna cotta with berry compote.", price: 60, category: "Dessert" },
            { name: "Raspberry Macarons", description: "Delicate almond cookies filled with raspberry.", price: 55, category: "Dessert" },
            { name: "Lemon Basil Tart", description: "Zesty lemon curd in a butter crust.", price: 50, category: "Dessert" },
            { name: "Pistachio Gelato", description: "Homemade gelato with Sicilian pistachios.", price: 45, category: "Dessert" },

            { name: "Signature Gold Latte", description: "Espresso with steamed milk and gold dust.", price: 40, category: "Beverage" },
            { name: "Royal Saffron Tea", description: "Premium black tea infused with saffron.", price: 35, category: "Beverage" },
            { name: "Fresh Berry Smoothie", description: "Blend of strawberries, blueberries, and yogurt.", price: 45, category: "Beverage" },
            { name: "Sparkling Elderflower", description: "Refreshing elderflower soda with mint.", price: 30, category: "Beverage" },
            { name: "Classic Mojito (Virgin)", description: "Mint, lime, and soda water.", price: 35, category: "Beverage" },
            { name: "Blue Lagoon Mocktail", description: "Citrusy blue curacao syrup with soda.", price: 38, category: "Beverage" }
        ];

        const menuItems = luxuryDishes.map((dish, index) => ({
            ...dish,
            isActive: true,
            imageUrl: 'https://via.placeholder.com/300?text=' + encodeURIComponent(dish.name),
            allergens: index % 3 === 0 ? ['Dairy'] : (index % 5 === 0 ? ['Shellfish'] : [])
        }));

        await MenuItem.create(menuItems);
        console.log(`Menu Items imported: ${menuItems.length} items`);

        console.log('Data Imported!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
};

const destroyData = async () => {
    // ... impl if needed
};

if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}
