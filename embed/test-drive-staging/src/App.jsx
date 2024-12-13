import { useState, useEffect } from 'react'
// import './App.css'

function App() {
  const [iframeSrc, setIframeSrc] = useState('');

  useEffect(() => {
    let isMounted = true; // Track if the component is still mounted
    console.log('Fetching...')
    fetch('http://localhost:3000/URL')
      .then(response => response.json()) // Assuming the response is JSON
      .then(data => {
        if (isMounted) {
          setIframeSrc(data.iframeSrc); // Set iframeSrc only if the component is still mounted
        }
      })
      .catch(error => console.error('Error fetching iframe source:', error));

    return () => {
      isMounted = false; // Cleanup function to set isMounted to false
    };
  }, []); // Empty dependency array ensures this runs only once

  return (
    <>
      <div>
        <iframe src={iframeSrc} title="Dynamic Iframe" style={{ width: '100vw', height: '100vh', border: 'none' }} />
      </div>
    </>
  )
}

export default App
