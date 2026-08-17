import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import CustomerAuthModal from '../components/CustomerAuthModal';

const CustomerStore = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
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

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer');
    setCustomer(null);
  };

  // --- Cart Functions ---
  const addToCart = (product) => {
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
      alert("Please login first to place an order!");
      setIsAuthModalOpen(true);
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty!");
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
      }
    } catch (err) {
      console.error(err);
      alert("Failed to place order. Please try again.");
    }
  };

  // --- Print Bill ---
  const handlePrintBill = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12 animate-fade-in">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-8 py-4 flex justify-between items-center sticky top-0 z-40 transition-all">
        <h1 className="text-2xl font-black text-blue-600 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/store')}>
          MaluMart Store
        </h1>
        
        <div className="flex items-center gap-4">
          {/* Cart Button with Bounce effect on update */}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl font-bold text-gray-700 flex items-center gap-2 transition-transform active:scale-95 shadow-sm"
          >
            🛒 Cart
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-black animate-bounce">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>

          {customer ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/profile')}
                className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
              >
                👤 My Profile
              </button>
              <button 
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95"
              >
                Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95"
            >
              Login / Register
            </button>
          )}
        </div>
      </nav>

      {/* Main Content: Products */}
      <main className="max-w-7xl mx-auto p-8">
        <h2 className="text-2xl font-black text-gray-800 mb-6">Available Products</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <div 
              key={product.id} 
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between transform hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300"
            >
              <div>
                <h3 className="text-lg font-black text-gray-800">{product.name}</h3>
                <p className="text-blue-600 font-black text-lg mt-2">Rs. {Number(product.selling_price).toFixed(2)}</p>
              </div>
              
              <div className="mt-4 pt-4 border-t flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                  <span>Stock: {product.stock_quantity}</span>
                  <span className="text-green-600 uppercase">Available</span>
                </div>
                <button 
                  onClick={() => addToCart(product)}
                  className="w-full bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 font-bold py-2.5 rounded-xl transition-all text-sm shadow-sm active:scale-95"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- Cart Sidebar / Drawer with Slide Animation --- */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="bg-white w-full max-w-md h-full p-6 flex flex-col shadow-2xl animate-slide-in-right">
            <div className="flex justify-between items-center pb-4 border-b">
              <h2 className="text-xl font-black text-gray-800">Your Shopping Cart</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-500 hover:text-black text-2xl font-bold">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 mt-20 font-medium">Your cart is empty</p>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl shadow-xs">
                    <div>
                      <h4 className="font-bold text-gray-800">{item.name}</h4>
                      <p className="text-sm text-blue-600 font-bold">Rs. {Number(item.selling_price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateQuantity(item.id, -1)} className="bg-gray-200 hover:bg-gray-300 px-2.5 py-1 rounded-lg font-bold transition-all">-</button>
                      <span className="font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="bg-gray-200 hover:bg-gray-300 px-2.5 py-1 rounded-lg font-bold transition-all">+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between items-center text-lg font-black">
                  <span>Total:</span>
                  <span className="text-blue-600">Rs. {cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Checkout Modal with Fade-in-up Animation --- */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-fade-in-up">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-xl font-black text-gray-800">Checkout & Payment</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-gray-500 text-xl font-bold">&times;</button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Select Payment Method</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="radio" name="payment" value="Cash" checked={paymentMethod === 'Cash'} onChange={(e) => setPaymentMethod(e.target.value)} />
                  <span className="font-bold text-gray-700">Cash on Delivery (COD)</span>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="radio" name="payment" value="Card" checked={paymentMethod === 'Card'} onChange={(e) => setPaymentMethod(e.target.value)} />
                  <span className="font-bold text-gray-700">Credit / Debit Card</span>
                </label>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items Total:</span>
                <span className="font-bold">Rs. {cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black border-t pt-2">
                <span>Final Payable:</span>
                <span className="text-blue-600">Rs. {cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button 
              onClick={handleCheckout}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95"
            >
              Confirm Order & Get Bill
            </button>
          </div>
        </div>
      )}

      {/* --- Bill / Invoice Printable Modal --- */}
      {lastOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl space-y-6 print:shadow-none print:w-full print:m-0 animate-fade-in-up">
            
            {/* Bill Header */}
            <div className="text-center border-b pb-4">
              <h2 className="text-2xl font-black text-blue-600">MaluMart Store</h2>
              <p className="text-xs text-gray-500">Fresh Fish & Quality Products</p>
              <p className="text-xs font-bold text-gray-700 mt-2">Order Receipt / Invoice</p>
            </div>

            {/* Bill Meta */}
            <div className="text-xs space-y-1 text-gray-600">
              <p><b>Order ID:</b> ONL-{String(lastOrder.orderId).padStart(4, '0')}</p>
              <p><b>Date:</b> {lastOrder.date}</p>
              <p><b>Customer:</b> {lastOrder.customer.name} ({lastOrder.customer.phone})</p>
              <p><b>Delivery Address:</b> {lastOrder.customer.address || 'Not Provided'}</p>
              <p><b>Payment Method:</b> {lastOrder.paymentMethod}</p>
            </div>

            {/* Bill Items Table */}
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {lastOrder.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 font-medium">{item.name}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">Rs. {Number(item.selling_price).toFixed(2)}</td>
                    <td className="py-2 text-right font-bold">Rs. {(Number(item.selling_price) * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Bill Total */}
            <div className="flex justify-between items-center text-base font-black border-t pt-3">
              <span>Total Amount:</span>
              <span className="text-blue-600">Rs. {lastOrder.total.toFixed(2)}</span>
            </div>

            {/* Actions (Hidden when printing) */}
            <div className="flex gap-4 print:hidden">
              <button 
                onClick={handlePrintBill}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95"
              >
                🖨️ Print / Save Bill
              </button>
              <button 
                onClick={() => setLastOrder(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl transition-all active:scale-95"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Auth Modal */}
      <CustomerAuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onLoginSuccess={(data) => setCustomer(data)} 
      />

      {/* Custom Inline CSS for extra smooth slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default CustomerStore;