import assets from "@assets/stock_images/assorted_supermarket_e341f817.jpg"; // Placeholder fallback
import drinkImg from "@assets/stock_images/beverages_and_drinks_08bd9a25.jpg";
import snackImg from "@assets/stock_images/snacks_and_chips_pac_4a8cb024.jpg";
import fruitImg from "@assets/stock_images/fresh_fruits_and_veg_5354bac0.jpg";

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  barcode: string;
  image: string;
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Coca Cola Classic 1.5L",
    price: 12000,
    stock: 45,
    category: "Ichimliklar",
    barcode: "890123456789",
    image: drinkImg
  },
  {
    id: "2",
    name: "Lays Chips Pishloqli 140g",
    price: 15000,
    stock: 24,
    category: "Sneaklar",
    barcode: "460123456789",
    image: snackImg
  },
  {
    id: "3",
    name: "Fanta Apelsin 1L",
    price: 10000,
    stock: 30,
    category: "Ichimliklar",
    barcode: "890987654321",
    image: drinkImg
  },
  {
    id: "4",
    name: "Olma Fuji (kg)",
    price: 18000,
    stock: 120,
    category: "Mevalar",
    barcode: "200000000001",
    image: fruitImg
  },
  {
    id: "5",
    name: "Nestle Sut 1L 3.2%",
    price: 14500,
    stock: 8,
    category: "Sut mahsulotlari",
    barcode: "460555555555",
    image: assets
  },
  {
    id: "6",
    name: "Snickers Super",
    price: 8000,
    stock: 150,
    category: "Shirinliklar",
    barcode: "500015941111",
    image: snackImg
  },
  {
    id: "7",
    name: "Non (Buxanka)",
    price: 3000,
    stock: 40,
    category: "Non mahsulotlari",
    barcode: "200000000002",
    image: assets
  },
  {
    id: "8",
    name: "Pepsi Cola 0.5L",
    price: 6000,
    stock: 60,
    category: "Ichimliklar",
    barcode: "890111222333",
    image: drinkImg
  }
];

export const CATEGORIES = [
  "Barchasi",
  "Ichimliklar",
  "Sneaklar",
  "Mevalar",
  "Sut mahsulotlari",
  "Shirinliklar",
  "Non mahsulotlari"
];
