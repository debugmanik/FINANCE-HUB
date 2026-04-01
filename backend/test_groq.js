require('dotenv').config();
const { Groq } = require('groq-sdk');
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
client.chat.completions.create({
  model: "llama-3.1-8b-instant",
  messages: [{ role: "user", content: "Hello" }]
})
  .then(res => {
    console.log('✅ Success:', res.choices[0].message.content);
  })
  .catch(err => {
    console.error('❌ Error:', err);
  });