import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Lobby from './Pages/Lobby';
import CodeBlock from './Pages/CodeBlock';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/code/:blockId" element={<CodeBlock />} />
      </Routes>
    </Router>
  );
}

export default App;