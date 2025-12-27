import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Book, 
  ShoppingBag, 
  Shirt, 
  Utensils, 
  Laptop, 
  Heart, 
  Music, 
  Camera, 
  Gamepad2, 
  Gift, 
  Baby, 
  Car, 
  Home, 
  Briefcase,
  Palette,
  Dumbbell,
  Pill,
  GraduationCap,
  Gem,
  Watch,
  Headphones,
  Smartphone,
  Tv,
  Coffee,
  Cake,
  Apple,
  Wine,
  Flower2,
  Dog,
  Cat,
  Plane,
  Ticket,
  Tag,
  Layers
} from "lucide-react";
import type { Category } from "@shared/schema";

const AVAILABLE_ICONS = [
  { name: "Book", icon: Book },
  { name: "ShoppingBag", icon: ShoppingBag },
  { name: "Shirt", icon: Shirt },
  { name: "Utensils", icon: Utensils },
  { name: "Laptop", icon: Laptop },
  { name: "Heart", icon: Heart },
  { name: "Music", icon: Music },
  { name: "Camera", icon: Camera },
  { name: "Gamepad2", icon: Gamepad2 },
  { name: "Gift", icon: Gift },
  { name: "Baby", icon: Baby },
  { name: "Car", icon: Car },
  { name: "Home", icon: Home },
  { name: "Briefcase", icon: Briefcase },
  { name: "Palette", icon: Palette },
  { name: "Dumbbell", icon: Dumbbell },
  { name: "Pill", icon: Pill },
  { name: "GraduationCap", icon: GraduationCap },
  { name: "Gem", icon: Gem },
  { name: "Watch", icon: Watch },
  { name: "Headphones", icon: Headphones },
  { name: "Smartphone", icon: Smartphone },
  { name: "Tv", icon: Tv },
  { name: "Coffee", icon: Coffee },
  { name: "Cake", icon: Cake },
  { name: "Apple", icon: Apple },
  { name: "Wine", icon: Wine },
  { name: "Flower2", icon: Flower2 },
  { name: "Dog", icon: Dog },
  { name: "Cat", icon: Cat },
  { name: "Plane", icon: Plane },
  { name: "Ticket", icon: Ticket },
  { name: "Tag", icon: Tag },
  { name: "Layers", icon: Layers },
];

const AVAILABLE_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", 
  "#06b6d4", "#ec4899", "#6366f1", "#14b8a6", "#f97316",
  "#84cc16", "#a855f7", "#0ea5e9", "#22c55e", "#eab308"
];

function getIconComponent(iconName: string) {
  const iconData = AVAILABLE_ICONS.find(i => i.name === iconName);
  return iconData?.icon || Tag;
}

export default function Categories() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", icon: "Tag", color: "#3b82f6" });

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; icon: string; color: string }) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsDialogOpen(false);
      setFormData({ name: "", icon: "Tag", color: "#3b82f6" });
      toast.success("Kategoriya yaratildi ✓", { duration: 2000 });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ name: string; icon: string; color: string }> }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsDialogOpen(false);
      setEditingCategory(null);
      setFormData({ name: "", icon: "Tag", color: "#3b82f6" });
      toast.success("Kategoriya yangilandi ✓", { duration: 2000 });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setDeleteConfirm(null);
      toast.success("Kategoriya o'chirildi ✓", { duration: 2000 });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, icon: category.icon, color: category.color });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormData({ name: "", icon: "Tag", color: "#3b82f6" });
    setIsDialogOpen(true);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <SidebarNav />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pb-20 md:pb-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-10 shadow-sm">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800">Kategoriyalar</h1>
            <p className="text-xs text-slate-500">Mahsulot kategoriyalarini boshqarish</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Yangi</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCategory ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nomi</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Kategoriya nomi"
                    data-testid="input-category-name"
                  />
                </div>

                <div>
                  <Label>Ikonka tanlang</Label>
                  <ScrollArea className="h-48 mt-2 border rounded-lg p-2">
                    <div className="grid grid-cols-6 gap-2">
                      {AVAILABLE_ICONS.map(({ name, icon: Icon }) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: name })}
                          className={`p-2.5 rounded-lg border-2 transition-all ${
                            formData.icon === name
                              ? "border-blue-500 bg-blue-50"
                              : "border-transparent bg-slate-100 hover:bg-slate-200"
                          }`}
                          data-testid={`icon-${name}`}
                        >
                          <Icon className="w-5 h-5 text-slate-700" />
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div>
                  <Label>Rang tanlang</Label>
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {AVAILABLE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-full aspect-square rounded-lg border-2 transition-all ${
                          formData.color === color ? "border-slate-800 scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        data-testid={`color-${color}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Bekor qilish
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-category"
                  >
                    {editingCategory ? "Saqlash" : "Yaratish"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-20">
              <Layers className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Kategoriyalar yo'q</h3>
              <p className="text-slate-500 mb-4">Yangi kategoriya yarating</p>
              <Button onClick={openCreateDialog} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Kategoriya qo'shish
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {categories.map((category) => {
                const Icon = getIconComponent(category.icon);
                return (
                  <Card 
                    key={category.id} 
                    className="group border-0 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
                    data-testid={`category-card-${category.id}`}
                  >
                    <CardContent className="p-0">
                      <div 
                        className="aspect-square flex items-center justify-center relative"
                        style={{ backgroundColor: category.color + "15" }}
                      >
                        <Icon 
                          className="w-12 h-12 md:w-16 md:h-16" 
                          style={{ color: category.color }} 
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(category);
                            }}
                            className="p-1.5 bg-white rounded-lg shadow-md hover:bg-blue-50 transition-colors"
                            data-testid={`edit-category-${category.id}`}
                          >
                            <Pencil className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(category);
                            }}
                            className="p-1.5 bg-white rounded-lg shadow-md hover:bg-red-50 transition-colors"
                            data-testid={`delete-category-${category.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      <div className="p-3 bg-white">
                        <p className="font-semibold text-slate-800 text-center text-sm truncate">
                          {category.name}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kategoriyani o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteConfirm?.name}" kategoriyasini o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-category"
            >
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
