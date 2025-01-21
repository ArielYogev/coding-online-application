import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import './CodeBlock.css';

function CodeBlock() {
  const { blockId } = useParams(); // Extract the block ID from the URL
  const socket = useRef(null); // Ref to manage the WebSocket connection
  const [codeBlock, setCodeBlock] = useState(null);
  const [role, setRole] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const socketUrl = "https://coding-online-application.onrender.com" || process.env.REACT_APP_API_URL; 

  // Fetch the code block from the server based on the blockId
  useEffect(() => {
    console.log("Connecting")
    axios.get(`/api/code-blocks/${blockId}`)
      .then((response) => {
        console.log('Code Blocks Data:', response.data);
        setCodeBlock(response.data);
      })
      .catch((error) => {
        console.error('Error fetching code block:', error.message);
      });
  }, [blockId]);
  useEffect(() => {
    localStorage.setItem('blockId', blockId);
  }, [blockId]);

  // Initialize and manage the WebSocket connection
  useEffect(() => {
    if (!blockId) {
      console.error('Block ID is not defined');
      return;
    }

    socket.current = io(socketUrl, {
      transports: ['websocket'],
      query: { blockId }
    });

    if (!socket.current) {
      console.error('Socket is not initialized');
      return;
    }

    // Register event listeners for WebSocket events
    socket.current.on('connect', () => {
      if (socket.current) {
        socket.current.emit('joinRoom', { blockId }); // Join the room for the specific blockId
        socket.current.emit('requestInitialData', { blockId }); // Request initial role and user count
        console.log('Socket connected:', socket.current.id);
        console.log('Block ID:', blockId);
      } else {
        console.warn('Socket is null, skipping emit.');
      }
    });

    if (socket.current) {
      socket.current.on('initialData', (data) => {
        console.log('Initial Data:', data);
        setRole(data.role);
        setUserCount(data.userCount);
      });

      socket.current.on('roleAssigned', (assignedRole) => {
        console.log('Role Assigned:', assignedRole);
        setRole(assignedRole);
      });

      socket.current.on('userCount', (count) => {
        console.log('User Count:', count);
        setUserCount(count);
      });

      socket.current.on('mentorLeft', () => {
        alert('The mentor has left the room. Returning to lobby.');
        window.location.href = '/';
      });
    }

    // Cleanup the WebSocket connection on component unmount
    return () => {
      if (socket.current) {
        console.log('Cleaning up socket:', socket.current.id);
        ['initialData', 'userCount', 'mentorLeft', 'codeUpdated'].forEach((event) => {
          socket.current.off(event);
        });
        socket.current.disconnect();
        socket.current = null;
      } else {
        console.warn('Socket is already null, skipping cleanup.');
      }
    };
  }, [blockId, socketUrl]);

  // Handle real-time updates for the code block
  useEffect(() => {
    if (!codeBlock) return;

    socket.current.on('codeUpdated', (updatedCode) => {
      console.log('Code updated from server:', updatedCode);

      if (updatedCode.id === codeBlock.id) {
        setCodeBlock((prevBlock) => ({
          ...prevBlock,
          template: updatedCode.template,
        }));
      }
    });

    // Cleanup the event listener for 'codeUpdated'
    return () => {
      if (socket.current) {
        socket.current.off('codeUpdated');
      } else {
        console.warn('Socket is null, skipping off for codeUpdated.');
      }
    };
  }, [codeBlock]);

  const handleCodeChange = (e) => {
    const updatedTemplate = e.target.value;
    setCodeBlock((prevBlock) => ({
      ...prevBlock,
      template: updatedTemplate,
    }));

    if (updatedTemplate.trim() === codeBlock.solution.trim()) {
      setIsSolved(true);
      setTimeout(() => {
        setIsSolved(false);
      }, 5000); // Show smiley for 5 seconds if the solution is correct
    } else {
      setIsSolved(false);
    }

    socket.current.emit('updateCode', { id: codeBlock.id, template: updatedTemplate });
  };

  // Save changes to the server
  const handleSave = async () => {
    try {
      const response = await axios.put(`/api/code-blocks/${blockId}`, {

        template: codeBlock.template,
      });
      console.log('Code block updated:', response.data);
      alert('Changes saved!');
    } catch (error) {
      console.error('Error saving changes:', error.message);
      alert('Failed to save changes.');
    }
  };

  // Render loading state if the code block is not yet fetched
  if (!codeBlock) {
    return <p>Loading...</p>;
  }

  return (
    <div className="code-editor-container">
      <h1 className="code-editor-title">Editing Code Block:<br /> {codeBlock.title}</h1>
      <h2 className="code-editor-subtitle">Role: {role}</h2>
      <h3 className="code-editor-subtitle">Students in this page: {userCount}</h3>
      <textarea
        className="code-editor-input"
        value={codeBlock.template}
        onChange={handleCodeChange}
        readOnly={role === 'mentor'}
      />
      {role === 'student' && (
        <button className="code-editor-button" onClick={handleSave}>
          Save Changes
        </button>
      )}
      {isSolved && (
        <div className="smiley-overlay">
          🤩
        </div>
      )}
    </div>
  );
}

export default CodeBlock;
