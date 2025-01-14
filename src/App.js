import React, { useState } from 'react';
import './App.css';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Initialize speech recognition and synthesis
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'cs-CZ'; // Nastavení češtiny
  recognition.continuous = false;

  const synth = window.speechSynthesis;

  const handleVoiceInput = () => {
    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'cs-CZ'; // Čeština

    // Vyber lepší hlas, pokud je dostupný
    const voices = synth.getVoices();
    const czechVoice = voices.find((voice) => voice.lang === 'cs-CZ');
    if (czechVoice) {
      utterance.voice = czechVoice;
    }

    synth.speak(utterance);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    setLoading(true);

    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
            'OpenAI-Organization': `${process.env.REACT_APP_OPENAI_ORGANIZATION}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [...messages, userMessage],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || `API Error: ${response.statusText}`
        );
      }

      const data = await response.json();
      const botMessage = data.choices[0].message;

      setMessages((prev) => [...prev, botMessage]);

      // Přečti odpověď
      speak(botMessage.content);
    } catch (error) {
      console.error('Error communicating with the API:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: 'Došlo k chybě. Zkuste to znovu.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Chat s GPT</h1>
        <div className="chat-container">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <strong>{message.role === 'user' ? 'Vy:' : 'GPT:'}</strong>{' '}
              {message.content}
            </div>
          ))}
          {loading && <div className="message system">GPT píše...</div>}
        </div>
        <form onSubmit={handleSubmit} className="input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Zadejte zprávu..."
          />
          <button type="submit" disabled={loading}>
            Odeslat
          </button>
        </form>
        <button onClick={handleVoiceInput}>
          {isListening ? 'Zastavit poslouchání' : 'Mluvte'}
        </button>
      </header>
    </div>
  );
}

export default App;
