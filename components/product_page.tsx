import { Product } from '@/types/product_typ'

type Props = {
    product: Product
}

export default function ProductDetail({ product }: Props) {
    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Return Home Button */}
            <button 
                id="ret_home" 
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
            >
                Return to Home
            </button>

            {/* Product Card */}
            <div 
                id="product" 
                className="bg-white rounded-lg shadow-md p-6 flex flex-col md:flex-row gap-6"
            >
                {/* Product Image */}
                <img 
                    src={product.image} 
                    alt="Product Image" 
                    className="w-full md:w-1/3 h-auto rounded-lg object-cover"
                />

                {/* Product Details */}
                <div id="col" className="flex-1 flex flex-col gap-2">
                    <h1 className="text-2xl font-bold text-gray-800">{product.name}</h1>
                    <p className="text-gray-500 text-sm">Last updated: {product.time_updated}</p>
                    <h3 className="text-lg font-semibold text-indigo-600">Price: ${product.price}</h3>
                    <h3 className="text-gray-700">Type: {product.type}</h3>
                    <h3 className="text-gray-700">
                        Qty: {product.qty} | Available: {product.qty_avail}
                    </h3>
                    <h3 className="text-gray-700">Model Number: {product.model_number}</h3>
                    <h4 className="mt-4 text-gray-800 font-semibold">Description:</h4>
                    <p className="text-gray-600">{product.description}</p>

                    {/* Add to Cart Button */}
                    <button 
                        id="buy" 
                        className="mt-4 bg-indigo-500 text-white py-2 px-6 rounded hover:bg-indigo-600 transition-colors w-max"
                    >
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    )
}