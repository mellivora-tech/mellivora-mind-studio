import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Mellivora Mind Studio - Admin</h1>
      <button 
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => setCount((count) => count + 1)}
      >
        Count is {count}
      </button>
    </div>
  )
}

export default App
