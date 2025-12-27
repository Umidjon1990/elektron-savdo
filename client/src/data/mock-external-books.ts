// Simulating a global book database (e.g. Google Books API or OpenLibrary)
export const KNOWN_BOOKS_DB: Record<string, { name: string; author: string; category: string; image: string }> = {
  "9780061120084": {
    name: "To Kill a Mockingbird",
    author: "Harper Lee",
    category: "Jahon adabiyoti",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300&h=400"
  },
  "9780451524935": {
    name: "1984",
    author: "George Orwell",
    category: "Jahon adabiyoti",
    image: "https://images.unsplash.com/photo-1531901599143-df5010ab7aa5?auto=format&fit=crop&q=80&w=300&h=400"
  },
  "9780743273565": {
    name: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    category: "Jahon adabiyoti",
    image: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=300&h=400"
  },
  "9789943234567": {
    name: "O'tkan kunlar",
    author: "Abdulla Qodiriy",
    category: "O'zbek adabiyoti",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=300&h=400"
  },
  "9781847941831": {
    name: "Atomic Habits",
    author: "James Clear",
    category: "Biznes va Rivojlanish",
    image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=300&h=400"
  }
};
