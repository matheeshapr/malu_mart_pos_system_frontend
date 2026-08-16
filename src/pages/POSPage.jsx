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

    // PICKUP MODAL STATES
    const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
    const [pickupSearch, setPickupSearch] = useState("");

    const barcodeBuffer = useRef("");
    const typingTimeout = useRef(null);

    useEffect(() => {
        fetchData();
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
            if (matchedProduct) addToCart(matchedProduct, weightInKg);
            else window.alert(`Weighed product not found for PLU: ${pluCode}`);
        } else {
            const matchedProduct = products.find(p => p.barcode === scannedCode);
            if (matchedProduct) addToCart(matchedProduct);
            else window.alert("Product not found for barcode: " + scannedCode);
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualBarcode.trim() === "") return;
        processScannedBarcode(manualBarcode.trim());
        setManualBarcode("");
    };

    const addToCart = (product, scannedWeight = null) => {
        let qty = 1;
        if (product.is_weighed && scannedWeight === null) {
            const input = window.prompt(`Enter weight for ${product.name} (in Kg):`, "1");
            if (!input || isNaN(input) || Number(input) <= 0) return;
            qty = Number(input);
        } else if (scannedWeight !== null) qty = scannedWeight;

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
    };

    const removeFromCart = (productId) => setCart(cart.filter(item => item.product_id !== productId));
    const netTotal = cart.reduce((sum, item) => sum + item.sub_total, 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        const saleData = { user_id: null, customer_id: null, sub_total: netTotal, discount: 0.00, net_total: netTotal, paid_amount: netTotal, payment_status: "Paid", items: cart };
        try {
            const response = await api.post('/sales', saleData);
            if (response.status === 201) {
                setReceiptData({ billNo: `ORD-${String(response.data.sale_id).padStart(4, '0')}`, date: new Date().toLocaleString(), items: [...cart], total: netTotal, isOnlinePickup: false });
                setCart([]); setSearchQuery(""); fetchData();
                setTimeout(() => window.print(), 300);
            }
        } catch (error) { window.alert("Error during checkout."); }
    };

    const handlePickupPayment = async (sale) => {
        if(window.confirm(`Receive Rs.${sale.net_total} for Order ORD-${String(sale.id).padStart(4, '0')}?`)){
            try {
                await api.put(`/sales/${sale.id}`, { payment_status: 'Paid' });
                setReceiptData({
                    billNo: `ORD-${String(sale.id).padStart(4, '0')}`,
                    date: new Date().toLocaleString(),
                    items: [], 
                    total: Number(sale.net_total),
                    isOnlinePickup: true
                });
                setIsPickupModalOpen(false);
                fetchData(); 
                setTimeout(() => window.print(), 300);
            } catch (error) { window.alert("Error updating payment."); }
        }
    };

    const filteredProducts = products.filter(product => product.name.toLowerCase().includes(searchQuery.toLowerCase()) || (product.barcode && product.barcode.includes(searchQuery)) || (product.plu_code && product.plu_code.includes(searchQuery)));
    
    const formatOrderCode = (id) => `ORD-${String(id).padStart(4, '0')}`;
    const pendingOrders = sales.filter(s => s.payment_status === 'Pending' && formatOrderCode(s.id).toLowerCase().includes(pickupSearch.toLowerCase()));

    return (
        <>
            <div className="flex h-screen bg-gray-100 print:hidden">
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
                            {filteredProducts.map((product) => (
                                <div key={product.id} onClick={() => addToCart(product)} className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer hover:bg-blue-50 border border-gray-200 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800 mb-1 leading-tight">{product.name}</h3>
                                        <p className="text-blue-600 font-extrabold text-lg mt-2">Rs. {product.selling_price}</p>
                                        <p className="text-sm text-gray-500 mt-1 font-medium">Stock: {product.stock_quantity}</p>
                                    </div>
                                    {product.is_weighed && <span className="text-xs text-center text-blue-800 bg-blue-100 font-bold px-2 py-1.5 rounded mt-3 inline-block">⚖️ Weighed Item</span>}
                                </div>
                            ))}
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
                        <button onClick={handleCheckout} disabled={cart.length === 0} className={`w-full py-4 rounded-xl font-black text-xl shadow-lg ${cart.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}>PAY NOW</button>
                    </div>
                </div>
            </div>

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
                                type="text" placeholder="Scan or Type Order Code (e.g. ORD-0012)" 
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
                                                    <h3 className="text-2xl font-black text-blue-600">{formatOrderCode(sale.id)}</h3>
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
                    </div>

                    {receiptData.isOnlinePickup ? (
                        <div className="py-6 text-center border-b border-black border-dashed">
                            <h3 className="font-bold text-lg">ONLINE ORDER PICKUP</h3>
                            <p className="text-xs mt-2">Items Packed Separately</p>
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

                    <div className="border-t border-black border-dashed pt-2 mb-6">
                        <div className="flex justify-between font-bold text-lg"><span>TOTAL</span><span>Rs. {receiptData.total.toFixed(2)}</span></div>
                    </div>
                    <p className="text-center text-xs font-bold">THANK YOU! COME AGAIN.</p>
                </div>
            )}
        </>
    );
};

export default POSPage;