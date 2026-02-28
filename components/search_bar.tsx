import { useState } from "react";


type Props = {
    searchFunction: (query: string) => void;
};

export default function SearchBar({ searchFunction }: Props) {
    const [searchString, setSearchString] = useState("");

    const handleSearch = () => {
        if (!searchString.trim()) return;
        searchFunction(searchString);
    };

    return (
        <div className="w-full max-w-xl mx-auto mt-10">
            <div className="relative flex items-center">
                
                <input
                    type="text"
                    placeholder="Search for products..."
                    value={searchString}
                    onChange={(e) => setSearchString(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleSearch();
                        }
                    }}
                    className="w-full px-5 py-3 pr-14 text-gray-700 bg-white border border-gray-300 rounded-full shadow-sm 
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                               transition-all duration-200"
                />

                <button
                    onClick={handleSearch}
                    className="absolute right-2 bg-blue-500 hover:bg-blue-600 
                               text-white p-2 rounded-full 
                               transition-all duration-200 active:scale-95 shadow-md"
                >
                    
                </button>

            </div>
        </div>
    );
} 