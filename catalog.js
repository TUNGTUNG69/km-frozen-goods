// Product catalog data (same products and image paths as before).
// In the next step this moves into Firestore so the admin can manage it.

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
function initials(name){ return (name || '?').trim().slice(0,2).toUpperCase(); }
function formatPrice(price){
  return Number(price).toLocaleString('en-PH', { maximumFractionDigits: 2 });
}
function normalizeProductName(value){
  return value.toLowerCase().replace(/\.[^.]+$/, '').replace(/[\s_-]/g, '');
}

function seedProducts(){
  const groups = [
    ['PORK & MEAT PRODUCTS', [
      ['Chicharon Bulaklak', 165, '1 kg'],
      ['Chicken Skin', 165, '1 kg'],
      ['Pork Ribs', 325, '1 kg'],
      ['Pork Liempo', 345, '1 kg'],
      ['Pork Pata Slice (Front)', 260, '1 kg'],
      ['Burger King Patty (Unmolded)', 220, '1 kg'],
      ['General Chicken Steak', 360, '1 kg']
    ]],
    ['SAUSAGES & HOTDOGS', [
      ['4 Cheese Hungarian', 180, '5 pcs'],
      ['New Yorkers Cheesedog', 360, '16 pcs'],
      ['New Yorkers Hotdog', 350, '16 pcs'],
      ['Japanese Sausage', 280, '1 kg'],
      ['Skinless Longganisa', 60, 'Per pack', 'img/skinless%20longganisa.jpeg'],
      ['Lucban Longganisa', 135, '1 dozen'],
      ['Calumpit Longganisa - Garlic Flavor', 165, '500 g', 'img/calumpit%20longganisa.jpeg'],
      ['Calumpit Longganisa - Sweet Flavor', 165, '500 g', 'img/calumpit%20longganisa.jpeg']
    ]],
    ['SNACKS & READY-TO-COOK', [
      ['Star Nuggets', 60, '250 g'],
      ['Vida Bacon', 120, '250 g'],
      ['Vida Sweet Ham', 80, ''],
      ['Cordon Bleu', 110, '', 'img/chicken%20cordon%20bleu.jpeg'],
      ['Giant Embotido (Each)', 40, ''],
      ['Giant Embotido (1 kg)', 190, '']
    ]],
    ['SEAFOOD', [
      ['Squid Rings', 270, '1 kg'],
      ['Tempura Express', 265, '500 g'],
      ['Cream Dory Fish Fillet', 165, '1 kg'],
      ['Salmon Belly', 165, '500 g'],
      ['Lobster Ball', 130, '250 g', 'img/lobster%20balls.jpeg']
    ]],
    ['SIOMAI & DUMPLINGS', [
      ['Sharksfin Dumplings', 120, '30 pcs'],
      ['Wonton Dumplings', 120, '30 pcs', 'img/wontoun%20dumplings.jpeg'],
      ['Big Pork Siomai', 110, '10 pcs', 'img/big%20pork%20siomai%2010%20pcs%20per%20pack.jpeg'],
      ['Hakaw Dumplings', 300, '500 g'],
      ['David’s Siomai (Pork)', 250, ''],
      ['David’s Pork Gyoza', 250, ''],
      ['Lobster Siomai', 100, '']
    ]],
    ['FROZEN VEGETABLES', [
      ['Broccoli', 195, '1 kg', 'img/broccoli%201kilo.jpeg'],
      ['Mixed Veggies', 150, '1 kg'],
      ['California Mix Veggies', 195, '1 kg']
    ]],
    ['KFC PRODUCTS', [
      ['KFC Funshots', 105, '250 g'],
      ['KFC Chicken Nuggets', 120, '']
    ]],
    ['PUREFOODS PRODUCTS', [
      ['TJ Hotdog Classic (Jumbo & Regular)', 225, '1 kg'],
      ['Purefoods Pork Tocino', 80, '220 g'],
      ['Purefoods Beef Tapa', 90, '220 g']
    ]],
    ['MJB PRODUCTS', [
      ['Grande Bacon', 320, '1 kg'],
      ['Meaty Franks', 235, '1 kg'],
      ['MJB Pork Tocino', 295, '1 kg'],
      ['MJB Beef Tapa', 315, '1 kg'],
      ['MJB Pork Sisig', 100, '250 g'],
      ['Hungarian Sausage', 290, '1 kg'],
      ['Cheese', 295, '']
    ]],
    ['JOLLIBEE PRODUCTS', [
      ['Jollibee Hotdog', 235, '1 kg'],
      ['Jollibee Longganisa', 140, '500 g'],
      ['Jollibee Shanghai', 170, '25 pcs'],
      ['Jollibee Spaghetti Sauce', 185, '1 kg'],
      ['Jollibee Burger Patty', 230, '1 kg']
    ]],
    ['MCDO PRODUCTS', [
      ['McDo Chicken Nuggets', 125, '250 g'],
      ['McDo Chicken Fillet', 335, '10 pcs']
    ]],
    ['FRIES, HASH BROWN & FLAVORING', [
      ['Potato Hash Brown', 165, '660 g'],
      ['Hungritos French Fries', 140, '1 kg'],
      ['Flavoring Powder - Cheese Flavor', 50, ''],
      ['Flavoring Powder - BBQ Flavor', 60, ''],
      ['Flavoring Powder - Sour & Cream', 50, '']
    ]],
    ['STREET FOOD', [
      ['Orlian Kikiam', 70, ''],
      ['Fish Balls', 75, ''],
      ['Chicken Balls', 70, ''],
      ['Squid Balls', 70, '']
    ]],
    ['TOKYO TOKYO PRODUCTS', [
      ['Tokyo Tokyo Pork Tonkatsu', 315, '1 kg'],
      ['Tokyo Tokyo Beef Misono', 395, '1 kg'],
      ['Tokyo Tokyo Beef Yakiniki', 280, '600–700 g', 'img/ttk%20beef%20yakiniku.jpeg'],
      ['Tokyo Tokyo Wagyu Cubes', 320, '36 cubes'],
      ['Tokyo Tokyo Chicken Karaage', 290, '1 kg']
    ]],
    ['PORK SAMGYUPSAL', [
      ['Pork Samgyupsal - Bulgogi', 135, 'Per tub · Approx. 400–450 g'],
      ['Pork Samgyupsal - BBQ', 135, 'Per tub · Approx. 400–450 g'],
      ['Pork Samgyupsal - Spicy', 135, 'Per tub · Approx. 400–450 g'],
      ['Pork Samgyupsal - Plain', 135, 'Per tub · Approx. 400–450 g'],
      ['Pork Samgyupsal - Salt & Pepper', 135, 'Per tub · Approx. 400–450 g'],
      ['Pork Samgyupsal - Pork Teriyaki', 135, 'Per tub · Approx. 400–450 g']
    ]],
    ['BEEF SAMGYUPSAL', [
      ['Beef Samgyupsal - Bulgogi', 230, 'Per tub · Approx. 400–450 g', 'img/beef%20samg.jpeg'],
      ['Beef Samgyupsal - Plain', 230, 'Per tub · Approx. 400–450 g', 'img/beef%20samg.jpeg'],
      ['Beef Samgyupsal - Teriyaki', 230, 'Per tub · Approx. 400–450 g', 'img/beef%20samg.jpeg'],
      ['Beef Samgyupsal - Sweet & Spicy', 230, 'Per tub · Approx. 400–450 g', 'img/beef%20samg.jpeg'],
      ['Beef Samgyupsal - BBQ', 230, 'Per tub · Approx. 400–450 g', 'img/beef%20samg.jpeg']
    ]],
    ['KOREAN PRODUCTS', [
      ['Melted Vee CD Cheese', 90, ''],
      ['Tteokbokki', 155, '500 g'],
      ['Tteokbokki Sauce', 130, '', 'img/tteokbokki%20sauce.jpeg'],
      ['Fishcake', 140, '500 g', 'img/fish%20cake%201kilo.jpeg'],
      ['Crabstick', 90, ''],
      ['Fish Tofu', 90, ''],
      ['Shabu-Shabu Mix', 90, ''],
      ['Satay Soup Base', 95, '', 'img/satay%20soup%20base.jpeg'],
      ['Kimchi', 145, '500 g'],
      ['Gochujang', 95, '']
    ]],
    ['RAMEN', [
      ['Shin Ramyun', 70, ''],
      ['Jin Ramen', 55, ''],
      ['Stir-Fry Cheese Ramen', 70, ''],
      ['Cheese Ramen', 70, ''],
      ['Seaweeds', 25, '']
    ]]
  ];

  const imageFiles = [
    ['Chicharon Bulaklak', 'img/chicharon bulaklak.jpeg'],
    ['Chicken Skin', 'img/chicken skin.jpeg'],
    ['Japanese Sausage', 'img/Japanese sausage.jpeg'],
    ['Skinless Longganisa', 'img/skinless longganisa.jpeg'],
    ['Lucban Longganisa', 'img/lucban longganisa.jpeg'],
    ['Calumpit Longganisa', 'img/calumpit longganisa.jpeg'],
    ['Giant Embotido', 'img/giant embotido.jpeg'],
    ['Squid Rings', 'img/squid rings.jpeg'],
    ['Tempura Express', 'img/tempura express.jpeg'],
    ['Sharksfin Dumplings', 'img/sharksfin dumplings.jpeg'],
    ['Mixed Veggies', 'img/mixed veggies.jpeg'],
    ['KFC Funshots', 'img/kfc funshots.jpeg'],
    ['Purefoods Pork Tocino', 'img/purefoods pork tocino.jpeg'],
    ['Purefoods Beef Tapa', 'img/purefoods beef tapa.jpeg'],
    ['MJB Pork Tocino', 'img/mjb pork tocino.jpeg'],
    ['MJB Beef Tapa', 'img/mjb beef tapa.jpeg'],
    ['Tteokbokki Sauce', 'img/tteokbokki sauce.jpeg'],
    ['Crabstick', 'img/crabstick.jpeg'],
    ['Fish Tofu', 'img/fish tofu.jpeg'],
    ['Satay Soup Base', 'img/satay soup base.jpeg'],
    ['Kimchi', 'img/kimchi.jpeg'],
    ['Gochujang', 'img/gochujang.jpeg'],
    ['Salmon Belly', 'img/salmon belly.jpeg'],
    ['Hungarian Sausage', 'img/hungarian sausage.jpeg']
  ];
  const normalize = value => value.toLowerCase().replace(/[\s_-]/g, '');
  const fileByName = new Map(imageFiles.map(([name, path]) => [normalize(name), path]));
  const products = groups.flatMap(([category, items]) => items.map(([name, price, description]) => ({
    name,
    category,
    price,
    description
  })));

  const catalog = products.filter(product => fileByName.has(normalize(product.name)));
  catalog.push({
    name: 'Calumpit Longganisa',
    category: 'SAUSAGES & HOTDOGS',
    price: 165,
    description: '500 g · Garlic or Sweet Flavor'
  }, {
    name: 'Giant Embotido',
    category: 'SNACKS & READY-TO-COOK',
    price: 40,
    priceLabel: '₱40 each / ₱190 (1 kg)',
    description: ''
  });

  const categoryOrder = new Map(groups.map(([category], index) => [category, index]));
  catalog.sort((left, right) => categoryOrder.get(left.category) - categoryOrder.get(right.category));

  let id = 1;
  return catalog.map(product => ({
    ...product,
    id: id++,
    image: fileByName.get(normalize(product.name)),
    quantity: 0,
    status: 'out_of_stock'
  }));
}

const CATALOG = seedProducts().filter(product =>
  product.image
  && normalizeProductName(decodeURIComponent(product.image.split('/').pop())) === normalizeProductName(product.name)
);
