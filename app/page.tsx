"use client";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-primary text-onPrimary p-8">
      <h1 className="text-4xl font-bold mb-4">About Enflo Inventory</h1>
      <p className="text-lg mb-6 max-w-2xl text-center">
        Enflo is your modern solution for inventory management. Our platform helps businesses track, organize, and optimize their inventory with ease. Built for scalability and reliability, Enflo empowers teams to make smarter decisions and streamline operations.
      </p>
      <div className="bg-surface rounded-lg shadow-md p-6 max-w-xl w-full">
        <h2 className="text-2xl font-semibold mb-2 text-primary">Why Choose Enflo?</h2>
        <ul className="list-disc list-inside text-onSurface">
          <li>Real-time inventory tracking</li>
          <li>Intuitive user interface</li>
          <li>Secure and scalable architecture</li>
          <li>Seamless integration with your workflow</li>
        </ul>
      </div>
    </div>
  );
}
