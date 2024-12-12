import { useState, useEffect } from 'react'
// import './App.css'

function App() {
  const [iframeSrc, setIframeSrc] = useState('')

  useEffect(() => {
    fetch('http://3.128.171.185:3000/')
      .then((response) => response.body.getReader().read().then(({ done, value }) => {
        const decoder = new TextDecoder();
        return decoder.decode(value);
      }))
      .then(data => setIframeSrc(data))
      .catch(error => console.error('Error fetching iframe source:', error))
  }, [])

  return (
    <>
      <iframe src={iframeSrc} title="Dynamic Iframe" style={{ width: '100vw', height: '100vh', border: 'none' }} />
    </>
  )
}

export default App
