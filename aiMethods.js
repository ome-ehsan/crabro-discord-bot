import PERSONALITY_PROMPT from "./personality";
import Memory from "./conHist";
import axios from "axios";
import dotenev from 'dotenv'
dotenev.config();


const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const memory = new Memory();
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';


async function getAIResponse(userMessage, userName = 'User', userId= null) {
 try{
  let messages = [
    {
      role : 'system',
      content: PERSONALITY_PROMPT
    }
  ];

  // buildContextMessages(userId, currentMessage, userName)
  if (userId && memory.hasContext(userId)) {
    const contextMessages = memory.buildContextMessages(userId, userMessage, userName);
    messages.push(...contextMessages);
    console.log(`Using context for ${userName} (${contextMessages.length} messages)`);
  } else {
    // No context, just add current message
    messages.push({
      role: 'user',
      content: `${userName}: ${userMessage}`
    });
  };

  const res = await axios.post(OPENROUTER_BASE_URL, {
        model: "deepseek/deepseek-chat-v3.1:free",
        //model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: messages,
        max_tokens: 400,
        temperature: 0.75,
        //top_p: 0.9
        }, {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            //'HTTP-Referer': 'https://github.com/your-username/ai-discord-bot',
            //'X-Title': 'Gearhead AI Discord Bot'
          }
        });
  
  const aiRes  = res.data.choices[0].message.content;
  if (userId) {
    memory.addMessage(userId, 'user', userMessage, userName);
    memory.addMessage(userId, 'assistant', aiRes);
  }

  return aiRes;


 } catch (error) {
    console.error('OpenRouter API Error:', error.response?.data || error.message);
    return "Bro, my head tweakin’ right now. Gimme a sec to get back right.";
  }
}


export default getAIResponse;