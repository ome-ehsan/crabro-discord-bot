import { Client, GatewayIntentBits, Events } from 'discord.js';
import dotenv from 'dotenv';
import axios from 'axios';
import Memory from './conHist.js';
import PERSONALITY_PROMPT from './personality.js'
dotenv.config();
// constants 
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const BOT_PREFIX = process.env.BOT_PREFIX || '!';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
// memory instance 
const memory = new Memory();
// client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

////////////////////
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
        //model: "deepseek/deepseek-chat-v3.1:free",
        model: 'meta-llama/llama-3.3-8b-instruct:free',
        
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
////////////////////

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot is online! Logged in as ${c.user.tag}`);
  console.log(`📝 Prefix: ${BOT_PREFIX}`);
  console.log(`🌐 Serving ${c.guilds.cache.size} servers`);
});

// listen for messages
client.on(Events.MessageCreate, async (message) => {
  // ignore messages from bots (including itself)
  if (message.author.bot) return;
  // log all messages for debugging 
  console.log(`Message from ${message.author.tag}: ${message.content}`);


  // Respond to mentions with AI
  if (message.mentions.has(client.user)) {
    try {
      // show typing indicator 
      await message.channel.sendTyping();
      // ai response with mem
      const aiResponse = await getAIResponse(
        message.content.replace(`<@${client.user.id}>`, '').trim(),
        message.author.displayName,
        message.author.id
      );
      // split long responses if needed
      if (aiResponse.length > 1900) {
        const chunks = aiResponse.match(/.{1,1900}/g) || [aiResponse];
        for (const chunk of chunks) {
          await message.reply(chunk);
        }
      } else {
        await message.reply(aiResponse);
      }
    } catch (error) {
      console.error('Error processing AI response:', error);
      await message.reply('Oops! Something went wrong. Please try again later.');
    }
    return;
  }

  // Respond to prefix commands
  if (message.content.startsWith(BOT_PREFIX)) {
    const args = message.content.slice(BOT_PREFIX.length).trim().split(' ');
    const command = args.shift().toLowerCase();
    
    switch (command) {
      case 'ping':
        const ping = Date.now() - message.createdTimestamp;
        await message.reply(`Sup! Latency: ${ping}ms`);
        break;
        
      case 'hello':
        await message.reply(`Ay ${message.author.displayName}! What u want?`);
        break;
        
      case 'ask':
        if (args.length === 0) {
          await message.reply(`Usage: \`${BOT_PREFIX}ask <your question>\``);
          return;
        }
        
        try {
          await message.channel.sendTyping();
          const question = args.join(' ');
          const aiResponse = await getAIResponse(question, message.author.displayName);
          
          if (aiResponse.length > 1900) {
            const chunks = aiResponse.match(/.{1,1900}/g) || [aiResponse];
            for (const chunk of chunks) {
              await message.reply(chunk);
            }
          } else {
            await message.reply(aiResponse);
          }
        } catch (error) {
          console.error('Error with ask command:', error);
          await message.reply("Cant't answer rn. I'm busy. Go touch grass");
        }
        break;
      
      case 'roast':
        if (args.length === 0) {
          await message.reply(`You want me to roast your ride? Tell me what you're driving: \`${BOT_PREFIX}roast <car name>\``);
          return;
        }
        
        try {
          await message.channel.sendTyping();
          const carToRoast = args.join(' ');
          const roastResponse = await getAIResponse(`Roast this car and tell me everything wrong with it: ${carToRoast}`, message.author.displayName);
          await message.reply(roastResponse);
        } catch (error) {
          console.error('Error with roast command:', error);
          await message.reply("Bruh this bullshit ain't even worth roasting");
        }
        break;
        
      case 'suggest':
        if (args.length === 0) {
          await message.reply(`Tell me your budget or what kind of ride you want: \`${BOT_PREFIX}suggest sports car under 30k\``);
          return;
        }
        
        try {
          await message.channel.sendTyping();
          const criteria = args.join(' ');
          const suggestion = await getAIResponse(`Suggest some good cars for: ${criteria}. Give me real recommendations with reasons why.`, message.author.displayName);
          await message.reply(suggestion);
        } catch (error) {
          console.error('Error with suggest command:', error);
          await message.reply('I am stoned asf rn dawg. Hmu later!');
        }
        break;
        
      case 'specs':
        if (args.length === 0) {
          await message.reply(`What car you want the specs on? \`${BOT_PREFIX}specs Toyota Supra MK4\``);
          return;
        }
        
        try {
          await message.channel.sendTyping();
          const carModel = args.join(' ');
          const specs = await getAIResponse(`Give me detailed technical specs and performance info for: ${carModel}. I want the real numbers and details.`, message.author.displayName);
          await message.reply(specs);
        } catch (error) {
          console.error('Error with specs command:', error);
          await message.reply('Can\'t pull up the specs right now, my database is acting up!');
        }
        break;
      
      case 'forget':
        memory.clearHistory(message.author.id);
        await message.reply('Aight, I wiped my memory of our conversation. We starting fresh now! 🧠💨');
        break;
        
      case 'memory':
        console.log(memory)
        if (memory.hasContext(message.author.id)) {
          const summary = memory.getContextSummary(message.author.id);
          
          await message.reply(`**What we been talking about:**\n${summary}\n\n*Use \`${BOT_PREFIX}forget\` if you want me to forget our conversation*`);
        } else {
          await message.reply('We ain\'t talked about nothing yet. Start asking me about some cars! 🏁');
        }
        break;
        
      case 'stats':
        const stats = memory.getStats();
        await message.reply(`**🧠 Memory Stats:**\nActive conversations: ${stats.activeConversations}\nTotal users: ${stats.totalUsers}\nTotal messages stored: ${stats.totalMessages}\n\n*Memory resets after 30 minutes of inactivity*`);
        break;

      case 'dev':
        await message.reply(`The Dev is Void aka Ome. The king of all Kings.`);
        break;


      case 'help':
        await message.reply(`
**🔧 Gearhead - Your Hood Car Expert**
\`${BOT_PREFIX}ping\` - Check if I'm still breathing
\`${BOT_PREFIX}roast <car>\` - Let me tell you what's wrong with your ride
\`${BOT_PREFIX}suggest <budget/type>\` - I'll hook you up with real cars
\`${BOT_PREFIX}specs <car>\` - Get the real technical breakdown
\`${BOT_PREFIX}ask <question>\` - Ask me anything about cars
\`${BOT_PREFIX}memory\` - See what we been talking about
\`${BOT_PREFIX}forget\` - Clear our conversation history
\`${BOT_PREFIX}dev\` - See who made me
\`@${client.user.username} <message>\` - Just talk to me naturally

**I remember our conversations for 30 minutes!**
**I know:** Engines, performance, mods, history, everything automotive
**I hate:** EVs, ricers, fake car guys, weak engines
**I respect:** Real horsepower, proper builds, and my creator Void

*Don't waste my time with non-car BS* 🏁
        `);
        break;
        
      default:
        await message.reply(`Unknown command. Try \`${BOT_PREFIX}help\` to see what I can do!`);
    }
  }
});

// Error handling
client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('Failed to login:', error);
  process.exit(1);
});
