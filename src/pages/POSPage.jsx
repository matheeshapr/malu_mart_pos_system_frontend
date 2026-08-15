import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const POSPage = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate('/');
    };

    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [manualBarcode, setManualBarcode] = useState("");

    const barcodeBuffer = useRef("");
    const typingTimeout = useRef(null);

    const fetchProducts = async () => {
        try {
            const response = await api.get('/products');
            setProducts(response.data);
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

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
                typingTimeout.current = setTimeout(() => {
                    barcodeBuffer.current = "";
                }, 50);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearTimeout(typingTimeout.current);
        };
    }, [products]);

    const processScannedBarcode = (scannedCode) => {
        if (scannedCode.length === 13 && scannedCode.startsWith("20")) {
            const pluCode = scannedCode.substring(2, 7);
            const weightInGrams = scannedCode.substring(7, 12);
            const weightInKg = Number(weightInGrams) / 1000;

            const matchedProduct = products.find(p => p.plu_code === pluCode);

            if (matchedProduct) {
                addToCart(matchedProduct, weightInKg);
            } else {
                window.alert(`Weighed product not found for PLU: ${pluCode}`);
            }
        } else {
            const matchedProduct = products.find(p => p.barcode === scannedCode);

            if (matchedProduct) {
                addToCart(matchedProduct);
            } else {
                window.alert("Product not found for barcode: " + scannedCode);
            }
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
        } else if (scannedWeight !== null) {
            qty = scannedWeight;
        }

        setCart((prevCart) => {
            const existing = prevCart.find((item) => item.product_id === product.id);

            if (existing) {
                return prevCart.map((item) =>
                    item.product_id === product.id
                        ? {
                            ...item,
                            quantity: product.is_weighed ? item.quantity + qty : item.quantity + 1,
                            sub_total: (product.is_weighed ? item.quantity + qty : item.quantity + 1) * product.selling_price
                          }
                        : item
                );
            } else {
                return [...prevCart, {
                    product_id: product.id,
                    name: product.name,
                    unit_price: product.selling_price,
                    quantity: qty,
                    sub_total: qty * product.selling_price
                }];
            }
        });
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.product_id !== productId));
    };

    const netTotal = cart.reduce((sum, item) => sum + item.sub_total, 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        const saleData = {
            user_id: null,
            customer_id: null,
            sub_total: netTotal,
            discount: 0.00,
            net_total: netTotal,
            paid_amount: netTotal,
            payment_status: "Paid",
            items: cart
        };

        try {
            const response = await api.post('/sales', saleData);

            if (response.status === 201) {
                window.alert(`Sale completed successfully!\nBill No: ${response.data.sale_id}`);
                setCart([]);
                fetchProducts();
            }
        } catch (error) {
            console.error("Checkout error:", error);
            window.alert("Error during checkout. Please check the backend connection.");
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">

            {/* Left Side: Products Grid & Search */}
            <div className="w-2/3 p-6 overflow-y-auto">

                {/* Top Bar with Title, Admin Link, Logout & Manual Barcode Input */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-gray-800">Products</h2>
                        <Link to="/admin" className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1 px-3 rounded">
                            Admin Panel
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg text-sm transition-colors"
                        >
                            Logout
                        </button>

                        <form onSubmit={handleManualSubmit} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter Barcode..."
                                value={manualBarcode}
                                onChange={(e) => setManualBarcode(e.target.value)}
                                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-48"
                            />
                            <button
                                type="submit"
                                className="bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-900 transition-colors text-sm"
                            >
                                Add
                            </button>
                        </form>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    {products.map((product) => (
                        <div
                            key={product.id}
                            onClick={() => addToCart(product)}
                            className="bg-white p-4 rounded-lg shadow cursor-pointer hover:bg-blue-50 border border-gray-200 transition-colors flex flex-col justify-between"
                        >
                            <div>
                                <h3 className="font-semibold text-lg text-gray-800 mb-1">
                                    {product.name}
                                </h3>
                                <p className="text-blue-600 font-bold">
                                    Rs. {product.selling_price}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    Stock: {product.stock_quantity}
                                </p>
                            </div>
                            {product.is_weighed && (
                                <span className="text-xs text-center text-gray-500 bg-gray-100 px-2 py-1 rounded mt-3 inline-block">
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

                <div className="flex-grow overflow-y-auto">
                    {cart.length === 0 ? (
                        <p className="text-gray-400 text-center mt-10">Cart is empty</p>
                    ) : (
                        <div className="space-y-4">
                            {cart.map((item) => (
                                <div key={item.product_id} className="flex justify-between items-center bg-gray-50 p-3 rounded border">
                                    <div>
                                        <h4 className="font-semibold text-gray-800">{item.name}</h4>
                                        <p className="text-sm text-gray-600">
                                            {item.quantity} x Rs. {item.unit_price}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-gray-800">Rs. {item.sub_total.toFixed(2)}</span>
                                        <button
                                            onClick={() => removeFromCart(item.product_id)}
                                            className="text-red-500 hover:text-red-700 font-bold px-2"
                                        >
                                            X
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between font-bold text-xl mb-6 text-gray-800">
                        <span>Total:</span>
                        <span>Rs. {netTotal.toFixed(2)}</span>
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                        className={`w-full py-3 rounded-lg font-bold text-lg transition-colors ${cart.length === 0
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                        }`}
                    >
                        Pay Now
                    </button>
                </div>

            </div>

        </div>
    );
};

export default POSPage;