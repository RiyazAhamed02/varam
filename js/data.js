/* =========================================================
   Varam Crackers — Product Catalog
   Sourced from Fireworks_Items_List.xlsx (item name & unit price).
   Edit this list any time to match your current inventory/pricing.

   Images: real photos from Wikimedia Commons (freely licensed),
   picked per category since exact studio shots of this specific
   inventory don't exist as stock photos. To use your OWN product
   photos instead: drop image files into an "images" folder next to
   this one and change the "image" value below to "images/yourfile.jpg".
   Each product also keeps an "icon" emoji as an automatic fallback
   if an image link ever fails to load.
   ========================================================= */

const WIKI = (file) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=600`;

const PRODUCTS = [
  { id: "p01", name: "Sky Rocket - Standard", category: "Rockets", price: 150, unit: "piece", icon: "🚀", image: WIKI("4th of July Fireworks - Washington DC (7511077340).jpg"), desc: "Classic high-flying rocket with a bright colour burst finale." },
  { id: "p02", name: "Sky Rocket - Premium Multi-Color", category: "Rockets", price: 350, unit: "piece", icon: "🚀", image: WIKI("Fourth of July Fireworks (48124186521).jpg"), desc: "Premium rocket with a vivid multi-colour burst display." },
  { id: "p03", name: "Sparklers (Pack of 10)", category: "Sparklers", price: 60, unit: "pack of 10", icon: "✨", image: WIKI("Sparklers at Diwali 2010.jpg"), desc: "Long-lasting sparklers, safe for kids under adult supervision." },
  { id: "p04", name: "Fountain - Golden Rain", category: "Fountains", price: 120, unit: "piece", icon: "🎆", image: WIKI("Diwali fireworks 2.jpg"), desc: "Ground fountain showering golden sparks." },
  { id: "p05", name: "Fountain - Color Changing", category: "Fountains", price: 180, unit: "piece", icon: "🌈", image: WIKI("Fireworks on Diwali 2012.jpg"), desc: "Tall fountain with vivid colour-changing spark display." },
  { id: "p06", name: "Roman Candle - 10 Shot", category: "Roman Candles", price: 90, unit: "piece", icon: "🕯️", image: WIKI("Romancandle.png"), desc: "Handheld candle firing 10 bright colour shots." },
  { id: "p07", name: "Roman Candle - 15 Shot", category: "Roman Candles", price: 130, unit: "piece", icon: "🕯️", image: WIKI("Romancandle.png"), desc: "Extended 15-shot Roman candle with vivid bursts." },
  { id: "p08", name: "Firecracker String (100 count)", category: "Crackers", price: 70, unit: "string of 100", icon: "🧨", image: WIKI("Firecracker String.jpg"), desc: "Traditional bursting cracker string, a festive favourite." },
  { id: "p09", name: "Aerial Repeater - 25 Shot", category: "Aerial Shots", price: 450, unit: "box", icon: "🎉", image: WIKI("Celebration fireworks.jpg"), desc: "Repeating aerial shells with multi-colour peony bursts." },
  { id: "p10", name: "Aerial Repeater - 50 Shot", category: "Aerial Shots", price: 850, unit: "box", icon: "🎊", image: WIKI("Firework-Display-Loaded-Mortors.jpg"), desc: "Grand 50-shot repeating aerial display for big events." },
  { id: "p11", name: "Ground Spinner", category: "Chakras", price: 30, unit: "piece", icon: "🌀", image: WIKI("Rotating green fireworks in a wheel spinning Holland.jpg"), desc: "Spinning wheel of fire with crackling multi-colour sparks." },
  { id: "p12", name: "Smoke Bomb (Pack of 6)", category: "Novelty", price: 50, unit: "pack of 6", icon: "💨", image: WIKI("Smoke photography smoke 3.jpg"), desc: "Colourful smoke effect crackers, great for photos." },
  { id: "p13", name: "Firework Fountain Cake - Mega", category: "Cakes", price: 700, unit: "piece", icon: "🎂", image: WIKI("Firework fan cake 100 shots.jpg"), desc: "Multi-shot fountain cake with a spectacular finale." },
  { id: "p14", name: "Bottle Rocket (Pack of 12)", category: "Rockets", price: 55, unit: "pack of 12", icon: "🍾", image: WIKI("Bullet fireworks.jpg"), desc: "Compact bottle rockets, fun and easy to use." },
  { id: "p15", name: "Roman Candle Cake - Assorted", category: "Cakes", price: 400, unit: "piece", icon: "🎂", image: WIKI("Fourth of July Fireworks (3691448221).jpg"), desc: "Assorted Roman candle cake with mixed colour effects." },
];

const CATEGORIES = ["All", ...Array.from(new Set(PRODUCTS.map(p => p.category)))];
