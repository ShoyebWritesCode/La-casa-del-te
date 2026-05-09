import Shop from '@/shop/Shop';
import { getShopData } from '@/shop/shop-actions';

export default async function Home() {
  const shopData = await getShopData();

  return (
    <Shop
      initialCategories={shopData.categories}
      initialProducts={shopData.products}
    />
  );
}
