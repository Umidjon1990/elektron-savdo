import bestSeller from "@assets/stock_images/bestseller_book_cove_7c925997.jpg";
import kidsBook from "@assets/stock_images/childrens_book_cover_068a85dc.jpg";
import businessBook from "@assets/stock_images/business_book_cover__02bbae3f.jpg";
import classicBook from "@assets/stock_images/classic_literature_b_88b5c056.jpg";
import novelBook from "@assets/stock_images/modern_novel_book_co_ac46f790.jpg";
import arabicBook from "@assets/stock_images/arabic_language_lear_d8bc0c76.jpg";

export interface Product {
  id: string;
  name: string;
  author: string;
  price: number;
  costPrice: number;
  stock: number;
  category: string;
  barcode: string;
  image: string;
  videoUrl?: string;
  sortOrder?: number;
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Atomic Habits",
    author: "James Clear",
    price: 185000,
    costPrice: 120000,
    stock: 45,
    category: "Biznes va Rivojlanish",
    barcode: "9781847941831",
    image: bestSeller
  },
  {
    id: "2",
    name: "Garri Potter va Falsafa toshi",
    author: "J.K. Rowling",
    price: 120000,
    costPrice: 75000,
    stock: 24,
    category: "Bolalar adabiyoti",
    barcode: "9780747532743",
    image: kidsBook
  },
  {
    id: "3",
    name: "Zero to One",
    author: "Peter Thiel",
    price: 150000,
    costPrice: 95000,
    stock: 30,
    category: "Biznes va Rivojlanish",
    barcode: "9780804139298",
    image: businessBook
  },
  {
    id: "4",
    name: "O'tkan kunlar",
    author: "Abdulla Qodiriy",
    price: 65000,
    costPrice: 35000,
    stock: 120,
    category: "O'zbek adabiyoti",
    barcode: "9789943234567",
    image: classicBook
  },
  {
    id: "5",
    name: "1984",
    author: "George Orwell",
    price: 95000,
    costPrice: 55000,
    stock: 15,
    category: "Jahon adabiyoti",
    barcode: "9780451524935",
    image: novelBook
  },
  {
    id: "6",
    name: "Rich Dad Poor Dad",
    author: "Robert Kiyosaki",
    price: 140000,
    costPrice: 85000,
    stock: 50,
    category: "Biznes va Rivojlanish",
    barcode: "9781612680194",
    image: businessBook
  },
  {
    id: "7",
    name: "Sariq devni minib",
    author: "Xudoyberdi To'xtaboyev",
    price: 45000,
    costPrice: 25000,
    stock: 40,
    category: "Bolalar adabiyoti",
    barcode: "9789943555555",
    image: kidsBook
  },
  {
    id: "8",
    name: "Alximik",
    author: "Paulo Coelho",
    price: 85000,
    costPrice: 50000,
    stock: 60,
    category: "Jahon adabiyoti",
    barcode: "9780062315007",
    image: novelBook
  },
  {
    id: "9",
    name: "Steve Jobs",
    author: "Walter Isaacson",
    price: 210000,
    costPrice: 140000,
    stock: 10,
    category: "Biografiya",
    barcode: "9781451648539",
    image: bestSeller
  },
  {
    id: "10",
    name: "Boburnoma",
    author: "Zahiriddin Muhammad Bobur",
    price: 180000,
    costPrice: 100000,
    stock: 5,
    category: "O'zbek adabiyoti",
    barcode: "9789943999999",
    image: classicBook
  },
  {
    id: "11",
    name: "Bosqichli arab tili B1",
    author: "Abdulloh ibn Muhammad",
    price: 75000,
    costPrice: 45000,
    stock: 100,
    category: "Til o'rganish",
    barcode: "9789943112233",
    image: arabicBook
  }
];

export const CATEGORIES = [
  "Barchasi",
  "Jahon adabiyoti",
  "O'zbek adabiyoti",
  "Biznes va Rivojlanish",
  "Bolalar adabiyoti",
  "Biografiya",
  "Ilmiy ommabop",
  "Til o'rganish"
];
