import { Client, GatewayIntentBits, Events } from 'discord.js';
import dotenv from 'dotenv';
import getAIResponse from './aiMethods';
dotenv.config();

// client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});
// Bot configuration
const BOT_PREFIX = process.env.BOT_PREFIX || '!';
// When the client is ready, run this code
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot is online! Logged in as ${c.user.tag}`);
  console.log(`📝 Prefix: ${BOT_PREFIX}`);
  console.log(`🌐 Serving ${c.guilds.cache.size} servers`);
});

// Listen for messages
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
      // Get AI response
      const aiResponse = await getAIResponse(
        message.content.replace(`<@${client.user.id}>`, '').trim(),
        message.author.displayName
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
        
      case 'help':
        await message.reply(`
**🔧 Gearhead - Your Hood Car Expert**
\`${BOT_PREFIX}ping\` - Check if I'm still breathing
\`${BOT_PREFIX}roast <car>\` - Let me tell you what's wrong with your ride
\`${BOT_PREFIX}suggest <budget/type>\` - I'll hook you up with real cars
\`${BOT_PREFIX}specs <car>\` - Get the real technical breakdown
\`@${client.user.username} <message>\` - Just talk to me about cars

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
