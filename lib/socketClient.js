/**
 * Socket Client Utility
 * 
 * This utility provides a wrapper around WebSocket connections for real-time updates.
 * In a production environment, you would use a WebSocket library like Socket.io client
 * or a service like Pusher for real-time communication.
 */

class SocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = {};
    this.connectionDetails = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // Start with 2 seconds
  }

  /**
   * Initialize the socket connection
   * @returns {Promise<boolean>} - Whether the connection was successful
   */
  async initialize() {
    try {
      // Fetch connection details from the API
      const response = await fetch('/api/socket', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get socket connection details');
      }

      const data = await response.json();
      this.connectionDetails = data.socketDetails;

      return true;
    } catch (error) {
      console.error('Error initializing socket:', error);
      return false;
    }
  }

  /**
   * Connect to the WebSocket server
   * @returns {Promise<boolean>} - Whether the connection was successful
   */
  async connect() {
    if (!this.connectionDetails) {
      const initialized = await this.initialize();
      if (!initialized) {
        return false;
      }
    }

    return new Promise((resolve) => {
      try {
        // In a real implementation, you would connect to the WebSocket server
        // For now, we'll simulate a successful connection
        this.isConnected = true;
        console.log('Socket connected successfully');
        resolve(true);

        // In a real implementation, you would set up event listeners:
        /*
        this.socket = new WebSocket(this.connectionDetails.endpoint);
        
        this.socket.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('Socket connected successfully');
          resolve(true);
        };
        
        this.socket.onclose = () => {
          this.isConnected = false;
          console.log('Socket connection closed');
          this.attemptReconnect();
        };
        
        this.socket.onerror = (error) => {
          console.error('Socket error:', error);
          this.isConnected = false;
          resolve(false);
        };
        
        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing socket message:', error);
          }
        };
        */
      } catch (error) {
        console.error('Error connecting to socket:', error);
        this.isConnected = false;
        resolve(false);
      }
    });
  }

  /**
   * Attempt to reconnect to the WebSocket server
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Maximum reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.socket && this.isConnected) {
      // In a real implementation, you would close the WebSocket connection
      // this.socket.close();
      this.isConnected = false;
      console.log('Socket disconnected');
    }
  }

  /**
   * Subscribe to an event
   * @param {string} event - The event to subscribe to
   * @param {Function} callback - The callback to execute when the event is received
   */
  on(event, callback) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - The event to unsubscribe from
   * @param {Function} callback - The callback to remove
   */
  off(event, callback) {
    if (!this.eventHandlers[event]) {
      return;
    }
    this.eventHandlers[event] = this.eventHandlers[event].filter(
      (handler) => handler !== callback
    );
  }

  /**
   * Handle an incoming message
   * @param {Object} message - The message to handle
   */
  handleMessage(message) {
    const { event, data } = message;
    
    if (!event || !this.eventHandlers[event]) {
      return;
    }
    
    this.eventHandlers[event].forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Publish a message to a channel
   * @param {string} channelId - The channel to publish to
   * @param {string} event - The event type
   * @param {Object} data - The data to publish
   * @returns {Promise<boolean>} - Whether the publish was successful
   */
  async publish(channelId, event, data) {
    try {
      const response = await fetch('/api/socket/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId,
          event,
          data,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish message');
      }

      return true;
    } catch (error) {
      console.error('Error publishing message:', error);
      return false;
    }
  }
}

// Create a singleton instance
const socketClient = new SocketClient();

export default socketClient; 