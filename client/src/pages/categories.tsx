import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  Layers,
  Pin,
  PinOff,
  GripVertical,
  Search,
  Package,
  CheckSquare,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from "lucide-react";
import type { Category, Product } from "@shared/schema";
import { getAuthHeaders } from "@/lib/auth-context";

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
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [manageCategory, setManageCategory] = useState<Category | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const productCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    allProducts.forEach(p => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    return counts;
  }, [allProducts]);

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; icon: string; color: string }) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsDialogOpen(false);
      setFormData({ name: "", icon: "Tag", color: "#3b82f6" });
      toast.success("Kategoriya yaratildi", { duration: 2000 });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ name: string; icon: string; color: string }> }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
      toast.success("Kategoriya yangilandi", { duration: 2000 });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to delete category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setDeleteConfirm(null);
      toast.success("Kategoriya o'chirildi", { duration: 2000 });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await fetch("/api/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) throw new Error("Failed to reorder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
  });

  const pinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const res = await fetch(`/api/categories/${id}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ isPinned }),
      });
      if (!res.ok) throw new Error("Failed to pin");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast.success(variables.isPinned ? "Kategoriya pin qilindi" : "Pin olib tashlandi", { duration: 2000 });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ productIds, categoryName }: { productIds: string[]; categoryName: string }) => {
      const res = await fetch("/api/categories/assign-products", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ productIds, categoryName }),
      });
      if (!res.ok) throw new Error("Failed to assign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast.success("Mahsulotlar qo'shildi", { duration: 2000 });
    },
  });

  const reorderProductsMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await fetch("/api/products/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) throw new Error("Failed to reorder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast.success("Tartib saqlandi", { duration: 2000 });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const res = await fetch("/api/categories/unassign-products", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ productIds }),
      });
      if (!res.ok) throw new Error("Failed to unassign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast.success("Mahsulotlar olib tashlandi", { duration: 2000 });
    },
  });

  const categoryProducts = useMemo(() => {
    if (!manageCategory) return [];
    return allProducts.filter(p => p.category === manageCategory.name);
  }, [allProducts, manageCategory]);

  const uncategorizedProducts = useMemo(() => {
    if (!manageCategory) return [];
    return allProducts.filter(p => !p.category || p.category === "");
  }, [allProducts, manageCategory]);

  const otherCategoryProducts = useMemo(() => {
    if (!manageCategory) return [];
    return allProducts.filter(p => p.category && p.category !== "" && p.category !== manageCategory.name);
  }, [allProducts, manageCategory]);

  const filteredProducts = useMemo(() => {
    const search = productSearch.toLowerCase().trim();
    const filterFn = (p: Product) => {
      if (!search) return true;
      return p.name.toLowerCase().includes(search) || (p.barcode && p.barcode.toLowerCase().includes(search));
    };
    return {
      inCategory: categoryProducts.filter(filterFn).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
      uncategorized: uncategorizedProducts.filter(filterFn),
      otherCategory: otherCategoryProducts.filter(filterFn),
    };
  }, [categoryProducts, uncategorizedProducts, otherCategoryProducts, productSearch]);

  const [draggedProductId, setDraggedProductId] = useState<string | null>(null);
  const [dragOverProductId, setDragOverProductId] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);

  const sortedCategoryProducts = useMemo(() => {
    return [...categoryProducts].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [categoryProducts]);

  const handleDragStart = (productId: string) => {
    setDraggedProductId(productId);
  };

  const handleDragOver = (e: React.DragEvent, productId: string) => {
    e.preventDefault();
    if (productId !== draggedProductId) {
      setDragOverProductId(productId);
    }
  };

  const handleDrop = (targetProductId: string) => {
    if (!draggedProductId || draggedProductId === targetProductId) {
      setDraggedProductId(null);
      setDragOverProductId(null);
      return;
    }
    const items = [...sortedCategoryProducts];
    const dragIdx = items.findIndex(p => p.id === draggedProductId);
    const dropIdx = items.findIndex(p => p.id === targetProductId);
    if (dragIdx === -1 || dropIdx === -1) return;
    const [moved] = items.splice(dragIdx, 1);
    items.splice(dropIdx, 0, moved);
    const orderedIds = items.map(p => p.id);
    reorderProductsMutation.mutate(orderedIds);
    setDraggedProductId(null);
    setDragOverProductId(null);
  };

  const handleDragEnd = () => {
    setDraggedProductId(null);
    setDragOverProductId(null);
  };

  const moveProduct = (productId: string, direction: "up" | "down") => {
    const items = [...sortedCategoryProducts];
    const idx = items.findIndex(p => p.id === productId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === items.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
    const orderedIds = items.map(p => p.id);
    reorderProductsMutation.mutate(orderedIds);
  };

  const openManageProducts = (category: Category) => {
    setManageCategory(category);
    setProductSearch("");
    setSelectedProductIds(new Set());
    setReorderMode(false);
  };

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (products: Product[]) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      products.forEach(p => next.add(p.id));
      return next;
    });
  };

  const deselectAll = (products: Product[]) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      products.forEach(p => next.delete(p.id));
      return next;
    });
  };

  const handleAssignSelected = () => {
    if (!manageCategory || selectedProductIds.size === 0) return;
    const toAssign = Array.from(selectedProductIds).filter(id => {
      const p = allProducts.find(pr => pr.id === id);
      return p && p.category !== manageCategory.name;
    });
    if (toAssign.length > 0) {
      assignMutation.mutate({ productIds: toAssign, categoryName: manageCategory.name });
    }
    setSelectedProductIds(new Set());
  };

  const handleUnassignSelected = () => {
    if (!manageCategory || selectedProductIds.size === 0) return;
    const toUnassign = Array.from(selectedProductIds).filter(id => {
      const p = allProducts.find(pr => pr.id === id);
      return p && p.category === manageCategory.name;
    });
    if (toUnassign.length > 0) {
      unassignMutation.mutate(toUnassign);
    }
    setSelectedProductIds(new Set());
  };

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

  const pinnedCategories = categories.filter(c => c.isPinned);
  const unpinnedCategories = categories.filter(c => !c.isPinned);
  const displayOrder = [...pinnedCategories, ...unpinnedCategories];

  const handleCatDragStart = (index: number) => {
    dragItem.current = index;
    setDragIndex(index);
  };

  const handleCatDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleCatDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) {
      setDragIndex(null);
      return;
    }
    const reordered = [...displayOrder];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);
    
    reorderMutation.mutate(reordered.map(c => c.id));
    dragItem.current = null;
    dragOverItem.current = null;
    setDragIndex(null);
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
            <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCategory ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
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
                  <Label>Ikonka</Label>
                  <div className="grid grid-cols-8 gap-1.5 mt-2">
                    {AVAILABLE_ICONS.slice(0, 16).map(({ name, icon: Icon }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: name })}
                        className={`p-2 rounded-lg border-2 transition-all ${
                          formData.icon === name
                            ? "border-blue-500 bg-blue-50"
                            : "border-transparent bg-slate-100 hover:bg-slate-200"
                        }`}
                        data-testid={`icon-${name}`}
                      >
                        <Icon className="w-4 h-4 text-slate-700" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Rang</Label>
                  <div className="grid grid-cols-8 gap-1.5 mt-2">
                    {AVAILABLE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-full aspect-square rounded-lg border-2 transition-all ${
                          formData.color === color ? "border-slate-800 scale-105" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        data-testid={`color-${color}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Bekor
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
            <>
              {pinnedCategories.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Pin className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Pin qilingan</h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {pinnedCategories.map((category, index) => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        index={index}
                        isDragging={dragIndex === index}
                        onDragStart={handleCatDragStart}
                        onDragEnter={handleCatDragEnter}
                        onDragEnd={handleCatDragEnd}
                        onEdit={openEditDialog}
                        onDelete={setDeleteConfirm}
                        onTogglePin={(id, pinned) => pinMutation.mutate({ id, isPinned: pinned })}
                        onManage={openManageProducts}
                        productCount={productCountByCategory[category.name] || 0}
                      />
                    ))}
                  </div>
                </div>
              )}

              {unpinnedCategories.length > 0 && (
                <div>
                  {pinnedCategories.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="w-4 h-4 text-slate-400" />
                      <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Barchasi</h2>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {unpinnedCategories.map((category, index) => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        index={pinnedCategories.length + index}
                        isDragging={dragIndex === pinnedCategories.length + index}
                        onDragStart={handleCatDragStart}
                        onDragEnter={handleCatDragEnter}
                        onDragEnd={handleCatDragEnd}
                        onEdit={openEditDialog}
                        onDelete={setDeleteConfirm}
                        onTogglePin={(id, pinned) => pinMutation.mutate({ id, isPinned: pinned })}
                        onManage={openManageProducts}
                        productCount={productCountByCategory[category.name] || 0}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
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

      <Dialog open={!!manageCategory} onOpenChange={(open) => { if (!open) setManageCategory(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {manageCategory && (() => {
                const Icon = getIconComponent(manageCategory.icon);
                return <Icon className="w-5 h-5" style={{ color: manageCategory.color }} />;
              })()}
              {manageCategory?.name} - Mahsulotlar
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 py-2 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Mahsulot qidirish..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-9"
                data-testid="input-product-search"
              />
            </div>
          </div>

          {selectedProductIds.size > 0 && (
            <div className="px-4 py-2 bg-blue-50 border-b flex items-center justify-between shrink-0">
              <span className="text-sm text-blue-700 font-medium">
                {selectedProductIds.size} ta tanlandi
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAssignSelected}
                  disabled={assignMutation.isPending}
                  className="text-xs h-7 bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                  data-testid="button-assign-selected"
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  Qo'shish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUnassignSelected}
                  disabled={unassignMutation.isPending}
                  className="text-xs h-7 bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                  data-testid="button-unassign-selected"
                >
                  <X className="w-3 h-3 mr-1" />
                  Olib tashlash
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedProductIds(new Set())}
                  className="text-xs h-7"
                >
                  Bekor
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
            {filteredProducts.inCategory.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    Bu kategoriyada ({filteredProducts.inCategory.length})
                  </h3>
                  <div className="flex gap-1 items-center">
                    <button
                      onClick={() => setReorderMode(!reorderMode)}
                      className={`text-[10px] flex items-center gap-0.5 ${reorderMode ? 'text-indigo-600 font-semibold' : 'text-indigo-500 hover:underline'}`}
                      data-testid="button-toggle-reorder"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      {reorderMode ? "Tartibni yopish" : "Tartib"}
                    </button>
                    {!reorderMode && (
                      <>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => selectAll(filteredProducts.inCategory)}
                          className="text-[10px] text-blue-600 hover:underline"
                        >
                          Barchasini tanlash
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => deselectAll(filteredProducts.inCategory)}
                          className="text-[10px] text-slate-500 hover:underline"
                        >
                          Bekor
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  {reorderMode ? (
                    sortedCategoryProducts
                      .filter(p => {
                        const search = productSearch.toLowerCase().trim();
                        if (!search) return true;
                        return p.name.toLowerCase().includes(search) || (p.barcode && p.barcode.toLowerCase().includes(search));
                      })
                      .map((product, idx) => (
                        <div
                          key={product.id}
                          draggable
                          onDragStart={() => handleDragStart(product.id)}
                          onDragOver={(e) => handleDragOver(e, product.id)}
                          onDrop={() => handleDrop(product.id)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                            draggedProductId === product.id ? 'opacity-40 border-indigo-300 bg-indigo-50' :
                            dragOverProductId === product.id ? 'border-indigo-400 bg-indigo-50 shadow-sm' :
                            'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                          data-testid={`reorder-item-${product.id}`}
                        >
                          <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-400 w-5 text-center shrink-0">{idx + 1}</span>
                          {product.image ? (
                            <img src={product.image} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{product.name}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); moveProduct(product.id, "up"); }}
                              disabled={idx === 0}
                              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                              data-testid={`move-up-${product.id}`}
                            >
                              <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveProduct(product.id, "down"); }}
                              disabled={idx === sortedCategoryProducts.length - 1}
                              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                              data-testid={`move-down-${product.id}`}
                            >
                              <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                          </div>
                        </div>
                      ))
                  ) : (
                    filteredProducts.inCategory.map(product => (
                      <ProductCheckItem
                        key={product.id}
                        product={product}
                        checked={selectedProductIds.has(product.id)}
                        onToggle={() => toggleProduct(product.id)}
                        inCategory
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {filteredProducts.uncategorized.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    Kategoriyasiz ({filteredProducts.uncategorized.length})
                  </h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => selectAll(filteredProducts.uncategorized)}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      Barchasini tanlash
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => deselectAll(filteredProducts.uncategorized)}
                      className="text-[10px] text-slate-500 hover:underline"
                    >
                      Bekor
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {filteredProducts.uncategorized.map(product => (
                    <ProductCheckItem
                      key={product.id}
                      product={product}
                      checked={selectedProductIds.has(product.id)}
                      onToggle={() => toggleProduct(product.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredProducts.otherCategory.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    Boshqa kategoriyalarda ({filteredProducts.otherCategory.length})
                  </h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => selectAll(filteredProducts.otherCategory)}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      Barchasini tanlash
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => deselectAll(filteredProducts.otherCategory)}
                      className="text-[10px] text-slate-500 hover:underline"
                    >
                      Bekor
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {filteredProducts.otherCategory.map(product => (
                    <ProductCheckItem
                      key={product.id}
                      product={product}
                      checked={selectedProductIds.has(product.id)}
                      onToggle={() => toggleProduct(product.id)}
                      otherCategory={product.category || undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredProducts.inCategory.length === 0 && filteredProducts.uncategorized.length === 0 && filteredProducts.otherCategory.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-2" />
                <p className="text-sm">Mahsulotlar topilmadi</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductCheckItem({
  product,
  checked,
  onToggle,
  inCategory,
  otherCategory,
}: {
  product: Product;
  checked: boolean;
  onToggle: () => void;
  inCategory?: boolean;
  otherCategory?: string;
}) {
  return (
    <label
      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
        checked ? "bg-blue-50" : "hover:bg-slate-50"
      } ${inCategory ? "border-l-2 border-green-400" : ""}`}
      data-testid={`product-check-${product.id}`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="shrink-0"
      />
      {product.image ? (
        <img src={product.image} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
          <Package className="w-4 h-4 text-slate-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{product.name}</p>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {product.barcode && <span>{product.barcode}</span>}
          {otherCategory && (
            <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
              {otherCategory}
            </span>
          )}
        </div>
      </div>
      <span className="text-xs font-medium text-slate-600 shrink-0">
        {Number(product.price).toLocaleString()} so'm
      </span>
    </label>
  );
}

function CategoryCard({
  category,
  index,
  isDragging,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onEdit,
  onDelete,
  onTogglePin,
  onManage,
  productCount,
}: {
  category: Category;
  index: number;
  isDragging: boolean;
  onDragStart: (index: number) => void;
  onDragEnter: (index: number) => void;
  onDragEnd: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onManage: (category: Category) => void;
  productCount?: number;
}) {
  const Icon = getIconComponent(category.icon);

  return (
    <Card
      draggable
      onDragStart={() => onDragStart(index)}
      onDragEnter={() => onDragEnter(index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => onManage(category)}
      className={`group border-0 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden ${
        isDragging ? "opacity-50 scale-95" : ""
      } ${category.isPinned ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}
      data-testid={`category-card-${category.id}`}
    >
      <CardContent className="p-0">
        <div
          className="aspect-square flex items-center justify-center relative"
          style={{ backgroundColor: category.color + "15" }}
        >
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
            <GripVertical className="w-4 h-4 text-slate-400" />
          </div>
          <Icon
            className="w-12 h-12 md:w-16 md:h-16"
            style={{ color: category.color }}
          />
          {category.isPinned && (
            <div className="absolute top-2 left-2 group-hover:opacity-0 transition-opacity">
              <Pin className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(category.id, !category.isPinned);
              }}
              className={`p-1.5 rounded-lg shadow-md transition-colors ${
                category.isPinned
                  ? "bg-amber-50 hover:bg-amber-100"
                  : "bg-white hover:bg-amber-50"
              }`}
              data-testid={`pin-category-${category.id}`}
              title={category.isPinned ? "Pin olib tashlash" : "Pin qilish"}
            >
              {category.isPinned ? (
                <PinOff className="w-4 h-4 text-amber-600" />
              ) : (
                <Pin className="w-4 h-4 text-amber-500" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(category);
              }}
              className="p-1.5 bg-white rounded-lg shadow-md hover:bg-blue-50 transition-colors"
              data-testid={`edit-category-${category.id}`}
            >
              <Pencil className="w-4 h-4 text-blue-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(category);
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
          {productCount !== undefined && (
            <p className="text-xs text-slate-400 text-center mt-0.5">
              {productCount} ta mahsulot
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
