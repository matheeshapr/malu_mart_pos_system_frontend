import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import CustomerAuthModal from '../components/CustomerAuthModal';

const CustomerStore = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [customer, setCustomer] = useState(
    JSON.parse(localStorage.getItem('customer')) || null
  );

  // Cart States
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [lastOrder, setLastOrder] = useState(null);

  // --- Hero Banner Slides ---
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroSlides = [
    {
      title: "Fresh Catch of the Day on Display",
      subtitle: "Experience 100% organic, chemical-free sea and river fish handpicked directly from our fresh tables.",
      image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000&auto=format&fit=crop&q=80", 
      badge: "🔥 Today's Best Offer"
    },
    {
      title: "Friendly Service at Our Local Store",
      subtitle: "Visit our store or order online to get premium quality seafood cleaned and packed instantly.",
      image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=1000&auto=format&fit=crop&q=80", 
      badge: "⚡ Super Fast Delivery"
    },
    {
      title: "Fresh Seafood Market Collection",
      subtitle: "Support local quality standards while enjoying the highest standard of fresh seafood every single day.",
      image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1000&auto=format&fit=crop&q=80", 
      badge: "🌊 100% Fresh & Natural"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // --- Modern Toast Alert States & Function ---
  const [alertInfo, setAlertInfo] = useState({ show: false, message: '', type: 'success' });

  const showAlert = (message, type = 'success') => {
    setAlertInfo({ show: true, message, type });
    setTimeout(() => {
      setAlertInfo({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories')
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error("Error fetching store data:", error);
      showAlert("Failed to load products.", "error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer');
    setCustomer(null);
    showAlert("Logged out successfully!", "success");
  };

  // --- Cart Functions ---
  const addToCart = (product) => {
    if (Number(product.stock_quantity) <= 0) {
      showAlert("This item is currently out of stock!", "error");
      return;
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
    showAlert(`${product.name} added to cart!`, "success");
  };

  const updateQuantity = (id, delta) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean)
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + (Number(item.selling_price) * item.quantity), 0);

  // --- Checkout & Order ---
  const handleCheckout = async () => {
    if (!customer) {
      showAlert("Please login first to place an order!", "error");
      setIsAuthModalOpen(true);
      return;
    }

    if (cart.length === 0) {
      showAlert("Your cart is empty!", "error");
      return;
    }

    try {
      const saleData = {
        user_id: null,
        customer_id: customer.id,
        sub_total: cartTotal,
        discount: 0.00,
        net_total: cartTotal,
        paid_amount: 0.00, 
        payment_status: "Pending", 
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.selling_price,
          sub_total: Number(item.selling_price) * item.quantity
        }))
      };

      const response = await api.post('/sales', saleData);
      
      if (response.status === 201 || response.status === 200) {
        const orderDetails = {
          orderId: response.data.sale_id || Math.floor(Math.random() * 100000),
          date: new Date().toLocaleString(),
          customer: customer,
          items: [...cart],
          total: cartTotal,
          paymentMethod: paymentMethod
        };
        
        setLastOrder(orderDetails);
        setCart([]);
        setIsCheckoutOpen(false);
        showAlert("Order placed successfully!", "success");
        fetchStoreData();
      }
    } catch (err) {
      console.error(err);
      showAlert("Failed to place order. Please try again.", "error");
    }
  };

  const handlePrintBill = () => {
    window.print();
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category_id === Number(selectedCategory);
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/30 pb-20 relative">
      
      {alertInfo.show && (
        <div className="fixed top-6 right-6 z-50 transition-all animate-fade-in-up">
          <div className={`shadow-2xl text-white font-bold flex items-center gap-3 px-6 py-4 rounded-2xl ${
            alertInfo.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            <span>{alertInfo.type === 'success' ? '✅' : '❌'}</span>
            <span>{alertInfo.message}</span>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md shadow-xs px-8 py-4 flex justify-between items-center sticky top-0 z-40 border-b border-gray-100 transition-all">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/store')}>
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl px-3.5 py-2 rounded-2xl shadow-md shadow-blue-500/20">
            🐟 MM
          </div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            MaluMart Store
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative bg-gray-100/80 hover:bg-gray-200 px-5 py-2.5 rounded-2xl font-bold text-gray-700 flex items-center gap-2 transition-all active:scale-95 shadow-xs"
          >
            🛒 Cart
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2.5 py-0.5 rounded-full font-black animate-bounce shadow-md">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>

          {customer ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/profile')}
                className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
              >
                👤 My Profile
              </button>
              <button 
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-2xl text-sm font-bold shadow-xs transition-all active:scale-95"
              >
                Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95"
            >
              Login / Register
            </button>
          )}
        </div>
      </nav>

      {/* Hero Banner */}
      <header className="max-w-7xl mx-auto px-8 pt-8 pb-4">
        <div className="relative bg-gradient-to-r from-gray-900 via-blue-950 to-indigo-950 rounded-[2.5rem] p-8 md:p-14 text-white shadow-2xl overflow-hidden flex flex-col md:flex-row justify-between items-center min-h-[380px] border border-white/10">
          <div className="absolute -left-20 -top-20 w-72 h-72 bg-blue-600/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute right-10 bottom-0 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-xl space-y-5">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 backdrop-blur-md text-blue-300 text-xs font-black uppercase px-4 py-1.5 rounded-full tracking-wider shadow-inner">
              {heroSlides[currentSlide].badge}
            </div>
            
            <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">
              {heroSlides[currentSlide].title}
            </h2>
            
            <p className="text-gray-300 text-sm md:text-base font-medium leading-relaxed">
              {heroSlides[currentSlide].subtitle}
            </p>

            <div className="pt-2">
              <button 
                onClick={() => {
                  const element = document.getElementById('products-section');
                  if(element) element.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2"
              >
                Shop Now 🚀
              </button>
            </div>
          </div>

          <div className="mt-8 md:mt-0 relative z-10 w-full md:w-[420px] h-64 md:h-72 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 bg-gray-900 group">
            {heroSlides.map((slide, index) => (
              <img
                key={index}
                src={slide.image}
                alt="Seafood Market"
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${
                  index === currentSlide ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-105 rotate-1'
                }`}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>
          </div>

          <div className="absolute bottom-6 left-8 md:left-14 z-20 flex items-center gap-2.5">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  index === currentSlide ? 'w-10 bg-blue-500 shadow-md shadow-blue-500/50' : 'w-2.5 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Main Catalog */}
      <main id="products-section" className="max-w-7xl mx-auto px-8 space-y-8 pt-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all ${
                selectedCategory === 'All' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Products
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(String(cat.id))}
                className={`px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all ${
                  selectedCategory === String(cat.id) ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="w-full md:w-80">
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Product Grid (Out of stock text is clear, no blur) */}
        <div>
          <h3 className="text-2xl font-black text-gray-800 mb-6">Available Products</h3>
          
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center shadow-xs border border-gray-100">
              <p className="text-gray-400 font-bold text-lg">No products found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map(product => {
                const isOutOfStock = Number(product.stock_quantity) <= 0;

                return (
                  <div 
                    key={product.id} 
                    className={`group bg-white p-6 rounded-3xl shadow-xs border border-gray-100 flex flex-col justify-between transition-all duration-300 ${
                      isOutOfStock ? 'opacity-90 bg-gray-50/80' : 'hover:shadow-2xl hover:-translate-y-1.5'
                    }`}
                  >
                    <div>
                      {/* Image container without blur */}
                      <div className="w-full h-44 bg-blue-50/50 rounded-2xl overflow-hidden mb-4 border border-gray-100 relative">
                        <img 
                          src={product.image_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=60"} 
                          alt={product.name} 
                          className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale opacity-60' : 'group-hover:scale-110'} transition-transform duration-500`}
                        />
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="bg-red-600 text-white font-black text-xs uppercase px-4 py-2 rounded-full shadow-lg tracking-wider">
                              Out of Stock
                            </span>
                          </div>
                        )}
                      </div>

                      <h4 className="text-lg font-black text-gray-800 group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h4>
                      <p className="text-blue-600 font-black text-xl mt-2">
                        Rs. {Number(product.selling_price).toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                        <span>Stock: {product.stock_quantity}</span>
                        {isOutOfStock ? (
                          <span className="text-red-600 bg-red-50 px-2.5 py-0.5 rounded-md uppercase font-black">Sold Out</span>
                        ) : (
                          <span className="text-green-600 bg-green-50 px-2.5 py-0.5 rounded-md uppercase font-black">In Stock</span>
                        )}
                      </div>
                      <button 
                        onClick={() => addToCart(product)}
                        disabled={isOutOfStock}
                        className={`w-full font-bold py-3.5 rounded-2xl transition-all text-sm shadow-md ${
                          isOutOfStock 
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                            : 'bg-gray-900 hover:bg-blue-600 text-white active:scale-95'
                        }`}
                      >
                        {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end backdrop-blur-xs transition-opacity">
          <div className="bg-white w-full max-w-md h-full p-6 flex flex-col shadow-2xl animate-slide-in-right">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-800">Your Shopping Cart</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-black text-2xl font-bold">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 mt-20 font-medium">Your cart is empty</p>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div>
                      <h4 className="font-bold text-gray-800">{item.name}</h4>
                      <p className="text-sm text-blue-600 font-bold">Rs. {Number(item.selling_price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateQuantity(item.id, -1)} className="bg-white border px-3 py-1 rounded-xl font-bold hover:bg-gray-100 shadow-xs">-</button>
                      <span className="font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="bg-white border px-3 py-1 rounded-xl font-bold hover:bg-gray-100 shadow-xs">+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <div className="flex justify-between items-center text-lg font-black">
                  <span>Total:</span>
                  <span className="text-blue-600">Rs. {cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/30 transition-all active:scale-95"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="text-xl font-black text-gray-800">Checkout & Payment</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-gray-400 text-2xl font-bold">&times;</button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Select Payment Method</label>
              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'Cash' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200'}`}>
                  <input type="radio" name="payment" value="Cash" checked={paymentMethod === 'Cash'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-gray-800">Cash on Delivery (COD)</span>
                </label>
                <label className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'Card' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200'}`}>
                  <input type="radio" name="payment" value="Card" checked={paymentMethod === 'Card'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-gray-800">Credit / Debit Card</span>
                </label>
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-2xl space-y-2 border border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Items Total:</span>
                <span className="font-bold">Rs. {cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black border-t border-gray-200 pt-2">
                <span>Final Payable:</span>
                <span className="text-blue-600">Rs. {cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button 
              onClick={handleCheckout}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-green-600/30 transition-all active:scale-95"
            >
              Confirm Order & Get Bill
            </button>
          </div>
        </div>
      )}

      {/* Bill Modal */}
      {lastOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl space-y-6 print:shadow-none print:w-full print:m-0 animate-fade-in-up">
            <div className="text-center border-b pb-4 border-gray-100">
              <h2 className="text-2xl font-black text-blue-600">MaluMart Store</h2>
              <p className="text-xs text-gray-400">Fresh Fish & Quality Products</p>
              <p className="text-xs font-bold text-gray-700 mt-2">Order Receipt / Invoice</p>
            </div>

            <div className="text-xs space-y-1.5 text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p><b>Order ID:</b> ONL-{String(lastOrder.orderId).padStart(4, '0')}</p>
              <p><b>Date:</b> {lastOrder.date}</p>
              <p><b>Customer:</b> {lastOrder.customer.name} ({lastOrder.customer.phone})</p>
              <p><b>Delivery Address:</b> {lastOrder.customer.address || 'Not Provided'}</p>
              <p><b>Payment Method:</b> {lastOrder.paymentMethod}</p>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {lastOrder.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="py-2.5 font-bold text-gray-800">{item.name}</td>
                    <td className="py-2.5 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-2.5 text-right text-gray-600">Rs. {Number(item.selling_price).toFixed(2)}</td>
                    <td className="py-2.5 text-right font-black text-gray-800">Rs. {(Number(item.selling_price) * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center text-base font-black border-t border-gray-200 pt-3">
              <span>Total Amount:</span>
              <span className="text-blue-600 text-xl">Rs. {lastOrder.total.toFixed(2)}</span>
            </div>

            <div className="flex gap-4 print:hidden pt-2">
              <button 
                onClick={handlePrintBill}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all active:scale-95"
              >
                🖨️ Print / Save Bill
              </button>
              <button 
                onClick={() => setLastOrder(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-2xl transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <CustomerAuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onLoginSuccess={(data) => {
          setCustomer(data);
          showAlert("Login successful!", "success");
        }} 
      />

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default CustomerStore;