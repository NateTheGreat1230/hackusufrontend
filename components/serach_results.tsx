import { Product } from '@/types/product_typ'

type Props = {
    productList: Product[]
}

export default function SearchResults({ productList }: Props) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-4">
            {productList.map((product, index) => (
                <div 
                    key={index} 
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow duration-300 flex flex-col"
                >
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{product.name}</h3>
                    <h5 className="text-indigo-600 font-bold mb-2">${product.price}</h5>
                    <p className="text-gray-600 text-sm flex-1">{product.description}</p>
                    <button className="mt-4 bg-indigo-500 text-white py-2 px-4 rounded hover:bg-indigo-600 transition-colors">
                        Buy Now
                    </button>
                </div>
            ))}
        </div>
    )
}