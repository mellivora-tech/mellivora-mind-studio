import { Component } from 'solid-js';
import { Router, Route, Routes } from '@solidjs/router';

const Dashboard: Component = () => (
  <div class="p-8">
    <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
    <p class="mt-4 text-gray-600">Welcome to Mellivora Mind Studio</p>
  </div>
);

const Trading: Component = () => (
  <div class="p-8">
    <h1 class="text-3xl font-bold text-gray-900">Trading</h1>
    <p class="mt-4 text-gray-600">Order management and execution</p>
  </div>
);

const Analytics: Component = () => (
  <div class="p-8">
    <h1 class="text-3xl font-bold text-gray-900">Analytics</h1>
    <p class="mt-4 text-gray-600">Performance analysis and attribution</p>
  </div>
);

const App: Component = () => {
  return (
    <Router>
      <div class="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav class="bg-white shadow">
          <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="flex h-16 justify-between">
              <div class="flex">
                <div class="flex flex-shrink-0 items-center">
                  <span class="text-xl font-bold text-indigo-600">Mellivora</span>
                </div>
                <div class="ml-10 flex items-center space-x-4">
                  <a href="/" class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                    Dashboard
                  </a>
                  <a href="/trading" class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                    Trading
                  </a>
                  <a href="/analytics" class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                    Analytics
                  </a>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main>
          <Routes>
            <Route path="/" component={Dashboard} />
            <Route path="/trading" component={Trading} />
            <Route path="/analytics" component={Analytics} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
