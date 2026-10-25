import { PriceRatePage } from "@/features/price-rate";

// Isi halaman baru dirender setelah layout tahu role user (RequirePermission),
// jadi segment ini juga dikeluarkan dari validasi instant navigation.
export const instant = false;


const Page = () => {
  return (
    <div className="w-full p-4 md:p-10">
      <PriceRatePage />
    </div>
  );
};

export default Page;
