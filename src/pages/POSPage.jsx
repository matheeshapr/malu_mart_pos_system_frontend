import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const POSPage = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('userRole');
        navigate('/');
    };

    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]); 
    const [cart, setCart] = useState([]);
    const [manualBarcode, setManualBarcode] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [receiptData, setReceiptData] = useState(null);

    // CHECKOUT & PAYMENT MODAL STATES
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [cashGiven, setCashGiven] = useState('');

    // PICKUP MODAL STATES
    const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
    const [pickupSearch, setPickupSearch] = useState("");

    // --- Toast Alert States ---
    const [alertInfo, setAlertInfo] = useState({ show: false, message: '', type: 'success' });

    const showAlert = (message, type = 'success') => {
        setAlertInfo({ show: true, message, type });
        setTimeout(() => {
            setAlertInfo({ show: false, message: '', type: 'success' });
        }, 4000);
    };

    // --- Custom Confirm Modal State ---
    const [confirmModal, setConfirmModal] = useState({ show: false, message: '', onConfirm: null });

    // --- Custom Weight Prompt Modal State ---
    const [weightPrompt, setWeightPrompt] = useState({ show: false, product: null, weight: "1" });

    const barcodeBuffer = useRef("");
    const typingTimeout = useRef(null);

    // --- Real-time Live Polling Effect (Every 5 seconds) ---
    useEffect(() => {
        fetchData();
        
        const liveInterval = setInterval(() => {
            fetchData();
        }, 5000); 

        return () => clearInterval(liveInterval); 
    }, []);

    const fetchData = async () => {
        try {
            const [prodRes, salesRes] = await Promise.all([api.get('/products'), api.get('/sales')]);
            setProducts(prodRes.data);
            setSales(salesRes.data.sort((a,b) => b.id - a.id));
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT') return;
            if (e.key === 'Enter') {
                if (barcodeBuffer.current.length > 0) {
                    processScannedBarcode(barcodeBuffer.current);
                    barcodeBuffer.current = "";
                }
            } else if (e.key.length === 1) {
                barcodeBuffer.current += e.key;
                clearTimeout(typingTimeout.current);
                typingTimeout.current = setTimeout(() => { barcodeBuffer.current = ""; }, 50);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => { window.removeEventListener('keydown', handleKeyDown); clearTimeout(typingTimeout.current); };
    }, [products]);

    const processScannedBarcode = (scannedCode) => {
        if (scannedCode.length === 13 && scannedCode.startsWith("20")) {
            const pluCode = scannedCode.substring(2, 7);
            const weightInKg = Number(scannedCode.substring(7, 12)) / 1000;
            const matchedProduct = products.find(p => p.plu_code === pluCode);
            if (matchedProduct) {
                if (Number(matchedProduct.stock_quantity) <= 0) {
                    showAlert(`Product ${matchedProduct.name} is Out of Stock!`, "error");
                } else {
                    addToCart(matchedProduct, weightInKg);
                }
            } else showAlert(`Weighed product not found for PLU: ${pluCode}`, "error");
        } else {
            const matchedProduct = products.find(p => p.barcode === scannedCode);
            if (matchedProduct) {
                if (Number(matchedProduct.stock_quantity) <= 0) {
                    showAlert(`Product ${matchedProduct.name} is Out of Stock!`, "error");
                } else {
                    addToCart(matchedProduct);
                }
            } else showAlert("Product not found for barcode: " + scannedCode, "error");
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualBarcode.trim() === "") return;
        processScannedBarcode(manualBarcode.trim());
        setManualBarcode("");
    };

    const addToCart = (product, scannedWeight = null) => {
        if (Number(product.stock_quantity) <= 0) {
            showAlert(`${product.name} is Out of Stock!`, "error");
            return;
        }

        if (product.is_weighed && scannedWeight === null) {
            setWeightPrompt({ show: true, product: product, weight: "1" });
            return; 
        } 
        
        const qty = scannedWeight !== null ? scannedWeight : 1;
        finalizeAddToCart(product, qty);
    };

    const handleWeightConfirm = (e) => {
        e.preventDefault();
        const qty = Number(weightPrompt.weight);
        if (!qty || isNaN(qty) || qty <= 0) {
            showAlert("Please enter a valid weight!", "error");
            return;
        }
        finalizeAddToCart(weightPrompt.product, qty);
        setWeightPrompt({ show: false, product: null, weight: "1" });
    };

    const finalizeAddToCart = (product, qty) => {
        setCart((prevCart) => {
            const existing = prevCart.find((item) => item.product_id === product.id);
            if (existing) {
                return prevCart.map((item) =>
                    item.product_id === product.id
                        ? { ...item, quantity: product.is_weighed ? item.quantity + qty : item.quantity + 1, sub_total: (product.is_weighed ? item.quantity + qty : item.quantity + 1) * product.selling_price }
                        : item
                );
            } else return [...prevCart, { product_id: product.id, name: product.name, unit_price: product.selling_price, quantity: qty, sub_total: qty * product.selling_price }];
        });
        showAlert(`${product.name} added to bill`, "success");
    };

    const removeFromCart = (productId) => setCart(cart.filter(item => item.product_id !== productId));
    const netTotal = cart.reduce((sum, item) => sum + item.sub_total, 0);

    const handleConfirmCheckout = async () => {
        if (paymentMethod === 'Cash' && Number(cashGiven) < netTotal) {
            showAlert("Cash given cannot be less than the net total!", "error");
            return;
        }

        const saleData = { user_id: null, customer_id: null, sub_total: netTotal, discount: 0.00, net_total: netTotal, paid_amount: netTotal, payment_status: "Paid", items: cart };
        try {
            const response = await api.post('/sales', saleData);
            if (response.status === 201) {
                setReceiptData({ 
                    billNo: `POS-${String(response.data.sale_id).padStart(4, '0')}`, 
                    date: new Date().toLocaleString(), 
                    items: [...cart], 
                    total: netTotal, 
                    paymentMethod: paymentMethod,
                    cashGiven: paymentMethod === 'Cash' ? Number(cashGiven) : netTotal,
                    balance: paymentMethod === 'Cash' ? Number(cashGiven) - netTotal : 0,
                    isOnlinePickup: false 
                });
                setCart([]); 
                setSearchQuery(""); 
                setIsCheckoutModalOpen(false);
                setCashGiven('');
                fetchData();
                showAlert("Payment completed successfully!", "success");
                setTimeout(() => window.print(), 300);
            }
        } catch (error) { 
            showAlert("Error during checkout.", "error"); 
        }
    };

    const executePickupPayment = async (sale) => {
        try {
            await api.put(`/sales/${sale.id}`, { payment_status: 'Paid' });
            setReceiptData({
                billNo: `ONL-${String(sale.id).padStart(4, '0')}`,
                date: new Date().toLocaleString(),
                items: [], 
                total: Number(sale.net_total),
                paymentMethod: 'Cash (Online Pickup)',
                cashGiven: Number(sale.net_total),
                balance: 0,
                isOnlinePickup: true
            });
            setIsPickupModalOpen(false);
            fetchData(); 
            showAlert("Online order collected and printed!", "success");
            setTimeout(() => window.print(), 300);
        } catch (error) { 
            showAlert("Error updating payment.", "error"); 
        }
        setConfirmModal({ show: false, message: '', onConfirm: null });
    };

    const handlePickupPayment = (sale) => {
        setConfirmModal({
            show: true,
            message: `Receive Rs.${sale.net_total} for Order ONL-${String(sale.id).padStart(4, '0')}?`,
            onConfirm: () => executePickupPayment(sale)
        });
    };

    const filteredProducts = products.filter(product => product.name.toLowerCase().includes(searchQuery.toLowerCase()) || (product.barcode && product.barcode.includes(searchQuery)) || (product.plu_code && product.plu_code.includes(searchQuery)));
    
    const formatOrderCode = (sale) => {
        const prefix = sale.customer_id ? 'ONL' : 'POS';
        return `${prefix}-${String(sale.id).padStart(4, '0')}`;
    };

    const pendingOrders = sales.filter(s => s.payment_status === 'Pending' && formatOrderCode(s).toLowerCase().includes(pickupSearch.toLowerCase()));

    return (
        <>
            <div className="flex h-screen bg-gray-100 print:hidden relative">

                {alertInfo.show && (
                    <div className="fixed top-6 right-6 z-[9999] transition-all duration-300">
                        <div className={`shadow-2xl text-white font-bold flex items-center gap-3 px-6 py-4 rounded-2xl ${
                            alertInfo.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                        }`}>
                            <span>{alertInfo.type === 'success' ? '✅' : '❌'}</span>
                            <span>{alertInfo.message}</span>
                        </div>
                    </div>
                )}

                {weightPrompt.show && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-fade-in-up">
                            <h3 className="text-xl font-black text-gray-800">Enter Weight</h3>
                            <p className="text-sm text-gray-600 font-medium">
                                Weight for <span className="font-bold text-blue-600">{weightPrompt.product?.name}</span> (in Kg):
                            </p>
                            <form onSubmit={handleWeightConfirm} className="space-y-4">
                                <input 
                                    type="number" 
                                    step="0.001"
                                    placeholder="e.g. 1.5"
                                    value={weightPrompt.weight}
                                    onChange={(e) => setWeightPrompt({ ...weightPrompt, weight: e.target.value })}
                                    className="w-full border-2 border-gray-300 p-3 rounded-xl font-bold text-xl text-center focus:outline-none focus:border-blue-500 transition-colors"
                                    autoFocus
                                    onFocus={(e) => e.target.select()}
                                />
                                <div className="flex gap-3 pt-2">
                                    <button 
                                        type="button"
                                        onClick={() => setWeightPrompt({ show: false, product: null, weight: "1" })}
                                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-md"
                                    >
                                        Add to Bill
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {confirmModal.show && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9998] p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-fade-in-up">
                            <h3 className="text-lg font-black text-gray-800">Confirm Payment</h3>
                            <p className="text-sm text-gray-600 font-medium">{confirmModal.message}</p>
                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setConfirmModal({ show: false, message: '', onConfirm: null })}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2.5 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmModal.onConfirm}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-md"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="w-2/3 p-6 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-3xl font-bold text-gray-800">Products</h2>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setIsPickupModalOpen(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm relative">
                                📦 Online Pickups
                                {sales.filter(s => s.payment_status === 'Pending').length > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{sales.filter(s => s.payment_status === 'Pending').length}</span>
                                )}
                            </button>
                            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm">Logout</button>
                            <form onSubmit={handleManualSubmit} className="flex gap-2">
                                <input type="text" placeholder="Enter Barcode..." value={manualBarcode} onChange={(e) => setManualBarcode(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 w-48 shadow-sm" />
                                <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-sm">Add</button>
                            </form>
                        </div>
                    </div>

                    <div className="mb-6">
                        <input type="text" placeholder="Search products by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:border-blue-500" />
                    </div>

                    <div className="overflow-y-auto pr-2 flex-grow">
                        <div className="grid grid-cols-3 gap-4 pb-4">
                            {filteredProducts.map((product) => {
                                const isOutOfStock = Number(product.stock_quantity) <= 0;
                                const isLowStock = !isOutOfStock && Number(product.stock_quantity) <= Number(product.low_stock_alert);

                                return (
                                    <div 
                                        key={product.id} 
                                        onClick={() => !isOutOfStock && addToCart(product)} 
                                        className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                                            isOutOfStock 
                                                ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed' 
                                                : isLowStock 
                                                    ? 'bg-yellow-50/80 border-yellow-300 hover:shadow-md cursor-pointer hover:bg-yellow-100' 
                                                    : 'bg-white border-gray-200 hover:shadow-md cursor-pointer hover:bg-blue-50'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-lg text-gray-800 leading-tight">{product.name}</h3>
                                                {isOutOfStock ? (
                                                    <span className="text-xs bg-red-100 text-red-600 font-black px-2 py-0.5 rounded">Out of Stock</span>
                                                ) : isLowStock ? (
                                                    <span className="text-xs bg-yellow-200 text-yellow-800 font-bold px-2 py-0.5 rounded animate-pulse">⚠️ Low Stock</span>
                                                ) : null}
                                            </div>
                                            <p className="text-blue-600 font-extrabold text-lg mt-2">Rs. {product.selling_price}</p>
                                            <p className={`text-sm mt-1 font-medium ${isLowStock ? 'text-yellow-700 font-bold' : 'text-gray-500'}`}>
                                                Stock: {product.stock_quantity}
                                            </p>
                                        </div>
                                        {product.is_weighed && <span className="text-xs text-center text-blue-800 bg-blue-100 font-bold px-2 py-1.5 rounded mt-3 inline-block">⚖️ Weighed Item</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="w-1/3 bg-white p-6 shadow-2xl flex flex-col border-l border-gray-200 z-10">
                    <h2 className="text-2xl font-bold mb-4 border-b pb-4 text-gray-800">Current Bill</h2>
                    <div className="flex-grow overflow-y-auto pr-2">
                        {cart.length === 0 ? (
                            <p className="text-gray-400 text-lg font-medium text-center mt-10">Cart is empty</p>
                        ) : (
                            <div className="space-y-3">
                                {cart.map((item) => (
                                    <div key={item.product_id} className="flex justify-between items-center bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800 text-md">{item.name}</h4>
                                            <p className="text-sm text-gray-600 font-medium mt-1">{item.quantity} x Rs. {item.unit_price}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-extrabold text-gray-800 text-lg">Rs. {item.sub_total.toFixed(2)}</span>
                                            <button onClick={() => removeFromCart(item.product_id)} className="bg-red-100 text-red-600 hover:bg-red-500 hover:text-white rounded-full p-2 w-8 h-8 font-bold">&times;</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="border-t-2 border-gray-200 pt-6 mt-4">
                        <div className="flex justify-between font-black text-2xl mb-6 text-gray-800"><span>TOTAL:</span><span className="text-blue-600">Rs. {netTotal.toFixed(2)}</span></div>
                        <button onClick={() => { if (cart.length > 0) setIsCheckoutModalOpen(true); }} disabled={cart.length === 0} className={`w-full py-4 rounded-xl font-black text-xl shadow-lg ${cart.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}>PAY NOW</button>
                    </div>
                </div>
            </div>

            {/* CHECKOUT & PAYMENT MODAL */}
            {isCheckoutModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-xl font-black text-gray-800">Select Payment Method</h3>
                            <button onClick={() => setIsCheckoutModalOpen(false)} className="text-gray-500 font-bold text-2xl">&times;</button>
                        </div>

                        <div className="space-y-3">
                            <label className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'Cash' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
                                <input type="radio" name="posPayment" value="Cash" checked={paymentMethod === 'Cash'} onChange={() => setPaymentMethod('Cash')} className="w-5 h-5 text-blue-600" />
                                <span className="font-bold text-gray-800 text-lg">💵 Cash Payment</span>
                            </label>
                            <label className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'Card' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
                                <input type="radio" name="posPayment" value="Card" checked={paymentMethod === 'Card'} onChange={() => setPaymentMethod('Card')} className="w-5 h-5 text-blue-600" />
                                <span className="font-bold text-gray-800 text-lg">💳 Card Payment</span>
                            </label>
                        </div>

                        {paymentMethod === 'Cash' && (
                            <div className="space-y-2 bg-gray-50 p-4 rounded-xl border">
                                <label className="block text-xs font-bold uppercase text-gray-600">Cash Tendered (Given by Customer)</label>
                                <input 
                                    type="number" 
                                    placeholder="Enter cash amount..." 
                                    value={cashGiven} 
                                    onChange={(e) => setCashGiven(e.target.value)} 
                                    className="w-full border p-3 rounded-lg font-bold text-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                                {cashGiven !== '' && Number(cashGiven) >= netTotal && (
                                    <div className="flex justify-between font-black text-green-600 text-lg pt-2 border-t">
                                        <span>Balance Return:</span>
                                        <span>Rs. {(Number(cashGiven) - netTotal).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-gray-100 p-4 rounded-xl flex justify-between items-center font-black text-xl">
                            <span>Total Payable:</span>
                            <span className="text-blue-600">Rs. {netTotal.toFixed(2)}</span>
                        </div>

                        <button 
                            onClick={handleConfirmCheckout} 
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl shadow-lg text-lg transition-all"
                        >
                            Confirm & Print Bill
                        </button>
                    </div>
                </div>
            )}

            {/* PICKUP MODAL */}
            {isPickupModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                        <div className="bg-yellow-500 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-black text-white">📦 Online Pickups (Customer Orders)</h2>
                            <button onClick={() => setIsPickupModalOpen(false)} className="text-white font-bold text-2xl leading-none">&times;</button>
                        </div>
                        <div className="p-6">
                            <input 
                                type="text" placeholder="Scan or Type Order Code (e.g. ONL-0012)" 
                                value={pickupSearch} onChange={(e) => setPickupSearch(e.target.value)} 
                                className="w-full px-4 py-3 mb-6 border-2 border-yellow-300 rounded-xl focus:outline-none focus:border-yellow-500 text-lg font-bold text-center uppercase" autoFocus
                            />
                            
                            <div className="max-h-80 overflow-y-auto">
                                {pendingOrders.length === 0 ? (
                                    <p className="text-center text-gray-500 py-10 font-bold">No matching pending orders found.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {pendingOrders.map(sale => (
                                            <div key={sale.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-xl hover:bg-yellow-50 transition-colors">
                                                <div>
                                                    <h3 className="text-2xl font-black text-blue-600">{formatOrderCode(sale)}</h3>
                                                    <p className="text-sm font-bold text-gray-800 mt-1">
                                                        👤 {sale.customer_name || 'Guest'} | 📞 {sale.customer_phone || 'N/A'} {sale.nic && `| 🆔 NIC: ${sale.nic}`}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{new Date(sale.sale_date).toLocaleString()}</p>
                                                </div>
                                                <div className="text-right flex items-center gap-4">
                                                    <span className="text-2xl font-black text-gray-800">Rs.{Number(sale.net_total).toFixed(2)}</span>
                                                    <button onClick={() => handlePickupPayment(sale)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md">
                                                        Collect & Print
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* THERMAL RECEIPT */}
            {receiptData && (
                <div className="hidden print:block w-[80mm] bg-white text-black font-mono p-4 text-sm mx-auto">
                    <h2 className="text-center font-bold text-2xl mb-1">MALU MART</h2>
                    <p className="text-center text-xs mb-1">123, Main Street, Colombo</p>
                    
                    <div className="border-t border-b border-black border-dashed py-2 mb-3 mt-4">
                        <p className="text-xs">Bill No: {receiptData.billNo}</p>
                        <p className="text-xs">Date: {receiptData.date}</p>
                        <p className="text-xs">Payment: {receiptData.paymentMethod}</p>
                    </div>

                    {receiptData.isOnlinePickup ? (
                        <div className="py-4 text-center border-b border-black border-dashed">
                            <h3 className="font-bold text-md">ONLINE ORDER PICKUP</h3>
                        </div>
                    ) : (
                        <table className="w-full text-xs mb-4">
                            <thead>
                                <tr className="border-b border-black"><th className="text-left pb-1">Item</th><th className="text-right pb-1">Qty</th><th className="text-right pb-1">Amount</th></tr>
                            </thead>
                            <tbody>
                                {receiptData.items.map((item, index) => (
                                    <tr key={index}><td className="py-1">{item.name}</td><td className="text-right py-1">{item.quantity}</td><td className="text-right py-1">Rs.{item.sub_total.toFixed(2)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    <div className="border-t border-black border-dashed pt-2 mb-2 space-y-1">
                        <div className="flex justify-between font-bold text-base"><span>TOTAL</span><span>Rs. {receiptData.total.toFixed(2)}</span></div>
                        {receiptData.paymentMethod === 'Cash' && (
                            <>
                                <div className="flex justify-between text-xs"><span>Cash Given:</span><span>Rs. {receiptData.cashGiven.toFixed(2)}</span></div>
                                <div className="flex justify-between text-xs font-bold"><span>Balance:</span><span>Rs. {receiptData.balance.toFixed(2)}</span></div>
                            </>
                        )}
                    </div>
                    <p className="text-center text-xs font-bold mt-4">THANK YOU! COME AGAIN.</p>
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
        </>
    );
};

export default POSPage;