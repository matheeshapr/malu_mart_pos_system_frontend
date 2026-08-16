import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const LoginPage = () => {
  const [name, setName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/login', {
        name,
        pin_code: pinCode
      });

      if (response.status === 200) {
        const { role } = response.data.user;
        
        localStorage.setItem('userRole', role);
        
        if (role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/pos');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Invalid Name or PIN Code. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="bg-white p-8 rounded-xl shadow-lg w-96">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">MaluMart POS</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1">User Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Admin or Cashier"
              required 
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1">PIN Code</label>
            <input 
              type="password" 
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              placeholder="Enter PIN"
              required 
              maxLength="10"
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;