import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Staff Form States
  const [staffName, setStaffName] = useState("");
  const [staffPin, setStaffPin] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffRole, setStaffRole] = useState("cashier");

  const initialFormState = {
    category_id: '', name: '', is_weighed: false, plu_code: '', barcode: '',
    cost_price: '', selling_price: '', stock_quantity: '', low_stock_alert: ''
  };
  const [newProduct, setNewProduct] = useState(initialFormState);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // --- Modern Toast Alert States & Function ---
  const [alertInfo, setAlertInfo] = useState({ show: false, message: '', type: 'success' });

  const showAlert = (message, type = 'success') => {
    setAlertInfo({ show: true, message, type });
    setTimeout(() => {
      setAlertInfo({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // --- Custom Confirm Modal State ---
  const [confirmModal, setConfirmModal] = useState({ show: false, message: '', onConfirm: null });

  // --- Fetch & Live Update (Every 10 seconds) ---
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 10000); 
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [salesRes, productsRes, categoriesRes, customersRes, usersRes] = await Promise.all([
        api.get('/sales'),
        api.get('/products'),
        api.get('/categories'),
        api.get('/customers'),
        api.get('/users')
      ]);

      const salesData = salesRes.data.sort((a, b) => b.id - a.id);
      const productsData = productsRes.data.sort((a, b) => a.id - b.id);

      setProducts(productsData);
      setSales(salesData);
      setCategories(categoriesRes.data);
      setCustomers(customersRes.data);
      setUsers(usersRes.data);

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

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("MaluMart Sales Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 22);

    const tableColumn = ["Order ID", "Type", "Date & Time", "Total (Rs.)", "Status"];
    const tableRows = filteredSales.map(sale => [
        `${sale.customer_id ? 'ONL' : 'POS'}-${String(sale.id).padStart(4, '0')}`,
        sale.customer_id ? 'Online' : 'POS',
        new Date(sale.sale_date).toLocaleString(),
        Number(sale.net_total).toFixed(2),
        sale.payment_status
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
    });

    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 30;
    doc.text(`Total Revenue: Rs. ${filteredSales.reduce((sum, s) => sum + Number(s.net_total), 0).toFixed(2)}`, 14, finalY + 10);

    doc.save(`MaluMart_Sales_${startDate}_to_${endDate}.pdf`);
    showAlert("Sales report downloaded successfully!", "success");
  };

  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.sale_date).toISOString().split('T')[0];
    return saleDate >= startDate && saleDate <= endDate;
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewProduct({ ...newProduct, [name]: type === 'checkbox' ? checked : value });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.category_id) {
      showAlert("Please select a Category!", "error");
      return;
    }
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
      showAlert("Product added successfully!", "success");
      fetchDashboardData();
      setNewProduct(initialFormState);
    } catch (error) {
      showAlert("Failed to add product. Ensure PLU/Barcode is unique.", "error");
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await api.post('/categories', { name: newCategoryName });
      showAlert("Category added successfully!", "success");
      setNewCategoryName("");
      fetchDashboardData();
    } catch (error) {
      showAlert("Failed to add category. It may already exist.", "error");
    }
  };

  const executeDeleteCategory = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      showAlert("Category deleted successfully!", "success");
      fetchDashboardData();
    } catch (error) {
      showAlert("Cannot delete category. Products might be linked to it.", "error");
    }
    setConfirmModal({ show: false, message: '', onConfirm: null });
  };

  const handleDeleteCategory = (id) => {
    setConfirmModal({
      show: true,
      message: "Are you sure you want to delete this category?",
      onConfirm: () => executeDeleteCategory(id)
    });
  };

  const handleAddStaffUser = async (e) => {
    e.preventDefault();
    if (!staffName.trim() || !staffPin.trim()) return;
    try {
      await api.post('/users', { name: staffName, pin_code: staffPin, phone: staffPhone, role: staffRole });
      showAlert("Staff user created successfully!", "success");
      setStaffName("");
      setStaffPin("");
      setStaffPhone("");
      setStaffRole("cashier");
      fetchDashboardData();
    } catch (error) {
      showAlert(error.response?.data?.error || "Failed to create user.", "error");
    }
  };

  const executeDeleteStaffUser = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      showAlert("Staff user deleted successfully!", "success");
      fetchDashboardData();
    } catch (error) {
      showAlert("Failed to delete user.", "error");
    }
    setConfirmModal({ show: false, message: '', onConfirm: null });
  };

  const handleDeleteStaffUser = (id) => {
    setConfirmModal({
      show: true,
      message: "Are you sure you want to delete this staff user?",
      onConfirm: () => executeDeleteStaffUser(id)
    });
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
      showAlert("Product updated successfully!", "success");
      fetchDashboardData();
      setIsEditModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      showAlert("Failed to update product. Ensure PLU/Barcode is unique.", "error");
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingProduct(null);
  };

  const executeDeleteProduct = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      showAlert("Product deleted successfully!", "success");
      fetchDashboardData();
    } catch (error) {
      showAlert("Cannot delete this product. It might be linked to existing sales.", "error");
    }
    setConfirmModal({ show: false, message: '', onConfirm: null });
  };

  const handleDeleteClick = (id) => {
    setConfirmModal({
      show: true,
      message: "Are you sure you want to delete this product?",
      onConfirm: () => executeDeleteProduct(id)
    });
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

  // --- Calculations for Charts ---
  const categorySales = categories.map(cat => {
    const total = sales.reduce((sum, s) => {
        const matches = s.items?.some(i => {
            const prod = products.find(p => p.id === i.product_id);
            return prod && prod.category_id === cat.id;
        });
        return sum + (matches ? Number(s.net_total) / categories.length : 0);
    }, 0);
    return { name: cat.name, value: Number(total.toFixed(2)) };
  });

  const COLORS = ['#2563eb', '#16a34a', '#eab308', '#dc2626', '#9333ea', '#06b6d4'];

  return (
    <div className="min-h-screen bg-gray-50 flex relative">

      {/* --- Floating Modern Toast Alert --- */}
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

      {/* --- Custom Confirm Modal --- */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-fade-in-up">
            <h3 className="text-xl font-black text-gray-800">Confirm Action</h3>
            <p className="text-sm text-gray-600 font-medium">{confirmModal.message}</p>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setConfirmModal({ show: false, message: '', onConfirm: null })}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

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
          
          {/* Products Management with Low Stock Notification Badge */}
          <button
            onClick={() => setActiveTab('products')}
            className={`w-full text-left py-3 px-4 rounded-lg font-medium transition-all flex justify-between items-center ${activeTab === 'products' ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-700'}`}
          >
            <span>Products Management</span>
            {lowStockCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                {lowStockCount} Low
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`w-full text-left py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'categories' ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-700'}`}
          >
            Category Management
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full text-left py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'users' ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-700'}`}
          >
            Staff Management
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

        {/* TAB 1: OVERVIEW & LIVE CHARTS */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-black text-gray-800">System Overview</h1>
                <p className="text-xs text-gray-500 mt-1">Live analytics updating every 10 seconds</p>
              </div>
              <button onClick={() => { fetchDashboardData(); showAlert("Data refreshed successfully!", "success"); }} className="bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-50 shadow-sm flex items-center gap-2">
                🔄 Refresh Data
              </button>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

            {/* LIVE CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-black text-gray-800 mb-4">📈 Revenue Trends (Recent Sales)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sales.slice(0, 10).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="id" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="net_total" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-black text-gray-800 mb-4">📊 Sales by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie 
                      data={categorySales} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={100} 
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categorySales.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS & INVENTORY WITH LOW STOCK WARNINGS */}
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
                <h2 className="text-lg font-bold text-gray-800">Product Inventory & Stock Status</h2>
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
                      <th className="px-5 py-4">Name & Status</th>
                      <th className="px-5 py-4">Barcode / PLU</th>
                      <th className="px-5 py-4">Cost</th>
                      <th className="px-5 py-4">Selling</th>
                      <th className="px-5 py-4">Stock Qty</th>
                      <th className="px-5 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(product => {
                      const isOutOfStock = Number(product.stock_quantity) <= 0;
                      const isLowStock = !isOutOfStock && Number(product.stock_quantity) <= Number(product.low_stock_alert);

                      return (
                        <tr key={product.id} className={`border-b border-gray-50 transition-colors ${isOutOfStock ? 'bg-red-50/50' : isLowStock ? 'bg-yellow-50/60' : 'hover:bg-blue-50'}`}>
                          <td className="px-5 py-4 text-sm font-bold text-gray-800 flex items-center gap-3">
                            <span>{product.name}</span>
                            {isOutOfStock ? (
                              <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Out of Stock</span>
                            ) : isLowStock ? (
                              <span className="bg-yellow-100 text-yellow-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase animate-pulse">⚠️ Low Stock Warning</span>
                            ) : null}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500 font-mono">
                            {product.is_weighed ? `PLU:${product.plu_code}` : `BC:${product.barcode}`}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500">{product.cost_price}</td>
                          <td className="px-5 py-4 text-sm font-black text-blue-600">{product.selling_price}</td>
                          <td className="px-5 py-4 text-sm font-black">
                            <span className={`${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-green-600'}`}>
                              {product.stock_quantity}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-center whitespace-nowrap">
                            <button onClick={() => handleEditClick(product)} className="text-yellow-600 hover:text-yellow-800 font-bold mr-4 px-2 py-1 bg-yellow-100 rounded">Edit</button>
                            <button onClick={() => handleDeleteClick(product.id)} className="text-red-500 hover:text-red-700 font-bold px-2 py-1 bg-red-100 rounded">Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CATEGORIES MANAGEMENT */}
        {activeTab === 'categories' && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-black text-gray-800 mb-8">Category Management</h1>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 max-w-xl">
              <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Add New Category</h2>
              <form onSubmit={handleAddCategory} className="flex gap-4">
                <input
                  type="text"
                  placeholder="Category Name (e.g. Sea Food, Drinks)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required
                  className="flex-1 border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button type="submit" className="font-bold py-2.5 px-6 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-md">
                  + Add
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-2xl">
              <div className="p-5 border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-bold text-gray-800">Existing Categories</h2>
              </div>
              <table className="min-w-full leading-normal">
                <thead>
                  <tr className="bg-white text-gray-500 text-left text-xs uppercase font-black tracking-wider border-b-2 border-gray-100">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Category Name</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id} className="hover:bg-gray-50 border-b">
                      <td className="px-6 py-4 text-sm font-bold text-gray-800">#{cat.id}</td>
                      <td className="px-6 py-4 text-sm font-bold text-blue-600">{cat.name}</td>
                      <td className="px-6 py-4 text-sm text-right">
                        <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 hover:text-red-700 font-bold px-3 py-1 bg-red-100 rounded">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: STAFF MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-black text-gray-800 mb-8">Staff & Cashier Management</h1>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 max-w-xl">
              <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Add New Staff Member</h2>
              <form onSubmit={handleAddStaffUser} className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-xs font-bold uppercase mb-1">Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    required
                    className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-xs font-bold uppercase mb-1">Pin Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. 1234"
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value)}
                    required
                    className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-xs font-bold uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0771234567"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-xs font-bold uppercase mb-1">Role *</label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value)}
                    className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button type="submit" className="w-full font-bold py-2.5 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-md">
                  + Create Staff Account
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-4xl">
              <div className="p-5 border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-bold text-gray-800">Staff Accounts List</h2>
              </div>
              <table className="min-w-full leading-normal">
                <thead>
                  <tr className="bg-white text-gray-500 text-left text-xs uppercase font-black tracking-wider border-b-2 border-gray-100">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Pin Code</th>
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 border-b">
                      <td className="px-6 py-4 text-sm font-bold text-gray-800">#{u.id}</td>
                      <td className="px-6 py-4 text-sm font-bold text-blue-600">{u.name}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">{u.pin_code}</td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">{u.phone || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <button onClick={() => handleDeleteStaffUser(u.id)} className="text-red-500 hover:text-red-700 font-bold px-3 py-1 bg-red-100 rounded">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: SALES */}
        {activeTab === 'sales' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6 print:hidden">
              <h1 className="text-3xl font-black text-gray-800">Orders & Sales History</h1>
              <button
                onClick={generatePDF}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md ml-auto"
              >
                📥 Download PDF Report
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-end print:hidden">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border rounded-lg p-2.5 bg-gray-50 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border rounded-lg p-2.5 bg-gray-50 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="text-sm font-bold text-gray-500 ml-auto pb-2">
                Showing <span className="text-blue-600 font-black">{filteredSales.length}</span> records
              </div>
            </div>

            <div className="hidden print:block mb-6 text-center border-b pb-4">
              <h1 className="text-2xl font-black">MALUMART SALES REPORT</h1>
              <p className="text-gray-600 text-sm mt-1">Period: {startDate} to {endDate}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full leading-normal">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-left text-xs uppercase font-black tracking-wider border-b-2 border-gray-100">
                    <th className="px-6 py-4">Order / Bill ID</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Total Amount</th>
                    <th className="px-6 py-4 print:hidden">Status</th>
                    <th className="px-6 py-4 text-right print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-gray-400 font-semibold">
                        No sales records found for this date range.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map(sale => {
                      const isPending = sale.payment_status === 'Pending';
                      const isOnline = Boolean(sale.customer_id);

                      return (
                        <tr key={sale.id} className={`border-b transition-colors ${isPending ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'}`}>
                          <td className="px-6 py-4 text-sm font-black text-gray-800">
                            {sale.customer_id ? 'ONL' : 'POS'}-{String(sale.id).padStart(4, '0')}
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
                          <td className="px-6 py-4 text-sm print:hidden">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isPending ? 'bg-yellow-200 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                              {sale.payment_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-right print:hidden">
                            {isPending ? (
                              <span className="text-yellow-600 font-bold text-xs uppercase tracking-wider">Waiting for Cashier</span>
                            ) : (
                              <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Completed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredSales.length > 0 && (
                  <tfoot className="bg-gray-50 font-black">
                    <tr>
                      <td colSpan="3" className="px-6 py-4 text-right uppercase text-xs text-gray-500">Total Revenue:</td>
                      <td className="px-6 py-4 text-blue-600 text-base">
                        Rs. {filteredSales.reduce((sum, s) => sum + Number(s.net_total), 0).toFixed(2)}
                      </td>
                      <td colSpan="2" className="print:hidden"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: CUSTOMERS LIST */}
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-fade-in">
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

      <style>{`
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

export default AdminDashboard;