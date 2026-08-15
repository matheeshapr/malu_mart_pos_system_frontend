import { useState, useEffect } from 'react';
import api from '../services/api';

const POSPage = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/products');
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    
    fetchProducts();
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      
      {/* Left Side: Products Grid */}
      <div className="w-2/3 p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Products</h2>
        
        <div className="grid grid-cols-3 gap-4">
          {products.map((product) => (
            <div 
              key={product.id} 
              className="bg-white p-4 rounded-lg shadow cursor-pointer hover:bg-blue-50 border border-gray-200 transition-colors"
            >
              <h3 className="font-semibold text-lg text-gray-800 mb-1">
                {product.name}
              </h3>
              <p className="text-blue-600 font-bold">
                Rs. {product.selling_price}
              </p>
              {product.is_weighed && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                  Weighed Item
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Side: Cart & Billing */}
      <div className="w-1/3 bg-white p-6 shadow-lg flex flex-col border-l border-gray-200">
        <h2 className="text-2xl font-bold mb-4 border-b pb-4 text-gray-800">Current Bill</h2>
        
        {/* Cart Items Area */}
        <div className="flex-grow overflow-y-auto">
          <p className="text-gray-400 text-center mt-10">Cart is empty</p>
        </div>
        
        {/* Payment Section */}
        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between font-bold text-xl mb-6 text-gray-800">
            <span>Total:</span>
            <span>Rs. 0.00</span>
          </div>
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors">
            Pay Now
          </button>
        </div>
        
      </div>
      
    </div>
  );
};

export default POSPage;