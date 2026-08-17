import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CustomerProfile = () => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(
    JSON.parse(localStorage.getItem('customer')) || null
  );
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) {
      navigate('/store');
      return;
    }
    fetchCustomerOrders();
  }, [customer]);

  const fetchCustomerOrders = async () => {
    try {
      const response = await api.get(`/customers/${customer.id}/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching customer orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer');
    navigate('/store');
  };

  if (!customer) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-black text-blue-600 cursor-pointer" onClick={() => navigate('/store')}>
          MaluMart Store
        </h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/store')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold transition-all"
          >
            ← Back to Store
          </button>
          <button 
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-8 space-y-8">
        
        {/* Customer Details Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-800 mb-4">👤 My Profile Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 p-4 rounded-xl">
              <span className="text-gray-500 block font-bold text-xs uppercase">Full Name</span>
              <span className="font-black text-gray-800 text-base">{customer.name}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <span className="text-gray-500 block font-bold text-xs uppercase">Phone Number</span>
              <span className="font-black text-gray-800 text-base">{customer.phone}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <span className="text-gray-500 block font-bold text-xs uppercase">NIC Number</span>
              <span className="font-black text-gray-800 text-base">{customer.nic || 'N/A'}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <span className="text-gray-500 block font-bold text-xs uppercase">Delivery Address</span>
              <span className="font-black text-gray-800 text-base">{customer.address || 'Colombo'}</span>
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-800 mb-4">📦 My Order History</h2>
          
          {loading ? (
            <p className="text-gray-400 text-center py-6 font-medium">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-gray-400 text-center py-6 font-medium">You haven't placed any orders yet.</p>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div>
                    <h3 className="font-black text-blue-600 text-lg">ONL-{String(order.id).padStart(4, '0')}</h3>
                    <p className="text-xs text-gray-500 mt-1">{new Date(order.sale_date).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-800 text-base">Rs. {Number(order.net_total).toFixed(2)}</p>
                    <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold mt-1 ${order.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {order.payment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default CustomerProfile;