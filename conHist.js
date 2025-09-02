class ConversationMemory {
  constructor() {
    this.conversations = new Map(); // userId to conversation history
    this.maxMessagesPerUser = 15; // last 15 msgs
    this.memoryTimeout = 30 * 60 * 1000; // 30 mins timeout
    this.cleanupInterval = 10 * 60 * 1000; // Cleanup every 10 mins
    this.startCleanupTimer();
  }

  getHistory(userId) {
    const userConvo = this.conversations.get(userId);
    if (!userConvo) return [];
    
    // checking if expired
    const now = Date.now();
    if (now - userConvo.lastActive > this.memoryTimeout) {
      this.conversations.delete(userId);
      return [];
    }
    return userConvo.messages || [];
  }

  // adding msgs to user's history 
  addMessage(userId, role, content, userName = null) {
    let userConvo = this.conversations.get(userId);
    // if no convs create one
    if (!userConvo) {
      userConvo = {
        messages: [],
        lastActive: Date.now(),
        userName: userName
      };
      this.conversations.set(userId, userConvo);
    } 
    // updating last active time
    userConvo.lastActive = Date.now();
    if (userName) {
      userConvo.userName = userName;
    }
    // Add the message
    userConvo.messages.push({
      role: role,
      content: content,
      timestamp: Date.now()
    });
    // keeping the last 15 msgs
    if (userConvo.messages.length > this.maxMessagesPerUser) {
      userConvo.messages = userConvo.messages.slice(-this.maxMessagesPerUser);
    }
  }

  // this will serve as a context aware db
  buildContextMessages(userId, currentMessage, userName) {
    const history = this.getHistory(userId);
    const messages = [];
    
    // Add conversation history (skip system message, we'll add that separately)
    history.forEach(msg => {
      if (msg.role === 'user') {
        messages.push({
          role: 'user',
          content: `${userName}: ${msg.content}`
        });
      } else if (msg.role === 'assistant') {
        messages.push({
          role: 'assistant', 
          content: msg.content
        });
      }
    });
    // adding curr msgs 
    messages.push({
      role: 'user',
      content: `${userName}: ${currentMessage}`
    });
    return messages;
  }

  /**
   * Clear conversation history for a user
   * @param {string} userId - Discord user ID
   */

  // deletes conv hist
  clearHistory(userId) {
    this.conversations.delete(userId);
  }

  /**
   * Get conversation stats
   * @returns {Object} Memory statistics
   */
  getStats() {
    const totalUsers = this.conversations.size;
    let totalMessages = 0;
    let activeConversations = 0;
    const now = Date.now();
    
    this.conversations.forEach(convo => {
      totalMessages += convo.messages.length;
      if (now - convo.lastActive < this.memoryTimeout) {
        activeConversations++;
      }
    });
    
    return {
      totalUsers,
      totalMessages,
      activeConversations,
      memoryUsage: `${totalUsers} users, ${totalMessages} messages`
    };
  }

  // auto cleanup
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  // cleaning up expired convo
  cleanup() {
    const now = Date.now();
    const toDelete = [];
    this.conversations.forEach((convo, userId) => {
      if (now - convo.lastActive > this.memoryTimeout) {
        toDelete.push(userId);
      }
    });
    
    toDelete.forEach(userId => {
      this.conversations.delete(userId);
    });
    
    if (toDelete.length > 0) {
      console.log(`Cleaned up ${toDelete.length} expired conversations`);
    }
  }

  
   // Checking if user has recent conversation context
  hasContext(userId) {
    const history = this.getHistory(userId);
    return history.length > 0;
  }

  // summary
  getContextSummary(userId) {
    const history = this.getHistory(userId);
    if (history.length === 0) return "This is a new conversation.";
    
    const recentTopics = history
      .filter(msg => msg.role === 'user')
      .slice(-3) // Last 3 user messages
      .map(msg => msg.content)
      .join(", ");
    
    return `Recent topics: ${recentTopics}`;
  }
}


export default ConversationMemory;