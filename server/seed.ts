import { db } from "@db";
import { products } from "@shared/schema";
import { sql } from "drizzle-orm";

const SEED_PRODUCTS = [
  {
    name: "Atomic Habits",
    author: "James Clear",
    price: 185000,
    stock: 45,
    category: "Biznes va Rivojlanish",
    barcode: "9781847941831",
    image: "/assets/stock_images/bestseller_book_cove_7c925997.jpg"
  },
  {
    name: "Garri Potter va Falsafa toshi",
    author: "J.K. Rowling",
    price: 120000,
    stock: 24,
    category: "Bolalar adabiyoti",
    barcode: "9780747532743",
    image: "/assets/stock_images/childrens_book_cover_068a85dc.jpg"
  },
  {
    name: "Zero to One",
    author: "Peter Thiel",
    price: 150000,
    stock: 30,
    category: "Biznes va Rivojlanish",
    barcode: "9780804139298",
    image: "/assets/stock_images/business_book_cover__02bbae3f.jpg"
  },
  {
    name: "O'tkan kunlar",
    author: "Abdulla Qodiriy",
    price: 65000,
    stock: 120,
    category: "O'zbek adabiyoti",
    barcode: "9789943234567",
    image: "/assets/stock_images/classic_literature_b_88b5c056.jpg"
  },
  {
    name: "1984",
    author: "George Orwell",
    price: 95000,
    stock: 15,
    category: "Jahon adabiyoti",
    barcode: "9780451524935",
    image: "/assets/stock_images/modern_novel_book_co_ac46f790.jpg"
  },
  {
    name: "Rich Dad Poor Dad",
    author: "Robert Kiyosaki",
    price: 140000,
    stock: 50,
    category: "Biznes va Rivojlanish",
    barcode: "9781612680194",
    image: "/assets/stock_images/business_book_cover__02bbae3f.jpg"
  },
  {
    name: "Sariq devni minib",
    author: "Xudoyberdi To'xtaboyev",
    price: 45000,
    stock: 40,
    category: "Bolalar adabiyoti",
    barcode: "9789943555555",
    image: "/assets/stock_images/childrens_book_cover_068a85dc.jpg"
  },
  {
    name: "Alximik",
    author: "Paulo Coelho",
    price: 85000,
    stock: 60,
    category: "Jahon adabiyoti",
    barcode: "9780062315007",
    image: "/assets/stock_images/modern_novel_book_co_ac46f790.jpg"
  },
  {
    name: "Steve Jobs",
    author: "Walter Isaacson",
    price: 210000,
    stock: 10,
    category: "Biografiya",
    barcode: "9781451648539",
    image: "/assets/stock_images/bestseller_book_cove_7c925997.jpg"
  },
  {
    name: "Boburnoma",
    author: "Zahiriddin Muhammad Bobur",
    price: 180000,
    stock: 5,
    category: "O'zbek adabiyoti",
    barcode: "9789943999999",
    image: "/assets/stock_images/classic_literature_b_88b5c056.jpg"
  },
  {
    name: "Bosqichli arab tili B1",
    author: "Abdulloh ibn Muhammad",
    price: 75000,
    stock: 100,
    category: "Til o'rganish",
    barcode: "9789943112233",
    image: "/assets/stock_images/arabic_language_lear_d8bc0c76.jpg"
  }
];

async function seed() {
  console.log("🌱 Seeding database...");
  
  // Clear existing products
  await db.delete(products);
  
  // Insert seed products
  for (const product of SEED_PRODUCTS) {
    await db.insert(products).values(product);
  }
  
  console.log(`✅ Seeded ${SEED_PRODUCTS.length} products`);
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
