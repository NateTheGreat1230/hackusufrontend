"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import main_page from '@/images/main_page.jpeg'

export default function Home() {
  const [authToken, setAuthToken] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const router = useRouter();

  // useEffect(() => {
  //   const token = localStorage.getItem("authToken") || "";
  //   setAuthToken(token);

  //   if (token) {
  //     setIsSignedIn(true);
  //   } else {
  //     setIsSignedIn(false);
  //     router.push("/"); // redirect to home if not signed in
  //   }
  // }, [authToken]);

  // if (!isSignedIn) return null; // wait for redirect

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Navbar */}
      <nav className="w-full bg-white shadow p-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-indigo-600">Enflo</div>
        <Link
          href="/logout"
          className="text-indigo-600 font-bold hover:underline transition"
        >
          Login
        </Link>

        
      </nav>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center p-8 space-y-8">
        {/* About Section */}
        <section className="max-w-2xl text-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-800">
            About Enflo Inventory
          </h1>
          <p className="text-lg mb-6 text-gray-700">
            Enflo is your modern solution for inventory management. Our
            platform helps businesses track, organize, and optimize their
            inventory with ease. Built for scalability and reliability, Enflo
            empowers teams to make smarter decisions and streamline operations.
          </p>
        </section>

        {/* Why Choose Enflo Card */}
        <section className="bg-white rounded-lg shadow-md p-6 max-w-xl w-full">
          <h2 className="text-2xl font-semibold mb-4 text-indigo-600">
            Why Choose Enflo?
          </h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Real-time inventory tracking</li>
            <li>Intuitive user interface</li>
            <li>Secure and scalable architecture</li>
            <li>Seamless integration with your workflow</li>
          </ul>
        </section>
        <Image 
        src={main_page}
        alt="Main Page Image"
        width={1800}
        height={600}
        ></Image>
      </main>
    </div>
  );
}

