import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIka } from '../context/IkaContext';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Sparkles, X, Send, Command } from 'lucide-react';

export const IkaWidget = () => {
    const { user, token } = useAuth();
    const { contextData } = useIka();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Cargar historial de mensajes de la base de datos al iniciar o loguear
        const loadHistory = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/chat/history`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success && data.history) {
                    setMessages(data.history);
                } else {
                    // Mensaje de bienvenida inicial
                    setMessages([{
                        role: 'model',
                        content: `¡Hola ${user.name}! Soy **IKA**, tu asistente contextual. ¡Preguntame lo que quieras sobre el método que estés estudiando!`
                    }]);
                }
            } catch (err) {
                console.error("Error cargando historial", err);
            }
        };

        if (isOpen && messages.length === 0) {
            loadHistory();
        }
    }, [isOpen, user, token, messages.length]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg = inputValue.trim();
        const newMessages = [...messages, { role: 'user', content: userMsg }];
        
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);

        // Armar payload par backend
        const payload = {
            message: userMsg,
            context: `Página actual: ${contextData.page}. Detalles: ${contextData.details}`
        };

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/chat`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (data.success) {
                setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
            } else {
                setMessages(prev => [...prev, { 
                    role: 'model', 
                    content: `⚠️ Ups... Hubo un problema de conexión (o rate limit). ${data.error || ''}` 
                }]);
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', content: 'No pude conectarme con el servidor ahora mismo.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Si el usuario no está logueado, no renderizamos el widget
    if (!user) return null;

    return (
        <div className="ika-wrapper">
            {/* Widget Button */}
            <button 
                className={`ika-fab ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Abrir asistente IKA"
            >
                {isOpen ? (
                    <X size={24} color="#FFF" />
                ) : (
                    <>
                        <Sparkles size={20} color="#FFF" />
                        <span className="ika-fab-text">IKA Asistente</span>
                    </>
                )}
            </button>

            {/* Chat Window */}
            <div className={`ika-chat-window ${isOpen ? 'open' : ''}`}>
                {/* Header */}
                <div className="ika-header">
                    <div className="ika-header-info">
                        <div className="ika-avatar"><Command size={16} color="var(--teal)" /></div>
                        <div className="ika-header-text">
                            <h3>IKA</h3>
                            <p>Asistente Contextual</p>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="ika-messages">
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div className="ika-context-badge">
                            👀 Viendo: {contextData.page}
                        </div>
                    </div>
                    {messages.map((msg, i) => (
                        <div key={i} className={`ika-msg-row ${msg.role}`}>
                            <div className="ika-bubble">
                                <ReactMarkdown 
                                    remarkPlugins={[remarkMath]} 
                                    rehypePlugins={[rehypeKatex]}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="ika-msg-row model">
                            <div className="ika-bubble" style={{ color: "var(--muted)" }}>
                                Escribiendo...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="ika-input-area">
                    <div className="ika-input-box">
                        <input
                            type="text"
                            placeholder="Consultá sobre lo que estás viendo..."
                            className="ika-input"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button 
                            className="ika-send-btn"
                            disabled={!inputValue.trim() || isLoading}
                            onClick={handleSend}
                        >
                            <Send size={14} fill="#FFF" color="#FFF" style={{ marginLeft: '2px' }} />
                        </button>
                    </div>
                    <div className="ika-helper-text">Gemini 2.0 Flash Lite interactuando en vivo.</div>
                </div>
            </div>
        </div>
    );
};
