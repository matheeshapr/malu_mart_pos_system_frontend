import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);

  const [newProduct, setNewProduct] = useState({
    category_id: 1,
    name: '',
    is_weighed: false,
    plu_code: '',
    barcode: '',
    cost_price: '',
    selling_price: '',
    stock_quantity: '',
    low_stock_alert: ''
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [salesRes, productsRes] = await Promise.all([
        api.get('/sales'),
        api.get('/products')
      ]);

      const salesData = salesRes.data;
      const productsData = productsRes.data;

      setProducts(productsData);
      setSales(salesData);

      const today = new Date().setHours(0, 0, 0, 0);
      
      const todaysSales = salesData.filter(sale => {
        const saleDate = new Date(sale.sale_date).setHours(0, 0, 0, 0);
        return saleDate === today;
      });
      
      const revenue = todaysSales.reduce((sum, sale) => sum + Number(sale.net_total), 0);
      
      setTodayRevenue(revenue);
      setTodayOrders(todaysSales.length);

      const lowStock = productsData.filter(p => Number(p.stock_quantity) <= Number(p.low_stock_alert));
      setLowStockCount(lowStock.length);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewProduct({
      ...newProduct,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        ...newProduct,
        plu_code: newProduct.plu_code === '' ? null : newProduct.plu_code,
        barcode: newProduct.barcode === '' ? null : newProduct.barcode,
        cost_price: Number(newProduct.cost_price),
        selling_price: Number(newProduct.selling_price),
        stock_quantity: Number(newProduct.stock_quantity),
        low_stock_alert: Number(newProduct.low_stock_alert)
      };

      const response = await api.post('/products', productData);
      if (response.status === 201) {
        window.alert("Product added successfully!");
        fetchDashboardData(); 
        setNewProduct({
          category_id: 1, name: '', is_weighed: false, plu_code: '', barcode: '',
          cost_price: '', selling_price: '', stock_quantity: '', low_stock_alert: ''
        });
      }
    } catch (error) {
      console.error("Error adding product:", error);
      window.alert("Failed to add product. Ensure PLU/Barcode is unique.");
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      
      {/* Sidebar Navigation */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-6 text-2xl font-bold border-b border-gray-700">
          MaluMart Admin
        </div>
        <nav className="flex-grow p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left py-2.5 px-4 rounded transition duration-200 ${activeTab === 'dashboard' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`w-full text-left py-2.5 px-4 rounded transition duration-200 ${activeTab === 'products' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          >
            Products Management
          </button>
          <button 
            onClick={() => setActiveTab('sales')}
            className={`w-full text-left py-2.5 px-4 rounded transition duration-200 ${activeTab === 'sales' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          >
            Sales & Reports
          </button>
        </nav>
        
        <div className="p-4 border-t border-gray-700 space-y-2">
          <Link to="/" className="block text-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded text-sm">
            Go to POS Screen
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800">Overview</h1>
              <button onClick={fetchDashboardData} className="bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded hover:bg-gray-50 shadow-sm">
                Refresh Data
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
                <h3 className="text-gray-500 text-lg font-semibold">Today's Sales</h3>
                <p className="text-3xl font-bold text-gray-800 mt-2">Rs. {todayRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-green-500">
                <h3 className="text-gray-500 text-lg font-semibold">Today's Orders</h3>
                <p className="text-3xl font-bold text-gray-800 mt-2">{todayOrders}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-red-500">
                <h3 className="text-gray-500 text-lg font-semibold">Low Stock Items</h3>
                <p className="text-3xl font-bold text-gray-800 mt-2">{lowStockCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS MANAGEMENT */}
        {activeTab === 'products' && (
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Product Management</h1>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Add New Product</h2>
              <form onSubmit={handleAddProduct} className="grid grid-cols-4 gap-4">
                
                <div className="col-span-2">
                  <label className="block text-gray-700 text-sm font-bold mb-1">Product Name *</label>
                  <input type="text" name="name" value={newProduct.name} onChange={handleInputChange} required className="w-full border rounded p-2" />
                </div>
                
                <div className="flex items-center mt-6">
                  <input type="checkbox" name="is_weighed" checked={newProduct.is_weighed} onChange={handleInputChange} className="w-5 h-5 text-blue-600" />
                  <span className="ml-2 text-gray-700 font-bold">Is Weighed Item?</span>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Category ID</label>
                  <input type="number" name="category_id" value={newProduct.category_id} onChange={handleInputChange} className="w-full border rounded p-2" />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">PLU Code (Scales)</label>
                  <input type="text" name="plu_code" value={newProduct.plu_code} onChange={handleInputChange} disabled={!newProduct.is_weighed} className="w-full border rounded p-2 disabled:bg-gray-100" />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Standard Barcode</label>
                  <input type="text" name="barcode" value={newProduct.barcode} onChange={handleInputChange} disabled={newProduct.is_weighed} className="w-full border rounded p-2 disabled:bg-gray-100" />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Cost Price (Rs.) *</label>
                  <input type="number" step="0.01" name="cost_price" value={newProduct.cost_price} onChange={handleInputChange} required className="w-full border rounded p-2" />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Selling Price (Rs.) *</label>
                  <input type="number" step="0.01" name="selling_price" value={newProduct.selling_price} onChange={handleInputChange} required className="w-full border rounded p-2" />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Initial Stock *</label>
                  <input type="number" step="0.001" name="stock_quantity" value={newProduct.stock_quantity} onChange={handleInputChange} required className="w-full border rounded p-2" />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Low Stock Alert At *</label>
                  <input type="number" step="0.001" name="low_stock_alert" value={newProduct.low_stock_alert} onChange={handleInputChange} required className="w-full border rounded p-2" />
                </div>

                <div className="col-span-4 mt-2">
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded">
                    Save Product
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full leading-normal">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 text-left text-sm uppercase font-bold tracking-wider">
                    <th className="px-5 py-3 border-b-2">Name</th>
                    <th className="px-5 py-3 border-b-2">Type</th>
                    <th className="px-5 py-3 border-b-2">Price</th>
                    <th className="px-5 py-3 border-b-2">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50 border-b">
                      <td className="px-5 py-4 text-sm font-semibold">{product.name}</td>
                      <td className="px-5 py-4 text-sm">
                        {product.is_weighed ? <span className="text-blue-600 font-bold">Weighed (PLU: {product.plu_code})</span> : <span className="text-green-600">Fixed (Barcode: {product.barcode})</span>}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold">Rs. {product.selling_price}</td>
                      <td className={`px-5 py-4 text-sm font-bold ${Number(product.stock_quantity) <= Number(product.low_stock_alert) ? 'text-red-600' : 'text-gray-800'}`}>
                        {product.stock_quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
          </div>
        )}

        {/* TAB 3: SALES & REPORTS */}
        {activeTab === 'sales' && (
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Sales History</h1>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full leading-normal">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 text-left text-sm uppercase font-bold tracking-wider">
                    <th className="px-5 py-3 border-b-2">Bill No</th>
                    <th className="px-5 py-3 border-b-2">Date & Time</th>
                    <th className="px-5 py-3 border-b-2">Status</th>
                    <th className="px-5 py-3 border-b-2">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-5 py-4 text-center text-gray-500 font-semibold">
                        No sales recorded yet.
                      </td>
                    </tr>
                  ) : (
                    sales.map(sale => (
                      <tr key={sale.id} className="hover:bg-gray-50 border-b transition-colors">
                        <td className="px-5 py-4 text-sm font-bold text-gray-800">#{sale.id}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">
                          {new Date(sale.sale_date).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-sm">
                          <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
                            {sale.payment_status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-blue-600">
                          Rs. {Number(sale.net_total).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;