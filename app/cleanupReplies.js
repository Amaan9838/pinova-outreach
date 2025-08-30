// Send a POST request to the cleanup-replies endpoint
const runCleanupReplies = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/maintenance/cleanup-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Cleanup Replies Response:', result);
  } catch (error) {
    console.error('Error running cleanup-replies:', error.message);
  }
};

// Call the function
runCleanupReplies();