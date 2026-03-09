import { ApiResponse, Product, TranslationRequest } from './src/app/services/api.service';

async function seedTranslations() {
  const productsResponse = await fetch('http://localhost:8080/api/products');
  const products: ApiResponse<Product[]> = await productsResponse.json();

  const translations = [
    { name: 'T-Shirt Round Neck Summer 2026', specs: '100% Cotton, Breathable' },
    { name: 'White Office Shirt', specs: 'Premium silk, formal' },
    { name: 'Straight Leg Jeans', specs: 'Blue denim, high waist' },
    { name: 'Slim Fit Khakis', specs: 'Beige, versatile' },
    { name: 'Active Sneakers', specs: 'Lightweight, sporty' },
    { name: 'Genuine Leather Shoes', specs: 'Handcrafted, elegant' },
    { name: 'Beach Flip Flops', specs: 'Waterproof, comfortable' },
    { name: 'Automatic Leather Belt', specs: 'Modern buckle' },
    { name: 'Embroidered Cap', specs: 'Adjustable strap' }
  ];

  for (let i = 0; i < Math.min(products.data.length, translations.length); i++) {
    const p = products.data[i];
    const t = translations[i];
    
    const req = {
      resourceId: p.id,
      resourceType: 'PRODUCT',
      languageCode: 'en',
      content: JSON.stringify({ name: t.name, specifications: t.specs })
    };

    await fetch('http://localhost:8080/api/translations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    console.log(`Seeded: ${t.name}`);
  }
}

seedTranslations();
