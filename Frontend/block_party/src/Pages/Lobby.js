import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Lobby.css';

function Lobby() {
  
  const [codeBlocks, setCodeBlocks] = useState([]);

  // Fetch the code blocks from the server when the component mounts
  useEffect(() => {
    axios.get('http://localhost:5000/api/code-blocks') 
      .then((response) => {
        setCodeBlocks(response.data); 
      })
      .catch((error) => {
        console.error('Error fetching code blocks:', error.message); 
      });
  }, []); // Empty dependency array ensures this runs only once when the component mounts

  return (
    <div className="area"> 
      <div className="lobby-container">
        <h1 className="lobby-title">Choose a Code Block</h1>
        <ul className="lobby-list"> 
          {codeBlocks
            .sort((a, b) => a.id - b.id) // Sort the code blocks by their ID in ascending order
            .map((block) => (
              <li key={block.id} className="lobby-item"> 
                <Link to={`/code/${block.id}`} className="lobby-link"> {/* Link to the code block page */}
                  {block.title} 
                </Link>
              </li>
            ))}
        </ul>
      </div>
      <ul className="circles">
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
      </ul>
    </div>
  );
}

export default Lobby;
