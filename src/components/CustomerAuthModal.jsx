import { useState, useEffect } from 'react';
import api from '../services/api';

const CustomerAuthModal = ({ isOpen, onClose, onLoginSuccess }) => {
    const [isLoginMode, setIsLoginMode] = useState(true); 
    
    // Form States
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [nic, setNic] = useState('');
    const [address, setAddress] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Modal එක ඕපන් වෙද්දී හෝ මෝඩ් එක මාරු වෙද්දී ෆෝම් එක ක්ලියර් කිරීම
    useEffect(() => {
        setError('');
        setName('');
        setPhone('');
        setNic('');
        setAddress('');
        setPassword('');
    }, [isOpen, isLoginMode]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            if (isLoginMode) {
                // --- LOGIN API CALL ---
                const response = await api.post('/customers/login', { phone, password });
                if (response.status === 200) {
                    localStorage.setItem('customer', JSON.stringify(response.data.customer));
                    onLoginSuccess(response.data.customer);
                    onClose();
                }
            } else {
                // --- REGISTER API CALL ---
                const response = await api.post('/customers/register', { name, phone, nic, address, password });
                if (response.status === 201) {
                    window.alert("Registration successful! Please login.");
                    setIsLoginMode(true); // සාර්ථක වූ පසු Login මෝඩ් එකට හැරවීම
                }
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "An error occurred. Please try again.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all">
                
                {/* Header */}
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
                    <h2 className="text-xl font-black">
                        {isLoginMode ? 'Customer Login' : 'Create an Account'}
                    </h2>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="text-white hover:text-gray-200 text-2xl font-bold"
                    >
                        &times;
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLoginMode && (
                            <>
                                <div>
                                    <label className="block text-gray-700 text-xs font-bold uppercase mb-1">Full Name *</label>
                                    <input 
                                        type="text" 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)} 
                                        required 
                                        className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                                        placeholder="Kamal Perera" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-xs font-bold uppercase mb-1">NIC Number *</label>
                                    <input 
                                        type="text" 
                                        value={nic} 
                                        onChange={(e) => setNic(e.target.value)} 
                                        required 
                                        className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                                        placeholder="200012345678 or V format" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-xs font-bold uppercase mb-1">Delivery Address *</label>
                                    <textarea 
                                        value={address} 
                                        onChange={(e) => setAddress(e.target.value)} 
                                        required 
                                        className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                                        placeholder="123, Main Street, Colombo" 
                                        rows="2"
                                    ></textarea>
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-gray-700 text-xs font-bold uppercase mb-1">Phone Number *</label>
                            <input 
                                type="tel" 
                                value={phone} 
                                onChange={(e) => setPhone(e.target.value)} 
                                required 
                                className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                                placeholder="0771234567" 
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 text-xs font-bold uppercase mb-1">Password *</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                                placeholder="••••••••" 
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-transform active:scale-95"
                        >
                            {isLoginMode ? 'Login' : 'Register'}
                        </button>
                    </form>

                    {/* Switcher */}
                    <div className="mt-6 text-center text-sm text-gray-600">
                        {isLoginMode ? (
                            <p>
                                Don't have an account?{' '}
                                <button 
                                    type="button" 
                                    onClick={() => setIsLoginMode(false)} 
                                    className="text-blue-600 font-bold hover:underline"
                                >
                                    Register here
                                </button>
                            </p>
                        ) : (
                            <p>
                                Already have an account?{' '}
                                <button 
                                    type="button" 
                                    onClick={() => setIsLoginMode(true)} 
                                    className="text-blue-600 font-bold hover:underline"
                                >
                                    Login here
                                </button>
                            </p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CustomerAuthModal;