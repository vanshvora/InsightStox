import React,{useEffect,useRef, useState} from "react";
import "../components/ChatWindow.css";
import axios from "axios";
import ReactMarkDown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkEmoji from 'remark-emoji';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { useAppContext } from "../context/AppContext";
import { RingLoader } from "react-spinners";


const ChatWindow = () => {
// ----------------------------------------------------------state variables--------------------------------------------------------
    const [messages,setMessages] = useState([]);
    const [input,setInput] = useState("");
    const [chatStart,setChatStart] = useState(false);
    const { userDetails } = useAppContext(); 
    const chatEndRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);

// ----------------------------------------------------------useEffects--------------------------------------------------------
   // Scroll to the bottom of the chat when a new message is added

useEffect(() => {
  const timeout = setTimeout(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, 150);
  return () => clearTimeout(timeout);
}, [messages]);


// ----------------------------------------------------------functions--------------------------------------------------------
// Function to handle sending message
    const handleSend = async ()=>{
        const text = input.trim();
        if(!text)return;
        setIsLoading(true);
        setChatStart(true);
        setInput("");
        let screenWidth = window.innerWidth;
        console.log("Screen Width:", screenWidth);
        const typingMsg = { id: "typing", text: "Bot is typing... ", sender: "bot", typing: true };
        const userMsg = {id:Date.now(),text, sender:"user",screenWidth: screenWidth};
        const history = messages
            .filter(msg => !msg.typing)
            .map(msg => ({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text }));
            
        setMessages((prev) => [...prev, userMsg, typingMsg]);
        try{
            const response = await fetch(import.meta.env.VITE_BACKEND_LINK + "/ai-insight/message/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    message: userMsg,
                    history: history
                })
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const botMsgId = Date.now();
            setMessages((prev) => [...prev.filter((msg)=>msg.id !== "typing"), { id: botMsgId, text: "", sender: 'bot' }]);
            setIsLoading(false);

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;
            
            // Dynamic delay for ChatGPT effect: start slow, accelerate fast!
            let currentDelay = 40; 

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    
                    // Render word by word instead of character by character to speed it up!
                    const tokens = chunk.split(/(\s+)/);
                    for (let i = 0; i < tokens.length; i++) {
                        if (!tokens[i]) continue;
                        setMessages((prev) => 
                            prev.map((msg) => 
                                msg.id === botMsgId ? { ...msg, text: msg.text + tokens[i] } : msg
                            )
                        );
                        // Speed up gradually by decreasing the delay until we hit 2ms
                        currentDelay = Math.max(2, currentDelay - 0.5);
                        await new Promise(resolve => setTimeout(resolve, currentDelay));
                    }
                }
            }
        }catch(err){
            console.error("Error sending message:", err);
            setMessages((prev) => [...prev.filter((msg) => msg.id !== "typing"), { 
                id: Date.now(),
                text: err.message || "Something went wrong", 
                sender: 'bot',
                typing: false
            }]);
            setIsLoading(false);
        }
    }
// Function to handle Enter key press
    const handleKeyDown = (e) => {
        // console.log("enter key pressed : ", userDetails);
        if(e.key === "Enter") handleSend();
    }
    
    

// ----------------------------------------------------------JSX--------------------------------------------------------
  return (
    <div className="chat-window">
        <div className="chat-welcome-message" style={chatStart ? {display:"none"} : {}}>
                    <h2>Hello, <span className="user-name">{userDetails?.name?.split(" ")[0]  || 'Guest'}!</span></h2>
                    <h3>How can I help you Today?</h3>
        </div>
        <div className="chat-messages" style={chatStart ? {} : {display:"none"}}>
                {messages.map((msg) => (
                    <div className={`chat-bubble ${msg.sender}-bubble ${msg.typing ? "typing" : ""}`} key={msg.id}>
                        {msg.sender === 'bot' && !msg.typing ? (
                            <ReactMarkDown
                                remarkPlugins={[remarkGfm, remarkEmoji]}
                                rehypePlugins={[rehypeRaw, [rehypeSanitize, {
                                    tagNames: ['table','thead','tbody','tr','th','td','strong','em','p','ul','ol','li','a','blockquote','code','pre','h1','h2','h3','h4','h5','h6'],
                                    attributes: {
                                        a: ['href', 'title', 'target', 'rel'],
                                        table: ['class'],
                                        '*': ['class']
                                    }
                                }]]}
                            >
                                {msg.text}
                            </ReactMarkDown>
                        ) : (
                            <div>{msg.text}</div>
                        )}
                    </div>
                ))}
                <div ref={chatEndRef} />
        </div>

        <div className={`chat-input-area ${isLoading ? "loading" : ""}`}>
                <input 
                    type="text" 
                    value={input} 
                    onChange={(e) => {setInput(e.target.value)}} 
                    onKeyDown={handleKeyDown} 
                    placeholder="Type a message..." 
                    className="chat-input"
                />
                <button className="send-btn" onClick={handleSend} disabled={input.length === 0} style={{opacity: input.length === 0 ? 0.5 : 1 , cursor: input.length === 0 ? "not-allowed" : "pointer"}}>{isLoading ? <RingLoader color="#000000" size={20}/> : <>Send</>}</button>
        </div>
    </div>
  )
}

export default ChatWindow