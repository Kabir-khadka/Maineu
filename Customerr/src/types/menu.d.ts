export interface Category {
  _id: string;
  name: string;
}

export interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: Category | string;
  available: boolean;
  image?: string;
}
