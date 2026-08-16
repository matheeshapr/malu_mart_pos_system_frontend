import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    navigate('/');
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]); // NEW: Customers State

  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const initialFormState = {
    category_id: '', name: '', is_weighed: false, plu_code: '', barcode: '',
    cost_price: '', selling_price: '', stock_quantity: '', low_stock_alert: ''
  };
  const [newProduct, setNewProduct] = useState(initialFormState);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [salesRes, productsRes, categoriesRes, customersRes] = await Promise.all([
        api.get('/sales'),
        api.get('/products'),
        api.get('/categories'),
        api.get('/customers') // Fetching registered customers
      ]);

      const salesData = salesRes.data.sort((a, b) => b.id - a.id);
      const productsData = productsRes.data.sort((a, b) => a.id - b.id);

      setProducts(productsData);
      setSales(salesData);
      setCategories(categoriesRes.data);
      setCustomers(customersRes.data);

      const today = new Date().setHours(0, 0, 0, 0);
      const todaysSales = salesData.filter(sale => {
        const saleDate = new Date(sale.sale_date).setHours(0, 0, 0, 0);
        return saleDate === today;
      });

      const revenue = todaysSales
        .filter(sale => sale.payment_status === 'Paid')
        .reduce((sum, sale) => sum + Number(sale.net_total), 0);

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
    setNewProduct({ ...newProduct, [name]: type === 'checkbox' ? checked : value });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.category_id) return window.alert("Please select a Category!");
    try {
      const productData = {
        ...newProduct,
        category_id: Number(newProduct.category_id),
        plu_code: newProduct.plu_code === '' ? null : newProduct.plu_code,
        barcode: newProduct.barcode === '' ? null : newProduct.barcode,
        cost_price: Number(newProduct.cost_price),
        selling_price: Number(newProduct.selling_price),
        stock_quantity: Number(newProduct.stock_quantity),
        low_stock_alert: Number(newProduct.low_stock_alert)
      };
      await api.post('/products', productData);
      window.alert("Product added successfully!");
      fetchDashboardData();
      setNewProduct(initialFormState);
    } catch (error) {
      window.alert("Failed to add product. Ensure PLU/Barcode is unique.");
    }
  };

  const handleEditClick = (product) => {
    setEditingProduct({
      id: product.id,
      category_id: product.category_id || '',
      name: product.name,
      is_weighed: product.is_weighed,
      plu_code: product.plu_code || '',
      barcode: product.barcode || '',
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      stock_quantity: product.stock_quantity,
      low_stock_alert: product.low_stock_alert
    });
    setIsEditModalOpen(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingProduct({ ...editingProduct, [name]: type === 'checkbox' ? checked : value });
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        ...editingProduct,
        category_id: Number(editingProduct.category_id),
        plu_code: editingProduct.plu_code === '' ? null : editingProduct.plu_code,
        barcode: editingProduct.barcode === '' ? null : editingProduct.barcode,
        cost_price: Number(editingProduct.cost_price),
        selling_price: Number(editingProduct.selling_price),
        stock_quantity: Number(editingProduct.stock_quantity),
        low_stock_alert: Number(editingProduct.low_stock_alert)
      };
      await api.put(`/products/${editingProduct.id}`, productData);
      window.alert("Product updated successfully!");
      fetchDashboardData();
      setIsEditModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      window.alert("Failed to update product. Ensure PLU/Barcode is unique.");
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await api.delete(`/products/${id}`);
        window.alert("Product deleted successfully!");
        fetchDashboardData();
      } catch (error) {
        window.alert("Cannot delete this product. It might be linked to existing sales.");
      }
    }
  };

  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      (product.barcode && product.barcode.includes(query)) ||
      (product.plu_code && product.plu_code.includes(query))
    );
  });

  const pendingOrdersCount = sales.filter(s => s.payment_status === 'Pending').length;

  return (
    <div className="flex h-screen bg-gray-100 relative">

      {/* Sidebar Navigation */}
      <div className="w-64 bg-gray-800 text-white flex flex-col shadow-xl z-10">
        <div className="p-6 text-2xl font-black tracking-wide border-b border-gray-700 bg-gray-900">
          MaluMart Admin
        </div>
        <nav className="flex-grow p-4 space-y-2 mt-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-700'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`w-full text-left py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'products' ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-700'}`}
          >
            Products Management
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`w-full text-left py-3 px-4 rounded-lg font-medium transition-all flex justify-between items-center ${activeTab === 'sales' ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-700'}`}
          >
            <span>Orders & Sales</span>
            {pendingOrdersCount > 0 && (
              <span className="bg-yellow-500 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                {pendingOrdersCount} New
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`w-full text-left py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'customers' ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-700'}`}
          >
            Customers List
          </button>
        </nav>

        <div className="p-4 border-t border-gray-700 space-y-3 bg-gray-900">
          <Link to="/pos" className="block text-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg text-sm transition-colors shadow-sm">
            Go to POS Screen
          </Link>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg text-sm transition-colors shadow-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-black text-gray-800">System Overview</h1>
              <button onClick={fetchDashboardData} className="bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-50 shadow-sm flex items-center gap-2">
                🔄 Refresh Data
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Today's Paid Revenue</h3>
                <p className="text-3xl font-black text-gray-800 mt-2">Rs. {todayRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
                <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Total Orders Today</h3>
                <p className="text-3xl font-black text-gray-800 mt-2">{todayOrders}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-yellow-500 relative">
                <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Online Orders Pending</h3>
                <p className="text-3xl font-black text-yellow-600 mt-2">{pendingOrdersCount}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
                <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Low Stock Items</h3>
                <p className="text-3xl font-black text-red-600 mt-2">{lowStockCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS */}
        {activeTab === 'products' && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-black text-gray-800 mb-8">Product Management</h1>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
              <h2 className="text-lg font-bold text-gray-800 mb-6 border-b pb-2">Add New Product</h2>
              <form onSubmit={handleAddProduct} className="grid grid-cols-4 gap-5">
                <div className="col-span-2">
                  <label className="block text-gray-700 text-sm font-bold mb-1">Product Name *</label>
                  <input type="text" name="name" value={newProduct.name} onChange={handleInputChange} required className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>

                <div className="flex items-center mt-6">
                  <input type="checkbox" name="is_weighed" checked={newProduct.is_weighed} onChange={handleInputChange} className="w-5 h-5 text-blue-600 rounded" />
                  <span className="ml-2 text-gray-700 font-bold">Is Weighed Item?</span>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Category *</label>
                  <select name="category_id" value={newProduct.category_id} onChange={handleInputChange} required className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="" disabled>Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">PLU Code (Scales)</label>
                  <input type="text" name="plu_code" value={newProduct.plu_code} onChange={handleInputChange} disabled={!newProduct.is_weighed} className="w-full border rounded-lg p-2.5 disabled:bg-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Standard Barcode</label>
                  <input type="text" name="barcode" value={newProduct.barcode} onChange={handleInputChange} disabled={newProduct.is_weighed} className="w-full border rounded-lg p-2.5 disabled:bg-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Cost Price (Rs.) *</label>
                  <input type="number" step="0.01" name="cost_price" value={newProduct.cost_price} onChange={handleInputChange} required className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Selling Price (Rs.) *</label>
                  <input type="number" step="0.01" name="selling_price" value={newProduct.selling_price} onChange={handleInputChange} required className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Stock Qty *</label>
                  <input type="number" step="0.001" name="stock_quantity" value={newProduct.stock_quantity} onChange={handleInputChange} required className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Alert At *</label>
                  <input type="number" step="0.001" name="low_stock_alert" value={newProduct.low_stock_alert} onChange={handleInputChange} required className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div className="col-span-4 mt-4 flex justify-end border-t pt-4">
                  <button type="submit" className="font-bold py-2.5 px-8 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-transform active:scale-95">
                    + Save Product
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">Product Inventory</h2>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-1/3 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full leading-normal">
                  <thead>
                    <tr className="bg-white text-gray-500 text-left text-xs uppercase font-black tracking-wider border-b-2 border-gray-100">
                      <th className="px-5 py-4">Name</th>
                      <th className="px-5 py-4">Barcode / PLU</th>
                      <th className="px-5 py-4">Cost</th>
                      <th className="px-5 py-4">Selling</th>
                      <th className="px-5 py-4">Stock</th>
                      <th className="px-5 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(product => (
                      <tr key={product.id} className="hover:bg-blue-50 border-b border-gray-50 transition-colors">
                        <td className="px-5 py-4 text-sm font-bold text-gray-800">{product.name}</td>
                        <td className="px-5 py-4 text-sm text-gray-500 font-mono">
                          {product.is_weighed ? `PLU:${product.plu_code}` : `BC:${product.barcode}`}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">{product.cost_price}</td>
                        <td className="px-5 py-4 text-sm font-black text-blue-600">{product.selling_price}</td>
                        <td className={`px-5 py-4 text-sm font-black ${Number(product.stock_quantity) <= Number(product.low_stock_alert) ? 'text-red-500' : 'text-green-500'}`}>
                          {product.stock_quantity}
                        </td>
                        <td className="px-5 py-4 text-sm text-center whitespace-nowrap">
                          <button onClick={() => handleEditClick(product)} className="text-yellow-600 hover:text-yellow-800 font-bold mr-4 px-2 py-1 bg-yellow-100 rounded">Edit</button>
                          <button onClick={() => handleDeleteClick(product.id)} className="text-red-500 hover:text-red-700 font-bold px-2 py-1 bg-red-100 rounded">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SALES */}
        {activeTab === 'sales' && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-black text-gray-800 mb-8">Orders & Sales History</h1>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full leading-normal">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-left text-xs uppercase font-black tracking-wider border-b-2 border-gray-100">
                    <th className="px-6 py-4">Order / Bill ID</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Total Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(sale => {
                    const isPending = sale.payment_status === 'Pending';
                    const isOnline = Number(sale.paid_amount) === 0;
                    
                    return (
                      <tr key={sale.id} className={`border-b transition-colors ${isPending ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4 text-sm font-black text-gray-800">
                          ORD-{String(sale.id).padStart(4, '0')}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold">
                          {isOnline ? (
                            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs">🌐 Online</span>
                          ) : (
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs">🏪 POS</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-medium">{new Date(sale.sale_date).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm font-black text-gray-800">Rs. {Number(sale.net_total).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${isPending ? 'bg-yellow-200 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                            {sale.payment_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          {isPending ? (
                            <span className="text-yellow-600 font-bold text-xs uppercase tracking-wider">Waiting for Cashier</span>
                          ) : (
                            <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Completed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CUSTOMERS LIST */}
        {activeTab === 'customers' && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-black text-gray-800 mb-8">Registered Customers</h1>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full leading-normal">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-left text-xs uppercase font-black tracking-wider border-b-2 border-gray-100">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Phone Number</th>
                    <th className="px-6 py-4">NIC</th>
                    <th className="px-6 py-4">Address</th>
                    <th className="px-6 py-4">Registered Date</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-gray-400 font-semibold">
                        No registered customers yet.
                      </td>
                    </tr>
                  ) : (
                    customers.map(cust => (
                      <tr key={cust.id} className="hover:bg-gray-50 border-b transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-gray-800">#{cust.id}</td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-600">{cust.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">{cust.phone}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">{cust.nic}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{cust.address || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(cust.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* EDIT PRODUCT MODAL */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in-up">
            <div className="bg-yellow-500 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-black text-white">✏️ Edit Product: {editingProduct.name}</h2>
              <button onClick={closeEditModal} className="text-white hover:text-gray-200 font-bold text-3xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdateProduct} className="grid grid-cols-4 gap-5">
                <div className="col-span-2">
                  <label className="block text-gray-700 text-sm font-bold mb-1">Product Name *</label>
                  <input type="text" name="name" value={editingProduct.name} onChange={handleEditInputChange} required className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>
                <div className="flex items-center mt-6">
                  <input type="checkbox" name="is_weighed" checked={editingProduct.is_weighed} onChange={handleEditInputChange} className="w-5 h-5 text-yellow-600 rounded" />
                  <span className="ml-2 text-gray-700 font-bold">Is Weighed Item?</span>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Category *</label>
                  <select name="category_id" value={editingProduct.category_id} onChange={handleEditInputChange} required className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-yellow-500 outline-none">
                    <option value="" disabled>Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">PLU Code (Scales)</label>
                  <input type="text" name="plu_code" value={editingProduct.plu_code} onChange={handleEditInputChange} disabled={!editingProduct.is_weighed} className="w-full border rounded-lg p-2.5 disabled:bg-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Standard Barcode</label>
                  <input type="text" name="barcode" value={editingProduct.barcode} onChange={handleEditInputChange} disabled={editingProduct.is_weighed} className="w-full border rounded-lg p-2.5 disabled:bg-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Cost Price (Rs.) *</label>
                  <input type="number" step="0.01" name="cost_price" value={editingProduct.cost_price} onChange={handleEditInputChange} required className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Selling Price (Rs.) *</label>
                  <input type="number" step="0.01" name="selling_price" value={editingProduct.selling_price} onChange={handleEditInputChange} required className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Stock Qty *</label>
                  <input type="number" step="0.001" name="stock_quantity" value={editingProduct.stock_quantity} onChange={handleEditInputChange} required className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-1">Alert At *</label>
                  <input type="number" step="0.001" name="low_stock_alert" value={editingProduct.low_stock_alert} onChange={handleEditInputChange} required className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-yellow-500 outline-none" />
                </div>
                <div className="col-span-4 mt-4 flex justify-end gap-3 border-t pt-4">
                  <button type="button" onClick={closeEditModal} className="px-6 py-2.5 font-bold text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300">
                    Cancel
                  </button>
                  <button type="submit" className="px-8 py-2.5 font-bold text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 shadow-md">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-in-out; }
        .animate-fade-in-up { animation: fadeInUp 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AdminDashboard;